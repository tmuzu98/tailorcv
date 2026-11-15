import { AsyncLocalStorage } from "node:async_hooks";
import type { LlmProvider } from "@tailorcv/shared";
import type { Logger } from "pino";
import type { z } from "zod";
import type { GenerateStructuredParams, LlmClient, LlmResult } from "./LlmClient";

/**
 * DEVELOPMENT ONLY, TEMPORARY (D-103): lets one request choose the LLM provider, so Claude and
 * the local model can be compared from the browser without restarting. Enabled by
 * `LLM_PROVIDER_SWITCH=true`, which production refuses. To be removed before the production
 * deploy (plan Day 24/25).
 *
 * The choice travels in an AsyncLocalStorage context set by the controller around the service
 * call, so services keep taking a plain `LlmClient` and know nothing about it.
 */
const requestProvider = new AsyncLocalStorage<LlmProvider>();

/** Runs `fn` with `provider` as the chosen LLM provider for every AI call made inside it. */
export function runWithLlmProvider<T>(provider: LlmProvider, fn: () => T): T {
  return requestProvider.run(provider, fn);
}

/** Routes each call to the provider chosen for the current request, or to the default one. */
export class SwitchableLlmClient implements LlmClient {
  constructor(
    readonly clients: Readonly<Record<LlmProvider, LlmClient>>,
    readonly defaultProvider: LlmProvider,
    private readonly logger: Logger,
  ) {}

  generateStructured<S extends z.ZodType>(
    params: GenerateStructuredParams<S>,
  ): Promise<LlmResult<z.infer<S>>> {
    const chosen = requestProvider.getStore();
    const provider = chosen ?? this.defaultProvider;
    if (chosen) {
      this.logger.info(
        { llm: { promptVersion: params.promptVersion, provider } },
        "llm provider chosen by the request (development switch)",
      );
    }
    return this.clients[provider].generateStructured(params);
  }
}
