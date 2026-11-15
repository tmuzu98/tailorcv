/* eslint-disable no-console -- CLI output */
/**
 * Runs one resume × job description through the real tailoring steps with the configured
 * LLM_PROVIDER: tailor prompt → apply edits → guardrails → keyword analysis (jobTailorService). For trying the prompt on a real
 * model and reading what comes back.
 *
 *   npm run tailor:run -w @tailorcv/api                         # synthetic frontend resume × frontend JD
 *   npm run tailor:run -w @tailorcv/api -- newGrad dataAnalyst  # other fixtures (swe | newGrad) × (frontendEngineer | dataAnalyst | productManager)
 *   npm run tailor:run -w @tailorcv/api -- ~/resume.json ~/jd.txt   # your own (resume JSON from `parse:pdf --json`)
 *   add --json for the full TailorResponse
 *   add --edits ~/answer.json to replay a saved model answer (TailorLlmOutput JSON) instead of
 *   calling a model: shows what the deterministic steps do with a given answer
 *
 * Runs locally only; prints to your terminal and stores nothing. Never run in CI.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ResumeSchema, TailorRequestSchema, type Resume } from "@tailorcv/shared";
import {
  sampleJobDescriptions,
  sampleResumeNewGrad,
  sampleResumeSwe,
} from "@tailorcv/shared/fixtures";
import { loadEnv } from "../src/config/env";
import { isAppError } from "../src/lib/errors";
import { createLogger } from "../src/lib/logger";
import { FakeLlmClient, createLlmClient, type LlmClient, type LlmUsage } from "../src/llm";
import { TAILOR_SYSTEM_PROMPT, buildTailorContent } from "../src/llm/prompts/tailor.v2";
import { createJobTailorService } from "../src/services/jobTailorService";
import { analyzeKeywords } from "../src/services/keywordService";

const RESUMES: Record<string, Resume> = { swe: sampleResumeSwe, newGrad: sampleResumeNewGrad };
const JOBS: Record<string, string> = sampleJobDescriptions;

const args = process.argv.slice(2);
const json = args.includes("--json");
const editsAt = args.indexOf("--edits");
const editsFile = editsAt >= 0 ? args[editsAt + 1] : undefined;
const [resumeArg = "swe", jobArg = "frontendEngineer"] = args.filter(
  (a, i) => a !== "--json" && a !== "--edits" && (editsAt < 0 || i !== editsAt + 1),
);
const baseDir = process.env.INIT_CWD ?? process.cwd();
const readUserFile = (path: string) =>
  readFileSync(resolve(baseDir, path.replace(/^~(?=$|\/)/, process.env.HOME ?? "~")), "utf8");

const resume = RESUMES[resumeArg] ?? ResumeSchema.parse(JSON.parse(readUserFile(resumeArg)));
const request = TailorRequestSchema.parse({
  resume,
  jobDescription: JOBS[jobArg] ?? readUserFile(jobArg),
});

const env = loadEnv();
const logger = createLogger({ NODE_ENV: "development", LOG_LEVEL: "warn" });
const base: LlmClient = editsFile
  ? new FakeLlmClient({ data: JSON.parse(readUserFile(editsFile)) })
  : createLlmClient(env, logger);
// Keeps the token counts of the call, to print them (the service logs them at info level only).
let usage: LlmUsage | undefined;
const llm: LlmClient = {
  async generateStructured(params) {
    const result = await base.generateStructured(params);
    usage = result.usage;
    return result;
  },
};
const service = createJobTailorService({ llm, logger });
const model = env.LLM_PROVIDER === "ollama" ? env.OLLAMA_MODEL : env.ANTHROPIC_MODEL;
const content = buildTailorContent({ ...request, tone: "professional" });
console.log(
  editsFile
    ? "Replaying a saved model answer (no model call)"
    : `Provider: ${env.LLM_PROVIDER} (${model})`,
);
console.log(
  `Input: system prompt ${TAILOR_SYSTEM_PROMPT.length} chars + request ${content.length} chars\n`,
);

try {
  const result = await service.tailor(request);
  const final = result.tailoredResume;
  console.log(
    `Tailored in ${(result.meta.durationMs / 1000).toFixed(1)} s · ${result.meta.promptVersion}`,
  );
  if (usage && !editsFile) {
    console.log(
      `Tokens: ${usage.inputTokens} input (+ ${usage.cacheCreationInputTokens} cache write, ${usage.cacheReadInputTokens} cache read) · ${usage.outputTokens} output`,
    );
  }
  if (json) console.log(JSON.stringify(result, null, 2));

  const job = result.jobSummary;
  console.log(`\n━━ Job analysis`);
  console.log(`  ${job.title ?? "—"} @ ${job.company ?? "—"} (${job.seniority ?? "—"})`);
  console.log(`  top requirements: ${job.topRequirements.join(" · ") || "—"}`);

  const keywords = result.keywordAnalysis;
  const before = analyzeKeywords([...keywords.matched, ...keywords.missing], resume);
  console.log(`\n━━ Keywords`);
  console.log(`  score: ${before.matchScore} before tailoring → ${keywords.matchScore} after`);
  console.log(`  matched: ${keywords.matched.join(", ") || "—"}`);
  console.log(`  missing: ${keywords.missing.join(", ") || "—"}`);

  console.log(`\n━━ Guardrails: ${result.warnings.length} warning(s)`);
  for (const warning of result.warnings) console.log(`  ⚠ ${warning}`);

  console.log(`\n━━ Changes (${result.changes.length})`);
  for (const change of result.changes) {
    console.log(`  [${change.section}/${change.type}] ${change.targetId ?? ""} · ${change.reason}`);
    if (change.type === "reworded") {
      console.log(`    - ${change.before ?? "(none)"}\n    + ${change.after ?? "(none)"}`);
    }
  }

  console.log(`\n━━ Skills`);
  for (const group of final.skills) console.log(`  ${group.category}: ${group.items.join(", ")}`);
} catch (error) {
  console.log(`❌ ${isAppError(error) ? error.code : "ERROR"}: ${(error as Error).message}`);
  process.exitCode = 1;
}
