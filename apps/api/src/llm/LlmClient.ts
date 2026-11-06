import type { z } from "zod";

/**
 * PROVIDER-NEUTRAL TYPES ONLY (D-69). Nothing in this file may reference an SDK: services build
 * requests with these types, and each LlmClient translates them for its provider. Switching
 * providers must never require changing a service.
 */

/**
 * How hard the model should think (tech design §6.3: parse = low, tailor = medium).
 * A hint: Claude maps it to `output_config.effort`; providers without the concept ignore it.
 */
export type LlmEffort = "low" | "medium" | "high" | "xhigh" | "max";

/** One piece of user-turn content. Clients convert these to their provider's format. */
export type LlmContentPart =
  | { type: "text"; text: string }
  /** A PDF file. Claude reads it natively (text + layout); text-only providers extract the text. */
  | { type: "pdf"; data: Uint8Array };

/** User-turn content: plain text, or parts (e.g. a PDF followed by instructions). */
export type LlmContent = string | LlmContentPart[];

export interface GenerateStructuredParams<S extends z.ZodType> {
  /** Versioned prompt id (e.g. "parse-v1"). Logged so output quality can be traced to a prompt. */
  promptVersion: string;
  /** Stable system prompt. Cached; never put per-request data in it. */
  system: string;
  content: LlmContent;
  /** Output schema. Sent as a structured-output format and validated again on our side. */
  schema: S;
  effort: LlmEffort;
  maxTokens: number;
  /**
   * Cancels the call (e.g. the overall deadline fired, or the HTTP client disconnected).
   * Clients pass it to their transport and, once aborted, rethrow without mapping or logging:
   * `withDeadline` decides what an abort means.
   */
  signal?: AbortSignal;
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export interface LlmResult<T> {
  data: T;
  /** Model that produced the answer (differs from the configured one if a fallback ran). */
  model: string;
  usage: LlmUsage;
  durationMs: number;
  /** 1, or 2 when the first answer failed schema validation and was retried. */
  attempts: number;
}

/**
 * The only way the app talks to an LLM. Services depend on this interface, never on the SDK, so
 * tests and CI inject FakeLlmClient and never call the real API.
 *
 * Implementations throw AppError: AI_TIMEOUT, AI_PROVIDER_ERROR, AI_INVALID_OUTPUT, or
 * INTERNAL_ERROR (our misconfiguration, e.g. a missing/invalid API key or a malformed request).
 */
export interface LlmClient {
  generateStructured<S extends z.ZodType>(
    params: GenerateStructuredParams<S>,
  ): Promise<LlmResult<z.infer<S>>>;
}
