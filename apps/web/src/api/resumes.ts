import { ParseResponseSchema, type ParseResponse } from "@tailorcv/shared";
import { apiRequest } from "./client";

/** POST /resumes/parse: uploads one PDF (multipart field "file") and returns the parsed resume. */
export function parseResume(file: File, signal?: AbortSignal): Promise<ParseResponse> {
  const form = new FormData();
  form.append("file", file);
  return apiRequest("/resumes/parse", {
    method: "POST",
    body: form,
    schema: ParseResponseSchema,
    ...(signal && { signal }),
  });
}
