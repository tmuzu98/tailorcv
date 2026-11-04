import express, { type Express } from "express";
import { API_PREFIX } from "@tailorcv/shared";
import { healthRouter } from "./routes/health";

/**
 * Express app factory. Kept separate from server.ts so tests can create an app
 * without opening a port. Dependencies (logger, LLM client, …) will be passed
 * in here as the app grows.
 *
 * Coming on Day 5: requestId, request logging, helmet, CORS, rate limits, error handler.
 */
export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");

  app.use(API_PREFIX, healthRouter);

  return app;
}
