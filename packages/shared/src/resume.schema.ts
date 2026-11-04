import { z } from "zod";

/**
 * Resume data model (Tech Design §5.1).
 *
 * Used for:
 *  - the /parse response and the /tailor request + response (API contract)
 *  - the shape Claude returns via structured outputs (Days 8 and 13)
 *
 * Design rules:
 *  - Text fields are LENIENT on purpose (plain strings, no email/url format checks):
 *    values come from messy real-world PDFs, and a slightly odd email must not fail a parse.
 *  - Dates are FREE TEXT exactly as written in the resume ("Jan 2021", "2019", "Present").
 *  - Every list item that tailoring can change has a stable `id` (e.g. "exp_1", "exp_1_b2")
 *    so the change list and guardrails can refer to it. IDs are assigned by the server.
 *  - No recursive structures (Claude structured outputs does not support them).
 *  - 🔒 fields are LOCKED during tailoring: see LOCKED_FIELDS below.
 */

const IdSchema = z.string().min(1).describe('Stable id assigned by the server, e.g. "exp_1_b2"');

/** A piece of free text with a stable id (bullets, education details). */
export const TextItemSchema = z.object({
  id: IdSchema,
  text: z.string(),
});

export const LinkSchema = z.object({
  label: z.string().describe('e.g. "LinkedIn", "GitHub", "Portfolio"'),
  url: z.string().describe("As written in the resume; may lack https://"),
});

export const BasicsSchema = z.object({
  fullName: z.string().min(1),
  headline: z.string().optional().describe('e.g. "Senior Frontend Engineer"'),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(LinkSchema),
  summary: z.string().optional(),
});

export const ExperienceSchema = z.object({
  id: IdSchema,
  company: z.string().min(1), // 🔒
  title: z.string().min(1), // 🔒
  location: z.string().optional(), // 🔒
  startDate: z.string().optional(), // 🔒 optional: some resumes omit dates
  endDate: z.string().optional(), // 🔒 "Present" allowed
  bullets: z.array(TextItemSchema), // ✏️ may be reworded / reordered / trimmed
});

export const EducationSchema = z.object({
  id: IdSchema,
  institution: z.string().min(1), // 🔒
  degree: z.string().optional(), // 🔒
  field: z.string().optional(), // 🔒
  startDate: z.string().optional(), // 🔒
  endDate: z.string().optional(), // 🔒
  details: z.array(TextItemSchema), // ✏️
});

export const SkillGroupSchema = z.object({
  id: IdSchema,
  category: z.string().describe('e.g. "Languages", "Frameworks"; "Skills" if ungrouped'),
  items: z.array(z.string()), // ✏️ reorder / regroup only; never add new skills
});

export const ProjectSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  url: z.string().optional(),
  description: z.string().optional(), // ✏️
  bullets: z.array(TextItemSchema), // ✏️
  technologies: z.array(z.string()), // ✏️ reorder only
});

export const CertificationSchema = z.object({
  id: IdSchema,
  name: z.string().min(1), // 🔒
  issuer: z.string().optional(), // 🔒
  date: z.string().optional(), // 🔒
});

/** Anything else: languages, awards, volunteering, publications… */
export const AdditionalSectionSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  items: z.array(z.string()),
});

export const ResumeSchema = z.object({
  basics: BasicsSchema,
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  skills: z.array(SkillGroupSchema),
  projects: z.array(ProjectSchema),
  certifications: z.array(CertificationSchema),
  additionalSections: z.array(AdditionalSectionSchema),
});

export type TextItem = z.infer<typeof TextItemSchema>;
export type Link = z.infer<typeof LinkSchema>;
export type Basics = z.infer<typeof BasicsSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type SkillGroup = z.infer<typeof SkillGroupSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Certification = z.infer<typeof CertificationSchema>;
export type AdditionalSection = z.infer<typeof AdditionalSectionSchema>;
export type Resume = z.infer<typeof ResumeSchema>;

/**
 * 🔒 Fields that must be IDENTICAL in a tailored resume (matched by item `id`).
 * Enforced deterministically by the API's guardrailService (Day 12, ADR-006).
 * Entries in these sections may also never be added.
 */
export const LOCKED_FIELDS = {
  experience: ["company", "title", "location", "startDate", "endDate"],
  education: ["institution", "degree", "field", "startDate", "endDate"],
  certifications: ["name", "issuer", "date"],
} as const satisfies {
  experience: readonly (keyof Experience)[];
  education: readonly (keyof Education)[];
  certifications: readonly (keyof Certification)[];
};
