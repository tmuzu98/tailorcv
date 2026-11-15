import { Router } from "express";
import { parseResumeHandler, tailorResumeHandler } from "../controllers/resumesController";
import type { RateLimiters } from "../middleware/rateLimit";
import { uploadPdf } from "../middleware/upload";
import type { JobTailorService } from "../services/jobTailorService";
import type { ResumeParserService } from "../services/resumeParserService";

export interface ResumesRouterDeps {
  limiters: RateLimiters;
  parser: ResumeParserService;
  tailor: JobTailorService;
}

/**
 * /resumes routes. Order per route: rate limit → upload → controller (validation + service), so
 * abusive clients are rejected before we read up to 5 MB. Tailor takes JSON (parsed and capped
 * at 200 KB by express.json in app.ts), so it has no upload step.
 */
export function createResumesRouter({ limiters, parser, tailor }: ResumesRouterDeps): Router {
  const router = Router();
  router.post("/resumes/parse", limiters.parse, uploadPdf(), parseResumeHandler(parser));
  router.post("/resumes/tailor", limiters.tailor, tailorResumeHandler(tailor));
  return router;
}
