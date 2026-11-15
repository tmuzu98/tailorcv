/**
 * The steps shown while tailoring runs. Time-based in the MVP (Tech Design §6.4): the server
 * answers in one piece, so the step is a guess from the elapsed time. Real progress comes with
 * the streamed endpoint in Phase 2.
 */
export const TAILOR_STEPS = [
  "Analyzing job description…",
  "Tailoring your resume…",
  "Checking accuracy…",
] as const;

/** Seconds after which each later step starts (Claude answers in roughly 8–16 s). */
const STEP_STARTS = [4, 12] as const;

/** After this long the wait is unusual for Claude and normal for a local model: say so. */
export const SLOW_AFTER_SECONDS = 30;

/** Index of the step in progress; the last step stays active until the answer arrives. */
export function activeStep(seconds: number): number {
  return STEP_STARTS.filter((start) => seconds >= start).length;
}
