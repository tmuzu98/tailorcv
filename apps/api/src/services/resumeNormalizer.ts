import type { Resume, SkillGroup } from "@tailorcv/shared";
import type { ParseLlmOutput } from "../llm/prompts/parse.v1";

/** What post-processing changed — logged as counts only (never the content). */
export interface NormalizeStats {
  /** Entries dropped because a required field was empty (e.g. a job without a company). */
  droppedEntries: number;
  /** Skills recovered from groups whose category held the skill and `items` was empty. */
  recoveredSkills: number;
  /** Email taken from the document text because the model left it out. */
  emailFromText: boolean;
  /** Degrees moved from `details` into `degree`. */
  degreesFromDetails: number;
  /** Start dates removed because they only repeated the end date ("(2018)" → start=end=2018). */
  duplicateDatesRemoved: number;
}

/** Values small models emit instead of leaving a field out. */
const PLACEHOLDERS = new Set([
  "",
  "n/a",
  "na",
  "none",
  "null",
  "unknown",
  "-",
  "—",
  "not provided",
]);
/** Leading bullet glyphs from the PDF ("• Built…", "- Built…"). */
const BULLET_PREFIX = /^[\s•●▪■◦‣∙·*\-–—]+(?=\S)/u;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
/** A link must look like one: a scheme, "www.", or a domain (e.g. "github.com/alex"). */
const LINK_LIKE = /^(https?:\/\/|www\.)|^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/|$)/i;
const ONLY_EMAIL = /^(mailto:)?[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
/** A line that starts with a degree name (used when the model put the degree into `details`). */
const DEGREE_LINE =
  /^(B\.?\s?Sc|B\.?\s?A|B\.?\s?S|B\.?\s?Eng|B\.?\s?Tech|M\.?\s?Sc|M\.?\s?A|M\.?\s?S|M\.?\s?Eng|M\.?\s?Tech|MBA|Ph\.?\s?D|Bachelor|Master|Associate|Diploma|Doctor)\b/i;

/** Trim + collapse whitespace (PDF line wraps become single spaces). */
function clean(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const text = value.replace(/\s+/g, " ").trim();
  return PLACEHOLDERS.has(text.toLowerCase()) ? undefined : text;
}

function cleanList(values: string[], { stripBullets = false } = {}): string[] {
  return values
    .map((v) => clean(stripBullets ? v.replace(BULLET_PREFIX, "") : v))
    .filter((v): v is string => v !== undefined);
}

function uniqueCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((v) => {
    const key = v.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Drops undefined keys so optional fields are absent rather than `undefined` in the JSON. */
function compact<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

/**
 * Turns raw model output into a valid `Resume`: assigns stable ids (exp_1, exp_1_b1, edu_1_d1,
 * skill_1, proj_1_b1, cert_1, add_1), trims text, strips bullet glyphs, removes placeholders and
 * empty items, recovers skills misplaced in `category`, and fills the email from the document text
 * if the model missed it. Deterministic and side-effect free. Never adds content that isn't in
 * the model output or the document text.
 */
export function normalizeParsedResume(
  raw: ParseLlmOutput,
  options: { sourceText?: string } = {},
): { resume: Resume; stats: NormalizeStats } {
  const stats: NormalizeStats = {
    droppedEntries: 0,
    recoveredSkills: 0,
    emailFromText: false,
    degreesFromDetails: 0,
    duplicateDatesRemoved: 0,
  };
  /** One date shown → the model sometimes copies it into both fields. Keep it as the end date. */
  const dates = (start: string | undefined, end: string | undefined) => {
    const s = clean(start);
    const e = clean(end);
    if (s && e && s.toLowerCase() === e.toLowerCase()) {
      stats.duplicateDatesRemoved++;
      return { startDate: undefined, endDate: e };
    }
    return { startDate: s, endDate: e };
  };
  const keep = <T>(value: T | undefined): value is T => {
    if (value === undefined) stats.droppedEntries++;
    return value !== undefined;
  };

  let email = clean(raw.basics.email);
  if (!email && options.sourceText) {
    const found = options.sourceText.match(EMAIL)?.[0];
    if (found) {
      email = found;
      stats.emailFromText = true;
    }
  }

  const basics = compact({
    fullName: clean(raw.basics.fullName) ?? "",
    headline: clean(raw.basics.headline),
    email,
    phone: clean(raw.basics.phone),
    location: clean(raw.basics.location),
    links: raw.basics.links
      .map((l) => ({ label: clean(l.label) ?? "Link", url: clean(l.url) }))
      // An email isn't a link (it already lives in basics.email), and a link must look like a URL
      // (small models sometimes put the location or a name here).
      .filter(
        (l): l is { label: string; url: string } =>
          l.url !== undefined && !ONLY_EMAIL.test(l.url) && LINK_LIKE.test(l.url),
      ),
    summary: clean(raw.basics.summary),
  });

  const experience = raw.experience
    .map((e) => {
      const company = clean(e.company);
      const title = clean(e.title);
      if (!company || !title) return undefined;
      return {
        company,
        title,
        location: clean(e.location),
        ...dates(e.startDate, e.endDate),
        bullets: cleanList(e.bullets, { stripBullets: true }),
      };
    })
    .filter(keep)
    .map((e, i) =>
      compact({
        id: `exp_${i + 1}`,
        ...e,
        bullets: e.bullets.map((text, j) => ({ id: `exp_${i + 1}_b${j + 1}`, text })),
      }),
    );

  const education = raw.education
    .map((e) => {
      const institution = clean(e.institution);
      if (!institution) return undefined;
      let degree = clean(e.degree);
      let details = cleanList(e.details, { stripBullets: true });
      // The model sometimes puts "B.Sc. Computer Science" into details: move it to `degree`.
      const first = details[0];
      if (!degree && first && DEGREE_LINE.test(first)) {
        degree = first;
        details = details.slice(1);
        stats.degreesFromDetails++;
      }
      return {
        institution,
        degree,
        field: clean(e.field),
        ...dates(e.startDate, e.endDate),
        details,
      };
    })
    .filter(keep)
    .map((e, i) =>
      compact({
        id: `edu_${i + 1}`,
        ...e,
        details: e.details.map((text, j) => ({ id: `edu_${i + 1}_d${j + 1}`, text })),
      }),
    );

  // Skills: groups with items keep their category; groups with NO items but a category are a
  // known small-model mistake (the skill went into `category`) → recover into one "Skills" group.
  const groups: Array<Omit<SkillGroup, "id">> = [];
  const recovered: string[] = [];
  for (const g of raw.skills) {
    const items = uniqueCaseInsensitive(cleanList(g.items, { stripBullets: true }));
    const category = clean(g.category);
    if (items.length > 0) groups.push({ category: category ?? "Skills", items });
    else if (category) recovered.push(category);
  }
  if (recovered.length > 0) {
    stats.recoveredSkills = recovered.length;
    const target = groups.find((g) => g.category.toLowerCase() === "skills");
    if (target) target.items = uniqueCaseInsensitive([...target.items, ...recovered]);
    else groups.push({ category: "Skills", items: uniqueCaseInsensitive(recovered) });
  }
  const skills = groups.map((g, i) => ({ id: `skill_${i + 1}`, ...g }));

  const projects = raw.projects
    .map((p) => {
      const name = clean(p.name);
      if (!name) return undefined;
      return {
        name,
        url: clean(p.url),
        description: clean(p.description),
        bullets: cleanList(p.bullets, { stripBullets: true }),
        technologies: uniqueCaseInsensitive(cleanList(p.technologies)),
      };
    })
    .filter(keep)
    .map((p, i) =>
      compact({
        id: `proj_${i + 1}`,
        ...p,
        bullets: p.bullets.map((text, j) => ({ id: `proj_${i + 1}_b${j + 1}`, text })),
      }),
    );

  const certifications = raw.certifications
    .map((c) => {
      const name = clean(c.name);
      return name ? { name, issuer: clean(c.issuer), date: clean(c.date) } : undefined;
    })
    .filter(keep)
    .map((c, i) => compact({ id: `cert_${i + 1}`, ...c }));

  const additionalSections = raw.additionalSections
    .map((s) => {
      const title = clean(s.title);
      const items = cleanList(s.items, { stripBullets: true });
      return title && items.length > 0 ? { title, items } : undefined;
    })
    .filter(keep)
    .map((s, i) => ({ id: `add_${i + 1}`, ...s }));

  return {
    resume: { basics, experience, education, skills, projects, certifications, additionalSections },
    stats,
  };
}

/** A parse result counts as a resume only if it has a name and at least one real section. */
export function looksLikeResume(resume: Resume): boolean {
  const hasContent =
    resume.experience.length +
      resume.education.length +
      resume.skills.length +
      resume.projects.length >
    0;
  return resume.basics.fullName.length > 0 && hasContent;
}
