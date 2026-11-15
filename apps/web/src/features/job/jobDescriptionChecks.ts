import { JOB_DESCRIPTION_MAX_CHARS, JOB_DESCRIPTION_MIN_CHARS } from "@tailorcv/shared";

/** The length the server counts: leading and trailing whitespace is ignored. */
export function jobDescriptionLength(text: string): number {
  return text.trim().length;
}

const plural = (n: number, word: string) =>
  `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;

/**
 * Instant check with the shared limits, so the user gets the answer without a request.
 * Returns the message to show, or null when the text can be sent.
 */
export function checkJobDescription(text: string): string | null {
  const length = jobDescriptionLength(text);
  if (length === 0) return "Paste the job description to continue.";
  if (length < JOB_DESCRIPTION_MIN_CHARS) {
    return `The job description needs at least ${JOB_DESCRIPTION_MIN_CHARS} characters (${plural(JOB_DESCRIPTION_MIN_CHARS - length, "more")} to go). Paste the full posting.`;
  }
  if (length > JOB_DESCRIPTION_MAX_CHARS) {
    return `The job description is ${plural(length - JOB_DESCRIPTION_MAX_CHARS, "character")} too long. Remove parts that are not about the role, such as company boilerplate.`;
  }
  return null;
}
