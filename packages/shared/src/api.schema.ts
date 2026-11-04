import { z } from "zod";
import { ResumeSchema } from "./resume.schema";
import { TailorResultSchema } from "./tailor.schema";

/** HTTP response envelopes and the error contract (API spec §2–§5). */

// ---------- Errors ----------

/** Error code catalog (API spec §5). The HTTP status for each lives in the API (Day 5). */
export const ERROR_CODES = [
  "FILE_MISSING",
  "VALIDATION_ERROR",
  "FILE_TOO_LARGE",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_FILE_TYPE",
  "PDF_TOO_MANY_PAGES",
  "PDF_ENCRYPTED",
  "RESUME_NOT_DETECTED",
  "NOT_FOUND",
  "RATE_LIMITED",
  "AI_PROVIDER_ERROR",
  "AI_INVALID_OUTPUT",
  "AI_TIMEOUT",
  "INTERNAL_ERROR",
] as const;

export const ErrorCodeSchema = z.enum(ERROR_CODES);

/** Standard error body returned by every failing endpoint. */
export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string().describe("Safe to show to the user"),
    requestId: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

// ---------- Success responses ----------

/** POST /api/v1/resumes/parse → 200 */
export const ParseResponseSchema = z.object({
  resume: ResumeSchema,
  meta: z.object({
    pages: z.number().int().positive(),
    durationMs: z.number().int().nonnegative(),
    promptVersion: z.string(),
  }),
});

/** POST /api/v1/resumes/tailor → 200 */
export const TailorResponseSchema = TailorResultSchema.extend({
  meta: z.object({
    durationMs: z.number().int().nonnegative(),
    promptVersion: z.string(),
  }),
});

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export type ParseResponse = z.infer<typeof ParseResponseSchema>;
export type TailorResponse = z.infer<typeof TailorResponseSchema>;
