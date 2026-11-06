import { describe, expect, it } from "vitest";
import { ResumeSchema } from "@tailorcv/shared";
import type { ParseLlmOutput } from "../llm/prompts/parse.v1";
import { looksLikeResume, normalizeParsedResume } from "./resumeNormalizer";

/** A minimal valid model output; tests override parts of it. */
function raw(overrides: Partial<ParseLlmOutput> = {}): ParseLlmOutput {
  return {
    isResume: true,
    basics: { fullName: "Alex Example", links: [] },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    additionalSections: [],
    ...overrides,
  };
}

describe("normalizeParsedResume: ids", () => {
  it("assigns stable ids in document order (exp_1, exp_1_b1, edu_1_d1, skill_1, proj_1_b1, cert_1, add_1)", () => {
    const { resume } = normalizeParsedResume(
      raw({
        experience: [
          { company: "Acme", title: "Engineer", bullets: ["A", "B"] },
          { company: "Globex", title: "Dev", bullets: ["C"] },
        ],
        education: [{ institution: "State U", degree: "B.Sc.", details: ["Honors"] }],
        skills: [{ category: "Languages", items: ["TS"] }],
        projects: [{ name: "Toolkit", bullets: ["Built it"], technologies: [] }],
        certifications: [{ name: "Cloud Cert" }],
        additionalSections: [{ title: "Languages", items: ["English"] }],
      }),
    );
    expect(resume.experience.map((e) => [e.id, e.bullets.map((b) => b.id)])).toEqual([
      ["exp_1", ["exp_1_b1", "exp_1_b2"]],
      ["exp_2", ["exp_2_b1"]],
    ]);
    expect(resume.education[0]).toMatchObject({
      id: "edu_1",
      details: [{ id: "edu_1_d1", text: "Honors" }],
    });
    expect(resume.skills[0]?.id).toBe("skill_1");
    expect(resume.projects[0]).toMatchObject({ id: "proj_1", bullets: [{ id: "proj_1_b1" }] });
    expect(resume.certifications[0]?.id).toBe("cert_1");
    expect(resume.additionalSections[0]?.id).toBe("add_1");
    expect(ResumeSchema.safeParse(resume).success).toBe(true);
  });

  it("numbers ids after dropped entries without gaps", () => {
    const { resume, stats } = normalizeParsedResume(
      raw({
        experience: [
          { company: "", title: "Ghost", bullets: [] },
          { company: "Acme", title: "Engineer", bullets: [] },
        ],
      }),
    );
    expect(resume.experience.map((e) => e.id)).toEqual(["exp_1"]);
    expect(stats.droppedEntries).toBe(1);
  });
});

describe("normalizeParsedResume: text cleanup", () => {
  it("trims, collapses PDF line wraps and strips bullet glyphs, keeping the wording", () => {
    const { resume } = normalizeParsedResume(
      raw({
        basics: { fullName: "  Alex   Example ", links: [] },
        experience: [
          {
            company: " Acme ",
            title: "Engineer",
            bullets: [
              "• Built a TypeScript\n   order service.",
              "- Cut load time by 40%.",
              "–  Shipped v2",
            ],
          },
        ],
      }),
    );
    expect(resume.basics.fullName).toBe("Alex Example");
    expect(resume.experience[0]?.company).toBe("Acme");
    expect(resume.experience[0]?.bullets.map((b) => b.text)).toEqual([
      "Built a TypeScript order service.",
      "Cut load time by 40%.",
      "Shipped v2",
    ]);
  });

  it("removes placeholders and empty items instead of keeping them", () => {
    const { resume } = normalizeParsedResume(
      raw({
        basics: { fullName: "Alex", phone: "N/A", location: "unknown", headline: "", links: [] },
        experience: [
          {
            company: "Acme",
            title: "Engineer",
            location: "None",
            bullets: ["", "  ", "Real bullet"],
          },
        ],
      }),
    );
    expect(resume.basics).toEqual({ fullName: "Alex", links: [] }); // optional fields absent
    expect(resume.experience[0]).not.toHaveProperty("location");
    expect(resume.experience[0]?.bullets.map((b) => b.text)).toEqual(["Real bullet"]);
  });

  it("drops entries missing a required field and counts them", () => {
    const { resume, stats } = normalizeParsedResume(
      raw({
        education: [{ institution: " ", details: [] }],
        projects: [{ name: "", bullets: [], technologies: [] }],
        certifications: [{ name: "N/A" }],
        additionalSections: [{ title: "Awards", items: [] }],
      }),
    );
    expect(resume.education).toEqual([]);
    expect(resume.projects).toEqual([]);
    expect(resume.certifications).toEqual([]);
    expect(resume.additionalSections).toEqual([]);
    expect(stats.droppedEntries).toBe(4);
  });
});

describe("normalizeParsedResume: fixes for known small-model mistakes (Known Issue #8)", () => {
  it("recovers skills placed in `category` with empty items into one Skills group", () => {
    const { resume, stats } = normalizeParsedResume(
      raw({
        skills: [
          { category: "TypeScript", items: [] },
          { category: "React", items: [] },
          { category: "AWS", items: [] },
        ],
      }),
    );
    expect(resume.skills).toEqual([
      { id: "skill_1", category: "Skills", items: ["TypeScript", "React", "AWS"] },
    ]);
    expect(stats.recoveredSkills).toBe(3);
  });

  it("merges recovered skills into an existing Skills group and removes duplicates", () => {
    const { resume } = normalizeParsedResume(
      raw({
        skills: [
          { category: "Skills", items: ["SQL", "Python", "sql"] },
          { category: "Tableau", items: [] },
          { category: "python", items: [] },
        ],
      }),
    );
    expect(resume.skills).toEqual([
      { id: "skill_1", category: "Skills", items: ["SQL", "Python", "Tableau"] },
    ]);
  });

  it("takes the email from the document text when the model left it out", () => {
    const { resume, stats } = normalizeParsedResume(raw(), {
      sourceText: "Alex Example\nSenior Software Engineer · alex@example.com · Springfield",
    });
    expect(resume.basics.email).toBe("alex@example.com");
    expect(stats.emailFromText).toBe(true);
  });

  it("keeps the model's email when present, and never invents one without document text", () => {
    expect(
      normalizeParsedResume(raw({ basics: { fullName: "A", email: "a@x.io", links: [] } }), {
        sourceText: "b@y.io",
      }).resume.basics.email,
    ).toBe("a@x.io");
    expect(normalizeParsedResume(raw()).resume.basics).not.toHaveProperty("email");
    expect(
      normalizeParsedResume(raw(), { sourceText: "no email here" }).resume.basics,
    ).not.toHaveProperty("email");
  });

  it("moves a degree line from details into degree", () => {
    const { resume, stats } = normalizeParsedResume(
      raw({
        education: [
          { institution: "State University", details: ["B.Sc. Computer Science", "Dean's list"] },
        ],
      }),
    );
    expect(resume.education[0]).toMatchObject({
      degree: "B.Sc. Computer Science",
      details: [{ id: "edu_1_d1", text: "Dean's list" }],
    });
    expect(stats.degreesFromDetails).toBe(1);
  });

  it("does not move ordinary detail lines or overwrite an existing degree", () => {
    const { resume } = normalizeParsedResume(
      raw({
        education: [
          { institution: "A", details: ["Graduated with honors"] },
          { institution: "B", degree: "MBA", details: ["Bachelor thesis prize"] },
        ],
      }),
    );
    expect(resume.education[0]).not.toHaveProperty("degree");
    expect(resume.education[1]).toMatchObject({
      degree: "MBA",
      details: [{ text: "Bachelor thesis prize" }],
    });
  });

  it("keeps a single date as the end date when the model copied it into both fields", () => {
    const { resume, stats } = normalizeParsedResume(
      raw({
        education: [{ institution: "State U", startDate: "2018", endDate: "2018", details: [] }],
        experience: [
          { company: "Acme", title: "Dev", startDate: "2019", endDate: "2021", bullets: [] },
        ],
      }),
    );
    expect(resume.education[0]).toMatchObject({ endDate: "2018" });
    expect(resume.education[0]).not.toHaveProperty("startDate");
    expect(resume.experience[0]).toMatchObject({ startDate: "2019", endDate: "2021" });
    expect(stats.duplicateDatesRemoved).toBe(1);
  });

  it("keeps real links and drops emails and non-URLs posing as links", () => {
    const { resume } = normalizeParsedResume(
      raw({
        basics: {
          fullName: "Alex",
          links: [
            { label: "GitHub", url: "github.com/alex" },
            { label: "LinkedIn", url: "https://linkedin.com/in/alex" },
            { label: "Site", url: "www.alex.dev" },
            { label: "Email", url: "alex@example.com" },
            { label: "Email", url: "mailto:alex@example.com" },
            { label: "Location", url: "Springfield" },
          ],
        },
      }),
    );
    expect(resume.basics.links.map((l) => l.url)).toEqual([
      "github.com/alex",
      "https://linkedin.com/in/alex",
      "www.alex.dev",
    ]);
  });
});

describe("normalizeParsedResume: never invents content", () => {
  it("every output string comes from the model output or the document text", () => {
    const input = raw({
      basics: {
        fullName: "Alex",
        headline: "Dev",
        links: [{ label: "GitHub", url: "github.com/a" }],
      },
      experience: [
        {
          company: "Acme",
          title: "Engineer",
          startDate: "2020",
          endDate: "Present",
          bullets: ["• Did X"],
        },
      ],
      skills: [
        { category: "Skills", items: ["TS"] },
        { category: "React", items: [] },
      ],
    });
    const source = "contact: alex@x.io";
    const { resume } = normalizeParsedResume(input, { sourceText: source });
    const allowed = JSON.stringify(input) + source + "Skills";
    const strings = JSON.stringify(resume).match(/"(?:[^"\\]|\\.)*"/g) ?? [];
    for (const s of strings) {
      const value = JSON.parse(s) as string;
      if (/^(exp|edu|skill|proj|cert|add)_\d+(_[bd]\d+)?$/.test(value)) continue; // ids
      if (
        [
          "basics",
          "fullName",
          "headline",
          "links",
          "label",
          "url",
          "email",
          "experience",
          "id",
          "company",
          "title",
          "startDate",
          "endDate",
          "bullets",
          "text",
          "education",
          "skills",
          "category",
          "items",
          "projects",
          "certifications",
          "additionalSections",
        ].includes(value)
      )
        continue; // keys
      expect(allowed).toContain(value);
    }
  });
});

describe("looksLikeResume", () => {
  it("needs a name and at least one real section", () => {
    const base = normalizeParsedResume(raw()).resume;
    expect(looksLikeResume(base)).toBe(false); // name only
    expect(
      looksLikeResume({ ...base, skills: [{ id: "skill_1", category: "Skills", items: ["TS"] }] }),
    ).toBe(true);
    expect(
      looksLikeResume({
        ...base,
        basics: { ...base.basics, fullName: "" },
        skills: [{ id: "skill_1", category: "Skills", items: ["TS"] }],
      }),
    ).toBe(false);
  });
});
