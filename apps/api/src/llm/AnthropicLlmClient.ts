import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Logger } from "pino";
import type { z } from "zod";
import { AppError } from "../lib/errors";
import type {
  GenerateStructuredParams,
  LlmClient,
  LlmContent,
  LlmResult,
  LlmUsage,
} from "./LlmClient";
import { SchemaMismatch, parseStructuredText } from "./structured";

/** Refusal fallback (tech design §6.3): on a safety decline the API re-runs on a recommended model. */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";
/** One app-level retry when the answer doesn't match the schema (SDK retries cover 429/5xx/network). */
export const MAX_ATTEMPTS = 2;

export interface AnthropicLlmClientOptions {
  model: string;
  logger: Logger;
  apiKey?: string;
  timeoutMs?: number;
  /** SDK-level retries for 408/409/429/5xx and connection errors (SDK default: 2). */
  maxRetries?: number;
  /** Tests only: point the real SDK at a local fake API server. */
  baseURL?: string;
  /** Inject a pre-built SDK client (tests pass a stub; nothing else should). */
  client?: Pick<Anthropic, "beta">;
}

/**
 * Claude via @anthropic-ai/sdk: structured output, adaptive thinking, explicit effort, cached
 * system prompt, server-side refusal fallback, 90 s timeout. Logs ids, sizes, timings and token
 * usage only — never prompts, documents or answers.
 */
export class AnthropicLlmClient implements LlmClient {
  private readonly client: Pick<Anthropic, "beta">;
  private readonly model: string;
  private readonly logger: Logger;

  constructor(options: AnthropicLlmClientOptions) {
    this.model = options.model;
    this.logger = options.logger;
    this.client =
      options.client ??
      new Anthropic({
        apiKey: options.apiKey,
        ...(options.baseURL && { baseURL: options.baseURL }),
        timeout: options.timeoutMs ?? 90_000,
        maxRetries: options.maxRetries ?? 2,
      });
  }

  async generateStructured<S extends z.ZodType>(
    params: GenerateStructuredParams<S>,
  ): Promise<LlmResult<z.infer<S>>> {
    const started = performance.now();
    const logBase = {
      provider: "anthropic",
      promptVersion: params.promptVersion,
      effort: params.effort,
      model: this.model,
    };
    // Only the JSON schema goes to the API; the helper's `parse` function is ours to call.
    const { type, schema: jsonSchema } = betaZodOutputFormat(params.schema);

    for (let attempt = 1; ; attempt++) {
      let response: Anthropic.Beta.BetaMessage;
      try {
        response = await this.client.beta.messages.create(
          {
            model: this.model,
            max_tokens: params.maxTokens,
            system: [{ type: "text", text: params.system, cache_control: { type: "ephemeral" } }],
            messages: [{ role: "user", content: toClaudeContent(params.content) }],
            thinking: { type: "adaptive" },
            output_config: { effort: params.effort, format: { type, schema: jsonSchema } },
            betas: [FALLBACK_BETA],
            fallbacks: "default",
          },
          params.signal ? { signal: params.signal } : undefined,
        );
      } catch (err) {
        if (params.signal?.aborted) throw err; // cancelled on purpose: the caller maps it
        throw this.fromSdkError(err, { ...logBase, attempt });
      }

      const usage = toUsage(response.usage);
      const callLog = {
        ...logBase,
        attempt,
        servedBy: response.model,
        stopReason: response.stop_reason,
        usage,
        durationMs: Math.round(performance.now() - started),
      };

      if (response.stop_reason === "refusal") {
        this.logger.warn(
          { llm: { ...callLog, refusalCategory: response.stop_details?.category ?? null } },
          "llm request declined",
        );
        throw new AppError("AI_PROVIDER_ERROR", {
          message: "The AI service declined to process this request.",
        });
      }
      if (response.stop_reason === "max_tokens") {
        // Truncated JSON. Retrying the same request would truncate again, so fail fast.
        this.logger.error({ llm: callLog }, "llm output truncated at max_tokens");
        throw new AppError("AI_INVALID_OUTPUT");
      }

      try {
        const data = parseStructured(response, params.schema);
        this.logger.info({ llm: callLog }, "llm call completed");
        return {
          data,
          model: response.model,
          usage,
          durationMs: callLog.durationMs,
          attempts: attempt,
        };
      } catch (err) {
        if (!(err instanceof SchemaMismatch)) throw err;
        const retrying = attempt < MAX_ATTEMPTS;
        this.logger.warn({ llm: { ...callLog, retrying } }, "llm output failed schema validation");
        if (!retrying) throw new AppError("AI_INVALID_OUTPUT", { cause: err });
        params.signal?.throwIfAborted();
      }
    }
  }

  /** Typed SDK errors → our codes. Most specific first (timeout ⊂ connection ⊂ APIError). */
  private fromSdkError(err: unknown, log: Record<string, unknown>): AppError {
    const requestId = err instanceof Anthropic.APIError ? (err.requestID ?? null) : null;
    if (err instanceof Anthropic.APIConnectionTimeoutError) {
      this.logger.error({ llm: { ...log, requestId } }, "llm request timed out");
      return new AppError("AI_TIMEOUT", { cause: err });
    }
    if (err instanceof Anthropic.APIConnectionError) {
      this.logger.error({ llm: { ...log, requestId } }, "llm connection failed");
      return new AppError("AI_PROVIDER_ERROR", { cause: err });
    }
    if (err instanceof Anthropic.APIError) {
      const status = err.status ?? 0;
      const info = { ...log, requestId, status, errorType: err.type ?? null };
      // 429 / 5xx (incl. 529 overloaded) survived the SDK's retries: the provider is struggling.
      if (status === 429 || status >= 500) {
        this.logger.error({ llm: info }, "llm provider error");
        return new AppError("AI_PROVIDER_ERROR", { cause: err });
      }
      // Other 4xx (400 malformed request, 401/403 bad key, 404 unknown model): our bug or config.
      this.logger.error({ llm: info }, "llm request rejected (check request/config)");
      return new AppError("INTERNAL_ERROR", { cause: err });
    }
    return new AppError("INTERNAL_ERROR", { cause: err });
  }
}

/**
 * Neutral content → Claude content blocks. PDFs become base64 `document` blocks, placed before
 * the text (Claude's recommended order), so Claude reads text AND layout natively.
 */
export function toClaudeContent(
  content: LlmContent,
): string | Anthropic.Beta.BetaContentBlockParam[] {
  if (typeof content === "string") return content;
  const documents: Anthropic.Beta.BetaContentBlockParam[] = [];
  const texts: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const part of content) {
    if (part.type === "pdf") {
      documents.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: Buffer.from(part.data).toString("base64"),
        },
      });
    } else {
      texts.push({ type: "text", text: part.text });
    }
  }
  return [...documents, ...texts];
}

function toUsage(usage: Anthropic.Beta.BetaUsage): LlmUsage {
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
  };
}

/** Joins the text blocks (thinking/fallback blocks are skipped) and validates against the schema. */
function parseStructured<S extends z.ZodType>(
  response: Anthropic.Beta.BetaMessage,
  schema: S,
): z.infer<S> {
  const text = response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
  return parseStructuredText(text, schema);
}
