import { Hono } from "hono";
import { createPageSession, takeScreenshot } from "../lib/browser.js";
import { getProject } from "../lib/supabase.js";
import type { DeployDiffRequest, DeployDiffResponse } from "../lib/types.js";

const app = new Hono();

app.post("/deploy-diff", async (c) => {
  const body = await c.req.json<DeployDiffRequest>();
  const { project_id, expected_elements, expected_routes } = body;

  if (!project_id) {
    return c.json({ error: "project_id is required" }, 400);
  }

  const project = await getProject(project_id);
  if (!project) {
    return c.json({ error: `Project not found: ${project_id}` }, 404);
  }

  const baseUrl = project.config.deployment.live_url;
  if (!baseUrl) {
    return c.json({ error: `No live_url configured for project ${project_id}` }, 400);
  }

  const missingElements: string[] = [];
  const foundElements: string[] = [];
  const missingRoutes: string[] = [];
  const foundRoutes: string[] = [];
  const consoleErrors: string[] = [];
  let screenshot: string | undefined;

  // Check routes
  const routesToCheck = expected_routes || ["/"];

  for (const route of routesToCheck) {
    const fullUrl = new URL(route, baseUrl).toString();
    let session;

    try {
      session = await createPageSession(fullUrl);

      // Check if route loaded (not a 404 or error page)
      const title = await session.page.title();
      const bodyText = await session.page.textContent("body");
      const is404 =
        title.toLowerCase().includes("404") ||
        title.toLowerCase().includes("not found") ||
        (bodyText?.toLowerCase().includes("404") && bodyText.length < 500);

      if (is404) {
        missingRoutes.push(route);
      } else {
        foundRoutes.push(route);
      }

      consoleErrors.push(...session.consoleErrors);

      // Take screenshot of the first route
      if (!screenshot) {
        screenshot = await takeScreenshot(session.page, `deploy-diff-${project_id}`);
      }
    } catch {
      missingRoutes.push(route);
    } finally {
      if (session) {
        await session.cleanup();
      }
    }
  }

  // Check elements on the main page
  if (expected_elements && expected_elements.length > 0) {
    let session;
    try {
      session = await createPageSession(baseUrl);

      for (const selector of expected_elements) {
        const el = await session.page.$(selector);
        if (el) {
          foundElements.push(selector);
        } else {
          missingElements.push(selector);
        }
      }

      consoleErrors.push(...session.consoleErrors);
    } catch {
      // If page doesn't load, all elements are missing
      missingElements.push(...expected_elements);
    } finally {
      if (session) {
        await session.cleanup();
      }
    }
  }

  const response: DeployDiffResponse = {
    project_id,
    url: baseUrl,
    missing_elements: missingElements,
    missing_routes: missingRoutes,
    found_elements: foundElements,
    found_routes: foundRoutes,
    console_errors: [...new Set(consoleErrors)], // dedupe
    screenshot,
  };

  return c.json(response);
});

export default app;
