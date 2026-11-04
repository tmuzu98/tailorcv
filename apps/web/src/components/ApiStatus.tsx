import { useEffect, useState } from "react";
import { fetchHealth } from "../api/health";

type Status = { state: "loading" } | { state: "ok"; version: string } | { state: "down" };

/** Small indicator showing whether the API is reachable (Phase 0 walking skeleton). */
export function ApiStatus() {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal)
      .then((h) => setStatus({ state: "ok", version: h.version }))
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          console.error(err);
          setStatus({ state: "down" });
        }
      });
    return () => controller.abort();
  }, []);

  const dot = {
    loading: "bg-slate-300",
    ok: "bg-emerald-500",
    down: "bg-red-500",
  }[status.state];

  const label =
    status.state === "loading"
      ? "API: checking…"
      : status.state === "ok"
        ? `API: ok (v${status.version})`
        : "API: unreachable";

  return (
    <span className="inline-flex items-center gap-1.5" role="status" aria-live="polite">
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
