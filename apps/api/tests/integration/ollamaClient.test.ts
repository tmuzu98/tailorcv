import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { Writable } from "node:stream";
import express, { type RequestHandler } from "express";
import { pino } from "pino";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "../../src/lib/errors";
import { OllamaLlmClient } from "../../src/llm/OllamaLlmClient";
import { readPdfFixture } from "../helpers/fixtures";

/** OllamaLlmClient against a local FAKE of Ollama's /api/chat (tests never need Ollama running). */
const Schema = z.object({ name: z.string(), years: z.number() });

let handler: RequestHandler = (_req, res) => res.status(500).end();
let hits = 0;
let lastBody: Record<string, any> = {};
let server: Server;
let baseURL = "";

beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.post("/api/chat", (req, res, next) => {
    hits++;
    lastBody = req.body as Record<string, any>;
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

function setup(opts: { timeoutMs?: number; url?: string } = {}) {
  hits = 0;
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
  const client = new OllamaLlmClient({
    baseURL: opts.url ?? `${baseURL}/`, // trailing slash is tolerated
    model: "llama3",
    logger,
    timeoutMs: opts.timeoutMs ?? 5_000,
    numCtx: 8192,
  });
  return { client, logs: () => lines.map((l) => JSON.parse(l)), rawLogs: () => lines.join("") };
}

const SECRET = "Jane Candidate secret resume text";
const run = (
  client: OllamaLlmClient,
  content: Parameters<OllamaLlmClient["generateStructured"]>[0]["content"] = SECRET,
) =>
  client.generateStructured({
    promptVersion: "ollama-it-v1",
    system: "SYS PROMPT",
    content,
    schema: Schema,
    effort: "low",
    maxTokens: 2000,
  });

const reply =
  (content: string, extra: Record<string, unknown> = {}): RequestHandler =>
  (_req, res) => {
    res.json({
      model: "llama3",
      message: { role: "assistant", content },
      done: true,
      done_reason: "stop",
      prompt_eval_count: 150,
      eval_count: 30,
      ...extra,
    });
  };

async function codeOf(promise: Promise<unknown>): Promise<string> {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(AppError);
  return (err as AppError).code;
}

describe("OllamaLlmClient", () => {
  it("sends a structured-output chat request and returns validated data + usage", async () => {
    handler = reply('{"name":"Jane Candidate","years":7}');
    const { client } = setup();

    await expect(run(client)).resolves.toEqual({
      data: { name: "Jane Candidate", years: 7 },
      model: "llama3",
      usage: {
        inputTokens: 150,
        outputTokens: 30,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
      },
      durationMs: expect.any(Number),
      attempts: 1,
    });
    expect(lastBody).toMatchObject({
      model: "llama3",
      stream: false,
      options: { temperature: 0, num_ctx: 8192, num_predict: 2000 },
      messages: [
        { role: "system", content: "SYS PROMPT" },
        { role: "user", content: SECRET },
      ],
      format: { type: "object", required: ["name", "years"], additionalProperties: false },
    });
    expect(JSON.stringify(lastBody.format)).not.toContain("$ref");
  });

  it("converts a PDF part to text (Ollama can't read PDFs)", async () => {
    handler = reply('{"name":"Alex Example","years":5}');
    const { client } = setup();
    const pdf = readPdfFixture("resume-1page.pdf");

    await run(client, [
      { type: "pdf", data: pdf },
      { type: "text", text: "Extract this resume." },
    ]);

    const userText = lastBody.messages[1].content as string;
    expect(userText).toContain("Alex Example");
    expect(userText).toContain("Acme Widgets");
    expect(userText).toContain("Extract this resume.");
  });

  it("retries once on a schema mismatch, then succeeds", async () => {
    let n = 0;
    handler = (req, res, next) =>
      (n++ === 0 ? reply('{"name":"A"}') : reply('{"name":"A","years":1}'))(req, res, next);
    const { client } = setup();
    await expect(run(client)).resolves.toMatchObject({ attempts: 2 });
    expect(hits).toBe(2);
  });

  it("gives up after two invalid answers with AI_INVALID_OUTPUT", async () => {
    handler = reply("not json");
    const { client } = setup();
    expect(await codeOf(run(client))).toBe("AI_INVALID_OUTPUT");
    expect(hits).toBe(2);
  });

  it("treats truncation (done_reason=length) as AI_INVALID_OUTPUT without retrying", async () => {
    handler = reply('{"name":"Ja', { done_reason: "length" });
    const { client } = setup();
    expect(await codeOf(run(client))).toBe("AI_INVALID_OUTPUT");
    expect(hits).toBe(1);
  });

  it("maps a missing model (404) to INTERNAL_ERROR with an `ollama pull` hint", async () => {
    handler = (_req, res) => res.status(404).json({ error: "model 'llama3' not found" });
    const { client, logs } = setup();
    expect(await codeOf(run(client))).toBe("INTERNAL_ERROR");
    expect(logs().at(-1)).toMatchObject({
      msg: expect.stringContaining("ollama pull llama3"),
      llm: { status: 404 },
    });
  });

  it("maps a 500 to AI_PROVIDER_ERROR", async () => {
    handler = (_req, res) => res.status(500).json({ error: "out of memory" });
    const { client } = setup();
    expect(await codeOf(run(client))).toBe("AI_PROVIDER_ERROR");
  });

  it("maps a slow answer to AI_TIMEOUT", async () => {
    handler = (_req, res) => {
      setTimeout(() => res.json({}), 1_000);
    };
    const { client } = setup({ timeoutMs: 200 });
    expect(await codeOf(run(client))).toBe("AI_TIMEOUT");
  });

  it("maps 'Ollama not running' to AI_PROVIDER_ERROR with an `ollama serve` hint", async () => {
    const { client, logs } = setup({ url: "http://127.0.0.1:1" });
    expect(await codeOf(run(client))).toBe("AI_PROVIDER_ERROR");
    expect(logs().at(-1)).toMatchObject({ msg: expect.stringContaining("ollama serve") });
  });

  it("logs provider, usage and timing, never the prompt, content or answer", async () => {
    handler = reply('{"name":"Jane Candidate","years":7}');
    const { client, logs, rawLogs } = setup();
    await run(client);
    expect(logs().at(-1)).toMatchObject({
      msg: "llm call completed",
      llm: {
        provider: "ollama",
        model: "llama3",
        promptVersion: "ollama-it-v1",
        usage: { inputTokens: 150 },
      },
    });
    for (const secret of [SECRET, "SYS PROMPT", "Jane Candidate"])
      expect(rawLogs()).not.toContain(secret);
  });
});
