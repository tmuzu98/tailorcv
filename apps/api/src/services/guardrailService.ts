import type {
  AdditionalSection,
  Basics,
  Certification,
  Education,
  Experience,
  LOCKED_FIELDS,
  Project,
  Resume,
  SkillGroup,
  TextItem,
} from "@tailorcv/shared";
import { analyzeKeywords, normalizeForMatching } from "./keywordService";
import { collectResumeText } from "./resumeText";

/**
 * Honesty guardrails (ADR-006, Tech Design §6.2 step 3): the deterministic check between the
 * model's tailored resume and the user. No AI here. The model is asked to follow the lock rules;
 * this code makes sure it did, undoes anything it was not allowed to do, and says so.
 *
 * `original` is the resume from the tailor request. It already includes what the user added on
 * the review page (ADR-014), so a user-added skill is simply part of the original.
 *
 * What the model may do: reword, reorder and remove bullet points, details and descriptions;
 * rewrite the headline and summary; regroup, reorder and remove skills; reorder or remove
 * projects and extra sections.
 *
 * What is undone:
 *  - locked fields changed (company, title, dates, degree, contact details…) → original restored
 *  - a new job, school, certification, project or section                    → dropped
 *  - a job, school or certification left out                                  → put back
 *  - a bullet point that is not in the original (so never more than before)   → dropped
 *  - a skill, technology or section item that the original does not mention   → removed
 *  - reworded text with a number the original never states                    → original text kept
 *  - reworded text with a job keyword naming something the original never mentions → original kept
 *
 * Pure and deterministic: inputs are not modified, and running it on its own output changes
 * nothing. Warnings contain resume text (they are shown to the user); `stats` are counts only
 * and are the only part that may be logged.
 */

/** Counts of what the guardrails undid. Content-free, safe to log. */
export interface GuardrailStats {
  /** Locked fields whose value the model changed (restored quietly if only case/spacing). */
  lockedFieldsRestored: number;
  /** Entries the model added (jobs, schools, certifications, projects, sections). */
  entriesDropped: number;
  /** Jobs, schools or certifications the model left out. */
  entriesRestored: number;
  /** Bullet points, details or section items the model added. */
  itemsDropped: number;
  /** Skills or project technologies not found in the original resume. */
  skillsRemoved: number;
  /** Reworded texts replaced by the original because they introduced a new number. */
  textsRestored: number;
}

export interface GuardrailResult {
  /** The tailored resume with every violation undone. */
  resume: Resume;
  /** User-facing findings, in document order, without duplicates. */
  warnings: string[];
  stats: GuardrailStats;
}

type LockedLabels<Field extends string> = Record<Field, string>;

/** User-facing names of the locked fields. The types tie them to LOCKED_FIELDS in shared. */
const EXPERIENCE_LABELS: LockedLabels<(typeof LOCKED_FIELDS.experience)[number]> = {
  company: "company",
  title: "job title",
  location: "location",
  startDate: "start date",
  endDate: "end date",
};
const EDUCATION_LABELS: LockedLabels<(typeof LOCKED_FIELDS.education)[number]> = {
  institution: "school",
  degree: "degree",
  field: "field of study",
  startDate: "start date",
  endDate: "end date",
};
const CERTIFICATION_LABELS: LockedLabels<(typeof LOCKED_FIELDS.certifications)[number]> = {
  name: "name",
  issuer: "issuer",
  date: "date",
};
/** Not in LOCKED_FIELDS, but still facts the model has no reason to touch. */
const BASICS_LABELS = {
  fullName: "name",
  email: "email",
  phone: "phone",
  location: "location",
  links: "links",
} satisfies Partial<Record<keyof Basics, string>>;
const PROJECT_LABELS = { name: "name", url: "link" } satisfies Partial<
  Record<keyof Project, string>
>;
const SECTION_LABELS = { title: "title" } satisfies Partial<
  Record<keyof AdditionalSection, string>
>;

const jobName = (job: Experience) => `${job.title} at ${job.company}`;
const listOf = new Intl.ListFormat("en-GB", { style: "long", type: "conjunction" });

/** Lowercase, single spaces: how skills and phrases are compared. */
const tidy = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();
/** Comparison form of a locked value: case and whitespace do not count as a change. */
const canonical = (value: unknown) =>
  JSON.stringify(value ?? "")
    .replace(/\s+/g, "")
    .toLowerCase();
/** Numbers as written ("200", "1.2", "5,000" → "5000"). */
const numbersIn = (text: string) =>
  (text.match(/\d+(?:[.,]\d+)*/g) ?? []).map((token) => token.replaceAll(",", ""));

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
/** "+" and "#" continue a name too: "C" is not found in "C++" or "C#". */
const NAME_CONTINUES = /[\p{L}\p{N}+#]/u;

/** True if `phrase` occurs in `text` as whole words ("Java" is not in "JavaScript"). */
function containsPhrase(text: string, phrase: string): boolean {
  for (let at = text.indexOf(phrase); at !== -1; at = text.indexOf(phrase, at + 1)) {
    const before = text.charAt(at - 1);
    const after = text.charAt(at + phrase.length);
    if (!LETTER_OR_DIGIT.test(before) && !NAME_CONTINUES.test(after)) return true;
  }
  return false;
}

/** Words that carry no claim; a keyword is never "new" because of them. */
const FILLER_WORDS = new Set([
  "a",
  "an",
  "and",
  "the",
  "of",
  "or",
  "for",
  "in",
  "on",
  "to",
  "with",
]);

/**
 * True if two normalized words are forms of the same word: equal, or sharing a long common
 * start ("intern" / "internship", "analysi" / "analyz"). Short words must be equal, so "java"
 * is not "javascript".
 */
function sameWordFamily(a: string, b: string): boolean {
  if (a === b) return true;
  let shared = 0;
  while (shared < a.length && a[shared] === b[shared]) shared += 1;
  return shared >= 5 && shared >= 0.6 * Math.max(a.length, b.length);
}

/** What one guardrail run knows about the original, plus the findings collected so far. */
class Run {
  readonly warnings: string[] = [];
  readonly stats: GuardrailStats = {
    lockedFieldsRestored: 0,
    entriesDropped: 0,
    entriesRestored: 0,
    itemsDropped: 0,
    skillsRemoved: 0,
    textsRestored: 0,
  };
  private readonly text: string;
  private readonly numbers: Set<string>;
  /**
   * Job keywords a rewrite may not use: the resume does not cover them AND they contain a word
   * the resume never uses in any form ("GraphQL"). [as written, form used for matching].
   */
  private readonly foreignKeywords: [label: string, normalized: string][];

  constructor(original: Resume, jobKeywords: readonly string[]) {
    this.text = tidy(collectResumeText(original).join("\n"));
    this.numbers = new Set(numbersIn(this.text));
    const resumeWords = [...new Set(normalizeForMatching(this.text).split(" "))];
    const used = (word: string) =>
      FILLER_WORDS.has(word) || resumeWords.some((known) => sameWordFamily(word, known));
    this.foreignKeywords = analyzeKeywords(jobKeywords, original)
      .missing.map((keyword): [string, string] => [keyword, normalizeForMatching(keyword)])
      .filter(([, normalized]) => !normalized.split(" ").every(used));
  }

  /** The original resume mentions this skill somewhere (a skill list, a bullet point…). */
  mentions(skill: string): boolean {
    return containsPhrase(this.text, skill);
  }

  /** Numbers in `text` that appear nowhere in the original resume. */
  newNumbers(text: string): string[] {
    return numbersIn(text).filter((number) => !this.numbers.has(number));
  }

  /** Job keywords in `text` that bring in something the resume never mentions ("GraphQL"). */
  newKeywords(text: string): string[] {
    const normalized = ` ${normalizeForMatching(text)} `;
    return this.foreignKeywords
      .filter(([, keyword]) => normalized.includes(` ${keyword} `))
      .map(([label]) => label);
  }
}

/**
 * Locked fields: returns the labels of the fields whose value really changed. (The caller always
 * builds its result from the original entry, so the values are restored either way.)
 */
function changedFields<T>(original: T, tailored: T, labels: Partial<Record<keyof T, string>>) {
  return Object.entries<string | undefined>(labels)
    .filter(([field]) => {
      const key = field as keyof T;
      return canonical(original[key]) !== canonical(tailored[key]);
    })
    .map(([, label]) => label as string);
}

function reportLocked(run: Run, changed: string[], warning: (fields: string) => string) {
  if (changed.length === 0) return;
  run.stats.lockedFieldsRestored += changed.length;
  run.warnings.push(warning(listOf.format(changed)));
}

interface SectionRules<T extends { id: string }> {
  /** With an article, for warnings: "a job", "an education entry". */
  kind: string;
  name: (entry: T) => string;
  labels: Partial<Record<keyof T, string>>;
  /** Builds the result entry from the original (facts) and the tailored one (wording). */
  merge: (original: T, tailored: T, name: string) => T;
}

/**
 * Pairs each tailored entry with its original by id, in the model's order. Entries with an
 * unknown id (new) or a repeated id (one entry split in two) are dropped with a warning.
 */
function mergeKnownEntries<T extends { id: string }>(
  run: Run,
  originals: T[],
  tailoreds: T[],
  rules: SectionRules<T>,
): T[] {
  const originalById = new Map(originals.map((entry) => [entry.id, entry]));
  const merged: T[] = [];
  for (const tailored of tailoreds) {
    const original = originalById.get(tailored.id);
    if (!original) {
      run.stats.entriesDropped += 1;
      run.warnings.push(
        `Removed ${rules.kind} the AI added ("${rules.name(tailored)}"). Only entries from your resume are kept.`,
      );
      continue;
    }
    originalById.delete(tailored.id); // a second entry with this id now counts as new
    const name = rules.name(original);
    reportLocked(
      run,
      changedFields(original, tailored, rules.labels),
      (fields) => `The AI changed the ${fields} of "${name}". The original was kept.`,
    );
    merged.push(rules.merge(original, tailored, name));
  }
  return merged;
}

/** Jobs, schools and certifications: every original entry stays, in the original order. */
function keepEveryEntry<T extends { id: string }>(
  run: Run,
  originals: T[],
  tailoreds: T[],
  rules: SectionRules<T>,
): T[] {
  const mergedById = new Map(
    mergeKnownEntries(run, originals, tailoreds, rules).map((entry) => [entry.id, entry]),
  );
  return originals.map((original) => {
    const merged = mergedById.get(original.id);
    if (merged) return merged;
    run.stats.entriesRestored += 1;
    run.warnings.push(`The AI left out "${rules.name(original)}". It was put back.`);
    return original;
  });
}

/**
 * Free text the model may rewrite. A rewrite is replaced by the original text when it brings in
 * a number the resume never states ("serving 2 million requests"), or a keyword of the job that
 * that names something the resume never mentions ("worked with GraphQL APIs"): that is how a
 * model flatters the keyword score. A keyword made only of words the resume already uses, in
 * any form, is fine ("frontend performance" when the resume has both words): that is honest
 * rewording, and it is how the score is meant to rise. An empty rewrite also keeps the original.
 */
function safeText(
  run: Run,
  original: string | undefined,
  tailored: string | undefined,
  what: string,
): string | undefined {
  if (tailored === undefined || tailored.trim() === "") return original;
  const numbers = run.newNumbers(tailored);
  const keywords = run.newKeywords(tailored);
  if (numbers.length === 0 && keywords.length === 0) return tailored;
  run.stats.textsRestored += 1;
  run.warnings.push(
    numbers.length > 0
      ? `${what} mentioned a number that is not in your resume (${listOf.format(numbers)}). The original wording was kept.`
      : `${what} mentioned something the job asks for that is not in your resume (${listOf.format(keywords)}). The original wording was kept.`,
  );
  return original;
}

/**
 * Bullet points and details: reworded, reordered or removed is fine; added is not. Matching by
 * id means the result can never have more items than the original.
 */
function keepKnownItems(
  run: Run,
  originals: TextItem[],
  tailoreds: TextItem[],
  owner: string,
): TextItem[] {
  const originalTextById = new Map(originals.map((item) => [item.id, item.text]));
  const kept: TextItem[] = [];
  let added = 0;
  for (const item of tailoreds) {
    if (item.text.trim() === "") continue; // blanked = removed
    const originalText = originalTextById.get(item.id);
    if (originalText === undefined) {
      added += 1;
      continue;
    }
    originalTextById.delete(item.id);
    const text = safeText(run, originalText, item.text, `A reworded line under "${owner}"`);
    kept.push({ id: item.id, text: text as string });
  }
  if (added > 0) {
    run.stats.itemsDropped += added;
    run.warnings.push(
      `Removed ${added} bullet point${added === 1 ? "" : "s"} the AI added under "${owner}" (not in your resume).`,
    );
  }
  return kept;
}

/** Skills and technologies: only ones the original resume mentions; repeats and blanks go. */
function keepKnownSkills(run: Run, items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const skill = tidy(item);
    if (skill === "" || seen.has(skill)) return false;
    seen.add(skill);
    if (run.mentions(skill)) return true;
    run.stats.skillsRemoved += 1;
    run.warnings.push(
      `Possible new skill: "${item.trim()}". It is not in your resume, so it was removed.`,
    );
    return false;
  });
}

/** Skill groups may be regrouped freely. Groups sharing an id are merged; empty ones go. */
function keepSkillGroups(run: Run, groups: SkillGroup[]): SkillGroup[] {
  const byId = new Map<string, SkillGroup>();
  for (const group of groups) {
    const target = byId.get(group.id) ?? { id: group.id, category: group.category, items: [] };
    target.items.push(...group.items);
    byId.set(group.id, target);
  }
  return [...byId.values()]
    .map((group) => ({ ...group, items: keepKnownSkills(run, group.items) }))
    .filter((group) => group.items.length > 0);
}

function keepBasics(run: Run, original: Basics, tailored: Basics): Basics {
  reportLocked(
    run,
    changedFields(original, tailored, BASICS_LABELS),
    (fields) => `The AI changed your ${fields}. Your original contact details were kept.`,
  );
  const basics: Basics = { ...original };
  const headline = safeText(run, original.headline, tailored.headline, "The new headline");
  const summary = safeText(run, original.summary, tailored.summary, "The new summary");
  if (headline !== undefined) basics.headline = headline;
  if (summary !== undefined) basics.summary = summary;
  return basics;
}

const EXPERIENCE_RULES: (run: Run) => SectionRules<Experience> = (run) => ({
  kind: "a job",
  name: jobName,
  labels: EXPERIENCE_LABELS,
  merge: (original, tailored, name) => ({
    ...original,
    bullets: keepKnownItems(run, original.bullets, tailored.bullets, name),
  }),
});

const EDUCATION_RULES: (run: Run) => SectionRules<Education> = (run) => ({
  kind: "an education entry",
  name: (school) => school.institution,
  labels: EDUCATION_LABELS,
  merge: (original, tailored, name) => ({
    ...original,
    details: keepKnownItems(run, original.details, tailored.details, name),
  }),
});

const CERTIFICATION_RULES: SectionRules<Certification> = {
  kind: "a certification",
  name: (certification) => certification.name,
  labels: CERTIFICATION_LABELS,
  merge: (original) => original,
};

const PROJECT_RULES: (run: Run) => SectionRules<Project> = (run) => ({
  kind: "a project",
  name: (project) => project.name,
  labels: PROJECT_LABELS,
  merge: (original, tailored, name) => {
    const project: Project = {
      ...original,
      bullets: keepKnownItems(run, original.bullets, tailored.bullets, name),
      technologies: keepKnownSkills(run, tailored.technologies),
    };
    const description = safeText(
      run,
      original.description,
      tailored.description,
      `The new description of "${name}"`,
    );
    if (description !== undefined) project.description = description;
    return project;
  },
});

const SECTION_RULES: (run: Run) => SectionRules<AdditionalSection> = (run) => ({
  kind: "a section",
  name: (section) => section.title,
  labels: SECTION_LABELS,
  merge: (original, tailored, name) => {
    const allowed = new Set(original.items.map(tidy));
    const items = tailored.items.filter((item) => {
      if (allowed.has(tidy(item))) return true;
      run.stats.itemsDropped += 1;
      run.warnings.push(`Removed "${item.trim()}" from "${name}": it is not in your resume.`);
      return false;
    });
    return { ...original, items };
  },
});

/**
 * Checks a tailored resume against the original and returns a version with every violation
 * undone, the user-facing warnings, and content-free counts. Pass the job's keywords so that
 * reworded text cannot claim one the resume does not cover.
 */
export function applyGuardrails(
  original: Resume,
  tailored: Resume,
  options: { jobKeywords?: readonly string[] } = {},
): GuardrailResult {
  const run = new Run(original, options.jobKeywords ?? []);
  const resume: Resume = {
    basics: keepBasics(run, original.basics, tailored.basics),
    experience: keepEveryEntry(
      run,
      original.experience,
      tailored.experience,
      EXPERIENCE_RULES(run),
    ),
    education: keepEveryEntry(run, original.education, tailored.education, EDUCATION_RULES(run)),
    skills: keepSkillGroups(run, tailored.skills),
    projects: mergeKnownEntries(run, original.projects, tailored.projects, PROJECT_RULES(run)),
    certifications: keepEveryEntry(
      run,
      original.certifications,
      tailored.certifications,
      CERTIFICATION_RULES,
    ),
    additionalSections: mergeKnownEntries(
      run,
      original.additionalSections,
      tailored.additionalSections,
      SECTION_RULES(run),
    ),
  };
  return { resume, warnings: [...new Set(run.warnings)], stats: run.stats };
}
