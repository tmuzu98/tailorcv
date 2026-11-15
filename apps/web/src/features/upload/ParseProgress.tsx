import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { progressMessage } from "./progressMessage";

/**
 * Loading state for a parse that can take a while (seconds with Claude, up to a minute or more
 * with a local model). Time-based messages (MVP, Tech Design §6.4) + elapsed time + Cancel.
 */
export function ParseProgress({ fileName, onCancel }: { fileName: string; onCancel: () => void }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center"
    >
      <Spinner className="h-8 w-8" />
      <div>
        <p className="font-medium text-slate-900">{progressMessage(seconds)}</p>
        <p className="mt-1 text-sm text-slate-500">
          {fileName} · {seconds}s
        </p>
      </div>
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
