import type { Logger } from "pino";
import type { z } from "zod";
import { AppError } from "../lib/errors";
import type { GenerateStructuredParams, LlmClient, LlmResult } from "./LlmClient";

/**
 * Overall time budget for ONE generateStructured call, covering every retry (D-72). Without it,
 * per-attempt timeouts × SDK retries × the app-level retry can add up to minutes.
 *
 * Provider-neutral decorator: it aborts the inner call through `params.signal` and also stops
 * waiting at the deadline even if a client ignores the signal. Deadline → AI_TIMEOUT. A cancel
 * from the caller (e.g. the HTTP client disconnected) is passed through as-is.
 */
export class DeadlineLlmClient implements LlmClient {
  constructor(
    readonly inner: LlmClient,
    readonly deadlineMs: number,
    private readonly logger: Logger,
  ) {}

  async generateStructured<S extends z.ZodType>(
    params: GenerateStructuredParams<S>,
  ): Promise<LlmResult<z.infer<S>>> {
    const deadline = AbortSignal.timeout(this.deadlineMs);
    const signal = params.signal ? AbortSignal.any([deadline, params.signal]) : deadline;

    let onAbort: (() => void) | undefined;
    const aborted = new Promise<never>((_resolve, reject) => {
      onAbort = () => reject(signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
    });
    aborted.catch(() => undefined); // handled below; avoid unhandled-rejection noise

    try {
      return await Promise.race([this.inner.generateStructured({ ...params, signal }), aborted]);
    } catch (err) {
      if (deadline.aborted) {
        this.logger.error(
          { llm: { promptVersion: params.promptVersion, deadlineMs: this.deadlineMs } },
          "llm call exceeded the overall deadline",
        );
        throw new AppError("AI_TIMEOUT", { cause: err });
      }
      throw err;
    } finally {
      if (onAbort) signal.removeEventListener("abort", onAbort);
    }
  }
}

export function withDeadline(inner: LlmClient, deadlineMs: number, logger: Logger): LlmClient {
  return new DeadlineLlmClient(inner, deadlineMs, logger);
}
