import type { RequestHandler, Response } from "express";
import { AppError } from "../lib/errors";
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
    const result = await parser.parse(bytes, { pages, signal: abortOnDisconnect(res) });
    res.json(result);
  };
}
