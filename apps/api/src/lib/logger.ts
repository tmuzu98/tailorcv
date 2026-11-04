import { pino, type Logger } from "pino";
import type { Env } from "../config/env";

/**
 * Structured JSON logger. Pretty-printed in development.
 * RULE: never log resume content, job description text, or file buffers.
 * Request-body redaction is added with the request logger on Day 5 (BE-1).
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
