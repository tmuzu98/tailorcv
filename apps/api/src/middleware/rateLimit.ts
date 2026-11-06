import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import type { Env } from "../config/env";
import { AppError } from "../lib/errors";

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Per-IP limiter that answers with our standard RATE_LIMITED error. express-rate-limit sets the
 * `Retry-After` and `RateLimit` headers before calling our handler. In-memory store: fine for a
 * single instance (Render free); switch to a shared store if we ever scale out.
 */
export function createRateLimiter(options: { limit: number; windowMs?: number }): RequestHandler {
  const windowMs = options.windowMs ?? ONE_HOUR_MS;
  return rateLimit({
    windowMs,
    limit: options.limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res, next) => {
      const header = Number(res.getHeader("Retry-After"));
      const retryAfterSec = Number.isFinite(header) && header > 0 ? header : windowMs / 1000;
      next(new AppError("RATE_LIMITED", { details: { retryAfterSec } }));
    },
  });
}

export interface RateLimiters {
  parse: RequestHandler;
  tailor: RequestHandler;
}

/** One limiter instance per endpoint family, so parse and tailor budgets are independent. */
export function createRateLimiters(
  env: Pick<Env, "RATE_LIMIT_PARSE_PER_HOUR" | "RATE_LIMIT_TAILOR_PER_HOUR">,
): RateLimiters {
  return {
    parse: createRateLimiter({ limit: env.RATE_LIMIT_PARSE_PER_HOUR }),
    tailor: createRateLimiter({ limit: env.RATE_LIMIT_TAILOR_PER_HOUR }),
  };
}
