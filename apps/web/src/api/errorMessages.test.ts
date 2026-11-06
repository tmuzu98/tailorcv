import { ERROR_CODES } from "@tailorcv/shared";
import { describe, expect, it } from "vitest";
import { ApiError } from "./client";
import { toFriendlyError } from "./errorMessages";

describe("toFriendlyError", () => {
  it("has friendly copy for every server error code", () => {
    for (const code of ERROR_CODES) {
      const friendly = toFriendlyError(new ApiError(code, "server text"));
      expect(friendly.title.length, code).toBeGreaterThan(0);
      expect(friendly.message.length, code).toBeGreaterThan(0);
    }
  });

  it("suggests the right next step", () => {
    expect(toFriendlyError(new ApiError("PDF_ENCRYPTED", "x")).action).toBe("choose-file");
    expect(toFriendlyError(new ApiError("AI_TIMEOUT", "x")).action).toBe("retry");
    expect(toFriendlyError(new ApiError("NETWORK_ERROR", "x")).action).toBe("retry");
    expect(toFriendlyError(new ApiError("RATE_LIMITED", "x")).action).toBe("wait");
  });

  it("uses the server's specific message for page-count errors", () => {
    const err = new ApiError(
      "PDF_TOO_MANY_PAGES",
      "Your resume has 7 pages. Please upload 5 or fewer.",
    );
    expect(toFriendlyError(err).message).toBe("Your resume has 7 pages. Please upload 5 or fewer.");
  });

  it("never shows raw server text for generic errors", () => {
    expect(
      toFriendlyError(new ApiError("INTERNAL_ERROR", "stack trace here")).message,
    ).not.toContain("stack");
  });

  it("turns Retry-After into a human wait time", () => {
    const seconds = new ApiError("RATE_LIMITED", "x", 429, "req_1", { retryAfterSec: 45 });
    const minutes = new ApiError("RATE_LIMITED", "x", 429, "req_1", { retryAfterSec: 1800 });
    expect(toFriendlyError(seconds).message).toBe("Please try again in about 45 seconds.");
    expect(toFriendlyError(minutes).message).toBe("Please try again in about 30 minutes.");
  });

  it("passes the requestId through for support, and handles non-API errors", () => {
    expect(toFriendlyError(new ApiError("AI_TIMEOUT", "x", 504, "req_abc")).requestId).toBe(
      "req_abc",
    );
    expect(toFriendlyError(new Error("random")).title).toMatch(/something went wrong/i);
  });
});
