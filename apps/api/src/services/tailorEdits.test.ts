import { describe, expect, it } from "vitest";
import { ChangeSchema, ResumeSchema, findDuplicateResumeIds, type Resume } from "@tailorcv/shared";
import { sampleResumeNewGrad, sampleResumeSwe } from "@tailorcv/shared/fixtures";
import { applyTailorEdits, describeChanges } from "./tailorEdits";

const original = sampleResumeSwe;
const NO_EDITS = { bullets: [], removedBulletIds: [] };
const bulletIds = (resume: Resume, jobId: string) =>
  resume.experience.find((job) => job.id === jobId)?.bullets.map((bullet) => bullet.id);
const bulletText = (resume: Resume, id: string) =>
  [...resume.experience, ...resume.projects]
    .flatMap((entry) => entry.bullets)
    .find((bullet) => bullet.id === id)?.text;

describe("applyTailorEdits", () => {
  it("returns the original resume when there are no edits and no keywords", () => {
    const { resume, stats } = applyTailorEdits(original, NO_EDITS, []);
    expect(resume).toEqual(original);
    expect(stats).toEqual({
      bulletsReworded: 0,
      bulletsCorrected: 0,
      bulletsRemoved: 0,
      editsIgnored: 0,
      skillsReordered: 0,
    });
  });

  it("replaces the headline and summary, and keeps them when the edit is missing or blank", () => {
    const edited = applyTailorEdits(
      original,
      { ...NO_EDITS, headline: " Senior  Frontend Engineer ", summary: "New summary." },
      [],
    ).resume;
    expect(edited.basics.headline).toBe("Senior Frontend Engineer");
    expect(edited.basics.summary).toBe("New summary.");

    const blank = applyTailorEdits(original, { ...NO_EDITS, headline: "  ", summary: "" }, []);
    expect(blank.resume.basics).toEqual(original.basics);
  });

  it("can give a summary to a resume that has none", () => {
    const { resume } = applyTailorEdits(sampleResumeNewGrad, { ...NO_EDITS, summary: "S." }, []);
    expect(resume.basics.summary).toBe("S.");
    expect(resume.basics).not.toHaveProperty("headline");
  });

  it("rewords bullets by id, in jobs and in projects, and records the reasons", () => {
    const { resume, reasons, stats } = applyTailorEdits(
      original,
      {
        ...NO_EDITS,
        bullets: [
          { id: "exp_2_b3", text: "Automated end-to-end tests with Cypress.", reason: " Testing " },
          { id: "proj_1_b1", text: "Built offline support with service workers.", reason: "" },
        ],
      },
      [],
    );
    expect(bulletText(resume, "exp_2_b3")).toBe("Automated end-to-end tests with Cypress.");
    expect(bulletText(resume, "proj_1_b1")).toBe("Built offline support with service workers.");
    expect(bulletText(resume, "exp_2_b1")).toBe(bulletText(original, "exp_2_b1"));
    expect([...reasons]).toEqual([["exp_2_b3", "Testing"]]);
    expect(stats.bulletsReworded).toBe(2);
  });

  it("orders each job's bullets as the model listed them; bullets it left out follow, unchanged", () => {
    const { resume } = applyTailorEdits(
      original,
      {
        ...NO_EDITS,
        bullets: [
          { id: "exp_1_b5", text: "Raised the Lighthouse score from 54 to 91.", reason: "r" },
          { id: "exp_2_b2", text: "Wrote REST API endpoints in Node.js.", reason: "r" },
          { id: "exp_1_b3", text: "Introduced a shared component library.", reason: "r" },
        ],
      },
      [],
    );
    expect(bulletIds(resume, "exp_1")).toEqual([
      "exp_1_b5",
      "exp_1_b3",
      "exp_1_b1",
      "exp_1_b2",
      "exp_1_b4",
    ]);
    expect(bulletIds(resume, "exp_2")).toEqual(["exp_2_b2", "exp_2_b1", "exp_2_b3"]);
    expect(bulletIds(resume, "exp_3")).toEqual(["exp_3_b1", "exp_3_b2"]);
  });

  it("ignores edits for ids that are not in the resume, repeated ids and blank text", () => {
    const { resume, stats } = applyTailorEdits(
      original,
      {
        bullets: [
          { id: "exp_9_b1", text: "Led a team of 40.", reason: "r" },
          { id: "exp_1", text: "Not a bullet id.", reason: "r" },
          { id: "exp_3_b1", text: "Built marketing websites.", reason: "r" },
          { id: "exp_3_b1", text: "A second version.", reason: "r" },
          { id: "exp_3_b2", text: "   ", reason: "r" },
        ],
        removedBulletIds: ["nope"],
      },
      [],
    );
    expect(bulletText(resume, "exp_3_b1")).toBe("Built marketing websites.");
    expect(bulletText(resume, "exp_3_b2")).toBe(bulletText(original, "exp_3_b2"));
    expect(resume.experience).toHaveLength(3);
    expect(stats).toMatchObject({ bulletsReworded: 1, editsIgnored: 5 });
  });

  it("accepts an id written with its brackets, as shown in the prompt", () => {
    const { resume } = applyTailorEdits(
      original,
      {
        bullets: [{ id: "[exp_3_b2]", text: "Gathered client requirements.", reason: "r" }],
        removedBulletIds: ["[exp_1_b2]"],
      },
      [],
    );
    expect(bulletText(resume, "exp_3_b2")).toBe("Gathered client requirements.");
    expect(bulletIds(resume, "exp_1")).not.toContain("exp_1_b2");
  });

  it("removes the bullets the model marked, but never every bullet of a job", () => {
    const { resume, stats } = applyTailorEdits(
      original,
      { bullets: [], removedBulletIds: ["exp_1_b2", "exp_1_b4", "exp_3_b1", "exp_3_b2"] },
      [],
    );
    expect(bulletIds(resume, "exp_1")).toEqual(["exp_1_b1", "exp_1_b3", "exp_1_b5"]);
    expect(bulletIds(resume, "exp_3")).toEqual(["exp_3_b1", "exp_3_b2"]);
    expect(stats.bulletsRemoved).toBe(2);
  });

  it("moves the skills the job asks for to the front of each group", () => {
    const { resume, stats } = applyTailorEdits(original, NO_EDITS, [
      "Cypress",
      "CSS",
      "JS",
      "REST APIs with Node",
      "GraphQL",
    ]);
    expect(resume.skills.map((group) => group.items)).toEqual([
      ["JavaScript", "CSS", "TypeScript", "HTML"],
      ["Node.js", "React", "Redux", "Express", "AngularJS"],
      ["Cypress", "Git", "Webpack", "Vite", "Jest"],
    ]);
    expect(stats.skillsReordered).toBe(3);
  });

  it("never touches locked content, never adds anything, and does not modify its input", () => {
    const frozen = structuredClone(original);
    const { resume } = applyTailorEdits(
      frozen,
      {
        headline: "H",
        summary: "S",
        bullets: [{ id: "exp_1_b1", text: "Reworded.", reason: "r" }],
        removedBulletIds: ["exp_2_b1"],
      },
      ["React"],
    );
    expect(frozen).toEqual(original);
    expect(ResumeSchema.safeParse(resume).success).toBe(true);
    expect(findDuplicateResumeIds(resume)).toEqual([]);
    const facts = (r: Resume) => ({
      contact: { ...r.basics, headline: "", summary: "" },
      jobs: r.experience.map(({ bullets: _bullets, ...job }) => job),
      education: r.education,
      certifications: r.certifications,
      skills: r.skills.flatMap((group) => group.items).sort(),
    });
    expect(facts(resume)).toEqual(facts(original));
  });
});

describe("describeChanges", () => {
  it("lists nothing when the resume is unchanged", () => {
    expect(describeChanges(original, structuredClone(original))).toEqual([]);
  });

  it("describes every real difference, in document order, with the model's reasons", () => {
    const { resume, reasons } = applyTailorEdits(
      original,
      {
        headline: "Senior Frontend Engineer",
        summary: "Frontend engineer focused on React.",
        bullets: [
          {
            id: "exp_1_b3",
            text: "Introduced a shared React component library.",
            reason: "Design system",
          },
          { id: "proj_1_b1", text: "Built offline support.", reason: "" },
        ],
        removedBulletIds: ["exp_2_b2"],
      },
      ["Jest"],
    );
    const changes = describeChanges(original, resume, reasons);

    expect(changes.map((c) => [c.section, c.type, c.targetId])).toEqual([
      ["summary", "reworded", undefined],
      ["summary", "reworded", undefined],
      ["experience", "reordered", "exp_1"],
      ["experience", "reworded", "exp_1_b3"],
      ["experience", "removed", "exp_2_b2"],
      ["skills", "reordered", "skill_3"],
      ["projects", "reworded", "proj_1_b1"],
    ]);
    expect(changes[0]).toMatchObject({
      before: "Frontend Engineer",
      after: "Senior Frontend Engineer",
    });
    expect(changes[3]).toEqual({
      section: "experience",
      targetId: "exp_1_b3",
      type: "reworded",
      before: "Introduced a shared component library, reducing duplicated UI code across 4 teams.",
      after: "Introduced a shared React component library.",
      reason: "Design system",
    });
    expect(changes[4]).toMatchObject({
      before: "Wrote REST API endpoints in Node.js and Express for order history.",
    });
    expect(changes[6]?.reason).toMatch(/reworded/i); // no reason from the model → a default
    for (const change of changes) expect(ChangeSchema.safeParse(change).success).toBe(true);
  });

  it("describes a new summary on a resume that had none (no `before`)", () => {
    const { resume } = applyTailorEdits(sampleResumeNewGrad, { ...NO_EDITS, summary: "S." }, []);
    expect(describeChanges(sampleResumeNewGrad, resume)).toEqual([
      { section: "summary", type: "reworded", after: "S.", reason: expect.any(String) },
    ]);
  });

  it("describes changed education details", () => {
    const final = structuredClone(original);
    const school = final.education[0];
    if (school?.details[0]) school.details[0].text = "Senior project: accessible campus map.";
    expect(describeChanges(original, final)).toMatchObject([
      { section: "education", type: "reworded", targetId: "edu_1_d1" },
    ]);
  });

  describe("the model's reason is shown only when it is a reason (D-105)", () => {
    const BEFORE =
      "Introduced a shared component library, reducing duplicated UI code across 4 teams.";
    const AFTER = "Introduced a shared React component library used across 4 teams.";
    const reasonFor = (reason: string, text = AFTER) => {
      const { resume, reasons } = applyTailorEdits(
        original,
        { ...NO_EDITS, bullets: [{ id: "exp_1_b3", text, reason }] },
        [],
      );
      return describeChanges(original, resume, reasons).find((c) => c.targetId === "exp_1_b3")
        ?.reason;
    };

    it("keeps a short reason, like the ones Claude writes", () => {
      const reason = "Matches the requirement to maintain a component library / design system.";
      expect(reasonFor(reason)).toBe(reason);
    });

    it.each([
      ["a copy of the new text", AFTER],
      [
        "a copy of the new text, in other letter case and punctuation",
        AFTER.toUpperCase().replace(".", ""),
      ],
      ["a copy of the original text", BEFORE],
      ["the new text with more words", `${AFTER} This serves the job.`],
      ["longer than 30 words", Array.from({ length: 31 }, () => "word").join(" ")],
    ])("uses the default reason when it is %s", (_, reason) => {
      expect(reasonFor(reason)).toBe("Reworded to match the job description.");
    });
  });

  describe("a change of only spelling case, punctuation or spacing is a correction (D-105)", () => {
    const BEFORE = "Optimized Seo strategies for 10+ client websites.";
    const withBullet = (text: string) => {
      const base = structuredClone(original);
      const bullet = base.experience[0]?.bullets[0];
      if (bullet) bullet.text = BEFORE;
      const { resume, reasons, stats } = applyTailorEdits(
        base,
        { ...NO_EDITS, bullets: [{ id: bullet?.id ?? "", text, reason: text }] },
        [],
      );
      return { stats, change: describeChanges(base, resume, reasons)[0] };
    };

    it.each([
      "Optimized SEO strategies for 10+ client websites.",
      "Optimized SEO strategies, for 10+ client-websites",
      "Optimized  seo strategies for 10+ client websites.",
    ])("lists %s as a correction, with its own reason, and counts it apart", (text) => {
      const { stats, change } = withBullet(text);
      expect(change).toMatchObject({
        type: "reworded",
        before: BEFORE,
        after: text.replace(/\s+/g, " "),
        reason: "Fixed spelling, capitalization or punctuation.",
      });
      expect(stats).toMatchObject({ bulletsReworded: 0, bulletsCorrected: 1 });
    });

    it("still counts a change of words as a rewrite", () => {
      const { stats, change } = withBullet("Optimized SEO for 10+ client websites.");
      expect(change?.reason).toBe("Reworded to match the job description.");
      expect(stats).toMatchObject({ bulletsReworded: 1, bulletsCorrected: 0 });
    });
  });

  it("only reports what is in the final resume: an edit the guardrails undid is not listed", () => {
    // The model reworded a bullet, then the guardrails restored it: final === original there.
    const { reasons } = applyTailorEdits(
      original,
      { ...NO_EDITS, bullets: [{ id: "exp_1_b1", text: "Led 40 engineers.", reason: "r" }] },
      [],
    );
    expect(describeChanges(original, structuredClone(original), reasons)).toEqual([]);
  });
});
