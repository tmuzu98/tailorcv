import { pino } from "pino";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "../lib/errors";
import { FakeLlmClient } from "./FakeLlmClient";
import type { GenerateStructuredParams } from "./LlmClient";
import { withDeadline } from "./withDeadline";

const logger = pino({ level: "silent" });
const Schema = z.object({ ok: z.boolean() });
const params = (signal?: AbortSignal): GenerateStructuredParams<typeof Schema> => ({
  promptVersion: "deadline-v1",
  system: "s",
  content: "c",
  schema: Schema,
  effort: "low",
  maxTokens: 10,
  ...(signal && { signal }),
});
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(signal.reason);
    });
  });

describe("withDeadline (overall AI budget, D-72)", () => {
  it("returns the inner result when it finishes in time", async () => {
    const client = withDeadline(new FakeLlmClient(() => ({ ok: true })), 1_000, logger);
    await expect(client.generateStructured(params())).resolves.toMatchObject({
      data: { ok: true },
    });
  });

  it("aborts the inner call through the signal and throws AI_TIMEOUT at the deadline", async () => {
    let innerSignal: AbortSignal | undefined;
    const inner = new FakeLlmClient(async (p) => {
      innerSignal = p.signal;
      await sleep(5_000, p.signal);
      return { ok: true };
    });
    const started = Date.now();
    await expect(
      withDeadline(inner, 100, logger).generateStructured(params()),
    ).rejects.toMatchObject({ code: "AI_TIMEOUT" });
    expect(Date.now() - started).toBeLessThan(1_000);
    expect(innerSignal?.aborted).toBe(true);
  });

  it("stops waiting at the deadline even if the inner client ignores the signal", async () => {
    const inner = new FakeLlmClient(async () => {
      await sleep(2_000); // ignores the signal
      return { ok: true };
    });
    const started = Date.now();
    await expect(
      withDeadline(inner, 100, logger).generateStructured(params()),
    ).rejects.toMatchObject({ code: "AI_TIMEOUT" });
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it("passes a caller cancel (client disconnected) through without turning it into AI_TIMEOUT", async () => {
    const caller = new AbortController();
    const inner = new FakeLlmClient(async (p) => {
      await sleep(5_000, p.signal);
      return { ok: true };
    });
    const pending = withDeadline(inner, 10_000, logger).generateStructured(params(caller.signal));
    caller.abort(new Error("client disconnected"));
    const err = await pending.catch((e: unknown) => e);
    expect(err).not.toBeInstanceOf(AppError);
    expect((err as Error).message).toBe("client disconnected");
  });

  it("passes inner errors through unchanged", async () => {
    const inner = new FakeLlmClient().enqueue({ error: new AppError("AI_PROVIDER_ERROR") });
    await expect(
      withDeadline(inner, 1_000, logger).generateStructured(params()),
    ).rejects.toMatchObject({ code: "AI_PROVIDER_ERROR" });
  });
});
