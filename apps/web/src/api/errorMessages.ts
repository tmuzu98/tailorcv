import { ApiError, type ApiErrorCode } from "./client";

/** What the UI should offer next. */
export type ErrorAction = "retry" | "choose-file" | "edit-input" | "wait" | "none";

export interface FriendlyError {
  title: string;
  message: string;
  action: ErrorAction;
  /** Shown small, so users can quote it when reporting a problem. */
  requestId?: string;
}

/**
 * Error code → friendly copy + suggested action (API spec §5 "Frontend action").
 * Typed `Record<ApiErrorCode, …>`: a new server code without an entry here fails to compile.
 */
const MESSAGES: Record<ApiErrorCode, Omit<FriendlyError, "requestId">> = {
  FILE_MISSING: {
    title: "No file selected",
    message: "Choose a PDF of your resume to continue.",
    action: "choose-file",
  },
  VALIDATION_ERROR: {
    title: "Something in the request isn't right",
    message: "Please check what you entered and try again.",
    action: "edit-input",
  },
  FILE_TOO_LARGE: {
    title: "That file is too large",
    message: "The limit is 5 MB. Try exporting the PDF again, or compressing it.",
    action: "choose-file",
  },
  PAYLOAD_TOO_LARGE: {
    title: "That's too much text",
    message: "Try shortening the job description.",
    action: "edit-input",
  },
  UNSUPPORTED_FILE_TYPE: {
    title: "That isn't a PDF we can read",
    message: "Please upload your resume as a PDF file.",
    action: "choose-file",
  },
  PDF_TOO_MANY_PAGES: {
    title: "Your resume is too long",
    message: "Please upload a resume with 5 pages or fewer.",
    action: "choose-file",
  },
  PDF_ENCRYPTED: {
    title: "This PDF is password-protected",
    message: "Please upload an unlocked copy of your resume.",
    action: "choose-file",
  },
  RESUME_NOT_DETECTED: {
    title: "This doesn't look like a resume",
    message: "Please check you chose the right file and try again.",
    action: "choose-file",
  },
  NOT_FOUND: {
    title: "Something went wrong",
    message: "Please refresh the page and try again.",
    action: "retry",
  },
  RATE_LIMITED: {
    title: "You've reached the limit for now",
    message: "Please wait a little and try again.",
    action: "wait",
  },
  AI_PROVIDER_ERROR: {
    title: "The AI service is having trouble",
    message: "This usually passes quickly. Please try again.",
    action: "retry",
  },
  AI_INVALID_OUTPUT: {
    title: "We couldn't read the AI's answer",
    message: "Please try again.",
    action: "retry",
  },
  AI_TIMEOUT: {
    title: "That took too long",
    message: "Please try again. Shorter documents are faster.",
    action: "retry",
  },
  INTERNAL_ERROR: {
    title: "Something went wrong on our side",
    message: "Please try again in a moment.",
    action: "retry",
  },
  NETWORK_ERROR: {
    title: "Can't reach TailorCV",
    message: "Check your internet connection and try again.",
    action: "retry",
  },
  BAD_RESPONSE: {
    title: "Something went wrong",
    message: "We got an unexpected response. Please try again.",
    action: "retry",
  },
  ABORTED: { title: "Cancelled", message: "The request was cancelled.", action: "none" },
};

/** Codes whose server message carries useful specifics (e.g. "Your resume has 7 pages…"). */
const USE_SERVER_MESSAGE = new Set<ApiErrorCode>(["PDF_TOO_MANY_PAGES"]);

function waitText(seconds: number): string {
  if (seconds < 90) return `${Math.max(1, Math.round(seconds))} seconds`;
  return `${Math.ceil(seconds / 60)} minutes`;
}

/** Turns anything thrown by an API call into copy the UI can show. */
export function toFriendlyError(err: unknown): FriendlyError {
  if (!(err instanceof ApiError)) return { ...MESSAGES.INTERNAL_ERROR };
  const base = MESSAGES[err.code];
  let message = USE_SERVER_MESSAGE.has(err.code) ? err.message : base.message;
  const retryAfter = err.details?.retryAfterSec;
  if (err.code === "RATE_LIMITED" && typeof retryAfter === "number") {
    message = `Please try again in about ${waitText(retryAfter)}.`;
  }
  return { ...base, message, ...(err.requestId && { requestId: err.requestId }) };
}
