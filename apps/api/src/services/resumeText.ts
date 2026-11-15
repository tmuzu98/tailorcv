import type { Resume } from "@tailorcv/shared";

function collect(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) => (key === "id" ? [] : collect(child)));
}

/**
 * Every piece of text in a resume, one string per field or list item, in document order.
 * Ids are left out. Used by the deterministic services (guardrails, keyword matching).
 * The result is resume content: never log it.
 */
export function collectResumeText(resume: Resume): string[] {
  return collect(resume);
}
