import type { Express } from "express";
import { createApp } from "../../src/app";
import { parseEnv } from "../../src/config/env";
import { createLogger } from "../../src/lib/logger";
import { FakeLlmClient } from "../../src/llm/FakeLlmClient";
import type { LlmClient } from "../../src/llm/LlmClient";

/**
 * Builds an app with test defaults (silent logger, localhost CORS) and a FakeLlmClient (tests
 * never call a real model). Pass `llm` to control AI answers; override env vars as needed.
 */
export function buildTestApp(
  envOverrides: NodeJS.ProcessEnv = {},
  deps: { llm?: LlmClient } = {},
): Express {
  const env = parseEnv({ NODE_ENV: "test", ...envOverrides });
  return createApp({ env, logger: createLogger(env), llm: deps.llm ?? new FakeLlmClient() });
}
