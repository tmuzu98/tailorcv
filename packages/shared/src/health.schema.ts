import { z } from "zod";

/** The LLM providers the API can use (`LLM_PROVIDER`). */
export const LLM_PROVIDERS = ["anthropic", "ollama"] as const;
export const LlmProviderSchema = z.enum(LLM_PROVIDERS);
export type LlmProvider = z.infer<typeof LlmProviderSchema>;

/**
 * DEVELOPMENT ONLY, TEMPORARY (D-103): request header that picks the provider for one request
 * while the API runs with `LLM_PROVIDER_SWITCH=true`. Ignored otherwise.
 */
export const LLM_PROVIDER_HEADER = "X-LLM-Provider";

/** Response of `GET /api/v1/health` (API spec §1). */
export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  version: z.string(),
  uptimeSec: z.number().int().nonnegative(),
  /**
   * DEVELOPMENT ONLY, TEMPORARY (D-103): present only while the API's provider switch is on.
   * `default` is the configured provider; `available` are the ones a request may choose.
   */
  llmSwitch: z
    .object({ default: LlmProviderSchema, available: z.array(LlmProviderSchema) })
    .optional(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
