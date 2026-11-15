import { describe, expect, it } from "vitest";
import { sampleJobDescriptions, sampleResumeNewGrad, sampleResumeSwe } from "./fixtures";
import { ResumeSchema } from "./resume.schema";
import {
  ADDED_SKILLS_CATEGORY,
  EMPTY_RESUME_ADDITIONS,
  RESUME_ADDITION_LIMITS,
  ResumeAdditionsSchema,
  applyResumeAdditions,
  collectResumeIds,
  findDuplicateResumeIds,
  hasResumeAdditions,
  resumeHasSkill,
  type ResumeAdditions,
} from "./resumeAdditions";
import { TailorRequestSchema } from "./tailor.schema";

const additions = (patch: Partial<ResumeAdditions>): ResumeAdditions => ({
  ...EMPTY_RESUME_ADDITIONS,
  ...patch,
});

describe("ResumeAdditionsSchema", () => {
  it("accepts empty additions and trims text", () => {
    expect(ResumeAdditionsSchema.parse(EMPTY_RESUME_ADDITIONS)).toEqual(EMPTY_RESUME_ADDITIONS);
    const parsed = ResumeAdditionsSchema.parse(
      additions({ skills: ["  Docker "], basics: { phone: " (555) 010-0000 " } }),
    );
    expect(parsed.skills).toEqual(["Docker"]);
    expect(parsed.basics.phone).toBe("(555) 010-0000");
  });

  it("rejects blank and over-long text", () => {
    const bad = [
      additions({ skills: ["   "] }),
      additions({ skills: ["x".repeat(RESUME_ADDITION_LIMITS.maxSkillChars + 1)] }),
      additions({
        bullets: [
          { experienceId: "exp_1", text: "x".repeat(RESUME_ADDITION_LIMITS.maxBulletChars + 1) },
        ],
      }),
      additions({ bullets: [{ experienceId: "", text: "Did a thing" }] }),
      additions({ certifications: [{ name: "" }] }),
      additions({ basics: { email: "x".repeat(RESUME_ADDITION_LIMITS.maxFieldChars + 1) } }),
    ];
    for (const value of bad) expect(ResumeAdditionsSchema.safeParse(value).success).toBe(false);
  });

  it("rejects more items than the limits allow", () => {
    const skills = Array.from({ length: RESUME_ADDITION_LIMITS.maxSkills + 1 }, (_, i) => `s${i}`);
    expect(ResumeAdditionsSchema.safeParse(additions({ skills })).success).toBe(false);
  });
});

describe("hasResumeAdditions", () => {
  it("is false for empty additions and true for any addition", () => {
    expect(hasResumeAdditions(EMPTY_RESUME_ADDITIONS)).toBe(false);
    expect(hasResumeAdditions(additions({ basics: { phone: "555" } }))).toBe(true);
    expect(hasResumeAdditions(additions({ skills: ["Docker"] }))).toBe(true);
    expect(hasResumeAdditions(additions({ certifications: [{ name: "PMP" }] }))).toBe(true);
  });
});

describe("applyResumeAdditions", () => {
  it("returns an equal resume when nothing was added, without touching the input", () => {
    const before = structuredClone(sampleResumeSwe);
    expect(applyResumeAdditions(sampleResumeSwe, EMPTY_RESUME_ADDITIONS)).toEqual(before);
    expect(sampleResumeSwe).toEqual(before);
  });

  it("fills missing contact fields but never overwrites what the PDF said", () => {
    const merged = applyResumeAdditions(
      sampleResumeNewGrad, // has email + location, no phone or headline
      additions({
        basics: { phone: "(555) 010-9999", headline: "Data Analyst", email: "other@example.com" },
      }),
    );
    expect(merged.basics.phone).toBe("(555) 010-9999");
    expect(merged.basics.headline).toBe("Data Analyst");
    expect(merged.basics.email).toBe(sampleResumeNewGrad.basics.email);
  });

  it("treats a whitespace-only parsed field as missing", () => {
    const resume = {
      ...sampleResumeNewGrad,
      basics: { ...sampleResumeNewGrad.basics, phone: " " },
    };
    const merged = applyResumeAdditions(resume, additions({ basics: { phone: "555-0100" } }));
    expect(merged.basics.phone).toBe("555-0100");
  });

  it("appends bullets to the right job with the next free id", () => {
    const merged = applyResumeAdditions(
      sampleResumeSwe,
      additions({
        bullets: [
          { experienceId: "exp_1", text: "Ran the on-call rotation." },
          { experienceId: "exp_3", text: "Trained two interns." },
          { experienceId: "exp_1", text: "Wrote the onboarding guide." },
          { experienceId: "exp_99", text: "Belongs to no job." },
        ],
      }),
    );
    const [first, second, third] = merged.experience;
    expect(first?.bullets.slice(5)).toEqual([
      { id: "exp_1_b6", text: "Ran the on-call rotation." },
      { id: "exp_1_b7", text: "Wrote the onboarding guide." },
    ]);
    expect(second).toBe(sampleResumeSwe.experience[1]); // untouched jobs are reused as-is
    expect(third?.bullets.at(-1)).toEqual({ id: "exp_3_b3", text: "Trained two interns." });
    expect(JSON.stringify(merged)).not.toContain("Belongs to no job.");
  });

  it("puts new skills in one extra group and skips ones the resume already has", () => {
    const merged = applyResumeAdditions(
      sampleResumeSwe,
      additions({ skills: ["Docker", "typescript", "docker", "GraphQL"] }),
    );
    expect(merged.skills).toHaveLength(sampleResumeSwe.skills.length + 1);
    expect(merged.skills.at(-1)).toEqual({
      id: "skill_4",
      category: ADDED_SKILLS_CATEGORY,
      items: ["Docker", "GraphQL"],
    });
    expect(resumeHasSkill(merged, "graphql")).toBe(true);
  });

  it("adds no skill group when every added skill is already there", () => {
    const merged = applyResumeAdditions(sampleResumeSwe, additions({ skills: ["React"] }));
    expect(merged.skills).toBe(sampleResumeSwe.skills);
  });

  it("appends certifications with the next free id", () => {
    const merged = applyResumeAdditions(
      sampleResumeSwe,
      additions({
        certifications: [{ name: "Scrum Master", issuer: "Scrum Alliance" }, { name: "PMP" }],
      }),
    );
    expect(merged.certifications.slice(1)).toEqual([
      { id: "cert_2", name: "Scrum Master", issuer: "Scrum Alliance" },
      { id: "cert_3", name: "PMP" },
    ]);
  });

  it("always produces a valid resume with unique ids that the tailor request accepts", () => {
    const merged = applyResumeAdditions(
      sampleResumeNewGrad,
      additions({
        basics: { phone: "555-0100" },
        skills: ["R", "Power BI"],
        bullets: [{ experienceId: "exp_1", text: "Presented findings to the lab director." }],
        certifications: [{ name: "Google Data Analytics", date: "2025" }],
      }),
    );
    expect(ResumeSchema.safeParse(merged).success).toBe(true);
    expect(findDuplicateResumeIds(merged)).toEqual([]);
    expect(new Set(collectResumeIds(merged)).size).toBe(collectResumeIds(merged).length);
    const request = { resume: merged, jobDescription: sampleJobDescriptions.dataAnalyst };
    expect(TailorRequestSchema.safeParse(request).success).toBe(true);
  });

  it("is deterministic", () => {
    const input = additions({ skills: ["Docker"], certifications: [{ name: "PMP" }] });
    expect(applyResumeAdditions(sampleResumeSwe, input)).toEqual(
      applyResumeAdditions(sampleResumeSwe, input),
    );
  });
});

describe("resume ids", () => {
  it("the fixtures have no duplicate ids", () => {
    expect(findDuplicateResumeIds(sampleResumeSwe)).toEqual([]);
    expect(findDuplicateResumeIds(sampleResumeNewGrad)).toEqual([]);
  });

  it("finds duplicates across sections, each reported once", () => {
    const resume = structuredClone(sampleResumeSwe);
    resume.experience[1]!.id = "exp_1";
    resume.experience[1]!.bullets[0]!.id = "exp_1_b1";
    resume.certifications[0]!.id = "exp_1";
    expect(findDuplicateResumeIds(resume)).toEqual(["exp_1", "exp_1_b1"]);
  });

  it("the tailor request rejects a resume with duplicate ids", () => {
    const resume = structuredClone(sampleResumeSwe);
    resume.experience[0]!.bullets[1]!.id = "exp_1_b1";
    const result = TailorRequestSchema.safeParse({
      resume,
      jobDescription: sampleJobDescriptions.frontendEngineer,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["resume"]);
      expect(result.error.issues[0]?.message).toMatch(/unique.*exp_1_b1/);
    }
  });
});
