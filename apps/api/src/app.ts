import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import type { Logger } from "pino";
import { API_PREFIX } from "@tailorcv/shared";
import type { Env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { REQUEST_ID_HEADER, requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { healthRouter } from "./routes/health";

export const JSON_BODY_LIMIT = "200kb";

export interface AppDeps {
  env: Pick<Env, "CORS_ORIGIN" | "TRUST_PROXY">;
  logger: Logger;
}

/**
 * Express app factory. Kept separate from server.ts so tests can create an app without opening
 * a port. Dependencies are injected (LLM client and services join on Day 7+).
 *
 * Middleware order matters:
 * requestId → access log → security headers → CORS → JSON body → routes → 404 → error handler.
 * Rate limiters (middleware/rateLimit.ts) are applied per route on the parse/tailor routers.
 */
export function createApp({ env, logger }: AppDeps): Express {
  const app = express();
  app.disable("x-powered-by");
  // Behind Render's proxy the client IP is in X-Forwarded-For; needed for per-IP rate limits.
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(requestId());
  app.use(requestLogger(logger));
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST"],
      exposedHeaders: [REQUEST_ID_HEADER, "Retry-After"],
    }),
  );
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use(API_PREFIX, healthRouter);

  app.use(notFoundHandler());
  app.use(errorHandler());

  return app;
}
