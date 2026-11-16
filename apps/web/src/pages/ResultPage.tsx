import type { JobSummary } from "@tailorcv/shared";
import { useNavigate } from "react-router";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ChangeList } from "../features/result/ChangeList";
import { groupChanges } from "../features/result/changeGroups";
import { KeywordPanel } from "../features/result/KeywordPanel";
import { ResultTabs } from "../features/result/ResultTabs";
import { ResumeView } from "../features/resume-view/ResumeView";
import { useSession } from "../state/sessionContext";

/**
 * Step 4 (FE-7): the tailored resume and what changed. Header with the job, the guardrail
 * warnings, the tailored preview, and a side panel with tabs for the changes and the keywords.
 */
export function ResultPage() {
  const navigate = useNavigate();
  const { tailorResult } = useSession();
  if (!tailorResult) return null; // RequireSession redirects; keeps TS honest

  const { tailoredResume, changes, keywordAnalysis, jobSummary, warnings } = tailorResult;
  const groups = groupChanges(changes, tailoredResume);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{jobHeading(jobSummary)}</h1>
        {jobSummary.topRequirements.length > 0 && (
          <p className="mt-2 text-sm text-slate-600">
            <span className="font-medium text-slate-700">The job asks most for: </span>
            {jobSummary.topRequirements.join(", ")}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate("/job")}>
            Change job description
          </Button>
        </div>
      </header>

      {warnings.length > 0 && (
        <Alert tone="warning" title="We kept some of your original text">
          <p>Some AI suggestions broke our honesty or quality rules, so we did not use them:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3" aria-label="Tailored resume preview">
          <ResumeView resume={tailoredResume} />
        </Card>
        <Card className="lg:col-span-2" aria-label="What changed">
          <ResultTabs
            label="Tailoring details"
            tabs={[
              {
                id: "changes",
                label: `Changes (${changes.length})`,
                content: <ChangeList groups={groups} />,
              },
              {
                id: "keywords",
                label: "Keywords",
                content: (
                  <KeywordPanel
                    analysis={keywordAnalysis}
                    onAddExperience={() => navigate("/review")}
                  />
                ),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}

/** "Tailored for Senior Frontend Engineer at Northwind Health", with whatever the job gives. */
function jobHeading({ title, company }: JobSummary): string {
  const t = title?.trim();
  const c = company?.trim();
  if (t && c) return `Tailored for ${t} at ${c}`;
  if (t) return `Tailored for ${t}`;
  if (c) return `Tailored for a job at ${c}`;
  return "Your tailored resume";
}
