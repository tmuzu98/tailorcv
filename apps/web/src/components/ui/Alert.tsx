import type { ReactNode } from "react";

type Tone = "error" | "warning" | "info";

const TONES: Record<Tone, string> = {
  error: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-indigo-200 bg-indigo-50 text-indigo-900",
};

/**
 * Message box. Errors use role="alert" so screen readers announce them immediately; other tones
 * use role="status" (polite).
 */
export function Alert({
  tone = "info",
  title,
  children,
  actions,
}: {
  tone?: Tone;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border p-4 ${TONES[tone]}`}
    >
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm">{children}</div>}
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
