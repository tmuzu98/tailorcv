import { TailorResponseSchema, type TailorRequest, type TailorResponse } from "@tailorcv/shared";
import type { Logger } from "pino";
import { AppError } from "../lib/errors";
import type { LlmClient } from "../llm";
import {
  TAILOR_PROMPT_VERSION,
  TAILOR_SYSTEM_PROMPT,
  TailorLlmOutputSchema,
  buildTailorContent,
} from "../llm/prompts/tailor.v2";
import { applyGuardrails } from "./guardrailService";
import { analyzeKeywords } from "./keywordService";
import { applyTailorEdits, describeChanges } from "./tailorEdits";

/** Tech design §6.3: tailor = medium effort, non-streaming 16k output budget. */
export const TAILOR_EFFORT = "medium";
export const TAILOR_MAX_TOKENS = 16_000;

export interface JobTailorService {
  /**
   * Resume + job description → tailored resume, change list, keyword match and warnings
   * (tech design §6.2). Throws the LLM client's AI_* / INTERNAL_ERROR codes.
   */
  tailor(request: TailorRequest, info?: { signal?: AbortSignal }): Promise<TailorResponse>;
}

export function createJobTailorService(deps: { llm: LlmClient; logger: Logger }): JobTailorService {
  return {
    async tailor(request, { signal } = {}) {
      const started = performance.now();
      const original = request.resume;

      // 1. The model analyzes the job and proposes edits (it never returns the resume).
      const result = await deps.llm.generateStructured({
        promptVersion: TAILOR_PROMPT_VERSION,
        system: TAILOR_SYSTEM_PROMPT,
        content: buildTailorContent({
          resume: original,
          jobDescription: request.jobDescription,
          tone: request.options?.tone ?? "professional",
        }),
        schema: TailorLlmOutputSchema,
        effort: TAILOR_EFFORT,
        maxTokens: TAILOR_MAX_TOKENS,
        ...(signal && { signal }),
      });
      const output = result.data;

      // 2–4. Deterministic: apply the edits to the original, enforce honesty, describe and score.
      const applied = applyTailorEdits(original, output, output.keywords);
      const guarded = applyGuardrails(original, applied.resume, { jobKeywords: output.keywords });
      const changes = describeChanges(original, guarded.resume, applied.reasons);
      const keywordAnalysis = analyzeKeywords(output.keywords, guarded.resume);
      const scoreBefore = analyzeKeywords(output.keywords, original).matchScore;

      const durationMs = Math.round(performance.now() - started);
      // Belt and braces: the response must always match the contract.
      const checked = TailorResponseSchema.safeParse({
        tailoredResume: guarded.resume,
        changes,
        keywordAnalysis,
        jobSummary: {
          ...output.jobSummary,
          topRequirements: output.jobSummary.topRequirements.filter((r) => r.trim() !== ""),
        },
        warnings: guarded.warnings,
        meta: { durationMs, promptVersion: TAILOR_PROMPT_VERSION },
      });
      if (!checked.success) {
        throw new AppError("INTERNAL_ERROR", {
          cause: new Error(`tailor result invalid at ${checked.error.issues[0]?.path.join(".")}`),
        });
      }

      // Counts only: never the keywords, warnings or any resume or job text.
      deps.logger.info(
        {
          tailor: {
            promptVersion: TAILOR_PROMPT_VERSION,
            model: result.model,
            durationMs,
            keywords: {
              total: keywordAnalysis.matched.length + keywordAnalysis.missing.length,
              matched: keywordAnalysis.matched.length,
              scoreBefore,
              scoreAfter: keywordAnalysis.matchScore,
            },
            changes: changes.length,
            warnings: guarded.warnings.length,
            edits: applied.stats,
            guardrails: guarded.stats,
          },
        },
        "resume tailored",
      );
      return checked.data;
    },
  };
}
