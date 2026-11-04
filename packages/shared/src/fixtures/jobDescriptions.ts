/*
 * SYNTHETIC job descriptions for tests and evals. Companies are fictional.
 * Exported as strings (not .txt files) so every runtime (Vite, tsx, Vitest) can import them.
 */

/** Strong match for sampleResumeSwe, with a couple of gaps (GraphQL, Storybook). */
export const jdFrontendEngineer = `Senior Frontend Engineer at Northwind Health (Remote, US)

About the role
Northwind Health is hiring a Senior Frontend Engineer to build patient-facing web experiences.
You will own features end to end and help shape our design system.

What you'll do
- Build accessible, high-performance UIs with React and TypeScript
- Contribute to and maintain our component library / design system (Storybook)
- Work with GraphQL APIs alongside backend engineers
- Improve Core Web Vitals and overall frontend performance
- Mentor other engineers and lead technical discussions

Requirements
- 5+ years of professional frontend development experience
- Expert knowledge of React, TypeScript, HTML and CSS
- Experience with automated testing (Jest, Cypress or Playwright)
- Familiarity with GraphQL
- Strong communication skills

Nice to have
- Experience in healthcare or other regulated industries
- Accessibility (WCAG) expertise`;

/** Good match for sampleResumeNewGrad; partial for sampleResumeSwe. */
export const jdDataAnalyst = `Junior Data Analyst at Evergreen Outfitters (Seattle, WA, hybrid)

We are looking for a curious Junior Data Analyst to join our merchandising analytics team.

Responsibilities
- Write SQL queries to pull and combine data from our data warehouse
- Clean and analyze datasets with Python (pandas)
- Build and maintain Tableau or Power BI dashboards for business stakeholders
- Present insights clearly to non-technical audiences
- Support A/B test analysis

Qualifications
- Bachelor's degree in Statistics, Economics, Computer Science or a related field
- Solid SQL skills
- Experience with Python or R for data analysis
- Experience with a BI tool such as Tableau or Power BI
- Excellent attention to detail
- Internship experience in an analytics role is a plus`;

/** Weak match for both sample resumes: useful for "missing keywords" and honesty tests. */
export const jdProductManager = `Product Manager, Payments at Kestrel Financial (New York, NY)

Kestrel Financial is hiring a Product Manager to lead our consumer payments roadmap.

You will
- Own the product roadmap for card and bank payments
- Define requirements and write PRDs with engineering and design
- Run customer discovery interviews and analyze product metrics
- Prioritize the backlog and run agile ceremonies with the team
- Partner with compliance on PCI DSS and KYC requirements

You have
- 4+ years of product management experience, ideally in fintech or payments
- Experience defining KPIs and running experiments
- Strong stakeholder management and written communication
- Familiarity with SQL and analytics tools (Amplitude, Mixpanel)
- MBA preferred`;

export const sampleJobDescriptions = {
  frontendEngineer: jdFrontendEngineer,
  dataAnalyst: jdDataAnalyst,
  productManager: jdProductManager,
} as const;
