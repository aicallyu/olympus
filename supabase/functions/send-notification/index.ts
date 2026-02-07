import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

type NotificationType = "info" | "warning" | "escalation" | "prod_alert";

interface NotificationRequest {
  type: NotificationType;
  project_id: string;
  task_id: string;
  message: string;
  details?: Record<string, unknown>;
}

serve(async (req: Request) => {
  try {
    const body: NotificationRequest = await req.json();
    const { type, project_id, task_id, message, details } = body;

    // Load project config for notification settings
    const { data: project } = await supabase
      .from("projects")
      .select("name, config")
      .eq("id", project_id)
      .single();

    const projectName = project?.name || project_id;
    const config = project?.config || {};
    const notifications = config.notifications || {};

    // 1. Always log to agent_activities (dashboard feed)
    await logToDashboard(type, project_id, task_id, message, projectName);

    // 2. For escalations and prod alerts: send external notification
    if (type === "escalation" || type === "prod_alert") {
      const channel = notifications.escalation_channel || "dashboard";
      const contact = notifications.escalation_contact || "team";

      if (channel === "whatsapp") {
        await sendWhatsApp(contact, projectName, message, details);
      }

      // Also create an escalation task if this is a prod alert without a task
      if (type === "prod_alert" && !task_id) {
        await createAlertTask(project_id, message);
      }
    }

    return jsonResponse({
      status: "sent",
      type,
      channels: getChannels(type),
    });
  } catch (err) {
    console.error("send-notification error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

// ============================================================
// Dashboard log (always)
// ============================================================

async function logToDashboard(
  type: NotificationType,
  projectId: string,
  taskId: string,
  message: string,
  projectName: string
): Promise<void> {
  const activityType = mapNotificationToActivityType(type);

  // Find a system agent to attribute this to, or use null
  const { data: agents } = await supabase
    .from("agents")
    .select("id")
    .ilike("name", "ARGOS")
    .limit(1);

  const agentId = agents?.[0]?.id || null;

  await supabase.from("agent_activities").insert({
    agent_id: agentId,
    action: `[${projectName}] ${message}`,
    type: activityType,
    task_id: taskId || null,
    metadata: {
      notification_type: type,
      project_id: projectId,
    },
  });
}

function mapNotificationToActivityType(type: NotificationType): string {
  switch (type) {
    case "info":
      return "task";
    case "warning":
      return "review";
    case "escalation":
      return "blocked";
    case "prod_alert":
      return "error";
    default:
      return "task";
  }
}

// ============================================================
// WhatsApp via HERMES (placeholder — uses webhook)
// ============================================================

async function sendWhatsApp(
  contact: string,
  projectName: string,
  message: string,
  details?: Record<string, unknown>
): Promise<void> {
  const webhookUrl = Deno.env.get("WHATSAPP_WEBHOOK_URL");
  if (!webhookUrl) {
    console.warn("WHATSAPP_WEBHOOK_URL not set — skipping WhatsApp notification");
    return;
  }

  const text = [
    `*[${projectName}]*`,
    message,
    details ? `\nDetails: ${JSON.stringify(details, null, 2).slice(0, 500)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: contact, message: text }),
    });
  } catch (err) {
    console.error("WhatsApp send failed:", err);
  }
}

// ============================================================
// Auto-create alert task for prod issues
// ============================================================

async function createAlertTask(
  projectId: string,
  message: string
): Promise<void> {
  await supabase.from("tasks").insert({
    title: `PROD ALERT: ${message.slice(0, 80)}`,
    description: message,
    status: "inbox",
    priority: "critical",
    project_id: projectId,
    created_by: "PROMETHEUS",
    acceptance_criteria: [
      {
        id: "alert-01",
        criterion: "Issue identified and resolved",
        type: "browser_test",
        verified: false,
        verified_by: null,
        verified_at: null,
        evidence_url: null,
      },
      {
        id: "alert-02",
        criterion: "Live URL loads without errors",
        type: "browser_test",
        verified: false,
        verified_by: null,
        verified_at: null,
        evidence_url: null,
      },
    ],
  });
}

// ============================================================
// Helpers
// ============================================================

function getChannels(type: NotificationType): string[] {
  switch (type) {
    case "info":
      return ["dashboard"];
    case "warning":
      return ["dashboard"];
    case "escalation":
      return ["dashboard", "whatsapp"];
    case "prod_alert":
      return ["dashboard", "whatsapp"];
    default:
      return ["dashboard"];
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
