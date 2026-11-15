import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { SLOW_AFTER_SECONDS, TAILOR_STEPS, activeStep } from "./tailorSteps";

/**
 * Loading state for tailoring: the three steps, the one in progress marked, elapsed time and
 * Cancel. Time-based in the MVP (see tailorSteps.ts).
 */
export function StepProgress({ onCancel }: { onCancel: () => void }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const active = activeStep(seconds);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-5 rounded-xl border border-slate-200 bg-slate-50 px-6 py-10"
    >
      <ol className="space-y-3">
        {TAILOR_STEPS.map((step, index) => {
          const state = index < active ? "done" : index === active ? "active" : "pending";
          return (
            <li
              key={step}
              aria-current={state === "active" ? "step" : undefined}
              className={`flex items-center gap-3 ${
                state === "active"
                  ? "font-medium text-slate-900"
                  : state === "done"
                    ? "text-slate-600"
                    : "text-slate-400"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
                {state === "active" ? (
                  <Spinner className="h-5 w-5" />
                ) : state === "done" ? (
                  "✓"
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                )}
              </span>
              <span>{step}</span>
              {state === "done" && <span className="sr-only">(done)</span>}
            </li>
          );
        })}
      </ol>
      <p className="text-sm text-slate-500">
        {seconds}s
        {seconds >= SLOW_AFTER_SECONDS &&
          " · Still working. Local AI models can take a minute or more."}
      </p>
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
