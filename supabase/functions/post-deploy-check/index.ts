import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface DeployCheckRequest {
  project_id: string;
  commit: string;
  deploy_url?: string;
  status?: "success" | "failure";
}

serve(async (req: Request) => {
  try {
    const body: DeployCheckRequest = await req.json();
    const { project_id, commit, status } = body;

    if (!project_id || !commit) {
      return jsonResponse({ error: "project_id and commit are required" }, 400);
    }

    // Load project config
    const { data: project, error: projError } = await supabase
      .from("projects")
      .select("id, name, config")
      .eq("id", project_id)
      .single();

    if (projError || !project) {
      return jsonResponse({ error: `Project not found: ${project_id}` }, 404);
    }

    // If the CI/deploy explicitly reported failure, log it
    if (status === "failure") {
      await sendNotification({
        type: "warning",
        project_id,
        task_id: "",
        message: `Deploy failed for ${project.name} (commit ${commit.slice(0, 7)})`,
      });
      return jsonResponse({ status: "deploy_failure_logged", commit });
    }

    // Find tasks in build_check or deploy_check for this project
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, status, acceptance_criteria, gate_status")
      .eq("project_id", project_id)
      .in("status", ["build_check", "deploy_check"]);

    if (!tasks || tasks.length === 0) {
      // No tasks waiting for verification — just log the deploy
      await sendNotification({
        type: "info",
        project_id,
        task_id: "",
        message: `Deploy succeeded for ${project.name} (commit ${commit.slice(0, 7)}). No tasks pending verification.`,
      });
      return jsonResponse({ status: "no_pending_tasks", commit });
    }

    // Trigger verification for each pending task
    const results = [];

    for (const task of tasks) {
      const gate = task.status as "build_check" | "deploy_check";
      const attempt = ((task.gate_status?.[gate]?.attempts as number) || 0) + 1;

      // Call the verification engine
      const functionUrl =
        Deno.env.get("SUPABASE_URL") + "/functions/v1/run-verification-gate";

      const gateRes = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          task_id: task.id,
          project_id,
          gate,
          attempt,
          acceptance_criteria: task.acceptance_criteria || [],
        }),
      });

      const gateResult = await gateRes.json();
      results.push({ task_id: task.id, gate, result: gateResult });
    }

    return jsonResponse({
      status: "verification_triggered",
      commit,
      tasks_checked: results.length,
      results,
    });
  } catch (err) {
    console.error("post-deploy-check error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

async function sendNotification(payload: {
  type: string;
  project_id: string;
  task_id: string;
  message: string;
}): Promise<void> {
  try {
    const functionUrl =
      Deno.env.get("SUPABASE_URL") + "/functions/v1/send-notification";
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
