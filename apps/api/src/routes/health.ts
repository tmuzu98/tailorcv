import { Router } from "express";
import type { HealthResponse } from "@tailorcv/shared";
import pkg from "../../package.json" with { type: "json" };

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  const body: HealthResponse = {
    status: "ok",
    version: pkg.version,
    uptimeSec: Math.floor(process.uptime()),
  };
  res.json(body);
});
