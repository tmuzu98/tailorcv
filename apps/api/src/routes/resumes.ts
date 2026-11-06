import { Router } from "express";
import { AppError } from "../lib/errors";
import { uploadPdf } from "../middleware/upload";
import type { RateLimiters } from "../middleware/rateLimit";
import { validatePdf } from "../services/pdfValidationService";

/**
 * /resumes routes. Order per route: rate limit → upload → validation → handler, so abusive
 * clients are rejected before we read up to 5 MB.
 */
export function createResumesRouter({ limiters }: { limiters: RateLimiters }): Router {
  const router = Router();

  // TEMPORARY STUB (Day 6, D-57): validates the upload end to end. Day 9 replaces the response
  // with the real ParseResponse (AI parsing); the web app does not call this route before then.
  router.post("/resumes/parse", limiters.parse, uploadPdf(), async (req, res) => {
    if (!req.file) throw new AppError("FILE_MISSING"); // narrowed by uploadPdf; keeps TS honest
    const { pages } = await validatePdf(req.file.buffer);
    res.json({ stub: true, pages });
  });

  return router;
}
