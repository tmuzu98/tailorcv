import { pino, type Logger } from "pino";
import type { Env } from "../config/env";

/**
 * Structured JSON logger. Pretty-printed in development.
 * RULE: never log resume content, job description text, or file buffers.
 * Access logging + redaction live in middleware/requestLogger.ts (D-50).
 */
export function createLogger(env: Pick<Env, "NODE_ENV" | "LOG_LEVEL">): Logger {
  return pino({
    level: env.NODE_ENV === "test" ? "silent" : env.LOG_LEVEL,
    ...(env.NODE_ENV === "development" && {
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
      },
    }),
  });
}
