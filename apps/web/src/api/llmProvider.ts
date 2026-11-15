import { LlmProviderSchema, type LlmProvider } from "@tailorcv/shared";

/**
 * DEVELOPMENT ONLY, TEMPORARY (D-103): the AI provider the tester picked with the buttons in the
 * header. Sent as a request header by the API client; the API uses it only while its provider
 * switch is on. To be removed before the production deploy.
 */
export const LLM_PROVIDER_STORAGE_KEY = "tailorcv.dev.llmProvider";

export function getLlmProviderChoice(): LlmProvider | null {
  try {
    const parsed = LlmProviderSchema.safeParse(
      window.localStorage.getItem(LLM_PROVIDER_STORAGE_KEY),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null; // storage blocked: no choice, the API uses its default
  }
}

export function setLlmProviderChoice(provider: LlmProvider | null): void {
  try {
    if (provider) window.localStorage.setItem(LLM_PROVIDER_STORAGE_KEY, provider);
    else window.localStorage.removeItem(LLM_PROVIDER_STORAGE_KEY);
  } catch {
    // storage blocked: the choice cannot be kept
  }
}
