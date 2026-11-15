import { JOB_DESCRIPTION_MAX_CHARS, JOB_DESCRIPTION_MIN_CHARS } from "@tailorcv/shared";
import { describe, expect, it } from "vitest";
import { checkJobDescription } from "./jobDescriptionChecks";
import { SLOW_AFTER_SECONDS, TAILOR_STEPS, activeStep } from "./tailorSteps";

describe("tailor steps (time-based in the MVP)", () => {
  it("has the three steps from the plan, in order", () => {
    expect(TAILOR_STEPS).toEqual([
      "Analyzing job description…",
      "Tailoring your resume…",
      "Checking accuracy…",
    ]);
  });

  it("moves forward with time and stays on the last step", () => {
    expect(activeStep(0)).toBe(0);
    expect(activeStep(3)).toBe(0);
    expect(activeStep(4)).toBe(1);
    expect(activeStep(11)).toBe(1);
    expect(activeStep(12)).toBe(2);
    expect(activeStep(SLOW_AFTER_SECONDS + 100)).toBe(2);
  });
});

describe("checkJobDescription", () => {
  it("accepts text within the shared limits, counted after trimming", () => {
    expect(checkJobDescription("x".repeat(JOB_DESCRIPTION_MIN_CHARS))).toBeNull();
    expect(checkJobDescription("x".repeat(JOB_DESCRIPTION_MAX_CHARS))).toBeNull();
    expect(checkJobDescription(`  ${"x".repeat(JOB_DESCRIPTION_MAX_CHARS)}  `)).toBeNull();
  });

  it("rejects empty or whitespace-only text", () => {
    expect(checkJobDescription("")).toMatch(/paste the job description/i);
    expect(checkJobDescription("   \n ")).toMatch(/paste the job description/i);
  });

  it("rejects text that is too short, naming the minimum and what is missing", () => {
    const message = checkJobDescription("x".repeat(JOB_DESCRIPTION_MIN_CHARS - 10));
    expect(message).toContain(`at least ${JOB_DESCRIPTION_MIN_CHARS} characters`);
    expect(message).toContain("10 more");
  });

  it("rejects text that is too long, saying by how much", () => {
    expect(checkJobDescription("x".repeat(JOB_DESCRIPTION_MAX_CHARS + 1))).toMatch(
      /1 character too long/,
    );
    expect(checkJobDescription("x".repeat(JOB_DESCRIPTION_MAX_CHARS + 2))).toMatch(
      /2 characters too long/,
    );
  });
});
