import type { TailorResult } from "../tailor.schema";
import { sampleResumeSwe } from "./resumes";

/*
 * Hand-written example of an HONEST tailoring of sampleResumeSwe for jdFrontendEngineer.
 * Used by tests (and later by FakeLlmClient / UI tests) as a known-good TailorResult.
 * Note what it does NOT do: no new skills (GraphQL, Storybook stay "missing"),
 * and locked fields (company, title, dates…) are unchanged.
 */

const [exp1, exp2, exp3] = sampleResumeSwe.experience;
if (!exp1 || !exp2 || !exp3) throw new Error("sampleResumeSwe fixture changed shape");

export const sampleTailorResultSweFrontend: TailorResult = {
  tailoredResume: {
    ...sampleResumeSwe,
    basics: {
      ...sampleResumeSwe.basics,
      headline: "Senior Frontend Engineer",
      summary:
        "Frontend engineer with 6 years of experience building accessible, high-performance web applications with React and TypeScript. Built a shared component library used across 4 teams and mentors junior engineers.",
    },
    experience: [
      {
        ...exp1,
        bullets: [
          {
            id: "exp_1_b3",
            text: "Introduced a shared React component library, reducing duplicated UI code across 4 teams.",
          },
          {
            id: "exp_1_b1",
            text: "Led migration of the customer dashboard from AngularJS to React and TypeScript.",
          },
          {
            id: "exp_1_b5",
            text: "Improved frontend performance, raising the Lighthouse score from 54 to 91.",
          },
          {
            id: "exp_1_b4",
            text: "Mentored 3 junior engineers and led weekly frontend guild meetings.",
          },
          {
            id: "exp_1_b2",
            text: "Built internal dashboards used by 200+ employees for sales reporting.",
          },
        ],
      },
      exp2,
      exp3,
    ],
  },
  changes: [
    {
      section: "summary",
      type: "reworded",
      before: sampleResumeSwe.basics.summary,
      after:
        "Frontend engineer with 6 years of experience building accessible, high-performance web applications with React and TypeScript. Built a shared component library used across 4 teams and mentors junior engineers.",
      reason: "Brings React, TypeScript, performance and mentoring forward, all core to this role.",
    },
    {
      section: "experience",
      targetId: "exp_1_b3",
      type: "reordered",
      reason:
        "Moved the component library bullet first because the role centers on a design system.",
    },
    {
      section: "experience",
      targetId: "exp_1_b5",
      type: "reworded",
      before: "Improved Lighthouse performance score from 54 to 91.",
      after: "Improved frontend performance, raising the Lighthouse score from 54 to 91.",
      reason: "Uses the job's wording ('frontend performance') while keeping the same facts.",
    },
  ],
  keywordAnalysis: {
    matched: ["React", "TypeScript", "HTML", "CSS", "Jest", "Cypress", "performance", "mentor"],
    missing: ["GraphQL", "Storybook", "WCAG", "healthcare"],
    matchScore: 67,
  },
  jobSummary: {
    title: "Senior Frontend Engineer",
    company: "Northwind Health",
    seniority: "Senior",
    topRequirements: ["React", "TypeScript", "Design systems", "Testing", "GraphQL"],
  },
  warnings: [],
};
