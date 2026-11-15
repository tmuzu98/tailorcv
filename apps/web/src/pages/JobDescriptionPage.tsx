import {
  JOB_DESCRIPTION_MAX_CHARS,
  JOB_DESCRIPTION_MIN_CHARS,
  applyResumeAdditions,
} from "@tailorcv/shared";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { toFriendlyError } from "../api/errorMessages";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { StepProgress } from "../features/job/StepProgress";
import { checkJobDescription, jobDescriptionLength } from "../features/job/jobDescriptionChecks";
import { useTailorResume } from "../features/job/useTailorResume";
import { useSession } from "../state/sessionContext";

const number = (n: number) => n.toLocaleString("en-US");

/**
 * Step 3 (FE-5, FE-6): paste the job description → instant length check → tailor → store the
 * result → /result. The text lives in the session, so a refresh or going back keeps it.
 */
export function JobDescriptionPage() {
  const navigate = useNavigate();
  const { parsed, additions, jobDescription, setJobDescription, setTailorResult } = useSession();
  const tailor = useTailorResume();
  // Validation messages appear only once the user has tried to submit.
  const [submitted, setSubmitted] = useState(false);

  if (!parsed) return null; // RequireSession redirects; keeps TS honest

  const length = jobDescriptionLength(jobDescription);
  const problem = checkJobDescription(jobDescription);
  const fieldError = submitted ? problem : null;
  const apiError = tailor.isError ? toFriendlyError(tailor.error) : null;
  const tooLong = length > JOB_DESCRIPTION_MAX_CHARS;

  const start = () => {
    setSubmitted(true);
    if (problem) {
      tailor.reset();
      return;
    }
    tailor.mutate(
      {
        // The resume as the user confirmed it: parsed + what they added on the review page (D-85).
        resume: applyResumeAdditions(parsed.resume, additions),
        jobDescription: jobDescription.trim(),
      },
      {
        onSuccess: (result) => {
          setTailorResult(result);
          navigate("/result");
        },
      },
    );
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    start();
  };

  return (
    <Card>
      <h1 className="text-2xl font-semibold tracking-tight">Paste the job description</h1>
      <p className="mt-2 text-slate-600">
        Paste the full posting for the job you are applying to. We reword your resume around what it
        asks for, using only what is already in your resume.
      </p>

      <div className="mt-6 space-y-4">
        {tailor.isPending ? (
          <StepProgress onCancel={tailor.cancel} />
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="job-description" className="block text-sm font-medium text-slate-800">
                Job description
              </label>
              <textarea
                id="job-description"
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                rows={14}
                aria-invalid={fieldError ? "true" : undefined}
                aria-describedby="job-description-help job-description-count"
                placeholder="Paste the job posting here: responsibilities, requirements, nice-to-haves…"
                className={`mt-2 block w-full rounded-lg border bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                  fieldError ? "border-red-400" : "border-slate-300"
                }`}
              />
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-slate-500">
                <p id="job-description-help">
                  At least {JOB_DESCRIPTION_MIN_CHARS} characters. The full posting gives the best
                  result.
                </p>
                <p
                  id="job-description-count"
                  className={tooLong ? "font-medium text-red-700" : undefined}
                >
                  {number(length)} / {number(JOB_DESCRIPTION_MAX_CHARS)} characters
                </p>
              </div>
            </div>

            {fieldError && (
              <Alert tone="error" title="Check the job description">
                <p>{fieldError}</p>
              </Alert>
            )}

            {apiError && !fieldError && (
              <Alert
                tone="error"
                title={apiError.title}
                actions={
                  apiError.action === "retry" ? (
                    <Button variant="secondary" onClick={start}>
                      Try again
                    </Button>
                  ) : undefined
                }
              >
                <p>{apiError.message}</p>
                {apiError.requestId && (
                  <p className="mt-1 text-xs opacity-75">Reference: {apiError.requestId}</p>
                )}
              </Alert>
            )}

            <div className="flex flex-wrap gap-3">
              <Button type="submit">Tailor my resume</Button>
              <Button variant="ghost" onClick={() => navigate("/review")}>
                Back
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
