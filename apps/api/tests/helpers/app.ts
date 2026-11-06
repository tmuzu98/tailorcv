import type { Express } from "express";
import { createApp } from "../../src/app";
import { parseEnv } from "../../src/config/env";
import { createLogger } from "../../src/lib/logger";

/** Builds an app with test defaults (silent logger, localhost CORS). Override env vars as needed. */
export function buildTestApp(envOverrides: NodeJS.ProcessEnv = {}): Express {
  const env = parseEnv({ NODE_ENV: "test", ...envOverrides });
  return createApp({ env, logger: createLogger(env) });
}
