import type { KeywordAnalysis } from "@tailorcv/shared";
import { Button } from "../../components/ui/Button";
import { scoreDelta } from "./changeGroups";

/**
 * Keyword match (FE-7): the score before → after, matched and missing keywords. Missing ones
 * are never added for the user: if they really have that experience, they add it on the review
 * page and tailor again (tailor, never fabricate).
 */
export function KeywordPanel({
  analysis,
  onAddExperience,
}: {
  analysis: KeywordAnalysis;
  onAddExperience: () => void;
}) {
  const delta = scoreDelta(analysis);
  return (
    <div className="space-y-6 text-sm">
      <div>
        <p className="text-slate-600">Keyword match</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
          <span className="text-3xl font-semibold text-slate-900">{analysis.matchScore}</span>
          <span className="text-slate-500">/ 100</span>
          {delta !== undefined && (
            <span className={delta > 0 ? "font-medium text-emerald-700" : "text-slate-600"}>
              {delta > 0
                ? `up from ${analysis.matchScoreBefore}`
                : `unchanged from ${analysis.matchScoreBefore}`}
            </span>
          )}
        </p>
        <p className="mt-1 text-slate-500">
          Share of the job's keywords that appear in your tailored resume.
        </p>
      </div>

      <div>
        <h3 id="kw-matched" className="font-medium text-slate-900">
          In your resume ({analysis.matched.length})
        </h3>
        <Chips label="Matched keywords" items={analysis.matched} tone="matched" />
      </div>

      <div>
        <h3 id="kw-missing" className="font-medium text-slate-900">
          Not found in your resume ({analysis.missing.length})
        </h3>
        {analysis.missing.length === 0 ? (
          <p className="mt-2 text-slate-600">Your resume covers every keyword we found.</p>
        ) : (
          <>
            <Chips label="Missing keywords" items={analysis.missing} tone="missing" />
            <p className="mt-3 text-slate-600">
              We never add skills you did not list. Have this experience? Add it on the review page
              and tailor again.
            </p>
            <Button variant="secondary" className="mt-3" onClick={onAddExperience}>
              Add it on the review page
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

const CHIP_TONES = {
  matched: "border-emerald-200 bg-emerald-50 text-emerald-900",
  missing: "border-slate-300 bg-white text-slate-700 border-dashed",
};

function Chips({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: keyof typeof CHIP_TONES;
}) {
  if (items.length === 0) return null;
  return (
    <ul aria-label={label} className="mt-2 flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className={`rounded-full border px-2.5 py-0.5 ${CHIP_TONES[tone]}`}>
          {item}
        </li>
      ))}
    </ul>
  );
}
