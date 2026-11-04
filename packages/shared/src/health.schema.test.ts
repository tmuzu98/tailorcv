import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "./health.schema";

describe("HealthResponseSchema", () => {
  it("accepts a valid health response", () => {
    const valid = { status: "ok", version: "0.1.0", uptimeSec: 12 };
    expect(HealthResponseSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    ["wrong status", { status: "down", version: "0.1.0", uptimeSec: 1 }],
    ["missing version", { status: "ok", uptimeSec: 1 }],
    ["negative uptime", { status: "ok", version: "0.1.0", uptimeSec: -1 }],
    ["fractional uptime", { status: "ok", version: "0.1.0", uptimeSec: 1.5 }],
  ])("rejects %s", (_label, input) => {
    expect(HealthResponseSchema.safeParse(input).success).toBe(false);
  });
});
