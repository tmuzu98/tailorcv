import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * Accessible tabs (WAI-ARIA tabs pattern): one tab stop, arrow keys / Home / End move between
 * tabs and select them.
 */
export function ResultTabs({ tabs, label }: { tabs: TabDef[]; label: string }) {
  const [selected, setSelected] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number) => {
    setSelected(index);
    refs.current[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const last = tabs.length - 1;
    const next: Record<string, number> = {
      ArrowRight: selected === last ? 0 : selected + 1,
      ArrowLeft: selected === 0 ? last : selected - 1,
      Home: 0,
      End: last,
    };
    const target = next[event.key];
    if (target === undefined) return;
    event.preventDefault();
    select(target);
  };

  const current = tabs[selected];
  return (
    <div>
      <div role="tablist" aria-label={label} className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab, index) => {
          const active = index === selected;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setSelected(index)}
              onKeyDown={onKeyDown}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                active
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {current && (
        <div
          role="tabpanel"
          id={`panel-${current.id}`}
          aria-labelledby={`tab-${current.id}`}
          tabIndex={0}
          className="pt-4 focus-visible:outline-2 focus-visible:outline-indigo-600"
        >
          {current.content}
        </div>
      )}
    </div>
  );
}
