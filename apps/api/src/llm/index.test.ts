import { Writable } from "node:stream";
import { pino } from "pino";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseEnv } from "../config/env";
import { AnthropicLlmClient, DeadlineLlmClient, OllamaLlmClient, createLlmClient } from "./index";

const innerOf = (client: unknown) => {
  expect(client).toBeInstanceOf(DeadlineLlmClient);
  return (client as DeadlineLlmClient).inner;
};

function capture() {
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
  return { logger, logs: () => lines.map((l) => JSON.parse(l) as { msg: string }) };
}

describe("createLlmClient (the provider switch)", () => {
  it("LLM_PROVIDER=ollama → OllamaLlmClient, and says so in the log", () => {
    const { logger, logs } = capture();
    const env = parseEnv({
      NODE_ENV: "development",
      LLM_PROVIDER: "ollama",
      OLLAMA_MODEL: "llama3",
    });
    expect(innerOf(createLlmClient(env, logger))).toBeInstanceOf(OllamaLlmClient);
    expect(logs()[0]).toMatchObject({ msg: expect.stringContaining("ollama"), model: "llama3" });
  });

  it("LLM_PROVIDER=anthropic with a key → AnthropicLlmClient", () => {
    const { logger, logs } = capture();
    const env = parseEnv({
      NODE_ENV: "development",
      LLM_PROVIDER: "anthropic",
      ANTHROPIC_API_KEY: "sk-ant-x",
    });
    expect(innerOf(createLlmClient(env, logger))).toBeInstanceOf(AnthropicLlmClient);
    expect(logs()[0]).toMatchObject({ msg: "LLM provider: anthropic", model: "claude-opus-5-5" });
  });

  it("LLM_PROVIDER=anthropic without a key (development) → a client that fails each call with INTERNAL_ERROR", async () => {
    const { logger } = capture();
    const client = createLlmClient(
      parseEnv({ NODE_ENV: "development", LLM_PROVIDER: "anthropic" }),
      logger,
    );
    expect(innerOf(client)).not.toBeInstanceOf(AnthropicLlmClient);
    await expect(
      client.generateStructured({
        promptVersion: "x",
        system: "s",
        content: "c",
        schema: z.object({}),
        effort: "low",
        maxTokens: 10,
      }),
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  });

  it("wraps every provider in the overall deadline: 5 min for ollama, 120 s for anthropic", () => {
    const { logger } = capture();
    const ollama = createLlmClient(
      parseEnv({ LLM_PROVIDER: "ollama" }),
      logger,
    ) as DeadlineLlmClient;
    const claude = createLlmClient(
      parseEnv({ LLM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-ant-x" }),
      logger,
    ) as DeadlineLlmClient;
    expect(ollama.deadlineMs).toBe(300_000);
    expect(claude.deadlineMs).toBe(120_000);
    expect(
      (createLlmClient(parseEnv({ LLM_DEADLINE_MS: "5000" }), logger) as DeadlineLlmClient)
        .deadlineMs,
    ).toBe(5000);
  });
});
