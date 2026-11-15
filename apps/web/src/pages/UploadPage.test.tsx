import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { UPLOAD_LIMITS, type ParseResponse } from "@tailorcv/shared";
import { sampleResumeSwe } from "@tailorcv/shared/fixtures";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../app/AppProviders";
import { routes } from "../app/router";
import { progressMessage } from "../features/upload/progressMessage";
import { SESSION_STORAGE_KEY } from "../state/sessionContext";

const PARSED: ParseResponse = {
  resume: sampleResumeSwe,
  meta: { pages: 1, durationMs: 12_300, promptVersion: "parse-v1" },
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const apiError = (code: string, message: string, status: number) =>
  json({ error: { code, message, requestId: "req_test_1" } }, status);

/**
 * Routes fetch by URL: health always ok; parse calls go to `onParse`, which can return a Response
 * or a promise we control (to observe the loading state).
 */
function mockApi(onParse: (init: RequestInit) => Promise<Response>) {
  const parseCalls: RequestInit[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      if (url.endsWith("/health")) return json({ status: "ok", version: "0.1.0", uptimeSec: 1 });
      parseCalls.push(init);
      return onParse(init);
    }),
  );
  return parseCalls;
}

function renderUpload() {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

const pdf = (name = "resume.pdf", bytes = 2048) =>
  new File([new Uint8Array(bytes)], name, { type: "application/pdf" });
const choose = (file: File) =>
  fireEvent.change(screen.getByTestId("file-input"), { target: { files: [file] } });

beforeEach(() => window.sessionStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("UploadPage: client-side checks (no upload happens)", () => {
  it("shows the dropzone with the shared limits", () => {
    mockApi(async () => json(PARSED));
    renderUpload();
    expect(screen.getByRole("heading", { name: /upload your resume/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose a pdf/i })).toBeInTheDocument();
    expect(
      screen.getByText(`PDF only · up to 5 MB · up to ${UPLOAD_LIMITS.maxPages} pages`),
    ).toBeInTheDocument();
  });

  it("rejects a non-PDF", () => {
    const calls = mockApi(async () => json(PARSED));
    renderUpload();
    choose(new File(["hello"], "notes.docx", { type: "application/vnd.openxmlformats" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/that isn't a pdf/i);
    expect(calls).toHaveLength(0);
  });

  it("rejects a file over 5 MB and an empty file", () => {
    const calls = mockApi(async () => json(PARSED));
    renderUpload();
    choose(pdf("big.pdf", UPLOAD_LIMITS.maxBytes + 1));
    expect(screen.getByRole("alert")).toHaveTextContent(/too large/i);
    choose(pdf("empty.pdf", 0));
    expect(screen.getByRole("alert")).toHaveTextContent(/empty/i);
    expect(calls).toHaveLength(0);
  });

  it("accepts a .pdf whose browser type is blank (some OSes) and uploads it", async () => {
    const calls = mockApi(async () => json(PARSED));
    renderUpload();
    choose(new File([new Uint8Array(10)], "Resume.PDF", { type: "" }));
    await waitFor(() => expect(calls).toHaveLength(1));
  });
});

describe("UploadPage: upload + parse", () => {
  it("shows the loading state with the file name while parsing", async () => {
    let finish: (r: Response) => void = () => {};
    mockApi(() => new Promise((resolve) => (finish = resolve)));
    renderUpload();
    choose(pdf("alex.pdf"));

    expect(await screen.findByText(/reading your resume/i)).toBeInTheDocument();
    expect(screen.getByText(/alex\.pdf/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /choose a pdf/i })).not.toBeInTheDocument();
    await act(async () => finish(json(PARSED)));
  });

  it("on success stores the resume and lands on /review", async () => {
    mockApi(async () => json(PARSED));
    const router = renderUpload();
    choose(pdf());

    await waitFor(() => expect(router.state.location.pathname).toBe("/review"));
    // The router's location changes before React renders the new page, so wait for the page.
    expect(await screen.findByRole("heading", { name: /review your resume/i })).toBeInTheDocument();
    expect(screen.getByText(sampleResumeSwe.basics.fullName)).toBeInTheDocument();
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toContain(
      sampleResumeSwe.basics.fullName,
    );
  });

  it("sends the file as multipart 'file' to the parse endpoint", async () => {
    const calls = mockApi(async () => json(PARSED));
    renderUpload();
    choose(pdf("alex.pdf"));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect((calls[0]?.body as FormData).get("file")).toHaveProperty("name", "alex.pdf");
  });

  it("supports drag and drop", async () => {
    const calls = mockApi(async () => json(PARSED));
    renderUpload();
    fireEvent.drop(screen.getByTestId("dropzone"), {
      dataTransfer: { files: [pdf("dropped.pdf")] },
    });
    await waitFor(() => expect(calls).toHaveLength(1));
  });

  it("Cancel aborts the request and returns to the dropzone", async () => {
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
    renderUpload();
    choose(pdf());
    fireEvent.click(await screen.findByRole("button", { name: /cancel/i }));

    expect(signal?.aborted).toBe(true);
    expect(await screen.findByRole("button", { name: /choose a pdf/i })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(); // a cancel isn't an error
  });
});

describe("UploadPage: API errors", () => {
  it("shows the friendly message and next step for a file problem (no retry button)", async () => {
    mockApi(async () => apiError("PDF_ENCRYPTED", "server text", 422));
    renderUpload();
    choose(pdf());
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/password-protected/i);
    expect(alert).toHaveTextContent("Reference: req_test_1");
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose a pdf/i })).toBeInTheDocument();
  });

  it("shows the server's page count for too-long resumes", async () => {
    mockApi(async () =>
      apiError(
        "PDF_TOO_MANY_PAGES",
        "Your resume has 7 pages. Please upload a resume with 5 pages or fewer.",
        422,
      ),
    );
    renderUpload();
    choose(pdf());
    expect(await screen.findByRole("alert")).toHaveTextContent("Your resume has 7 pages.");
  });

  it("offers Try again for AI failures, and retrying the same file works", async () => {
    let attempt = 0;
    const calls = mockApi(async () =>
      ++attempt === 1 ? apiError("AI_TIMEOUT", "x", 504) : json(PARSED),
    );
    const router = renderUpload();
    choose(pdf());

    expect(await screen.findByRole("alert")).toHaveTextContent(/took too long/i);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/review"));
    expect(calls).toHaveLength(2);
  });

  it("explains a network failure", async () => {
    mockApi(async () => {
      throw new TypeError("Failed to fetch");
    });
    renderUpload();
    choose(pdf());
    expect(await screen.findByRole("alert")).toHaveTextContent(/can't reach tailorcv/i);
  });
});

describe("progressMessage (time-based loading copy)", () => {
  it("changes as the wait gets longer", () => {
    expect(progressMessage(0)).toMatch(/reading your resume/i);
    expect(progressMessage(10)).toMatch(/experience, education and skills/i);
    expect(progressMessage(40)).toMatch(/up to a minute/i);
  });
});
