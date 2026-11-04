# 04 — Implementation Roadmap & Task Breakdown

| Field | Value |
|---|---|
| Status | Draft v0.1 |
| Last updated | 2026-11-03 |
| Approach | Incremental: each phase ends in a working, demoable, deployable product |

---

## 1. Delivery principles

1. **Vertical slices.** Each milestone delivers something a user can click through end to end. We never build "all backend first".
2. **Walking skeleton first.** The FE → BE → AI path is deployed early, then filled in.
3. **Contract-first.** The shared zod schemas are written before the FE and BE code that uses them, so both sides can work in parallel against the same contract (the FE can use mocks).
4. **Definition of Done (every task):** code merged through a PR, lint + typecheck + tests green in CI, relevant docs updated, and demoed on local or preview.
5. **No real resumes in the repo.** Fixtures are synthetic.

## 2. Workstreams (how the work is divided)

| Code | Workstream | Owns |
|---|---|---|
| **PLT** | Platform / DevOps | Monorepo, tooling, CI, environments, deployment |
| **SHR** | Shared contracts | `packages/shared` schemas and types |
| **BE** | Backend | Express app, middleware, services, error handling |
| **AI** | AI / prompts | Prompts, LLM client, guardrails, evals |
| **FE** | Frontend | React app, UX, PDF templates |
| **QA** | Quality | Test fixtures, E2E, manual test passes |

One developer can work through the tasks in ID order. With 2–3 developers, split them as **FE** / **BE+AI** / **PLT+QA**, and start parallel work once SHR-1 is merged.

Estimates are in ideal dev-days (d).

---

## 3. Phase 0: Foundation (walking skeleton)

**Goal:** an empty app deployed end to end, where the frontend calls `/api/v1/health` and shows "API: ok".

| ID | Task | WS | Est | Depends on |
|---|---|---|---|---|
| PLT-1 | Init git repo, npm workspaces root, `tsconfig.base.json`, `.gitignore`, `.nvmrc` (Node 24) | PLT | 0.5d | — |
| PLT-2 | ESLint flat config + Prettier + `lint`/`format`/`typecheck` scripts | PLT | 0.5d | PLT-1 |
| PLT-3 | Scaffold `packages/shared` (zod, build setup, exports) | PLT | 0.25d | PLT-1 |
| PLT-4 | Scaffold `apps/api`: Express 5, `app.ts` factory, `server.ts`, env validation with zod, pino logger, `GET /api/v1/health` | BE | 0.5d | PLT-1 |
| PLT-5 | Scaffold `apps/web`: Vite + React + TS + Tailwind + React Router, Vite proxy `/api` → :4000, home page calls health | FE | 0.5d | PLT-1 |
| PLT-6 | Vitest configured in all workspaces, plus one sample test each | QA | 0.25d | PLT-3..5 |
| PLT-7 | GitHub Actions CI: install, lint, typecheck, test, build | PLT | 0.5d | PLT-6 |
| PLT-8 | Root `npm run dev` runs api + web together (`concurrently`) | PLT | 0.25d | PLT-4, PLT-5 |
| PLT-9 | (Optional now, required before MVP launch) Deploy web to Vercel and api to Render | PLT | 0.5d | PLT-7 |

**Exit criteria:** `npm run dev` works, CI is green, and the health check is visible in the UI.
**Phase total:** about 3–4 days.

---

## 4. Phase 1: MVP

**Goal:** upload a PDF, review the parsed resume, paste a JD, get a tailored resume with a change list and keyword match, download it as a PDF.

### Milestone 1.1: Contracts & error foundation

| ID | Task | WS | Est | Depends on |
|---|---|---|---|---|
| SHR-1 | `ResumeSchema`, `TailorRequestSchema`, `TailorResultSchema`, `ApiErrorSchema` + exported TS types | SHR | 1d | PLT-3 |
| SHR-2 | Synthetic fixture: `sampleResume.json` + 3 sample JDs | QA | 0.5d | SHR-1 |
| BE-1 | `AppError` class, error code catalog, central error middleware, requestId middleware | BE | 0.5d | PLT-4 |
| BE-2 | Security middleware: helmet, CORS allowlist, JSON body limit, rate limiters | BE | 0.5d | PLT-4 |

### Milestone 1.2: Upload & parse (vertical slice #1)

| ID | Task | WS | Est | Depends on |
|---|---|---|---|---|
| BE-3 | Upload middleware: multer memory storage, 5 MB limit, MIME + magic-byte check | BE | 0.5d | BE-1 |
| BE-4 | `pdfValidationService` (unpdf): page count, encryption | BE | 0.5d | BE-3 |
| AI-1 | `LlmClient` interface + Anthropic implementation (structured output, adaptive thinking, effort, refusal fallback, stop_reason checks, typed error mapping, token usage logging) + `FakeLlmClient` for tests | AI | 1d | SHR-1 |
| AI-2 | `PARSE_PROMPT_V1` + `resumeParserService` (PDF document block → `Resume`), id assignment post-processing | AI | 1d | AI-1 |
| BE-5 | `POST /api/v1/resumes/parse` route + controller + integration tests (with fake LLM) | BE | 0.5d | BE-4, AI-2 |
| FE-1 | Upload page: dropzone, client-side type/size checks, upload mutation, loading and error states | FE | 1d | PLT-5, SHR-1 |
| FE-2 | Typed API client (`api/client.ts`) + error-code → message mapping | FE | 0.5d | SHR-1 |
| FE-3 | Session store (parsedResume, jd, result) + route guards | FE | 0.5d | PLT-5 |
| FE-4 | Review page: read-only rendering of the parsed `Resume` | FE | 1d | FE-3 |

**Demo:** upload a real PDF on your own machine and see the structured resume rendered.

### Milestone 1.3: Tailor (vertical slice #2)

| ID | Task | WS | Est | Depends on |
|---|---|---|---|---|
| AI-3 | `TAILOR_PROMPT_V1` + `jobTailorService` (JD analysis + tailored resume + changes in one call) | AI | 1.5d | AI-1 |
| AI-4 | `guardrailService`: locked-field restore, new-skill detection, no new entries, bullet count. Full unit tests | AI | 1d | SHR-1 |
| BE-6 | `keywordService`: deterministic matched/missing/score + unit tests | BE | 0.5d | SHR-1 |
| BE-7 | `POST /api/v1/resumes/tailor` route + controller + integration tests | BE | 0.5d | AI-3, AI-4, BE-6 |
| FE-5 | Job description page: textarea, char counter, validation, submit mutation | FE | 0.5d | FE-3 |
| FE-6 | Multi-step progress indicator component | FE | 0.5d | — |
| FE-7 | Result page: tailored resume preview + change list + keyword chips + warnings | FE | 1.5d | FE-4, BE-7 |

**Demo:** the full flow up to preview.

### Milestone 1.4: Export & polish

| ID | Task | WS | Est | Depends on |
|---|---|---|---|---|
| FE-8 | `@react-pdf/renderer` "Classic" ATS template + download button (file naming) | FE | 1.5d | FE-7 |
| FE-9 | "Tailor for another job" (keep the parsed resume, clear the JD/result) + "Start over" | FE | 0.25d | FE-7 |
| FE-10 | Responsive layout, accessibility pass (labels, focus, contrast), privacy note | FE | 1d | FE-7 |
| QA-1 | Playwright E2E: happy path + 3 error paths (LLM mocked via an API test mode) | QA | 1d | FE-8 |
| AI-5 | Mini eval script: run 10 synthetic resume×JD pairs against the real API and report guardrail warnings, locked-field diffs, and keyword scores | AI | 1d | BE-7 |
| QA-2 | Manual test pass on 10+ varied PDFs (1-col, 2-col, scanned, designer templates) and log issues | QA | 0.5d | FE-8 |

### Milestone 1.5: MVP release

| ID | Task | WS | Est | Depends on |
|---|---|---|---|---|
| PLT-10 | Production deploy (Vercel + Render), env vars, CORS, custom domain (optional) | PLT | 0.5d | PLT-9 |
| PLT-11 | Basic monitoring: uptime ping on health check, log drain | PLT | 0.25d | PLT-10 |
| DOC-1 | README quickstart, update docs for anything that changed during the build | ALL | 0.25d | — |

**Phase 1 total:** about 20–24 dev-days for one developer (about 4–5 weeks), or about 2–3 weeks with 2–3 developers.

**MVP exit criteria:** all PRD "Must" requirements are met, E2E is green, the eval set shows 0 fabricated facts, and the app is deployed.

---

## 5. Phase 2: Editing, trust & UX (feature by feature)

| ID | Feature | Key tasks |
|---|---|---|
| F2-1 | **Inline editor** | Editable form for every Resume section (react-hook-form + shared zod), on both the review and result pages |
| F2-2 | **Accept or reject changes** | Diff view per bullet, toggle each change, rebuild the resume from the chosen changes |
| F2-3 | **Streaming progress** | `POST /tailor/stream` (SSE) that emits stage events. Frontend uses an EventSource-style fetch reader |
| F2-4 | **More templates** | "Modern" and "Compact" templates, a template picker, matching HTML preview |
| F2-5 | **DOCX export** | `docx` package generator from `Resume` |
| F2-6 | **Tone option** | `options.tone` exposed in the UI and passed to the prompt |

## 6. Phase 3: Accounts & persistence

| ID | Feature | Key tasks |
|---|---|---|
| F3-1 | DB setup | PostgreSQL (Neon or Supabase), Drizzle schema and migrations, `db` module |
| F3-2 | Auth | Better Auth (email + Google), protected routes on FE and BE |
| F3-3 | Saved base resumes | CRUD endpoints + "My resumes" page |
| F3-4 | Tailoring history | Save each TailorResult with its JD and a timestamp. History page, re-download |
| F3-5 | Privacy controls | Delete account and all data, export data as JSON |

## 7. Phase 4: Growth features

Cover letter generator · JD import from URL · ATS formatting check · DOCX resume upload · Usage limits + Stripe billing.

## 8. Phase 5: Production hardening

Eval harness in CI (with a small budget) · prompt and effort tuning against evals · OpenTelemetry + Sentry · cost dashboard · load testing · a job queue if needed.

---

## 9. Timeline view (single developer, indicative)

```
Week 1      ████ Phase 0 + M1.1
Week 2      ████ M1.2 Upload & parse
Week 3      ████ M1.3 Tailor
Week 4      ████ M1.4 Export & polish
Week 5      ██   M1.5 Release  ──► MVP LIVE
Week 6-7    ████ Phase 2 (editor, accept/reject, streaming)
Week 8-9    ████ Phase 3 (auth, DB, history)
Week 10+    ░░░░ Phase 4/5 as prioritized
```

## 10. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| AI invents facts | Users lose trust, ethical problem | Locked-field schema + deterministic guardrails + evals + change list shown to the user |
| Parsing errors on unusual layouts | Bad tailoring | Claude reads the PDF natively (text + layout). Review step. Inline editor in Phase 2 |
| Latency over 60 s | Users drop off | Effort tuning, step indicator, SSE streaming in Phase 2 |
| AI cost per run | Margin | Token logging, prompt caching, effort tuning, rate limits |
| PII handling | Legal and trust | No persistence in MVP, log redaction, clear privacy note |
| PDF export doesn't match the preview | User confusion | One shared layout spec. Visual check in QA-2 |
