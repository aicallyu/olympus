import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const PROMETHEUS_URL = Deno.env.get("PROMETHEUS_URL") || "http://localhost:3033";

interface GateRequest {
  task_id: string;
  project_id: string;
  gate: "build_check" | "deploy_check" | "perception_check";
  attempt: number;
  acceptance_criteria: AcceptanceCriterion[];
}

interface AcceptanceCriterion {
  id: string;
  criterion: string;
  type: string;
  test_selector?: string;
  test_action?: string;
  expected_result?: string;
}

interface ProjectConfig {
  repo: string;
  stack: {
    framework: string;
    build_command: string;
    typecheck_command: string;
    lint_command: string;
    node_version: string;
  };
  deployment: {
    platform: string;
    live_url: string;
    env_vars_required: string[];
    deploy_branch: string;
  };
  agents: Record<string, string>;
  notifications?: {
    escalation_channel?: string;
    escalation_contact?: string;
  };
}

serve(async (req: Request) => {
  try {
    const body: GateRequest = await req.json();
    const { task_id, project_id, gate, attempt, acceptance_criteria } = body;

    // Load project config
    const { data: project, error: projError } = await supabase
      .from("projects")
      .select("config")
      .eq("id", project_id)
      .single();

    if (projError || !project) {
      return jsonResponse({ error: `Project not found: ${project_id}` }, 404);
    }

    const config: ProjectConfig = project.config;

    // Update gate_status to running
    await updateGateStatus(task_id, gate, {
      status: "running",
      attempts: attempt,
    });

    // Run the appropriate gate
    let result: GateResult;

    switch (gate) {
      case "build_check":
        result = await runBuildCheck(task_id, config);
        break;
      case "deploy_check":
        result = await runDeployCheck(task_id, config);
        break;
      case "perception_check":
        result = await runPerceptionCheck(task_id, config, acceptance_criteria);
        break;
      default:
        return jsonResponse({ error: `Unknown gate: ${gate}` }, 400);
    }

    // Log verification
    await supabase.from("task_verifications").insert({
      task_id,
      project_id,
      gate,
      attempt_number: attempt,
      verified_by: result.verified_by,
      status: result.passed ? "pass" : "fail",
      summary: result.summary,
      details: result.details,
      criteria_results: result.criteria_results || [],
    });

    if (result.passed) {
      // Gate passed — update status and advance to next gate
      await updateGateStatus(task_id, gate, {
        status: "passed",
        attempts: attempt,
        passed_at: new Date().toISOString(),
      });

      const nextGate = getNextGate(gate);
      if (nextGate) {
        await supabase
          .from("tasks")
          .update({ status: nextGate, updated_at: new Date().toISOString() })
          .eq("id", task_id);
      }

      // Notify success
      await sendNotification({
        type: "info",
        project_id,
        task_id,
        message: `${gate} passed (attempt ${attempt}). ${result.summary}`,
      });
    } else {
      // Gate failed
      await updateGateStatus(task_id, gate, {
        status: "failed",
        attempts: attempt,
        last_error: result.summary,
      });

      if (attempt >= 3) {
        // Escalate after 3 failures
        await supabase
          .from("tasks")
          .update({ status: "escalated", updated_at: new Date().toISOString() })
          .eq("id", task_id);

        await supabase.from("task_verifications").insert({
          task_id,
          project_id,
          gate,
          attempt_number: attempt,
          verified_by: "system",
          status: "escalated",
          summary: `Escalated after ${attempt} failed attempts`,
          escalation_context: JSON.stringify({
            gate,
            last_error: result.summary,
            details: result.details,
          }),
        });

        await sendNotification({
          type: "escalation",
          project_id,
          task_id,
          message: `Task failed ${gate} after ${attempt} attempts. Needs your decision.`,
          details: result.details,
        });
      } else {
        // Enter auto-fix loop
        await supabase
          .from("tasks")
          .update({ status: "auto_fix", updated_at: new Date().toISOString() })
          .eq("id", task_id);

        // Route to appropriate agent
        const agent = routeToAgent(gate, result, config);

        await sendNotification({
          type: "warning",
          project_id,
          task_id,
          message: `${gate} failed (attempt ${attempt}/3). ${agent} auto-fixing. Error: ${result.summary}`,
        });
      }
    }

    return jsonResponse({ status: "ok", gate, passed: result.passed, attempt });
  } catch (err) {
    console.error("run-verification-gate error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

// ============================================================
// Gate runners
// ============================================================

interface GateResult {
  passed: boolean;
  verified_by: string;
  summary: string;
  details: Record<string, unknown>;
  criteria_results?: Array<{ id: string; passed: boolean; message: string }>;
}

async function runBuildCheck(
  taskId: string,
  config: ProjectConfig
): Promise<GateResult> {
  // Build check calls the CI or runs locally via PROMETHEUS
  // For now, check if the latest CI run passed
  try {
    const res = await fetch(`${PROMETHEUS_URL}/health-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: config.repo }),
    });

    if (!res.ok) {
      return {
        passed: false,
        verified_by: "ATHENA",
        summary: `Health check endpoint returned ${res.status}`,
        details: { status_code: res.status },
      };
    }

    const data = await res.json();
    const hasErrors = (data.console_errors || []).length > 0;

    return {
      passed: !hasErrors,
      verified_by: "ATHENA",
      summary: hasErrors
        ? `Build check found ${data.console_errors.length} console errors`
        : "Build check passed — no console errors",
      details: data,
    };
  } catch (err) {
    return {
      passed: false,
      verified_by: "ATHENA",
      summary: `Build check failed: ${(err as Error).message}`,
      details: { error: (err as Error).message },
    };
  }
}

async function runDeployCheck(
  taskId: string,
  config: ProjectConfig
): Promise<GateResult> {
  try {
    const res = await fetch(`${PROMETHEUS_URL}/deploy-diff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: config.repo,
        expected_elements: [],
        expected_routes: ["/"],
      }),
    });

    if (!res.ok) {
      return {
        passed: false,
        verified_by: "ARGOS",
        summary: `Deploy check endpoint returned ${res.status}`,
        details: { status_code: res.status },
      };
    }

    const data = await res.json();
    const allRoutesOk = (data.missing_routes || []).length === 0;
    const allElementsOk = (data.missing_elements || []).length === 0;
    const passed = allRoutesOk && allElementsOk;

    return {
      passed,
      verified_by: "ARGOS",
      summary: passed
        ? "Deploy check passed — all routes and elements present"
        : `Deploy check failed — missing routes: ${(data.missing_routes || []).join(", ")}`,
      details: data,
    };
  } catch (err) {
    return {
      passed: false,
      verified_by: "ARGOS",
      summary: `Deploy check failed: ${(err as Error).message}`,
      details: { error: (err as Error).message },
    };
  }
}

async function runPerceptionCheck(
  taskId: string,
  config: ProjectConfig,
  criteria: AcceptanceCriterion[]
): Promise<GateResult> {
  try {
    const res = await fetch(`${PROMETHEUS_URL}/verify-criteria`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: config.repo,
        url: config.deployment.live_url,
        criteria,
      }),
    });

    if (!res.ok) {
      return {
        passed: false,
        verified_by: "PROMETHEUS",
        summary: `Perception check endpoint returned ${res.status}`,
        details: { status_code: res.status },
        criteria_results: [],
      };
    }

    const data = await res.json();
    const passed = data.overall === "pass";

    return {
      passed,
      verified_by: "PROMETHEUS",
      summary: data.summary || (passed ? "All criteria passed" : "Some criteria failed"),
      details: data,
      criteria_results: data.results || [],
    };
  } catch (err) {
    return {
      passed: false,
      verified_by: "PROMETHEUS",
      summary: `Perception check failed: ${(err as Error).message}`,
      details: { error: (err as Error).message },
      criteria_results: [],
    };
  }
}

// ============================================================
// Helpers
// ============================================================

function getNextGate(
  current: string
): "deploy_check" | "perception_check" | "human_checkpoint" | null {
  const order: Record<string, "deploy_check" | "perception_check" | "human_checkpoint"> = {
    build_check: "deploy_check",
    deploy_check: "perception_check",
    perception_check: "human_checkpoint",
  };
  return order[current] || null;
}

function routeToAgent(
  gate: string,
  result: GateResult,
  config: ProjectConfig
): string {
  switch (gate) {
    case "build_check":
      return config.agents.primary_dev || "ATLAS";
    case "deploy_check":
      return config.agents.infra || "ARGOS";
    case "perception_check":
      return config.agents.primary_dev || "ATLAS";
    default:
      return config.agents.qa || "ATHENA";
  }
}

async function updateGateStatus(
  taskId: string,
  gate: string,
  update: Record<string, unknown>
): Promise<void> {
  const { data: task } = await supabase
    .from("tasks")
    .select("gate_status")
    .eq("id", taskId)
    .single();

  if (!task) return;

  const gateStatus = task.gate_status || {};
  gateStatus[gate] = { ...(gateStatus[gate] || {}), ...update };

  await supabase
    .from("tasks")
    .update({ gate_status: gateStatus, updated_at: new Date().toISOString() })
    .eq("id", taskId);
}

async function sendNotification(payload: {
  type: string;
  project_id: string;
  task_id: string;
  message: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const functionUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/send-notification";
    await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
