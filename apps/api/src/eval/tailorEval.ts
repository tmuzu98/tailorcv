import { TailorRequestSchema, type Resume, type TailorResponse } from "@tailorcv/shared";
import {
  sampleJobDescriptions,
  sampleResumeNewGrad,
  sampleResumeSwe,
} from "@tailorcv/shared/fixtures";
import type { Logger } from "pino";
import { isAppError } from "../lib/errors";
import type { LlmClient } from "../llm";
import type { TailorLlmOutput } from "../llm/prompts/tailor.v2";
import { createJobTailorService } from "../services/jobTailorService";
import { CORRECTION_REASON } from "../services/tailorEdits";

/*
 * Tailoring quality eval (`npm run tailor:eval -w @tailorcv/api`). Runs the synthetic fixture
 * pairs through the real tailoring steps and turns each result into counts, so prompt and rule
 * changes can be compared run against run. Only counts leave this module (the quality log is
 * committed); the raw model answers are handed to `onAnswer` for the CLI to save locally.
 */

export interface EvalPair {
  id: string;
  resume: Resume;
  jobDescription: string;
  /** What the posting's first line says; the job analysis should find the same. */
  expected: { title: string; company: string };
}

const RESUMES = { swe: sampleResumeSwe, newGrad: sampleResumeNewGrad };
const EXPECTED_JOBS: Record<keyof typeof sampleJobDescriptions, EvalPair["expected"]> = {
  frontendEngineer: { title: "Senior Frontend Engineer", company: "Northwind Health" },
  dataAnalyst: { title: "Junior Data Analyst", company: "Evergreen Outfitters" },
  productManager: { title: "Product Manager, Payments", company: "Kestrel Financial" },
};

/** Both synthetic resumes × the three synthetic postings. */
export const EVAL_PAIRS: EvalPair[] = Object.entries(RESUMES).flatMap(([resumeId, resume]) =>
  (Object.keys(EXPECTED_JOBS) as (keyof typeof EXPECTED_JOBS)[]).map((jobId) => ({
    id: `${resumeId}×${jobId}`,
    resume,
    jobDescription: sampleJobDescriptions[jobId],
    expected: EXPECTED_JOBS[jobId],
  })),
);

export const WARNING_RULES = [
  "commentary",
  "jobMention",
  "droppedNumber",
  "newNumber",
  "missingKeyword",
  "headline",
  "lockedField",
  "skill",
  "entry",
  "other",
] as const;
export type WarningRule = (typeof WARNING_RULES)[number];

/**
 * Which guardrail produced a warning, from its fixed wording (guardrailService). A new warning
 * text that matches none of these shows up as "other" in the eval, which is the cue to add it.
 */
const RULE_PATTERNS: [WarningRule, RegExp][] = [
  ["commentary", /added commentary about you/],
  ["jobMention", /mentioned the job you are applying for/],
  ["droppedNumber", /left out a number from your resume/],
  ["newNumber", /mentioned a number that is not in your resume/],
  ["missingKeyword", /mentioned something the job asks for that is not in your resume/],
  ["headline", /is not a job title from your resume/],
  ["lockedField", /^The AI changed (the|your) /],
  ["skill", /^Possible new skill:|^Removed ".*" from ".*": it is not in your resume/],
  ["entry", /the AI added|^The AI left out .*It was put back/],
];

export function classifyWarning(warning: string): WarningRule {
  return RULE_PATTERNS.find(([, pattern]) => pattern.test(warning))?.[0] ?? "other";
}

export interface EvalRow {
  pair: string;
  ok: boolean;
  /** Error code when the pair failed (AI_TIMEOUT, AI_INVALID_OUTPUT…). */
  error?: string;
  durationMs: number;
  bulletsTotal: number;
  /** Reworded for real (not only case/punctuation), after the guardrails. */
  bulletsReworded: number;
  /** Changed in letter case, punctuation or spacing only. */
  bulletsCorrected: number;
  bulletsRemoved: number;
  summaryChanged: boolean;
  headlineChanged: boolean;
  warnings: number;
  warningsByRule: Partial<Record<WarningRule, number>>;
  keywordsTotal: number;
  scoreBefore: number;
  scoreAfter: number;
  titleFound: boolean;
  companyFound: boolean;
}

const BULLET_SECTIONS = new Set(["experience", "projects"]);
const same = (a: string | undefined, b: string) =>
  a !== undefined && a.trim().toLowerCase() === b.trim().toLowerCase();

const countBullets = (resume: Resume) =>
  resume.experience.reduce((n, job) => n + job.bullets.length, 0) +
  resume.projects.reduce((n, project) => n + project.bullets.length, 0);

/** Counts for one pair, from the response the user would get. */
export function rowFromResult(pair: EvalPair, result: TailorResponse): EvalRow {
  const bulletChanges = result.changes.filter((c) => BULLET_SECTIONS.has(c.section));
  const reworded = bulletChanges.filter((c) => c.type === "reworded");
  const corrected = reworded.filter((c) => c.reason === CORRECTION_REASON).length;
  const warningsByRule: EvalRow["warningsByRule"] = {};
  for (const warning of result.warnings) {
    const rule = classifyWarning(warning);
    warningsByRule[rule] = (warningsByRule[rule] ?? 0) + 1;
  }
  const { matched, missing, matchScore, matchScoreBefore } = result.keywordAnalysis;
  return {
    pair: pair.id,
    ok: true,
    durationMs: result.meta.durationMs,
    bulletsTotal: countBullets(pair.resume),
    bulletsReworded: reworded.length - corrected,
    bulletsCorrected: corrected,
    bulletsRemoved: bulletChanges.filter((c) => c.type === "removed").length,
    summaryChanged: result.tailoredResume.basics.summary !== pair.resume.basics.summary,
    headlineChanged: result.tailoredResume.basics.headline !== pair.resume.basics.headline,
    warnings: result.warnings.length,
    warningsByRule,
    keywordsTotal: matched.length + missing.length,
    scoreBefore: matchScoreBefore ?? matchScore,
    scoreAfter: matchScore,
    titleFound: same(result.jobSummary.title, pair.expected.title),
    companyFound: same(result.jobSummary.company, pair.expected.company),
  };
}

function failedRow(pair: EvalPair, error: unknown, durationMs: number): EvalRow {
  return {
    pair: pair.id,
    ok: false,
    error: isAppError(error) ? error.code : "ERROR",
    durationMs,
    bulletsTotal: countBullets(pair.resume),
    bulletsReworded: 0,
    bulletsCorrected: 0,
    bulletsRemoved: 0,
    summaryChanged: false,
    headlineChanged: false,
    warnings: 0,
    warningsByRule: {},
    keywordsTotal: 0,
    scoreBefore: 0,
    scoreAfter: 0,
    titleFound: false,
    companyFound: false,
  };
}

/**
 * Runs the pairs one after another (local models handle one request at a time). A failed pair
 * is recorded and the run goes on. `onAnswer` receives each raw model answer, for replays.
 */
export async function runTailorEval(deps: {
  pairs: EvalPair[];
  llm: LlmClient;
  logger: Logger;
  onAnswer?: (pair: EvalPair, answer: TailorLlmOutput) => void;
}): Promise<EvalRow[]> {
  let lastAnswer: TailorLlmOutput | undefined;
  const llm: LlmClient = {
    async generateStructured(params) {
      const result = await deps.llm.generateStructured(params);
      lastAnswer = result.data as TailorLlmOutput;
      return result;
    },
  };
  const service = createJobTailorService({ llm, logger: deps.logger });
  const rows: EvalRow[] = [];
  for (const pair of deps.pairs) {
    lastAnswer = undefined;
    const started = performance.now();
    try {
      const request = TailorRequestSchema.parse({
        resume: pair.resume,
        jobDescription: pair.jobDescription,
      });
      const result = await service.tailor(request);
      if (lastAnswer) deps.onAnswer?.(pair, lastAnswer);
      rows.push(rowFromResult(pair, result));
    } catch (error) {
      rows.push(failedRow(pair, error, Math.round(performance.now() - started)));
    }
  }
  return rows;
}

export interface EvalSummary {
  pairs: number;
  ok: number;
  bulletsTotal: number;
  bulletsReworded: number;
  bulletsCorrected: number;
  bulletsRemoved: number;
  summariesChanged: number;
  headlinesChanged: number;
  warnings: number;
  warningsByRule: Partial<Record<WarningRule, number>>;
  avgScoreBefore: number;
  avgScoreAfter: number;
  avgSeconds: number;
  titlesFound: number;
  companiesFound: number;
}

const avg = (values: number[]) =>
  values.length === 0 ? 0 : Math.round(values.reduce((a, b) => a + b, 0) / values.length);

/** Totals over the pairs that ran (failed pairs are only counted in `pairs - ok`). */
export function summarize(rows: EvalRow[]): EvalSummary {
  const ok = rows.filter((r) => r.ok);
  const sum = (pick: (r: EvalRow) => number) => ok.reduce((n, r) => n + pick(r), 0);
  const warningsByRule: EvalSummary["warningsByRule"] = {};
  for (const r of ok) {
    for (const [rule, n] of Object.entries(r.warningsByRule) as [WarningRule, number][]) {
      warningsByRule[rule] = (warningsByRule[rule] ?? 0) + n;
    }
  }
  return {
    pairs: rows.length,
    ok: ok.length,
    bulletsTotal: sum((r) => r.bulletsTotal),
    bulletsReworded: sum((r) => r.bulletsReworded),
    bulletsCorrected: sum((r) => r.bulletsCorrected),
    bulletsRemoved: sum((r) => r.bulletsRemoved),
    summariesChanged: sum((r) => Number(r.summaryChanged)),
    headlinesChanged: sum((r) => Number(r.headlineChanged)),
    warnings: sum((r) => r.warnings),
    warningsByRule,
    avgScoreBefore: avg(ok.map((r) => r.scoreBefore)),
    avgScoreAfter: avg(ok.map((r) => r.scoreAfter)),
    avgSeconds: avg(ok.map((r) => r.durationMs / 1000)),
    titlesFound: sum((r) => Number(r.titleFound)),
    companiesFound: sum((r) => Number(r.companyFound)),
  };
}

/** "commentary 5, missingKeyword 2", largest first. */
const rulesText = (byRule: Partial<Record<WarningRule, number>>) =>
  Object.entries(byRule)
    .sort(([, a], [, b]) => b - a)
    .map(([rule, n]) => `${rule} ${n}`)
    .join(", ") || "—";

const yes = (value: boolean) => (value ? "yes" : "no");

/** Plain-text table for the terminal: one line per pair, then the total. */
export function formatTable(rows: EvalRow[]): string {
  const header = ["pair", "time", "reworded", "fixed", "summary", "score", "job", "warnings"];
  const lines = rows.map((r) =>
    r.ok
      ? [
          r.pair,
          `${(r.durationMs / 1000).toFixed(1)} s`,
          `${r.bulletsReworded}/${r.bulletsTotal}`,
          String(r.bulletsCorrected),
          yes(r.summaryChanged),
          `${r.scoreBefore} → ${r.scoreAfter}`,
          `title ${yes(r.titleFound)}, company ${yes(r.companyFound)}`,
          `${r.warnings} (${rulesText(r.warningsByRule)})`,
        ]
      : [r.pair, `${(r.durationMs / 1000).toFixed(1)} s`, `failed: ${r.error}`],
  );
  const s = summarize(rows);
  lines.push([
    `total (${s.ok}/${s.pairs} ran)`,
    `avg ${s.avgSeconds} s`,
    `${s.bulletsReworded}/${s.bulletsTotal}`,
    String(s.bulletsCorrected),
    `${s.summariesChanged}/${s.ok}`,
    `avg ${s.avgScoreBefore} → ${s.avgScoreAfter}`,
    `titles ${s.titlesFound}/${s.ok}, companies ${s.companiesFound}/${s.ok}`,
    `${s.warnings} (${rulesText(s.warningsByRule)})`,
  ]);
  const all = [header, ...lines];
  const widths = header.map((_, i) => Math.max(...all.map((l) => (l[i] ?? "").length)));
  return all.map((l) => l.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join("  ")).join("\n");
}

/** Column header of `docs/quality-log.md`; `qualityLogRow` must produce the same columns. */
export const QUALITY_LOG_HEADER = [
  "| Date | Prompt | Model | Ran | Bullets reworded | Typo fixes | Summaries | Score before → after (avg) | Titles / companies found | Warnings (by rule) | Avg time | Note |",
  "|---|---|---|---|---|---|---|---|---|---|---|---|",
].join("\n");

/** One row for `docs/quality-log.md`. Counts only: no resume, job or model text. */
export function qualityLogRow(
  s: EvalSummary,
  meta: { date: string; promptVersion: string; model: string; replay: boolean; note: string },
): string {
  const cells = [
    meta.date,
    meta.promptVersion,
    meta.replay ? `${meta.model} (replay)` : meta.model,
    `${s.ok}/${s.pairs}`,
    `${s.bulletsReworded}/${s.bulletsTotal}`,
    String(s.bulletsCorrected),
    `${s.summariesChanged}/${s.ok}`,
    `${s.avgScoreBefore} → ${s.avgScoreAfter}`,
    `${s.titlesFound}/${s.ok} · ${s.companiesFound}/${s.ok}`,
    `${s.warnings} (${rulesText(s.warningsByRule)})`,
    `${s.avgSeconds} s`,
    meta.note.replace(/\|/g, "/") || "—",
  ];
  return `| ${cells.join(" | ")} |`;
}
