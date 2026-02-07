import { chromium, type Browser, type Page, type ConsoleMessage } from "playwright";
import path from "node:path";
import fs from "node:fs";

const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || "/tmp/prometheus-screenshots";

let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance && browserInstance.isConnected()) {
    await browserInstance.close();
    browserInstance = null;
  }
}

export interface PageSession {
  page: Page;
  consoleErrors: string[];
  networkErrors: string[];
  cleanup: () => Promise<void>;
}

export async function createPageSession(url: string): Promise<PageSession> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 PROMETHEUS/1.0",
  });

  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (error: Error) => {
    consoleErrors.push(error.message);
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure();
    networkErrors.push(`${request.method()} ${request.url()} — ${failure?.errorText || "unknown error"}`);
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

  return {
    page,
    consoleErrors,
    networkErrors,
    cleanup: async () => {
      await context.close();
    },
  };
}

export async function takeScreenshot(page: Page, label: string): Promise<string> {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const filename = `${label}-${Date.now()}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  return filepath;
}
