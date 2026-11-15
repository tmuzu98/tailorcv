import { applyResumeAdditions, hasResumeAdditions, type Resume } from "@tailorcv/shared";
import { useMemo } from "react";
import { useNavigate } from "react-router";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ResumeSummary } from "../features/resume-review/ResumeSummary";
import { useSession } from "../state/sessionContext";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Things most resumes have; if there are none, tell the user so they can spot a bad read. */
function missingParts(resume: Resume): string[] {
  const { basics } = resume;
  const has = (value: string | undefined) => value !== undefined && value.trim() !== "";
  return [
    !has(basics.email) && "email",
    !has(basics.phone) && "phone number",
    resume.experience.length === 0 && "work experience",
    resume.education.length === 0 && "education",
    resume.skills.every((group) => group.items.length === 0) && "skills",
  ].filter((part): part is string => part !== false);
}

/**
 * Step 2 (FE-4, D-85): a compact summary of what we read from the PDF, which the user checks and
 * can add to (missing contact details, skills, bullet points, certifications) before tailoring.
 * The parsed resume itself is not editable: if it was read wrongly, upload a different file.
 */
export function ReviewPage() {
  const navigate = useNavigate();
  const { parsed, additions, setAdditions, reset } = useSession();
  // What tailoring will use: the PDF content plus the user's additions.
  const resume = useMemo(
    () => (parsed ? applyResumeAdditions(parsed.resume, additions) : null),
    [parsed, additions],
  );
  if (!parsed || !resume) return null; // RequireSession guarantees it; keeps TS honest

  const skills = resume.skills.reduce((n, group) => n + group.items.length, 0);
  const bullets = resume.experience.reduce((n, job) => n + job.bullets.length, 0);
  const summary = [
    plural(resume.experience.length, "job", "jobs"),
    plural(bullets, "bullet point", "bullet points"),
    plural(resume.education.length, "education entry", "education entries"),
    plural(skills, "skill", "skills"),
    plural(resume.projects.length, "project", "projects"),
    plural(resume.certifications.length, "certification", "certifications"),
  ].join(" · ");
  const missing = missingParts(resume);

  const uploadAnother = () => {
    reset();
    navigate("/");
  };

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-2xl font-semibold tracking-tight">Review your resume</h1>
        <p className="mt-2 text-slate-600">
          Here&apos;s a summary of what we read from your PDF. Check it, and add anything
          that&apos;s missing: tailoring only uses what is listed here.
        </p>
        <p className="mt-3 text-sm text-slate-500" data-testid="parsed-summary">
          {summary} · {plural(parsed.meta.pages, "page", "pages")} read in{" "}
          {(parsed.meta.durationMs / 1000).toFixed(1)} s
        </p>

        {missing.length > 0 && (
          <div className="mt-4">
            <Alert tone="warning" title={`We couldn't find: ${missing.join(", ")}`}>
              <p>
                You can add contact details and skills below. If your resume does have this, the PDF
                may be hard to read (for example a scanned image or an unusual layout): try
                uploading a different version.
              </p>
            </Alert>
          </div>
        )}
      </Card>

      <Card>
        <ResumeSummary resume={parsed.resume} additions={additions} onChange={setAdditions} />
        {hasResumeAdditions(additions) && (
          <p className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-600">
            Items marked &ldquo;Added by you&rdquo; are treated as part of your resume when we
            tailor it, so only add things that are true.
          </p>
        )}
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate("/job")}>Looks good, continue</Button>
        <Button variant="secondary" onClick={uploadAnother}>
          Upload a different file
        </Button>
      </div>
    </div>
  );
}
