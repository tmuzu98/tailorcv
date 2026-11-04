import type { Resume } from "../resume.schema";

/*
 * SYNTHETIC test resumes. Every person, company, email and phone number here is fictional
 * (example.com emails, 555 phone numbers). Never replace these with real resumes.
 */

/** Mid/senior frontend engineer: rich resume with every section populated. */
export const sampleResumeSwe: Resume = {
  basics: {
    fullName: "Alex Rivera",
    headline: "Frontend Engineer",
    email: "alex.rivera@example.com",
    phone: "(555) 010-4477",
    location: "Austin, TX",
    links: [
      { label: "LinkedIn", url: "linkedin.com/in/alex-rivera-example" },
      { label: "GitHub", url: "https://github.com/alex-rivera-example" },
    ],
    summary:
      "Frontend engineer with 6 years of experience building web applications. Enjoys working across design and engineering to ship reliable products.",
  },
  experience: [
    {
      id: "exp_1",
      company: "Brightpath Analytics",
      title: "Senior Frontend Engineer",
      location: "Austin, TX",
      startDate: "Mar 2022",
      endDate: "Present",
      bullets: [
        {
          id: "exp_1_b1",
          text: "Led migration of the customer dashboard from AngularJS to React and TypeScript.",
        },
        {
          id: "exp_1_b2",
          text: "Built internal dashboards used by 200+ employees for sales reporting.",
        },
        {
          id: "exp_1_b3",
          text: "Introduced a shared component library, reducing duplicated UI code across 4 teams.",
        },
        {
          id: "exp_1_b4",
          text: "Mentored 3 junior engineers and ran weekly frontend guild meetings.",
        },
        { id: "exp_1_b5", text: "Improved Lighthouse performance score from 54 to 91." },
      ],
    },
    {
      id: "exp_2",
      company: "Lumen Retail Co.",
      title: "Software Engineer",
      location: "Remote",
      startDate: "Jun 2019",
      endDate: "Feb 2022",
      bullets: [
        {
          id: "exp_2_b1",
          text: "Developed checkout flow features in React, increasing conversion by 8%.",
        },
        {
          id: "exp_2_b2",
          text: "Wrote REST API endpoints in Node.js and Express for order history.",
        },
        {
          id: "exp_2_b3",
          text: "Added end-to-end tests with Cypress for critical purchase paths.",
        },
      ],
    },
    {
      id: "exp_3",
      company: "Cedar Street Agency",
      title: "Junior Web Developer",
      location: "Dallas, TX",
      startDate: "2018",
      endDate: "2019",
      bullets: [
        { id: "exp_3_b1", text: "Built marketing websites with HTML, CSS and jQuery." },
        { id: "exp_3_b2", text: "Worked directly with clients to gather requirements." },
      ],
    },
  ],
  education: [
    {
      id: "edu_1",
      institution: "University of North Texas",
      degree: "B.S.",
      field: "Computer Science",
      startDate: "2014",
      endDate: "2018",
      details: [{ id: "edu_1_d1", text: "Senior project: accessible campus map web app." }],
    },
  ],
  skills: [
    { id: "skill_1", category: "Languages", items: ["TypeScript", "JavaScript", "HTML", "CSS"] },
    {
      id: "skill_2",
      category: "Frameworks & Libraries",
      items: ["React", "Redux", "Node.js", "Express", "AngularJS"],
    },
    { id: "skill_3", category: "Tools", items: ["Git", "Webpack", "Vite", "Cypress", "Jest"] },
  ],
  projects: [
    {
      id: "proj_1",
      name: "OpenRecipes",
      url: "https://github.com/alex-rivera-example/openrecipes",
      description: "Open-source recipe sharing app.",
      bullets: [
        { id: "proj_1_b1", text: "Implemented offline support with service workers." },
        { id: "proj_1_b2", text: "Reached 1.2k GitHub stars." },
      ],
      technologies: ["React", "TypeScript", "IndexedDB"],
    },
  ],
  certifications: [
    {
      id: "cert_1",
      name: "AWS Certified Cloud Practitioner",
      issuer: "Amazon Web Services",
      date: "2021",
    },
  ],
  additionalSections: [{ id: "add_1", title: "Languages", items: ["English", "Spanish"] }],
};

/** New graduate: thin experience, projects-heavy, several empty/optional sections. */
export const sampleResumeNewGrad: Resume = {
  basics: {
    fullName: "Jordan Lee",
    email: "jordan.lee@example.com",
    location: "Seattle, WA",
    links: [{ label: "Portfolio", url: "jordanlee.example.com" }],
  },
  experience: [
    {
      id: "exp_1",
      company: "Harborview Data Lab",
      title: "Data Analyst Intern",
      startDate: "Jun 2025",
      endDate: "Aug 2025",
      bullets: [
        {
          id: "exp_1_b1",
          text: "Cleaned and analyzed survey data for 5,000 respondents using Python and pandas.",
        },
        { id: "exp_1_b2", text: "Created weekly Excel reports for the research team." },
      ],
    },
  ],
  education: [
    {
      id: "edu_1",
      institution: "Pacific Northwest University",
      degree: "B.A.",
      field: "Economics, minor in Statistics",
      endDate: "May 2026",
      details: [
        { id: "edu_1_d1", text: "GPA 3.7/4.0" },
        { id: "edu_1_d2", text: "Coursework: Econometrics, Regression Analysis, Databases" },
      ],
    },
  ],
  skills: [
    { id: "skill_1", category: "Skills", items: ["Python", "pandas", "SQL", "Excel", "Tableau"] },
  ],
  projects: [
    {
      id: "proj_1",
      name: "City Bike Usage Analysis",
      bullets: [
        {
          id: "proj_1_b1",
          text: "Analyzed 2 years of public bike-share trips with SQL to find peak usage patterns.",
        },
        { id: "proj_1_b2", text: "Built a Tableau dashboard to present findings to classmates." },
      ],
      technologies: ["SQL", "Tableau"],
    },
  ],
  certifications: [],
  additionalSections: [],
};
