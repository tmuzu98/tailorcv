import { ResumeSchema, type ParseResponse } from "@tailorcv/shared";
import type { Logger } from "pino";
import { extractText, getDocumentProxy } from "unpdf";
import { AppError } from "../lib/errors";
import type { LlmClient } from "../llm";
import {
  PARSE_PROMPT_VERSION,
  PARSE_SYSTEM_PROMPT,
  ParseLlmOutputSchema,
  buildParseContent,
} from "../llm/prompts/parse.v1";
import { looksLikeResume, normalizeParsedResume } from "./resumeNormalizer";

/** Tech design §6.3: parse = low effort, non-streaming 16k output budget. */
export const PARSE_EFFORT = "low";
export const PARSE_MAX_TOKENS = 16_000;

export interface ResumeParserService {
  /**
   * PDF (already validated by pdfValidationService) → structured `Resume` + meta.
   * Throws RESUME_NOT_DETECTED, or the LLM client's AI_* / INTERNAL_ERROR codes.
   */
  parse(pdf: Uint8Array, info: { pages: number }): Promise<ParseResponse>;
}

/** Plain text of the PDF, used only for deterministic fixes (email rescue). Never logged. */
async function pdfText(pdf: Uint8Array): Promise<string> {
  try {
    const doc = await getDocumentProxy(new Uint8Array(pdf), { verbosity: 0 });
    try {
      return (await extractText(doc, { mergePages: true })).text;
    } finally {
      await doc.loadingTask.destroy().catch(() => undefined);
    }
  } catch {
    return ""; // scanned/odd PDFs: the model may still read them; we just skip the rescue
  }
}

export function createResumeParserService(deps: {
  llm: LlmClient;
  logger: Logger;
}): ResumeParserService {
  return {
    async parse(pdf, { pages }) {
      const started = performance.now();
      const result = await deps.llm.generateStructured({
        promptVersion: PARSE_PROMPT_VERSION,
        system: PARSE_SYSTEM_PROMPT,
        content: buildParseContent(pdf),
        schema: ParseLlmOutputSchema,
        effort: PARSE_EFFORT,
        maxTokens: PARSE_MAX_TOKENS,
      });

      if (!result.data.isResume) {
        deps.logger.info(
          { parse: { promptVersion: PARSE_PROMPT_VERSION, reason: "model" } },
          "document is not a resume",
        );
        throw new AppError("RESUME_NOT_DETECTED");
      }

      const { resume, stats } = normalizeParsedResume(result.data, {
        sourceText: await pdfText(pdf),
      });
      if (!looksLikeResume(resume)) {
        deps.logger.info(
          { parse: { promptVersion: PARSE_PROMPT_VERSION, reason: "empty" } },
          "document is not a resume",
        );
        throw new AppError("RESUME_NOT_DETECTED");
      }

      // Belt and braces: post-processing must always produce a contract-valid Resume.
      const checked = ResumeSchema.safeParse(resume);
      if (!checked.success) {
        throw new AppError("INTERNAL_ERROR", {
          cause: new Error(
            `normalized resume invalid at ${checked.error.issues[0]?.path.join(".")}`,
          ),
        });
      }

      const durationMs = Math.round(performance.now() - started);
      deps.logger.info(
        {
          parse: {
            promptVersion: PARSE_PROMPT_VERSION,
            model: result.model,
            pages,
            durationMs,
            counts: {
              experience: resume.experience.length,
              bullets: resume.experience.reduce((n, e) => n + e.bullets.length, 0),
              education: resume.education.length,
              skills: resume.skills.reduce((n, g) => n + g.items.length, 0),
              projects: resume.projects.length,
              certifications: resume.certifications.length,
            },
            ...stats,
          },
        },
        "resume parsed",
      );
      return {
        resume: checked.data,
        meta: { pages, durationMs, promptVersion: PARSE_PROMPT_VERSION },
      };
    },
  };
}
