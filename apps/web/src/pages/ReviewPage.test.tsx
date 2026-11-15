import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  EMPTY_RESUME_ADDITIONS,
  RESUME_ADDITION_LIMITS,
  type ParseResponse,
  type Resume,
  type ResumeAdditions,
} from "@tailorcv/shared";
import { sampleResumeNewGrad, sampleResumeSwe } from "@tailorcv/shared/fixtures";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../app/AppProviders";
import { routes } from "../app/router";
import { SESSION_STORAGE_KEY } from "../state/sessionContext";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

/** Opens /review with `resume` already in the session (as if it had just been parsed). */
function renderReview(resume: Resume | null, additions?: ResumeAdditions) {
  if (resume) {
    const parsed: ParseResponse = {
      resume,
      meta: { pages: 2, durationMs: 12_300, promptVersion: "parse-v1" },
    };
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ parsed, additions, jobDescription: "", tailorResult: null }),
    );
  }
  const router = createMemoryRouter(routes, { initialEntries: ["/review"] });
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

const NAME_ONLY: Resume = {
  basics: { fullName: "Sam Only", links: [], email: "  " },
  experience: [],
  education: [],
  skills: [{ id: "skill_1", category: "Skills", items: [] }],
  projects: [],
  certifications: [],
  additionalSections: [],
};

beforeEach(() => {
  window.sessionStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => json({ status: "ok", version: "0.1.0", uptimeSec: 1 })),
  );
});
afterEach(() => vi.unstubAllGlobals());

// The footer has its own status element (API indicator), so look inside <main> only.
const main = () => within(screen.getByRole("main"));
const section = (name: string) => within(screen.getByRole("region", { name }));
const stored = () =>
  JSON.parse(window.sessionStorage.getItem(SESSION_STORAGE_KEY) ?? "{}") as {
    additions: ResumeAdditions;
  };

/** Opens an "+ Add …" control, types a value and submits it. */
function add(scope: ReturnType<typeof within>, label: string, value: string) {
  const opener = scope.queryByRole("button", { name: `+ ${label}` });
  if (opener) fireEvent.click(opener);
  fireEvent.change(scope.getByRole("textbox", { name: label }), { target: { value } });
  fireEvent.click(scope.getByRole("button", { name: "Add" }));
}

describe("ReviewPage: compact summary", () => {
  it("shows one line per entry with the section counts", () => {
    renderReview(sampleResumeSwe);
    expect(screen.getByRole("heading", { name: "Experience (3)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Education (1)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Skills (14)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Projects (1)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Certifications (1)" })).toBeInTheDocument();

    expect(section("Contact")).toBeTruthy();
    expect(section("Contact").getByText("Alex Rivera")).toBeInTheDocument();
    expect(section("Contact").getByText("alex.rivera@example.com")).toBeInTheDocument();
    expect(section("Experience").getByText("Senior Frontend Engineer")).toBeInTheDocument();
    expect(section("Experience").getByText("· Brightpath Analytics · Austin, TX")).toBeVisible();
    expect(section("Experience").getByText("Mar 2022 – Present")).toBeInTheDocument();
    expect(section("Education").getByText("· B.S. · Computer Science")).toBeInTheDocument();
    expect(section("Skills").getByText("TypeScript, JavaScript, HTML, CSS")).toBeInTheDocument();
    expect(
      section("Certifications").getByText(
        "AWS Certified Cloud Practitioner · Amazon Web Services · 2021",
      ),
    ).toBeInTheDocument();
    expect(section("Other").getByText("English, Spanish")).toBeInTheDocument();
  });

  it("folds the long text away: bullet points and the summary are collapsed", () => {
    renderReview(sampleResumeSwe);
    const fold = section("Experience").getByText("5 bullet points").closest("details");
    expect(fold).not.toBeNull();
    expect(fold).not.toHaveAttribute("open");
    expect(fold).toHaveTextContent("Improved Lighthouse performance score from 54 to 91.");
    expect(section("Experience").getByText("3 bullet points")).toBeInTheDocument();
    expect(section("Experience").getByText("2 bullet points")).toBeInTheDocument();
    expect(section("Education").getByText("1 detail")).toBeInTheDocument();
    expect(section("Contact").getByText("Summary (20 words)").closest("details")).toHaveTextContent(
      "Frontend engineer with 6 years of experience",
    );
  });

  it("still contains every detail of the parsed resume, and no ids or clickable links", () => {
    renderReview(sampleResumeSwe);
    const page = screen.getByRole("main");
    const strings: string[] = [];
    JSON.stringify(sampleResumeSwe, (key, value: unknown) => {
      if (typeof value === "string" && key !== "id" && key !== "label") strings.push(value);
      return value;
    });
    for (const text of strings) {
      expect(page, `missing: ${text}`).toHaveTextContent(text, { normalizeWhitespace: true });
    }
    expect(page).not.toHaveTextContent("exp_1");
    expect(main().queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows the counts line and no warning when nothing is missing", () => {
    renderReview(sampleResumeSwe);
    expect(screen.getByTestId("parsed-summary")).toHaveTextContent(
      "3 jobs · 10 bullet points · 1 education entry · 14 skills · 1 project · 1 certification · 2 pages read in 12.3 s",
    );
    expect(main().queryByRole("status")).not.toBeInTheDocument();
    expect(main().queryByText(/added by you/i)).not.toBeInTheDocument();
  });

  it("handles a sparse resume and a resume with only a name", () => {
    renderReview(NAME_ONLY);
    expect(section("Contact").getByText("Sam Only")).toBeInTheDocument();
    expect(section("Experience").getByText(/no work experience found/i)).toBeInTheDocument();
    expect(section("Education").getByText(/no education found/i)).toBeInTheDocument();
    expect(section("Skills").getByText(/no skills found/i)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Projects" })).not.toBeInTheDocument();
    expect(main().getByRole("status")).toHaveTextContent(
      "We couldn't find: email, phone number, work experience, education, skills",
    );
    expect(screen.getByRole("main")).not.toHaveTextContent("undefined");
  });
});

describe("ReviewPage: adding details", () => {
  it("offers to add only the contact details the PDF didn't have", () => {
    renderReview(sampleResumeNewGrad); // has email + location; no phone, no headline
    const contact = section("Contact");
    expect(contact.getByRole("button", { name: "+ Add phone" })).toBeInTheDocument();
    expect(contact.getByRole("button", { name: "+ Add headline" })).toBeInTheDocument();
    expect(contact.queryByRole("button", { name: "+ Add email" })).not.toBeInTheDocument();
    expect(contact.queryByRole("button", { name: "+ Add location" })).not.toBeInTheDocument();
  });

  it("adds a missing phone number: shown as added, warning gone, saved in the session", async () => {
    renderReview(sampleResumeNewGrad);
    expect(main().getByRole("status")).toHaveTextContent("We couldn't find: phone number");

    add(section("Contact"), "Add phone", "  (555) 010-1234  ");

    expect(section("Contact").getByText("(555) 010-1234")).toBeInTheDocument();
    expect(section("Contact").getByText("Added by you")).toBeInTheDocument();
    expect(main().queryByRole("status")).not.toBeInTheDocument();
    expect(main().getByText(/only add things that are true/i)).toBeInTheDocument();
    await waitFor(() => expect(stored().additions.basics.phone).toBe("(555) 010-1234"));

    fireEvent.click(section("Contact").getByRole("button", { name: "Remove phone" }));
    expect(section("Contact").queryByText("(555) 010-1234")).not.toBeInTheDocument();
    expect(main().getByRole("status")).toHaveTextContent("We couldn't find: phone number");
  });

  it("adds several skills in a row, updates the counts, and removes one", async () => {
    renderReview(sampleResumeSwe);
    const skills = section("Skills");
    add(skills, "Add a skill", "Docker");
    add(skills, "Add a skill", "GraphQL"); // the form stays open

    const added = within(skills.getByRole("list", { name: "Skills you added" }));
    expect(added.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Skills (16)" })).toBeInTheDocument();
    expect(screen.getByTestId("parsed-summary")).toHaveTextContent("16 skills");
    await waitFor(() => expect(stored().additions.skills).toEqual(["Docker", "GraphQL"]));

    fireEvent.click(skills.getByRole("button", { name: "Remove skill: Docker" }));
    expect(added.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByTestId("parsed-summary")).toHaveTextContent("15 skills");
  });

  it("refuses a skill that is already listed (any letter case) and ignores blank input", () => {
    renderReview(sampleResumeSwe);
    const skills = section("Skills");
    add(skills, "Add a skill", "typescript");
    expect(skills.getByRole("alert")).toHaveTextContent('"typescript" is already listed.');
    expect(skills.queryByRole("list", { name: "Skills you added" })).not.toBeInTheDocument();

    fireEvent.change(skills.getByRole("textbox", { name: "Add a skill" }), {
      target: { value: "   " },
    });
    expect(skills.queryByRole("alert")).not.toBeInTheDocument(); // typing clears the error
    expect(skills.getByRole("button", { name: "Add" })).toBeDisabled();

    add(skills, "Add a skill", "Docker");
    add(skills, "Add a skill", "DOCKER");
    expect(skills.getByRole("alert")).toHaveTextContent("already listed");
    expect(skills.getByRole("textbox", { name: "Add a skill" })).toHaveAttribute(
      "maxlength",
      String(RESUME_ADDITION_LIMITS.maxSkillChars),
    );
  });

  it("adds a bullet point to the right job and can remove it", async () => {
    renderReview(sampleResumeSwe);
    const experience = section("Experience");
    add(experience, "Add a bullet point to Software Engineer", "Ran the on-call rotation.");

    expect(experience.getByText("Ran the on-call rotation.")).toBeInTheDocument();
    expect(screen.getByTestId("parsed-summary")).toHaveTextContent("11 bullet points");
    await waitFor(() =>
      expect(stored().additions.bullets).toEqual([
        { experienceId: "exp_2", text: "Ran the on-call rotation." },
      ]),
    );

    fireEvent.click(
      experience.getByRole("button", { name: "Remove bullet point: Ran the on-call rotation." }),
    );
    expect(experience.queryByText("Ran the on-call rotation.")).not.toBeInTheDocument();
    expect(screen.getByTestId("parsed-summary")).toHaveTextContent("10 bullet points");
  });

  it("adds a certification (issuer and date optional) and can remove it", async () => {
    renderReview(sampleResumeNewGrad);
    const certs = section("Certifications");
    expect(screen.getByRole("heading", { name: "Certifications (0)" })).toBeInTheDocument();

    fireEvent.click(certs.getByRole("button", { name: "+ Add a certification" }));
    expect(certs.getByRole("button", { name: "Add" })).toBeDisabled();
    fireEvent.change(certs.getByRole("textbox", { name: "Certification name" }), {
      target: { value: "Google Data Analytics" },
    });
    fireEvent.change(certs.getByRole("textbox", { name: "Date (optional)" }), {
      target: { value: "2025" },
    });
    fireEvent.click(certs.getByRole("button", { name: "Add" }));

    expect(certs.getByText("Google Data Analytics · 2025")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Certifications (1)" })).toBeInTheDocument();
    expect(certs.getByRole("textbox", { name: "Certification name" })).toHaveValue("");
    await waitFor(() =>
      expect(stored().additions.certifications).toEqual([
        { name: "Google Data Analytics", date: "2025" },
      ]),
    );

    fireEvent.click(
      certs.getByRole("button", { name: "Remove certification: Google Data Analytics" }),
    );
    expect(screen.getByRole("heading", { name: "Certifications (0)" })).toBeInTheDocument();
  });

  it("'Done' closes an add form without adding anything", () => {
    renderReview(sampleResumeSwe);
    const skills = section("Skills");
    fireEvent.click(skills.getByRole("button", { name: "+ Add a skill" }));
    fireEvent.change(skills.getByRole("textbox", { name: "Add a skill" }), {
      target: { value: "Docker" },
    });
    fireEvent.click(skills.getByRole("button", { name: "Done" }));
    expect(skills.queryByRole("textbox")).not.toBeInTheDocument();
    expect(skills.queryByText("Docker")).not.toBeInTheDocument();
  });

  it("restores additions after a page refresh", () => {
    renderReview(sampleResumeSwe, {
      ...EMPTY_RESUME_ADDITIONS,
      skills: ["Docker"],
      certifications: [{ name: "Scrum Master" }],
    });
    expect(section("Skills").getByText("Docker")).toBeInTheDocument();
    expect(section("Certifications").getByText("Scrum Master")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Certifications (2)" })).toBeInTheDocument();
  });
});

describe("ReviewPage: navigation", () => {
  it("continues to the job description step and keeps the resume and the additions", async () => {
    const router = renderReview(sampleResumeSwe);
    add(section("Skills"), "Add a skill", "Docker");
    fireEvent.click(screen.getByRole("button", { name: /looks good, continue/i }));
    expect(router.state.location.pathname).toBe("/job");
    await waitFor(() => expect(stored().additions.skills).toEqual(["Docker"]));
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toContain("Alex Rivera");
  });

  it("'Upload a different file' clears the session and returns to the upload page", async () => {
    const router = renderReview(sampleResumeSwe);
    add(section("Skills"), "Add a skill", "Docker");
    fireEvent.click(screen.getByRole("button", { name: /upload a different file/i }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(await screen.findByRole("heading", { name: /upload your resume/i })).toBeInTheDocument();
    await waitFor(() => expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull());
  });

  it("sends the user back to upload when there is no parsed resume", async () => {
    const router = renderReview(null);
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  });
});
