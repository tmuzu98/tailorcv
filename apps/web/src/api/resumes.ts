import {
  ParseResponseSchema,
  TailorResponseSchema,
  type ParseResponse,
  type TailorRequestInput,
  type TailorResponse,
} from "@tailorcv/shared";
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

/** POST /resumes/tailor: sends the resume and the job description as JSON (API spec §3). */
export function tailorResume(
  input: TailorRequestInput,
  signal?: AbortSignal,
): Promise<TailorResponse> {
  return apiRequest("/resumes/tailor", {
    method: "POST",
    json: input,
    schema: TailorResponseSchema,
    ...(signal && { signal }),
  });
}
