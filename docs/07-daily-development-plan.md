# 07 — Day-by-Day Development Plan (Phase 0 → MVP Release)

| Field | Value |
|---|---|
| Status | Draft v0.1, not started |
| Last updated | 2026-11-03 |
| Working mode | Pair programming (you + Claude), one focused session per day |
| Covers | Phase 0 (Foundation) + Phase 1 (MVP), 25 working days |
| Task IDs | Refer to [04-implementation-roadmap.md](04-implementation-roadmap.md) |
| Daily log | [DEVLOG.md](DEVLOG.md), updated at the end of **every** session |

---

## How each day works

**Start of session (about 10 min)**
1. Read `docs/DEVLOG.md` → the "Current Status" section and the last session entry.
2. Find today's day in this plan and confirm the goal (or adjust it if yesterday slipped).
3. `git pull` / `git status`, then `npm install` if dependencies changed.

**During the session**
- Work only on today's tasks. If something new comes up, add it to "Parking lot" in DEVLOG instead of starting it.
- Commit small and often, using Conventional Commits that reference the task ID (`feat(api): BE-3 upload middleware`).

**End of session (about 10 min)**
1. Run `npm run lint && npm run typecheck && npm test` (from Day 3 onward).
2. Tick the checkboxes for today below.
3. Append a session entry to `DEVLOG.md`: what was done, decisions, issues, and the next step.
4. Update the "Current Status" block in DEVLOG.
5. Commit (`docs: devlog day N`).

**Slip rule:** if a day's exit check isn't met, the next session starts by finishing it. Buffer days (marked 🛟) absorb slippage. If a buffer day is unused, start the next day early.

---

## Overview

| Week | Days | Focus | Milestone at end of week |
|---|---|---|---|
| 1 | 1–5 | Phase 0 foundation + contracts | Skeleton app running, CI green, schemas + error handling in place |
| 2 | 6–11 | M1.2 Upload & parse | Upload a PDF → see the structured resume |
| 3 | 12–17 | M1.3 Tailor | Paste a JD → see the tailored resume, changes, keyword match |
| 4 | 18–23 | M1.4 Export & polish | Download PDF, responsive + accessible, E2E + evals pass |
| 5 | 24–25 | M1.5 Release | MVP live in production |

---

## Week 1: Foundation & contracts

### Day 1: Kickoff, repo & tooling
**Goal:** settle the open decisions and have a clean, linted, empty monorepo committed to git.
**Tasks:** decisions · PLT-1 · PLT-2

- [x] Settle the open decisions (record each one in DEVLOG + mark the ADR as Accepted):
  - [x] TypeScript vs plain JS (ADR-001) → TypeScript (D-6)
  - [x] Hosting: Vercel + Render? (Tech Design §9) → yes, free tiers (D-9, ADR-009)
  - [x] Working product name (can stay "TailorCV") → `@tailorcv` (D-7)
  - [x] GitHub account/org for the repo → private, user's account (D-8). _Anthropic API key moved to OD-4 (needed Day 7)_
- [x] `git init`, `main` branch, `.gitignore` (node_modules, dist, .env, coverage, playwright-report)
- [x] Root `package.json` with `workspaces: ["apps/*", "packages/*"]`, `.nvmrc` (24)
- [x] `tsconfig.base.json` (strict, ES2023, moduleResolution Bundler)
- [x] ESLint flat config (typescript-eslint, react-hooks) + Prettier + `.editorconfig`. _Import-order plugin deferred (D-13)_
- [x] Root scripts: `lint`, `format`, `typecheck`
- [x] First commit: `chore: initialize monorepo`

**Deliverable:** repo with tooling. `npm run lint` passes on the empty project.
**Exit check:** `git log` shows the first commit, and the decisions are recorded in DEVLOG.

---

### Day 2: Scaffold the three workspaces
**Goal:** `packages/shared`, `apps/api` and `apps/web` exist and each one runs on its own.
**Tasks:** PLT-3 · PLT-4 · PLT-5

- [x] `packages/shared`: package.json, tsconfig, `src/index.ts`, zod dependency, export one placeholder schema
- [x] `apps/api`: Express 5, `src/app.ts` (factory), `src/server.ts`, `src/config/env.ts` (zod-validated env), pino logger, `GET /api/v1/health`
- [x] `apps/api/.env.example`
- [x] `apps/web`: Vite + React + TS, Tailwind v4, React Router with 4 placeholder routes (`/`, `/review`, `/job`, `/result`)
- [x] Vite dev proxy `/api` → `http://localhost:4000`
- [x] Home page fetches `/api/v1/health` and shows "API: ok" _(in the footer, on every page)_
- [x] Both apps import something from `@tailorcv/shared` (proves the workspace link works)
- [x] User confirms "API: ok" in the browser + commit (no push, per user)

**Deliverable:** run the api and the web separately, and the browser shows "API: ok".
**Exit check:** `curl localhost:4000/api/v1/health` returns `{status:"ok"}`, and the UI shows the status.

---

### Day 3: Tests, single dev command, CI
**Goal:** a safety net is in place. Every future change is linted, type-checked and tested automatically.
**Tasks:** PLT-6 · PLT-7 · PLT-8

- [x] Vitest in all 3 workspaces (+ React Testing Library + jsdom in web, Supertest in api)
- [x] Sample tests: shared schema test, `GET /health` integration test, `<App/>` render test _(13 tests)_
- [x] Root `npm test`, `npm run build` _(+ `npm run check`)_
- [x] `concurrently` → root `npm run dev` starts api + web
- [x] Create the GitHub repo and push _(done early on Day 1, D-18: https://github.com/tmuzu98/tailorcv)_
- [x] `.github/workflows/ci.yml`: Node 24, `npm ci`, lint, typecheck, test, build _(first run green: run 41776288280)_
- [x] ~~Branch protection on `main`~~ _(skipped by decision D-35: needs GitHub Pro or a public repo)_
- [x] Update the README quickstart

**Deliverable:** CI is green on GitHub.
**Exit check:** ✅ **Phase 0 complete.** A fresh clone, then `npm install && npm run dev`, works.

---

### Day 4: Shared schemas (the contract)
**Goal:** the data contract is final, so the frontend and backend can be built against it independently.
**Tasks:** SHR-1 · SHR-2

- [x] `resume.schema.ts`: full `ResumeSchema` per Tech Design §5.1 (basics, experience, education, skills, projects, certifications, additionalSections, with ids on items and bullets)
- [x] `tailor.schema.ts`: `TailorRequestSchema`, `TailorResultSchema`, `ChangeSchema`, `KeywordAnalysisSchema`
- [x] `api.schema.ts` _(renamed from api.types.ts)_: `ApiErrorResponseSchema`, `ERROR_CODES`, `ParseResponseSchema`, `TailorResponseSchema`
- [x] Export the inferred TS types (`type Resume = z.infer<…>`)
- [x] Confirm the schema works with Claude structured outputs (quick check: no unsupported zod features)
- [x] Fixtures _(as typed TS in `packages/shared/src/fixtures/`)_: `sampleResumeSwe`, `sampleResumeNewGrad`, JDs `frontendEngineer`, `dataAnalyst`, `productManager`, plus a known-good `sampleTailorResultSweFrontend` (all synthetic)
- [x] Unit tests: the fixtures validate, and bad data is rejected _(53 shared tests)_

**Deliverable:** `@tailorcv/shared` exports all the schemas and types.
**Exit check:** tests are green, and the API spec doc matches the schemas.

---

### Day 5: Error foundation & security middleware (+ optional deploy) 🛟
**Goal:** the API handles errors consistently and is protected against basic abuse.
**Tasks:** BE-1 · BE-2 · (PLT-9 optional)

- [x] `lib/errors.ts`: `AppError` + error catalog (codes → HTTP status + user message)
- [x] `middleware/requestId.ts`, pino-http with **redaction** of body fields
- [x] Central `errorHandler` middleware → standard error JSON (API spec §4), plus a 404 handler
- [x] helmet, CORS allowlist from env, `express.json({ limit: "200kb" })`
- [x] Rate limiters (parse/tailor limits from env) → `RATE_LIMITED` with Retry-After
- [x] Tests: unknown route → 404 JSON, thrown AppError → correct shape, rate limit triggers
- [ ] *(Optional)* Deploy the skeleton to Vercel + Render and record the URLs in DEVLOG. **Deferred to Day 24** (user decision, D-45)
- [x] Week 1 review: update the README status, write the DEVLOG week summary

**Deliverable:** hardened API skeleton.
**Exit check:** ✅ **Milestone 1.1 complete.**

---

## Week 2: Upload & parse (vertical slice #1)

### Day 6: PDF upload & validation
**Goal:** the API accepts a valid PDF and rejects bad ones with the correct error codes.
**Tasks:** BE-3 · BE-4

- [x] Create synthetic test PDFs in `apps/api/tests/fixtures/pdfs/`: a valid 1-page and 2-page resume, a 2-column layout, a 7-page file, an encrypted file, a non-PDF renamed to `.pdf`, an empty file (+ a damaged PDF; generated by `generate.ts`)
- [x] `middleware/upload.ts`: multer memoryStorage, 5 MB limit, single `file` field → `FILE_MISSING` / `FILE_TOO_LARGE`
- [x] Magic-byte check (`%PDF-`) → `UNSUPPORTED_FILE_TYPE`
- [x] `services/pdfValidationService.ts` (unpdf): page count → `PDF_TOO_MANY_PAGES`, encryption → `PDF_ENCRYPTED`
- [x] Unit tests for every rejection path
- [x] *(Added)* Temporary `POST /resumes/parse` stub (rate limit → upload → validation → `{ stub, pages }`), with integration tests. **Day 9 replaces the stub response** (D-57)

**Deliverable:** validation layer complete.
**Exit check:** every bad fixture returns its expected error code in tests.

---

### Day 7: LLM client
**Goal:** one reliable, testable wrapper around the Claude API.
**Tasks:** AI-1

- [x] Install `@anthropic-ai/sdk`. Add `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` to env validation (+ `LLM_TIMEOUT_MS`; key required in production only, D-65)
- [x] `llm/LlmClient.ts` interface: `generateStructured<T>({ system, content, schema, effort, maxTokens })` (+ `promptVersion`)
- [x] `llm/AnthropicLlmClient.ts`: ~~`messages.parse()` + `zodOutputFormat`~~ `beta.messages.create()` + `betaZodOutputFormat` + own zod validation (D-63), adaptive thinking, explicit effort, refusal fallback beta, cached system prompt, 90 s timeout
- [x] Check `stop_reason` (`refusal`, `max_tokens`) before using the output
- [x] Map typed SDK errors → `AI_PROVIDER_ERROR` / `AI_TIMEOUT` / `AI_INVALID_OUTPUT` (+ `INTERNAL_ERROR` for our 4xx, D-64). Do one app-level retry on schema failure
- [x] Log token usage + duration + prompt version (no content)
- [x] `llm/FakeLlmClient.ts`: returns fixture responses, can simulate errors
- [x] Smoke script `npm run llm:smoke`: one tiny real call to confirm the key and model work. **Ran green on local Ollama (`llama3`); a real Claude call is deferred until a key exists (OD-10)**
- [x] *(Added, D-68)* `OllamaLlmClient` for free local development + `LLM_PROVIDER` switch (production refuses `ollama`)
- [x] *(Added, D-69)* Provider-neutral content types, ESLint provider boundary, LLM client contract suite (switching = config only)
- [x] *(Added)* Final structured-outputs check against the SDK's exact schema output (`outputFormat.test.ts`, D-62)
- [x] *(Added, bug found today)* Error responses drain unread upload bodies first, so a rate-limited upload gets its 429 instead of a connection reset (D-66)

**Deliverable:** LLM layer with a real and a fake implementation.
**Exit check:** the smoke script succeeds, and unit tests pass using the fake client.

---

### Day 8: Resume parsing with AI
**Goal:** a PDF goes in, and a correct structured `Resume` comes out.
**Tasks:** AI-2

- [x] `llm/prompts/parse.v1.ts`: extraction rules (faithful, no inference, keep the original bullet wording, leave missing fields empty, detect "not a resume") + `ParseLlmOutputSchema` (no ids, `isResume`)
- [x] `services/resumeParserService.ts`: PDF ~~base64 → document block~~ → neutral PDF part (D-69) → `Resume`
- [x] Post-processing: assign stable ids (`exp_1`, `exp_1_b1`…), trim whitespace, remove empty items (+ fixes for small-model mistakes, email rescue: `services/resumeNormalizer.ts`)
- [x] `RESUME_NOT_DETECTED` handling (model flag + nothing usable extracted; `invoice.pdf` fixture)
- [x] Manual run against the 3 synthetic PDFs ~~(real API)~~ (local Ollama `llama3`, D-68). Compare the output to the expected result and record accuracy notes in DEVLOG (`npm run parse:pdf`, scored by `tests/fixtures/pdfs/expected.ts`)
- [x] Unit tests for post-processing (id assignment, cleanup)

**Deliverable:** working parser service.
**Exit check:** the 2-column fixture parses correctly, and the results are recorded.

---

### Day 9: Parse endpoint + frontend plumbing
**Goal:** the parse endpoint is exposed, and the frontend is ready to call it.
**Tasks:** BE-5 · FE-2 · FE-3

- [x] `routes/resumes.ts` + `controllers/resumesController.ts` → `POST /api/v1/resumes/parse`. **The route + upload/validation/rate limit already exist as a Day 6 stub (D-57): replace its `{ stub, pages }` response with the real `ParseResponse`, and remove the stub note from API spec §2**
- [x] Dependency injection: the app factory accepts an `LlmClient` (real in dev, fake in tests)
- [x] Integration tests (Supertest + fake LLM): happy path + every error code
- [x] FE `api/client.ts`: typed fetch wrapper, parses the standard error into an `ApiError`
- [x] FE `api/errorMessages.ts`: error code → friendly message + suggested action
- [x] FE session store (~~context or Zustand~~ React context, D-73): `parsedResume`, `jobDescription`, `tailorResult`, mirrored to sessionStorage inside try/catch
- [x] Route guards (`/review` needs `parsedResume`, and so on)
- [x] *(Added, D-72)* Overall AI deadline (`withDeadline`, `LLM_DEADLINE_MS`) + cancel the AI call when the client disconnects
- [x] *(Added)* TanStack Query provider (D-25), `zod` declared as a direct web dependency

**Deliverable:** parse API done, and the FE data layer is ready.
**Exit check:** `curl -F file=@sample.pdf localhost:4000/api/v1/resumes/parse` returns a Resume.

---

### Day 10: Upload page
**Goal:** the user can upload a PDF from the UI.
**Tasks:** FE-1

- [x] Basic UI primitives: Button, Card, Alert, Spinner (Tailwind) in `components/ui/`
- [x] App layout: header, container, footer with a privacy note (existing Day 2 layout kept; polish on Day 20)
- [x] Upload page: drag-and-drop zone + file picker, client-side checks (type, 5 MB, empty) using the shared `UPLOAD_LIMITS`
- [x] TanStack Query `useParseResume` mutation, loading state ("Reading your resume…" → time-based messages for long local-AI waits, elapsed seconds, Cancel)
- [x] Error display that uses the friendly messages, plus a retry
- [x] On success → store the parsed resume → navigate to `/review`
- [x] Component tests: rejects a non-PDF, shows the loading state, shows an API error (+ size/empty, blank MIME type, success hand-off, multipart, drag and drop, cancel, retry, network error)
- [x] **Exit check by the user in a real browser** (2026-11-09, DEVLOG Session 13: a real 1-page PDF landed on `/review`)

**Deliverable:** working upload page.
**Exit check:** uploading a real PDF in the browser lands on `/review`.

---

### Day 11: Review page + Milestone 1.2 demo 🛟
**Goal:** the user sees the parsed resume clearly. First end-to-end demo.
**Tasks:** FE-4 · buffer

- [x] `features/resume-view/ResumeView.tsx`: renders every section of `Resume` (reused later for the tailored preview)
- [x] Review page: ~~ResumeView~~ compact `ResumeSummary` (D-85) + "Looks good, continue" + "Upload a different file" (+ counts line and a "We couldn't find…" warning, D-84)
- [x] *(Added, D-85)* The user can add missing contact details, skills, bullet points and certifications; `ResumeAdditions` + `applyResumeAdditions()` in `packages/shared`; additions in the session; tailor request rejects duplicate ids (ADR-014)
- [x] Handle empty sections gracefully (empty sections and blank optional fields are skipped)
- [x] Component tests with the fixture resumes (`pages/ReviewPage.test.tsx` 16, `features/resume-view/ResumeView.test.tsx` 5, `resumeAdditions.test.ts` 16 in shared)
- [x] **User checks the compact review page in a real browser** (add + remove a skill, a bullet point, a certification; refresh keeps them) _(passed 2026-11-14)_
- [x] **Demo:** upload 3–5 different PDFs and record any parsing issues in DEVLOG _(1 real PDF, confirmed correct by the user, + the 3 synthetic resume fixtures through the running app, 2026-11-14)_
- [x] Fix bugs and catch up on any slipped tasks _(the demo found no bugs, 2026-11-14)_

**Deliverable:** ✅ **Milestone 1.2 complete.** Upload → structured resume.
**Exit check:** the demo works on all the test PDFs.

---

## Week 3: Tailoring (vertical slice #2)

### Day 12: Guardrail service (test-first)
**Goal:** the honesty guarantee exists before any tailoring prompt is written.
**Tasks:** AI-4

- [x] Write the tests first, with handcrafted "bad tailored output" fixtures (`services/guardrailService.test.ts`, 58 tests; they failed before the service existed):
  - [x] changed company / title / date / degree → restored + warning
  - [x] new skill not found in the original text → removed + warning _("original" = the resume in the tailor request, which already includes the user's additions, ADR-014; add a test that a user-added skill survives)_
  - [x] new experience / education / cert entry → dropped + warning
  - [x] more bullets than the original → trimmed + warning
  - [x] valid rewording → passes untouched
  - [x] *(Added, D-89)* a job / school / certification left out → put back; changed contact details, project name/link, section title → restored; new project technology or section item → removed; reworded text with a number the resume never states → original text kept
- [x] Implement `services/guardrailService.ts` to make them pass (`applyGuardrails(original, tailored)` → `{ resume, warnings, stats }`, D-88)
- [x] ≥ 90% branch coverage (**98%**: 51/52 branches; measured and enforced by `npm test`, D-90)

**Deliverable:** guardrail service.
**Exit check:** all guardrail tests are green and the coverage target is met.

---

### Day 13: Keyword service + tailor prompt draft
**Goal:** deterministic keyword scoring, and a first version of the tailoring prompt.
**Tasks:** BE-6 · AI-3 (part 1)

- [x] `services/keywordService.ts`: normalize (case, punctuation, simple plurals, aliases like "JS"/"JavaScript"), match JD keywords against the tailored resume text → matched, missing, score 0–100 (`analyzeKeywords(keywords, resume)`, D-91)
- [x] Unit tests with the fixture JDs (`keywordService.test.ts` 46, `resumeText.test.ts` 3; 100% branch coverage, enforced)
- [x] Draft `llm/prompts/tailor.v1.ts`: role, lock rules, the "never fabricate" rule, delimited `<resume>` / `<job_description>` inputs, output = jobSummary + keywords + tailoredResume + changes (`tailor.v1.test.ts` 21)
- [x] Define `TailorLlmOutputSchema` (what the LLM returns, before the server adds the score and warnings)
- [x] **Review the prompt together** (2026-11-14: the user approved it and asked for each job's bullet points to be built around the job description, D-93; first trial on local `llama3` the same day, see DEVLOG Session 14 part 4)

**Deliverable:** keyword service + prompt draft.
**Exit check:** keyword tests are green, and the prompt has been reviewed together.

---

### Day 14: Tailor service + prompt iteration
**Goal:** tailoring output that is high quality and honest.
**Tasks:** AI-3 (part 2)

- [x] `services/jobTailorService.ts`: LLM call → apply edits → guardrails → change list → keyword analysis → `TailorResponse` _(built on 2026-11-14 with `services/tailorEdits.ts` and `tailor-v2`, ADR-015)_
- [x] Run the selected real provider (local Ollama, D-68; plus the production provider once OD-10 is resolved) on 2 resumes × 3 JDs. Review the results together _(2026-11-15: all 6 pairs on both local `llama3` and Claude `claude-opus-5-5`; comparison in DEVLOG Known Issue #10)_
- [x] Iterate on the prompt (wording, emphasis, summary rewrite, ordering). Record each iteration in DEVLOG _(3 iterations on `llama3`, Session 14 part 5; 1 iteration on Claude, D-97, checked with one run, Session 15)_
- [ ] Tune effort (`medium` vs `low`): compare quality and latency, record the numbers _(deferred, D-98; in the Parking Lot)_
- [x] Unit tests with the fake LLM (`jobTailorService.test.ts` 9, `tailorEdits.test.ts` 14, `tailor.v2.test.ts` 20, guardrail keyword rule +6)

**Deliverable:** working tailor service.
**Exit check:** 6 real runs with 0 fabricated facts, and latency recorded.

---

### Day 15: Tailor endpoint + JD page + progress UI
**Goal:** the tailoring API is exposed, and the user can submit a JD.
**Tasks:** BE-7 · FE-5 · FE-6

- [x] `POST /api/v1/resumes/tailor` route + controller + zod body validation (`tailorResumeHandler`; failing fields in `details.fields`, D-99)
- [x] Integration tests: happy path, validation errors, AI errors (`tests/integration/tailor.test.ts`, 26, incl. rate limit and 200 KB limit)
- [x] FE Job Description page: textarea, live character counter (100–15,000), validation messages (`JobDescriptionPage.test.tsx`, 20)
- [x] `useTailorResume` mutation. **Send `applyResumeAdditions(parsed.resume, additions)` as `resume`, not `parsed.resume`** (D-85) (tested)
- [x] `StepProgress` component ("Analyzing job description…" → "Tailoring your resume…" → "Checking accuracy…"), time-based in MVP (steps change at 4 s and 12 s)
- [x] On success → store the result → navigate to `/result` (the result page is built on Day 16)

**Deliverable:** JD submission works end to end.
**Exit check:** submitting a JD in the browser returns a TailorResult (visible in devtools).

---

### Day 16: Result page
**Goal:** the user sees the tailored resume and understands what changed.
**Tasks:** FE-7

- [x] Result layout: tailored preview (reuse `ResumeView`) + sidebar/tabs
- [x] Changes list: grouped by section, before → after, reason
- [x] Keyword panel: match score, matched chips, missing chips ("not found in your resume")
- [x] Warnings banner for guardrail findings
- [x] Job summary header (title, company)
- [x] Component tests

**Deliverable:** result page.
**Exit check:** the full flow up to preview works in the browser.

---

### Day 17: Milestone 1.3 demo + buffer 🛟
**Goal:** a stable flow from upload to preview.

- [x] Full manual run with 3 resumes × 3 JDs (through the API on `llama3`, the 3 fixture PDFs × the 3 fixture postings; the user's click-through in the browser is still open)
- [x] Fix bugs found during the demo
- [x] Catch up on any slipped tasks
- [x] Refactor any rough spots (no new features)
- [x] Update docs if the API or schema changed

**Deliverable:** ✅ **Milestone 1.3 complete.**
**Exit check:** no known blocking bugs.

---

## Week 4: Export & polish

### Day 18: PDF template (part 1)
**Goal:** the tailored resume renders as an ATS-friendly PDF.
**Tasks:** FE-8 (part 1)

- [ ] Install `@react-pdf/renderer`. Register a standard font (e.g. Inter or Source Sans)
- [ ] `features/pdf-export/templates/ClassicTemplate.tsx`: single column, standard headings, header with contact info, experience, education, skills, projects, certifications
- [ ] Shared layout constants (section order, spacing) used by both the PDF and `ResumeView`
- [ ] Dev-only route that previews the PDF in a `<PDFViewer>`

**Deliverable:** PDF renders from the fixture resume.
**Exit check:** text in the generated PDF is selectable and copy-pastes in the right order.

---

### Day 19: PDF export (part 2) + re-tailor flow
**Goal:** the user can download the PDF and tailor the same resume for another job.
**Tasks:** FE-8 (part 2) · FE-9

- [ ] Handle long content: page breaks, no orphaned headings, wrapping
- [ ] Download button: `pdf().toBlob()` → `FirstName_LastName_Company.pdf`
- [ ] "Tailor for another job" (keep the parsed resume, clear the JD and result → `/job`)
- [ ] "Start over" (clear everything → `/`)
- [ ] Check the PDF is readable by ATS software: paste its text into a plain editor and run it through a free online ATS parser

**Deliverable:** download works.
**Exit check:** the downloaded PDF looks like the preview and is readable by ATS software.

---

### Day 20: Responsive design & accessibility
**Goal:** usable on mobile, and meets WCAG 2.1 AA basics.
**Tasks:** FE-10

- [ ] Responsive layouts at 375 px, 768 px and 1280 px for all 4 pages
- [ ] Keyboard navigation: dropzone, buttons, tabs, focus states visible
- [ ] Labels, aria-live for loading and errors, color contrast check
- [ ] Privacy note: "Your resume is sent to an AI provider to be read and tailored. TailorCV does not store it." (wording updated on Day 17)
- [ ] Empty, loading and error states reviewed on every page
- [ ] Lighthouse accessibility score ≥ 90

**Deliverable:** polished UI.
**Exit check:** Lighthouse a11y ≥ 90 and no horizontal scroll on mobile.

---

### Day 21: End-to-end tests
**Goal:** the main user journey is tested automatically in a real browser.
**Tasks:** QA-1

- [ ] Install and configure Playwright
- [ ] API "test mode" (`LLM_MODE=fake`) so E2E uses the FakeLlmClient
- [ ] E2E: happy path (upload → review → JD → result → download file exists)
- [ ] E2E: non-PDF rejected · too-large file · AI error shows a retry
- [ ] Add E2E to CI

**Deliverable:** E2E suite.
**Exit check:** E2E is green locally and in CI.

---

### Day 22: AI eval run & prompt hardening
**Goal:** a measured answer to "is the AI honest and good enough to launch?"
**Tasks:** AI-5

- [ ] `scripts/eval.ts`: runs N synthetic resume × JD pairs against the selected real provider (`LLM_PROVIDER`; final numbers on the production provider, OD-10)
- [ ] Reports per run: guardrail warnings, locked-field diffs (should be 0 even before guardrails), keyword score before → after, latency, tokens/cost
- [ ] Run the eval on 10 pairs and save the report in `docs/evals/2026-xx-xx.md`
- [ ] Fix the prompt if there are any fabrications or weak outputs, then re-run
- [ ] Confirm the cost per run is under the $0.25 target (PRD NFR-5), or record the real number and decide what to do

**Deliverable:** eval report.
**Exit check:** 0 fabrications, and cost and latency within the targets (or a documented decision).

---

### Day 23: Manual QA pass + bug bash 🛟
**Goal:** the app behaves well on a variety of resumes.
**Tasks:** QA-2

- [ ] Test 10+ varied PDFs: 1-col, 2-col, scanned, designer templates (Canva-style), very short, 5-page
- [ ] Test on Chrome, Safari and Firefox, plus one mobile browser
- [ ] Log every issue in DEVLOG with a severity
- [ ] Fix all blocker and major issues
- [ ] Freeze features from here: only fixes

**Deliverable:** QA log.
**Exit check:** ✅ **Milestone 1.4 complete.** No open blocker or major bugs.

---

## Week 5: Release

### Day 24: Production deployment
**Goal:** MVP deployed to production.
**Tasks:** PLT-9 (if skipped) · PLT-10 · PLT-11

- [ ] **Remove the development provider switch before deploying** (D-103): `LLM_PROVIDER_SWITCH`, `llm/providerSwitch.ts`, `middleware/llmProvider.ts`, `llmSwitch` in the health response, `features/dev/ProviderSwitch.tsx`, `api/llmProvider.ts`, and the line in `apps/api/.env`
- [ ] API Dockerfile (or Render native Node) + production start script
- [ ] **Resolve OD-10 first:** pick the hosted LLM provider (Claude API credit, or an alternative) and get a key. Run `npm run llm:smoke` with `LLM_PROVIDER=anthropic` (or the chosen provider), and re-check the parse/tailor prompts on it (they were developed on local Ollama, ADR-012)
- [ ] Deploy the API to Render/Fly.io with production env vars (`LLM_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`, `CORS_ORIGIN`, `TRUST_PROXY=1`, limits)
- [ ] Deploy the web to Vercel with `VITE_API_BASE_URL`
- [ ] Custom domain + HTTPS (optional)
- [ ] Uptime monitor on `/api/v1/health`, log drain
- [ ] Smoke test in production: the full flow with a synthetic resume
- [ ] Set a monthly spending limit in the Anthropic Console

**Deliverable:** live URLs.
**Exit check:** a production smoke test passes.

---

### Day 25: Launch checklist, docs & retro
**Goal:** MVP officially done, and Phase 2 is ready to start.
**Tasks:** DOC-1

- [ ] **Remind the user: the development provider switch (Claude / local model buttons) must be gone** (D-103; the user asked on 2026-11-15 to be reminded on this day). Confirm it was removed on Day 24
- [ ] Go through the PRD MVP "Must" requirements one by one and tick each
- [ ] README: quickstart, live URL, screenshots
- [ ] Update all docs to match what was built (API spec, tech design, ADR statuses)
- [ ] Tag the release `v0.1.0`
- [ ] Retro in DEVLOG: what went well, what didn't, what to change
- [ ] Plan Phase 2: pick the first feature (likely F2-1 inline editor) and write its day plan

**Deliverable:** ✅ **MVP RELEASED.**
**Exit check:** every PRD "Must" requirement is met.

---

## Progress tracker

| Day | Focus | Status |
|---|---|---|
| 1 | Kickoff, repo & tooling | ✅ |
| 2 | Scaffold workspaces | ✅ |
| 3 | Tests, dev cmd, CI → **Phase 0 done** | ✅ |
| 4 | Shared schemas | ✅ |
| 5 | Errors & security 🛟 → **M1.1** | ✅ |
| 6 | PDF upload & validation | ✅ |
| 7 | LLM client | ✅ (smoke green on local Ollama; real Claude call deferred, OD-10) |
| 8 | AI resume parsing | ✅ |
| 9 | Parse endpoint + FE plumbing | ✅ |
| 10 | Upload page | ✅ |
| 11 | Review page 🛟 → **M1.2** | ✅ |
| 12 | Guardrail service | ✅ |
| 13 | Keyword service + prompt draft | ✅ |
| 14 | Tailor service + prompt iteration | ✅ (closed by D-98; effort tuning deferred) |
| 15 | Tailor endpoint + JD page | ✅ |
| 16 | Result page | ✅ (browser exit check moved to the Day 17 full manual run) |
| 17 | Demo + buffer 🛟 → **M1.3** | ✅ (API run + security review; the user's browser click-through still open) |
| 18 | PDF template | ⬜ |
| 19 | PDF download + re-tailor | ⬜ |
| 20 | Responsive & a11y | ⬜ |
| 21 | E2E tests | ⬜ |
| 22 | AI evals | ⬜ |
| 23 | QA bug bash 🛟 → **M1.4** | ⬜ |
| 24 | Production deploy | ⬜ |
| 25 | Launch & retro → **MVP** | ⬜ |

Legend: ⬜ not started · 🟡 in progress · ✅ done · 🛟 buffer day
