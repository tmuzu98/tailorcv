import { useState } from "react";
import { useNavigate } from "react-router";
import { toFriendlyError, type FriendlyError } from "../api/errorMessages";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Dropzone } from "../features/upload/Dropzone";
import { ParseProgress } from "../features/upload/ParseProgress";
import { checkResumeFile } from "../features/upload/fileChecks";
import { useParseResume } from "../features/upload/useParseResume";
import { useSession } from "../state/sessionContext";

/**
 * Step 1 (FE-1): choose a PDF → instant client checks → upload + AI parse → store → /review.
 * Errors use the friendly copy from errorMessages.ts with the matching next step.
 */
export function UploadPage() {
  const navigate = useNavigate();
  const { setParsed } = useSession();
  const parse = useParseResume();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<FriendlyError | null>(null);

  const start = (chosen: File) => {
    setFile(chosen);
    const problem = checkResumeFile(chosen);
    setFileError(problem);
    if (problem) {
      parse.reset();
      return;
    }
    parse.mutate(chosen, {
      onSuccess: (result) => {
        setParsed(result);
        navigate("/review");
      },
    });
  };

  const apiError = parse.isError ? toFriendlyError(parse.error) : null;
  const error = fileError ?? apiError;

  return (
    <Card>
      <h1 className="text-2xl font-semibold tracking-tight">Upload your resume</h1>
      <p className="mt-2 text-slate-600">
        Upload a PDF resume, paste a job description, and get an honest, ATS-friendly resume
        tailored to that job. We only use what&apos;s in your resume: nothing is invented.
      </p>

      <div className="mt-6 space-y-4">
        {parse.isPending && file ? (
          <ParseProgress fileName={file.name} onCancel={parse.cancel} />
        ) : (
          <Dropzone onFile={start} />
        )}

        {error && !parse.isPending && (
          <Alert
            tone="error"
            title={error.title}
            actions={
              error.action === "retry" && file ? (
                <Button variant="secondary" onClick={() => start(file)}>
                  Try again
                </Button>
              ) : undefined
            }
          >
            <p>{error.message}</p>
            {error.requestId && (
              <p className="mt-1 text-xs opacity-75">Reference: {error.requestId}</p>
            )}
          </Alert>
        )}
      </div>
    </Card>
  );
}
