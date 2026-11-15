import type { RequestHandler, Response } from "express";
import { LLM_PROVIDER_HEADER, LlmProviderSchema, type LlmProvider } from "@tailorcv/shared";
import { AppError } from "../lib/errors";
import { runWithLlmProvider } from "../llm";

/**
 * DEVELOPMENT ONLY, TEMPORARY (D-103). Mounted only when `LLM_PROVIDER_SWITCH=true`: reads the
 * `X-LLM-Provider` header and remembers the choice for this request. Without the header the
 * configured `LLM_PROVIDER` is used. When the switch is off this middleware is not mounted, so
 * the header has no effect at all.
 */
export function llmProviderChoice(): RequestHandler {
  return (req, res, next) => {
    const header = req.get(LLM_PROVIDER_HEADER);
    if (header === undefined) return next();
    const parsed = LlmProviderSchema.safeParse(header);
    if (!parsed.success) {
      return next(
        new AppError("VALIDATION_ERROR", {
          message: `${LLM_PROVIDER_HEADER} must be one of: ${LlmProviderSchema.options.join(", ")}.`,
        }),
      );
    }
    res.locals.llmProvider = parsed.data;
    next();
  };
}

/**
 * Runs a service call with the provider this request chose, if any. Called by the controllers
 * right around the service call, not in the middleware: upload parsing (multer) runs between
 * the two, and an async context does not survive it reliably.
 */
export function withRequestLlmProvider<T>(res: Response, fn: () => T): T {
  const provider = res.locals.llmProvider as LlmProvider | undefined;
  return provider ? runWithLlmProvider(provider, fn) : fn();
}
