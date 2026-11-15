import { Writable } from "node:stream";
import { pino } from "pino";
import { describe, expect, it } from "vitest";
import { TailorRequestSchema, TailorResponseSchema } from "@tailorcv/shared";
import { jdFrontendEngineer, sampleResumeSwe } from "@tailorcv/shared/fixtures";
import { AppError } from "../lib/errors";
import { FakeLlmClient } from "../llm/FakeLlmClient";
import { TAILOR_PROMPT_VERSION, type TailorLlmOutput } from "../llm/prompts/tailor.v2";
import { TAILOR_EFFORT, TAILOR_MAX_TOKENS, createJobTailorService } from "./jobTailorService";

const request = TailorRequestSchema.parse({
  resume: sampleResumeSwe,
  jobDescription: jdFrontendEngineer,
});

/** An honest model answer for the fixture resume and the frontend JD. */
const honest: TailorLlmOutput = {
  jobSummary: {
    title: "Senior Frontend Engineer",
    company: "Northwind Health",
    seniority: "Senior",
    topRequirements: ["React", "TypeScript", "Design systems", ""],
  },
  keywords: ["React", "TypeScript", "GraphQL", "Storybook", "Cypress", "performance"],
  headline: "Senior Frontend Engineer",
  summary:
    "Frontend engineer with 6 years of experience building React and TypeScript applications.",
  bullets: [
    {
      id: "exp_1_b5",
      text: "Improved frontend performance, raising the Lighthouse score from 54 to 91.",
      reason: "The role asks for frontend performance work.",
    },
    {
      id: "exp_1_b3",
      text: "Introduced a shared React component library, reducing duplicated UI code across 4 teams.",
      reason: "The role centers on a design system.",
    },
  ],
  removedBulletIds: [],
};

function setup(...responses: ConstructorParameters<typeof FakeLlmClient>) {
  const llm = new FakeLlmClient(...responses);
  const lines: string[] = [];
  const logger = pino(
    { level: "info" },
    new Writable({
      write(chunk: Buffer, _enc, done) {
        lines.push(chunk.toString());
        done();
      },
    }),
  );
  return { llm, service: createJobTailorService({ llm, logger }), rawLogs: () => lines.join("") };
}

describe("jobTailorService", () => {
  it("returns a contract-valid TailorResponse built from the model's edits", async () => {
    const { service } = setup({ data: honest });
    const result = await service.tailor(request);

    expect(TailorResponseSchema.safeParse(result).success).toBe(true);
    expect(result.meta).toEqual({
      durationMs: expect.any(Number),
      promptVersion: TAILOR_PROMPT_VERSION,
    });
    expect(result.tailoredResume.basics.headline).toBe("Senior Frontend Engineer");
    expect(result.tailoredResume.experience[0]?.bullets.map((b) => b.id)).toEqual([
      "exp_1_b5",
      "exp_1_b3",
      "exp_1_b1",
      "exp_1_b2",
      "exp_1_b4",
    ]);
    expect(result.jobSummary.topRequirements).toEqual(["React", "TypeScript", "Design systems"]);
    expect(result.warnings).toEqual([]);
  });

  it("computes the keyword match itself, on the final resume", async () => {
    const { service } = setup({ data: honest });
    const { keywordAnalysis } = await service.tailor(request);

    expect(keywordAnalysis).toEqual({
      matched: ["React", "TypeScript", "Cypress", "performance"],
      missing: ["GraphQL", "Storybook"],
      matchScore: 67,
    });
  });

  it("builds the change list from what really changed", async () => {
    const { service } = setup({ data: honest });
    const { changes } = await service.tailor(request);

    expect(changes.map((c) => `${c.section}/${c.type}/${c.targetId ?? ""}`)).toEqual([
      "summary/reworded/",
      "summary/reworded/",
      "experience/reordered/exp_1",
      "experience/reworded/exp_1_b5",
      "experience/reworded/exp_1_b3",
      "skills/reordered/skill_3",
    ]);
    expect(changes[3]?.reason).toBe("The role asks for frontend performance work.");
  });

  it("undoes dishonest edits: a job keyword the resume lacks, and an invented number", async () => {
    const { service } = setup({
      data: {
        ...honest,
        summary: "Frontend engineer with 10 years of experience.",
        bullets: [
          {
            id: "exp_2_b2",
            text: "Wrote GraphQL and REST API endpoints in Node.js and Express for order history.",
            reason: "The role works with GraphQL APIs.",
          },
          {
            id: "exp_2_b3",
            text: "Added end-to-end tests with Cypress and documented components in Storybook.",
            reason: "Design system.",
          },
        ],
      } satisfies TailorLlmOutput,
    });
    const result = await service.tailor(request);
    const job = result.tailoredResume.experience[1];
    const originalJob = sampleResumeSwe.experience[1];

    expect(job?.bullets.map((b) => b.text).sort()).toEqual(
      originalJob?.bullets.map((b) => b.text).sort(),
    );
    expect(result.tailoredResume.basics.summary).toBe(sampleResumeSwe.basics.summary);
    expect(result.warnings).toHaveLength(3);
    expect(result.warnings.join("\n")).toContain("GraphQL");
    expect(result.warnings.join("\n")).toContain("Storybook");
    expect(result.keywordAnalysis.missing).toEqual(["GraphQL", "Storybook"]);
    expect(result.changes.some((c) => c.after?.includes("GraphQL"))).toBe(false);
  });

  it("returns the original resume, unchanged, when the model proposes nothing usable", async () => {
    const { service } = setup({
      data: {
        jobSummary: { title: "", topRequirements: [] },
        keywords: [],
        summary: "",
        bullets: [{ id: "exp_99_b1", text: "Ran a team of 50.", reason: "" }],
        removedBulletIds: [],
      } satisfies TailorLlmOutput,
    });
    const result = await service.tailor(request);

    expect(result.tailoredResume).toEqual(sampleResumeSwe);
    expect(result.changes).toEqual([]);
    expect(result.keywordAnalysis).toEqual({ matched: [], missing: [], matchScore: 0 });
  });

  it("calls the model once with the tailor prompt, medium effort and the tone", async () => {
    let content = "";
    const { llm, service } = setup((params) => {
      content = params.content as string;
      return honest;
    });
    await service.tailor({ ...request, options: { tone: "concise" } });

    expect(llm.calls).toEqual([
      {
        promptVersion: TAILOR_PROMPT_VERSION,
        effort: TAILOR_EFFORT,
        maxTokens: TAILOR_MAX_TOKENS,
        content: "text",
      },
    ]);
    expect(content).toContain("Tone: concise");
    expect(content).toContain("[exp_1_b1]");
    expect(content).toContain(jdFrontendEngineer);
  });

  it("passes the abort signal to the model call", async () => {
    const controller = new AbortController();
    let seen: AbortSignal | undefined;
    const { service } = setup((params) => {
      seen = params.signal;
      return honest;
    });
    await service.tailor(request, { signal: controller.signal });
    expect(seen).toBe(controller.signal);
  });

  it("lets the model client's errors through unchanged", async () => {
    const { service } = setup({ error: new AppError("AI_TIMEOUT") });
    await expect(service.tailor(request)).rejects.toMatchObject({ code: "AI_TIMEOUT" });
  });

  it("logs counts only: no resume text, job text, keywords or warnings", async () => {
    const { service, rawLogs } = setup({
      data: { ...honest, summary: "Engineer with 10 years of experience." },
    });
    await service.tailor(request);
    const logs = rawLogs();

    expect(logs).toContain('"msg":"resume tailored"');
    expect(logs).toContain('"scoreAfter":67');
    expect(logs).toContain('"textsRestored":1');
    for (const secret of [
      "Alex",
      "Rivera",
      "Brightpath",
      "Northwind",
      "Lighthouse",
      "GraphQL",
      "10 years",
      "not in your resume",
    ]) {
      expect(logs).not.toContain(secret);
    }
  });
});
