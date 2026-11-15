/**
 * Upload limits shared by the API (enforcement) and the web app (early client-side checks), so
 * they can never drift apart (API spec §2, PRD FR-2).
 */
export const UPLOAD_LIMITS = {
  /** Max PDF size in bytes (5 MB). */
  maxBytes: 5 * 1024 * 1024,
  /** Max number of PDF pages. */
  maxPages: 5,
} as const;
