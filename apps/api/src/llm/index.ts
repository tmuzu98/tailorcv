import type { LlmProvider } from "@tailorcv/shared";
import type { Logger } from "pino";
import type { Env } from "../config/env";
import { AppError } from "../lib/errors";
import { AnthropicLlmClient } from "./AnthropicLlmClient";
import type { LlmClient } from "./LlmClient";
import { OllamaLlmClient } from "./OllamaLlmClient";
import { SwitchableLlmClient } from "./providerSwitch";
import { withDeadline } from "./withDeadline";
import { withUsageLimits } from "./withUsageLimits";

export type {
  GenerateStructuredParams,
  LlmClient,
  LlmContent,
  LlmEffort,
  LlmResult,
  LlmUsage,
} from "./LlmClient";
export { AnthropicLlmClient } from "./AnthropicLlmClient";
export { FakeLlmClient } from "./FakeLlmClient";
export { OllamaLlmClient } from "./OllamaLlmClient";
export { SwitchableLlmClient, runWithLlmProvider } from "./providerSwitch";
export { DeadlineLlmClient, withDeadline } from "./withDeadline";
export { UsageLimitedLlmClient, withUsageLimits } from "./withUsageLimits";

export type LlmEnv = Pick<
  Env,
  | "LLM_PROVIDER"
  | "LLM_PROVIDER_SWITCH"
  | "ANTHROPIC_API_KEY"
  | "ANTHROPIC_MODEL"
  | "LLM_TIMEOUT_MS"
  | "LLM_DEADLINE_MS"
  | "LLM_DAILY_CALL_LIMIT"
  | "LLM_MAX_CONCURRENT"
  | "OLLAMA_BASE_URL"
  | "OLLAMA_MODEL"
  | "OLLAMA_TIMEOUT_MS"
  | "OLLAMA_NUM_CTX"
>;

/**
 * THE switch between LLM providers (D-68): set `LLM_PROVIDER` in apps/api/.env and restart.
 * The returned client is wrapped in the overall deadline (`LLM_DEADLINE_MS`, D-72) and, inside
 * it, in the service-wide usage limits (`LLM_DAILY_CALL_LIMIT`, `LLM_MAX_CONCURRENT`, D-101).
 * Nothing else in the app knows which provider is in use; everything takes an `LlmClient`.
 * - `ollama`: local development (default outside production). Free, private, weaker.
 * - `anthropic`: Claude. Required in production. Without a key (development only) it returns a
 *   client that fails each call with a clear, logged INTERNAL_ERROR instead of crashing at startup.
 */
export function createLlmClient(env: LlmEnv, logger: Logger): LlmClient {
  if (!env.LLM_PROVIDER_SWITCH) {
    return createLimitedClient(env.LLM_PROVIDER, env, logger, env.LLM_DEADLINE_MS);
  }
  // DEVELOPMENT ONLY, TEMPORARY (D-103): build both providers; each request may choose one.
  logger.warn(
    { llmProviderDefault: env.LLM_PROVIDER },
    "LLM provider switch is ON: requests may choose the provider (development only)",
  );
  const deadlineFor = (provider: LlmProvider) =>
    provider === env.LLM_PROVIDER ? env.LLM_DEADLINE_MS : DEFAULT_DEADLINE_MS[provider];
  return new SwitchableLlmClient(
    {
      anthropic: createLimitedClient("anthropic", env, logger, deadlineFor("anthropic")),
      ollama: createLimitedClient("ollama", env, logger, deadlineFor("ollama")),
    },
    env.LLM_PROVIDER,
    logger,
  );
}

/** Overall deadline per provider when it is not the configured one (same defaults as env.ts). */
const DEFAULT_DEADLINE_MS: Record<LlmProvider, number> = { anthropic: 120_000, ollama: 300_000 };

/** One provider's client with the same usage limits (D-101) and overall deadline (D-72). */
function createLimitedClient(
  provider: LlmProvider,
  env: LlmEnv,
  logger: Logger,
  deadlineMs: number,
): LlmClient {
  const limited = withUsageLimits(
    createProviderClient(provider, env, logger),
    { dailyCalls: env.LLM_DAILY_CALL_LIMIT, maxConcurrent: env.LLM_MAX_CONCURRENT },
    logger,
  );
  return withDeadline(limited, deadlineMs, logger);
}

function createProviderClient(provider: LlmProvider, env: LlmEnv, logger: Logger): LlmClient {
  if (provider === "ollama") {
    logger.info(
      { llmProvider: "ollama", model: env.OLLAMA_MODEL, baseURL: env.OLLAMA_BASE_URL },
      "LLM provider: ollama (local development only)",
    );
    return new OllamaLlmClient({
      baseURL: env.OLLAMA_BASE_URL,
      model: env.OLLAMA_MODEL,
      timeoutMs: env.OLLAMA_TIMEOUT_MS,
      numCtx: env.OLLAMA_NUM_CTX,
      logger,
    });
  }

  if (!env.ANTHROPIC_API_KEY) {
    logger.warn(
      "LLM provider: anthropic, but ANTHROPIC_API_KEY is not set: AI features will fail until it is added to apps/api/.env",
    );
    return {
      async generateStructured() {
        logger.error("llm call attempted without ANTHROPIC_API_KEY");
        throw new AppError("INTERNAL_ERROR", { cause: new Error("ANTHROPIC_API_KEY is not set") });
      },
    };
  }
  logger.info({ llmProvider: "anthropic", model: env.ANTHROPIC_MODEL }, "LLM provider: anthropic");
  return new AnthropicLlmClient({
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.ANTHROPIC_MODEL,
    timeoutMs: env.LLM_TIMEOUT_MS,
    logger,
  });
}
