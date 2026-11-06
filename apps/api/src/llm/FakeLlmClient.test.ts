import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ResumeSchema } from "@tailorcv/shared";
import { sampleResumeSwe } from "@tailorcv/shared/fixtures";
import { AppError } from "../lib/errors";
import { FakeLlmClient } from "./FakeLlmClient";

const Schema = z.object({ ok: z.boolean() });
const params = {
  promptVersion: "fake-v1",
  system: "s",
  content: "c",
  schema: Schema,
  effort: "low",
  maxTokens: 100,
} as const;

describe("FakeLlmClient", () => {
  it("returns queued responses in order and records each call", async () => {
    const fake = new FakeLlmClient().enqueue(
      { data: { ok: true } },
      { data: { ok: false }, model: "m2" },
    );

    await expect(fake.generateStructured(params)).resolves.toMatchObject({
      data: { ok: true },
      model: "fake-model",
    });
    await expect(
      fake.generateStructured({
        ...params,
        content: [
          { type: "pdf", data: new Uint8Array([1]) },
          { type: "text", text: "x" },
        ],
      }),
    ).resolves.toMatchObject({
      data: { ok: false },
      model: "m2",
    });
    expect(fake.calls).toEqual([
      { promptVersion: "fake-v1", effort: "low", maxTokens: 100, content: "text" },
      { promptVersion: "fake-v1", effort: "low", maxTokens: 100, content: ["pdf", "text"] },
    ]);
  });

  it("throws a queued error", async () => {
    const fake = new FakeLlmClient().enqueue({ error: new AppError("AI_TIMEOUT") });
    await expect(fake.generateStructured(params)).rejects.toMatchObject({ code: "AI_TIMEOUT" });
  });

  it("supports a responder function and a default response", async () => {
    const fake = new FakeLlmClient(() => ({ ok: true }));
    await expect(fake.generateStructured(params)).resolves.toMatchObject({ data: { ok: true } });
    await expect(fake.generateStructured(params)).resolves.toMatchObject({ data: { ok: true } });
  });

  it("rejects fixtures that don't match the caller's schema as AI_INVALID_OUTPUT", async () => {
    const fake = new FakeLlmClient().enqueue({ data: { ok: "yes" } });
    await expect(fake.generateStructured(params)).rejects.toMatchObject({
      code: "AI_INVALID_OUTPUT",
    });
  });

  it("fails loudly when nothing is queued", async () => {
    await expect(new FakeLlmClient().generateStructured(params)).rejects.toThrow(
      /no response queued/,
    );
  });

  it("works with the shared resume fixture (what Day 8 parsing tests will use)", async () => {
    const fake = new FakeLlmClient().enqueue({ data: sampleResumeSwe });
    const result = await fake.generateStructured({ ...params, schema: ResumeSchema });
    expect(result.data.basics.fullName).toBe(sampleResumeSwe.basics.fullName);
  });
});
