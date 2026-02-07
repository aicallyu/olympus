import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import verifyCriteriaApp from "./routes/verify-criteria.js";
import healthCheckApp from "./routes/health-check.js";
import deployDiffApp from "./routes/deploy-diff.js";
import { startHealthMonitor } from "./cron/health-monitor.js";
import { closeBrowser } from "./lib/browser.js";

const app = new Hono();

// Middleware
app.use("*", logger());

// Root — service info
app.get("/", (c) => {
  return c.json({
    service: "PROMETHEUS",
    version: "1.0.0",
    description: "Perception & Verification Service — Onioko Quality Gate System",
    endpoints: [
      "POST /verify-criteria",
      "POST /health-check",
      "POST /deploy-diff",
    ],
    status: "running",
  });
});

// Mount route handlers
app.route("/", verifyCriteriaApp);
app.route("/", healthCheckApp);
app.route("/", deployDiffApp);

// Start server
const port = parseInt(process.env.PORT || "3033", 10);

serve({ fetch: app.fetch, port }, () => {
  console.log(`[PROMETHEUS] Perception service running on port ${port}`);
  console.log(`[PROMETHEUS] Endpoints:`);
  console.log(`  POST http://localhost:${port}/verify-criteria`);
  console.log(`  POST http://localhost:${port}/health-check`);
  console.log(`  POST http://localhost:${port}/deploy-diff`);
});

// Start 30-minute health check cron
startHealthMonitor();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("[PROMETHEUS] Shutting down...");
  await closeBrowser();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[PROMETHEUS] Shutting down...");
  await closeBrowser();
  process.exit(0);
});
