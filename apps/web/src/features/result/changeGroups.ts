import { CHANGE_SECTIONS, type Change, type KeywordAnalysis, type Resume } from "@tailorcv/shared";

type ChangeSection = (typeof CHANGE_SECTIONS)[number];

const SECTION_TITLES: Record<ChangeSection, string> = {
  summary: "Summary",
  experience: "Experience",
  skills: "Skills",
  projects: "Projects",
  education: "Education",
  other: "Other",
};

/** A change plus, when it has no before/after text (a reorder), the text of the item it moved. */
export interface DisplayChange extends Change {
  targetText?: string;
}

export interface ChangeGroup {
  section: ChangeSection;
  title: string;
  changes: DisplayChange[];
}

/** The change list grouped by section, in resume order; sections without changes are left out. */
export function groupChanges(changes: Change[], resume: Resume): ChangeGroup[] {
  return CHANGE_SECTIONS.map((section) => ({
    section,
    title: SECTION_TITLES[section],
    changes: changes
      .filter((c) => c.section === section)
      .map((c) => {
        const targetText =
          c.targetId !== undefined && c.before === undefined && c.after === undefined
            ? findItemText(resume, c.targetId)
            : undefined;
        return targetText === undefined ? c : { ...c, targetText };
      }),
  })).filter((group) => group.changes.length > 0);
}

/** Readable text of any resume item with an id (bullet, job, school, project, skill group…). */
export function findItemText(resume: Resume, id: string): string | undefined {
  for (const job of resume.experience) {
    if (job.id === id) return [job.title, job.company].filter(Boolean).join(", ");
    const bullet = job.bullets.find((b) => b.id === id);
    if (bullet) return bullet.text;
  }
  for (const school of resume.education) {
    if (school.id === id) return school.institution;
    const detail = school.details.find((d) => d.id === id);
    if (detail) return detail.text;
  }
  for (const project of resume.projects) {
    if (project.id === id) return project.name;
    const bullet = project.bullets.find((b) => b.id === id);
    if (bullet) return bullet.text;
  }
  const group = resume.skills.find((g) => g.id === id);
  if (group) return `${group.category}: ${group.items.join(", ")}`;
  const cert = resume.certifications.find((c) => c.id === id);
  if (cert) return cert.name;
  const extra = resume.additionalSections.find((s) => s.id === id);
  if (extra) return extra.title;
  return undefined;
}

/** Score change from tailoring, or undefined when the result has no before score. */
export function scoreDelta(analysis: KeywordAnalysis): number | undefined {
  return analysis.matchScoreBefore === undefined
    ? undefined
    : analysis.matchScore - analysis.matchScoreBefore;
}
