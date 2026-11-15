import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  EMPTY_RESUME_ADDITIONS,
  JOB_DESCRIPTION_MAX_CHARS,
  JOB_DESCRIPTION_MIN_CHARS,
  TailorRequestSchema,
  applyResumeAdditions,
  type ResumeAdditions,
  type TailorResponse,
} from "@tailorcv/shared";
import {
  jdFrontendEngineer,
  sampleResumeSwe,
  sampleTailorResultSweFrontend,
} from "@tailorcv/shared/fixtures";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../app/AppProviders";
import { routes } from "../app/router";
import { TAILOR_STEPS } from "../features/job/tailorSteps";
import { SESSION_STORAGE_KEY } from "../state/sessionContext";

const RESULT: TailorResponse = {
  ...sampleTailorResultSweFrontend,
  meta: { durationMs: 12_000, promptVersion: "tailor-v2" },
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const apiError = (code: string, status: number, details?: Record<string, unknown>) =>
  json({ error: { code, message: "server message", requestId: "req_test_1", details } }, status);

/** Routes fetch by URL: health always ok; tailor calls go to `onTailor`. */
function mockApi(onTailor: (init: RequestInit) => Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      if (url.endsWith("/health")) return json({ status: "ok", version: "0.1.0", uptimeSec: 1 });
      calls.push({ url, init });
      return onTailor(init);
    }),
  );
  return calls;
}

function renderJob(
  session: { jobDescription?: string; additions?: ResumeAdditions; noResume?: boolean } = {},
) {
  if (!session.noResume) {
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        parsed: {
          resume: sampleResumeSwe,
          meta: { pages: 1, durationMs: 1000, promptVersion: "parse-v1" },
        },
        additions: session.additions ?? EMPTY_RESUME_ADDITIONS,
        jobDescription: session.jobDescription ?? "",
        tailorResult: null,
      }),
    );
  }
  const router = createMemoryRouter(routes, { initialEntries: ["/job"] });
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

const stored = () => JSON.parse(window.sessionStorage.getItem(SESSION_STORAGE_KEY) ?? "{}");
const textarea = () => screen.getByLabelText(/job description/i);
const type = (text: string) => fireEvent.change(textarea(), { target: { value: text } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: /tailor my resume/i }));
const count = (n: number) =>
  `${n.toLocaleString("en-US")} / ${JOB_DESCRIPTION_MAX_CHARS.toLocaleString("en-US")} characters`;

beforeEach(() => window.sessionStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("JobDescriptionPage: the form", () => {
  it("shows the heading, an empty textarea and the limits", () => {
    mockApi(async () => json(RESULT));
    renderJob();
    expect(screen.getByRole("heading", { name: /paste the job description/i })).toBeInTheDocument();
    expect(textarea()).toHaveValue("");
    expect(screen.getByText(count(0))).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`at least ${JOB_DESCRIPTION_MIN_CHARS} characters`, "i")),
    ).toBeInTheDocument();
  });

  it("without a parsed resume it sends the user back to the upload step", () => {
    mockApi(async () => json(RESULT));
    expect(renderJob({ noResume: true }).state.location.pathname).toBe("/");
  });

  it("counts characters live, ignoring leading and trailing space (as the server does)", () => {
    mockApi(async () => json(RESULT));
    renderJob();
    type("  hello world \n");
    expect(screen.getByText(count(11))).toBeInTheDocument();
  });

  it("keeps the text in the session, so a refresh or going back does not lose it", async () => {
    mockApi(async () => json(RESULT));
    renderJob();
    type(jdFrontendEngineer);
    await waitFor(() => expect(stored().jobDescription).toBe(jdFrontendEngineer));
  });

  it("starts with the text already in the session", () => {
    mockApi(async () => json(RESULT));
    renderJob({ jobDescription: jdFrontendEngineer });
    expect(textarea()).toHaveValue(jdFrontendEngineer);
    expect(screen.getByText(count(jdFrontendEngineer.trim().length))).toBeInTheDocument();
  });

  it("links back to the review step", () => {
    mockApi(async () => json(RESULT));
    const router = renderJob();
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(router.state.location.pathname).toBe("/review");
  });
});

describe("JobDescriptionPage: validation (no request is sent)", () => {
  it("does not complain before the user has tried to submit", () => {
    mockApi(async () => json(RESULT));
    renderJob();
    type("too short");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(textarea()).not.toHaveAttribute("aria-invalid", "true");
  });

  it("empty → asks for a job description", () => {
    const calls = mockApi(async () => json(RESULT));
    renderJob();
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent(/paste the job description/i);
    expect(textarea()).toHaveAttribute("aria-invalid", "true");
    expect(calls).toHaveLength(0);
  });

  it("too short → says how many characters are needed", () => {
    const calls = mockApi(async () => json(RESULT));
    renderJob();
    type("x".repeat(JOB_DESCRIPTION_MIN_CHARS - 1));
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent(
      `at least ${JOB_DESCRIPTION_MIN_CHARS} characters`,
    );
    expect(calls).toHaveLength(0);
  });

  it("too long → says by how much", () => {
    const calls = mockApi(async () => json(RESULT));
    renderJob();
    type("x".repeat(JOB_DESCRIPTION_MAX_CHARS + 25));
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent(/25 characters too long/i);
    expect(calls).toHaveLength(0);
  });

  it("the message clears as soon as the text becomes valid", () => {
    mockApi(async () => json(RESULT));
    renderJob();
    submit();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    type(jdFrontendEngineer);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("JobDescriptionPage: tailoring", () => {
  it("POSTs the resume and the job description as JSON to /api/v1/resumes/tailor", async () => {
    const calls = mockApi(async () => json(RESULT));
    renderJob({ jobDescription: jdFrontendEngineer });
    submit();
    await waitFor(() => expect(calls).toHaveLength(1));
    const call = calls[0];
    expect(call?.url).toBe("/api/v1/resumes/tailor");
    expect(call?.init.method).toBe("POST");
    expect(new Headers(call?.init.headers).get("Content-Type")).toBe("application/json");
    const body = TailorRequestSchema.parse(JSON.parse(String(call?.init.body)));
    expect(body.jobDescription).toBe(jdFrontendEngineer.trim());
    expect(body.resume).toEqual(sampleResumeSwe);
  });

  it("sends the resume WITH the user's additions from the review page (D-85)", async () => {
    const additions: ResumeAdditions = { ...EMPTY_RESUME_ADDITIONS, skills: ["Docker"] };
    const calls = mockApi(async () => json(RESULT));
    renderJob({ jobDescription: jdFrontendEngineer, additions });
    submit();
    await waitFor(() => expect(calls).toHaveLength(1));
    const body = JSON.parse(String(calls[0]?.init.body));
    expect(body.resume).toEqual(applyResumeAdditions(sampleResumeSwe, additions));
    expect(JSON.stringify(body.resume.skills)).toContain("Docker");
  });

  it("shows the three steps while waiting, and hides the form", async () => {
    let finish: (r: Response) => void = () => {};
    mockApi(() => new Promise((resolve) => (finish = resolve)));
    renderJob({ jobDescription: jdFrontendEngineer });
    submit();
    // (The layout has its own role="status" for the API indicator: find ours by its content.)
    const status = (await screen.findByText(TAILOR_STEPS[0])).closest('[role="status"]');
    for (const step of TAILOR_STEPS) expect(status).toHaveTextContent(step);
    expect(screen.getByText(TAILOR_STEPS[0]).closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.queryByRole("button", { name: /tailor my resume/i })).not.toBeInTheDocument();
    await act(async () => finish(json(RESULT)));
  });

  it("on success stores the result and lands on /result", async () => {
    mockApi(async () => json(RESULT));
    const router = renderJob({ jobDescription: jdFrontendEngineer });
    submit();
    await waitFor(() => expect(router.state.location.pathname).toBe("/result"));
    expect(stored().tailorResult).toEqual(RESULT);
  });

  it("Cancel aborts the request and brings the form back with the text kept", async () => {
    let signal: AbortSignal | undefined;
    mockApi(
      (init) =>
        new Promise((_resolve, reject) => {
          signal = init.signal ?? undefined;
          signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const router = renderJob({ jobDescription: jdFrontendEngineer });
    submit();
    fireEvent.click(await screen.findByRole("button", { name: /cancel/i }));
    expect(signal?.aborted).toBe(true);
    expect(await screen.findByRole("button", { name: /tailor my resume/i })).toBeInTheDocument();
    expect(textarea()).toHaveValue(jdFrontendEngineer);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/job");
  });
});

describe("JobDescriptionPage: errors from the API", () => {
  it("an AI error shows friendly copy, the reference, and Try again works", async () => {
    let attempt = 0;
    const calls = mockApi(async () =>
      ++attempt === 1 ? apiError("AI_TIMEOUT", 504) : json(RESULT),
    );
    const router = renderJob({ jobDescription: jdFrontendEngineer });
    submit();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/took too long/i);
    expect(alert).toHaveTextContent("req_test_1");
    expect(textarea()).toHaveValue(jdFrontendEngineer);

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/result"));
    expect(calls).toHaveLength(2);
  });

  it("rate limited → says when to come back, with no Try again button", async () => {
    mockApi(async () => apiError("RATE_LIMITED", 429, { retryAfterSec: 600 }));
    renderJob({ jobDescription: jdFrontendEngineer });
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(/about 10 minutes/i);
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("a server validation error on the job description shows the server's field message", async () => {
    mockApi(async () =>
      apiError("VALIDATION_ERROR", 400, {
        fields: [
          { path: "jobDescription", message: "Job description must be at least 100 characters" },
        ],
      }),
    );
    renderJob({ jobDescription: jdFrontendEngineer });
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Job description must be at least 100 characters",
    );
  });

  it("the API being unreachable is reported, not an endless spinner", async () => {
    mockApi(async () => {
      throw new TypeError("Failed to fetch");
    });
    renderJob({ jobDescription: jdFrontendEngineer });
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(/can't reach tailorcv/i);
  });
});
