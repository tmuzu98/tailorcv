import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";

const INPUT =
  "min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600";
const SMALL = "px-3 py-1.5";

/**
 * "+ Add …" link that opens a one-line form. `onAdd` gets the trimmed text and returns an error
 * message to show, or null when the value was added. The form stays open after a successful add
 * so several items can be typed in a row.
 */
export function InlineAdd({
  label,
  placeholder,
  maxLength,
  onAdd,
}: {
  /** Button text and the input's accessible name, e.g. "Add a skill". */
  label: string;
  placeholder?: string;
  maxLength: number;
  onAdd: (value: string) => string | null;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setValue("");
    setError(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = value.trim();
    if (!text) return;
    const problem = onAdd(text);
    setError(problem);
    if (!problem) setValue("");
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded text-sm font-medium text-indigo-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        + {label}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          aria-label={label}
          aria-invalid={error ? true : undefined}
          className={INPUT}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
        />
        <Button type="submit" className={SMALL} disabled={!value.trim()}>
          Add
        </Button>
        <Button variant="ghost" className={SMALL} onClick={close}>
          Done
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
