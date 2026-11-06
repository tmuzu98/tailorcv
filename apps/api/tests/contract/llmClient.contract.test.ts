import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { Writable } from "node:stream";
import express, { type RequestHandler } from "express";
import { pino, type Logger } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "../../src/lib/errors";
import { AnthropicLlmClient } from "../../src/llm/AnthropicLlmClient";
import type { LlmClient, LlmContent } from "../../src/llm/LlmClient";
import { OllamaLlmClient } from "../../src/llm/OllamaLlmClient";
import { readPdfFixture } from "../helpers/fixtures";

/**
 * LLM CLIENT CONTRACT (D-69): every provider must behave identically for the same situation, so
 * switching LLM_PROVIDER never changes app behaviour. Each scenario runs against every client,
 * each talking to a local fake of its provider's HTTP API (never a real model).
 *
 * Adding a provider = add a harness to HARNESSES below and make this file pass.
 */

type Scenario =
  | "valid" // a correct answer
  | "invalidThenValid" // schema mismatch, then correct
  | "alwaysInvalid" // never valid JSON
  | "truncated" // output cut off by the token limit
  | "overloaded" // provider-side failure (5xx)
  | "misconfigured" // our setup is wrong (bad key / model not installed)
  | "slow"; // takes longer than the timeout

interface Harness {
  name: string;
  /** Express handler for the provider's endpoint, given the scenario and the call number. */
  respond: (scenario: Scenario, call: number) => RequestHandler;
  path: string;
  makeClient: (opts: { baseURL: string; logger: Logger; timeoutMs: number }) => LlmClient;
  /** What the provider received as the user's content, as text we can search. */
  receivedContent: (body: any) => string;
}

const VALID = '{"name":"Jane Candidate","years":7}';
const INVALID = '{"name":"Jane Candidate"}';

const anthropicMessage = (text: string, stop_reason = "end_turn") => ({
  id: "msg_1",
  type: "message",
  role: "assistant",
  model: "claude-opus-5-5",
  content: [{ type: "text", text }],
  stop_reason,
  stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 5 },
});
const ollamaMessage = (content: string, done_reason = "stop") => ({
  model: "llama3",
  message: { role: "assistant", content },
  done: true,
  done_reason,
  prompt_eval_count: 10,
  eval_count: 5,
});

const delayed =
  (send: RequestHandler): RequestHandler =>
  (req, res, next) => {
    setTimeout(() => send(req, res, next), 1_000);
  };

const HARNESSES: Harness[] = [
  {
    name: "anthropic",
    path: "/v1/messages",
    respond: (scenario, call) => (_req, res) => {
      if (scenario === "valid") return void res.json(anthropicMessage(VALID));
      if (scenario === "invalidThenValid")
        return void res.json(anthropicMessage(call === 1 ? INVALID : VALID));
      if (scenario === "alwaysInvalid") return void res.json(anthropicMessage("not json"));
      if (scenario === "truncated")
        return void res.json(anthropicMessage('{"name":"Ja', "max_tokens"));
      if (scenario === "overloaded")
        return void res
          .status(529)
          .json({ type: "error", error: { type: "overloaded_error", message: "x" } });
      if (scenario === "misconfigured")
        return void res
          .status(401)
          .json({ type: "error", error: { type: "authentication_error", message: "x" } });
      return void delayed((_q, r) => void r.json(anthropicMessage(VALID)))(
        _req,
        res,
        () => undefined,
      );
    },
    makeClient: ({ baseURL, logger, timeoutMs }) =>
      new AnthropicLlmClient({
        apiKey: "sk-ant-test",
        model: "claude-opus-5-5",
        baseURL,
        logger,
        timeoutMs,
        maxRetries: 0,
      }),
    receivedContent: (body) => JSON.stringify(body.messages?.[0]?.content ?? ""),
  },
  {
    name: "ollama",
    path: "/api/chat",
    respond: (scenario, call) => (_req, res) => {
      if (scenario === "valid") return void res.json(ollamaMessage(VALID));
      if (scenario === "invalidThenValid")
        return void res.json(ollamaMessage(call === 1 ? INVALID : VALID));
      if (scenario === "alwaysInvalid") return void res.json(ollamaMessage("not json"));
      if (scenario === "truncated") return void res.json(ollamaMessage('{"name":"Ja', "length"));
      if (scenario === "overloaded") return void res.status(500).json({ error: "out of memory" });
      if (scenario === "misconfigured")
        return void res.status(404).json({ error: "model 'llama3' not found" });
      return void delayed((_q, r) => void r.json(ollamaMessage(VALID)))(_req, res, () => undefined);
    },
    makeClient: ({ baseURL, logger, timeoutMs }) =>
      new OllamaLlmClient({ baseURL, model: "llama3", logger, timeoutMs }),
    receivedContent: (body) => String(body.messages?.[1]?.content ?? ""),
  },
];

// ---------- one fake server for all providers ----------
let server: Server;
let baseURL = "";
let scenario: Scenario = "valid";
let calls = 0;
let lastBody: any = {};

beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  for (const h of HARNESSES) {
    app.post(h.path, (req, res, next) => {
      calls++;
      lastBody = req.body;
      h.respond(scenario, calls)(req, res, next);
    });
  }
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});
beforeEach(() => {
  calls = 0;
  lastBody = {};
});

const Schema = z.object({ name: z.string(), years: z.number() });
const SECRET = "Jane Candidate, 555-0100, private resume text";

function setup(h: Harness, opts: { timeoutMs?: number; baseURL?: string } = {}) {
  const lines: string[] = [];
  const logger = pino(
    { level: "debug" },
    new Writable({
      write(chunk: Buffer, _enc, done) {
        lines.push(chunk.toString());
        done();
      },
    }),
  );
  const client = h.makeClient({
    baseURL: opts.baseURL ?? baseURL,
    logger,
    timeoutMs: opts.timeoutMs ?? 5_000,
  });
  const run = (content: LlmContent = SECRET) =>
    client.generateStructured({
      promptVersion: "contract-v1",
      system: "SYSTEM PROMPT",
      content,
      schema: Schema,
      effort: "low",
      maxTokens: 1000,
    });
  return { run, rawLogs: () => lines.join("") };
}

async function codeOf(promise: Promise<unknown>): Promise<string> {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(AppError);
  return (err as AppError).code;
}

describe.each(HARNESSES)("LlmClient contract: $name", (h) => {
  it("valid answer → validated data, attempts 1", async () => {
    scenario = "valid";
    await expect(setup(h).run()).resolves.toMatchObject({
      data: { name: "Jane Candidate", years: 7 },
      attempts: 1,
    });
    expect(calls).toBe(1);
  });

  it("schema mismatch then valid → retried once, attempts 2", async () => {
    scenario = "invalidThenValid";
    await expect(setup(h).run()).resolves.toMatchObject({ attempts: 2 });
    expect(calls).toBe(2);
  });

  it("never valid → AI_INVALID_OUTPUT after exactly 2 calls", async () => {
    scenario = "alwaysInvalid";
    expect(await codeOf(setup(h).run())).toBe("AI_INVALID_OUTPUT");
    expect(calls).toBe(2);
  });

  it("truncated output → AI_INVALID_OUTPUT, not retried", async () => {
    scenario = "truncated";
    expect(await codeOf(setup(h).run())).toBe("AI_INVALID_OUTPUT");
    expect(calls).toBe(1);
  });

  it("provider failure → AI_PROVIDER_ERROR", async () => {
    scenario = "overloaded";
    expect(await codeOf(setup(h).run())).toBe("AI_PROVIDER_ERROR");
  });

  it("our misconfiguration (bad key / missing model) → INTERNAL_ERROR, never blamed on the user", async () => {
    scenario = "misconfigured";
    expect(await codeOf(setup(h).run())).toBe("INTERNAL_ERROR");
  });

  it("too slow → AI_TIMEOUT", async () => {
    scenario = "slow";
    expect(await codeOf(setup(h, { timeoutMs: 200 }).run())).toBe("AI_TIMEOUT");
  });

  it("provider unreachable → AI_PROVIDER_ERROR", async () => {
    expect(await codeOf(setup(h, { baseURL: "http://127.0.0.1:1" }).run())).toBe(
      "AI_PROVIDER_ERROR",
    );
  });

  it("accepts neutral PDF + text content and delivers both to the provider", async () => {
    scenario = "valid";
    await setup(h).run([
      { type: "pdf", data: readPdfFixture("resume-1page.pdf") },
      { type: "text", text: "Extract this resume." },
    ]);
    const received = h.receivedContent(lastBody);
    expect(received).toContain("Extract this resume.");
    // Claude gets the PDF itself (base64 document); Ollama gets its extracted text.
    expect(received.includes('"type":"document"') || received.includes("Alex Example")).toBe(true);
  });

  it("never logs the prompt, the content or the answer (any scenario)", async () => {
    for (const s of ["valid", "alwaysInvalid", "truncated", "misconfigured"] as const) {
      scenario = s;
      const { run, rawLogs } = setup(h);
      await run().catch(() => undefined);
      for (const secret of [SECRET, "SYSTEM PROMPT", "Jane Candidate", "555-0100"]) {
        expect(rawLogs()).not.toContain(secret);
      }
    }
  });
});
