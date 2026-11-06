import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useSession } from "../state/sessionContext";

/**
 * Route guard: each step needs the previous step's data (Tech Design §6.4).
 * - "resume": /review and /job need a parsed resume → otherwise back to upload (/).
 * - "result": /result needs a tailoring result → otherwise /job (or / if there's no resume yet).
 */
export function RequireSession({
  need,
  children,
}: {
  need: "resume" | "result";
  children: ReactNode;
}) {
  const { parsed, tailorResult } = useSession();
  if (!parsed) return <Navigate to="/" replace />;
  if (need === "result" && !tailorResult) return <Navigate to="/job" replace />;
  return <>{children}</>;
}
