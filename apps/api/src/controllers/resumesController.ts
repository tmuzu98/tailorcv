import type { RequestHandler, Response } from "express";
import { TailorRequestSchema } from "@tailorcv/shared";
import { AppError } from "../lib/errors";
import { withRequestLlmProvider } from "../middleware/llmProvider";
import type { JobTailorService } from "../services/jobTailorService";
import { validatePdf } from "../services/pdfValidationService";
import type { ResumeParserService } from "../services/resumeParserService";

/**
 * Aborts when the client goes away before we answered (tab closed, navigation, network drop),
 * so we stop spending AI time/money on a response nobody will read.
 */
function abortOnDisconnect(res: Response): AbortSignal {
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) controller.abort(new Error("client disconnected"));
  });
  return controller.signal;
}

/**
 * POST /resumes/parse (API spec §2). HTTP only: the upload middleware has already put the PDF in
 * memory; this validates it, runs the parser service and returns the ParseResponse.
 */
export function parseResumeHandler(parser: ResumeParserService): RequestHandler {
  return async (req, res) => {
    if (!req.file) throw new AppError("FILE_MISSING"); // uploadPdf guarantees it; keeps TS honest
    const bytes = new Uint8Array(req.file.buffer);
    const { pages } = await validatePdf(bytes);
    const signal = abortOnDisconnect(res);
    const result = await withRequestLlmProvider(res, () => parser.parse(bytes, { pages, signal }));
    res.json(result);
  };
}

/** How many failing fields a VALIDATION_ERROR lists. */
export const MAX_VALIDATION_FIELDS = 10;

/**
 * POST /resumes/tailor (API spec §3). HTTP only: validates the JSON body against the shared
 * schema, runs the tailor service and returns the TailorResponse.
 *
 * A validation error names the failing fields (`details.fields`: path + our own message). It
 * never echoes a submitted value, so no resume or job description text reaches the response.
 */
export function tailorResumeHandler(tailor: JobTailorService): RequestHandler {
  return async (req, res) => {
    const parsed = TailorRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const fields = parsed.error.issues.slice(0, MAX_VALIDATION_FIELDS).map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      throw new AppError("VALIDATION_ERROR", { details: { fields } });
    }
    const signal = abortOnDisconnect(res);
    const result = await withRequestLlmProvider(res, () => tailor.tailor(parsed.data, { signal }));
    res.json(result);
  };
}
