import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express, { type RequestHandler } from "express";
import { pino } from "pino";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "../../src/lib/errors";
import { AnthropicLlmClient } from "../../src/llm/AnthropicLlmClient";

/**
 * The REAL @anthropic-ai/sdk against a local fake of the Messages API (never the real API).
 * Proves our mapping works with the SDK's actual error classes, retries, headers and timeouts.
 */
const Schema = z.object({ ok: z.boolean() });

let handler: RequestHandler = (_req, res) => res.status(500).end();
let hits = 0;
let lastBody: Record<string, unknown> = {};
let lastHeaders: Record<string, string | string[] | undefined> = {};
let server: Server;
let baseURL = "";

beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: "5mb" }));
  app.post("/v1/messages", (req, res, next) => {
    hits++;
    lastBody = req.body as Record<string, unknown>;
    lastHeaders = req.headers;
    handler(req, res, next);
  });
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function client(opts: { timeoutMs?: number; maxRetries?: number } = {}) {
  hits = 0;
  return new AnthropicLlmClient({
    apiKey: "sk-ant-test-not-a-real-key",
    model: "claude-opus-5-5",
    baseURL,
    timeoutMs: opts.timeoutMs ?? 5_000,
    maxRetries: opts.maxRetries ?? 0,
    logger: pino({ level: "silent" }),
  });
}

const run = (c: AnthropicLlmClient) =>
  c.generateStructured({
    promptVersion: "sdk-it-v1",
    system: "sys",
    content: "hi",
    schema: Schema,
    effort: "low",
    maxTokens: 256,
  });

const okMessage = {
  id: "msg_1",
  type: "message",
  role: "assistant",
  model: "claude-opus-5-5",
  content: [{ type: "text", text: '{"ok":true}' }],
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 5 },
};

const apiError =
  (status: number, type: string): RequestHandler =>
  (_req, res) => {
    res
      .status(status)
      .set("request-id", "req_fake")
      .json({ type: "error", error: { type, message: "nope" } });
  };

async function codeOf(promise: Promise<unknown>): Promise<string> {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(AppError);
  return (err as AppError).code;
}

describe("AnthropicLlmClient with the real SDK (local fake API)", () => {
  it("sends the expected HTTP request and parses a successful response", async () => {
    handler = (_req, res) => res.json(okMessage);
    await expect(run(client())).resolves.toMatchObject({ data: { ok: true }, attempts: 1 });

    // SDK 1.x sends the key as a bearer token (API version 2026-10-21).
    expect(lastHeaders.authorization).toBe("Bearer sk-ant-test-not-a-real-key");
    expect(String(lastHeaders["anthropic-beta"])).toContain("server-side-fallback-2026-07-01");
    expect(lastBody).toMatchObject({
      model: "claude-opus-5-5",
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: { type: "json_schema" } },
    });
    expect(lastBody).not.toHaveProperty("betas"); // the SDK moves betas into the header
  });

  it("maps a 529 overloaded error to AI_PROVIDER_ERROR after the SDK's retries", async () => {
    handler = apiError(529, "overloaded_error");
    expect(await codeOf(run(client({ maxRetries: 2 })))).toBe("AI_PROVIDER_ERROR");
    expect(hits).toBe(3); // 1 try + 2 SDK retries
  });

  it("maps 401 to INTERNAL_ERROR (bad key is our config, not the user's fault), no retries", async () => {
    handler = apiError(401, "authentication_error");
    expect(await codeOf(run(client({ maxRetries: 2 })))).toBe("INTERNAL_ERROR");
    expect(hits).toBe(1);
  });

  it("maps a slow response to AI_TIMEOUT", async () => {
    handler = (_req, res) => {
      setTimeout(() => res.json(okMessage), 1_000);
    };
    expect(await codeOf(run(client({ timeoutMs: 200 })))).toBe("AI_TIMEOUT");
  });

  it("maps a refused connection to AI_PROVIDER_ERROR", async () => {
    const c = new AnthropicLlmClient({
      apiKey: "sk-ant-test",
      model: "claude-opus-5-5",
      baseURL: "http://127.0.0.1:1", // nothing listens here
      maxRetries: 0,
      logger: pino({ level: "silent" }),
    });
    expect(await codeOf(run(c))).toBe("AI_PROVIDER_ERROR");
  });
});
