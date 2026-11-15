import { render, screen, within } from "@testing-library/react";
import { sampleResumeNewGrad, sampleResumeSwe } from "@tailorcv/shared/fixtures";
import { describe, expect, it } from "vitest";
import { ResumeView } from "./ResumeView";

describe("ResumeView", () => {
  it("shows every detail of the resume except the internal ids", () => {
    render(<ResumeView resume={sampleResumeSwe} />);
    const resume = screen.getByRole("article", { name: /resume of alex rivera/i });

    const strings: string[] = [];
    JSON.stringify(sampleResumeSwe, (key, value: unknown) => {
      if (typeof value === "string" && key !== "id") strings.push(value);
      return value;
    });
    expect(strings.length).toBeGreaterThan(50);
    for (const text of strings) {
      expect(resume, `missing: ${text}`).toHaveTextContent(text, { normalizeWhitespace: true });
    }
    expect(resume).not.toHaveTextContent("exp_1");
  });

  it("puts details under the right section", () => {
    render(<ResumeView resume={sampleResumeSwe} />);
    const section = (name: string) => within(screen.getByRole("region", { name }));

    expect(section("Experience").getByText("Senior Frontend Engineer")).toBeInTheDocument();
    expect(section("Experience").getByText("Brightpath Analytics · Austin, TX")).toBeVisible();
    expect(section("Experience").getByText("Mar 2022 – Present")).toBeInTheDocument();
    expect(section("Experience").getAllByRole("listitem")).toHaveLength(10);
    expect(section("Education").getByText("B.S. · Computer Science")).toBeInTheDocument();
    expect(section("Skills").getByText("TypeScript, JavaScript, HTML, CSS")).toBeInTheDocument();
    expect(section("Projects").getByText("OpenRecipes")).toBeInTheDocument();
    expect(section("Certifications").getByText("AWS Certified Cloud Practitioner")).toBeVisible();
    expect(section("Languages").getAllByRole("listitem")).toHaveLength(2);
    expect(
      within(screen.getByRole("list", { name: "Contact details" })).getAllByRole("listitem"),
    ).toHaveLength(3);
  });

  it("never renders resume links as clickable links", () => {
    render(<ResumeView resume={sampleResumeSwe} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("skips empty sections and optional fields", () => {
    render(<ResumeView resume={sampleResumeNewGrad} />);
    expect(screen.getByRole("heading", { name: "Jordan Lee" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Experience" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Summary" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Certifications" })).not.toBeInTheDocument();
    expect(screen.getByText("May 2026")).toBeInTheDocument(); // one date only: no dangling dash
    expect(screen.getByRole("article")).not.toHaveTextContent("undefined");
  });

  it("renders a resume with only a name", () => {
    render(
      <ResumeView
        resume={{
          basics: { fullName: "Sam Only", links: [], email: "  " },
          experience: [],
          education: [],
          skills: [{ id: "skill_1", category: "Skills", items: [] }],
          projects: [],
          certifications: [],
          additionalSections: [],
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Sam Only" })).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
});
