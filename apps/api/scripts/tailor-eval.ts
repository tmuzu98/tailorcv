/* eslint-disable no-console -- CLI output */
/**
 * Tailoring quality eval: the 6 synthetic fixture pairs (2 resumes × 3 postings) through the real
 * tailoring steps, summarised as counts (src/eval/tailorEval.ts).
 *
 *   npm run tailor:eval -w @tailorcv/api                            # local llama3 (free)
 *   npm run tailor:eval -w @tailorcv/api -- --log "baseline"         # + one row in docs/quality-log.md
 *   npm run tailor:eval -w @tailorcv/api -- --replay .eval-runs/<run> # saved answers, no model call
 *   npm run tailor:eval -w @tailorcv/api -- --provider anthropic     # Claude: billed, ask first
 *
 * Every model run saves the raw answers in apps/api/.eval-runs/<time>/ (git-ignored), so a code
 * change can be checked again for free with --replay. Runs locally only; never in CI.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadEnv } from "../src/config/env";
import {
  EVAL_PAIRS,
  QUALITY_LOG_HEADER,
  formatTable,
  qualityLogRow,
  runTailorEval,
  summarize,
} from "../src/eval/tailorEval";
import { AppError } from "../src/lib/errors";
import { createLogger } from "../src/lib/logger";
import { FakeLlmClient, createLlmClient, type LlmClient } from "../src/llm";
import { TAILOR_PROMPT_VERSION } from "../src/llm/prompts/tailor.v2";

const API_DIR = resolve(import.meta.dirname, "..");
const RUNS_DIR = join(API_DIR, ".eval-runs");
const QUALITY_LOG = resolve(API_DIR, "../../docs/quality-log.md");

const args = process.argv.slice(2);
const flag = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? (args[at + 1] ?? "") : undefined;
};
const replayDir = flag("--replay");
const note = flag("--log");
const provider = flag("--provider") ?? "ollama";
if (provider !== "ollama" && provider !== "anthropic") {
  console.error(`--provider must be ollama or anthropic (got "${provider}")`);
  process.exit(1);
}

const fileOf = (pairId: string) => `${pairId.replace("×", "_")}.json`;
const env = loadEnv();
const logger = createLogger({ NODE_ENV: "development", LOG_LEVEL: "warn" });

let llm: LlmClient;
let model: string;
let saveDir: string | undefined;
if (replayDir !== undefined) {
  // The path as typed (from where npm was run), else relative to apps/api, where runs are saved.
  const dir = [
    resolve(process.env.INIT_CWD ?? process.cwd(), replayDir),
    resolve(API_DIR, replayDir),
  ].find((candidate) => existsSync(candidate));
  if (!dir) {
    console.error(`No saved run at "${replayDir}". Runs are in ${RUNS_DIR}.`);
    process.exit(1);
  }
  const fake = new FakeLlmClient();
  for (const pair of EVAL_PAIRS) {
    const file = join(dir, fileOf(pair.id));
    fake.enqueue(
      existsSync(file)
        ? { data: JSON.parse(readFileSync(file, "utf8")) }
        : { error: new AppError("AI_INVALID_OUTPUT", { message: `no saved answer ${file}` }) },
    );
  }
  llm = fake;
  model = existsSync(join(dir, "model.txt"))
    ? readFileSync(join(dir, "model.txt"), "utf8").trim()
    : "saved";
  console.log(`Replaying saved answers from ${dir} (no model call)\n`);
} else {
  // A fixed provider for the whole run, whatever the development switch says (D-103).
  llm = createLlmClient({ ...env, LLM_PROVIDER: provider, LLM_PROVIDER_SWITCH: false }, logger);
  model = provider === "ollama" ? env.OLLAMA_MODEL : env.ANTHROPIC_MODEL;
  saveDir = join(RUNS_DIR, new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(saveDir, { recursive: true });
  writeFileSync(join(saveDir, "model.txt"), `${model}\n`);
  console.log(
    `Provider: ${provider} (${model}) · ${TAILOR_PROMPT_VERSION} · 6 pairs, one by one\n`,
  );
}

const rows = await runTailorEval({
  pairs: EVAL_PAIRS,
  llm,
  logger,
  onAnswer: (pair, answer) => {
    if (saveDir) writeFileSync(join(saveDir, fileOf(pair.id)), JSON.stringify(answer, null, 2));
    console.log(`  done: ${pair.id}`);
  },
});

console.log(`\n${formatTable(rows)}\n`);
if (saveDir) console.log(`Raw answers saved in ${saveDir} (replay with --replay)`);

if (note !== undefined) {
  if (!existsSync(QUALITY_LOG)) {
    writeFileSync(
      QUALITY_LOG,
      [
        "# Tailoring quality log",
        "",
        'One row per `npm run tailor:eval -w @tailorcv/api -- --log "<note>"` run over the 6 synthetic',
        'fixture pairs. Counts only: never resume, job description or model text. "Bullets reworded"',
        "counts real rewrites that passed the guardrails; typo fixes are counted apart. Warnings are",
        "the guardrails' rejections, by rule (`src/eval/tailorEval.ts`).",
        "",
        QUALITY_LOG_HEADER,
        "",
      ].join("\n"),
    );
  }
  const row = qualityLogRow(summarize(rows), {
    date: new Date().toISOString().slice(0, 10),
    promptVersion: TAILOR_PROMPT_VERSION,
    model,
    replay: replayDir !== undefined,
    note,
  });
  appendFileSync(QUALITY_LOG, `${row}\n`);
  console.log(`Logged to docs/quality-log.md`);
}

if (rows.some((r) => !r.ok)) process.exitCode = 1;
