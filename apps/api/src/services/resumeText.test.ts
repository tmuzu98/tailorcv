import { describe, expect, it } from "vitest";
import type { Resume } from "@tailorcv/shared";
import { sampleResumeNewGrad, sampleResumeSwe } from "@tailorcv/shared/fixtures";
import { collectResumeText } from "./resumeText";

describe("collectResumeText", () => {
  it("returns every piece of text in document order", () => {
    const texts = collectResumeText(sampleResumeSwe);

    expect(texts[0]).toBe("Alex Rivera");
    expect(texts).toContain("Brightpath Analytics");
    expect(texts).toContain("Improved Lighthouse performance score from 54 to 91.");
    expect(texts).toContain("IndexedDB");
    expect(texts).toContain("AWS Certified Cloud Practitioner");
    expect(texts).toContain("Spanish");
  });

  it("leaves out ids", () => {
    const texts = collectResumeText(sampleResumeSwe);
    expect(texts.some((text) => /^(exp|edu|skill|proj|cert|add)_\d/.test(text))).toBe(false);
  });

  it("skips optional fields that are missing or explicitly undefined", () => {
    const resume: Resume = {
      ...sampleResumeNewGrad,
      basics: { ...sampleResumeNewGrad.basics, headline: undefined },
    };
    expect(collectResumeText(resume)).toEqual(collectResumeText(sampleResumeNewGrad));
  });
});
