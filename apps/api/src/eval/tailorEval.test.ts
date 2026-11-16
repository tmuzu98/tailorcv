import { sampleJobDescriptions, sampleResumeSwe } from "@tailorcv/shared/fixtures";
import { pino } from "pino";
import { describe, expect, it } from "vitest";
import { AppError } from "../lib/errors";
import { FakeLlmClient } from "../llm";
import type { TailorLlmOutput } from "../llm/prompts/tailor.v2";
import {
  EVAL_PAIRS,
  WARNING_RULES,
  classifyWarning,
  formatTable,
  qualityLogRow,
  runTailorEval,
  summarize,
  type EvalRow,
} from "./tailorEval";

const logger = pino({ level: "silent" });
const [b1, b2, b3] = sampleResumeSwe.experience[0]!.bullets;

/** A model answer for sampleResumeSwe: one honest rewrite, one typo-only fix, one with filler. */
const answer = (over: Partial<TailorLlmOutput> = {}): TailorLlmOutput => ({
  jobSummary: {
    title: "Senior Frontend Engineer",
    company: "Northwind Health",
    seniority: "Senior",
    topRequirements: ["React"],
  },
  keywords: ["React", "TypeScript", "GraphQL"],
  summary: sampleResumeSwe.basics.summary ?? "",
  bullets: [
    { id: b1!.id, text: `${b1!.text.replace(/\.$/, "")} using React.`, reason: "Names React." },
    { id: b2!.id, text: b2!.text.toUpperCase(), reason: "Case." },
    {
      id: b3!.id,
      text: `${b3!.text.replace(/\.$/, "")}, which demonstrates strong leadership.`,
      reason: "Leadership.",
    },
  ],
  removedBulletIds: [],
  ...over,
});

const swePair = EVAL_PAIRS.find((p) => p.id === "swe×frontendEngineer")!;

describe("EVAL_PAIRS", () => {
  it("covers both synthetic resumes × the three postings, with the expected job", () => {
    expect(EVAL_PAIRS).toHaveLength(6);
    expect(new Set(EVAL_PAIRS.map((p) => p.id)).size).toBe(6);
    expect(swePair.jobDescription).toBe(sampleJobDescriptions.frontendEngineer);
    expect(swePair.expected).toEqual({
      title: "Senior Frontend Engineer",
      company: "Northwind Health",
    });
  });
});

describe("classifyWarning", () => {
  it.each([
    [
      'A reworded line under "X" added commentary about you instead of stating the work. The original wording was kept.',
      "commentary",
    ],
    [
      'A reworded line under "X" mentioned the job you are applying for instead of stating the work. The original wording was kept.',
      "jobMention",
    ],
    [
      "The new summary mentioned the job you are applying for instead of describing you. The original wording was kept.",
      "jobMention",
    ],
    [
      'A reworded line under "X" left out a number from your resume (40%). The original wording was kept.',
      "droppedNumber",
    ],
    [
      "The new summary mentioned a number that is not in your resume (12). The original wording was kept.",
      "newNumber",
    ],
    [
      "The new summary mentioned something the job asks for that is not in your resume (GraphQL). The original wording was kept.",
      "missingKeyword",
    ],
    [
      'The new headline ("CTO") is not a job title from your resume. Your original headline was kept.',
      "headline",
    ],
    ['The AI changed the company of "Acme". The original was kept.', "lockedField"],
    ["The AI changed your email. Your original contact details were kept.", "lockedField"],
    ['Possible new skill: "Go". It is not in your resume, so it was removed.', "skill"],
    ['Removed "Go" from "Tools": it is not in your resume.', "skill"],
    ['The AI left out "Acme". It was put back.', "entry"],
    ['Removed a job the AI added ("Fake Co"). Only entries from your resume are kept.', "entry"],
    ['Removed 2 bullet points the AI added under "Acme" (not in your resume).', "entry"],
    ["Something new nobody planned for.", "other"],
  ])("%s → %s", (warning, rule) => {
    expect(classifyWarning(warning)).toBe(rule);
  });

  it("every rule except 'other' is reachable", () => {
    expect(WARNING_RULES).toContain("other");
  });
});

describe("runTailorEval", () => {
  it("runs each pair once, counts what changed and saves the raw answer", async () => {
    const llm = new FakeLlmClient({ data: answer() });
    const saved: string[] = [];
    const rows = await runTailorEval({
      pairs: [swePair],
      llm,
      logger,
      onAnswer: (pair) => saved.push(pair.id),
    });
    expect(llm.calls).toHaveLength(1);
    expect(saved).toEqual(["swe×frontendEngineer"]);
    const [row] = rows;
    expect(row).toMatchObject({
      pair: "swe×frontendEngineer",
      ok: true,
      bulletsReworded: 1,
      bulletsCorrected: 1,
      titleFound: true,
      companyFound: true,
    });
    const total =
      sampleResumeSwe.experience.reduce((n, j) => n + j.bullets.length, 0) +
      sampleResumeSwe.projects.reduce((n, p) => n + p.bullets.length, 0);
    expect(row!.bulletsTotal).toBe(total);
    expect(row!.warningsByRule.commentary).toBe(1);
    expect(row!.warnings).toBe(1);
    expect(row!.keywordsTotal).toBe(3);
    expect(row!.scoreAfter).toBeGreaterThanOrEqual(row!.scoreBefore);
  });

  it("marks a missing or different company as not found", async () => {
    const llm = new FakeLlmClient({
      data: answer({ jobSummary: { title: "senior frontend engineer", topRequirements: [] } }),
    });
    const [row] = await runTailorEval({ pairs: [swePair], llm, logger });
    expect(row).toMatchObject({ titleFound: true, companyFound: false });

    const wrong = new FakeLlmClient({
      data: answer({
        jobSummary: { title: "Frontend Lead", company: "Acme Widgets", topRequirements: [] },
      }),
    });
    const [other] = await runTailorEval({ pairs: [swePair], llm: wrong, logger });
    expect(other).toMatchObject({ titleFound: false, companyFound: false });
  });

  it("records a failed pair and goes on with the next one", async () => {
    const llm = new FakeLlmClient().enqueue(
      { error: new AppError("AI_INVALID_OUTPUT") },
      { data: answer() },
    );
    const rows = await runTailorEval({ pairs: [swePair, swePair], llm, logger });
    expect(rows.map((r) => r.ok)).toEqual([false, true]);
    expect(rows[0]!.error).toBe("AI_INVALID_OUTPUT");
  });
});

const row = (over: Partial<EvalRow> = {}): EvalRow => ({
  pair: "p",
  ok: true,
  durationMs: 10_000,
  bulletsTotal: 10,
  bulletsReworded: 4,
  bulletsCorrected: 1,
  bulletsRemoved: 0,
  summaryChanged: true,
  headlineChanged: false,
  warnings: 2,
  warningsByRule: { commentary: 2 },
  keywordsTotal: 10,
  scoreBefore: 40,
  scoreAfter: 50,
  titleFound: true,
  companyFound: false,
  ...over,
});

describe("summarize", () => {
  it("adds up the counts of the pairs that ran and counts the failures", () => {
    const s = summarize([
      row(),
      row({ scoreBefore: 20, scoreAfter: 20, durationMs: 20_000, companyFound: true }),
      row({ ok: false, error: "AI_TIMEOUT" }),
    ]);
    expect(s).toMatchObject({
      pairs: 3,
      ok: 2,
      bulletsTotal: 20,
      bulletsReworded: 8,
      bulletsCorrected: 2,
      warnings: 4,
      avgScoreBefore: 30,
      avgScoreAfter: 35,
      avgSeconds: 15,
      summariesChanged: 2,
      titlesFound: 2,
      companiesFound: 1,
    });
    expect(s.warningsByRule).toEqual({ commentary: 4 });
  });

  it("has zero averages when nothing ran", () => {
    expect(summarize([row({ ok: false })])).toMatchObject({ ok: 0, avgScoreAfter: 0 });
  });
});

describe("formatTable and qualityLogRow", () => {
  it("prints one line per pair plus a total, with failures named", () => {
    const table = formatTable([row({ pair: "a" }), row({ pair: "b", ok: false, error: "X" })]);
    expect(table).toMatch(/a .*4\/10/);
    expect(table).toMatch(/b .*failed: X/);
    expect(table).toMatch(/total/i);
  });

  it("builds a markdown table row with counts only", () => {
    const line = qualityLogRow(summarize([row()]), {
      date: "2026-11-16",
      promptVersion: "tailor-v2",
      model: "llama3",
      replay: false,
      note: "baseline",
    });
    expect(line.startsWith("| 2026-11-16 | tailor-v2 | llama3 |")).toBe(true);
    expect(line).toContain("4/10");
    expect(line).toContain("commentary 2");
    expect(line).toContain("40 → 50");
    expect(line).toContain("baseline");
    expect(line.endsWith("|")).toBe(true);
  });
});
