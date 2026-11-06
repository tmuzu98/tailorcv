import { Writable } from "node:stream";
import { pino } from "pino";
import { describe, expect, it } from "vitest";
import { ParseResponseSchema } from "@tailorcv/shared";
import { readPdfFixture } from "../../tests/helpers/fixtures";
import { AppError } from "../lib/errors";
import { FakeLlmClient } from "../llm/FakeLlmClient";
import { PARSE_PROMPT_VERSION, type ParseLlmOutput } from "../llm/prompts/parse.v1";
import { PARSE_EFFORT, PARSE_MAX_TOKENS, createResumeParserService } from "./resumeParserService";

const modelOutput: ParseLlmOutput = {
  isResume: true,
  basics: {
    fullName: "Alex Example",
    headline: "Senior Software Engineer",
    location: "Springfield",
    links: [],
  },
  experience: [
    {
      company: "Acme Widgets Inc.",
      title: "Senior Software Engineer",
      startDate: "2021",
      endDate: "Present",
      bullets: ["• Built a TypeScript order service handling 2M requests per day."],
    },
  ],
  education: [{ institution: "State University", details: ["B.Sc. Computer Science"] }],
  skills: [
    { category: "TypeScript", items: [] },
    { category: "React", items: [] },
  ],
  projects: [],
  certifications: [],
  additionalSections: [],
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
  return {
    llm,
    service: createResumeParserService({ llm, logger }),
    rawLogs: () => lines.join(""),
  };
}

const pdf = () => new Uint8Array(readPdfFixture("resume-1page.pdf"));

describe("resumeParserService", () => {
  it("returns a contract-valid ParseResponse with normalized data and meta", async () => {
    const { service } = setup({ data: modelOutput });
    const result = await service.parse(pdf(), { pages: 1 });

    expect(ParseResponseSchema.safeParse(result).success).toBe(true);
    expect(result.meta).toEqual({
      pages: 1,
      durationMs: expect.any(Number),
      promptVersion: PARSE_PROMPT_VERSION,
    });
    expect(result.resume.experience[0]?.bullets[0]).toEqual({
      id: "exp_1_b1",
      text: "Built a TypeScript order service handling 2M requests per day.",
    });
    expect(result.resume.skills[0]?.items).toEqual(["TypeScript", "React"]);
    expect(result.resume.education[0]?.degree).toBe("B.Sc. Computer Science");
  });

  it("rescues the email from the real PDF text when the model missed it", async () => {
    const { service } = setup({ data: modelOutput }); // modelOutput has no email
    const result = await service.parse(pdf(), { pages: 1 });
    expect(result.resume.basics.email).toBe("alex@example.com");
  });

  it("calls the LLM with the parse prompt version, low effort, and the PDF + instruction", async () => {
    const { llm, service } = setup({ data: modelOutput });
    await service.parse(pdf(), { pages: 1 });
    expect(llm.calls).toEqual([
      {
        promptVersion: PARSE_PROMPT_VERSION,
        effort: PARSE_EFFORT,
        maxTokens: PARSE_MAX_TOKENS,
        content: ["pdf", "text"],
      },
    ]);
  });

  it("throws RESUME_NOT_DETECTED when the model says it isn't a resume", async () => {
    const { service } = setup({ data: { ...modelOutput, isResume: false } });
    await expect(service.parse(pdf(), { pages: 1 })).rejects.toMatchObject({
      code: "RESUME_NOT_DETECTED",
      status: 422,
    });
  });

  it("throws RESUME_NOT_DETECTED when nothing usable was extracted", async () => {
    const empty: ParseLlmOutput = {
      ...modelOutput,
      basics: { fullName: "N/A", links: [] },
      experience: [],
      education: [],
      skills: [],
    };
    const { service } = setup({ data: empty });
    await expect(service.parse(pdf(), { pages: 1 })).rejects.toMatchObject({
      code: "RESUME_NOT_DETECTED",
    });
  });

  it("passes LLM errors through unchanged", async () => {
    const { service } = setup({ error: new AppError("AI_TIMEOUT") });
    await expect(service.parse(pdf(), { pages: 1 })).rejects.toMatchObject({ code: "AI_TIMEOUT" });
  });

  it("logs counts and stats, never resume content", async () => {
    const { service, rawLogs } = setup({ data: modelOutput });
    await service.parse(pdf(), { pages: 1 });
    const log = rawLogs();
    expect(log).toContain('"msg":"resume parsed"');
    expect(log).toContain('"recoveredSkills":2');
    expect(log).toContain('"emailFromText":true');
    for (const secret of [
      "Alex Example",
      "Acme Widgets",
      "alex@example.com",
      "TypeScript order service",
    ]) {
      expect(log).not.toContain(secret);
    }
  });
});
