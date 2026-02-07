import { Hono } from "hono";
import { createPageSession, takeScreenshot } from "../lib/browser.js";
import type {
  VerifyCriteriaRequest,
  VerifyCriteriaResponse,
  CriterionResult,
  AcceptanceCriterion,
} from "../lib/types.js";
import { getProject } from "../lib/supabase.js";
import type { Page } from "playwright";

const app = new Hono();

app.post("/verify-criteria", async (c) => {
  const body = await c.req.json<VerifyCriteriaRequest>();
  const { project_id, url, criteria } = body;

  if (!url || !criteria || criteria.length === 0) {
    return c.json({ error: "url and criteria are required" }, 400);
  }

  // Resolve URL from project config if not provided directly
  let targetUrl = url;
  if (!targetUrl && project_id) {
    const project = await getProject(project_id);
    targetUrl = project?.config.deployment.live_url || "";
  }

  if (!targetUrl) {
    return c.json({ error: "No URL to verify" }, 400);
  }

  const session = await createPageSession(targetUrl);
  const results: CriterionResult[] = [];

  try {
    for (const criterion of criteria) {
      const result = await testCriterion(session.page, criterion);
      results.push(result);
    }

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const overall = failed === 0 ? "pass" : "fail";

    const failingIds = results
      .filter((r) => !r.passed)
      .map((r) => `#${r.id}`)
      .join(", ");

    const summary =
      overall === "pass"
        ? `All ${passed} criteria passed`
        : `${passed}/${criteria.length} passed. Failing: ${failingIds}`;

    const response: VerifyCriteriaResponse = {
      results,
      overall,
      summary,
      console_errors: session.consoleErrors,
      network_errors: session.networkErrors,
    };

    return c.json(response);
  } finally {
    await session.cleanup();
  }
});

async function testCriterion(
  page: Page,
  criterion: AcceptanceCriterion
): Promise<CriterionResult> {
  const startTime = Date.now();
  const { id, test_selector, test_action, expected_result } = criterion;

  try {
    // Take screenshot before action
    const screenshotBefore = await takeScreenshot(page, `${id}-before`);

    // If no selector provided, this is a manual/build criterion — skip browser test
    if (!test_selector) {
      return {
        id,
        criterion: criterion.criterion,
        passed: false,
        message: "No test_selector defined — requires manual verification or build check",
        screenshot_before: screenshotBefore,
        duration_ms: Date.now() - startTime,
      };
    }

    // Wait for the element to appear
    const element = await page.waitForSelector(test_selector, { timeout: 10000 }).catch(() => null);

    if (!element) {
      return {
        id,
        criterion: criterion.criterion,
        passed: false,
        message: `Element not found: ${test_selector}`,
        screenshot_before: screenshotBefore,
        duration_ms: Date.now() - startTime,
      };
    }

    // Perform the action
    if (test_action === "click") {
      await element.click();
      // Wait for potential animations/renders
      await page.waitForTimeout(1000);
    } else if (test_action === "type") {
      await element.fill("test-input");
      await page.waitForTimeout(500);
    } else if (test_action === "hover") {
      await element.hover();
      await page.waitForTimeout(500);
    }
    // "exists" or no action — just verify the element is present

    // Take screenshot after action
    const screenshotAfter = await takeScreenshot(page, `${id}-after`);

    // Verify expected result
    let passed = true;
    let message = "Criterion passed";

    if (expected_result) {
      passed = await verifyExpectedResult(page, expected_result);
      message = passed
        ? `Expected result verified: ${expected_result}`
        : `Expected result not met: ${expected_result}`;
    }

    return {
      id,
      criterion: criterion.criterion,
      passed,
      message,
      screenshot_before: screenshotBefore,
      screenshot_after: screenshotAfter,
      duration_ms: Date.now() - startTime,
    };
  } catch (err) {
    return {
      id,
      criterion: criterion.criterion,
      passed: false,
      message: `Error testing criterion: ${(err as Error).message}`,
      duration_ms: Date.now() - startTime,
    };
  }
}

async function verifyExpectedResult(page: Page, expected: string): Promise<boolean> {
  // Parse expected result patterns:
  // ".modal is visible" — check element visibility
  // ".modal is hidden" — check element is not visible
  // "text:Hello World" — check text content exists on page
  // "#count contains 5" — check element text content
  // Default: treat as CSS selector visibility check

  const visibleMatch = expected.match(/^(.+?)\s+is\s+visible$/i);
  if (visibleMatch) {
    const selector = visibleMatch[1].trim();
    const el = await page.waitForSelector(selector, { state: "visible", timeout: 5000 }).catch(() => null);
    return el !== null;
  }

  const hiddenMatch = expected.match(/^(.+?)\s+is\s+hidden$/i);
  if (hiddenMatch) {
    const selector = hiddenMatch[1].trim();
    const el = await page.$(selector);
    if (!el) return true; // not in DOM = hidden
    return !(await el.isVisible());
  }

  const textMatch = expected.match(/^text:(.+)$/i);
  if (textMatch) {
    const text = textMatch[1].trim();
    const content = await page.textContent("body");
    return content?.includes(text) || false;
  }

  const containsMatch = expected.match(/^(.+?)\s+contains\s+(.+)$/i);
  if (containsMatch) {
    const selector = containsMatch[1].trim();
    const expectedText = containsMatch[2].trim();
    const el = await page.$(selector);
    if (!el) return false;
    const text = await el.textContent();
    return text?.includes(expectedText) || false;
  }

  // Default: treat entire string as a CSS selector and check visibility
  const el = await page.waitForSelector(expected, { state: "visible", timeout: 5000 }).catch(() => null);
  return el !== null;
}

export default app;
