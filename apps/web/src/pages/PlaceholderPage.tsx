import type { ReactNode } from "react";

/** Temporary page shell used until each page is built (Days 10, 11, 15, 16). */
export function PlaceholderPage(props: { title: string; day: string; children?: ReactNode }) {
  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{props.title}</h1>
      <p className="mt-2 text-sm text-slate-500">Placeholder. Built on {props.day}.</p>
      {props.children}
    </section>
  );
}
