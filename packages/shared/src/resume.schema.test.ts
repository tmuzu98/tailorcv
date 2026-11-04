import { describe, expect, it } from "vitest";
import { LOCKED_FIELDS, ResumeSchema, type Resume } from "./resume.schema";
import { sampleResumeNewGrad, sampleResumeSwe } from "./fixtures";

const clone = (r: Resume): Resume => structuredClone(r);

describe("ResumeSchema", () => {
  it.each([
    ["sampleResumeSwe (all sections)", sampleResumeSwe],
    ["sampleResumeNewGrad (sparse, empty sections)", sampleResumeNewGrad],
  ])("accepts fixture %s", (_label, resume) => {
    expect(ResumeSchema.parse(resume)).toEqual(resume);
  });

  it("accepts the minimal resume: a name and empty sections", () => {
    const minimal = {
      basics: { fullName: "Sam Doe", links: [] },
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      additionalSections: [],
    };
    expect(ResumeSchema.safeParse(minimal).success).toBe(true);
  });

  it("is lenient with messy real-world values (non-URL links, odd emails, free-text dates)", () => {
    const r = clone(sampleResumeSwe);
    r.basics.email = "alex at example dot com";
    r.basics.links = [{ label: "LinkedIn", url: "linkedin.com/in/someone" }];
    r.experience[0]!.startDate = "Spring '22";
    r.experience[0]!.endDate = "Present";
    expect(ResumeSchema.safeParse(r).success).toBe(true);
  });

  it("allows an experience entry without dates", () => {
    const r = clone(sampleResumeSwe);
    delete r.experience[2]!.startDate;
    delete r.experience[2]!.endDate;
    expect(ResumeSchema.safeParse(r).success).toBe(true);
  });

  it("rejects an empty fullName", () => {
    const r = clone(sampleResumeSwe);
    r.basics.fullName = "";
    expect(ResumeSchema.safeParse(r).success).toBe(false);
  });

  it("rejects a bullet without an id", () => {
    const r = clone(sampleResumeSwe) as unknown as { experience: { bullets: object[] }[] };
    r.experience[0]!.bullets[0] = { text: "No id here" };
    expect(ResumeSchema.safeParse(r).success).toBe(false);
  });

  it("rejects an experience entry without company or title", () => {
    const r = clone(sampleResumeSwe);
    r.experience[0]!.company = "";
    expect(ResumeSchema.safeParse(r).success).toBe(false);
  });

  it("rejects a resume missing a whole section", () => {
    const { projects: _omit, ...withoutProjects } = clone(sampleResumeSwe);
    expect(ResumeSchema.safeParse(withoutProjects).success).toBe(false);
  });

  it("strips unknown fields instead of failing (forward compatible)", () => {
    const withExtra = { ...clone(sampleResumeSwe), hobbies: ["chess"] };
    const parsed = ResumeSchema.parse(withExtra);
    expect(parsed).not.toHaveProperty("hobbies");
  });
});

describe("LOCKED_FIELDS", () => {
  it("locks the factual fields the PRD requires (FR-7)", () => {
    expect(LOCKED_FIELDS.experience).toEqual(
      expect.arrayContaining(["company", "title", "startDate", "endDate"]),
    );
    expect(LOCKED_FIELDS.education).toEqual(expect.arrayContaining(["institution", "degree"]));
    expect(LOCKED_FIELDS.certifications).toEqual(expect.arrayContaining(["name", "issuer"]));
  });

  it("never locks the editable text (bullets/details)", () => {
    expect(LOCKED_FIELDS.experience).not.toContain("bullets");
    expect(LOCKED_FIELDS.education).not.toContain("details");
  });
});

describe("fixtures", () => {
  it("use unique ids within each resume", () => {
    for (const resume of [sampleResumeSwe, sampleResumeNewGrad]) {
      const ids = [
        ...resume.experience.flatMap((e) => [e.id, ...e.bullets.map((b) => b.id)]),
        ...resume.education.flatMap((e) => [e.id, ...e.details.map((d) => d.id)]),
        ...resume.skills.map((s) => s.id),
        ...resume.projects.flatMap((p) => [p.id, ...p.bullets.map((b) => b.id)]),
        ...resume.certifications.map((c) => c.id),
        ...resume.additionalSections.map((a) => a.id),
      ];
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("contain only synthetic contact details (example.com emails, 555 numbers)", () => {
    for (const resume of [sampleResumeSwe, sampleResumeNewGrad]) {
      if (resume.basics.email) expect(resume.basics.email).toMatch(/@example\.com$/);
      if (resume.basics.phone) expect(resume.basics.phone).toMatch(/555/);
    }
  });
});
