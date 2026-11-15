import { Writable } from "node:stream";
import { pino } from "pino";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "../lib/errors";
import { FakeLlmClient } from "./FakeLlmClient";
import type { GenerateStructuredParams } from "./LlmClient";
import { withUsageLimits } from "./withUsageLimits";

const Schema = z.object({ ok: z.boolean() });
const params: GenerateStructuredParams<typeof Schema> = {
  promptVersion: "limits-v1",
  system: "s",
  content: "c",
  schema: Schema,
  effort: "low",
  maxTokens: 10,
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
  return { logger, logs: () => lines.join("") };
}
const silent = pino({ level: "silent" });
const ok = () => new FakeLlmClient(() => ({ ok: true }));

/** A fake whose calls stay open until released, to hold concurrency slots. */
function gated() {
  const releases: Array<() => void> = [];
  const inner = new FakeLlmClient(
    () => new Promise((resolve) => releases.push(() => resolve({ ok: true }))),
  );
  return { inner, releaseOne: () => releases.shift()?.() };
}

describe("withUsageLimits (spend protection for the AI provider)", () => {
  it("passes calls through while under both limits", async () => {
    const inner = ok();
    const client = withUsageLimits(inner, { dailyCalls: 3, maxConcurrent: 2 }, silent);
    await expect(client.generateStructured(params)).resolves.toMatchObject({ data: { ok: true } });
    expect(inner.calls).toHaveLength(1);
  });

  describe("daily call limit (all users together)", () => {
    const noon = Date.UTC(2026, 10, 15, 12, 0, 0);

    it("refuses the call after the limit with RATE_LIMITED, without calling the provider", async () => {
      const inner = ok();
      const { logger, logs } = capture();
      const client = withUsageLimits(
        inner,
        { dailyCalls: 2, maxConcurrent: 5, now: () => noon },
        logger,
      );
      await client.generateStructured(params);
      await client.generateStructured(params);
      const error = await client.generateStructured(params).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error).toMatchObject({ code: "RATE_LIMITED", status: 429 });
      // Until the next UTC midnight: 12 hours.
      expect((error as AppError).details).toEqual({ retryAfterSec: 12 * 3600 });
      expect(inner.calls).toHaveLength(2);
      expect(logs()).toContain("daily AI call limit reached");
    });

    it("counts failed calls too: they may have been billed", async () => {
      const inner = new FakeLlmClient().enqueue(
        { error: new AppError("AI_INVALID_OUTPUT") },
        { data: { ok: true } },
      );
      const client = withUsageLimits(inner, { dailyCalls: 1, maxConcurrent: 5 }, silent);
      await expect(client.generateStructured(params)).rejects.toMatchObject({
        code: "AI_INVALID_OUTPUT",
      });
      await expect(client.generateStructured(params)).rejects.toMatchObject({
        code: "RATE_LIMITED",
      });
    });

    it("starts again on the next UTC day", async () => {
      let now = noon;
      const client = withUsageLimits(
        ok(),
        { dailyCalls: 1, maxConcurrent: 5, now: () => now },
        silent,
      );
      await client.generateStructured(params);
      await expect(client.generateStructured(params)).rejects.toMatchObject({
        code: "RATE_LIMITED",
      });
      now = Date.UTC(2026, 10, 16, 0, 0, 1);
      await expect(client.generateStructured(params)).resolves.toBeDefined();
    });
  });

  describe("concurrent call limit", () => {
    it("refuses a call while the limit is in flight, and accepts again when one finishes", async () => {
      const { inner, releaseOne } = gated();
      const client = withUsageLimits(inner, { dailyCalls: 100, maxConcurrent: 2 }, silent);
      const first = client.generateStructured(params);
      const second = client.generateStructured(params);

      const error = await client.generateStructured(params).catch((e: unknown) => e);
      expect(error).toMatchObject({ code: "RATE_LIMITED" });
      expect((error as AppError).details).toEqual({ retryAfterSec: 10 });
      expect(inner.calls).toHaveLength(2);

      releaseOne();
      await first;
      const third = client.generateStructured(params);
      releaseOne();
      releaseOne();
      await expect(Promise.all([second, third])).resolves.toHaveLength(2);
    });

    it("frees the slot when a call fails", async () => {
      const inner = new FakeLlmClient().enqueue(
        { error: new AppError("AI_TIMEOUT") },
        { data: { ok: true } },
      );
      const client = withUsageLimits(inner, { dailyCalls: 100, maxConcurrent: 1 }, silent);
      await expect(client.generateStructured(params)).rejects.toMatchObject({ code: "AI_TIMEOUT" });
      await expect(client.generateStructured(params)).resolves.toBeDefined();
    });

    it("a call refused for concurrency does not use up the daily limit", async () => {
      const { inner, releaseOne } = gated();
      const client = withUsageLimits(inner, { dailyCalls: 2, maxConcurrent: 1 }, silent);
      const first = client.generateStructured(params);
      await expect(client.generateStructured(params)).rejects.toMatchObject({
        code: "RATE_LIMITED",
      });
      releaseOne();
      await first;
      const second = client.generateStructured(params);
      releaseOne();
      await expect(second).resolves.toBeDefined();
    });
  });

  it("logs counts only, never the prompt or the content", async () => {
    const { logger, logs } = capture();
    const client = withUsageLimits(ok(), { dailyCalls: 1, maxConcurrent: 1 }, logger);
    await client.generateStructured({ ...params, system: "SECRET-SYSTEM", content: "SECRET-BODY" });
    await client.generateStructured({ ...params, content: "SECRET-BODY" }).catch(() => undefined);
    expect(logs()).not.toContain("SECRET");
  });
});
