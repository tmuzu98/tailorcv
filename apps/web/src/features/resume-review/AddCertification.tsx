import { RESUME_ADDITION_LIMITS, type AddedCertification } from "@tailorcv/shared";
import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";

const INPUT =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600";
const SMALL = "px-3 py-1.5";
const EMPTY = { name: "", issuer: "", date: "" };

/** "+ Add a certification" link that opens a small form (name required; issuer and date optional). */
export function AddCertification({
  onAdd,
}: {
  /** Returns an error message to show, or null when the certification was added. */
  onAdd: (certification: AddedCertification) => string | null;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setForm(EMPTY);
    setError(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    const issuer = form.issuer.trim();
    const date = form.date.trim();
    const problem = onAdd({ name, ...(issuer && { issuer }), ...(date && { date }) });
    setError(problem);
    if (!problem) setForm(EMPTY);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded text-sm font-medium text-indigo-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        + Add a certification
      </button>
    );
  }

  const input = (key: keyof typeof EMPTY, label: string, placeholder: string) => (
    <input
      autoFocus={key === "name"}
      aria-label={label}
      className={INPUT}
      value={form[key]}
      placeholder={placeholder}
      maxLength={RESUME_ADDITION_LIMITS.maxFieldChars}
      onChange={(event) => {
        setForm((current) => ({ ...current, [key]: event.target.value }));
        setError(null);
      }}
    />
  );

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[2fr_2fr_1fr]">
        {input("name", "Certification name", "Certification name")}
        {input("issuer", "Issuer (optional)", "Issuer (optional)")}
        {input("date", "Date (optional)", "Date (optional)")}
      </div>
      <div className="flex gap-2">
        <Button type="submit" className={SMALL} disabled={!form.name.trim()}>
          Add
        </Button>
        <Button variant="ghost" className={SMALL} onClick={close}>
          Done
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
