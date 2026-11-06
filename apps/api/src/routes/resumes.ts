import { Router } from "express";
import { parseResumeHandler } from "../controllers/resumesController";
import type { RateLimiters } from "../middleware/rateLimit";
import { uploadPdf } from "../middleware/upload";
import type { ResumeParserService } from "../services/resumeParserService";

export interface ResumesRouterDeps {
  limiters: RateLimiters;
  parser: ResumeParserService;
}

/**
 * /resumes routes. Order per route: rate limit → upload → controller (validation + service), so
 * abusive clients are rejected before we read up to 5 MB.
 */
export function createResumesRouter({ limiters, parser }: ResumesRouterDeps): Router {
  const router = Router();
  router.post("/resumes/parse", limiters.parse, uploadPdf(), parseResumeHandler(parser));
  return router;
}
