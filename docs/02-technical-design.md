# 02 — Technical Design Document

| Field | Value |
|---|---|
| Status | Draft v0.1 |
| Last updated | 2026-11-03 |
| Related | [PRD](01-product-requirements.md) · [API spec](03-api-specification.md) · [Roadmap](04-implementation-roadmap.md) · [ADRs](06-architecture-decisions.md) |

---

## 1. Goals & constraints

- **JavaScript or TypeScript end to end**: React frontend and Node.js backend.
- **MVP is stateless.** No database and no auth, so it can ship fast. Persistence arrives in Phase 3 without a rewrite.
- **One shared schema** for the resume data model, used by the frontend, the backend, and the LLM's structured output.
- **Honesty enforced in code**, not only in prompts.

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript 5.x** (strict) | Type safety across the FE/BE boundary. Still the JS ecosystem (ADR-001) |
| Monorepo | **npm workspaces** | Built into npm, no extra tooling. Turborepo can be added later |
| Frontend framework | **React 19 + Vite** | Fast dev server, standard React setup |
| Styling | **Tailwind CSS v4** | Quick to build UI with, consistent design tokens |
| Routing | **React Router** | Simple page routing |
| Server state | **TanStack Query** | Mutation state (loading, error, retry) for the API calls |
| Forms / validation | **react-hook-form + zod** | Reuses the shared zod schemas |
| PDF rendering & export | **@react-pdf/renderer** | Real text PDFs (ATS-safe). Runs in the browser, no headless Chrome (ADR-004) |
| Backend runtime | **Node.js 24 LTS** | Matches the local environment |
| Backend framework | **Express 5** | Widely known, async error handling built in, large ecosystem (ADR-002) |
| File upload | **multer** (memory storage) | Files never touch disk |
| PDF validation | **unpdf** | Page count, encryption check, and a cheap text sniff before calling the AI |
| AI / LLM | **Claude API** via `@anthropic-ai/sdk`, model `claude-opus-5-5` (production, final provider confirmed by Day 24: OD-10) · **local Ollama** (`llama3`) in development | Claude reads PDFs natively, structured JSON output, strong writing quality (ADR-003). Ollama is free and private for local work (ADR-012). One switch: `LLM_PROVIDER` |
| Validation | **zod** (in `packages/shared`) | One source of truth for the schemas |
| Security middleware | helmet, cors, express-rate-limit | OWASP basics |
| Logging | **pino** | Structured JSON logs, with redaction |
| Testing | **Vitest**, React Testing Library, Supertest, **Playwright** (E2E) | One test runner for the whole JS codebase |
| Lint / format | ESLint (flat config) + Prettier | |
| CI | GitHub Actions | Lint, typecheck, test, build |
| Hosting | Frontend on **Vercel** (Hobby), API on **Render** (free web service) | $0 MVP, git-push deploys (ADR-009) |
| Later: DB / ORM | PostgreSQL + **Drizzle ORM** | Phase 3 |
| Later: Auth | **Better Auth** (or Clerk) | Phase 3 |

## 3. High-level architecture

```
┌──────────────────────────── Browser (React SPA) ────────────────────────────┐
│  UploadPage ──► ParsedReviewPage ──► JobDescriptionPage ──► ResultPage       │
│        │                                     │                  │            │
│        │  TanStack Query mutations           │                  │ @react-pdf │
│        ▼                                     ▼                  ▼ (download) │
└────────┼─────────────────────────────────────┼───────────────────────────────┘
         │ POST /api/v1/resumes/parse          │ POST /api/v1/resumes/tailor
         │ (multipart PDF)                     │ (JSON: resume + JD)
┌────────▼─────────────────────────────────────▼───────────────────────────────┐
│                         Node.js API (Express 5)                              │
│  middleware: helmet · cors · rate-limit · requestId · pino · errorHandler    │
│                                                                              │
│  routes/ ─► controllers/ ─► services/                                        │
│                              ├─ pdfValidationService   (unpdf)               │
│                              ├─ resumeParserService    (LLM call #1)         │
│                              ├─ jobTailorService       (LLM call #2)         │
│                              ├─ guardrailService       (deterministic checks)│
│                              └─ llmClient              (Anthropic SDK wrapper)│
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │ HTTPS
                                ┌───────▼────────┐
                                │  Claude API    │
                                └────────────────┘
```

**Why two endpoints instead of one?**
1. The user can check the parsed resume before tailoring. If parsing is wrong, tailoring will be wrong too.
2. The same parsed resume can be tailored to many JDs without uploading or parsing again. This saves cost and time.
3. Each request stays well under HTTP timeouts.
4. It sets up Phase 3 cleanly, where the parsed resume becomes a saved "base resume".

## 4. Repository structure

```
resumeParser/
├── package.json               # npm workspaces root
├── tsconfig.base.json
├── eslint.config.js
├── .prettierrc
├── .github/workflows/ci.yml
├── docs/                      # ← this documentation
├── apps/
│   ├── web/                   # React + Vite frontend
│   │   ├── src/
│   │   │   ├── app/           # router, providers, layout
│   │   │   ├── pages/         # Upload, Review, JobDescription, Result
│   │   │   ├── features/
│   │   │   │   ├── upload/        # Dropzone, fileChecks, useParseResume, ParseProgress (Day 10)
│   │   │   │   ├── resume-review/ # ResumeSummary (compact review + add), InlineAdd, AddCertification (Day 11)
│   │   │   │   ├── resume-view/   # Read-only HTML view of the resume JSON (tailored preview, Day 16)
│   │   │   │   ├── tailor/        # JD form, change list, keyword chips
│   │   │   │   └── pdf-export/    # @react-pdf templates + download button
│   │   │   ├── api/           # client.ts (apiRequest, ApiError), resumes.ts, errorMessages.ts, health.ts
│   │   │   ├── components/ui/ # Button, Card, Alert, Spinner (Day 10)
│   │   │   └── state/         # sessionContext.ts + session.tsx (React context, sessionStorage)
│   │   └── tests/
│   └── api/                   # Express backend
│       ├── src/
│       │   ├── server.ts      # bootstrap
│       │   ├── app.ts         # express app factory (testable)
│       │   ├── config/env.ts  # zod-validated env vars
│       │   ├── routes/        # health, resumes (createResumesRouter)
│       │   ├── controllers/   # resumesController (HTTP only: validate → service → JSON, abort on disconnect)
│       │   ├── services/      # pdfValidation, resumeParser + resumeNormalizer (Day 8), jobTailor, guardrail
│       │   ├── llm/           # LlmClient, AnthropicLlmClient, OllamaLlmClient (dev), FakeLlmClient, createLlmClient = provider switch (Day 7); prompts/parse.v1.ts (Day 8), tailor (Day 13)
│       │   ├── middleware/    # requestId, requestLogger, errorHandler (+404), rateLimit, upload
│       │   └── lib/           # logger, errors (AppError + ERROR_CATALOG), utils
│       │                      # unit tests live next to the code (*.test.ts, D-28)
│       └── tests/
│           ├── fixtures/pdfs/ # synthetic PDFs + generate.ts (npm run fixtures:pdfs)
│           ├── helpers/       # buildTestApp(envOverrides), pdfFixturePath/readPdfFixture
│           └── integration/   # Supertest route/middleware tests
└── packages/
    └── shared/                # zod schemas + TS types shared by web & api
        └── src/
            ├── resume.schema.ts
            ├── tailor.schema.ts
            ├── api.schema.ts      # error catalog + response envelopes
            ├── health.schema.ts
            └── fixtures/          # synthetic test data (import via @tailorcv/shared/fixtures)
```

## 5. Data model (shared zod schemas)

All schemas live in `packages/shared` and are the single source of truth for the API contract **and** for Claude's structured output format.

> **Implemented on Day 4:** `packages/shared/src/{resume,tailor,api}.schema.ts`. Text fields are deliberately lenient (no email/URL format checks, free-text dates), because values come from messy PDFs. `LOCKED_FIELDS` exports the 🔒 list for the guardrail service. `llm-compat.test.ts` fails the build if a schema stops being compatible with Claude structured outputs (no recursion, closed objects, supported keywords/formats only).

### 5.1 `Resume`

```ts
Resume = {
  basics: {
    fullName: string
    headline?: string            // e.g. "Senior Frontend Engineer"
    email?: string
    phone?: string
    location?: string
    links: { label: string; url: string }[]   // LinkedIn, GitHub, portfolio
    summary?: string
  }
  experience: {
    id: string                   // stable id, e.g. "exp_1"; used for diffs
    company: string              // 🔒 locked during tailoring
    title: string                // 🔒 locked
    location?: string            // 🔒 locked
    startDate?: string           // 🔒 locked; free text as written ("Jan 2021"); optional (some resumes omit dates)
    endDate?: string             // 🔒 locked; "Present" allowed
    bullets: { id: string; text: string }[]   // ✏️ may be reworded/reordered/trimmed
  }[]
  education: {
    id: string
    institution: string          // 🔒
    degree?: string              // 🔒
    field?: string               // 🔒
    startDate?: string; endDate?: string      // 🔒
    details: { id: string; text: string }[]   // ✏️
  }[]
  skills: { id: string; category: string; items: string[] }[]  // ✏️ reorder/regroup; no new items
  projects: { id: string; name: string; url?: string; description?: string;
              bullets: { id: string; text: string }[]; technologies: string[] }[]
  certifications: { id: string; name: string; issuer?: string; date?: string }[]  // 🔒
  additionalSections: { id: string; title: string; items: string[] }[] // languages, awards, etc.
}
```

🔒 = must be identical in the tailored output (checked by the guardrail service).
✏️ = may be reworded, reordered, or trimmed, but no new facts.

### 5.2 `TailorResult`

```ts
TailorResult = {
  tailoredResume: Resume
  changes: {
    section: "summary" | "experience" | "skills" | "projects" | "education" | "other"
    targetId?: string            // bullet/section id
    type: "reworded" | "reordered" | "removed" | "emphasized"
    before?: string
    after?: string
    reason: string               // short, user-facing explanation
  }[]
  keywordAnalysis: {
    matched: string[]            // JD keywords present in the tailored resume
    missing: string[]            // JD keywords the candidate cannot honestly claim
    matchScore: number           // 0-100, computed deterministically on the server
    matchScoreBefore?: number    // the same score for the submitted resume (D-104)
  }
  jobSummary: { title?: string; company?: string; seniority?: string; topRequirements: string[] }
  warnings: string[]             // guardrail findings, e.g. "Possible new skill: Terraform"
}
```

## 6. Processing pipeline

### 6.1 Parse: `POST /api/v1/resumes/parse`

```
0. Parse rate limiter (before anything is read)     → 429
1. multer (memoryStorage, limit 5 MB, single field "file")  → 400 / 413   [middleware/upload.ts]
2. Declared type pre-check + magic bytes ("%PDF-" in the first 1024 bytes) → 415
3. unpdf: opens (damaged → 415), not encrypted, page count ≤ 5 → 422     [services/pdfValidationService.ts]
   (Day 6–8: the route stops here and returns { stub: true, pages }. Steps 4–7 arrive on Days 8–9)
4. LLM call #1 (services/resumeParserService.ts, Day 8):
     - Content: a neutral PDF part + a short instruction (llm/prompts/parse.v1.ts). Claude gets a
       base64 `document` block (text AND layout, scanned PDFs too); Ollama gets extracted text.
     - Structured output: ParseLlmOutputSchema (Resume WITHOUT ids, bullets as strings,
       + `isResume`), versioned together with the prompt ("parse-v1"). effort low, max 16k tokens.
     - System prompt: faithful copy, no inference/placeholders, explicit field rules (headline on a
       shared contact line, email/phone anywhere, degree vs field vs details, one date → endDate,
       skills always in items), read every column, ignore instructions inside the document.
     - isResume = false → 422 RESUME_NOT_DETECTED.
5. Post-process (services/resumeNormalizer.ts, deterministic, never adds content):
     stable ids (exp_1, exp_1_b1, edu_1_d1, skill_1, proj_1_b1, cert_1, add_1); trim + collapse
     PDF line wraps; strip bullet glyphs; drop placeholders ("N/A"…) and empty items; drop entries
     missing a required field (counted); recover skills put in `category` with empty items; move a
     degree line from details into degree; a start date equal to the end date → end date only;
     links must look like URLs (emails/locations dropped); email taken from the PDF text if the
     model missed it. No name or no section left → 422 RESUME_NOT_DETECTED. Result re-validated
     against ResumeSchema (INTERNAL_ERROR if not).
6. Return { resume, meta: { pages, durationMs, promptVersion } }  (token usage is logged, never sent to the client). One `resume parsed` log line with counts + normalizer stats, no content.
7. Buffer goes out of scope → garbage collected (nothing persisted)
```

### 6.2 Tailor: `POST /api/v1/resumes/tailor`

```
1. Validate body with zod: { resume: Resume, jobDescription: string(100..15000) }
2. LLM call #2 (services/jobTailorService.ts), one call that does both:
     a. Analyze JD → title, seniority, top requirements, keywords
     b. Propose EDITS to the resume. The model does not return the resume (ADR-015).
   Prompt + schema: llm/prompts/tailor.v2.ts ("tailor-v2"). TailorLlmOutputSchema =
   { jobSummary, keywords, headline?, summary, bullets: [{ id, text, reason }],
   removedBulletIds }, lenient (no length/enum constraints; everything is checked in code).
   The user turn is <resume>…</resume> (the resume as plain text, each job/project bullet
   prefixed with its id like "[exp_1_b2]", no contact details) + <job_description>…
   </job_description> + the tone; copies of the delimiter tags inside user text are removed.
   The system prompt states the honesty rules (no added skill, number, action, scale or
   audience) and asks for every bullet of every job to be listed, most relevant first, and
   reworded around the job description only where that makes it match the job better;
   otherwise the original text is returned (D-93, D-97). The headline is a job title the
   candidate has held. Clear typos and grammar mistakes are corrected in every bullet (D-104).
   Structured output: TailorLlmOutputSchema through LlmClient.generateStructured (Claude: JSON
   schema from betaZodOutputFormat; Ollama: inlined JSON schema), validated by us (ADR-011)
2a. keywordService.keywordsFoundIn(model keywords, jobDescription) → keywords (D-104): a keyword
   is kept only if each of its words occurs in the job description (same normalization as the
   matching). A weak model may list the resume's own skills as "the job's keywords", which
   would make every keyword match. Steps 2b–4 use the filtered list.
2b. tailorEdits.applyTailorEdits(original, edits, keywords) → { resume, reasons, stats }
   (deterministic). The tailored resume is the ORIGINAL plus: the new headline/summary;
   reworded bullet text by id (unknown, repeated or blank edits are ignored; bullets the model
   skips stay as they were); each entry's bullets in the model's order; bullets in
   removedBulletIds dropped, but never every bullet of an entry; within each skill group, the
   skills the job's keywords name moved to the front.
3. guardrailService.applyGuardrails(original, tailored, { jobKeywords }) → { resume, warnings, stats }
   (deterministic, no AI, pure; implemented on Day 12, D-88/D-89). "original" = the resume in
   the request, user additions included (ADR-014). Items are matched by id and the result is
   built from the ORIGINAL entries, so only what the model may edit is taken from its answer:
     - (D-104) A reworded bullet or detail that leaves out a number its original states, or
       adds commentary about the candidate ("…, which demonstrates the ability to…",
       "showcasing expertise in…", a reference to the job posting) → original text + warning.
       (D-105) A reworded bullet, detail or summary that mentions the job being applied for
       ("…for this job", "relevant to this role", "the target position") → original + warning.
       A new headline that is not a job title from the resume (letter case aside) → original
       headline + warning
     - Locked fields (LOCKED_FIELDS + name, email, phone, location, links, project name/link,
       section title) → always the original value; warning if the model changed one
       (a change in letter case or spacing only is restored without a warning)
     - New job / school / certification / project / section, or a second entry reusing an id
       → dropped + warning
     - Job / school / certification left out → put back + warning; these three sections keep
       the original order. Projects and extra sections may be reordered or removed
     - Bullet points and details: reword / reorder / remove allowed; an unknown or repeated id
       → dropped + warning (so the count is never above the original)
     - Skills and project technologies: must occur in the original resume's text as whole
       words, any letter case ("Java" is not found in "JavaScript") → else removed + warning.
       Groups may be regrouped; groups sharing an id are merged; empty groups are dropped
     - Extra-section items: must be an item of the same original section → else removed + warning
     - Headline, summary, bullet points, details, project description: a rewrite containing a
       number that appears nowhere in the original → original text kept + warning
     - The same texts: a rewrite that mentions a job keyword the original resume does not
       cover AND that contains a word the resume never uses in any form ("worked with GraphQL
       APIs") → original text kept + warning (D-95, D-96). A keyword made only of words the
       resume already uses ("frontend performance") is allowed: honest rewording is how the
       keyword score is meant to rise
   `warnings` are user-facing and contain resume text; `stats` are counts only (the only part
   that may be logged).
4. keywordService.analyzeKeywords(keywords, tailoredResume) → { matched, missing, matchScore }
   (deterministic, implemented on Day 13, D-91). `keywords` is the list from the model's job
   analysis (step 2a). Both sides are normalized: lowercase, punctuation → spaces ("+", "#" and
   inner dots stay: "c++", "c#", "node.js"), words reduced to a rough stem (plurals, "-ed",
   "-ing", final "e": "mentored" = "mentor"), aliases ("JS" =
   "JavaScript", "k8s" = "Kubernetes", "AWS" = "Amazon Web Services"…). A keyword matches when
   its words occur in ONE resume field, adjacent and in order (whole words: "Java" is not in
   "JavaScript"). Blank and repeated keywords are dropped. Score = round(100 × matched / total),
   0 when there are no keywords.
4b. tailorEdits.describeChanges(original, finalResume, reasons) → changes[]: every real
   difference between the original and the post-guardrail resume (reworded with before/after
   and the model's reason, reordered, removed). The model does not write the change list.
   (D-105) The model's reason is used only when it is a reason: blank, longer than 30 words, or
   containing the bullet's before/after text → a default reason. A change of only letter case,
   punctuation or spacing gets the reason "Fixed spelling, capitalization or punctuation." and
   is counted as `bulletsCorrected`, not `bulletsReworded` (the change type stays `reworded`).
5. Return TailorResult + meta. One `resume tailored` log line with counts only (keyword
   score before/after, changes, warnings, edit and guardrail stats); never text or keywords
```

### 6.3 LLM integration details

| Setting | Value | Notes |
|---|---|---|
| Provider switch | `LLM_PROVIDER` = `ollama` (local development, default outside production) or `anthropic` (required in production) | `createLlmClient()` in `apps/api/src/llm/index.ts` is the only place that picks; everything else takes an `LlmClient` (ADR-012). Requests use provider-neutral types (content = text/PDF parts), an ESLint boundary blocks SDK/concrete-client imports outside `src/llm/`, and a contract suite runs the same scenarios against every client (ADR-013). The hosted provider for production is decided before Day 24 (OD-10) |
| SDK | `@anthropic-ai/sdk` 1.6 | Official SDK, no raw `fetch`. Sends the key as `Authorization: Bearer` with API version `2026-10-21` |
| Model | `claude-opus-5-5` | Read from `ANTHROPIC_MODEL` env var so it can be changed without a code change |
| Method | `client.beta.messages.create()` with `output_config.format` = the JSON schema from `betaZodOutputFormat(schema)`, then **our own** `JSON.parse` + `schema.safeParse` | Beta endpoint because of `fallbacks`. Own validation (instead of `.parse()`) gives a typed schema-mismatch signal for the retry and lets us check `stop_reason` first (D-63). Implemented in `apps/api/src/llm/AnthropicLlmClient.ts` behind the `LlmClient` interface (ADR-011) |
| Thinking | `thinking: { type: "adaptive" }` | Opus 5.5 always thinks. `effort` controls how deep |
| Effort | Parse: `low` · Tailor: `medium` (to be tuned with evals in Phase 5) | Set explicitly. The default for Opus 5.5 is `medium` |
| `max_tokens` | 16000 | Non-streaming. A resume JSON fits easily |
| Refusal fallback | beta `server-side-fallback-2026-07-01` + `fallbacks: "default"` | `stop_reason` is checked first: `refusal` (whole chain declined) → `AI_PROVIDER_ERROR` "declined", category logged, no retry. `max_tokens` (truncated JSON) → `AI_INVALID_OUTPUT`, no retry |
| Retries | SDK default `maxRetries: 2` (408/409/429/5xx/network) | Plus one app-level retry when the answer is invalid JSON or fails the zod schema (`MAX_ATTEMPTS = 2`) |
| Timeout | 90 s per attempt (`LLM_TIMEOUT_MS`) + **overall deadline per call incl. all retries** (`LLM_DEADLINE_MS`: 120 s Claude, 5 min Ollama; D-72) | `withDeadline` wraps every client from `createLlmClient()`: aborts through the neutral `signal`, stops waiting even if a client ignores it, → `AI_TIMEOUT`. A client disconnect also aborts the call (controller). Frontend shows progress steps meanwhile |
| Prompt caching | `cache_control` on the stable system prompt | Lowers cost when the same resume is re-tailored |
| Errors | Typed SDK errors, most specific first: `APIConnectionTimeoutError` → `AI_TIMEOUT`; `APIConnectionError`, 429, 5xx/529 → `AI_PROVIDER_ERROR`; other 4xx (400 malformed, 401/403 key, 404 model) → `INTERNAL_ERROR` (our bug/config, D-64) | Logged with status, error type and upstream request id only. See API spec §5 |
| Cost tracking | One `llm call completed` log line per call: prompt version, effort, model, served-by model, attempt, stop reason, input/output/cache-read/cache-creation tokens, duration | Never log the prompt, document or answer (tested) |
| Testing | `FakeLlmClient` (queued data/errors, validated against the caller's schema) for all app tests; the real SDK is tested against a local fake Messages API; `npm run llm:smoke -w @tailorcv/api` makes one tiny real call | CI never calls the real API |

**Local development with Ollama (D-68, ADR-012):** `OllamaLlmClient` calls Ollama's `/api/chat` with `format` = the inlined JSON schema (`z.toJSONSchema`), `temperature: 0`, explicit `num_ctx`, `num_predict = maxTokens`, and the same zod validation / retry-once / error codes. PDFs are converted to text with unpdf first (no layout); `effort` is ignored. Expect weaker extraction (first test: fields verbatim but it invented skill categories) and ~20 s+ per resume on an M3 Pro with `llama3` 8B. Prompt quality for real users must be checked on the production provider before launch.

Prompts live in `apps/api/src/llm/prompts/*.ts` as versioned template functions (`parse.v1.ts`, `tailor.v2.ts`). The prompt version is written to the logs so output quality can be tied back to a specific prompt.

**Prompt-injection note:** the JD and the resume are untrusted user text. They go inside clearly delimited tags (`<job_description>…</job_description>`), and the system prompt tells the model to treat them only as data. The guardrail service is the real enforcement layer.

### 6.4 Frontend state & flow

- **Session store** (Day 9, React context, D-73): `{ parsed: ParseResponse | null, additions: ResumeAdditions, jobDescription, tailorResult: TailorResponse | null }` in `src/state/` (`sessionContext.ts`: context, types, storage helpers, `useSession`; `session.tsx`: `<SessionProvider>`). Mirrored to `sessionStorage` (`tailorcv.session.v1`) in try/catch, validated with the shared schemas on load (corrupt/old data is dropped). A new resume clears the old additions and tailoring result; changing the additions clears the tailoring result. A session stored before `additions` existed loads with none. Never sent anywhere.
- **API layer** (Day 9, `src/api/`): `apiRequest(path, { schema, … })` validates success bodies with the shared schemas and throws one `ApiError` (`code`, `status`, `requestId`, `details`) for server errors and for browser-side `NETWORK_ERROR` / `BAD_RESPONSE` / `ABORTED`. `toFriendlyError()` (`errorMessages.ts`) maps every code to a title, message and next action (`retry` / `choose-file` / `edit-input` / `wait`), typed so a new code without copy fails to compile. TanStack Query provides mutation state; mutations never auto-retry.
- **Routes**: `/` (upload) → `/review` → `/job` → `/result`. Route guards (`RequireSession`) send the user back to the first step whose data is missing (`/review`, `/job` need a parsed resume; `/result` needs a tailoring result).
- **Loading UX**: a step indicator ("Reading your resume…", "Analyzing job description…", "Tailoring…"). It is time-based in MVP and becomes real streamed progress in Phase 2 (SSE). Upload (Day 10): messages change at 8 s and 25 s (local models can take up to a minute), elapsed seconds, and a Cancel that aborts the request (the API then cancels the AI call). Tailoring (Day 15): `features/job/StepProgress.tsx` lists three steps ("Analyzing job description…" → "Tailoring your resume…" → "Checking accuracy…"), the active one changing at 4 s and 12 s (`tailorSteps.ts`), with elapsed seconds, a note after 30 s, and Cancel.
- **Job description page** (Day 15): `pages/JobDescriptionPage.tsx`: a textarea bound to the session's `jobDescription` (kept on refresh and when going back), a live counter of the trimmed length against the shared 100–15,000 limits, and a length check (`features/job/jobDescriptionChecks.ts`) that shows its message only after the first submit attempt. Submit sends `{ resume: applyResumeAdditions(parsed.resume, additions), jobDescription }` through `useTailorResume` (a mutation, never auto-retried); on success the result goes into the session and the app moves to `/result`. API errors use the friendly copy; a server `VALIDATION_ERROR` about `jobDescription` shows the server's field message.
- **Upload page** (Day 10): choosing or dropping a file runs instant client checks with the shared `UPLOAD_LIMITS` (PDF by type or `.pdf` name, not empty, ≤ 5 MB) and then uploads right away; errors show `toFriendlyError()` copy, a "Try again" button only for retryable codes, and the request id as a reference; success stores the `ParseResponse` and navigates to `/review`.
- **PDF export**: `<ResumeDocument resume={tailoredResume} template="classic" />` rendered with `@react-pdf/renderer`'s `pdf().toBlob()` and downloaded as `FirstName_LastName_<Company>.pdf`.
- **Review page** (Day 11, D-84 → D-85): `features/resume-review/ResumeSummary.tsx` shows a **compact summary** of the parsed resume, not a resume look-alike: a Contact grid, then one line per job, school, project and certification (title · detail, dates), skills as one line per category, and the long text (bullet points, education details, the profile summary) folded into `<details>`. Section headings carry counts. The user can **add** what the PDF lacks: a missing headline/email/phone/location, skills (duplicates refused, case-insensitive), bullet points on an existing job, and certifications; each addition is marked "Added by you" and can be removed. The parsed resume is never edited: additions are kept separately in the session (`ResumeAdditions`) and merged with the shared, pure `applyResumeAdditions()` (fills only blank contact fields, appends an "Additional skills" group, gives new bullets/certifications the next free id). The page's counts line and "We couldn't find…" warning use the merged resume. **The tailor request (Day 15) must send the merged resume**; `TailorRequestSchema` rejects duplicate ids. Every value is plain text (resume links are never clickable). "Looks good, continue" → `/job`; "Upload a different file" clears the session → `/`. `features/resume-view/ResumeView.tsx` (full read-only resume) is kept for the tailored preview (Day 16).
- **HTML preview** and **PDF template** share one layout spec (section order, fonts) so they look the same.

## 7. Security & privacy

| Concern | Control |
|---|---|
| API key exposure | `ANTHROPIC_API_KEY` exists only on the backend, loaded from env and validated at startup |
| Malicious uploads | MIME type + magic-byte check, 5 MB limit, page limit, memory storage only, no shell-outs |
| Abuse / cost blowup | `express-rate-limit`: 10 parses and 20 tailors per IP per hour (`RATE_LIMIT_PARSE_PER_HOUR` / `RATE_LIMIT_TAILOR_PER_HOUR`), applied per route family, in-memory store (single instance), `429 RATE_LIMITED` + `Retry-After`. `trust proxy` = `TRUST_PROXY` (1 on Render) so the real client IP is used. JSON body limit 200 KB → `413 PAYLOAD_TOO_LARGE` |
| AI spend (D-101, D-102) | Before any call to the provider: per-IP rate limit → body ≤ 200 KB → schema (job description ≤ 15,000 chars, resume ≤ 40,000 chars of text, PDF ≤ 5 MB and ≤ 5 pages) → **service-wide limits** in `llm/withUsageLimits.ts` (`LLM_DAILY_CALL_LIMIT` 300 calls per UTC day, `LLM_MAX_CONCURRENT` 4 in flight; in memory, per process). Per call: `max_tokens` 16,000, 90 s timeout, overall deadline, cancelled when the client disconnects. Last line of defence: a spend limit in the provider console (to set, OD-10) |
| PII in logs | Access log uses minimal serializers: `req {id, method, url without query}`, `res {statusCode}`, `responseTime`. No headers, query or body. pino `redact` as a second line of defence (auth/cookie headers, `body`, `*.resume`, `*.jobDescription`, `*.buffer`). Token usage is added on Day 7 |
| Data retention | MVP stores nothing. The privacy note in the UI says so |
| CORS | Exact allowlist from `CORS_ORIGIN` (comma-separated URLs, no wildcards, preview URLs not allowed), methods `GET, POST`, exposes `X-Request-Id` and `Retry-After` |
| Headers | API: helmet defaults, `x-powered-by` disabled. Frontend host: strict CSP (Day 24) |
| Dependency risk | `npm audit` in CI, Dependabot |
| Prompt injection | Resume and job description are sent as delimited data (our delimiter tags are stripped from user text) with an instruction to ignore instructions inside them. The model has no tools and returns schema-checked JSON only, so injected text cannot trigger an action. Its edits are applied by id to the original resume and checked by the deterministic guardrails (§6.2 step 3). Output is shown as plain text; links are never clickable |

## 8. Error handling strategy

- One `AppError` class (`apps/api/src/lib/errors.ts`): `new AppError(code, { message?, details?, cause? })` → `{ code, status, message, details }`. Status and default user message come from `ERROR_CATALOG`, typed `Record<ErrorCode, …>` against the shared `ERROR_CODES` (a missing entry fails to compile). `cause` is logged, never sent.
- A central `errorHandler` turns any thrown error into the standard error response (API spec §4), with `requestId`. body-parser errors map to `PAYLOAD_TOO_LARGE` / `VALIDATION_ERROR`, and any other client error that Express/body-parser flags with `expose: true` + a 4xx status becomes `VALIDATION_ERROR` (third-party errors that merely carry a `status`, such as an SDK 401, stay `INTERNAL_ERROR`). Anything unknown becomes `INTERNAL_ERROR` with a generic message, and the real error is logged at error level. `notFoundHandler` answers every unmatched path with `NOT_FOUND`. See ADR-010.
- Error responses are sent only after any unread request body (≤ 6 MB) is discarded; otherwise a client still uploading sees a connection reset instead of the JSON (D-66). Larger unread bodies get `Connection: close`.
- The frontend maps `error.code` to a friendly message and a suggested action (for example, `PDF_TOO_MANY_PAGES` → "Please upload a resume of 5 pages or fewer").

## 9. Environments & deployment

| Env | Frontend | API | Notes |
|---|---|---|---|
| local | `vite dev` :5173 | `tsx watch` :4000 | Vite proxies `/api` → :4000 |
| preview | Vercel preview per PR | Render preview (optional) | |
| production | Vercel | Render / Fly.io (Docker) | Env vars set in the provider dashboards |

**Environment variables (API):**

| Var | Example | Required |
|---|---|---|
| `PORT` | `4000` | no |
| `NODE_ENV` | `development` | no |
| `ANTHROPIC_API_KEY` | `sk-ant-…` | **yes in production** (startup fails without it); optional in development/test (AI calls fail with `INTERNAL_ERROR`) |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | no (default) |
| `CORS_ORIGIN` | `http://localhost:5173,https://<app>.vercel.app` (comma-separated exact origins) | no (default localhost) |
| `TRUST_PROXY` | `1` on Render, `0` locally | no |
| `RATE_LIMIT_PARSE_PER_HOUR` | `10` | no |
| `RATE_LIMIT_TAILOR_PER_HOUR` | `20` | no |
| `LLM_TIMEOUT_MS` | `90000` | no |
| `LLM_DEADLINE_MS` | `120000` (anthropic) / `300000` (ollama) | no (default depends on `LLM_PROVIDER`) |
| `LLM_PROVIDER_SWITCH` | `false` | no. **Development only, temporary (D-103):** `true` builds both providers and lets a request choose one with `X-LLM-Provider`; the web app then shows "Local model / Claude" buttons in the header. Production refuses it. Removed before the production deploy |
| `LLM_DAILY_CALL_LIMIT` · `LLM_MAX_CONCURRENT` | `300` · `4` | no (service-wide AI limits, D-101) |
| `LLM_PROVIDER` | `ollama` / `anthropic` | no (default `ollama` in development/test, `anthropic` in production; production refuses `ollama`) |
| `OLLAMA_BASE_URL` · `OLLAMA_MODEL` · `OLLAMA_TIMEOUT_MS` · `OLLAMA_NUM_CTX` | `http://localhost:11434` · `llama3` · `300000` · `8192` | no (local development only) |
| `LOG_LEVEL` | `info` | no |

**Frontend:** `VITE_API_BASE_URL` (empty in local dev because the Vite proxy handles it).

## 10. Testing strategy

| Level | Tool | What |
|---|---|---|
| Unit | Vitest | Schemas, guardrail rules and keyword scoring (≥ 90% branch coverage enforced by `npm test`, D-90), prompt builders, id assignment, error mapping, resume normalizer, LLM clients (stubbed SDK) |
| Integration (API) | Vitest + Supertest | Routes with `FakeLlmClient` (deterministic answers/errors via `buildTestApp(env, { llm })`); every error code per route |
| LLM clients (real transport) | Vitest + local fake HTTP APIs | The real Anthropic SDK and the Ollama client against local fakes of their APIs (headers, retries, timeouts, aborts) |
| LLM contract | Vitest (`tests/contract/llmClient.contract.test.ts`) | The same scenarios against every provider client, identical outcomes required (ADR-013) |
| Component | React Testing Library | Upload page (checks, loading, cancel, errors, retry, hand-off), session store + route guards, API client; later JD form, change list |
| E2E | Playwright | Upload fixture PDF → tailor → download (LLM mocked by an API test mode) |
| AI quality evals | Script + fixture set (Phase 5, started in MVP) | 10–20 synthetic resumes × JDs. Check for fabrication, locked fields, keyword coverage |

The LLM is put behind an `LlmClient` interface so tests can inject a fake. CI never calls a real model (Claude or Ollama). Practices: after writing tests, break the code once on purpose to prove they fail (D-33); before pushing, simulate CI in a clean copy; parse quality is measured with `npm run parse:pdf` (local, real model) and recorded in the DEVLOG.

## 11. Observability (MVP → later)

- MVP: pino JSON logs. Access log (Day 5): `req.id` (= `X-Request-Id`), `req.method`, `req.url` (path only), `res.statusCode`, `responseTime` (ms). 4xx → warn, 5xx → error, `/health` not logged. LLM (Day 7): one `llm call completed` line per call (provider, prompt version, effort, model/served-by, attempt, stop reason, token usage, duration) plus error/timeout lines with status and upstream request id. Parse (Day 8): one `resume parsed` line with counts and normalizer stats. Startup: `LLM provider: …`. Never prompts, documents or answers (tested).
- Later: OpenTelemetry traces, a cost dashboard, Sentry for frontend and backend errors.

## 12. Evolution path (how later phases fit without a rewrite)

| Phase | Architectural change |
|---|---|
| 2 | Add `PUT`-style client-side editing (no backend change). Add an SSE variant of tailor for live progress. Add DOCX export (`docx` package, server or client) |
| 3 | Add PostgreSQL + Drizzle. Tables: `users`, `base_resumes` (JSON column holding `Resume`), `job_targets`, `tailored_resumes`. Add Better Auth. The parse endpoint gains an optional "save" flag |
| 4 | New services (`coverLetterService`, `jdFetchService`) reuse `llmClient` and the shared schemas. Add a Stripe webhook route |
| 5 | Job queue (BullMQ + Redis) if long-running work grows. Eval harness in CI. OpenTelemetry |
