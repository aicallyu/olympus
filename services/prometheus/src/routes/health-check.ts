import { Hono } from "hono";
import { createPageSession, takeScreenshot } from "../lib/browser.js";
import { getProject } from "../lib/supabase.js";
import type { HealthCheckRequest, HealthCheckResponse } from "../lib/types.js";

const app = new Hono();

app.post("/health-check", async (c) => {
  const body = await c.req.json<HealthCheckRequest>();
  const { project_id } = body;

  if (!project_id) {
    return c.json({ error: "project_id is required" }, 400);
  }

  const project = await getProject(project_id);
  if (!project) {
    return c.json({ error: `Project not found: ${project_id}` }, 404);
  }

  const url = project.config.deployment.live_url;
  if (!url) {
    return c.json({ error: `No live_url configured for project ${project_id}` }, 400);
  }

  let statusCode: number | null = null;

  try {
    // Quick HTTP check first
    const httpRes = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(15000),
    });
    statusCode = httpRes.status;

    if (!httpRes.ok) {
      const response: HealthCheckResponse = {
        project_id,
        url,
        status: "unhealthy",
        page_loaded: false,
        status_code: statusCode,
        console_errors: [],
        network_errors: [`HTTP ${statusCode}`],
        checked_at: new Date().toISOString(),
      };
      return c.json(response);
    }
  } catch (err) {
    const response: HealthCheckResponse = {
      project_id,
      url,
      status: "unhealthy",
      page_loaded: false,
      status_code: null,
      console_errors: [],
      network_errors: [(err as Error).message],
      checked_at: new Date().toISOString(),
    };
    return c.json(response);
  }

  // Full browser check
  let session;
  try {
    session = await createPageSession(url);

    const screenshot = await takeScreenshot(session.page, `health-${project_id}`);

    const hasErrors = session.consoleErrors.length > 0 || session.networkErrors.length > 0;

    const response: HealthCheckResponse = {
      project_id,
      url,
      status: hasErrors ? "unhealthy" : "healthy",
      page_loaded: true,
      status_code: statusCode,
      console_errors: session.consoleErrors,
      network_errors: session.networkErrors,
      screenshot,
      checked_at: new Date().toISOString(),
    };

    return c.json(response);
  } catch (err) {
    const response: HealthCheckResponse = {
      project_id,
      url,
      status: "unhealthy",
      page_loaded: false,
      status_code: statusCode,
      console_errors: [],
      network_errors: [(err as Error).message],
      checked_at: new Date().toISOString(),
    };
    return c.json(response);
  } finally {
    if (session) {
      await session.cleanup();
    }
  }
});

export default app;
