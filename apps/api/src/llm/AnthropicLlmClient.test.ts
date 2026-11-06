import { Writable } from "node:stream";
import Anthropic from "@anthropic-ai/sdk";
import { pino } from "pino";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError } from "../lib/errors";
import { AnthropicLlmClient, FALLBACK_BETA, toClaudeContent } from "./AnthropicLlmClient";

const Schema = z.object({ name: z.string(), years: z.number() });
const SECRET_CONTENT = "Jane Candidate, 555-0100, secret resume text";
const SECRET_SYSTEM = "SYSTEM PROMPT TEXT";

function message(overrides: Partial<Anthropic.Beta.BetaMessage> = {}): Anthropic.Beta.BetaMessage {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content: [
      { type: "text", text: JSON.stringify({ name: "Jane Candidate", years: 7 }), citations: null },
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 120,
      output_tokens: 40,
      cache_read_input_tokens: 100,
      cache_creation_input_tokens: 0,
    },
    ...overrides,
  } as Anthropic.Beta.BetaMessage;
}

const textMessage = (text: string, extra: Partial<Anthropic.Beta.BetaMessage> = {}) =>
  message({ content: [{ type: "text", text, citations: null }] as never, ...extra });

function setup(...responses: Array<Anthropic.Beta.BetaMessage | Error>) {
  const create = vi.fn();
  for (const r of responses) {
    if (r instanceof Error) create.mockRejectedValueOnce(r);
    else create.mockResolvedValueOnce(r);
  }
  const lines: string[] = [];
  const logger = pino(
    { level: "info" },
    new Writable({
      write(chunk: Buffer, _enc, done) {
        lines.push(chunk.toString());
        done();
      },
    }),
  );
  const client = new AnthropicLlmClient({
    model: "claude-opus-5-5",
    logger,
    client: { beta: { messages: { create } } } as unknown as Pick<Anthropic, "beta">,
  });
  const call = () =>
    client.generateStructured({
      promptVersion: "test-v1",
      system: SECRET_SYSTEM,
      content: SECRET_CONTENT,
      schema: Schema,
      effort: "low",
      maxTokens: 2000,
    });
  return {
    create,
    call,
    logs: () => lines.map((l) => JSON.parse(l)),
    rawLogs: () => lines.join(""),
  };
}

async function codeOf(promise: Promise<unknown>): Promise<string> {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(AppError);
  return (err as AppError).code;
}

describe("AnthropicLlmClient request", () => {
  it("sends structured output, adaptive thinking, effort, cached system prompt and the fallback beta", async () => {
    const { create, call } = setup(message());
    await call();

    const params = create.mock.calls[0]?.[0];
    expect(params).toMatchObject({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      system: [{ type: "text", text: SECRET_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: SECRET_CONTENT }],
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: { type: "json_schema" } },
      betas: [FALLBACK_BETA],
      fallbacks: "default",
    });
    // Only the JSON schema is sent, not the helper's parse function.
    expect(Object.keys(params.output_config.format).sort()).toEqual(["schema", "type"]);
    expect(params.output_config.format.schema).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["name", "years"],
    });
  });
});

describe("AnthropicLlmClient response handling", () => {
  it("returns validated data, usage, the serving model and attempts = 1", async () => {
    const { call } = setup(message({ model: "claude-opus-5" }));
    await expect(call()).resolves.toEqual({
      data: { name: "Jane Candidate", years: 7 },
      model: "claude-opus-5",
      usage: {
        inputTokens: 120,
        outputTokens: 40,
        cacheReadInputTokens: 100,
        cacheCreationInputTokens: 0,
      },
      durationMs: expect.any(Number),
      attempts: 1,
    });
  });

  it("ignores thinking and fallback blocks and joins the text blocks", async () => {
    const { call } = setup(
      message({
        content: [
          { type: "thinking", thinking: "", signature: "sig" },
          { type: "text", text: '{"name":"A",', citations: null },
          { type: "text", text: '"years":1}', citations: null },
        ] as never,
      }),
    );
    await expect(call()).resolves.toMatchObject({ data: { name: "A", years: 1 } });
  });

  it("retries once when the answer doesn't match the schema, then succeeds", async () => {
    const { create, call } = setup(textMessage('{"name":"A"}'), message());
    await expect(call()).resolves.toMatchObject({ attempts: 2 });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("retries once on invalid JSON", async () => {
    const { create, call } = setup(textMessage("not json"), message());
    await expect(call()).resolves.toMatchObject({ attempts: 2 });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("gives up after the second schema failure with AI_INVALID_OUTPUT", async () => {
    const { create, call } = setup(textMessage('{"years":"x"}'), textMessage("[]"));
    expect(await codeOf(call())).toBe("AI_INVALID_OUTPUT");
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("treats a refusal as AI_PROVIDER_ERROR without retrying, and logs the category", async () => {
    const { create, call, logs } = setup(
      textMessage("", {
        stop_reason: "refusal",
        stop_details: { type: "refusal", category: "cyber", explanation: "x" },
      } as never),
    );
    expect(await codeOf(call())).toBe("AI_PROVIDER_ERROR");
    expect(create).toHaveBeenCalledTimes(1);
    expect(logs().at(-1)).toMatchObject({
      msg: "llm request declined",
      llm: { refusalCategory: "cyber" },
    });
  });

  it("treats max_tokens truncation as AI_INVALID_OUTPUT without retrying", async () => {
    const { create, call } = setup(textMessage('{"name":"Ja', { stop_reason: "max_tokens" }));
    expect(await codeOf(call())).toBe("AI_INVALID_OUTPUT");
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe("AnthropicLlmClient error mapping", () => {
  const headers = new Headers({ "request-id": "req_upstream_1" });
  type ErrorCtor = new (status: number, error: object, message: string, headers: Headers) => Error;
  const apiError = (Cls: unknown, status: number, type: string) =>
    new (Cls as ErrorCtor)(
      status,
      { type: "error", error: { type, message: "upstream says no" } },
      "upstream says no",
      headers,
    );

  it.each<[string, Error, string]>([
    ["timeout", new Anthropic.APIConnectionTimeoutError({ message: "timed out" }), "AI_TIMEOUT"],
    [
      "connection failure",
      new Anthropic.APIConnectionError({ message: "ECONNRESET" }),
      "AI_PROVIDER_ERROR",
    ],
    [
      "429 rate limit",
      apiError(Anthropic.RateLimitError, 429, "rate_limit_error"),
      "AI_PROVIDER_ERROR",
    ],
    [
      "500 server error",
      apiError(Anthropic.InternalServerError, 500, "api_error"),
      "AI_PROVIDER_ERROR",
    ],
    [
      "529 overloaded",
      apiError(Anthropic.InternalServerError, 529, "overloaded_error"),
      "AI_PROVIDER_ERROR",
    ],
    [
      "401 bad key",
      apiError(Anthropic.AuthenticationError, 401, "authentication_error"),
      "INTERNAL_ERROR",
    ],
    [
      "400 bad request",
      apiError(Anthropic.BadRequestError, 400, "invalid_request_error"),
      "INTERNAL_ERROR",
    ],
    [
      "404 unknown model",
      apiError(Anthropic.NotFoundError, 404, "not_found_error"),
      "INTERNAL_ERROR",
    ],
    ["unknown error", new Error("boom"), "INTERNAL_ERROR"],
  ])("%s → %s", async (_name, error, code) => {
    const { create, call } = setup(error);
    expect(await codeOf(call())).toBe(code);
    expect(create).toHaveBeenCalledTimes(1); // SDK errors are never retried at app level
  });

  it("logs the upstream request id and status for provider errors", async () => {
    const { call, logs } = setup(apiError(Anthropic.InternalServerError, 529, "overloaded_error"));
    await call().catch(() => undefined);
    expect(logs().at(-1)).toMatchObject({
      level: 50,
      llm: {
        status: 529,
        errorType: "overloaded_error",
        requestId: "req_upstream_1",
        promptVersion: "test-v1",
      },
    });
  });
});

describe("AnthropicLlmClient logging", () => {
  it("logs prompt version, effort, usage and timing — never the prompt, content or answer", async () => {
    const { call, logs, rawLogs } = setup(textMessage('{"name":"A"}'), message());
    await call();

    expect(logs().at(-1)).toMatchObject({
      msg: "llm call completed",
      llm: {
        promptVersion: "test-v1",
        effort: "low",
        model: "claude-opus-5-5",
        servedBy: "claude-opus-5-5",
        attempt: 2,
        stopReason: "end_turn",
        usage: { inputTokens: 120, outputTokens: 40, cacheReadInputTokens: 100 },
        durationMs: expect.any(Number),
      },
    });
    for (const secret of [SECRET_CONTENT, SECRET_SYSTEM, "Jane Candidate", "555-0100"]) {
      expect(rawLogs()).not.toContain(secret);
    }
  });
});

describe("toClaudeContent (neutral content → Claude blocks)", () => {
  it("passes plain strings through", () => {
    expect(toClaudeContent("hello")).toBe("hello");
  });

  it("turns PDF parts into base64 document blocks placed before the text", () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"
    expect(
      toClaudeContent([
        { type: "text", text: "Extract this resume." },
        { type: "pdf", data: pdf },
      ]),
    ).toEqual([
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: "JVBERg==" },
      },
      { type: "text", text: "Extract this resume." },
    ]);
  });
});
