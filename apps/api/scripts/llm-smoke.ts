/* eslint-disable no-console -- CLI output */
/**
 * One tiny real call through the configured LLM_PROVIDER (Day 7 exit check):
 * ollama → your local model; anthropic → Claude (needs ANTHROPIC_API_KEY).
 * Run: npm run llm:smoke -w @tailorcv/api      (reads apps/api/.env; Claude costs a fraction of a cent, Ollama is free)
 * Never run in tests or CI.
 */
import { z } from "zod";
import { loadEnv } from "../src/config/env";
import { isAppError } from "../src/lib/errors";
import { createLogger } from "../src/lib/logger";
import { createLlmClient } from "../src/llm";

const env = loadEnv();
if (env.LLM_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) {
  console.error(
    "❌ LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set.\n" +
      "   Set it in apps/api/.env, or use LLM_PROVIDER=ollama for local development.",
  );
  process.exit(1);
}

// Same factory the app uses, so this tests exactly what LLM_PROVIDER selects.
const client = createLlmClient(env, createLogger({ NODE_ENV: "development", LOG_LEVEL: "info" }));
const configuredModel = env.LLM_PROVIDER === "ollama" ? env.OLLAMA_MODEL : env.ANTHROPIC_MODEL;

const SmokeSchema = z.object({
  status: z.literal("ok"),
  echo: z.string(),
});

try {
  const result = await client.generateStructured({
    promptVersion: "smoke-v1",
    system: "You are a connectivity check for an API integration. Follow the instructions exactly.",
    content: 'Reply with status "ok" and echo the single word tailorcv.',
    schema: SmokeSchema,
    effort: "low",
    maxTokens: 1024,
  });
  const ok = result.data.echo.toLowerCase().includes("tailorcv");
  console.log(
    `\n${ok ? "✅" : "⚠️ "} ${env.LLM_PROVIDER} answered: ${JSON.stringify(result.data)}`,
  );
  console.log(`   model: ${configuredModel} → served by ${result.model}`);
  console.log(
    `   ${result.durationMs} ms · attempts ${result.attempts} · usage ${JSON.stringify(result.usage)}`,
  );
  process.exit(ok ? 0 : 1);
} catch (err) {
  console.error(
    `\n❌ Smoke test failed (${env.LLM_PROVIDER}): ${isAppError(err) ? `${err.code}: ${err.message}` : String(err)}`,
  );
  console.error("   See the log line above for details (status, hint, upstream request id).");
  process.exit(1);
}
