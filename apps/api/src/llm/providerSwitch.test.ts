import { pino } from "pino";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { FakeLlmClient } from "./FakeLlmClient";
import type { GenerateStructuredParams } from "./LlmClient";
import { SwitchableLlmClient, runWithLlmProvider } from "./providerSwitch";

const Schema = z.object({ from: z.string() });
const params: GenerateStructuredParams<typeof Schema> = {
  promptVersion: "switch-v1",
  system: "s",
  content: "c",
  schema: Schema,
  effort: "low",
  maxTokens: 10,
};
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

function setup(defaultProvider: "anthropic" | "ollama" = "ollama") {
  const anthropic = new FakeLlmClient(async () => {
    await tick();
    return { from: "anthropic" };
  });
  const ollama = new FakeLlmClient(async () => {
    await tick();
    return { from: "ollama" };
  });
  const client = new SwitchableLlmClient(
    { anthropic, ollama },
    defaultProvider,
    pino({ level: "silent" }),
  );
  return { client, anthropic, ollama };
}

describe("SwitchableLlmClient (development provider switch, D-103)", () => {
  it("uses the default provider when the request chose none", async () => {
    const { client, anthropic, ollama } = setup("ollama");
    await expect(client.generateStructured(params)).resolves.toMatchObject({
      data: { from: "ollama" },
    });
    expect(ollama.calls).toHaveLength(1);
    expect(anthropic.calls).toHaveLength(0);
  });

  it("uses the provider chosen with runWithLlmProvider, also after awaits", async () => {
    const { client, anthropic, ollama } = setup("ollama");
    const result = await runWithLlmProvider("anthropic", async () => {
      await tick();
      return client.generateStructured(params);
    });
    expect(result.data).toEqual({ from: "anthropic" });
    expect(anthropic.calls).toHaveLength(1);
    expect(ollama.calls).toHaveLength(0);
  });

  it("keeps concurrent requests apart: each gets the provider it chose", async () => {
    const { client } = setup("ollama");
    const call = () => client.generateStructured(params).then((r) => r.data.from);
    const results = await Promise.all([
      runWithLlmProvider("anthropic", call),
      runWithLlmProvider("ollama", call),
      call(),
      runWithLlmProvider("anthropic", call),
    ]);
    expect(results).toEqual(["anthropic", "ollama", "ollama", "anthropic"]);
  });

  it("the choice ends with the request: later calls use the default again", async () => {
    const { client } = setup("ollama");
    await runWithLlmProvider("anthropic", () => client.generateStructured(params));
    await expect(client.generateStructured(params)).resolves.toMatchObject({
      data: { from: "ollama" },
    });
  });
});
