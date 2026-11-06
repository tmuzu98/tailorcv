import type { ErrorCode } from "@tailorcv/shared";

/**
 * Error catalog: every shared ERROR_CODE → HTTP status + default user-facing message (API spec §5).
 * Typed as Record<ErrorCode, …> so adding a code in @tailorcv/shared without an entry here fails
 * to compile.
 */
export const ERROR_CATALOG: Record<ErrorCode, { status: number; message: string }> = {
  FILE_MISSING: { status: 400, message: "Please choose a PDF file to upload." },
  VALIDATION_ERROR: { status: 400, message: "Some of the submitted data is invalid." },
  FILE_TOO_LARGE: { status: 413, message: "The file is larger than 5 MB." },
  PAYLOAD_TOO_LARGE: {
    status: 413,
    message: "The request is too large. Try shortening the job description.",
  },
  UNSUPPORTED_FILE_TYPE: { status: 415, message: "Only PDF files are supported." },
  PDF_TOO_MANY_PAGES: {
    status: 422,
    message: "Your resume has too many pages. Please upload 5 pages or fewer.",
  },
  PDF_ENCRYPTED: {
    status: 422,
    message: "This PDF is password-protected. Please upload an unlocked copy.",
  },
  RESUME_NOT_DETECTED: { status: 422, message: "This document doesn't look like a resume." },
  NOT_FOUND: { status: 404, message: "The requested resource was not found." },
  RATE_LIMITED: { status: 429, message: "Too many requests. Please try again later." },
  AI_PROVIDER_ERROR: {
    status: 502,
    message: "The AI service is having trouble right now. Please try again.",
  },
  AI_INVALID_OUTPUT: {
    status: 502,
    message: "The AI returned an unexpected result. Please try again.",
  },
  AI_TIMEOUT: { status: 504, message: "The request took too long. Please try again." },
  INTERNAL_ERROR: { status: 500, message: "Something went wrong on our side." },
};

export interface AppErrorOptions {
  /** Overrides the catalog message. Must be safe to show to the user. */
  message?: string;
  /** Extra structured data returned to the client (no resume/JD content!). */
  details?: Record<string, unknown>;
  /** Underlying error, logged but never sent to the client. */
  cause?: unknown;
}

/** An expected, user-facing error. Throw it anywhere; the central errorHandler formats it. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, options: AppErrorOptions = {}) {
    super(options.message ?? ERROR_CATALOG[code].message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_CATALOG[code].status;
    this.details = options.details;
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
