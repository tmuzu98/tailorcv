import { HealthResponseSchema, ParseResponseSchema } from "@tailorcv/shared";
import { sampleResumeSwe } from "@tailorcv/shared/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest } from "./client";
import { parseResume } from "./resumes";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function mockFetch(impl: (...args: unknown[]) => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

async function caught(promise: Promise<unknown>): Promise<ApiError> {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiError);
  return err as ApiError;
}

afterEach(() => vi.unstubAllGlobals());

describe("apiRequest", () => {
  it("returns the body validated with the shared schema", async () => {
    mockFetch(async () => json({ status: "ok", version: "1.0.0", uptimeSec: 3 }));
    await expect(apiRequest("/health", { schema: HealthResponseSchema })).resolves.toEqual({
      status: "ok",
      version: "1.0.0",
      uptimeSec: 3,
    });
  });

  it("turns the standard error JSON into an ApiError with code, status, requestId and details", async () => {
    mockFetch(async () =>
      json(
        {
          error: {
            code: "PDF_TOO_MANY_PAGES",
            message: "Your resume has 7 pages.",
            requestId: "req_1",
            details: { pages: 7, maxPages: 5 },
          },
        },
        422,
      ),
    );
    const err = await caught(
      apiRequest("/resumes/parse", { schema: ParseResponseSchema, method: "POST" }),
    );
    expect(err).toMatchObject({
      code: "PDF_TOO_MANY_PAGES",
      message: "Your resume has 7 pages.",
      status: 422,
      requestId: "req_1",
      details: { pages: 7, maxPages: 5 },
    });
  });

  it("reports a non-contract error response (e.g. a proxy HTML page) as BAD_RESPONSE", async () => {
    mockFetch(async () => new Response("<html>502 Bad Gateway</html>", { status: 502 }));
    expect(await caught(apiRequest("/health", { schema: HealthResponseSchema }))).toMatchObject({
      code: "BAD_RESPONSE",
      status: 502,
    });
  });

  it("reports a 200 whose body breaks the contract as BAD_RESPONSE", async () => {
    mockFetch(async () => json({ status: "weird" }));
    expect((await caught(apiRequest("/health", { schema: HealthResponseSchema }))).code).toBe(
      "BAD_RESPONSE",
    );
  });

  it("reports a failed fetch (offline / API down) as NETWORK_ERROR", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect((await caught(apiRequest("/health", { schema: HealthResponseSchema }))).code).toBe(
      "NETWORK_ERROR",
    );
  });

  it("reports our own cancellation as ABORTED", async () => {
    const controller = new AbortController();
    mockFetch(async () => {
      controller.abort();
      throw new DOMException("aborted", "AbortError");
    });
    const err = await caught(
      apiRequest("/health", { schema: HealthResponseSchema, signal: controller.signal }),
    );
    expect(err.code).toBe("ABORTED");
  });
});

describe("parseResume", () => {
  it("POSTs the file as multipart field 'file' to /api/v1/resumes/parse", async () => {
    const response = {
      resume: sampleResumeSwe,
      meta: { pages: 1, durationMs: 1200, promptVersion: "parse-v1" },
    };
    const fetchMock = mockFetch(async () => json(response));
    const file = new File(["%PDF-1.7"], "resume.pdf", { type: "application/pdf" });

    await expect(parseResume(file)).resolves.toEqual(response);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/resumes/parse");
    expect(init.method).toBe("POST");
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
  });
});
