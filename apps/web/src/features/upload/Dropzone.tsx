import { UPLOAD_LIMITS } from "@tailorcv/shared";
import { useId, useRef, useState, type DragEvent } from "react";
import { Button } from "../../components/ui/Button";

/**
 * Drag-and-drop area + "Choose a PDF" button (the button is the keyboard/screen-reader path).
 * Only reports the chosen file; checking it is the page's job.
 */
export function Dropzone({
  onFile,
  disabled = false,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      data-testid="dropzone"
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
        dragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-slate-50"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <svg
        className="h-10 w-10 text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
        />
      </svg>
      <p className="text-sm text-slate-700">
        <span className="font-medium">Drag and drop your resume here</span>, or
      </p>
      <Button onClick={() => input.current?.click()} disabled={disabled} aria-describedby={hintId}>
        Choose a PDF
      </Button>
      <p id={hintId} className="text-xs text-slate-500">
        PDF only · up to {UPLOAD_LIMITS.maxBytes / 1024 / 1024} MB · up to {UPLOAD_LIMITS.maxPages}{" "}
        pages
      </p>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        aria-label="Resume PDF file"
        data-testid="file-input"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = ""; // allow choosing the same file again (e.g. after an error)
          if (file) onFile(file);
        }}
      />
    </div>
  );
}
