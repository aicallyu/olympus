import cron from "node-cron";
import { getActiveProjects, sendNotification } from "../lib/supabase.js";
import { createPageSession, takeScreenshot } from "../lib/browser.js";

export function startHealthMonitor(): void {
  // Run every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    console.log(`[PROMETHEUS CRON] Health check started at ${new Date().toISOString()}`);

    try {
      const projects = await getActiveProjects();
      console.log(`[PROMETHEUS CRON] Checking ${projects.length} active projects`);

      for (const project of projects) {
        const url = project.config.deployment.live_url;
        if (!url) {
          console.log(`[PROMETHEUS CRON] Skipping ${project.id} — no live_url`);
          continue;
        }

        await checkProject(project.id, project.name, url);
      }

      console.log(`[PROMETHEUS CRON] Health check complete`);
    } catch (err) {
      console.error("[PROMETHEUS CRON] Health monitor error:", err);
    }
  });

  console.log("[PROMETHEUS] Health monitor scheduled: every 30 minutes");
}

async function checkProject(projectId: string, projectName: string, url: string): Promise<void> {
  let session;

  try {
    // Quick HTTP check first
    const httpRes = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(15000),
    });

    if (!httpRes.ok) {
      await sendNotification({
        type: "prod_alert",
        project_id: projectId,
        task_id: "",
        message: `${projectName} (${url}) returned HTTP ${httpRes.status}`,
        details: { status_code: httpRes.status, checked_at: new Date().toISOString() },
      });
      return;
    }

    // Full browser check
    session = await createPageSession(url);

    if (session.consoleErrors.length > 0) {
      const screenshot = await takeScreenshot(session.page, `cron-alert-${projectId}`);

      await sendNotification({
        type: "prod_alert",
        project_id: projectId,
        task_id: "",
        message: `${projectName} has ${session.consoleErrors.length} console errors`,
        details: {
          url,
          console_errors: session.consoleErrors.slice(0, 10),
          network_errors: session.networkErrors.slice(0, 10),
          screenshot,
          checked_at: new Date().toISOString(),
        },
      });
    } else {
      console.log(`[PROMETHEUS CRON] ${projectName} — healthy`);
    }
  } catch (err) {
    await sendNotification({
      type: "prod_alert",
      project_id: projectId,
      task_id: "",
      message: `${projectName} (${url}) unreachable: ${(err as Error).message}`,
      details: { error: (err as Error).message, checked_at: new Date().toISOString() },
    });
  } finally {
    if (session) {
      await session.cleanup();
    }
  }
}
