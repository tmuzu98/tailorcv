/** Time-based progress copy for the parse (real streamed progress comes in Phase 2). */
export function progressMessage(seconds: number): string {
  if (seconds < 8) return "Reading your resume…";
  if (seconds < 25) return "Pulling out your experience, education and skills…";
  return "Still working. Local AI models can take up to a minute…";
}
