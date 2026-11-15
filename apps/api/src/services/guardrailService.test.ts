import { describe, expect, it } from "vitest";
import {
  applyResumeAdditions,
  EMPTY_RESUME_ADDITIONS,
  findDuplicateResumeIds,
  ResumeSchema,
  type Resume,
} from "@tailorcv/shared";
import {
  sampleResumeNewGrad,
  sampleResumeSwe,
  sampleTailorResultSweFrontend,
} from "@tailorcv/shared/fixtures";
import { applyGuardrails } from "./guardrailService";

/*
 * Every "tailored" resume below is a handcrafted BAD model output: the synthetic fixture resume
 * with one dishonest edit. The guardrails must undo the edit and say so.
 */

const original = sampleResumeSwe;

/** A deep copy of the original that a test then edits, like a model would. */
function tailoredWith(edit: (resume: Resume) => void, base: Resume = original): Resume {
  const copy = structuredClone(base);
  edit(copy);
  return copy;
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/** Finds an item by id or fails the test (keeps the tests free of `!`). */
function byId<T extends { id: string }>(items: T[], id: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`test setup: no item with id ${id}`);
  return item;
}

const NO_FINDINGS = {
  lockedFieldsRestored: 0,
  entriesDropped: 0,
  entriesRestored: 0,
  itemsDropped: 0,
  skillsRemoved: 0,
  textsRestored: 0,
};

describe("applyGuardrails: honest output passes untouched", () => {
  it("returns an unchanged resume with no warnings when nothing was tailored", () => {
    const result = applyGuardrails(original, structuredClone(original));
    expect(result.resume).toEqual(original);
    expect(result.warnings).toEqual([]);
    expect(result.stats).toEqual(NO_FINDINGS);
  });

  it("accepts a valid rewording, reordering and trimming (the hand-written honest fixture)", () => {
    const honest = sampleTailorResultSweFrontend.tailoredResume;
    const result = applyGuardrails(original, honest);
    expect(result.resume).toEqual(honest);
    expect(result.warnings).toEqual([]);
    expect(result.stats).toEqual(NO_FINDINGS);
  });

  it("allows removing bullet points, details, projects and extra sections", () => {
    const tailored = tailoredWith((r) => {
      byId(r.experience, "exp_1").bullets.splice(1, 2);
      byId(r.education, "edu_1").details = [];
      r.projects = [];
      r.additionalSections = [];
    });
    const result = applyGuardrails(original, tailored);
    expect(result.resume).toEqual(tailored);
    expect(result.warnings).toEqual([]);
  });

  it("allows regrouping, reordering and dropping skills that the resume already has", () => {
    const tailored = tailoredWith((r) => {
      r.skills = [
        { id: "skill_1", category: "Frontend", items: ["React", "TypeScript", "Redux", "CSS"] },
        { id: "skill_9", category: "Testing", items: ["Cypress", "Jest"] },
      ];
    });
    const result = applyGuardrails(original, tailored);
    expect(result.resume.skills).toEqual(tailored.skills);
    expect(result.warnings).toEqual([]);
  });

  it("allows a skill that the resume mentions only in a bullet point, in any letter case", () => {
    // "jQuery" appears in exp_3_b1 and "IndexedDB" only as a project technology.
    const tailored = tailoredWith((r) => {
      byId(r.skills, "skill_2").items.push("jquery", "IndexedDB", "REST API");
    });
    const result = applyGuardrails(original, tailored);
    expect(byId(result.resume.skills, "skill_2").items).toEqual(
      expect.arrayContaining(["jquery", "IndexedDB", "REST API"]),
    );
    expect(result.warnings).toEqual([]);
  });

  it("allows a new headline (it is not a locked field)", () => {
    const tailored = tailoredWith((r) => {
      r.basics.headline = "Senior Frontend Engineer";
    });
    const result = applyGuardrails(original, tailored);
    expect(result.resume.basics.headline).toBe("Senior Frontend Engineer");
    expect(result.warnings).toEqual([]);
  });

  it("works on a sparse resume with empty sections and missing optional fields", () => {
    const result = applyGuardrails(sampleResumeNewGrad, structuredClone(sampleResumeNewGrad));
    expect(result.resume).toEqual(sampleResumeNewGrad);
    expect(result.warnings).toEqual([]);
  });
});

describe("applyGuardrails: locked fields are restored", () => {
  it.each([
    ["company", "Brightpath Analytics", "Google"],
    ["title", "Senior Frontend Engineer", "Staff Frontend Engineer"],
    ["location", "Austin, TX", "San Francisco, CA"],
    ["startDate", "Mar 2022", "Jan 2020"],
    ["endDate", "Present", "Dec 2025"],
  ] as const)("restores a changed experience %s and warns", (field, before, after) => {
    const tailored = tailoredWith((r) => {
      byId(r.experience, "exp_1")[field] = after;
    });
    const result = applyGuardrails(original, tailored);

    expect(byId(result.resume.experience, "exp_1")[field]).toBe(before);
    expect(result.resume).toEqual(original);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Senior Frontend Engineer at Brightpath Analytics");
    expect(result.stats.lockedFieldsRestored).toBe(1);
  });

  it.each([
    ["institution", "University of North Texas", "Massachusetts Institute of Technology"],
    ["degree", "B.S.", "M.S."],
    ["field", "Computer Science", "Artificial Intelligence"],
    ["startDate", "2014", "2015"],
    ["endDate", "2018", "2020"],
  ] as const)("restores a changed education %s and warns", (field, before, after) => {
    const tailored = tailoredWith((r) => {
      byId(r.education, "edu_1")[field] = after;
    });
    const result = applyGuardrails(original, tailored);

    expect(byId(result.resume.education, "edu_1")[field]).toBe(before);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("University of North Texas");
    expect(result.stats.lockedFieldsRestored).toBe(1);
  });

  it.each([
    ["name", "AWS Certified Cloud Practitioner", "AWS Certified Solutions Architect"],
    ["issuer", "Amazon Web Services", "Google Cloud"],
    ["date", "2021", "2025"],
  ] as const)("restores a changed certification %s and warns", (field, before, after) => {
    const tailored = tailoredWith((r) => {
      byId(r.certifications, "cert_1")[field] = after;
    });
    const result = applyGuardrails(original, tailored);

    expect(byId(result.resume.certifications, "cert_1")[field]).toBe(before);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("AWS Certified Cloud Practitioner");
  });

  it("removes a locked value the model invented where the resume has none", () => {
    // The new-grad internship has no location; the model must not supply one.
    const tailored = tailoredWith((r) => {
      byId(r.experience, "exp_1").location = "Seattle, WA";
    }, sampleResumeNewGrad);
    const result = applyGuardrails(sampleResumeNewGrad, tailored);

    expect(byId(result.resume.experience, "exp_1")).not.toHaveProperty("location");
    expect(result.resume).toEqual(sampleResumeNewGrad);
    expect(result.warnings).toHaveLength(1);
  });

  it("puts back a locked value the model deleted", () => {
    const tailored = tailoredWith((r) => {
      delete byId(r.experience, "exp_2").startDate;
    });
    const result = applyGuardrails(original, tailored);

    expect(byId(result.resume.experience, "exp_2").startDate).toBe("Jun 2019");
    expect(result.warnings).toHaveLength(1);
  });

  it("restores quietly when only spacing or letter case changed", () => {
    const tailored = tailoredWith((r) => {
      byId(r.experience, "exp_1").company = "  BRIGHTPATH   analytics ";
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume).toEqual(original);
    expect(result.warnings).toEqual([]);
    expect(result.stats.lockedFieldsRestored).toBe(0);
  });

  it("reports several changed fields of one entry in a single warning", () => {
    const tailored = tailoredWith((r) => {
      const job = byId(r.experience, "exp_1");
      job.title = "Engineering Manager";
      job.startDate = "Jan 2018";
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume).toEqual(original);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/job title and start date/);
    expect(result.stats.lockedFieldsRestored).toBe(2);
  });

  it("restores the name, contact details and links", () => {
    const tailored = tailoredWith((r) => {
      r.basics.fullName = "Alexander Rivera, PhD";
      r.basics.email = "someone.else@example.com";
      r.basics.phone = "(555) 010-0000";
      r.basics.location = "New York, NY";
      r.basics.links = [{ label: "LinkedIn", url: "linkedin.com/in/someone-else" }];
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume.basics).toEqual(original.basics);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/name, email, phone, location and links/);
    expect(result.stats.lockedFieldsRestored).toBe(5);
  });

  it("restores a renamed project and its link", () => {
    const tailored = tailoredWith((r) => {
      const project = byId(r.projects, "proj_1");
      project.name = "OpenRecipes Enterprise";
      project.url = "https://openrecipes.example.com";
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume.projects).toEqual(original.projects);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("OpenRecipes");
  });

  it("restores the title of an extra section", () => {
    const tailored = tailoredWith((r) => {
      byId(r.additionalSections, "add_1").title = "Fluent Languages";
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume.additionalSections).toEqual(original.additionalSections);
    expect(result.warnings).toHaveLength(1);
  });
});

describe("applyGuardrails: no new or missing entries", () => {
  it("drops a new experience entry and warns", () => {
    const tailored = tailoredWith((r) => {
      r.experience.unshift({
        id: "exp_4",
        company: "Northwind Health",
        title: "Lead Engineer",
        startDate: "2024",
        endDate: "Present",
        bullets: [{ id: "exp_4_b1", text: "Led the design system team." }],
      });
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume).toEqual(original);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Lead Engineer at Northwind Health");
    expect(result.stats.entriesDropped).toBe(1);
  });

  it("drops a new education entry and warns", () => {
    const tailored = tailoredWith((r) => {
      r.education.push({
        id: "edu_2",
        institution: "Stanford University",
        degree: "M.S.",
        details: [],
      });
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume.education).toEqual(original.education);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Stanford University");
    expect(result.stats.entriesDropped).toBe(1);
  });

  it("drops a new certification and warns", () => {
    const tailored = tailoredWith((r) => {
      r.certifications.push({ id: "cert_2", name: "Certified Kubernetes Administrator" });
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume.certifications).toEqual(original.certifications);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Certified Kubernetes Administrator");
  });

  it("drops a new project and a new extra section and warns about each", () => {
    const tailored = tailoredWith((r) => {
      r.projects.push({
        id: "proj_2",
        name: "Design System Starter",
        bullets: [],
        technologies: ["React"],
      });
      r.additionalSections.push({ id: "add_2", title: "Awards", items: ["Engineer of the Year"] });
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume).toEqual(original);
    expect(result.warnings).toHaveLength(2);
    expect(result.stats.entriesDropped).toBe(2);
  });

  it("drops a second entry that reuses an existing id (a job split in two)", () => {
    const tailored = tailoredWith((r) => {
      r.experience.push({ ...structuredClone(byId(r.experience, "exp_1")), bullets: [] });
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume).toEqual(original);
    expect(result.warnings).toHaveLength(1);
    expect(result.stats.entriesDropped).toBe(1);
    expect(findDuplicateResumeIds(result.resume)).toEqual([]);
  });

  it("puts back a job, a school or a certification the model left out, in the original order", () => {
    const tailored = tailoredWith((r) => {
      r.experience = r.experience.filter((job) => job.id !== "exp_2");
      r.education = [];
      r.certifications = [];
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume).toEqual(original);
    expect(result.warnings).toHaveLength(3);
    expect(result.warnings.join("\n")).toContain("Software Engineer at Lumen Retail Co.");
    expect(result.stats.entriesRestored).toBe(3);
  });

  it("keeps jobs in the original order when the model reorders them (no warning)", () => {
    const tailored = tailoredWith((r) => {
      r.experience.reverse();
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume.experience.map((job) => job.id)).toEqual(["exp_1", "exp_2", "exp_3"]);
    expect(result.warnings).toEqual([]);
  });

  it("lets the model reorder projects and extra sections", () => {
    const twoProjects = tailoredWith((r) => {
      r.projects.push({ id: "proj_2", name: "Trail Notes", bullets: [], technologies: [] });
    });
    const tailored = tailoredWith((r) => {
      r.projects.reverse();
    }, twoProjects);
    const result = applyGuardrails(twoProjects, tailored);

    expect(result.resume.projects.map((project) => project.id)).toEqual(["proj_2", "proj_1"]);
    expect(result.warnings).toEqual([]);
  });
});

describe("applyGuardrails: bullet points", () => {
  it("trims bullet points the model added beyond the original and warns", () => {
    const tailored = tailoredWith((r) => {
      byId(r.experience, "exp_3").bullets.push(
        { id: "exp_3_b3", text: "Managed a team of designers." },
        { id: "exp_3_b4", text: "Won the agency's innovation award." },
      );
    });
    const result = applyGuardrails(original, tailored);
    const job = byId(result.resume.experience, "exp_3");

    expect(job.bullets).toEqual(byId(original.experience, "exp_3").bullets);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Junior Web Developer at Cedar Street Agency");
    expect(result.warnings[0]).toMatch(/2 bullet points/);
    expect(result.stats.itemsDropped).toBe(2);
  });

  it("never returns more bullet points than the original, even when ids are reused", () => {
    const tailored = tailoredWith((r) => {
      const job = byId(r.experience, "exp_3");
      job.bullets.push({ id: "exp_3_b1", text: "Built marketing websites with HTML and CSS." });
    });
    const result = applyGuardrails(original, tailored);
    const job = byId(result.resume.experience, "exp_3");

    expect(job.bullets).toHaveLength(2);
    expect(job.bullets.map((bullet) => bullet.id)).toEqual(["exp_3_b1", "exp_3_b2"]);
    expect(result.warnings).toHaveLength(1);
  });

  it("drops a bullet point moved in from another job", () => {
    const tailored = tailoredWith((r) => {
      const moved = byId(r.experience, "exp_2").bullets.pop();
      if (moved) byId(r.experience, "exp_1").bullets.push(moved);
    });
    const result = applyGuardrails(original, tailored);

    expect(
      byId(result.resume.experience, "exp_1").bullets.map((bullet) => bullet.id),
    ).not.toContain("exp_2_b3");
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/1 bullet point\b/);
  });

  it("drops added education details and project bullet points", () => {
    const tailored = tailoredWith((r) => {
      byId(r.education, "edu_1").details.push({
        id: "edu_1_d2",
        text: "Graduated summa cum laude.",
      });
      byId(r.projects, "proj_1").bullets.push({
        id: "proj_1_b3",
        text: "Featured on Hacker News.",
      });
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume).toEqual(original);
    expect(result.warnings).toHaveLength(2);
    expect(result.stats.itemsDropped).toBe(2);
  });

  it("treats a blanked bullet point as removed (no empty lines in the result)", () => {
    const tailored = tailoredWith((r) => {
      byId(byId(r.experience, "exp_1").bullets, "exp_1_b2").text = "   ";
    });
    const result = applyGuardrails(original, tailored);

    expect(byId(result.resume.experience, "exp_1").bullets.map((bullet) => bullet.id)).toEqual([
      "exp_1_b1",
      "exp_1_b3",
      "exp_1_b4",
      "exp_1_b5",
    ]);
    expect(result.warnings).toEqual([]);
  });
});

describe("applyGuardrails: skills", () => {
  it("removes a skill that is nowhere in the original resume and warns", () => {
    const tailored = tailoredWith((r) => {
      byId(r.skills, "skill_2").items.push("GraphQL");
      byId(r.skills, "skill_3").items.unshift("Terraform");
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume.skills).toEqual(original.skills);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings.join("\n")).toContain("GraphQL");
    expect(result.warnings.join("\n")).toContain("Terraform");
    expect(result.stats.skillsRemoved).toBe(2);
  });

  it("does not accept a skill because it is part of a longer word", () => {
    // "Java" is inside "JavaScript", "Angular" inside "AngularJS", "C" is a letter of many words.
    const tailored = tailoredWith((r) => {
      byId(r.skills, "skill_1").items.push("Java", "Angular", "C", "C++");
    });
    const result = applyGuardrails(original, tailored);

    expect(byId(result.resume.skills, "skill_1").items).toEqual(
      byId(original.skills, "skill_1").items,
    );
    expect(result.stats.skillsRemoved).toBe(4);
  });

  it("drops a skill group that ends up empty", () => {
    const tailored = tailoredWith((r) => {
      r.skills.push({ id: "skill_4", category: "Cloud", items: ["Kubernetes", "Terraform", " "] });
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume.skills).toEqual(original.skills);
    expect(result.stats.skillsRemoved).toBe(2);
  });

  it("merges skill groups that share an id, so ids stay unique", () => {
    const tailored = tailoredWith((r) => {
      r.skills = [
        { id: "skill_1", category: "Languages", items: ["TypeScript"] },
        { id: "skill_1", category: "More languages", items: ["JavaScript", "typescript"] },
      ];
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume.skills).toEqual([
      { id: "skill_1", category: "Languages", items: ["TypeScript", "JavaScript"] },
    ]);
    expect(findDuplicateResumeIds(result.resume)).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("keeps a skill the user added on the review page (it is part of the submitted resume)", () => {
    const submitted = applyResumeAdditions(original, {
      ...EMPTY_RESUME_ADDITIONS,
      skills: ["Docker"],
    });
    const tailored = tailoredWith((r) => {
      // The model moves the user's skill into an existing group and tries to add one of its own.
      r.skills = r.skills.filter((group) => !group.items.includes("Docker"));
      byId(r.skills, "skill_3").items.push("Docker", "Kubernetes");
    }, submitted);
    const result = applyGuardrails(submitted, tailored);

    expect(byId(result.resume.skills, "skill_3").items).toContain("Docker");
    expect(byId(result.resume.skills, "skill_3").items).not.toContain("Kubernetes");
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Kubernetes");
  });

  it("removes a project technology that is not in the original resume", () => {
    const tailored = tailoredWith((r) => {
      byId(r.projects, "proj_1").technologies.push("GraphQL");
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume.projects).toEqual(original.projects);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("GraphQL");
  });

  it("removes an item added to an extra section (a language the resume does not list)", () => {
    const tailored = tailoredWith((r) => {
      byId(r.additionalSections, "add_1").items = ["spanish", "French", "English"];
    });
    const result = applyGuardrails(original, tailored);

    expect(byId(result.resume.additionalSections, "add_1").items).toEqual(["spanish", "English"]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("French");
  });
});

describe("applyGuardrails: numbers in reworded text", () => {
  it("keeps the original bullet point when the rewording adds a number the resume never states", () => {
    const tailored = tailoredWith((r) => {
      byId(byId(r.experience, "exp_2").bullets, "exp_2_b2").text =
        "Wrote REST API endpoints in Node.js and Express serving 2 million requests a day.";
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume).toEqual(original);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Software Engineer at Lumen Retail Co.");
    expect(result.stats.textsRestored).toBe(1);
  });

  it("allows a rewording that reuses numbers found anywhere in the resume", () => {
    const text = "Raised the Lighthouse performance score to 91 (from 54) across 4 teams' pages.";
    const tailored = tailoredWith((r) => {
      byId(byId(r.experience, "exp_1").bullets, "exp_1_b5").text = text;
    });
    const result = applyGuardrails(original, tailored);

    expect(byId(byId(result.resume.experience, "exp_1").bullets, "exp_1_b5").text).toBe(text);
    expect(result.warnings).toEqual([]);
  });

  it("reads 5,000 and 5000 as the same number", () => {
    const text = "Analyzed survey data for 5000 respondents with Python and pandas.";
    const tailored = tailoredWith((r) => {
      byId(byId(r.experience, "exp_1").bullets, "exp_1_b1").text = text;
    }, sampleResumeNewGrad);
    const result = applyGuardrails(sampleResumeNewGrad, tailored);

    expect(result.warnings).toEqual([]);
    expect(byId(byId(result.resume.experience, "exp_1").bullets, "exp_1_b1").text).toBe(text);
  });

  it("keeps the original summary when the new one adds a number", () => {
    const tailored = tailoredWith((r) => {
      r.basics.summary = "Frontend engineer with 10 years of experience leading teams of 25.";
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume.basics.summary).toBe(original.basics.summary);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/summary/i);
  });

  it("drops an invented number from a resume that had no summary at all", () => {
    const tailored = tailoredWith((r) => {
      r.basics.summary = "Economics graduate with 3 years of analytics experience.";
    }, sampleResumeNewGrad);
    const result = applyGuardrails(sampleResumeNewGrad, tailored);

    expect(result.resume.basics).not.toHaveProperty("summary");
    expect(result.warnings).toHaveLength(1);
  });

  it("allows a new summary without new numbers on a resume that had none", () => {
    const summary = "Economics graduate with hands-on Python, SQL and Tableau experience.";
    const tailored = tailoredWith((r) => {
      r.basics.summary = summary;
    }, sampleResumeNewGrad);
    const result = applyGuardrails(sampleResumeNewGrad, tailored);

    expect(result.resume.basics.summary).toBe(summary);
    expect(result.warnings).toEqual([]);
  });

  it("checks headlines, education details, project descriptions and project bullet points too", () => {
    const tailored = tailoredWith((r) => {
      r.basics.headline = "Frontend Engineer with 12 years of experience";
      byId(byId(r.education, "edu_1").details, "edu_1_d1").text =
        "Senior project used by 9,000 students.";
      byId(r.projects, "proj_1").description = "Recipe sharing app with 50k monthly users.";
      byId(byId(r.projects, "proj_1").bullets, "proj_1_b2").text = "Reached 15k GitHub stars.";
    });
    const result = applyGuardrails(original, tailored);

    expect(result.resume).toEqual(original);
    expect(result.warnings).toHaveLength(4);
    expect(result.stats.textsRestored).toBe(4);
  });
});

describe("applyGuardrails: job keywords in reworded text", () => {
  const jobKeywords = ["React", "GraphQL", "Storybook", "design systems", "Cypress"];
  const rewordBullet = (text: string) =>
    tailoredWith((r) => {
      byId(byId(r.experience, "exp_2").bullets, "exp_2_b2").text = text;
    });

  it("keeps the original bullet point when the rewording claims a keyword the resume lacks", () => {
    const tailored = rewordBullet("Wrote GraphQL and REST API endpoints in Node.js and Express.");
    const result = applyGuardrails(original, tailored, { jobKeywords });

    expect(result.resume).toEqual(original);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("GraphQL");
    expect(result.warnings[0]).toContain("Software Engineer at Lumen Retail Co.");
    expect(result.stats.textsRestored).toBe(1);
  });

  it("recognizes the keyword in another spelling (plural, letter case)", () => {
    const tailored = rewordBullet("Wrote REST API endpoints for the DESIGN SYSTEM team.");
    const result = applyGuardrails(original, tailored, { jobKeywords });

    expect(result.resume).toEqual(original);
    expect(result.warnings[0]).toContain("design systems");
  });

  it("allows a keyword the resume already covers, anywhere in the resume", () => {
    // React and Cypress are in the resume, though not in this bullet point.
    const text =
      "Wrote REST API endpoints in Node.js for the React storefront, tested with Cypress.";
    const result = applyGuardrails(original, rewordBullet(text), { jobKeywords });

    expect(byId(byId(result.resume.experience, "exp_2").bullets, "exp_2_b2").text).toBe(text);
    expect(result.warnings).toEqual([]);
  });

  it("allows a job keyword made of words the resume already uses, in any form", () => {
    // The resume has "Frontend Engineer", "Lighthouse performance score" and "accessible",
    // but not the phrases "frontend performance" or "accessibility".
    const keywords = ["frontend performance", "accessibility", "GraphQL"];
    const text = "Wrote REST API endpoints, improving frontend performance and accessibility.";
    const result = applyGuardrails(original, rewordBullet(text), { jobKeywords: keywords });

    expect(byId(byId(result.resume.experience, "exp_2").bullets, "exp_2_b2").text).toBe(text);
    expect(result.warnings).toEqual([]);
  });

  it("still blocks a keyword when one of its words is new to the resume", () => {
    // "frontend" is in the resume; "architecture" is not.
    const result = applyGuardrails(
      original,
      rewordBullet("Wrote REST API endpoints and owned the frontend architecture."),
      { jobKeywords: ["frontend architecture"] },
    );
    expect(result.resume).toEqual(original);
    expect(result.warnings[0]).toContain("frontend architecture");
  });

  it("does not treat a short word as a form of a longer one (Java / JavaScript)", () => {
    const result = applyGuardrails(original, rewordBullet("Wrote Java REST API endpoints."), {
      jobKeywords: ["Java"],
    });
    expect(result.resume).toEqual(original);
    expect(result.warnings).toHaveLength(1);
  });

  it("checks the summary and headline too", () => {
    const tailored = tailoredWith((r) => {
      r.basics.headline = "Frontend Engineer (React, Storybook)";
      r.basics.summary = "Frontend engineer experienced with GraphQL.";
    });
    const result = applyGuardrails(original, tailored, { jobKeywords });

    expect(result.resume.basics).toEqual(original.basics);
    expect(result.warnings).toHaveLength(2);
  });

  it("reports a new number first when a rewording has both problems", () => {
    const tailored = rewordBullet("Wrote 40 GraphQL endpoints in Node.js and Express.");
    const result = applyGuardrails(original, tailored, { jobKeywords });

    expect(result.resume).toEqual(original);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/number/);
  });

  it("does nothing without job keywords (the check needs the job)", () => {
    const tailored = rewordBullet("Wrote GraphQL and REST API endpoints in Node.js and Express.");
    expect(applyGuardrails(original, tailored).warnings).toEqual([]);
    expect(applyGuardrails(original, tailored, { jobKeywords: [] }).warnings).toEqual([]);
  });
});

describe("applyGuardrails: general guarantees", () => {
  /** One model output that breaks every rule at once. */
  const everythingWrong = tailoredWith((r) => {
    r.basics.email = "other@example.com";
    r.basics.summary = "Engineer with 15 years of experience.";
    const job = byId(r.experience, "exp_1");
    job.company = "Google";
    job.bullets.push({ id: "exp_1_b9", text: "Invented a new framework." });
    r.experience.push({ id: "exp_9", company: "Meta", title: "Director", bullets: [] });
    r.education = [];
    r.certifications.push({ id: "cert_9", name: "PMP" });
    byId(r.skills, "skill_1").items.push("Rust");
    byId(r.projects, "proj_1").technologies.push("Kafka");
  });

  it("returns a schema-valid resume with unique ids and only original facts", () => {
    const result = applyGuardrails(original, everythingWrong);

    expect(ResumeSchema.safeParse(result.resume).success).toBe(true);
    expect(findDuplicateResumeIds(result.resume)).toEqual([]);
    expect(result.resume).toEqual(original);
    expect(result.warnings.length).toBeGreaterThanOrEqual(8);
    expect(new Set(result.warnings).size).toBe(result.warnings.length);
  });

  it("does not modify its inputs", () => {
    const frozenOriginal = deepFreeze(structuredClone(original));
    const frozenTailored = deepFreeze(structuredClone(everythingWrong));
    expect(() => applyGuardrails(frozenOriginal, frozenTailored)).not.toThrow();
  });

  it("is deterministic and settles after one pass (its own output passes clean)", () => {
    const first = applyGuardrails(original, everythingWrong);
    expect(applyGuardrails(original, everythingWrong)).toEqual(first);

    const second = applyGuardrails(original, first.resume);
    expect(second.resume).toEqual(first.resume);
    expect(second.warnings).toEqual([]);
  });

  it("counts findings without putting resume text in the stats (safe to log)", () => {
    const { stats } = applyGuardrails(original, everythingWrong);

    expect(stats).toEqual({
      lockedFieldsRestored: 2,
      entriesDropped: 2,
      entriesRestored: 1,
      itemsDropped: 1,
      skillsRemoved: 2,
      textsRestored: 1,
    });
    expect(Object.values(stats).every((value) => typeof value === "number")).toBe(true);
  });
});
