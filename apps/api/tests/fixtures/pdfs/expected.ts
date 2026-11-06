import type { Resume } from "@tailorcv/shared";

/**
 * What a perfect parse of each synthetic resume PDF contains (taken from generate.ts).
 * Used by `npm run parse:pdf` to score real model output and by tests.
 */
export interface ExpectedResume {
  fullName: string;
  email: string;
  headline: string;
  location: string;
  experience: Array<{
    company: string;
    title: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }>;
  education: Array<{ institution: string; degree: string }>;
  skills: string[];
  projects: string[];
  certifications: string[];
}

const alexExperience: ExpectedResume["experience"] = [
  {
    company: "Acme Widgets Inc.",
    title: "Senior Software Engineer",
    startDate: "2021",
    endDate: "Present",
    bullets: [
      "Built a TypeScript order service handling 2M requests per day.",
      "Cut page load time by 40% by moving rendering to the edge.",
    ],
  },
  {
    company: "Globex Corp",
    title: "Software Engineer",
    startDate: "2018",
    endDate: "2021",
    bullets: ["Maintained React dashboards used by 300 internal analysts."],
  },
];
const alex = {
  fullName: "Alex Example",
  email: "alex@example.com",
  headline: "Senior Software Engineer",
  location: "Springfield",
  experience: alexExperience,
  education: [{ institution: "State University", degree: "B.Sc." }],
  skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "Docker"],
};

export const EXPECTED: Record<string, ExpectedResume> = {
  "resume-1page.pdf": { ...alex, projects: [], certifications: [] },
  "resume-2page.pdf": {
    ...alex,
    projects: ["Open-source CSV toolkit"],
    certifications: ["Example Cloud Practitioner"],
  },
  "resume-2column.pdf": {
    fullName: "Sam Sample",
    email: "sam@example.com",
    headline: "Data Analyst",
    location: "Shelbyville",
    experience: [
      {
        company: "Initech",
        title: "Data Analyst",
        startDate: "2022",
        endDate: "Present",
        bullets: [
          "Automated weekly KPI reports, saving 6 hours per week.",
          "Built churn dashboards for the sales team.",
        ],
      },
    ],
    education: [{ institution: "City College", degree: "B.A." }],
    skills: ["SQL", "Python", "Tableau"],
    projects: [],
    certifications: [],
  },
};

export interface ScoreCheck {
  check: string;
  ok: boolean;
  detail?: string;
}

const norm = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
const has = (actual: string | undefined, expected: string) => norm(actual).includes(norm(expected));

/** Compares a parsed resume with the expected values. "Invented" checks catch fabrication. */
export function scoreParse(resume: Resume, expected: ExpectedResume): ScoreCheck[] {
  const checks: ScoreCheck[] = [];
  const add = (check: string, ok: boolean, detail?: string) =>
    checks.push({ check, ok, ...(detail && { detail }) });

  add("name", norm(resume.basics.fullName) === norm(expected.fullName), resume.basics.fullName);
  add(
    "email",
    norm(resume.basics.email) === norm(expected.email),
    resume.basics.email ?? "(missing)",
  );
  add(
    "headline",
    has(resume.basics.headline, expected.headline),
    resume.basics.headline ?? "(missing)",
  );
  add(
    "location",
    has(resume.basics.location, expected.location),
    resume.basics.location ?? "(missing)",
  );

  add(
    "experience count",
    resume.experience.length === expected.experience.length,
    String(resume.experience.length),
  );
  expected.experience.forEach((exp, i) => {
    const got = resume.experience[i];
    const label = `job ${i + 1} (${exp.company})`;
    add(
      `${label}: company + title`,
      norm(got?.company) === norm(exp.company) && norm(got?.title) === norm(exp.title),
      `${got?.company} / ${got?.title}`,
    );
    add(
      `${label}: dates`,
      has(got?.startDate, exp.startDate) && has(got?.endDate, exp.endDate),
      `${got?.startDate}–${got?.endDate}`,
    );
    const gotBullets = (got?.bullets ?? []).map((b) => norm(b.text));
    const verbatim = exp.bullets.filter((b) => gotBullets.includes(norm(b))).length;
    add(
      `${label}: bullets verbatim`,
      verbatim === exp.bullets.length,
      `${verbatim}/${exp.bullets.length}`,
    );
  });

  expected.education.forEach((edu) => {
    const got = resume.education.find((e) => has(e.institution, edu.institution));
    add(
      `education: ${edu.institution}`,
      !!got && has(got.degree, edu.degree),
      got ? `${got.degree ?? ""}` : "(missing)",
    );
  });

  const gotSkills = resume.skills.flatMap((g) => g.items.map(norm));
  const missing = expected.skills.filter((s) => !gotSkills.includes(norm(s)));
  add(
    "skills: all found",
    missing.length === 0,
    missing.length ? `missing ${missing.join(", ")}` : `${gotSkills.length} found`,
  );

  for (const p of expected.projects)
    add(
      `project: ${p}`,
      resume.projects.some((x) => has(x.name, p)),
    );
  for (const c of expected.certifications)
    add(
      `certification: ${c}`,
      resume.certifications.some((x) => has(x.name, c)),
    );

  // Fabrication checks: nothing that isn't in the document.
  const expectedSkills = expected.skills.map(norm);
  const extraSkills = gotSkills.filter((s) => !expectedSkills.includes(s));
  add("invented: no extra skills", extraSkills.length === 0, extraSkills.join(", ") || undefined);
  const expectedBullets = expected.experience.flatMap((e) => e.bullets.map(norm));
  const extraBullets = resume.experience
    .flatMap((e) => e.bullets.map((b) => norm(b.text)))
    .filter((b) => !expectedBullets.includes(b));
  add(
    "invented: no extra bullets",
    extraBullets.length === 0,
    extraBullets.length ? `${extraBullets.length} extra` : undefined,
  );
  add("invented: no extra jobs", resume.experience.length <= expected.experience.length);
  add(
    "invented: no links (the PDFs have none)",
    resume.basics.links.length === 0,
    resume.basics.links.map((l) => l.url).join(", ") || undefined,
  );
  const repeated = [...resume.experience, ...resume.education].filter(
    (e) => e.startDate && e.startDate === e.endDate,
  ).length;
  add(
    "invented: no repeated single dates",
    repeated === 0,
    repeated ? `${repeated} entries` : undefined,
  );
  add(
    "invented: no extra projects/certs",
    resume.projects.length <= expected.projects.length &&
      resume.certifications.length <= expected.certifications.length,
  );

  return checks;
}
