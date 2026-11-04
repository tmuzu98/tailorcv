import { describe, expect, it } from "vitest";
import {
  JOB_DESCRIPTION_MAX_CHARS,
  JOB_DESCRIPTION_MIN_CHARS,
  KeywordAnalysisSchema,
  TailorRequestSchema,
  TailorResultSchema,
} from "./tailor.schema";
import { LOCKED_FIELDS } from "./resume.schema";
import { sampleJobDescriptions, sampleResumeSwe, sampleTailorResultSweFrontend } from "./fixtures";

describe("TailorRequestSchema", () => {
  const base = { resume: sampleResumeSwe, jobDescription: sampleJobDescriptions.frontendEngineer };

  it("accepts every sample JD", () => {
    for (const jd of Object.values(sampleJobDescriptions)) {
      expect(TailorRequestSchema.safeParse({ ...base, jobDescription: jd }).success).toBe(true);
    }
  });

  it("allows options to be omitted, and defaults tone to 'professional' when options are given", () => {
    expect(TailorRequestSchema.parse(base).options).toBeUndefined();
    expect(TailorRequestSchema.parse({ ...base, options: {} }).options?.tone).toBe("professional");
  });

  it("rejects an unknown tone", () => {
    const r = TailorRequestSchema.safeParse({ ...base, options: { tone: "funny" } });
    expect(r.success).toBe(false);
  });

  it(`rejects a JD shorter than ${JOB_DESCRIPTION_MIN_CHARS} characters (after trimming)`, () => {
    const short = "   " + "x".repeat(JOB_DESCRIPTION_MIN_CHARS - 1) + "   ";
    const r = TailorRequestSchema.safeParse({ ...base, jobDescription: short });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toMatch(/at least 100/);
  });

  it(`rejects a JD longer than ${JOB_DESCRIPTION_MAX_CHARS} characters`, () => {
    const long = "x".repeat(JOB_DESCRIPTION_MAX_CHARS + 1);
    expect(TailorRequestSchema.safeParse({ ...base, jobDescription: long }).success).toBe(false);
  });

  it("trims whitespace around the JD", () => {
    const jd = sampleJobDescriptions.dataAnalyst;
    expect(
      TailorRequestSchema.parse({ ...base, jobDescription: `\n\n  ${jd}  \n` }).jobDescription,
    ).toBe(jd);
  });

  it("rejects an invalid resume", () => {
    const r = TailorRequestSchema.safeParse({ ...base, resume: { basics: {} } });
    expect(r.success).toBe(false);
  });
});

describe("TailorResultSchema", () => {
  it("accepts the sample tailor result fixture", () => {
    expect(TailorResultSchema.safeParse(sampleTailorResultSweFrontend).success).toBe(true);
  });

  it("rejects an unknown change type", () => {
    const bad = structuredClone(sampleTailorResultSweFrontend) as unknown as {
      changes: { type: string }[];
    };
    bad.changes[0]!.type = "invented";
    expect(TailorResultSchema.safeParse(bad).success).toBe(false);
  });

  it("requires a reason on every change", () => {
    const bad = structuredClone(sampleTailorResultSweFrontend);
    bad.changes[0]!.reason = "";
    expect(TailorResultSchema.safeParse(bad).success).toBe(false);
  });

  it("sample result is honest: locked fields unchanged and no new skills", () => {
    const original = sampleResumeSwe;
    const tailored = sampleTailorResultSweFrontend.tailoredResume;

    for (const exp of tailored.experience) {
      const src = original.experience.find((e) => e.id === exp.id);
      expect(src).toBeDefined();
      for (const field of LOCKED_FIELDS.experience) expect(exp[field]).toBe(src![field]);
    }
    const originalSkills = new Set(original.skills.flatMap((s) => s.items));
    for (const skill of tailored.skills.flatMap((s) => s.items))
      expect(originalSkills).toContain(skill);
  });
});

describe("KeywordAnalysisSchema", () => {
  it.each([-1, 101, 50.5])("rejects matchScore %s", (score) => {
    expect(
      KeywordAnalysisSchema.safeParse({ matched: [], missing: [], matchScore: score }).success,
    ).toBe(false);
  });

  it.each([0, 67, 100])("accepts matchScore %s", (score) => {
    expect(
      KeywordAnalysisSchema.safeParse({ matched: [], missing: [], matchScore: score }).success,
    ).toBe(true);
  });
});
