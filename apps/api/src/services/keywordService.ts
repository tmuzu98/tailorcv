import type { KeywordAnalysis, Resume } from "@tailorcv/shared";
import { collectResumeText } from "./resumeText";

/**
 * Keyword analysis (Tech Design §6.2 step 4): which of the job description's keywords the
 * tailored resume covers. Deterministic and computed on the server, never by the model, so the
 * score cannot be flattered. The keywords themselves come from the model's job analysis.
 *
 * A keyword matches when its words occur in one resume field, next to each other and in order,
 * after both sides are normalized: letter case, punctuation, plurals, verb forms ("mentored" =
 * "mentor") and common aliases ("JS" = "JavaScript") do not matter. Whole words only: "Java" is not found in "JavaScript".
 */

/** Words that mean the same thing. The first entry of each group is the form we compare. */
const ALIAS_GROUPS: string[][] = [
  ["javascript", "js"],
  ["typescript", "ts"],
  ["node.js", "node", "nodejs"],
  ["react", "react.js", "reactjs"],
  ["vue", "vue.js", "vuejs"],
  ["next.js", "nextjs"],
  ["html", "html5"],
  ["css", "css3"],
  ["tailwind", "tailwindcss", "tailwind css"],
  ["kubernetes", "k8s"],
  ["postgresql", "postgres"],
  ["mongodb", "mongo"],
  ["go", "golang"],
  ["c#", "csharp"],
  [".net", "dotnet"],
  ["aws", "amazon web services"],
  ["gcp", "google cloud platform", "google cloud"],
  ["power bi", "powerbi"],
  ["rest", "restful"],
  ["machine learning", "ml"],
  ["artificial intelligence", "ai"],
  ["user experience", "ux"],
  ["user interface", "ui"],
  ["quality assurance", "qa"],
  ["accessibility", "a11y"],
];

/**
 * Reduces a plain word to a rough stem, so that different forms of it compare equal: plurals
 * ("dashboards"), verb forms ("mentored", "testing") and a final "e" ("cache", "caching").
 * Short words and names with digits or symbols ("css", "aws", "node.js", "c++") are kept.
 * It is deliberately crude ("analysis" → "analysi"): both sides go through it, so only equality
 * matters, not spelling.
 */
function stem(word: string): string {
  if (word.length <= 3 || /[^\p{L}]/u.test(word)) return word;
  let base = word;
  if (base.endsWith("ies")) base = `${base.slice(0, -3)}y`;
  else if (base.endsWith("s") && !base.endsWith("ss")) base = base.slice(0, -1);
  for (const ending of ["ing", "ed"]) {
    if (base.endsWith(ending) && base.length - ending.length >= 4) {
      base = base.slice(0, -ending.length);
      break;
    }
  }
  return base.length > 4 && base.endsWith("e") ? base.slice(0, -1) : base;
}

/**
 * Lowercase words without punctuation, each reduced to its stem. "+", "#" and inner dots are part
 * of a word ("c++", "c#", "node.js", ".net"); everything else separates words.
 */
function toWords(text: string): string[] {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#.]+/gu, " ")
    .split(" ")
    .map((word) => word.replace(/\.+$/, ""))
    .filter((word) => word !== "")
    .map(stem);
}

/** Alias (in word form) → the form we compare. Built with the same rules as the text. */
const ALIASES = new Map<string, string>();
for (const [canonical = "", ...variants] of ALIAS_GROUPS) {
  for (const variant of variants)
    ALIASES.set(toWords(variant).join(" "), toWords(canonical).join(" "));
}
const LONGEST_ALIAS = Math.max(...[...ALIASES.keys()].map((alias) => alias.split(" ").length));

/** Replaces aliases, longest first, so "amazon web services" becomes "aws". */
function withAliases(words: string[]): string[] {
  const result: string[] = [];
  let at = 0;
  while (at < words.length) {
    let size = Math.min(LONGEST_ALIAS, words.length - at);
    let canonical = ALIASES.get(words.slice(at, at + size).join(" "));
    while (canonical === undefined && size > 1) {
      size -= 1;
      canonical = ALIASES.get(words.slice(at, at + size).join(" "));
    }
    result.push(canonical ?? words.slice(at, at + 1).join(""));
    at += size;
  }
  return result;
}

/** The form in which keywords and resume text are compared. Exported for tests. */
export function normalizeForMatching(text: string): string {
  return withAliases(toWords(text)).join(" ");
}

/**
 * Splits the job's keywords into those the resume covers and those it does not, and scores the
 * share covered (0–100). Keywords keep their given spelling and order; blanks and repeats
 * (including other spellings of the same keyword) are dropped.
 */
export function analyzeKeywords(keywords: readonly string[], resume: Resume): KeywordAnalysis {
  // Fields are joined with a separator that no keyword can contain, so a phrase never matches
  // across two fields.
  const resumeText = ` ${collectResumeText(resume).map(normalizeForMatching).join(" | ")} `;

  const seen = new Set<string>();
  const matched: string[] = [];
  const missing: string[] = [];
  for (const keyword of keywords) {
    const normalized = normalizeForMatching(keyword);
    if (normalized === "" || seen.has(normalized)) continue;
    seen.add(normalized);
    const label = keyword.replace(/\s+/g, " ").trim();
    (resumeText.includes(` ${normalized} `) ? matched : missing).push(label);
  }

  const total = matched.length + missing.length;
  return {
    matched,
    missing,
    matchScore: total === 0 ? 0 : Math.round((matched.length / total) * 100),
  };
}

/**
 * The keywords that the job description really contains (D-104). The keywords come from the
 * model, and a weak model may list the resume's own skills as "what the job asks for", which
 * makes every keyword match and the score meaningless. A keyword is kept when each of its words
 * occurs in the text, after the same normalization as everywhere else (case, word forms,
 * aliases). The words need not be next to each other: "user-facing products" is found in
 * "user-facing financial technology products".
 */
export function keywordsFoundIn(keywords: readonly string[], text: string): string[] {
  const textWords = new Set(normalizeForMatching(text).split(" "));
  return keywords.filter((keyword) => {
    const words = normalizeForMatching(keyword)
      .split(" ")
      .filter((word) => word !== "");
    return words.length > 0 && words.every((word) => textWords.has(word));
  });
}
