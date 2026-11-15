import { z } from "zod";
import { ResumeSchema } from "./resume.schema";
import { findDuplicateResumeIds } from "./resumeAdditions";

/** Tailoring contract (Tech Design §5.2, API spec §3). */

export const JOB_DESCRIPTION_MIN_CHARS = 100;
export const JOB_DESCRIPTION_MAX_CHARS = 15_000;
/**
 * Most text a resume in a tailor request may carry, all fields together. A dense 5-page resume
 * is about 20,000 characters. Without a cap, one request could send ~200 KB of text to the AI
 * (the JSON body limit), at many times the cost of a real resume.
 */
export const RESUME_MAX_TEXT_CHARS = 40_000;

/** Total length of every text value in the resume (ids, dates and links included). */
export function resumeTextLength(value: unknown): number {
  if (typeof value === "string") return value.length;
  if (Array.isArray(value)) return value.reduce<number>((sum, v) => sum + resumeTextLength(v), 0);
  if (typeof value === "object" && value !== null) return resumeTextLength(Object.values(value));
  return 0;
}

export const TONES = ["professional", "concise", "impactful"] as const;
export const ToneSchema = z.enum(TONES);

export const TailorOptionsSchema = z.object({
  tone: ToneSchema.default("professional"),
});

/** Body of POST /api/v1/resumes/tailor */
export const TailorRequestSchema = z.object({
  /**
   * The parsed resume, plus anything the user added on the review page (D-85). Because the
   * client can now create ids, they must be unique: the guardrails match items by id.
   * (The check lives here, not in ResumeSchema, which must stay plain for structured outputs.)
   */
  resume: ResumeSchema.superRefine((resume, ctx) => {
    const duplicates = findDuplicateResumeIds(resume);
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: `Resume item ids must be unique (duplicated: ${duplicates.slice(0, 5).join(", ")})`,
      });
    }
    if (resumeTextLength(resume) > RESUME_MAX_TEXT_CHARS) {
      ctx.addIssue({
        code: "custom",
        message: `Resume is too long: at most ${RESUME_MAX_TEXT_CHARS} characters of text`,
      });
    }
  }),
  jobDescription: z
    .string()
    .trim()
    .min(
      JOB_DESCRIPTION_MIN_CHARS,
      `Job description must be at least ${JOB_DESCRIPTION_MIN_CHARS} characters`,
    )
    .max(
      JOB_DESCRIPTION_MAX_CHARS,
      `Job description must be at most ${JOB_DESCRIPTION_MAX_CHARS} characters`,
    ),
  options: TailorOptionsSchema.optional(),
});

export const CHANGE_SECTIONS = [
  "summary",
  "experience",
  "skills",
  "projects",
  "education",
  "other",
] as const;
export const CHANGE_TYPES = ["reworded", "reordered", "removed", "emphasized"] as const;

/** One user-facing explanation of something the tailoring changed. */
export const ChangeSchema = z.object({
  section: z.enum(CHANGE_SECTIONS),
  targetId: z.string().optional().describe("Id of the changed item, e.g. a bullet id"),
  type: z.enum(CHANGE_TYPES),
  before: z.string().optional(),
  after: z.string().optional(),
  reason: z.string().min(1).describe("Short, user-facing explanation"),
});

/** Computed deterministically on the server (Day 13), never by the LLM. */
export const KeywordAnalysisSchema = z.object({
  matched: z.array(z.string()).describe("JD keywords present in the tailored resume"),
  missing: z.array(z.string()).describe("JD keywords not found in the resume"),
  matchScore: z.number().int().min(0).max(100),
  /** The same score for the resume as submitted, before tailoring. */
  matchScoreBefore: z.number().int().min(0).max(100).optional(),
});

export const JobSummarySchema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  seniority: z.string().optional(),
  topRequirements: z.array(z.string()),
});

export const TailorResultSchema = z.object({
  tailoredResume: ResumeSchema,
  changes: z.array(ChangeSchema),
  keywordAnalysis: KeywordAnalysisSchema,
  jobSummary: JobSummarySchema,
  warnings: z.array(z.string()).describe("Guardrail findings shown to the user"),
});

export type Tone = z.infer<typeof ToneSchema>;
export type TailorOptions = z.infer<typeof TailorOptionsSchema>;
/** What the client sends (options/tone may be omitted). */
export type TailorRequestInput = z.input<typeof TailorRequestSchema>;
/** What the server works with after validation (trimmed JD, defaults applied). */
export type TailorRequest = z.output<typeof TailorRequestSchema>;
export type Change = z.infer<typeof ChangeSchema>;
export type KeywordAnalysis = z.infer<typeof KeywordAnalysisSchema>;
export type JobSummary = z.infer<typeof JobSummarySchema>;
export type TailorResult = z.infer<typeof TailorResultSchema>;
