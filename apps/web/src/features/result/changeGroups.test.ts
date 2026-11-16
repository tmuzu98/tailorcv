import type { Change } from "@tailorcv/shared";
import { sampleResumeSwe } from "@tailorcv/shared/fixtures";
import { describe, expect, it } from "vitest";
import { findItemText, groupChanges, scoreDelta } from "./changeGroups";

const change = (over: Partial<Change>): Change => ({
  section: "experience",
  type: "reworded",
  reason: "A reason.",
  ...over,
});

describe("groupChanges", () => {
  it("groups changes by section in resume order and skips empty sections", () => {
    const groups = groupChanges(
      [
        change({ section: "skills", reason: "s" }),
        change({ section: "summary", reason: "a" }),
        change({ section: "experience", reason: "e1" }),
        change({ section: "experience", reason: "e2" }),
      ],
      sampleResumeSwe,
    );
    expect(groups.map((g) => g.title)).toEqual(["Summary", "Experience", "Skills"]);
    expect(groups[1]?.changes.map((c) => c.reason)).toEqual(["e1", "e2"]);
  });

  it("returns no groups for no changes", () => {
    expect(groupChanges([], sampleResumeSwe)).toEqual([]);
  });

  it("adds the text of the target item when the change has no before/after (a reorder)", () => {
    const [group] = groupChanges(
      [change({ type: "reordered", targetId: "exp_1_b3" })],
      sampleResumeSwe,
    );
    expect(group?.changes[0]?.targetText).toMatch(/component library/i);
  });

  it("leaves targetText out when the id is unknown", () => {
    const [group] = groupChanges(
      [change({ type: "reordered", targetId: "nope" })],
      sampleResumeSwe,
    );
    expect(group?.changes[0]?.targetText).toBeUndefined();
  });
});

describe("findItemText", () => {
  it("finds a bullet, a job and a skill group by id", () => {
    const job = sampleResumeSwe.experience[0]!;
    const bullet = job.bullets[0]!;
    const group = sampleResumeSwe.skills[0]!;
    expect(findItemText(sampleResumeSwe, bullet.id)).toBe(bullet.text);
    expect(findItemText(sampleResumeSwe, job.id)).toBe(`${job.title}, ${job.company}`);
    expect(findItemText(sampleResumeSwe, group.id)).toBe(
      `${group.category}: ${group.items.join(", ")}`,
    );
  });

  it("returns undefined for an unknown id", () => {
    expect(findItemText(sampleResumeSwe, "missing")).toBeUndefined();
  });
});

describe("scoreDelta", () => {
  it("is the difference when the before score is known", () => {
    expect(scoreDelta({ matched: [], missing: [], matchScore: 70, matchScoreBefore: 55 })).toBe(15);
    expect(scoreDelta({ matched: [], missing: [], matchScore: 50, matchScoreBefore: 50 })).toBe(0);
  });

  it("is undefined without a before score (older results)", () => {
    expect(scoreDelta({ matched: [], missing: [], matchScore: 70 })).toBeUndefined();
  });
});
