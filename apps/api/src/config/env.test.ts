import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("applies Day 5 defaults", () => {
    const env = parseEnv({});
    expect(env.CORS_ORIGIN).toEqual(["http://localhost:5173"]);
    expect(env.TRUST_PROXY).toBe(0);
    expect(env.RATE_LIMIT_PARSE_PER_HOUR).toBe(10);
    expect(env.RATE_LIMIT_TAILOR_PER_HOUR).toBe(20);
  });

  it("splits a comma-separated CORS_ORIGIN list and trims whitespace", () => {
    const env = parseEnv({ CORS_ORIGIN: "http://localhost:5173, https://tailorcv.vercel.app" });
    expect(env.CORS_ORIGIN).toEqual(["http://localhost:5173", "https://tailorcv.vercel.app"]);
  });

  it("rejects an invalid origin and a wildcard", () => {
    expect(() => parseEnv({ CORS_ORIGIN: "not-a-url" })).toThrow();
    expect(() => parseEnv({ CORS_ORIGIN: "*" })).toThrow();
  });

  it("coerces numeric rate limits and rejects zero", () => {
    expect(parseEnv({ RATE_LIMIT_PARSE_PER_HOUR: "3" }).RATE_LIMIT_PARSE_PER_HOUR).toBe(3);
    expect(() => parseEnv({ RATE_LIMIT_TAILOR_PER_HOUR: "0" })).toThrow();
  });
});
