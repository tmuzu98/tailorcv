import type { HealthResponse, LlmProvider } from "@tailorcv/shared";
import { useEffect, useState } from "react";
import { getLlmProviderChoice, setLlmProviderChoice } from "../../api/llmProvider";

const LABELS: Record<LlmProvider, string> = {
  ollama: "Local model (free)",
  anthropic: "Claude (billed)",
};
const ORDER: LlmProvider[] = ["ollama", "anthropic"];

/**
 * DEVELOPMENT ONLY, TEMPORARY (D-103): buttons to choose the AI provider for the next requests,
 * to compare Claude with the local model without restarting the API. Shown only when the API
 * says its provider switch is on (`llmSwitch` in the health response); in production it never
 * is. To be removed before the production deploy.
 */
export function ProviderSwitch({ info }: { info: HealthResponse["llmSwitch"] }) {
  const [choice, setChoice] = useState<LlmProvider | null>(getLlmProviderChoice);

  // A choice kept from an earlier session that can no longer be made: forget it.
  const stale = info !== undefined && choice !== null && !info.available.includes(choice);
  useEffect(() => {
    if (stale) setLlmProviderChoice(null);
  }, [stale]);

  if (!info) return null;
  const selected = choice && !stale ? choice : info.default;

  const choose = (provider: LlmProvider) => {
    setLlmProviderChoice(provider);
    setChoice(provider);
  };

  return (
    <div
      role="group"
      aria-label="AI model (development only)"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900"
    >
      <span className="font-medium">Dev only · AI model:</span>
      {ORDER.map((provider) => {
        const available = info.available.includes(provider);
        const active = provider === selected;
        return (
          <button
            key={provider}
            type="button"
            aria-pressed={active}
            disabled={!available}
            title={available ? undefined : "No API key configured on the server"}
            onClick={() => choose(provider)}
            className={`rounded px-2 py-1 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 ${
              active ? "bg-amber-600 text-white" : "bg-white text-amber-900 hover:bg-amber-100"
            }`}
          >
            {LABELS[provider]}
          </button>
        );
      })}
    </div>
  );
}
