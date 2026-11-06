import { act, render, screen } from "@testing-library/react";
import { sampleResumeSwe, sampleTailorResultSweFrontend } from "@tailorcv/shared/fixtures";
import type { ParseResponse, TailorResponse } from "@tailorcv/shared";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../app/AppProviders";
import { routes } from "../app/router";
import { SessionProvider } from "./session";
import { SESSION_STORAGE_KEY, useSession, type SessionValue } from "./sessionContext";

const parsed: ParseResponse = {
  resume: sampleResumeSwe,
  meta: { pages: 1, durationMs: 1000, promptVersion: "parse-v1" },
};
const tailored: TailorResponse = {
  ...sampleTailorResultSweFrontend,
  meta: { durationMs: 2000, promptVersion: "tailor-v1" },
} as TailorResponse;

/** Renders a probe that exposes the session API to the test. */
function renderSession() {
  let api: SessionValue | undefined;
  function Probe() {
    api = useSession();
    return <span data-testid="name">{api.parsed?.resume.basics.fullName ?? "none"}</span>;
  }
  const utils = render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );
  return { ...utils, api: () => api as SessionValue };
}

beforeEach(() => window.sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("session store", () => {
  it("starts empty and stores a parsed resume", () => {
    const { api } = renderSession();
    expect(screen.getByTestId("name")).toHaveTextContent("none");
    act(() => api().setParsed(parsed));
    expect(screen.getByTestId("name")).toHaveTextContent(sampleResumeSwe.basics.fullName);
  });

  it("mirrors to sessionStorage and restores after a reload", () => {
    const first = renderSession();
    act(() => {
      first.api().setParsed(parsed);
      first.api().setJobDescription("Senior frontend role");
    });
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toContain("Senior frontend role");
    first.unmount();

    const second = renderSession(); // simulates a page refresh
    expect(second.api().parsed?.resume.basics.fullName).toBe(sampleResumeSwe.basics.fullName);
    expect(second.api().jobDescription).toBe("Senior frontend role");
  });

  it("a new resume clears the previous tailoring result", () => {
    const { api } = renderSession();
    act(() => {
      api().setParsed(parsed);
      api().setTailorResult(tailored);
    });
    expect(api().tailorResult).not.toBeNull();
    act(() => api().setParsed(parsed));
    expect(api().tailorResult).toBeNull();
  });

  it("reset() clears memory and storage", () => {
    const { api } = renderSession();
    act(() => api().setParsed(parsed));
    act(() => api().reset());
    expect(api().parsed).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("ignores corrupt or outdated stored data", () => {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, "{not json");
    expect(renderSession().api().parsed).toBeNull();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ parsed: { wrong: true } }));
    const { api, unmount } = renderSession();
    expect(api().parsed).toBeNull();
    unmount();
  });

  it("keeps working in memory when storage throws (private mode / quota)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const { api } = renderSession();
    act(() => api().setParsed(parsed));
    expect(screen.getByTestId("name")).toHaveTextContent(sampleResumeSwe.basics.fullName);
  });

  it("useSession outside the provider fails loudly", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    function Orphan() {
      useSession();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(/SessionProvider/);
  });
});

describe("route guards", () => {
  beforeEach(() => {
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

  function renderAt(path: string) {
    const router = createMemoryRouter(routes, { initialEntries: [path] });
    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );
    return router;
  }
  const store = (data: object) =>
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ parsed: null, jobDescription: "", tailorResult: null, ...data }),
    );

  it.each(["/review", "/job", "/result"])(
    "%s without a parsed resume → back to upload (/)",
    (path) => {
      const router = renderAt(path);
      expect(router.state.location.pathname).toBe("/");
      expect(screen.getByRole("heading", { name: /upload your resume/i })).toBeInTheDocument();
    },
  );

  it("/review and /job open once a resume is parsed", () => {
    store({ parsed });
    expect(renderAt("/review").state.location.pathname).toBe("/review");
  });

  it("/result without a tailoring result → /job", () => {
    store({ parsed });
    expect(renderAt("/result").state.location.pathname).toBe("/job");
  });

  it("/result opens once there is a tailoring result", () => {
    store({ parsed, tailorResult: tailored });
    expect(renderAt("/result").state.location.pathname).toBe("/result");
  });
});
