import { describe, expect, it } from "vitest";
import { KeywordAnalysisSchema, type Resume } from "@tailorcv/shared";
import {
  jdDataAnalyst,
  jdFrontendEngineer,
  jdProductManager,
  sampleResumeNewGrad,
  sampleResumeSwe,
  sampleTailorResultSweFrontend,
} from "@tailorcv/shared/fixtures";
import { analyzeKeywords, keywordsFoundIn, normalizeForMatching } from "./keywordService";

/** A small resume whose only free text is `text` (one bullet point) plus the given skills. */
function resumeWith(text: string, skills: string[] = []): Resume {
  return {
    basics: { fullName: "Sam Example", links: [] },
    experience: [
      { id: "exp_1", company: "Acme", title: "Engineer", bullets: [{ id: "exp_1_b1", text }] },
    ],
    education: [],
    skills: skills.length > 0 ? [{ id: "skill_1", category: "Skills", items: skills }] : [],
    projects: [],
    certifications: [],
    additionalSections: [],
  };
}

const matches = (keyword: string, resume: Resume) =>
  analyzeKeywords([keyword], resume).matched.length === 1;

describe("analyzeKeywords: fixture job descriptions", () => {
  it("frontend JD vs the tailored frontend resume: the hand-written expected analysis", () => {
    // Keywords as a model would list them for jdFrontendEngineer, most important first.
    const keywords = [
      "React",
      "GraphQL",
      "TypeScript",
      "Storybook",
      "HTML",
      "CSS",
      "WCAG",
      "Jest",
      "Cypress",
      "performance",
      "healthcare",
      "mentor",
    ];
    keywords.forEach((keyword) =>
      expect(jdFrontendEngineer.toLowerCase()).toContain(keyword.toLowerCase()),
    );

    const analysis = analyzeKeywords(keywords, sampleTailorResultSweFrontend.tailoredResume);
    expect(analysis).toEqual(sampleTailorResultSweFrontend.keywordAnalysis);
  });

  it("data analyst JD vs the new-grad resume: partial match", () => {
    const keywords = [
      "SQL",
      "Python",
      "pandas",
      "Tableau",
      "Power BI",
      "dashboards",
      "A/B test",
      "Statistics",
      "Economics",
      "R",
    ];
    keywords.forEach((keyword) => expect(jdDataAnalyst).toContain(keyword));

    expect(analyzeKeywords(keywords, sampleResumeNewGrad)).toEqual({
      matched: ["SQL", "Python", "pandas", "Tableau", "dashboards", "Statistics", "Economics"],
      missing: ["Power BI", "A/B test", "R"],
      matchScore: 70,
    });
  });

  it("product manager JD vs the frontend resume: nothing matches, score 0", () => {
    const keywords = [
      "product roadmap",
      "PRDs",
      "agile",
      "PCI DSS",
      "KYC",
      "KPIs",
      "Amplitude",
      "MBA",
    ];
    keywords.forEach((keyword) => expect(jdProductManager).toContain(keyword));

    expect(analyzeKeywords(keywords, sampleResumeSwe)).toEqual({
      matched: [],
      missing: keywords,
      matchScore: 0,
    });
  });
});

describe("analyzeKeywords: normalization", () => {
  it("ignores letter case", () => {
    expect(matches("TYPESCRIPT", resumeWith("Built apps in TypeScript."))).toBe(true);
    expect(matches("typescript", resumeWith("", ["TypeScript"]))).toBe(true);
  });

  it("ignores punctuation around words", () => {
    const resume = resumeWith("Stack: (React), Redux; Jest/Cypress - and Node.js.");
    for (const keyword of ["React", "Redux", "Jest", "Cypress", "Node.js"]) {
      expect(matches(keyword, resume)).toBe(true);
    }
  });

  it("treats hyphens and slashes as spaces", () => {
    expect(matches("end to end tests", resumeWith("Added end-to-end tests."))).toBe(true);
    expect(matches("CI/CD", resumeWith("Set up CI / CD pipelines."))).toBe(true);
    expect(matches("high-performance", resumeWith("Built high performance UIs."))).toBe(true);
  });

  it("matches simple plurals both ways", () => {
    expect(matches("dashboards", resumeWith("Built a sales dashboard."))).toBe(true);
    expect(matches("dashboard", resumeWith("Built sales dashboards."))).toBe(true);
    expect(matches("REST APIs", resumeWith("Wrote REST API endpoints."))).toBe(true);
    expect(matches("SQL query", resumeWith("Tuned slow SQL queries."))).toBe(true);
  });

  it("matches verb forms both ways", () => {
    expect(matches("mentor", resumeWith("Mentored 3 junior engineers."))).toBe(true);
    expect(matches("mentoring", resumeWith("Mentor for new hires."))).toBe(true);
    expect(matches("testing", resumeWith("Tested checkout flows."))).toBe(true);
    expect(matches("automated tests", resumeWith("Wrote automated testing tools."))).toBe(true);
    expect(matches("caching", resumeWith("Added a Redis cache."))).toBe(true);
    expect(matches("data analysis", resumeWith("Analyzed data."))).toBe(false); // not the same form
  });

  it("does not turn short or non-plural words into something else", () => {
    // "css", "aws", "js" and "express" end in "s" but are not plurals.
    const resume = resumeWith("Styled with CSS on AWS using Express.");
    expect(matches("CSS", resume)).toBe(true);
    expect(matches("AWS", resume)).toBe(true);
    expect(matches("Express", resume)).toBe(true);
    expect(matches("CS", resume)).toBe(false);
    expect(matches("AW", resume)).toBe(false);
  });

  it.each([
    ["JS", "Wrote JavaScript for the storefront."],
    ["JavaScript", "Wrote JS for the storefront."],
    ["TS", "Migrated the app to TypeScript."],
    ["Node", "Built services in Node.js."],
    ["NodeJS", "Built services in Node."],
    ["React.js", "Built the UI in React."],
    ["Kubernetes", "Deployed to k8s clusters."],
    ["K8s", "Deployed to Kubernetes."],
    ["Postgres", "Tuned PostgreSQL indexes."],
    ["AWS", "Ran workloads on Amazon Web Services."],
    ["Amazon Web Services", "Ran workloads on AWS."],
    ["machine learning", "Shipped ML models."],
    ["UX", "Improved the user experience of checkout."],
    [".NET", "Maintained dotnet services."],
    ["Power BI", "Built PowerBI reports."],
    ["RESTful APIs", "Designed REST APIs."],
    ["accessibility", "Led a11y audits."],
  ])("alias: %s is found in %j", (keyword, text) => {
    expect(matches(keyword, resumeWith(text))).toBe(true);
  });

  it("does not match part of a longer word", () => {
    expect(matches("Java", resumeWith("Wrote JavaScript daily."))).toBe(false);
    expect(matches("Angular", resumeWith("Maintained AngularJS apps."))).toBe(false);
    expect(matches("R", resumeWith("Used React and Redux."))).toBe(false);
  });

  it("keeps C, C++ and C# apart", () => {
    const resume = resumeWith("Wrote C++ and C# services.");
    expect(matches("C++", resume)).toBe(true);
    expect(matches("C#", resume)).toBe(true);
    expect(matches("CSharp", resume)).toBe(true);
    expect(matches("C", resume)).toBe(false);
  });

  it("matches a phrase only when its words are next to each other, in order", () => {
    expect(matches("React Native", resumeWith("Built React Native apps."))).toBe(true);
    expect(matches("React Native", resumeWith("Built React apps and native modules."))).toBe(false);
    expect(matches("Native React", resumeWith("Built React Native apps."))).toBe(false);
  });

  it("does not match a phrase across two separate resume fields", () => {
    // Two skills next to each other in the list are still two separate fields.
    const resume = resumeWith("Shipped features.", ["Graphic design", "Systems thinking"]);
    expect(matches("design systems", resume)).toBe(false);
    expect(matches("Graphic design", resume)).toBe(true);
  });

  it("searches every part of the resume", () => {
    const resume = sampleResumeSwe;
    expect(matches("Frontend Engineer", resume)).toBe(true); // headline / job title
    expect(matches("IndexedDB", resume)).toBe(true); // project technology
    expect(matches("Computer Science", resume)).toBe(true); // education field
    expect(matches("Cloud Practitioner", resume)).toBe(true); // certification
    expect(matches("Spanish", resume)).toBe(true); // extra section
  });
});

describe("analyzeKeywords: result", () => {
  it("keeps the given spelling and order, split into matched and missing", () => {
    const analysis = analyzeKeywords(
      ["  GraphQL ", "react", "Design   Systems", "TypeScript"],
      resumeWith("Built a design system in React and TypeScript."),
    );
    expect(analysis).toEqual({
      matched: ["react", "Design Systems", "TypeScript"],
      missing: ["GraphQL"],
      matchScore: 75,
    });
  });

  it("counts a keyword once, even when it is repeated in another spelling", () => {
    const analysis = analyzeKeywords(
      ["JavaScript", "JS", "javascript", "Dashboards", "dashboard", "GraphQL", "graphql "],
      resumeWith("Built dashboards in JavaScript."),
    );
    expect(analysis).toEqual({
      matched: ["JavaScript", "Dashboards"],
      missing: ["GraphQL"],
      matchScore: 67,
    });
  });

  it("drops blank keywords and ones made only of punctuation", () => {
    const analysis = analyzeKeywords(["", "   ", "—", "React"], resumeWith("React."));
    expect(analysis).toEqual({ matched: ["React"], missing: [], matchScore: 100 });
  });

  it("returns score 0 when there are no keywords", () => {
    expect(analyzeKeywords([], sampleResumeSwe)).toEqual({
      matched: [],
      missing: [],
      matchScore: 0,
    });
  });

  it.each([
    [1, 3, 33],
    [2, 3, 67],
    [1, 8, 13],
    [199, 200, 100],
  ])("rounds the score: %i of %i → %i", (hit, total, score) => {
    const keywords = Array.from({ length: total }, (_, i) => (i < hit ? `have${i}x` : `lack${i}x`));
    const resume = resumeWith(keywords.slice(0, hit).join(" | "));
    expect(analyzeKeywords(keywords, resume).matchScore).toBe(score);
  });

  it("always returns a valid KeywordAnalysis and does not modify its inputs", () => {
    const keywords = Object.freeze(["React", "GraphQL"]) as string[];
    const resume = structuredClone(sampleResumeSwe);
    const analysis = analyzeKeywords(keywords, resume);

    expect(KeywordAnalysisSchema.safeParse(analysis).success).toBe(true);
    expect(resume).toEqual(sampleResumeSwe);
    expect(analyzeKeywords(keywords, resume)).toEqual(analysis);
  });
});

describe("normalizeForMatching", () => {
  it.each([
    ["  React.JS,  Node.js & TypeScript! ", "react node.js typescript"],
    ["REST APIs", "rest api"],
    ["CI/CD pipelines", "ci cd pipelin"],
    ["Mentored, mentoring, mentors", "mentor mentor mentor"],
    ["cache caching cached", "cach cach cach"],
    ["string need speed CSS", "string need speed css"],
    ["C++, C# and .NET", "c++ c# and .net"],
    ["5+ years", "5+ year"],
    ["ＳＱＬ queries", "sql query"],
    ["", ""],
  ])("%j → %j", (input, expected) => {
    expect(normalizeForMatching(input)).toBe(expected);
  });
});

describe("keywordsFoundIn (only keywords the job description really contains, D-104)", () => {
  const job = `Software Engineer. Design, build, and scale user-facing financial technology products.
    Proficiency with full-stack development using technologies like React.js, Node.js, and TypeScript.
    Experience with AI coding tools. Work with databases like MySQL or PostgreSQL, in C++ or Java.`;

  it("keeps keywords written in the text, in any letter case or word form", () => {
    expect(
      keywordsFoundIn(["React.js", "typescript", "AI coding tools", "full-stack development"], job),
    ).toEqual(["React.js", "typescript", "AI coding tools", "full-stack development"]);
  });

  it("keeps a keyword whose words are all in the text, even when not next to each other", () => {
    expect(keywordsFoundIn(["user-facing products", "financial products"], job)).toEqual([
      "user-facing products",
      "financial products",
    ]);
  });

  it("keeps a keyword written with a known alias", () => {
    expect(keywordsFoundIn(["React", "Postgres", "artificial intelligence"], job)).toEqual([
      "React",
      "Postgres",
      "artificial intelligence",
    ]);
  });

  it("drops keywords the text never mentions (a model listing the resume's own skills)", () => {
    expect(
      keywordsFoundIn(["R Studio", "Cyber Security", "Flask", "Jira", "S3", "VS Code"], job),
    ).toEqual([]);
  });

  it("drops a keyword when one of its words is missing, and whole words only", () => {
    expect(keywordsFoundIn(["React Native", "JavaScript", "SQL", "C"], job)).toEqual([]);
    expect(keywordsFoundIn(["Java", "C++", "MySQL"], job)).toEqual(["Java", "C++", "MySQL"]);
  });

  it("drops blanks", () => {
    expect(keywordsFoundIn(["", "  ", "React.js"], job)).toEqual(["React.js"]);
  });
});
