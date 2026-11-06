import { z } from "zod";

/**
 * Environment variables, validated once at startup.
 * The server refuses to start with a clear message if anything is invalid.
 * New variables: add them here AND to apps/api/.env.example.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
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
  // Required from Day 7 (LLM client). Optional until then so the skeleton runs without a key.
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().min(1).default("claude-opus-5-5"),
});

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
