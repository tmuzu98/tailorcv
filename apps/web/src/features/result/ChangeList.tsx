import type { Change } from "@tailorcv/shared";
import type { ChangeGroup, DisplayChange } from "./changeGroups";

const TYPE_LABELS: Record<Change["type"], string> = {
  reworded: "Reworded",
  reordered: "Moved",
  removed: "Left out",
  emphasized: "Emphasized",
};

/** What tailoring changed, grouped by section: before → after and the reason (FE-7). */
export function ChangeList({
  groups,
  hadRejections = false,
}: {
  groups: ChangeGroup[];
  /** Guardrail warnings exist: "no changes" then means the suggestions were rejected. */
  hadRejections?: boolean;
}) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        {hadRejections
          ? "No changes were made: the suggested edits did not pass our checks, so your original wording was kept (see the notes above)."
          : "No changes were needed: your resume already fits this job well."}
      </p>
    );
  }
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.section} aria-labelledby={`changes-${group.section}`}>
          <h3
            id={`changes-${group.section}`}
            className="text-xs font-semibold tracking-wider text-slate-500 uppercase"
          >
            {group.title}
          </h3>
          <ol className="mt-3 space-y-3">
            {group.changes.map((change, index) => (
              <ChangeItem key={`${change.targetId ?? group.section}_${index}`} change={change} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function ChangeItem({ change }: { change: DisplayChange }) {
  return (
    <li className="rounded-lg border border-slate-200 p-3 text-sm">
      <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">
        {TYPE_LABELS[change.type]}
      </span>
      {change.before !== undefined && (
        <p className="mt-2 text-slate-500">
          <span className="sr-only">Before: </span>
          <del className="decoration-slate-400">{change.before}</del>
        </p>
      )}
      {change.after !== undefined && (
        <p className="mt-1 text-slate-900">
          <span className="sr-only">After: </span>
          <ins className="no-underline">{change.after}</ins>
        </p>
      )}
      {change.targetText !== undefined && (
        <p className="mt-2 text-slate-900">{change.targetText}</p>
      )}
      <p className="mt-2 text-slate-600">
        <span className="font-medium text-slate-700">Why: </span>
        {change.reason}
      </p>
    </li>
  );
}
