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

- [ ] `resume.schema.ts`: full `ResumeSchema` per Tech Design §5.1 (basics, experience, education, skills, projects, certifications, additionalSections, with ids on items and bullets)
- [ ] `tailor.schema.ts`: `TailorRequestSchema`, `TailorResultSchema`, `ChangeSchema`, `KeywordAnalysisSchema`
- [ ] `api.types.ts`: `ApiErrorSchema`, error code union type, `ParseResponse`
- [ ] Export the inferred TS types (`type Resume = z.infer<…>`)
- [ ] Confirm the schema works with Claude structured outputs (quick check: no unsupported zod features)
- [ ] Fixtures: `fixtures/resumes/sample-swe.json`, `sample-newgrad.json` + `fixtures/jds/frontend.txt`, `data-analyst.txt`, `pm.txt` (all synthetic)
- [ ] Unit tests: the fixtures validate, and bad data is rejected

**Deliverable:** `@tailorcv/shared` exports all the schemas and types.
**Exit check:** tests are green, and the API spec doc matches the schemas.

---

### Day 5: Error foundation & security middleware (+ optional deploy) 🛟
**Goal:** the API handles errors consistently and is protected against basic abuse.
**Tasks:** BE-1 · BE-2 · (PLT-9 optional)

- [ ] `lib/errors.ts`: `AppError` + error catalog (codes → HTTP status + user message)
- [ ] `middleware/requestId.ts`, pino-http with **redaction** of body fields
- [ ] Central `errorHandler` middleware → standard error JSON (API spec §4), plus a 404 handler
- [ ] helmet, CORS allowlist from env, `express.json({ limit: "200kb" })`
- [ ] Rate limiters (parse/tailor limits from env) → `RATE_LIMITED` with Retry-After
- [ ] Tests: unknown route → 404 JSON, thrown AppError → correct shape, rate limit triggers
- [ ] *(Optional)* Deploy the skeleton to Vercel + Render and record the URLs in DEVLOG
- [ ] Week 1 review: update the README status, write the DEVLOG week summary

**Deliverable:** hardened API skeleton.
**Exit check:** ✅ **Milestone 1.1 complete.**

---

## Week 2: Upload & parse (vertical slice #1)

### Day 6: PDF upload & validation
**Goal:** the API accepts a valid PDF and rejects bad ones with the correct error codes.
**Tasks:** BE-3 · BE-4

- [ ] Create synthetic test PDFs in `apps/api/tests/fixtures/pdfs/`: a valid 1-page and 2-page resume, a 2-column layout, a 7-page file, an encrypted file, a non-PDF renamed to `.pdf`, an empty file
- [ ] `middleware/upload.ts`: multer memoryStorage, 5 MB limit, single `file` field → `FILE_MISSING` / `FILE_TOO_LARGE`
- [ ] Magic-byte check (`%PDF-`) → `UNSUPPORTED_FILE_TYPE`
- [ ] `services/pdfValidationService.ts` (unpdf): page count → `PDF_TOO_MANY_PAGES`, encryption → `PDF_ENCRYPTED`
- [ ] Unit tests for every rejection path

**Deliverable:** validation layer complete.
**Exit check:** every bad fixture returns its expected error code in tests.

---

### Day 7: LLM client
**Goal:** one reliable, testable wrapper around the Claude API.
**Tasks:** AI-1

- [ ] Install `@anthropic-ai/sdk`. Add `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` to env validation
- [ ] `llm/LlmClient.ts` interface: `generateStructured<T>({ system, content, schema, effort, maxTokens })`
- [ ] `llm/AnthropicLlmClient.ts`: `messages.parse()` + `zodOutputFormat`, adaptive thinking, explicit effort, refusal fallback beta, cached system prompt, 90 s timeout
- [ ] Check `stop_reason` (`refusal`, `max_tokens`) before using the output
- [ ] Map typed SDK errors → `AI_PROVIDER_ERROR` / `AI_TIMEOUT` / `AI_INVALID_OUTPUT`. Do one app-level retry on schema failure
- [ ] Log token usage + duration + prompt version (no content)
- [ ] `llm/FakeLlmClient.ts`: returns fixture responses, can simulate errors
- [ ] Smoke script `npm run llm:smoke`: one tiny real call to confirm the key and model work

**Deliverable:** LLM layer with a real and a fake implementation.
**Exit check:** the smoke script succeeds, and unit tests pass using the fake client.

---

### Day 8: Resume parsing with AI
**Goal:** a PDF goes in, and a correct structured `Resume` comes out.
**Tasks:** AI-2

- [ ] `llm/prompts/parse.v1.ts`: extraction rules (faithful, no inference, keep the original bullet wording, leave missing fields empty, detect "not a resume")
- [ ] `services/resumeParserService.ts`: PDF base64 → document block → `Resume`
- [ ] Post-processing: assign stable ids (`exp_1`, `exp_1_b1`…), trim whitespace, remove empty items
- [ ] `RESUME_NOT_DETECTED` handling
- [ ] Manual run against the 3 synthetic PDFs (real API). Compare the output to the expected result and record accuracy notes in DEVLOG
- [ ] Unit tests for post-processing (id assignment, cleanup)

**Deliverable:** working parser service.
**Exit check:** the 2-column fixture parses correctly, and the results are recorded.

---

### Day 9: Parse endpoint + frontend plumbing
**Goal:** the parse endpoint is exposed, and the frontend is ready to call it.
**Tasks:** BE-5 · FE-2 · FE-3

- [ ] `routes/resumes.ts` + `controllers/resumesController.ts` → `POST /api/v1/resumes/parse`
- [ ] Dependency injection: the app factory accepts an `LlmClient` (real in dev, fake in tests)
- [ ] Integration tests (Supertest + fake LLM): happy path + every error code
- [ ] FE `api/client.ts`: typed fetch wrapper, parses the standard error into an `ApiError`
- [ ] FE `api/errorMessages.ts`: error code → friendly message + suggested action
- [ ] FE session store (context or Zustand): `parsedResume`, `jobDescription`, `tailorResult`, mirrored to sessionStorage inside try/catch
- [ ] Route guards (`/review` needs `parsedResume`, and so on)

**Deliverable:** parse API done, and the FE data layer is ready.
**Exit check:** `curl -F file=@sample.pdf localhost:4000/api/v1/resumes/parse` returns a Resume.

---

### Day 10: Upload page
**Goal:** the user can upload a PDF from the UI.
**Tasks:** FE-1

- [ ] Basic UI primitives: Button, Card, Alert, Spinner (Tailwind)
- [ ] App layout: header, container, footer with a privacy note
- [ ] Upload page: drag-and-drop zone + file picker, client-side checks (type, 5 MB)
- [ ] TanStack Query `useParseResume` mutation, loading state ("Reading your resume…")
- [ ] Error display that uses the friendly messages, plus a retry
- [ ] On success → store the parsed resume → navigate to `/review`
- [ ] Component tests: rejects a non-PDF, shows the loading state, shows an API error

**Deliverable:** working upload page.
**Exit check:** uploading a real PDF in the browser lands on `/review`.

---

### Day 11: Review page + Milestone 1.2 demo 🛟
**Goal:** the user sees the parsed resume clearly. First end-to-end demo.
**Tasks:** FE-4 · buffer

- [ ] `features/resume-view/ResumeView.tsx`: renders every section of `Resume` (reused later for the tailored preview)
- [ ] Review page: ResumeView + "Looks good → Continue" + "Upload a different file"
- [ ] Handle empty sections gracefully
- [ ] Component test with the fixture resume
- [ ] **Demo:** upload 3–5 different PDFs and record any parsing issues in DEVLOG
- [ ] Fix bugs and catch up on any slipped tasks

**Deliverable:** ✅ **Milestone 1.2 complete.** Upload → structured resume.
**Exit check:** the demo works on all the test PDFs.

---

## Week 3: Tailoring (vertical slice #2)

### Day 12: Guardrail service (test-first)
**Goal:** the honesty guarantee exists before any tailoring prompt is written.
**Tasks:** AI-4

- [ ] Write the tests first, with handcrafted "bad tailored output" fixtures:
  - [ ] changed company / title / date / degree → restored + warning
  - [ ] new skill not found in the original text → removed + warning
  - [ ] new experience / education / cert entry → dropped + warning
  - [ ] more bullets than the original → trimmed + warning
  - [ ] valid rewording → passes untouched
- [ ] Implement `services/guardrailService.ts` to make them pass
- [ ] ≥ 90% branch coverage

**Deliverable:** guardrail service.
**Exit check:** all guardrail tests are green and the coverage target is met.

---

### Day 13: Keyword service + tailor prompt draft
**Goal:** deterministic keyword scoring, and a first version of the tailoring prompt.
**Tasks:** BE-6 · AI-3 (part 1)

- [ ] `services/keywordService.ts`: normalize (case, punctuation, simple plurals, aliases like "JS"/"JavaScript"), match JD keywords against the tailored resume text → matched, missing, score 0–100
- [ ] Unit tests with the fixture JDs
- [ ] Draft `llm/prompts/tailor.v1.ts`: role, lock rules, the "never fabricate" rule, delimited `<resume>` / `<job_description>` inputs, output = jobSummary + keywords + tailoredResume + changes
- [ ] Define `TailorLlmOutputSchema` (what the LLM returns, before the server adds the score and warnings)

**Deliverable:** keyword service + prompt draft.
**Exit check:** keyword tests are green, and the prompt has been reviewed together.

---

### Day 14: Tailor service + prompt iteration
**Goal:** tailoring output that is high quality and honest.
**Tasks:** AI-3 (part 2)

- [ ] `services/jobTailorService.ts`: LLM call → guardrails → keyword analysis → `TailorResult`
- [ ] Run the real API on 2 resumes × 3 JDs. Review the results together
- [ ] Iterate on the prompt (wording, emphasis, summary rewrite, ordering). Record each iteration in DEVLOG
- [ ] Tune effort (`medium` vs `low`): compare quality and latency, record the numbers
- [ ] Unit tests with the fake LLM

**Deliverable:** working tailor service.
**Exit check:** 6 real runs with 0 fabricated facts, and latency recorded.

---

### Day 15: Tailor endpoint + JD page + progress UI
**Goal:** the tailoring API is exposed, and the user can submit a JD.
**Tasks:** BE-7 · FE-5 · FE-6

- [ ] `POST /api/v1/resumes/tailor` route + controller + zod body validation
- [ ] Integration tests: happy path, validation errors, AI errors
- [ ] FE Job Description page: textarea, live character counter (100–15,000), validation messages
- [ ] `useTailorResume` mutation
- [ ] `StepProgress` component ("Analyzing job description…" → "Tailoring your resume…" → "Checking accuracy…"), time-based in MVP
- [ ] On success → store the result → navigate to `/result`

**Deliverable:** JD submission works end to end.
**Exit check:** submitting a JD in the browser returns a TailorResult (visible in devtools).

---

### Day 16: Result page
**Goal:** the user sees the tailored resume and understands what changed.
**Tasks:** FE-7

- [ ] Result layout: tailored preview (reuse `ResumeView`) + sidebar/tabs
- [ ] Changes list: grouped by section, before → after, reason
- [ ] Keyword panel: match score, matched chips, missing chips ("not found in your resume")
- [ ] Warnings banner for guardrail findings
- [ ] Job summary header (title, company)
- [ ] Component tests

**Deliverable:** result page.
**Exit check:** the full flow up to preview works in the browser.

---

### Day 17: Milestone 1.3 demo + buffer 🛟
**Goal:** a stable flow from upload to preview.

- [ ] Full manual run with 3 resumes × 3 JDs
- [ ] Fix bugs found during the demo
- [ ] Catch up on any slipped tasks
- [ ] Refactor any rough spots (no new features)
- [ ] Update docs if the API or schema changed

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
- [ ] Privacy note: "Your resume is processed and not stored"
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

- [ ] `scripts/eval.ts`: runs N synthetic resume × JD pairs against the real API
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

- [ ] API Dockerfile (or Render native Node) + production start script
- [ ] Deploy the API to Render/Fly.io with production env vars (`ANTHROPIC_API_KEY`, `CORS_ORIGIN`, limits)
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
| 4 | Shared schemas | ⬜ |
| 5 | Errors & security 🛟 → **M1.1** | ⬜ |
| 6 | PDF upload & validation | ⬜ |
| 7 | LLM client | ⬜ |
| 8 | AI resume parsing | ⬜ |
| 9 | Parse endpoint + FE plumbing | ⬜ |
| 10 | Upload page | ⬜ |
| 11 | Review page 🛟 → **M1.2** | ⬜ |
| 12 | Guardrail service | ⬜ |
| 13 | Keyword service + prompt draft | ⬜ |
| 14 | Tailor service + prompt iteration | ⬜ |
| 15 | Tailor endpoint + JD page | ⬜ |
| 16 | Result page | ⬜ |
| 17 | Demo + buffer 🛟 → **M1.3** | ⬜ |
| 18 | PDF template | ⬜ |
| 19 | PDF download + re-tailor | ⬜ |
| 20 | Responsive & a11y | ⬜ |
| 21 | E2E tests | ⬜ |
| 22 | AI evals | ⬜ |
| 23 | QA bug bash 🛟 → **M1.4** | ⬜ |
| 24 | Production deploy | ⬜ |
| 25 | Launch & retro → **MVP** | ⬜ |

Legend: ⬜ not started · 🟡 in progress · ✅ done · 🛟 buffer day
