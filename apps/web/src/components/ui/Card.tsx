import type { HTMLAttributes } from "react";

/** White rounded surface used for page sections. */
export function Card({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 ${className}`}
      {...props}
    />
  );
}
