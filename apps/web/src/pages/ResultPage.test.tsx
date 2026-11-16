import { fireEvent, render, screen, within } from "@testing-library/react";
import type { TailorResponse } from "@tailorcv/shared";
import { sampleResumeSwe, sampleTailorResultSweFrontend } from "@tailorcv/shared/fixtures";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../app/AppProviders";
import { routes } from "../app/router";
import { SESSION_STORAGE_KEY } from "../state/sessionContext";

const RESULT: TailorResponse = {
  ...sampleTailorResultSweFrontend,
  keywordAnalysis: { ...sampleTailorResultSweFrontend.keywordAnalysis, matchScoreBefore: 55 },
  meta: { durationMs: 12_000, promptVersion: "tailor-v2" },
};

function renderResult(result: TailorResponse | null = RESULT) {
  window.sessionStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      parsed: {
        resume: sampleResumeSwe,
        meta: { pages: 1, durationMs: 1000, promptVersion: "parse-v1" },
      },
      jobDescription: "A job description",
      tailorResult: result,
    }),
  );
  const router = createMemoryRouter(routes, { initialEntries: ["/result"] });
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

const tab = (name: RegExp) => screen.getByRole("tab", { name });
const stored = () => JSON.parse(window.sessionStorage.getItem(SESSION_STORAGE_KEY) ?? "{}");

beforeEach(() => {
  window.sessionStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ status: "ok", version: "0.1.0", uptimeSec: 1 }), {
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("ResultPage: header and preview", () => {
  it("without a result it sends the user back to the job step", () => {
    expect(renderResult(null).state.location.pathname).toBe("/job");
  });

  it("shows the job title and company the resume was tailored for", () => {
    renderResult();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(/senior frontend engineer/i);
    expect(heading).toHaveTextContent(/northwind health/i);
  });

  it("falls back to a plain heading when the job has no title or company", () => {
    renderResult({ ...RESULT, jobSummary: { topRequirements: [] } });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/your tailored resume/i);
  });

  it("previews the tailored resume, not the original", () => {
    renderResult();
    const preview = screen.getByRole("article", { name: /resume of/i });
    expect(within(preview).getByText(/raising the lighthouse score from 54 to 91/i)).toBeVisible();
    expect(
      within(preview).queryByText("Improved Lighthouse performance score from 54 to 91."),
    ).toBe(null);
  });
});

describe("ResultPage: warnings", () => {
  it("shows no warnings banner when there are none", () => {
    renderResult();
    expect(screen.queryByText(/we kept some of your original text/i)).toBeNull();
  });

  it("lists every guardrail warning in one banner", () => {
    renderResult({ ...RESULT, warnings: ["Warning one.", "Warning two."] });
    const banner = screen.getByText(/we kept some of your original text/i).closest("[role]")!;
    expect(within(banner as HTMLElement).getByText("Warning one.")).toBeInTheDocument();
    expect(within(banner as HTMLElement).getByText("Warning two.")).toBeInTheDocument();
  });
});

describe("ResultPage: changes tab", () => {
  it("opens on the changes tab with the count in its name", () => {
    renderResult();
    expect(tab(/changes \(3\)/i)).toHaveAttribute("aria-selected", "true");
  });

  it("groups changes by section with before, after and reason", () => {
    renderResult();
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByRole("heading", { name: "Summary" })).toBeInTheDocument();
    expect(within(panel).getByRole("heading", { name: "Experience" })).toBeInTheDocument();
    expect(
      within(panel).getByText("Improved Lighthouse performance score from 54 to 91."),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(/uses the job's wording \('frontend performance'\)/i),
    ).toBeInTheDocument();
  });

  it("shows the moved item's text for a reorder", () => {
    renderResult();
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText(/moved the component library bullet first/i)).toBeVisible();
    expect(within(panel).getByText(/introduced a shared react component library/i)).toBeVisible();
  });

  it("says so when nothing changed", () => {
    renderResult({ ...RESULT, changes: [] });
    expect(screen.getByRole("tabpanel")).toHaveTextContent(/no changes were needed/i);
  });
});

describe("ResultPage: keywords tab", () => {
  const openKeywords = () => fireEvent.click(tab(/keywords/i));

  it("shows the score before → after", () => {
    renderResult();
    openKeywords();
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText(/67/)).toBeInTheDocument();
    expect(within(panel).getByText(/up from 55/i)).toBeInTheDocument();
  });

  it("shows only the score when the result has no before score", () => {
    renderResult({ ...RESULT, keywordAnalysis: sampleTailorResultSweFrontend.keywordAnalysis });
    openKeywords();
    expect(screen.getByRole("tabpanel")).not.toHaveTextContent(/from \d+/i);
  });

  it("lists matched and missing keywords separately", () => {
    renderResult();
    openKeywords();
    const matched = screen.getByRole("list", { name: /matched keywords/i });
    const missing = screen.getByRole("list", { name: /missing keywords/i });
    expect(within(matched).getByText("React")).toBeInTheDocument();
    expect(within(missing).getByText("GraphQL")).toBeInTheDocument();
    expect(within(matched).queryByText("GraphQL")).toBeNull();
    expect(within(missing).queryByText("React")).toBeNull();
  });

  it("missing keywords offer to add real experience on the review page", () => {
    const router = renderResult();
    openKeywords();
    expect(screen.getByText(/not found in your resume/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /add it on the review page/i }));
    expect(router.state.location.pathname).toBe("/review");
  });

  it("says so when no keyword is missing", () => {
    renderResult({ ...RESULT, keywordAnalysis: { ...RESULT.keywordAnalysis, missing: [] } });
    openKeywords();
    expect(screen.getByRole("tabpanel")).toHaveTextContent(/every keyword we found/i);
  });

  it("supports arrow keys between tabs", () => {
    renderResult();
    fireEvent.keyDown(tab(/changes/i), { key: "ArrowRight" });
    expect(tab(/keywords/i)).toHaveAttribute("aria-selected", "true");
    expect(tab(/keywords/i)).toHaveFocus();
  });
});

describe("ResultPage: actions", () => {
  it("'Change job description' goes back to the job step and keeps the result", () => {
    const router = renderResult();
    fireEvent.click(screen.getByRole("button", { name: /change job description/i }));
    expect(router.state.location.pathname).toBe("/job");
    expect(stored().tailorResult).not.toBeNull();
  });
});
