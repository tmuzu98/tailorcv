import type { z } from "zod";
import { AppError } from "../lib/errors";
import type { GenerateStructuredParams, LlmClient, LlmResult } from "./LlmClient";

/** What the fake returns for one call: data (validated against the call's schema) or an error. */
export type FakeLlmResponse =
  | { data: unknown; model?: string }
  | { error: AppError }
  | ((params: GenerateStructuredParams<z.ZodType>) => unknown);

/** A recorded call, without the system prompt or content (tests assert on the knobs). */
export interface FakeLlmCall {
  promptVersion: string;
  effort: GenerateStructuredParams<z.ZodType>["effort"];
  maxTokens: number;
  /** "text" for a plain string, otherwise the part types in order, e.g. ["pdf", "text"]. */
  content: "text" | Array<"text" | "pdf">;
}

/**
 * Deterministic LlmClient for tests and CI (hard rule: they never call the real API).
 * Queue responses with `enqueue`, or pass a default responder. Data is validated against the
 * caller's schema, so a stale fixture fails loudly as AI_INVALID_OUTPUT, like a bad real answer.
 */
export class FakeLlmClient implements LlmClient {
  readonly calls: FakeLlmCall[] = [];
  private readonly queue: FakeLlmResponse[] = [];

  constructor(private readonly fallback?: FakeLlmResponse) {}

  enqueue(...responses: FakeLlmResponse[]): this {
    this.queue.push(...responses);
    return this;
  }

  async generateStructured<S extends z.ZodType>(
    params: GenerateStructuredParams<S>,
  ): Promise<LlmResult<z.infer<S>>> {
    this.calls.push({
      promptVersion: params.promptVersion,
      effort: params.effort,
      maxTokens: params.maxTokens,
      content:
        typeof params.content === "string" ? "text" : params.content.map((part) => part.type),
    });

    const next = this.queue.shift() ?? this.fallback;
    if (!next) throw new Error("FakeLlmClient: no response queued for this call");

    let data: unknown;
    let model = "fake-model";
    if (typeof next === "function") {
      data = await next(params as GenerateStructuredParams<z.ZodType>);
    } else if ("error" in next) {
      throw next.error;
    } else {
      data = next.data;
      model = next.model ?? model;
    }

    const result = params.schema.safeParse(data);
    if (!result.success) {
      throw new AppError("AI_INVALID_OUTPUT", {
        cause: new Error(`FakeLlmClient: fixture does not match schema: ${result.error.message}`),
      });
    }
    return {
      data: result.data,
      model,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
      },
      durationMs: 0,
      attempts: 1,
    };
  }
}
