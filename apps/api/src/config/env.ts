import { z } from "zod";

/**
 * Environment variables, validated once at startup.
 * The server refuses to start with a clear message if anything is invalid.
 * New variables: add them here AND to apps/api/.env.example.
 */
const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    /** Comma-separated exact origins allowed by CORS (no wildcards). */
    CORS_ORIGIN: z
      .string()
      .default("http://localhost:5173")
      .transform((value) =>
        value
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.url()).min(1)),
    /** Number of reverse-proxy hops to trust for the client IP (0 locally, 1 on Render). */
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
    RATE_LIMIT_PARSE_PER_HOUR: z.coerce.number().int().min(1).default(10),
    RATE_LIMIT_TAILOR_PER_HOUR: z.coerce.number().int().min(1).default(20),
    /** Required in production. Optional in development/test (LLM calls then fail clearly; tests use FakeLlmClient). */
    ANTHROPIC_API_KEY: z
      .string()
      .trim()
      .transform((value) => value || undefined) // `ANTHROPIC_API_KEY=` (empty, as in .env.example) = unset
      .optional(),
    ANTHROPIC_MODEL: z.string().min(1).default("claude-opus-5-5"),
    /** Per-request timeout for Claude calls (tech design §6.3: 90 s). */
    LLM_TIMEOUT_MS: z.coerce.number().int().min(1000).max(600_000).default(90_000),
    /**
     * Which LlmClient to build (D-68). Default: `ollama` in development/test (free, local),
     * `anthropic` in production. Production refuses `ollama`.
     */
    LLM_PROVIDER: z.enum(["anthropic", "ollama"]).optional(),
    OLLAMA_BASE_URL: z.url().default("http://localhost:11434"),
    OLLAMA_MODEL: z.string().min(1).default("llama3"),
    /** Local models are slow: 5 min default. */
    OLLAMA_TIMEOUT_MS: z.coerce.number().int().min(1000).max(1_800_000).default(300_000),
    /** Context window. Set explicitly so long resumes aren't silently truncated. */
    OLLAMA_NUM_CTX: z.coerce.number().int().min(2048).max(131_072).default(8192),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && env.LLM_PROVIDER === "ollama") {
      ctx.addIssue({
        code: "custom",
        path: ["LLM_PROVIDER"],
        message: "ollama is for local development only; use anthropic in production",
      });
    }
    if (env.NODE_ENV === "production" && !env.ANTHROPIC_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["ANTHROPIC_API_KEY"],
        message: "ANTHROPIC_API_KEY is required in production",
      });
    }
  })
  .transform((env) => ({
    ...env,
    LLM_PROVIDER: env.LLM_PROVIDER ?? (env.NODE_ENV === "production" ? "anthropic" : "ollama"),
  }));

export type Env = z.infer<typeof EnvSchema>;

/** Parses an env source without side effects (throws on invalid input). Used by tests. */
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  return EnvSchema.parse(source);
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    console.error("❌ Invalid environment variables:\n" + z.prettifyError(result.error));
    process.exit(1);
  }
  return result.data;
}
