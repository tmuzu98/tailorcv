# 03 — API Specification (v1)

Base URL: `/api/v1` · Content type: JSON unless noted · Auth: none in MVP

**Cross-cutting behaviour (all endpoints):**
- Every response carries an `X-Request-Id` header (`req_<32 hex>`). A safe incoming `X-Request-Id` (`[A-Za-z0-9_-]{8,64}`) is reused. The same id appears as `error.requestId` in error bodies.
- JSON bodies are limited to **200 KB** → `413 PAYLOAD_TOO_LARGE`. Malformed JSON → `400 VALIDATION_ERROR`. Any other unreadable request (unsupported charset or `Content-Encoding`, corrupt gzip body) → `400 VALIDATION_ERROR`, never a 500.
- Rate limits are per IP and per endpoint family (parse: 10/h, tailor: 20/h by default). Over the limit → `429 RATE_LIMITED` with a `Retry-After` header (seconds), `RateLimit`/`RateLimit-Policy` headers, and `details.retryAfterSec`.
- **Service-wide AI limits (D-101):** on top of the per-IP limits, the API allows a number of AI calls per UTC day and a number in flight at once, all clients together (`LLM_DAILY_CALL_LIMIT`, default 300; `LLM_MAX_CONCURRENT`, default 4). Over either → the same `429 RATE_LIMITED` with `Retry-After` and `details.retryAfterSec` (seconds until the next UTC day, or 10 when the service is busy), before the AI provider is contacted.
- CORS: only origins in `CORS_ORIGIN` are allowed. `X-Request-Id` and `Retry-After` are exposed to the browser.
- Error responses that happen before an upload is read (e.g. `429`, `404`) are still delivered as JSON: the server discards the unread body (up to 6 MB) first. Above that it answers with `Connection: close`.

---

## 1. `GET /api/v1/health`

Liveness check.

**200**
```json
{ "status": "ok", "version": "0.1.0", "uptimeSec": 123 }
```

**Development only, temporary (D-103; removed before production).** When the API runs with `LLM_PROVIDER_SWITCH=true`:
- the health response also carries `"llmSwitch": { "default": "ollama", "available": ["anthropic", "ollama"] }` (`anthropic` is listed only when a key is configured);
- `POST /resumes/parse` and `POST /resumes/tailor` accept the request header `X-LLM-Provider: anthropic | ollama`, which picks the provider for that request. Any other value → `400 VALIDATION_ERROR`. Without the header the configured `LLM_PROVIDER` is used.

With the switch off (the default) the field is absent and the header is ignored. Production refuses to start with the switch on.

---

## 2. `POST /api/v1/resumes/parse`

Upload a PDF resume and get back a structured `Resume`.

**Request:** `multipart/form-data`

| Field | Type | Rules |
|---|---|---|
| `file` | PDF file | required · exactly one file in the `file` field · ≤ 5 MB · ≤ 5 pages · not encrypted |

- The file must start with the PDF signature `%PDF-` (within the first 1024 bytes). The declared type is only a pre-check: `application/pdf`, `application/x-pdf` and `application/octet-stream` are accepted, anything else → `415` with `details.declaredType`.
- Checks run in this order: rate limit → upload (size, field) → type → PDF structure (encryption, page count). A rate-limited client gets `429` before the upload is read.
- Then the AI parses the PDF (`parse-v1`, see Tech Design §6.1). Typical time: a few seconds with Claude; 7–20 s with local Ollama. If the client disconnects first, the AI call is cancelled.

**200**
```json
{
  "resume": { "basics": { "fullName": "Jane Doe", "links": [] }, "experience": [], "education": [], "skills": [], "projects": [], "certifications": [], "additionalSections": [] },
  "meta": { "pages": 2, "durationMs": 14210, "promptVersion": "parse-v1" }
}
```

**Errors:** `400 FILE_MISSING` · `400 VALIDATION_ERROR` · `413 FILE_TOO_LARGE` · `415 UNSUPPORTED_FILE_TYPE` · `422 PDF_TOO_MANY_PAGES` · `422 PDF_ENCRYPTED` · `422 RESUME_NOT_DETECTED` · `429 RATE_LIMITED` · `502 AI_PROVIDER_ERROR` · `504 AI_TIMEOUT`

| Situation | Response |
|---|---|
| No file, non-multipart body, or an empty (0-byte) file | `400 FILE_MISSING` (empty file: "The uploaded file is empty.") |
| File in the wrong field, more than one file, or a malformed/truncated multipart body | `400 VALIDATION_ERROR` |
| Over 5 MB | `413 FILE_TOO_LARGE`, `details: { maxBytes: 5242880 }` |
| Declared type isn't a PDF type | `415 UNSUPPORTED_FILE_TYPE`, `details: { declaredType }` |
| No `%PDF-` signature | `415 UNSUPPORTED_FILE_TYPE` |
| Has the signature but the PDF is damaged | `415 UNSUPPORTED_FILE_TYPE`, message "This PDF appears to be damaged…" |
| Password-protected | `422 PDF_ENCRYPTED` |
| More than 5 pages | `422 PDF_TOO_MANY_PAGES`, `details: { pages, maxPages: 5 }` |

---

## 3. `POST /api/v1/resumes/tailor`

Tailor a parsed resume to a job description.

**Request** (`application/json`, ≤ 200 KB)
```json
{
  "resume": { "...": "Resume object from /parse, plus anything the user added on the review page" },
  "jobDescription": "We are hiring a Senior Frontend Engineer ...",
  "options": { "tone": "professional" }
}
```

| Field | Rules |
|---|---|
| `resume` | must validate against `ResumeSchema`; **all item ids must be unique** across the resume (otherwise `400 VALIDATION_ERROR`). It is the `/parse` result merged with the user's additions by `applyResumeAdditions()` in the web app (D-85): the server treats this merged resume as the source of truth for the guardrails |
| `resume` (size) | at most **40,000 characters of text**, all fields together (`RESUME_MAX_TEXT_CHARS`; otherwise `400 VALIDATION_ERROR` on `resume`). A dense 5-page resume is about 20,000 (D-102) |
| `jobDescription` | string, 100–15,000 chars |
| `options.tone` | optional · `"professional" \| "concise" \| "impactful"` · default `"professional"` (Phase 2 UI) |

**200**: a `TailorResult` (see Tech Design §5.2)
```json
{
  "tailoredResume": { "...": "Resume" },
  "changes": [
    { "section": "experience", "targetId": "exp_1_b2", "type": "reworded",
      "before": "Built internal dashboards", "after": "Built React + TypeScript dashboards used by 200+ internal users",
      "reason": "Brings forward React/TypeScript, which the JD lists as core requirements" }
  ],
  "keywordAnalysis": { "matched": ["React", "TypeScript"], "missing": ["GraphQL"], "matchScore": 78, "matchScoreBefore": 67 },
  "jobSummary": { "title": "Senior Frontend Engineer", "company": "Acme", "seniority": "Senior", "topRequirements": ["React", "TypeScript", "Design systems"] },
  "warnings": [],
  "meta": { "durationMs": 31877, "promptVersion": "tailor-v2" }
}
```

`changes[].reason` (D-105): the model's reason when it is a short reason; otherwise a default text. A change of only letter case, punctuation or spacing has `type: "reworded"` and the reason "Fixed spelling, capitalization or punctuation.". A reworded bullet or summary that mentions the job being applied for is rejected by the guardrails (original kept, a `warnings` entry).

`keywordAnalysis` (D-104): only keywords that the job description itself contains are counted; a keyword the model lists that is not in the posting is dropped before scoring. `matchScoreBefore` is the same score for the resume as submitted (optional in the schema, always sent by the server).

Note: in the example, "used by 200+ internal users" is only allowed if the original resume already contained that figure. The guardrails and the prompt both enforce this rule.

**Errors:** `400 VALIDATION_ERROR` · `413 PAYLOAD_TOO_LARGE` · `429 RATE_LIMITED` · `502 AI_PROVIDER_ERROR` · `502 AI_INVALID_OUTPUT` · `504 AI_TIMEOUT`

**Validation errors (D-99):** a body that fails `TailorRequestSchema` returns `400 VALIDATION_ERROR` with the failing fields in `details.fields`, at most 10, each a dotted path and a message. The message is the schema's own text; a submitted value is never echoed, so no resume or job description text is in the response.
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some of the submitted data is invalid.",
    "requestId": "req_8f2c…",
    "details": { "fields": [{ "path": "jobDescription", "message": "Job description must be at least 100 characters" }] }
  }
}
```
Order of checks: rate limit → JSON body (malformed JSON → `400`, over 200 KB → `413`) → schema → AI. An invalid request never reaches the AI, and it does count against the rate limit.

---

## 4. Standard error response

```json
{
  "error": {
    "code": "PDF_TOO_MANY_PAGES",
    "message": "Your resume has 7 pages. Please upload a resume with 5 pages or fewer.",
    "requestId": "req_8f2c…",
    "details": { "pages": 7, "maxPages": 5 }
  }
}
```

## 5. Error code catalog

| Code | HTTP | Meaning | Frontend action |
|---|---|---|---|
| `FILE_MISSING` | 400 | No file in the request | Ask the user to select a file |
| `VALIDATION_ERROR` | 400 | Body failed zod validation | Show the field errors |
| `FILE_TOO_LARGE` | 413 | File is over 5 MB | Suggest compressing or exporting again |
| `PAYLOAD_TOO_LARGE` | 413 | JSON body is over the limit | Shorten the JD |
| `UNSUPPORTED_FILE_TYPE` | 415 | Not a PDF | Ask for a PDF |
| `PDF_TOO_MANY_PAGES` | 422 | More than 5 pages | Explain the limit |
| `PDF_ENCRYPTED` | 422 | File is password-protected | Ask for an unlocked file |
| `RESUME_NOT_DETECTED` | 422 | The document doesn't look like a resume (the model says so, or no name / no experience, education, skills or projects could be extracted) | Explain and let the user retry |
| `RATE_LIMITED` | 429 | Too many requests from this IP, or the service-wide AI limit is reached (daily, or busy) | Show the retry-after time |
| `AI_PROVIDER_ERROR` | 502 | Upstream AI failure after retries (rate limit, 5xx/overloaded, network), or the AI declined the request (refusal after the fallback) | Offer a retry |
| `AI_INVALID_OUTPUT` | 502 | Output failed the schema after the app-level retry | Offer a retry |
| `AI_TIMEOUT` | 504 | The AI call exceeded its overall deadline, including retries (`LLM_DEADLINE_MS`: 120 s with Claude, 5 min with local Ollama) | Offer a retry |
| `NOT_FOUND` | 404 | Unknown API route | Developer error (should not happen from the UI) |
| `INTERNAL_ERROR` | 500 | Unexpected error, including AI misconfiguration (missing/invalid API key, rejected request) | Generic message + requestId |

## 6. Versioning

- The path is versioned (`/api/v1`). Breaking changes mean a new `/api/v2`.
- `packages/shared` holds the request and response types, so the frontend and backend can't drift apart without a TypeScript error.
- Source of truth in code: `ResumeSchema`, `TailorRequestSchema`, `TailorResultSchema` (+ `TailorResponseSchema` with `meta`), `ParseResponseSchema`, `ApiErrorResponseSchema`, `ERROR_CODES`, and the upload limits `UPLOAD_LIMITS` (5 MB, 5 pages; used by the API to enforce and by the web app to pre-check) in `packages/shared/src`. Unknown fields in requests are **stripped**, not rejected.
- User additions (D-85) are **not a new endpoint or request field**: `ResumeAdditionsSchema`, `RESUME_ADDITION_LIMITS` (skill ≤ 60 chars, bullet ≤ 500, other fields ≤ 200; up to 50 skills, 50 bullets, 20 certifications) and `applyResumeAdditions(resume, additions)` live in `packages/shared/src/resumeAdditions.ts`. The web app keeps the additions in its session and sends the merged `Resume` in the tailor request.

## 7. Planned endpoints (later phases, not built in MVP)

| Phase | Endpoint | Purpose |
|---|---|---|
| 2 | `POST /api/v1/resumes/tailor/stream` | SSE progress events + final result |
| 2 | `POST /api/v1/resumes/export/docx` | DOCX export |
| 3 | `POST /api/v1/auth/*` | Auth (Better Auth handler) |
| 3 | `GET/POST/DELETE /api/v1/base-resumes` | Saved base resumes |
| 3 | `GET /api/v1/tailored-resumes?baseResumeId=` | History |
| 4 | `POST /api/v1/cover-letters` | Cover letter generation |
| 4 | `POST /api/v1/job-descriptions/fetch` | Import a JD from a URL |
