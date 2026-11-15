import { z } from "zod";
import type { Resume } from "./resume.schema";

/**
 * Details the USER adds on the review page, on top of what was read from their PDF (D-85).
 *
 * The parsed resume is never edited in place: additions are kept separately and merged with
 * `applyResumeAdditions()` when the resume is shown or sent for tailoring. That keeps "what the
 * PDF said" and "what the user told us" apart, makes every addition removable, and gives the
 * merged resume the same shape (`Resume`) the tailor endpoint already accepts.
 *
 * User additions are the user's own statements about themselves, so they are allowed content:
 * the "never fabricate" rule is about the AI, which still may not add anything.
 */
export const RESUME_ADDITION_LIMITS = {
  /** Headline, email, phone, location, certification fields. */
  maxFieldChars: 200,
  maxSkillChars: 60,
  maxBulletChars: 500,
  maxSkills: 50,
  maxBullets: 50,
  maxCertifications: 20,
} as const;

/** Category of the skill group that holds user-added skills in the merged resume. */
export const ADDED_SKILLS_CATEGORY = "Additional skills";

/** Contact fields the user may fill in. They only apply where the PDF had nothing. */
export const ADDABLE_BASICS_FIELDS = ["headline", "email", "phone", "location"] as const;
export type AddableBasicsField = (typeof ADDABLE_BASICS_FIELDS)[number];

const text = (max: number) => z.string().trim().min(1).max(max);
const field = text(RESUME_ADDITION_LIMITS.maxFieldChars);

export const AddedBulletSchema = z.object({
  /** Id of the existing job this bullet belongs to. */
  experienceId: z.string().min(1),
  text: text(RESUME_ADDITION_LIMITS.maxBulletChars),
});

export const AddedCertificationSchema = z.object({
  name: field,
  issuer: field.optional(),
  date: field.optional(),
});

export const ResumeAdditionsSchema = z.object({
  basics: z.object({
    headline: field.optional(),
    email: field.optional(),
    phone: field.optional(),
    location: field.optional(),
  }),
  skills: z.array(text(RESUME_ADDITION_LIMITS.maxSkillChars)).max(RESUME_ADDITION_LIMITS.maxSkills),
  bullets: z.array(AddedBulletSchema).max(RESUME_ADDITION_LIMITS.maxBullets),
  certifications: z.array(AddedCertificationSchema).max(RESUME_ADDITION_LIMITS.maxCertifications),
});

export type AddedBullet = z.infer<typeof AddedBulletSchema>;
export type AddedCertification = z.infer<typeof AddedCertificationSchema>;
export type ResumeAdditions = z.infer<typeof ResumeAdditionsSchema>;

export const EMPTY_RESUME_ADDITIONS: ResumeAdditions = {
  basics: {},
  skills: [],
  bullets: [],
  certifications: [],
};

export function hasResumeAdditions(additions: ResumeAdditions): boolean {
  return (
    Object.values(additions.basics).some((value) => value !== undefined) ||
    additions.skills.length > 0 ||
    additions.bullets.length > 0 ||
    additions.certifications.length > 0
  );
}

const isBlank = (value: string | undefined) => value === undefined || value.trim() === "";
const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Every id used anywhere in a resume, in document order (duplicates included). */
export function collectResumeIds(resume: Resume): string[] {
  return [
    ...resume.experience.flatMap((job) => [job.id, ...job.bullets.map((b) => b.id)]),
    ...resume.education.flatMap((school) => [school.id, ...school.details.map((d) => d.id)]),
    ...resume.skills.map((group) => group.id),
    ...resume.projects.flatMap((project) => [project.id, ...project.bullets.map((b) => b.id)]),
    ...resume.certifications.map((cert) => cert.id),
    ...resume.additionalSections.map((section) => section.id),
  ];
}

/** Ids that appear more than once in a resume (each reported once). */
export function findDuplicateResumeIds(resume: Resume): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of collectResumeIds(resume)) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates];
}

/** True if the resume already lists this skill in any group (case-insensitive). */
export function resumeHasSkill(resume: Resume, skill: string): boolean {
  return resume.skills.some((group) => group.items.some((item) => sameText(item, skill)));
}

/**
 * Returns a NEW resume = `resume` + the user's additions. Pure and deterministic: the same
 * inputs always give the same ids, and `resume` is not modified.
 *
 * - basics: fills a field only where the parsed resume has nothing (never overwrites the PDF)
 * - skills: appended to one "Additional skills" group; skills the resume already has are skipped
 * - bullets: appended to their job with the next free id (`exp_1_b6`); unknown jobs are skipped
 * - certifications: appended with the next free id (`cert_2`)
 */
export function applyResumeAdditions(resume: Resume, additions: ResumeAdditions): Resume {
  const used = new Set(collectResumeIds(resume));
  const nextId = (prefix: string) => {
    let n = 1;
    while (used.has(`${prefix}${n}`)) n += 1;
    used.add(`${prefix}${n}`);
    return `${prefix}${n}`;
  };

  const basics = { ...resume.basics };
  for (const key of ADDABLE_BASICS_FIELDS) {
    const added = additions.basics[key];
    if (isBlank(basics[key]) && !isBlank(added)) basics[key] = added;
  }

  const experience = resume.experience.map((job) => {
    const added = additions.bullets.filter((bullet) => bullet.experienceId === job.id);
    if (added.length === 0) return job;
    return {
      ...job,
      bullets: [
        ...job.bullets,
        ...added.map((bullet) => ({ id: nextId(`${job.id}_b`), text: bullet.text })),
      ],
    };
  });

  const newSkills: string[] = [];
  for (const skill of additions.skills) {
    if (resumeHasSkill(resume, skill) || newSkills.some((s) => sameText(s, skill))) continue;
    newSkills.push(skill);
  }
  const skills =
    newSkills.length === 0
      ? resume.skills
      : [
          ...resume.skills,
          { id: nextId("skill_"), category: ADDED_SKILLS_CATEGORY, items: newSkills },
        ];

  const certifications = [
    ...resume.certifications,
    ...additions.certifications.map((cert) => ({ id: nextId("cert_"), ...cert })),
  ];

  return { ...resume, basics, experience, skills, certifications };
}
