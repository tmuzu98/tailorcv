import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@tailorcv/shared";
import { AppError, ERROR_CATALOG, isAppError } from "./errors";

describe("ERROR_CATALOG", () => {
  it("has an entry for every shared error code and nothing else", () => {
    expect(Object.keys(ERROR_CATALOG).sort()).toEqual([...ERROR_CODES].sort());
  });

  it("uses the HTTP statuses from API spec §5", () => {
    const statuses = Object.fromEntries(
      Object.entries(ERROR_CATALOG).map(([code, entry]) => [code, entry.status]),
    );
    expect(statuses).toEqual({
      FILE_MISSING: 400,
      VALIDATION_ERROR: 400,
      FILE_TOO_LARGE: 413,
      PAYLOAD_TOO_LARGE: 413,
      UNSUPPORTED_FILE_TYPE: 415,
      PDF_TOO_MANY_PAGES: 422,
      PDF_ENCRYPTED: 422,
      RESUME_NOT_DETECTED: 422,
      NOT_FOUND: 404,
      RATE_LIMITED: 429,
      AI_PROVIDER_ERROR: 502,
      AI_INVALID_OUTPUT: 502,
      AI_TIMEOUT: 504,
      INTERNAL_ERROR: 500,
    });
  });
});

describe("AppError", () => {
  it("defaults status and message from the catalog", () => {
    const err = new AppError("PDF_ENCRYPTED");
    expect(err.status).toBe(422);
    expect(err.message).toBe(ERROR_CATALOG.PDF_ENCRYPTED.message);
    expect(err.details).toBeUndefined();
    expect(isAppError(err)).toBe(true);
    expect(err).toBeInstanceOf(Error);
  });

  it("accepts a custom message, details and cause", () => {
    const cause = new Error("root cause");
    const err = new AppError("PDF_TOO_MANY_PAGES", {
      message: "Your resume has 7 pages.",
      details: { pages: 7, maxPages: 5 },
      cause,
    });
    expect(err.message).toBe("Your resume has 7 pages.");
    expect(err.details).toEqual({ pages: 7, maxPages: 5 });
    expect(err.cause).toBe(cause);
  });

  it("isAppError rejects plain errors", () => {
    expect(isAppError(new Error("x"))).toBe(false);
    expect(isAppError("x")).toBe(false);
  });
});
