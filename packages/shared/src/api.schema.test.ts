import { describe, expect, it } from "vitest";
import {
  ApiErrorResponseSchema,
  ERROR_CODES,
  ParseResponseSchema,
  TailorResponseSchema,
} from "./api.schema";
import { sampleResumeSwe, sampleTailorResultSweFrontend } from "./fixtures";

describe("ApiErrorResponseSchema", () => {
  it("accepts the documented error shape (API spec §4)", () => {
    const body = {
      error: {
        code: "PDF_TOO_MANY_PAGES",
        message: "Your resume has 7 pages. Please upload a resume with 5 pages or fewer.",
        requestId: "req_8f2c",
        details: { pages: 7, maxPages: 5 },
      },
    };
    expect(ApiErrorResponseSchema.safeParse(body).success).toBe(true);
  });

  it("accepts an error without details", () => {
    const body = {
      error: { code: "INTERNAL_ERROR", message: "Something went wrong", requestId: "req_1" },
    };
    expect(ApiErrorResponseSchema.safeParse(body).success).toBe(true);
  });

  it("rejects an error code that is not in the catalog", () => {
    const body = { error: { code: "OOPS", message: "x", requestId: "req_1" } };
    expect(ApiErrorResponseSchema.safeParse(body).success).toBe(false);
  });

  it("has unique error codes", () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
  });
});

describe("success envelopes", () => {
  it("ParseResponseSchema accepts a resume + meta", () => {
    const body = {
      resume: sampleResumeSwe,
      meta: { pages: 2, durationMs: 14210, promptVersion: "parse-v1" },
    };
    expect(ParseResponseSchema.safeParse(body).success).toBe(true);
  });

  it("ParseResponseSchema rejects 0 pages", () => {
    const body = {
      resume: sampleResumeSwe,
      meta: { pages: 0, durationMs: 1, promptVersion: "parse-v1" },
    };
    expect(ParseResponseSchema.safeParse(body).success).toBe(false);
  });

  it("TailorResponseSchema accepts a TailorResult + meta", () => {
    const body = {
      ...sampleTailorResultSweFrontend,
      meta: { durationMs: 31877, promptVersion: "tailor-v1" },
    };
    expect(TailorResponseSchema.safeParse(body).success).toBe(true);
  });
});
