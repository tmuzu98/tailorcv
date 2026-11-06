import type { Logger } from "pino";
import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod";
import { AppError } from "../lib/errors";
import type { GenerateStructuredParams, LlmClient, LlmContent, LlmResult } from "./LlmClient";
import { SchemaMismatch, parseStructuredText } from "./structured";

/** Same rule as the Anthropic client: one app-level retry on invalid JSON / schema mismatch. */
export const MAX_ATTEMPTS = 2;

export interface OllamaLlmClientOptions {
  baseURL: string;
  model: string;
  logger: Logger;
  /** Local models are slow; default 5 min (OLLAMA_TIMEOUT_MS). */
  timeoutMs?: number;
  /** Context window in tokens. Set explicitly: Ollama's default can silently truncate input. */
  numCtx?: number;
}

/** Subset of Ollama's POST /api/chat (stream: false) response that we use. */
interface OllamaChatResponse {
  model?: string;
  message?: { content?: string };
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  error?: string;
}

/**
 * LOCAL DEVELOPMENT ONLY (D-68, ADR-012): a free, private LlmClient backed by Ollama.
 * Production refuses this provider (config/env.ts). Differences from Claude:
 * - PDF parts are converted to plain text with unpdf (Ollama can't read PDFs), so layout is lost.
 * - `effort` is ignored. `maxTokens` → `num_predict`. Temperature 0 for repeatable output.
 * Same contract otherwise: structured output (JSON schema), our own zod validation with one retry,
 * the same error codes, and logs without any prompt/resume content.
 */
export class OllamaLlmClient implements LlmClient {
  private readonly baseURL: string;
  private readonly model: string;
  private readonly logger: Logger;
  private readonly timeoutMs: number;
  private readonly numCtx: number;

  constructor(options: OllamaLlmClientOptions) {
    this.baseURL = options.baseURL.replace(/\/+$/, "");
    this.model = options.model;
    this.logger = options.logger;
    this.timeoutMs = options.timeoutMs ?? 300_000;
    this.numCtx = options.numCtx ?? 8192;
  }

  async generateStructured<S extends z.ZodType>(
    params: GenerateStructuredParams<S>,
  ): Promise<LlmResult<z.infer<S>>> {
    const started = performance.now();
    const logBase = {
      provider: "ollama",
      promptVersion: params.promptVersion,
      effort: params.effort, // logged for comparison with Claude; Ollama ignores it
      model: this.model,
    };
    const userText = await toPlainText(params.content);
    // Inlined JSON schema (no $ref), which Ollama's grammar-constrained output handles best.
    const format = z.toJSONSchema(params.schema);

    for (let attempt = 1; ; attempt++) {
      const body = await this.chat(
        {
          model: this.model,
          stream: false,
          format,
          options: { temperature: 0, num_ctx: this.numCtx, num_predict: params.maxTokens },
          messages: [
            { role: "system", content: params.system },
            { role: "user", content: userText },
          ],
        },
        { ...logBase, attempt },
        params.signal,
      );

      const usage = {
        inputTokens: body.prompt_eval_count ?? 0,
        outputTokens: body.eval_count ?? 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
      };
      const callLog = {
        ...logBase,
        attempt,
        servedBy: body.model ?? this.model,
        stopReason: body.done_reason ?? null,
        usage,
        durationMs: Math.round(performance.now() - started),
      };

      if (body.done_reason === "length") {
        this.logger.error({ llm: callLog }, "llm output truncated (num_predict / num_ctx reached)");
        throw new AppError("AI_INVALID_OUTPUT");
      }

      try {
        const data = parseStructuredText(body.message?.content ?? "", params.schema);
        this.logger.info({ llm: callLog }, "llm call completed");
        return {
          data,
          model: callLog.servedBy,
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

  private async chat(
    payload: unknown,
    log: Record<string, unknown>,
    callerSignal?: AbortSignal,
  ): Promise<OllamaChatResponse> {
    const attemptTimeout = AbortSignal.timeout(this.timeoutMs);
    let res: Response;
    try {
      res = await fetch(`${this.baseURL}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: callerSignal ? AbortSignal.any([attemptTimeout, callerSignal]) : attemptTimeout,
      });
    } catch (err) {
      if (callerSignal?.aborted) throw err; // cancelled on purpose: the caller maps it
      if (err instanceof DOMException && err.name === "TimeoutError") {
        this.logger.error({ llm: log }, "llm request timed out");
        throw new AppError("AI_TIMEOUT", { cause: err });
      }
      this.logger.error(
        { llm: { ...log, baseURL: this.baseURL } },
        "cannot reach Ollama (is it running? `ollama serve`)",
      );
      throw new AppError("AI_PROVIDER_ERROR", { cause: err });
    }

    const body = (await res.json().catch(() => ({}))) as OllamaChatResponse;
    if (res.ok) return body;

    const info = { ...log, status: res.status, upstreamError: body.error ?? null };
    if (res.status >= 500) {
      this.logger.error({ llm: info }, "ollama error");
      throw new AppError("AI_PROVIDER_ERROR");
    }
    // 404 = model not pulled; other 4xx = bad request. Both are our setup, not the user's fault.
    this.logger.error(
      { llm: info },
      res.status === 404
        ? `ollama model not found (run \`ollama pull ${this.model}\`)`
        : "ollama rejected the request",
    );
    throw new AppError("INTERNAL_ERROR", { cause: new Error(`ollama ${res.status}`) });
  }
}

/** Neutral content → plain text for Ollama: text parts pass through, PDFs become extracted text. */
export async function toPlainText(content: LlmContent): Promise<string> {
  if (typeof content === "string") return content;
  const parts: string[] = [];
  for (const part of content) {
    if (part.type === "text") {
      parts.push(part.text);
      continue;
    }
    // pdf.js may detach the buffer it is given: pass a copy, keep the caller's intact.
    const pdf = await getDocumentProxy(new Uint8Array(part.data), { verbosity: 0 });
    try {
      const { text } = await extractText(pdf, { mergePages: true });
      parts.push(text);
    } finally {
      await pdf.loadingTask.destroy().catch(() => undefined);
    }
  }
  return parts.join("\n\n");
}
