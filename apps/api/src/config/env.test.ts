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

describe("parseEnv: Anthropic settings (Day 7)", () => {
  it("requires ANTHROPIC_API_KEY in production", () => {
    expect(() => parseEnv({ NODE_ENV: "production" })).toThrow(/ANTHROPIC_API_KEY/);
    expect(
      parseEnv({ NODE_ENV: "production", ANTHROPIC_API_KEY: "sk-ant-x" }).ANTHROPIC_API_KEY,
    ).toBe("sk-ant-x");
  });

  it("allows a missing or empty key in development and test", () => {
    expect(parseEnv({ NODE_ENV: "development" }).ANTHROPIC_API_KEY).toBeUndefined();
    expect(
      parseEnv({ NODE_ENV: "development", ANTHROPIC_API_KEY: "" }).ANTHROPIC_API_KEY,
    ).toBeUndefined();
    expect(
      parseEnv({ NODE_ENV: "test", ANTHROPIC_API_KEY: "   " }).ANTHROPIC_API_KEY,
    ).toBeUndefined();
  });

  it("treats an empty key as missing in production too", () => {
    expect(() => parseEnv({ NODE_ENV: "production", ANTHROPIC_API_KEY: "" })).toThrow(
      /ANTHROPIC_API_KEY/,
    );
  });

  it("defaults the model and the 90 s LLM timeout", () => {
    const env = parseEnv({});
    expect(env.ANTHROPIC_MODEL).toBe("claude-opus-5-5");
    expect(env.LLM_TIMEOUT_MS).toBe(90_000);
  });
});

describe("parseEnv: LLM provider switch (D-68)", () => {
  it("defaults to ollama outside production and anthropic in production", () => {
    expect(parseEnv({ NODE_ENV: "development" }).LLM_PROVIDER).toBe("ollama");
    expect(parseEnv({ NODE_ENV: "test" }).LLM_PROVIDER).toBe("ollama");
    expect(parseEnv({ NODE_ENV: "production", ANTHROPIC_API_KEY: "sk-ant-x" }).LLM_PROVIDER).toBe(
      "anthropic",
    );
  });

  it("can be set explicitly in development", () => {
    expect(parseEnv({ NODE_ENV: "development", LLM_PROVIDER: "anthropic" }).LLM_PROVIDER).toBe(
      "anthropic",
    );
  });

  it("refuses ollama in production and rejects unknown providers", () => {
    expect(() =>
      parseEnv({ NODE_ENV: "production", LLM_PROVIDER: "ollama", ANTHROPIC_API_KEY: "sk-ant-x" }),
    ).toThrow(/local development only/);
    expect(() => parseEnv({ LLM_PROVIDER: "openai" })).toThrow();
  });

  it("has local Ollama defaults", () => {
    const env = parseEnv({});
    expect(env.OLLAMA_BASE_URL).toBe("http://localhost:11434");
    expect(env.OLLAMA_MODEL).toBe("llama3");
    expect(env.OLLAMA_TIMEOUT_MS).toBe(300_000);
    expect(env.OLLAMA_NUM_CTX).toBe(8192);
  });
});
