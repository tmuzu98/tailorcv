import type { Change, Resume, SkillGroup, TextItem } from "@tailorcv/shared";
import { normalizeForMatching } from "./keywordService";

/**
 * Turns the model's edits (tailor-v2) into a tailored resume, and describes what changed.
 * Deterministic, no AI. The result is always built from the original resume: the model only
 * supplies new wording for items that already exist, addressed by id. Anything it leaves out
 * stays as it was, and anything it addresses that does not exist is ignored.
 *
 * The output of `applyTailorEdits` still goes through `guardrailService` (new numbers, etc.).
 * `describeChanges` runs after the guardrails, on the final resume, so the change list shown to
 * the user states what really changed, not what the model says it changed.
 */

/** The editing part of the model's answer (`TailorLlmOutput` fits). Missing means "no edit". */
export interface TailorEdits {
  headline?: string | undefined;
  summary?: string | undefined;
  bullets: { id: string; text: string; reason?: string | undefined }[];
  removedBulletIds: string[];
}

/** Counts of what was applied or ignored. Content-free, safe to log. */
export interface TailorEditStats {
  bulletsReworded: number;
  /** Bullets whose only change is letter case, punctuation or spacing (a typo fix, D-105). */
  bulletsCorrected: number;
  bulletsRemoved: number;
  /** Bullet edits or removals whose id is not in the resume (or was repeated). */
  editsIgnored: number;
  skillsReordered: number;
}

export interface AppliedEdits {
  resume: Resume;
  /** The model's reason for each reworded bullet, by bullet id. */
  reasons: Map<string, string>;
  stats: TailorEditStats;
}

const isBlank = (text: string | undefined): text is undefined =>
  text === undefined || text.trim() === "";
const tidy = (text: string) => text.replace(/\s+/g, " ").trim();

/** The words of a text, ignoring letter case, punctuation and spacing. */
const wordsOf = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
/** Same words, so only case, punctuation or spacing changed ("Seo" → "SEO", "on time" → "on-time"). */
const isCorrection = (before: string, after: string) =>
  before !== after && wordsOf(before) === wordsOf(after);

/** Longest reason shown to the user; Claude's run 8 to 14 words, a copied bullet runs longer. */
export const MAX_REASON_WORDS = 30;

/**
 * The model's reason, when it is one (D-105). Weak models put the bullet itself, or a paragraph,
 * in the reason field; then the user sees a default reason instead.
 */
function usableReason(reason: string | undefined, before: string | undefined, after: string) {
  if (reason === undefined) return undefined;
  const words = wordsOf(reason);
  if (words === "" || reason.split(/\s+/).length > MAX_REASON_WORDS) return undefined;
  const copies = (text: string | undefined) => text !== undefined && words.includes(wordsOf(text));
  return copies(after) || copies(before) ? undefined : reason;
}

/** Stable sort: skills the job asks for first, the rest in their original order. */
function relevantFirst(group: SkillGroup, keywords: string[]): SkillGroup {
  const relevant = (skill: string) => {
    const normalized = ` ${normalizeForMatching(skill)} `;
    return keywords.some(
      (keyword) => normalized.includes(` ${keyword} `) || ` ${keyword} `.includes(normalized),
    );
  };
  const items = [...group.items.filter(relevant), ...group.items.filter((s) => !relevant(s))];
  return { ...group, items };
}

export function applyTailorEdits(
  original: Resume,
  edits: TailorEdits,
  jobKeywords: readonly string[],
): AppliedEdits {
  const stats: TailorEditStats = {
    bulletsReworded: 0,
    bulletsCorrected: 0,
    bulletsRemoved: 0,
    editsIgnored: 0,
    skillsReordered: 0,
  };
  const reasons = new Map<string, string>();

  // First edit per id wins; the list order is the model's relevance order.
  const rewrites = new Map<string, { text: string; rank: number }>();
  edits.bullets.forEach((edit, rank) => {
    const id = edit.id.trim().replace(/^\[|\]$/g, "");
    if (rewrites.has(id) || isBlank(edit.text)) return void (stats.editsIgnored += 1);
    rewrites.set(id, { text: tidy(edit.text), rank });
    if (!isBlank(edit.reason)) reasons.set(id, tidy(edit.reason));
  });
  const removals = new Set(edits.removedBulletIds.map((id) => id.trim().replace(/^\[|\]$/g, "")));
  const known = new Set<string>();

  const tailorItems = (items: TextItem[]): TextItem[] => {
    items.forEach((item) => known.add(item.id));
    // A job never loses all of its bullets (D-93): then the removals for it are ignored.
    const removable = items.some((item) => !removals.has(item.id));
    const kept = items.filter((item) => !(removable && removals.has(item.id)));
    stats.bulletsRemoved += items.length - kept.length;

    const rank = (item: TextItem, index: number) =>
      rewrites.get(item.id)?.rank ?? edits.bullets.length + index;
    return kept
      .map((item, index) => ({ item, rank: rank(item, index) }))
      .sort((a, b) => a.rank - b.rank)
      .map(({ item }) => {
        const text = rewrites.get(item.id)?.text ?? item.text;
        if (isCorrection(item.text, text)) stats.bulletsCorrected += 1;
        else if (text !== item.text) stats.bulletsReworded += 1;
        return { id: item.id, text };
      });
  };

  const keywords = jobKeywords.map(normalizeForMatching).filter((keyword) => keyword !== "");
  const skills = original.skills.map((group) => {
    const sorted = relevantFirst(group, keywords);
    if (sorted.items.join("\n") !== group.items.join("\n")) stats.skillsReordered += 1;
    return sorted;
  });

  const resume: Resume = {
    ...original,
    basics: {
      ...original.basics,
      ...(!isBlank(edits.headline) && { headline: tidy(edits.headline) }),
      ...(!isBlank(edits.summary) && { summary: tidy(edits.summary) }),
    },
    experience: original.experience.map((job) => ({ ...job, bullets: tailorItems(job.bullets) })),
    projects: original.projects.map((p) => ({ ...p, bullets: tailorItems(p.bullets) })),
    skills,
  };

  for (const id of [...rewrites.keys(), ...removals]) if (!known.has(id)) stats.editsIgnored += 1;
  return { resume, reasons, stats };
}

const DEFAULT_REASONS = {
  headline: "Headline set to a job title from your resume.",
  summary: "Summary rewritten around what this job asks for.",
  reworded: "Reworded to match the job description.",
  corrected: "Fixed spelling, capitalization or punctuation.",
  reordered: "Most relevant points moved to the top.",
  removed: "Left out because it is less relevant to this job.",
  skills: "Skills this job asks for come first.",
};

/**
 * The change list for the user: every real difference between the original and the final
 * (post-guardrail) resume, in document order.
 */
export function describeChanges(
  original: Resume,
  final: Resume,
  reasons: ReadonlyMap<string, string> = new Map(),
): Change[] {
  const changes: Change[] = [];

  const reworded = (
    section: Change["section"],
    before: string | undefined,
    after: string | undefined,
    reason: string,
    targetId?: string,
  ) => {
    if (after === undefined || before === after) return;
    changes.push({
      section,
      ...(targetId !== undefined && { targetId }),
      type: "reworded",
      ...(before !== undefined && { before }),
      after,
      reason,
    });
  };

  const items = (section: Change["section"], ownerId: string, was: TextItem[], now: TextItem[]) => {
    const nowIds = new Set(now.map((item) => item.id));
    const survivors = was.filter((item) => nowIds.has(item.id)).map((item) => item.id);
    if (survivors.join("\n") !== now.map((item) => item.id).join("\n")) {
      changes.push({
        section,
        targetId: ownerId,
        type: "reordered",
        reason: DEFAULT_REASONS.reordered,
      });
    }
    for (const item of now) {
      const before = was.find((candidate) => candidate.id === item.id)?.text;
      const reason =
        before !== undefined && isCorrection(before, item.text)
          ? DEFAULT_REASONS.corrected
          : (usableReason(reasons.get(item.id), before, item.text) ?? DEFAULT_REASONS.reworded);
      reworded(section, before, item.text, reason, item.id);
    }
    for (const item of was) {
      if (nowIds.has(item.id)) continue;
      changes.push({
        section,
        targetId: item.id,
        type: "removed",
        before: item.text,
        reason: DEFAULT_REASONS.removed,
      });
    }
  };

  reworded("summary", original.basics.headline, final.basics.headline, DEFAULT_REASONS.headline);
  reworded("summary", original.basics.summary, final.basics.summary, DEFAULT_REASONS.summary);

  for (const job of final.experience) {
    const was = original.experience.find((candidate) => candidate.id === job.id);
    if (was) items("experience", job.id, was.bullets, job.bullets);
  }
  for (const group of final.skills) {
    const was = original.skills.find((candidate) => candidate.id === group.id);
    if (was && was.items.join("\n") !== group.items.join("\n")) {
      changes.push({
        section: "skills",
        targetId: group.id,
        type: "reordered",
        reason: DEFAULT_REASONS.skills,
      });
    }
  }
  for (const project of final.projects) {
    const was = original.projects.find((candidate) => candidate.id === project.id);
    if (was) items("projects", project.id, was.bullets, project.bullets);
  }
  for (const school of final.education) {
    const was = original.education.find((candidate) => candidate.id === school.id);
    if (was) items("education", school.id, was.details, school.details);
  }
  return changes;
}
