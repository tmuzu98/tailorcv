import type { Logger } from "pino";
import type { Env } from "../config/env";
import { AppError } from "../lib/errors";
import { AnthropicLlmClient } from "./AnthropicLlmClient";
import type { LlmClient } from "./LlmClient";
import { OllamaLlmClient } from "./OllamaLlmClient";
import { withDeadline } from "./withDeadline";

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
export { DeadlineLlmClient, withDeadline } from "./withDeadline";

export type LlmEnv = Pick<
  Env,
  | "LLM_PROVIDER"
  | "ANTHROPIC_API_KEY"
  | "ANTHROPIC_MODEL"
  | "LLM_TIMEOUT_MS"
  | "LLM_DEADLINE_MS"
  | "OLLAMA_BASE_URL"
  | "OLLAMA_MODEL"
  | "OLLAMA_TIMEOUT_MS"
  | "OLLAMA_NUM_CTX"
>;

/**
 * THE switch between LLM providers (D-68): set `LLM_PROVIDER` in apps/api/.env and restart.
 * The returned client is wrapped in the overall deadline (`LLM_DEADLINE_MS`, D-72).
 * Nothing else in the app knows which provider is in use; everything takes an `LlmClient`.
 * - `ollama`: local development (default outside production). Free, private, weaker.
 * - `anthropic`: Claude. Required in production. Without a key (development only) it returns a
 *   client that fails each call with a clear, logged INTERNAL_ERROR instead of crashing at startup.
 */
export function createLlmClient(env: LlmEnv, logger: Logger): LlmClient {
  // Every provider gets the same overall per-call deadline (D-72).
  return withDeadline(createProviderClient(env, logger), env.LLM_DEADLINE_MS, logger);
}

function createProviderClient(env: LlmEnv, logger: Logger): LlmClient {
  if (env.LLM_PROVIDER === "ollama") {
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
