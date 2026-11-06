import type { RequestHandler } from "express";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";

/**
 * Paths that must never appear in logs. Request bodies are not serialized by pino-http at all,
 * and these paths are a second line of defence in case someone logs `{ req }` or `{ body }`.
 * RULE: never log resume content, job description text, file buffers or credentials.
 */
export const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
  "req.body",
  "body",
  "*.resume",
  "*.jobDescription",
  "*.buffer",
];

/** Structured access log: one line per request with method, url, status, time and requestId. */
export function requestLogger(logger: Logger): RequestHandler {
  return pinoHttp({
    logger,
    // requestId middleware runs first and sets req.id; reuse it.
    genReqId: (req) => req.id,
    redact: { paths: REDACT_PATHS, censor: "[REDACTED]" },
    // Log only what we need to debug. Headers, query and params are dropped: they are noisy and
    // could carry user data. The query string is stripped from the URL for the same reason.
    serializers: {
      req: (req: { id: unknown; method: string; url: string }) => ({
        id: req.id,
        method: req.method,
        url: req.url.split("?")[0],
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    // Health checks from the hosting provider would otherwise flood the logs.
    autoLogging: { ignore: (req) => req.url?.split("?")[0]?.endsWith("/health") ?? false },
  });
}
