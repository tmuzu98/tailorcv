import type { Logger } from "pino";
import type { z } from "zod";
import { AppError } from "../lib/errors";
import type { GenerateStructuredParams, LlmClient, LlmResult } from "./LlmClient";

export interface UsageLimits {
  /** AI calls allowed per UTC day, all users together. */
  dailyCalls: number;
  /** AI calls allowed to be in flight at the same time. */
  maxConcurrent: number;
  /** Clock, for tests. */
  now?: () => number;
}

/** What a client is told to wait when every concurrency slot is taken. */
export const BUSY_RETRY_AFTER_SEC = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Spend protection for the AI provider. The per-IP rate limits stop one client; they do not
 * stop many clients (or one client behind many addresses) from running up the bill. This puts a
 * ceiling on the whole service: a number of AI calls per UTC day, and a number in flight at once.
 * Over either limit the call is refused with RATE_LIMITED before the provider is contacted.
 *
 * Provider-neutral decorator, like `withDeadline`. Counts are in memory: correct for a single
 * instance, and reset when the process restarts. A spend limit set in the provider's console is
 * still the last line of defence.
 */
export class UsageLimitedLlmClient implements LlmClient {
  private day = -1;
  private callsToday = 0;
  private inFlight = 0;

  constructor(
    readonly inner: LlmClient,
    readonly limits: UsageLimits,
    private readonly logger: Logger,
  ) {}

  async generateStructured<S extends z.ZodType>(
    params: GenerateStructuredParams<S>,
  ): Promise<LlmResult<z.infer<S>>> {
    const now = (this.limits.now ?? Date.now)();
    const day = Math.floor(now / DAY_MS);
    if (day !== this.day) {
      this.day = day;
      this.callsToday = 0;
    }

    const log = { promptVersion: params.promptVersion };
    if (this.inFlight >= this.limits.maxConcurrent) {
      this.logger.warn(
        { llm: { ...log, inFlight: this.inFlight, maxConcurrent: this.limits.maxConcurrent } },
        "concurrent AI call limit reached",
      );
      throw new AppError("RATE_LIMITED", {
        message: "The service is busy right now. Please try again in a moment.",
        details: { retryAfterSec: BUSY_RETRY_AFTER_SEC },
      });
    }
    if (this.callsToday >= this.limits.dailyCalls) {
      this.logger.warn(
        { llm: { ...log, callsToday: this.callsToday, dailyCalls: this.limits.dailyCalls } },
        "daily AI call limit reached",
      );
      throw new AppError("RATE_LIMITED", {
        message: "The service has reached its limit for today. Please try again tomorrow.",
        details: { retryAfterSec: Math.ceil(((day + 1) * DAY_MS - now) / 1000) },
      });
    }

    // Counted when the call starts: a call that fails later may still have been billed.
    this.callsToday += 1;
    this.inFlight += 1;
    try {
      return await this.inner.generateStructured(params);
    } finally {
      this.inFlight -= 1;
    }
  }
}

export function withUsageLimits(inner: LlmClient, limits: UsageLimits, logger: Logger): LlmClient {
  return new UsageLimitedLlmClient(inner, limits, logger);
}
