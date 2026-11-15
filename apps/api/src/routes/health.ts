import { Router } from "express";
import type { HealthResponse } from "@tailorcv/shared";
import pkg from "../../package.json" with { type: "json" };

/**
 * GET /health. `llmSwitch` is included only while the development provider switch is on
 * (D-103, temporary), so the web app knows to show its provider buttons.
 */
export function createHealthRouter(llmSwitch?: HealthResponse["llmSwitch"]): Router {
  const router = Router();
  router.get("/health", (_req, res) => {
    const body: HealthResponse = {
      status: "ok",
      version: pkg.version,
      uptimeSec: Math.floor(process.uptime()),
      ...(llmSwitch && { llmSwitch }),
    };
    res.json(body);
  });
  return router;
}
