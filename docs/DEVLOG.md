# DEVLOG: Pair-Programming Journal

> **Purpose:** the shared memory for this project. Every session (human + Claude) starts by reading this file and ends by updating it, so a fresh session can pick up exactly where the last one stopped.
>
> **Rules**
> - Update the **Current Status** block at the end of every session (overwrite it).
> - **Append** a new entry under Session Log, newest at the **bottom**. Never delete old entries.
> - Record every decision in the **Decision Log** with its date and reason. Big architectural ones also get an ADR in `06-architecture-decisions.md`.
> - Never paste real resume content, API keys or secrets here.

---

## 📍 Current Status

| Field | Value |
|---|---|
| Last updated | 2026-11-16 (Session 17, part 3) |
| Phase | Phase 1 (MVP). **Milestone 1.3 (tailoring) complete** (Day 17), with one open item: the user's click-through in the browser |
| Current day (per `07-daily-development-plan.md`) | **Day 17 ✅** (3×3 API run, one bug fixed, security review). Next: **Day 18, PDF template (part 1)**, after the tailoring quality pass |
| Branch | `main` |
| Remote | https://github.com/tmuzu98/tailorcv (**private**) |
| Last commit | `db101fe feat: Milestone 1.3 demo fixes and security review (Day 17)` (pushed, CI green incl. the new audit step). The `tailor:eval` work is uncommitted |
| Build / CI | `npm run check` ✅ locally (lint 0 warnings, format, typecheck, **690 tests**: shared 71, web 127, api 492). CI now also runs `npm audit --omit=dev --audit-level=high` (0 vulnerabilities locally) |
| Deployed URLs | — (deploy deferred to Day 24, D-45) |
| Local dev | `apps/api/.env`: `LLM_PROVIDER=ollama`, `LLM_PROVIDER_SWITCH=true` (header buttons "Local model / Claude", D-103, temporary), the Claude key in place. `npm run dev` from the repo root: **http://localhost:5173**, API on :4000. Ask the user before any Claude call |

**Next action (start of the next session):** the first evidence-backed quality change. The baseline (`docs/quality-log.md`) says the biggest problem is filler on rewrites (15 of 19 warnings are `commentary`; 6 of 48 bullets reworded). Change the prompt, rerun `tailor:eval`, keep it only if the numbers improve. Then Day 18 (PDF template).

**Next steps (in order)**
1. **User:** click through upload → result in the browser once (the Day 16/17 checks: header, preview, Changes and Keywords tabs, "Add it on the review page", the new footer wording).
2. **Tailoring quality pass:** `tailor:eval` is built (D-109); baseline logged. One evidence-backed change at a time, starting with `commentary`. Claude runs only on prompt changes and only when the user says so.
3. **Day 18:** PDF template (part 1).
4. **Open question for the user:** a "Your tailored resume" title on the preview and/or highlighting reworded bullets (Parking Lot).
5. **Live check of D-104 + D-105** in the browser (Local model, then Claude if the user approves).
   - **REMINDER for Day 24/25 (the user asked for it): remove the development provider switch before production** (D-103; checkboxes in the plan).
6. **User, still open:** confirm ADR-015 (the model returns edits), and OD-10 (Claude as the production provider).
7. **Security follow-ups for the user:** monthly spend limit in the Anthropic Console; review the D-101 numbers. (Privacy wording done on Day 17, D-108.)
8. **Day 24:** strict CSP and security headers on the frontend host (Tech Design §7); resolve OD-10 formally.
9. **After the MVP:** `research/nextraise-ai.md` (D-106).

**Blockers:** none.

---

## ❓ Open Decisions (resolve, then move to the Decision Log)

| # | Question | Proposed default | Needed by |
|---|---|---|---|
| OD-10 | **Which hosted LLM provider for production, and getting its key/credit?** Local development uses Ollama for free (D-68), but Render can't run a local model. Options: Claude API credit (planned, ADR-008), or another hosted provider. Also decide whether to set a spend limit and which model/effort fits the budget. Re-check the prompts on the chosen provider before launch | Claude API (Opus 5.5; ~\$0.05–0.25 per parse/tailor, roughly \$5–20 for the rest of development if used) | **Day 24** (earlier if we want real Claude output for prompt tuning) |
| OD-6 | Optional anonymous analytics in MVP? | No | Day 20 |

_Resolved on Day 1: OD-1 → D-6, OD-2 → D-9, OD-3 → D-7, OD-5 → D-8, OD-7 → D-17. Resolved on Day 3: OD-8 → D-34, OD-9 → D-35. Day 7: OD-4 (API key by Day 7) → replaced by OD-10 after D-68. Day 13: OD-11 (what the model returns when tailoring) → D-94._

---

## ✅ Decision Log

| Date | # | Decision | Reason | Ref |
|---|---|---|---|---|
| 2026-11-03 | D-1 | JavaScript ecosystem: React frontend, Node.js backend | User requirement | PRD, Tech Design §2 |
| 2026-11-03 | D-2 | Build the MVP first, then add features one phase at a time | User requirement | Roadmap |
| 2026-11-03 | D-3 | Proposed stack: React 19 + Vite + Tailwind · Express 5 · zod shared schemas · Claude `claude-opus-5-5` | Planning session (still Proposed) | ADR-001…008 |
| 2026-11-03 | D-4 | Day-by-day plan: 25 working days to MVP release | User request | `07-daily-development-plan.md` |
| 2026-11-03 | D-5 | All discussions and decisions are recorded in this DEVLOG every session | User request (continuity across sessions) | This file |
| 2026-11-03 | D-6 | **TypeScript** (strict) across all workspaces | Compile-time checking of the FE↔BE contract via shared zod types (resolves OD-1) | ADR-001 → Accepted |
| 2026-11-03 | D-7 | Package scope **`@tailorcv/*`** (`@tailorcv/shared`, `@tailorcv/api`, `@tailorcv/web`); root package `tailorcv` | Keep the working name. Internal only, easy to rebrand (resolves OD-3) | — |
| 2026-11-03 | D-8 | GitHub repo: **private, on the user's personal account**. Created and pushed on Day 3 | User choice (resolves OD-5) | — |
| 2026-11-03 | D-9 | Hosting: **Vercel Hobby (web) + Render free (API)**. Re-evaluate before monetizing | $0 MVP. Vercel functions ruled out (≈4.5 MB body limit < our 5 MB upload); Cloudflare Workers ruled out (no Express/multer) (resolves OD-2) | ADR-009 |
| 2026-11-03 | D-10 | Package manager **npm** (workspaces) on **Node 24** (`.nvmrc`, `engines`); root `"type": "module"` (ESM everywhere) | Matches the local env and the Tech Design. ESM is the modern Node/Vite default | Tech Design §2 |
| 2026-11-03 | D-11 | Tooling versions installed: **TypeScript 6.0**, **ESLint 10** (flat config) + typescript-eslint 8.72, **Prettier 3.9** | Latest stable at setup time. No peer conflicts | `package.json` |
| 2026-11-03 | D-12 | `tsconfig.base.json`: strict + `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, target ES2023, `moduleResolution: Bundler`. Each workspace extends it | Maximum type safety. Bundler resolution suits Vite. The API's run/build approach must be compatible (Day 2) | `tsconfig.base.json` |
| 2026-11-03 | D-13 | ESLint: recommended JS + typescript-eslint, `consistent-type-imports`, `eqeqeq`, `no-console` (warn), React hooks/refresh rules scoped to `apps/web`, Prettier compat last. **Import-order plugin deferred** (planned in Day 1 checklist) | Keep lint lean. Can be added any time without code churn | `eslint.config.js`, Parking Lot |
| 2026-11-03 | D-14 | Prettier: double quotes, semicolons, trailing commas, width 100, LF. `docs/` excluded from Prettier | `docs/` has hand-formatted wide tables and ASCII diagrams | `.prettierrc.json`, `.prettierignore` |
| 2026-11-03 | D-15 | Accept the 13 moderate `npm audit` findings (all one `minimatch` ReDoS in ESLint's dependency tree, dev-only) instead of `audit fix --force` | `--force` would downgrade typescript-eslint (breaking). Nothing ships to users. Recheck on Day 3 | Known Issues #1 |
| 2026-11-03 | D-16 | Commit shared VS Code settings (`.vscode/settings.json`, `extensions.json`): format on save, ESLint fix on save | Consistent formatting while pairing. No effect in other editors | `.vscode/` |
| 2026-11-03 | D-17 | Commits authored as **Muzaffarhusain Turak / tmuzu98@gmail.com** (existing global git config); user confirmed this is the GitHub account email | Resolves OD-7 | — |
| 2026-11-03 | D-18 | GitHub repo creation **pulled forward from Day 3 to Day 1**: private repo `tmuzu98/tailorcv` created with the GitHub CLI and `main` pushed. Tooling: `gh` 2.103.3 via Homebrew, logged in as `tmuzu98` (HTTPS, token in the macOS keychain) | User wanted the code backed up on GitHub right away. The Day 3 "create repo + push" item is now done | Day 3 checklist |
| 2026-11-03 | D-19 | API runs with **`tsx watch`** in dev and is bundled with **`tsup`** for production (`dist/server.js`, ESM, sourcemaps). `@tailorcv/shared` is consumed **as TS source** (`exports` → `src/index.ts`, no build step); tsup bundles it via `noExternal: [/^@tailorcv\//]` | User choice. Works with `moduleResolution: Bundler`, so no `.js` import extensions. One fewer build step | `apps/api/tsup.config.ts`, `packages/shared/package.json` |
| 2026-11-03 | D-20 | Versions installed on Day 2: **Express 5.3**, **pino 10.4** (+ pino-pretty 13 dev), **zod 4.6**, **tsx 4.23**, **tsup 9.0**, **React 19.3**, **React Router 8.5**, **Vite 8.3** + @vitejs/plugin-react 6.2, **Tailwind 4.3** (`@tailwindcss/vite`), @types/node 26 | Latest stable at setup time | `package.json` files |
| 2026-11-03 | D-21 | **Did not approve** npm 11's blocked install scripts for `esbuild` (postinstall) and `fsevents` (install) | Verified esbuild works without its postinstall (tsx, tsup and Vite all ran). Least privilege. Revisit only if builds or file-watching break | Known Issues #3 |
| 2026-11-03 | D-22 | Env vars validated with zod at startup (`apps/api/src/config/env.ts`). The server exits with a readable error if invalid. `.env` loaded with Node's built-in `--env-file-if-exists` (no `dotenv`). `ANTHROPIC_API_KEY` **optional until Day 7**; `CORS_ORIGIN` defaults to `http://localhost:5173` | Fail fast on misconfiguration. One fewer dependency. The skeleton runs without a key | `apps/api/.env.example` |
| 2026-11-03 | D-23 | `createApp()` factory (`app.ts`) separate from `server.ts` (listen + graceful SIGINT/SIGTERM shutdown). `x-powered-by` disabled | Testable without opening a port (Supertest, Day 3). Render sends SIGTERM on redeploy | Tech Design §4 |
| 2026-11-03 | D-24 | `@tailorcv/shared` exports `API_PREFIX` (`/api/v1`) and `HealthResponseSchema`. The API types its response with it; the web **validates** the response with it | Proves the workspace link both ways. Establishes the "contract in shared" pattern | `packages/shared/src` |
| 2026-11-03 | D-25 | Health check in the web uses plain `fetch` + `useEffect` (with AbortController); **TanStack Query is introduced on Day 9** with the real API client | Not worth adding a library for one GET in the skeleton | `apps/web/src/api/health.ts` |
| 2026-11-03 | D-26 | Web skeleton: React Router `createBrowserRouter` with a shared `AppLayout` (header + temporary step nav, footer with the privacy note + live API status dot). Placeholder pages say which day builds them. Vite dev proxy `/api` → `:4000` (`strictPort` 5173); `VITE_API_BASE_URL` used in production | Matches the routes in Tech Design §6.4. Same-origin in dev, so no CORS needed locally | `apps/web/src/app` |
| 2026-11-03 | D-27 | Logging: pino-pretty with **local** timestamps in development, raw JSON in production, silent in test | Readable locally. JSON for Render's log viewer | `apps/api/src/lib/logger.ts` |
| 2026-11-03 | D-28 | Testing: **Vitest 5.1** installed once at the root, with a `vitest.config.ts` per workspace (named projects `shared`, `api`, `web`). Web: **jsdom + Testing Library + jest-dom** (`src/test/setup.ts`). API: **Supertest** against `createApp()` (no port opened). Test location: next to the code (`*.test.ts[x]`) for shared/web, `apps/api/tests/integration/` for API routes. Test/config files are included in `typecheck` | One test runner for the whole repo. Fast. Reuses the Vite config for web tests | `*/vitest.config.ts` |
| 2026-11-03 | D-29 | `apps/web/src/app/router.tsx` exports `routes` (plus `router`) so tests can mount the real routes in `createMemoryRouter` | Test the real app shell, not a copy | `App.test.tsx` |
| 2026-11-03 | D-30 | Root scripts: `npm run dev` = **concurrently** (labeled `[api]` / `[web]`, `--kill-others-on-fail`); `npm test` / `npm run build` run all workspaces; **`npm run check`** = lint + format:check + typecheck + test (run before every commit) | One command for daily work. `check` mirrors CI locally | root `package.json` |
| 2026-11-03 | D-31 | CI: **GitHub Actions**, one job on `ubuntu-latest`, Node from `.nvmrc`, npm cache, `npm ci` → lint → format:check → typecheck → test → build. Runs on push to `main` and on PRs to `main`. `concurrency` cancels superseded runs, `permissions: contents: read`, 15-min timeout. Uses **`actions/checkout@v7`, `actions/setup-node@v7`** (latest, checked via the GitHub API) | Simple, fast, least privilege. Mirrors `npm run check` + build | `.github/workflows/ci.yml` |
| 2026-11-03 | D-32 | Web `vitest.config.ts` imports `./vite.config.ts` **with the extension** + `allowImportingTsExtensions` in the web tsconfig | Clears Vite's warning that extensionless config imports break under the upcoming native config loader | `apps/web` |
| 2026-11-03 | D-33 | Verification practice: (a) after writing tests, **deliberately break the code once** to prove they fail (done on the health route: 1 failed, then restored); (b) before pushing CI changes, **simulate CI in a clean copy** (`npm ci` + full pipeline) | Catches tests that can't fail, and lockfile/CI problems before they reach GitHub | Session 5 |
| 2026-11-03 | D-34 | **Push approved**: commit Day 3 and push all local commits (Day 2 + Day 3) to `origin/main` so CI runs | Needed for the Day 3 exit check (CI green on GitHub). Lifts the Day 2 "don't push yet" hold (resolves OD-8) | — |
| 2026-11-03 | D-35 | **No branch protection for now.** The repo stays private on the Free plan (protection needs Pro or a public repo, confirmed via API 403). Safety net = CI on every push + `npm run check` before each commit. Revisit if collaborators join or we move to Pro | $0 and private. Two-person pairing on `main` (resolves OD-9) | Day 3 checklist |
| 2026-11-03 | D-36 | Git auth for github.com goes through the **GitHub CLI** (`gh auth setup-git` → `credential.https://github.com.helper = !gh auth git-credential` in global `~/.gitconfig`, which bypasses the stale macOS Keychain entry). The `gh` token now has the **`workflow`** scope (`gh auth refresh -s workflow`, approved by the user in the browser) | The first Day 3 push failed: "Invalid username or token" (stale Keychain credential), and pushing `.github/workflows/*` needs the `workflow` scope | Known Issues #6 |
| 2026-11-04 | D-37 | Resume schema is **lenient on text**: email, phone, link URLs and dates are plain strings (no `email`/`uri` formats, free-text dates such as "Spring '22" or "Present"). **`experience.startDate` made optional** (Tech Design had it required) | Values come from messy real PDFs. A strict format would fail valid resumes. Some resumes have no dates | `resume.schema.ts`, Tech Design §5.1 updated |
| 2026-11-04 | D-38 | Use `z.object` (**strips unknown fields**) rather than `z.strictObject` for all schemas. Zod 4's JSON Schema output still marks every object `additionalProperties: false`, as Claude requires | Forward-compatible API (web and API deploy separately), while staying compatible with structured outputs | `llm-compat.test.ts` |
| 2026-11-04 | D-39 | **Structured-outputs compatibility enforced by a test** (`packages/shared/src/llm-compat.test.ts`): no `$ref`/recursion, supported types/formats/keywords only (min/max allowed because the SDK strips and checks them), every object closed, walker sanity check. Mutation-tested (a loose object + a regex → 4 failures). **Final confirmation with the SDK's `zodOutputFormat` on Day 7** | A schema change that breaks Claude parsing fails CI immediately, not at runtime | — |
| 2026-11-04 | D-40 | `LOCKED_FIELDS` constant lives in shared (experience: company/title/location/dates; education: institution/degree/field/dates; certifications: name/issuer/date), type-checked against the schema keys | The single definition the guardrail service (Day 12) and tests use | `resume.schema.ts` |
| 2026-11-04 | D-41 | Fixtures are **typed TS** (not JSON/.txt) in `packages/shared/src/fixtures/`, imported via the subpath **`@tailorcv/shared/fixtures`** and **not** exported from the main entry (verified absent from the web bundle). Added an extra known-good `sampleTailorResultSweFrontend` (honest tailoring: locked fields unchanged, no new skills) | Compile-time drift detection. Works in Vite, tsx and Vitest without loaders. The result fixture is reused later by FakeLlmClient and the UI tests | Day 4 checklist |
| 2026-11-04 | D-42 | Contract details: file named `api.schema.ts` (not `api.types.ts`); added **`NOT_FOUND` (404)** to the error catalog; parse `meta` = `{pages, durationMs, promptVersion}` (**token usage is logged, never sent to the client**); `TailorResponseSchema` = `TailorResultSchema` + `meta` | Contains schemas, not just types. Day 5's 404 handler needs a code. Don't leak cost data to the client | API spec §5 updated |
| 2026-11-04 | D-43 | `TailorRequest`: JD is **trimmed, then** checked for 100–15,000 chars (constants exported); `options` optional, `tone` ∈ professional/concise/impactful (default professional). Separate `TailorRequestInput` (client) and `TailorRequest` (server, after defaults) types | Whitespace can't pass the minimum. The web form can reuse the same limits | `tailor.schema.ts` |
| 2026-11-05 | D-44 | Rate limits per IP stay at **10 parses / 20 tailors per hour** (Tech Design §7), configurable through `RATE_LIMIT_PARSE_PER_HOUR` / `RATE_LIMIT_TAILOR_PER_HOUR` | User choice. Tailoring gets more because users re-tailor one resume for several JDs | Day 5 |
| 2026-11-05 | D-45 | **Deploying the skeleton is deferred to Day 24** (the optional Day 5 item) | User choice: keep Day 5 focused on code | Day 5 checklist |
| 2026-11-05 | D-46 | CORS = **exact allowlist** from `CORS_ORIGIN` (comma-separated URLs, validated with zod, no wildcards). Vercel preview URLs are **not** allowed. Methods `GET, POST`; `X-Request-Id` and `Retry-After` exposed. Name kept as `CORS_ORIGIN` (not renamed) to avoid churn | User choice: the strictest option | Tech Design §9, API spec |
| 2026-11-05 | D-47 | `createApp({ env, logger })` takes its dependencies as arguments (no globals). Tests use `tests/helpers/app.ts → buildTestApp(envOverrides)`, built on the new side-effect-free `parseEnv()` | Testable with any env; the LLM client gets injected the same way on Day 7 | ADR-010 |
| 2026-11-05 | D-48 | Error contract: `AppError(code, { message?, details?, cause? })` + `ERROR_CATALOG` typed `Record<ErrorCode, …>` (a missing code fails to compile). Central `errorHandler`: body-parser `entity.too.large` → `PAYLOAD_TOO_LARGE`, `entity.parse.failed` → `VALIDATION_ERROR`, anything unknown → `INTERNAL_ERROR` (generic message; real error only in the log at error level). `notFoundHandler` catches all unmatched paths | One shape for every failure (API spec §4). Nothing internal leaks | ADR-010 |
| 2026-11-05 | D-49 | Request id: `req_<32 hex>` (from `randomUUID`), echoed in `X-Request-Id` and `error.requestId`. An incoming id is reused only if it matches `[\w-]{8,64}` | Users can quote it in bug reports. The check prevents log injection | `middleware/requestId.ts` |
| 2026-11-05 | D-50 | Access log (pino-http): **minimal serializers** (`req: {id, method, url without query}`, `res: {statusCode}`, `responseTime`) + redaction paths (auth/cookie headers, `body`, `*.resume`, `*.jobDescription`, `*.buffer`). `/health` not logged. Levels: 5xx error, 4xx warn | User approved after the manual check showed about 40 noisy lines per request. Headers/query could carry user data | `middleware/requestLogger.ts` |
| 2026-11-05 | D-51 | Rate limiters come from a factory (`createRateLimiters(env)` → `{ parse, tailor }`), **applied per route** (not globally), in-memory store, `standardHeaders: draft-8`, the handler forwards `AppError("RATE_LIMITED", { details: { retryAfterSec } })`. New env `TRUST_PROXY` (0 locally, **1 on Render**) | Independent budgets per endpoint family. One Render instance means memory is enough. The correct client IP is needed behind the proxy | ADR-010 |
| 2026-11-06 | D-52 | **Doc-sync audit at every wrap-up:** before closing a session, check every doc the change touches (Tech Design, API spec, Dev Guide, ADRs, plan, README, `.env.example`) against the code and decisions, fix any drift, and log the audit in the session entry. Older drift that is found gets fixed if a decision already covers it, otherwise it goes to Known Issues | User request: "log everything in our devlog… document all the decisions and the changes in our respective md files" | This file |
| 2026-11-06 | D-53 | `errorHandler` maps **any client error flagged by Express/body-parser** (`expose: true` + 4xx `status`) to `400 VALIDATION_ERROR`, on top of the explicit `entity.too.large` / `entity.parse.failed` mappings. Errors that only carry a `status` (no `expose`, e.g. an Anthropic SDK 401/429) stay `INTERNAL_ERROR`. Health-check log skipping ignores the query string | Found in the final verification: an unsupported charset, unknown encoding or corrupt gzip returned **500** and was logged as a server error. `expose` keeps upstream failures from being blamed on the user | `middleware/errorHandler.ts`, API spec |
| 2026-11-06 | D-54 | **Push approved for Day 5**: committed as `c1b731d` and pushed to `origin/main` | User request at the end of Day 5 (lifts this session's "don't push" hold) | — |
| 2026-11-06 | D-55 | PDF fixtures are **generated by a committed script** (`apps/api/tests/fixtures/pdfs/generate.ts`, `npm run fixtures:pdfs -w @tailorcv/api`) **and the output is committed**. Fixed dates make the output byte-identical (verified). `pdf-lib` 1.17 is a **dev-only** dependency (unmaintained since 2022; fine for generating fixtures, never used at runtime). Extra fixture: `corrupt.pdf` (valid header, broken body). The over-5 MB case is built in memory in the tests (not committed) | User choice. Readable, reproducible and reviewable; tests don't depend on the generator | Day 6 |
| 2026-11-06 | D-56 | The encrypted fixture is **hand-written** (a Standard security handler `/Encrypt` dictionary whose `/U` doesn't match the empty password), not made with qpdf. Verified: pdf.js throws `PasswordException` | User choice. No system dependency (qpdf/mutool/gs aren't installed) | `generate.ts` |
| 2026-11-06 | D-57 | **Temporary `POST /api/v1/resumes/parse` stub** on the real path: rate limit → `uploadPdf()` → `validatePdf()` → `200 { stub: true, pages }`. It returns 200 rather than 501 so no error code is added to the shared contract for three days. Day 9 swaps in the real `ParseResponse` (noted in the Day 9 checklist + API spec §2) | User choice: test upload/validation end to end over HTTP and check the parse rate limit by hand now | `routes/resumes.ts` |
| 2026-11-06 | D-58 | Upload/validation rules: **(a)** the `%PDF-` signature (first 1024 bytes, per the PDF spec) is the real type gate; the declared type is only a pre-check (`application/pdf`, `application/x-pdf`, `application/octet-stream` allowed, others → 415 + `details.declaredType`). **(b)** Damaged PDFs → `UNSUPPORTED_FILE_TYPE` with a "damaged" message (no new error code). **(c)** A 0-byte file → `FILE_MISSING` ("empty"). **(d)** Wrong field / more than one file / malformed multipart (busboy) → `VALIDATION_ERROR`, never 500. **(e)** `FILE_TOO_LARGE` returns `details.maxBytes`. **(f)** Rate limiter before multer. **(g)** multer limits: 1 file, 10 fields, 20 parts; memory storage only. **(h)** Validation only opens the document and reads the page count (no text extraction yet), passes pdf.js a copy of the buffer, and always destroys the loading task | Cheap, strict, and every client mistake gets a 4xx (lesson from D-53) | API spec §2, Tech Design §6.1 |
| 2026-11-06 | D-59 | Rate limiters are now **created per app instance** inside `createApp` (`createRateLimiters(env)` → `createResumesRouter({ limiters })`); `AppDeps.env` includes the rate-limit vars | Each test app gets fresh budgets; the tailor router reuses the same object on Day 15 | `app.ts` |
| 2026-11-06 | D-60 | pdf.js runs with **`verbosity: 0`** (errors only) in `validatePdf` | Found in the pre-push manual pass: pdf.js printed a raw `Warning: Indexing all PDF objects` line to stdout while recovering `corrupt.pdf`, which breaks the JSON-only production logs. A test spies on `console.*` and fails if anything is printed (it failed before the fix) | `pdfValidationService.ts` |
| 2026-11-06 | D-61 | **Push approved for Day 6**: committed as `90db1fe` and pushed to `origin/main` | User request after the pre-push manual pass ("yes push it") | — |
| 2026-11-06 | D-62 | **Corrects D-39:** `$ref`/`$defs` ARE supported by Claude structured outputs; only **recursion** isn't. The SDK's `betaZodOutputFormat` emits `$defs` for reused sub-schemas (3 in `ResumeSchema`, 7 in `TailorResultSchema`). New `apps/api/src/llm/outputFormat.test.ts` checks the **exact** schema the SDK sends: allowed keywords only, every object closed, all refs resolve, no cycles (with a cycle-detector sanity test). The shared test's logic was already a valid recursion check (default `z.toJSONSchema` only emits `$ref` for cycles); only its name/comment was corrected | Day 7 = the planned final check with the real SDK converter (D-39). Found by running it, not assumed | `outputFormat.test.ts`, `llm-compat.test.ts` |
| 2026-11-06 | D-63 | `AnthropicLlmClient` uses `client.beta.messages.create()` + the JSON schema from `betaZodOutputFormat` + **our own** `JSON.parse`/`safeParse`, not `.parse()`. Order: `stop_reason` first (`refusal` → `AI_PROVIDER_ERROR` "declined", category logged, no retry; `max_tokens` → `AI_INVALID_OUTPUT`, no retry), then validation with **one retry** on invalid JSON/schema mismatch (`MAX_ATTEMPTS = 2`). Text blocks are joined; thinking/fallback blocks skipped. Schema-failure logs carry issue **paths only**, never values | `.parse()` throws a generic `AnthropicError` on mismatch, which can only be told apart by string-matching its message (the SDK guide says don't). The SDK docs confirm the format can be passed to `create()` | ADR-011 |
| 2026-11-06 | D-64 | SDK error mapping, most specific first: `APIConnectionTimeoutError` → `AI_TIMEOUT`; `APIConnectionError` → `AI_PROVIDER_ERROR`; `APIError` 429 / ≥500 (incl. 529) → `AI_PROVIDER_ERROR`; **other 4xx (400/401/403/404) → `INTERNAL_ERROR`**; anything else → `INTERNAL_ERROR`. SDK errors are never retried at app level (the SDK already retried). Logs: status, error type, upstream request id | A bad key or malformed request is our bug, not a provider outage, and must never look like the user's fault (D-53 lesson) | API spec §5 |
| 2026-11-06 | D-65 | Config: `ANTHROPIC_API_KEY` **required in production only** (startup exits with a clear message; empty = unset). Development/test may run without it: `createLlmClient` then returns a stub that fails each call with a logged `INTERNAL_ERROR`. New `LLM_TIMEOUT_MS` (default 90000). SDK **1.6.0** (sends `Authorization: Bearer`, API version `2026-10-21`). `fallbacks: "default"` with beta `server-side-fallback-2026-07-01` (category-routed, no model list to maintain) | `npm run dev` keeps working without a key until Day 9 wires the client in; production can't start misconfigured. Verified with the built server | `config/env.ts`, `llm/index.ts` |
| 2026-11-06 | D-66 | 🐛 **Fix:** `errorHandler` discards any **unread request body (≤ 6 MB) before sending** the error; larger/unknown-length bodies get `Connection: close`. Before, a rate-limited 4 MB upload got **EPIPE/ECONNRESET 20/20 times** instead of the 429 (also 404s to unknown routes) | Found by chasing a flaky Day 6 test (failed ~1 in 3 full runs under load) instead of re-running it. Real user impact: a browser would show "network error" instead of "too many requests" | `middleware/errorHandler.ts` |
| 2026-11-06 | D-67 | LLM testing: unit tests with a stubbed SDK for every branch; **the real SDK against a local fake Messages API** (test-only `baseURL` option) for HTTP shape, real error classes, SDK retries (529 → 3 hits) and timeouts; `FakeLlmClient` validates queued data against the caller's schema and records calls; `npm run llm:smoke -w @tailorcv/api` for one real call (never in CI) | Covers what a stub can't (headers, retries, real timeouts) without ever calling the real API | `anthropicSdk.test.ts` |
| 2026-11-06 | D-68 | **Local development uses Ollama, not the paid Claude API.** New `OllamaLlmClient` (local `llama3` 8B on Ollama 0.40.14) behind the same `LlmClient` interface. **One switch:** `LLM_PROVIDER` in `apps/api/.env` (`ollama` \| `anthropic`), read only by `createLlmClient()`. Defaults: `ollama` outside production, `anthropic` in production; **production refuses `ollama`**. Ollama settings: `OLLAMA_BASE_URL`, `OLLAMA_MODEL` (llama3), `OLLAMA_TIMEOUT_MS` (5 min), `OLLAMA_NUM_CTX` (8192). PDFs → text via unpdf for Ollama. The Claude client stays built and tested (fake API) for later. **When we prepare to deploy, we decide on a hosted provider (Claude API credit or something better) → OD-10, Day 24** | User: the Claude API is pay-as-you-go and they don't want to pay during local development; ChatGPT Go doesn't include API access. Free hosted tiers (e.g. Gemini free) may train on submitted data, which conflicts with the privacy promise. Local Ollama is free, private and already installed; a first test gave schema-valid, mostly faithful output | ADR-012, OD-10 |
| 2026-11-06 | D-69 | **Switching providers must need zero code changes**, enforced three ways: (1) **neutral types**: `LlmContent` = string or `{type:"text"}`/`{type:"pdf", data}` parts (it used to be the Claude SDK's block type, the one leak the audit found); each client translates (`toClaudeContent` → base64 `document` block before the text; `toPlainText` → unpdf text). `FakeLlmClient` records part types. (2) **ESLint boundary**: `no-restricted-imports` blocks `@anthropic-ai/sdk`(/*), `openai`, `ollama` and the concrete client modules outside `apps/api/src/llm/` and tests (proved with a violating probe file: 2 errors; the factory import is allowed). (3) **Contract suite** `tests/contract/llmClient.contract.test.ts`: 10 scenarios × every client via one local fake server, identical expected outcomes (proved: making the providers diverge → 3 failures naming the provider). Dev Guide now has "switching" and "adding a provider" checklists | User: "make sure our code is scalable so switching from Ollama to Claude doesn't need many code changes" | ADR-013 |
| 2026-11-06 | D-70 | **Push approved for Day 7**: committed as `53c4694` and pushed; then start Days 8–10 in the same session | User: "yes push day 7 and start day 8, day 9 and day 10" | — |
| 2026-11-06 | D-71 | Days 8–10 go **one day at a time; commit and push only when the user says so**, then continue step by step until Day 10 is done | User answer to the commit question | — |
| 2026-11-06 | D-72 | **Overall AI deadline per request** (Day 9): one total budget including retries, ~120 s for Claude and 5 min for local Ollama, then `AI_TIMEOUT` (resolves the Parking Lot item) | User choice ("Overall deadline") | Day 9 |
| 2026-11-06 | D-73 | Web session state uses **React context** (no Zustand), mirrored to sessionStorage | User choice | Day 9 |
| 2026-11-06 | D-74 | Day 8 prompt work stays on **local `llama3`** (no new model download for now) | User choice | Known Issue #8 |
| 2026-11-06 | D-75 | Parse design: the model fills **`ParseLlmOutputSchema`** (Resume without ids, bullets/details as strings, + `isResume`), versioned **together** with `PARSE_SYSTEM_PROMPT` as `parse-v1` in `llm/prompts/parse.v1.ts`; internal to the API (not part of the API contract, so `packages/shared` and the API spec are unchanged). `resumeParserService` sends a neutral PDF part + instruction, effort `low`, 16k tokens; `isResume=false` or nothing usable → `RESUME_NOT_DETECTED`; output re-validated against `ResumeSchema` | Server-assigned ids are stable and can't be hallucinated; the flag gives a clean "not a resume" path; prompt+schema versioning keeps logs/`meta.promptVersion` meaningful | Tech Design §6.1 |
| 2026-11-06 | D-76 | **Deterministic post-processing** (`services/resumeNormalizer.ts`) that never adds content: ids, trim/collapse, strip bullet glyphs, drop placeholders/empties, drop entries missing a required field (counted), recover skills put in `category`, move a degree line from details to degree, start = end date → end date only, links must look like URLs, **email rescued from the PDF text** (unpdf) if the model missed it. Stats are logged as counts only | Fixes the real llama3 mistakes seen on Day 7/8 without depending on the model; a unit test checks every output string comes from the model output or the document text | Known Issue #8 |
| 2026-11-06 | D-77 | Parse quality tooling: `tests/fixtures/pdfs/expected.ts` (expected content + `scoreParse` with "invented" checks), new `invoice.pdf` fixture, `npm run parse:pdf -w @tailorcv/api` (fixtures or `-- your.pdf [--json]`, local only). Prompt iterations happen in place until first commit (parse-v1 never shipped) | Measurable, repeatable accuracy notes instead of eyeballing | Dev Guide §4/§6 |
| 2026-11-06 | D-78 | **Wiring:** `createApp({ env, logger, llm })`: `server.ts` builds `llm` with `createLlmClient(env, logger)` (so `LLM_PROVIDER` applies); `createApp` builds `resumeParserService`; `createResumesRouter({ limiters, parser })` → `parseResumeHandler(parser)` in `controllers/resumesController.ts` (HTTP only: validatePdf → parse → JSON). `buildTestApp(env, { llm })` defaults to `FakeLlmClient` | Dependency injection as planned (ADR-011); routes stay thin; tests never touch a real model | Tech Design §4 |
| 2026-11-06 | D-79 | **Overall deadline implementation** (D-72): neutral `signal?: AbortSignal` on `GenerateStructuredParams`; clients pass it to their transport (SDK request option / `AbortSignal.any` with the per-attempt timeout) and rethrow aborts untouched (no mapping/logging), and stop retrying once aborted. `DeadlineLlmClient`/`withDeadline` wraps every client from `createLlmClient()`: aborts via the signal **and** races so it returns at the deadline even if a client ignores the signal → `AI_TIMEOUT`; a caller cancel passes through. `LLM_DEADLINE_MS` default 120 000 (anthropic) / 300 000 (ollama). The controller aborts the AI call when the HTTP client disconnects (`res.on("close")` before finish). Contract suite +1 scenario (caller cancel) | One budget regardless of provider/retries; no AI spend for responses nobody reads (verified: curl -m 1 → `request aborted`, no `llm call completed`) | Tech Design §6.3 |
| 2026-11-06 | D-80 | **FE data layer:** `apiRequest` + `ApiError` (server codes + `NETWORK_ERROR`/`BAD_RESPONSE`/`ABORTED`), success bodies validated with the shared schemas; `parseResume(file)`; `toFriendlyError()` with `Record<ApiErrorCode, …>` copy + next action, server text only for `PDF_TOO_MANY_PAGES`, `Retry-After` → "about N seconds/minutes"; `health.ts` now uses `apiRequest`. Session = React context in `src/state/` (`sessionContext.ts` + `session.tsx`, split for Fast Refresh), sessionStorage `tailorcv.session.v1` validated on load, new resume clears the tailoring result. Guards via `RequireSession`. `AppProviders` (TanStack Query, mutations never auto-retry + session) used by `main.tsx` and tests. `zod` declared as a direct web dependency (was a phantom dependency via hoisting) | One error shape for the UI, contract checks in the browser too, refresh-safe session, no crash in private mode | Tech Design §6.4 |
| 2026-11-06 | D-81 | **Upload limits moved to `packages/shared`** as `UPLOAD_LIMITS` (`maxBytes` 5 MB, `maxPages` 5); the API's `MAX_UPLOAD_BYTES` / `MAX_PDF_PAGES` now come from it and the web app's checks/hints use it | One source of truth so browser checks and server enforcement can't drift (same pattern as the JD limits, D-43). API spec §6 lists it | `limits.ts` |
| 2026-11-06 | D-82 | **Upload UX:** a valid file starts uploading immediately (no extra confirm button); instant client checks (PDF by MIME **or** `.pdf` name, since some OSes send a blank type; not empty; ≤ 5 MB); time-based progress copy (0 s / 8 s / 25 s) + elapsed seconds + **Cancel** (aborts the request → the API cancels the AI call); errors via `toFriendlyError()` with "Try again" only for retryable codes and the request id as "Reference"; a cancel is not shown as an error; success → `setParsed` → `/review`. Feature code in `features/upload/` (component files export only components); UI primitives in `components/ui/` (Button `type="button"` by default, Alert role alert/status, decorative Spinner). The Review placeholder shows a temporary summary line until Day 11 | Local AI can take 7–60 s, so the wait must be honest and cancellable; fewer clicks for the main path | Tech Design §6.4 |
| 2026-11-06 | D-83 | ADR statuses brought up to date: **ADR-002** (Express 5), **ADR-003** (PDF sent natively to Claude; Ollama extracts text in dev), **ADR-005** (two-step API, parse live), **ADR-007** (stateless MVP) → Accepted. ADR-004 (client-side PDF, Day 18) and ADR-006 (guardrails, Day 12) stay Proposed. Accepted ADRs are not edited (ADR-008 keeps its `messages.parse()` wording; its status line points to ADR-011) | Doc-sync audit requested by the user (D-52) | ADR log |
| 2026-11-09 | D-84 | **Review page lists everything read from the PDF** (Day 11 / FE-4, built as soon as the Day 10 browser check passed). `features/resume-view/ResumeView.tsx`: read-only, header (name, headline, contact details, links) then Summary, Experience, Education, Skills, Projects, Certifications, additional sections; **empty sections and blank optional fields are skipped**; **every value is plain text, resume links are not clickable**. `ReviewPage`: counts line (jobs, bullet points, education, skills, projects, certifications, pages, read time), a **warning listing common details that were not found** (email, phone, work experience, education, skills), "Looks good, continue" → `/job`, "Upload a different file" → clears the session → `/`. Read-only in the MVP (no editing) | User request after the first real upload: the one-line summary wasn't enough to check the parse ("list down all the important details from the resume for the user to see"). Plain-text links: a URL extracted from an uploaded PDF is untrusted input. The warning helps the user spot a bad read before tailoring | Tech Design §6.4 |
| 2026-11-09 | D-85 | **The review page is a compact summary, and the user can add to it** (replaces the full-resume layout of D-84 on this page, same day). `features/resume-review/ResumeSummary.tsx`: Contact grid; one line per job / school / project / certification; skills one line per category; bullet points, education details and the profile summary folded into `<details>`; counts in the section headings. **The user can add:** a missing headline / email / phone / location (only where the PDF had nothing), skills (duplicates refused, case-insensitive), bullet points on an **existing** job, certifications (name + optional issuer and date). Additions are marked "Added by you", can be removed, survive a refresh, and come with the note "only add things that are true". **Not in scope:** editing or deleting parsed content, adding new jobs / education / projects (Parking Lot). `ResumeView` stays for the tailored preview (Day 16) | User: the page "looks exactly same as a resume, how about we show a little compact version of it and let the user also add some things if they want to". Add-only keeps the page simple and keeps "what the PDF said" intact; user additions are the user's own statements, so they don't conflict with "tailor, never fabricate" (that rule binds the AI) | Tech Design §6.4, PRD FR-4 |
| 2026-11-09 | D-86 | **How additions are stored and reach the backend:** `packages/shared/src/resumeAdditions.ts` holds `ResumeAdditionsSchema`, `RESUME_ADDITION_LIMITS` (skill ≤ 60 chars, bullet ≤ 500, other fields ≤ 200; ≤ 50 skills, 50 bullets, 20 certifications) and the pure `applyResumeAdditions()` (never overwrites parsed fields, "Additional skills" group, next free ids, skips unknown jobs and duplicate skills). The web session gains `additions` + `setAdditions` (a new resume clears them; changing them clears the tailoring result; old stored sessions load with none). **No new endpoint and no new request field:** the tailor request will carry the merged `Resume`. **Backend contract change:** `TailorRequestSchema` now rejects a resume with duplicate ids (`VALIDATION_ERROR`), because ids can be created on the client and the guardrails match by id; the check is on the request, not on `ResumeSchema` (which must stay plain for structured outputs). No `apps/api` code changed: the tailor route doesn't exist until Day 15 | Stateless design (ADR-007): the resume lives in the browser, so there is nothing to save on the server. One merge function, shared and tested, means the browser and the API can't disagree about the merged shape | ADR-014, API spec §3/§6 |
| 2026-11-14 | D-87 | **Accept the slow local parse (37–45 s for the user's resume) and move on.** No model or prompt change now. If the wait gets in the way during the tailoring days: try a smaller local model, or trim what the parse prompt asks the model to emit | Measured in Session 14: it is generation speed, not a cold start (Known Issue #9). The progress copy covers waits this long (D-82), and the hosted production model will be faster | — |
| 2026-11-14 | D-88 | **Guardrail service shape (Day 12 / AI-4):** one pure function, `applyGuardrails(original, tailored)` → `{ resume, warnings, stats }` in `apps/api/src/services/guardrailService.ts`. Items are matched by id and the result is **rebuilt from the original entries**; only the parts the model may edit (bullet text and order, headline, summary, descriptions, skill grouping) are taken from its answer. `warnings` are user-facing strings (they contain resume text, never logged); `stats` are six counters, safe to log. No AI, no I/O, inputs not modified, and its own output passes clean | Building from the original makes the guarantee structural: a locked field cannot leak through because it is never copied from the model. Matching by id is what the schema's stable ids were made for (ADR-006, ADR-014) | ADR-006 (Accepted), Tech Design §6.2 |
| 2026-11-14 | D-89 | **Guardrail rules beyond the Day 12 list (Claude's choice, to be confirmed by the user):** (1) a job, school or certification the model **leaves out is put back**, and these sections keep the original order; projects and extra sections may be removed or reordered. (2) Also restored: name, email, phone, location, links, project name/link, extra-section title. (3) Project technologies follow the skill rule; extra-section items must be items of the same original section. (4) **New-number check:** a reworded headline, summary, bullet point, detail or project description containing a number found nowhere in the original is replaced by the original text. (5) A skill counts as known if it occurs in the original resume's text as whole words, any letter case ("Java" is not found in "JavaScript", "C" not in "C++"). (6) Case- or spacing-only changes to locked fields are restored without a warning. (7) Skill groups sharing an id are merged | (1) a missing job changes the work history, which is the user's call, not the model's. (4) the API spec already promised it ("200+ users" only if the resume says so). (5) Tech Design asked for skills found in the original text; whole-word matching avoids accepting "Java" from "JavaScript". (6) avoids noise warnings. Limits: number words ("three") and invented non-numeric claims are not caught; that is left to the prompt and the Day 22 evals | Tech Design §6.2, roadmap AI-4 |
| 2026-11-14 | D-90 | **Coverage is measured and enforced.** `@vitest/coverage-v8` (root dev dependency). The API's `npm test` runs `vitest run --coverage`; only the files in `coverage.include` (`apps/api/vitest.config.ts`) are measured and the run fails under 90% branches/functions/lines/statements. Today: `guardrailService.ts` (98% branches). CI enforces it through `npm test` | The plan and the Dev Guide set a ≥ 90% target for the safety-critical code; a target nobody measures drifts. Limiting it to the listed files keeps the run fast and the number meaningful | Dev Guide §3/§6, Tech Design §10 |
| 2026-11-14 | D-91 | **Keyword service (Day 13 / BE-6):** `analyzeKeywords(keywords, resume)` → `KeywordAnalysis` in `apps/api/src/services/keywordService.ts`. The keyword list comes from the model's job analysis; matching and the score are deterministic. Normalization: lowercase, NFKC, punctuation → spaces (keeping `+`, `#`, inner dots), crude plural → singular on plain words longer than 3 letters, a fixed alias table (25 groups). A keyword matches when its words are adjacent and in order inside one resume field. Output keeps the given spelling and order; blanks and repeats (other spellings included) are dropped; score = round(100 × matched / total), 0 for no keywords. `services/resumeText.ts` (`collectResumeText`) is shared with the guardrails | The score must not be something the model can flatter (Tech Design §5.2). Whole-word, single-field matching avoids false hits ("Java"/"JavaScript", a phrase spanning two fields). Known limits: no "-ing"/"-ed" forms ("testing" ≠ "test"), the alias table is small, and keywords the model invents are not checked against the JD text (Parking Lot) | Tech Design §6.2 step 4 |
| 2026-11-14 | D-92 | **Tailor prompt draft `tailor-v1` and `TailorLlmOutputSchema`** live together in `apps/api/src/llm/prompts/tailor.v1.ts` (same pattern as parse-v1). Output = `{ jobSummary, keywords, tailoredResume, changes }`, job analysis first (models write fields in schema order), built from the shared schemas. The system prompt is stable (cacheable) and states every rule the guardrails enforce; the tone and the data go in the user turn as `<resume>{compact JSON}</resume>` and `<job_description>`. Copies of the delimiter tags inside user text are removed. Not run on a model yet | One call for analysis + tailoring (Tech Design §6.2). Telling the model the enforced rules avoids answers the guardrails then undo. Compact JSON saves tokens for the 8k local context. Tests tie the prompt text to `LOCKED_FIELDS`, the change enums and the tones so it cannot drift from the schema | Tech Design §6.2 step 2 |
| 2026-11-14 | D-93 | **User decisions on tailoring behaviour (prompt review):** (1) the AI **may not remove a whole job** from the resume (confirms D-89 rule 1); (2) instead, each job's **bullet points are built around the pasted job description**: every job, older ones included, has its bullets reworded toward what the JD asks for; (3) the AI may write a short summary when the resume has none, and may remove bullet points it considers irrelevant. Claude's reading of (2), stated to the user: rewording only, from the facts of the original bullet (same work, tools, results); no new bullet points and no new facts, which the hard rule "tailor, never fabricate" and the guardrails forbid. The bullet rule in `TAILOR_SYSTEM_PROMPT` was rewritten to say this | User answers to the two review questions | `tailor.v1.ts` |
| 2026-11-14 | D-94 | **The model returns edits, not the resume (resolves OD-11, option A).** `tailor-v2` in `apps/api/src/llm/prompts/tailor.v2.ts` replaces the `tailor-v1` draft (never committed): output = job analysis, keywords, headline, summary, reworded bullets by id with a reason, ids of bullets to remove; lenient schema. The model reads the resume as plain text with bullet ids (no JSON, no contact details). `services/tailorEdits.ts`: `applyTailorEdits` builds the tailored resume from the original (omissions = no edit; unknown ids ignored; a job never loses all its bullets; skills the job names move to the front of their group) and `describeChanges` builds the change list from the real differences after the guardrails. `services/jobTailorService.ts` runs: LLM → apply edits → guardrails → changes → keywords → `TailorResponse`, and logs counts only. API contract unchanged | The user asked why tailoring did not simply apply the job description to the parsed resume; the full-resume design failed on the local model (Known Issue #10). Claude had recommended this option and built it on that instruction; **the user has not yet said "yes" to the design in so many words** | ADR-015, Tech Design §6.2 |
| 2026-11-14 | D-95 | **New guardrail: reworded text may not mention a job keyword the resume does not cover.** `applyGuardrails(original, tailored, { jobKeywords })`: keywords missing from the original (by `analyzeKeywords`) are looked for in each rewritten headline, summary, bullet, detail and description; a hit keeps the original text and adds a warning. Without `jobKeywords` the rule is off | Seen in the first `tailor-v2` run: the model wrote "GraphQL APIs" and "A/B testing" into bullets, and the keyword score rose from 50 to 63 on a fabricated match. Known cost: honest rewrites using a generic job term the resume words differently are rejected too ("data analysis" vs "analyzed … data") | Tech Design §6.2 step 3, ADR-015 |
| 2026-11-14 | D-96 | **Keyword rule and keyword matching corrected after a model-quality replay.** (1) `keywordService`: words are reduced to a rough stem (plurals, "-ed", "-ing", final "e"), so "mentor" matches "Mentored" and "testing" matches "tested". (2) Guardrail keyword rule (D-95) now blocks a rewrite only when the keyword contains a word the resume never uses in any form (same stem, or a shared start of ≥ 5 letters covering ≥ 60% of the longer word); short words must be equal ("Java" ≠ "JavaScript"). "GraphQL", "Storybook", "frontend architecture" are still blocked; "frontend performance", "internship" (resume: "Intern") are allowed | The replay showed D-95 as first built was wrong: it rejected honest rewrites (2 summaries, 1 bullet) and, by blocking every missing keyword, made it **impossible for tailoring to raise the keyword score**. After the fix the same answers gave 0 warnings and 44 → 50 and 50 → 57 | Tech Design §6.2 steps 3–4 |
| 2026-11-15 | D-97 | **`tailor-v2` prompt revised for Claude after the first six Claude runs** (still `tailor-v2`: never released). (1) Honesty: rewording may not add an action, responsibility, scale, audience or result the resume does not state, with examples. (2) Headline: a job title the candidate has held, written as in the resume (keeps "Intern"/"Junior"/"Senior"); never the title of the job applied for. (3) Bullets: every bullet is still listed (for the order), but a bullet is reworded only when that makes it match the job better; otherwise its original text is returned and the reason is empty. "A rewritten bullet must not be a copy" and "Rewrite every bullet" removed. (4) Summary: every statement from the resume, no first person | The six Claude runs had no invented tool, employer or number, but had mild embellishments ("and maintained", "large datasets", "a non-technical audience", "leading cross-team initiatives"), a headline that dropped "Intern", and many cosmetic rewrites ("Led migration" → "Led the migration") that inflate the change list the user reviews. The must-rewrite rules were written for `llama3`, which copied; on Claude they cause the cosmetic changes | Tech Design §6.2 step 2 |
| 2026-11-15 | D-98 | **Day 14 closed with one prompt iteration and one Claude check run; effort tuning deferred.** The user's instruction: one iteration, one test run, then push and start Day 15 | The user's call on time and API spend. Known cost: the revised prompt is checked on one pair only (see Next steps) | Plan Day 14 |
| 2026-11-15 | D-99 | **A tailor `VALIDATION_ERROR` lists the failing fields in `details.fields`**: at most 10 entries of `{ path, message }`, the path dotted (`resume.basics.fullName`), the message the schema's own text. A submitted value is never echoed. The web app shows the server's message only for fields the user types (`jobDescription`); for anything else it shows the generic copy | The API spec's catalog says "show the field errors" but no shape was defined. Paths and our own messages carry no resume or job description text (hard rule); a resume-shaped error means a bug in our app, which the user cannot fix by editing | API spec §3 |
| 2026-11-15 | D-100 | **Job description page behaviour.** The counter and the limits use the trimmed length (what the server counts). The length message appears only after the first submit attempt, then updates live. No `maxLength` on the textarea: text over the limit is kept and reported, not cut silently. The tailor step indicator changes at 4 s and 12 s and adds a note after 30 s | A hard cut on paste would lose the end of a posting without telling the user. The step times fit Claude's measured 8–16 s; the note covers the local model (15–37 s) | Tech Design §6.4 |
| 2026-11-15 | D-101 | **Service-wide AI limits** in `llm/withUsageLimits.ts`, a provider-neutral wrapper inside the deadline wrapper: `LLM_DAILY_CALL_LIMIT` (default 300 AI calls per UTC day) and `LLM_MAX_CONCURRENT` (default 4 in flight), all clients together, in memory. Over either → `429 RATE_LIMITED` with `Retry-After` before the provider is contacted. A call counts when it starts (a failed call may be billed) | Found in the security review the user asked for: the only spend control was the per-IP rate limit, which does not stop many addresses. The defaults are Claude's proposal (300 calls is roughly \$6–15 a day at the cost seen so far); the user has not reviewed the numbers | Tech Design §7, API spec intro |
| 2026-11-15 | D-102 | **A resume in a tailor request may carry at most 40,000 characters of text** (`RESUME_MAX_TEXT_CHARS` in `packages/shared`, checked in `TailorRequestSchema`) | Same review: the resume fields had no length limits, so one request could send close to 200 KB of text to the AI (the JSON body limit), many times the cost of a real resume. A dense 5-page resume is about 20,000 characters | API spec §3 |
| 2026-11-15 | D-103 | **Temporary development switch between Claude and the local model, per request.** `LLM_PROVIDER_SWITCH=true` (off by default; production refuses to start with it): `createLlmClient` builds both providers behind `SwitchableLlmClient`, each with its own usage limits and deadline; the request header `X-LLM-Provider` picks one, carried to the client in an AsyncLocalStorage context that the controller opens around the service call. The health response then has `llmSwitch`, and the web app shows two buttons in the header. **To be removed before the production deploy; the user asked to be reminded on Day 25** | The user wants to compare both models from the browser without editing `.env` and restarting. Services stay provider-neutral (D-69). The context is opened in the controller, not in the middleware, because an upload is parsed in between and an async context does not reliably survive that | API spec §1, plan Days 24–25 |
| 2026-11-15 | D-104 | **Tailoring quality enforced in code, not left to the model.** (1) `keywordsFoundIn`: only keywords whose words all occur in the job description are used for skill order, guardrails and the score. (2) Guardrails for a reworded bullet or detail: it keeps every number of its original, and it adds no commentary about the candidate (a short pattern list); otherwise the original text is kept with a warning. (3) Guardrail for the headline: a new one must be a job title from the resume. (4) `keywordAnalysis.matchScoreBefore` (optional in the shared schema). (5) Prompt: correct clear typos and grammar in every bullet, changing nothing else. (6) The headline's reason text now says "set to a job title from your resume" | The user's two browser runs with their own resume. On `llama3`: commentary on all 13 bullets, the resume's skills listed as the job's keywords (score 100, nothing missing), numbers dropped, 0 warnings. On Claude: honest, but typos left in because unchanged bullets had to be returned exactly. The user asked for the changes a principal engineer would make: deterministic checks hold on any model, a prompt does not. Known cost: the commentary patterns can reject a legitimate rewrite (the original is then kept, with a warning), and they catch only the listed forms | Tech Design §6.2 steps 2a and 3, API spec §3 |
| 2026-11-15 | D-105 | **Tailoring output checked for what `llama3` slipped past D-104.** (1) Prompt: the bullet field's description no longer contains "for this job" (the model copied it onto every bullet); new rules: never mention the job/role/company inside a bullet, the reason is never a copy of the bullet. (2) Guardrail: a reworded bullet, detail or summary that mentions the job being applied for ("this job/role/position/posting/opening", "the target role/company") → original kept + warning; not flagged if the user's own text had it. (3) The model's change reason is used only when it is a reason (blank, > 30 words, or containing the bullet's before/after text → default). (4) A change of only case/punctuation/spacing gets the reason "Fixed spelling, capitalization or punctuation." and counts as `bulletsCorrected`; the change type stays `reworded` (no schema change) | The user's browser run on `llama3` with their own resume: "for this job." appended to all 13 bullets, every reason a copy of the bullet, most "rewrites" only punctuation, 0 warnings. The user asked that the fixes must not hurt Claude's output: replaying the six saved Claude runs (Day 14, synthetic fixtures) through the new code changed nothing (45 bullets, 45 reasons, 6 summaries; Claude's reasons are ≤ 14 words) | Tech Design §6.2 steps 3 and 4b, API spec §3, ADR-017 note |
| 2026-11-15 | D-106 | **Competitor research is kept apart from the project docs, for after the MVP.** A top-level `research/` folder (first note: `research/nextraise-ai.md`). It changes no scope; ideas from it go through the Parking Lot → decision flow when the MVP is done | The user's request: "for knowledge purpose", "come back to this once we have our MVP ready" | `research/` |
| 2026-11-16 | D-107 | **Result page (Day 16): no `corrected` change type; tabs for the details; "Start over" left for FE-9.** Typo-only fixes stay type `reworded`, shown with the reason "Fixed spelling, capitalization or punctuation." (no shared schema change). The page shows the tailored resume beside a panel with two tabs, Changes (grouped by section, before → after, reason; a reorder shows the moved item by `targetId`) and Keywords (score before → after, matched and missing chips, "Add it on the review page"). The result page gets only "Change job description" for now; "Start over" / "Tailor for another job" are FE-9 (Day 19) | A new change type would change the shared schema, the API spec and the model's contract for a label the reason already gives; the plan puts FE-9 on Day 19 | Tech Design §6.4, `apps/web/src/features/result/` |
| 2026-11-16 | D-108 | **Security review (Day 17): dependency checks added, privacy wording made honest.** (1) CI runs `npm audit --omit=dev --audit-level=high` after install (runtime deps only, fails on high/critical; the accepted dev-only moderate findings stay out). (2) `.github/dependabot.yml`: weekly npm update PRs grouped into dev / production minor+patch, plus GitHub Actions. (3) Footer: "Your resume is sent to an AI provider to be read and tailored. TailorCV does not store it." (was "processed and not stored", which hid that the resume leaves our server). Reviewed and unchanged: helmet, CORS allowlist, rate limit before the upload is read, body/file/page/text limits, magic-byte check, memory-only storage, errors that never echo input, count-only logs with redaction, safe request ids, production refusing `ollama`/the switch/no key, spend limits, abort on disconnect; frontend renders all model and resume text as plain text (no `innerHTML`, no links), validates every response with the shared schema, keeps the session in `sessionStorage` behind try/catch. Left for Day 24: CSP on the frontend host; removing the provider switch | The user asked to make sure the API and frontend follow the security principles; Known Issue #7 had been open since Day 5; the old footer was inaccurate once a hosted provider is used | `.github/`, `AppLayout.tsx`, Tech Design §7 |
| 2026-11-16 | D-109 | **Tailoring quality eval as a local script with a committed, counts-only log.** `npm run tailor:eval -w @tailorcv/api`: the 6 synthetic fixture pairs through `jobTailorService`, one by one, on `llama3` by default (Claude only with `--provider anthropic`, billed, ask first). Per pair: bullets reworded (typo-only fixes counted apart, by the shared `CORRECTION_REASON`), summary/headline changed, score before → after, title/company found against the posting's first line, warnings by guardrail rule (classified from the guardrails' fixed wording; unknown wording shows as `other`), time. Raw answers saved to `apps/api/.eval-runs/` (git-ignored) for `--replay` (free, deterministic rerun through changed code). `--log "<note>"` appends a row to `docs/quality-log.md`. Logic in `src/eval/tailorEval.ts`, unit-tested with `FakeLlmClient`; never in CI | Agreed in Session 16 ("daily tailoring quality pass"), built after Day 17 as the user asked. Counts make prompt changes comparable without reading resume text; replays make rule changes checkable for free | `apps/api/src/eval/`, `apps/api/scripts/tailor-eval.ts`, `docs/quality-log.md`, Dev Guide |

---

## 🅿️ Parking Lot (ideas that came up, not in the current scope)

- ESLint import-order plugin (e.g. `eslint-plugin-import-x` or `simple-import-sort`). Deferred on Day 1 (D-13).
- Frontend "warm-up" ping to `/api/v1/health` on page load to hide Render free-tier cold starts (ADR-009). Do it on Day 10 or Day 24.
- Shared rate-limit store (e.g. Redis) if the API ever runs on more than one instance (ADR-010).
- If Vercel preview deploys need to call the API: add a preview-URL regex to the CORS allowlist (rejected for now, D-46).
- Review page: **edit or delete parsed content** (fix a wrong title, drop a bullet), and **add whole new entries** (a job, education, a project). Out of scope for D-85 (add-only). If done, the guardrails' idea of "original" stays the submitted resume (ADR-014).
- Show "added by you" in the tailoring result / change list (needs the additions sent separately, ADR-014).
- Keyword analysis: drop keywords the model lists that do not occur in the job description text (guards against invented keywords changing the score). Not done on Day 13 (D-91).
- Keyword matching: a larger alias table, and related word forms that are not simple endings ("analysis"/"analyzed", "intern"/"internship" count as related for the guardrail, but not for the score), if the Day 22 evals show misses. (Verb forms "-ed"/"-ing" done in D-96.)
- Tailoring: compare effort `medium` vs `low` on Claude (quality, latency, cost). Deferred from Day 14 (D-98); fits the Day 22 evals.
- Guardrail in code for the headline (must equal the original headline or a job title in the resume) and for dropped numbers in a reworded bullet, instead of relying on the prompt (D-97).
- **After the MVP: review `research/nextraise-ai.md`** (D-106). Top candidates: "needs your input" questions for missing keywords and missing numbers; accept/reject per change on the result page; deterministic resume quality checks with an open score formula; score bands; DOCX export and input; multi-job tailoring with browser-only history.
- ~~Change type `corrected` in the shared schema~~ → decided: not needed, the reason labels typo fixes (D-107).
- Result page: a "Your tailored resume" title on the preview, and highlighting reworded bullets in the preview (asked in Session 17; the user has not chosen yet).
- Guardrail for a dropped tool in a reworded bullet ("…using React, Node.js, Express.js…" → Express.js gone), like the D-104 dropped-number check. Seen on `llama3` on 2026-11-15.
- Summary quality: filler openers ("Highly motivated and detail-oriented…") and claims the resume does not state ("object-oriented design"). Hard to check in code; Day 22 evals.
- ~~Overall deadline for LLM calls~~ → decided: overall deadline per request (D-72), implemented on Day 9.

---

## 🐞 Known Issues / Tech Debt

| # | Severity | Description | Found | Status |
|---|---|---|---|---|
| 1 | Low (dev-only) | `npm audit`: 13 moderate, all from `minimatch` ReDoS (GHSA-g3hv-75wg-m249) inside ESLint / typescript-eslint deps. The only "fix" is a breaking downgrade | Day 1 | Accepted (D-15). **Rechecked Day 3: unchanged** (still 13 moderate, same root). Recheck when ESLint updates |
| 2 | Info | `npm run typecheck` errors with "No workspaces found" until workspaces exist | Day 1 | ✅ Resolved Day 2 |
| 3 | Low | npm 11 warns on every install about blocked install scripts (`esbuild`, `fsevents`). Harmless noise (D-21) | Day 2 | Accepted. If needed: `npm install-scripts approve <pkg>` or `deny <pkg>` to silence |
| 4 | Medium (process) | **npm quirk:** `npm install <pkgs> --workspace=<path>` sometimes installs but **doesn't save runtime deps** to the workspace `package.json` on the first run (happened 3× on Day 2; dev deps were fine). Also, installing a local workspace package by name (`@tailorcv/shared`) fails because it isn't on the registry | Day 2 | Workaround: **always check the workspace `package.json` after installing**, and re-run if missing. Add local packages by hand as `"@tailorcv/shared": "*"` then `npm install` |
| 5 | Info | Web production bundle is 403 KB (124 KB gzipped), mostly React + zod. **Day 9: 438 KB (134 KB gzipped) after TanStack Query; Day 10: 449 KB (138 KB); Day 11: 464 KB (141 KB)** | Day 2 | Revisit on Day 20 (perf/a11y pass) |
| 6 | Resolved | `git push` failed: "Invalid username or token. Password authentication is not supported". Cause: git used an old macOS Keychain credential, and the `gh` token lacked the `workflow` scope needed for `.github/workflows/` files | Day 3 | ✅ Fixed (D-36). If it recurs on a new machine: `gh auth setup-git` + `gh auth refresh -h github.com -s workflow` |
| 7 | Low (doc drift) | Tech Design §7 lists "`npm audit` in CI, Dependabot" as a control, but neither is set up (CI has no audit step, no `dependabot.yml`). Found in the Day 5 doc audit | Day 5 | ✅ Resolved Day 17 (D-108): CI step `npm audit --omit=dev --audit-level=high`, `.github/dependabot.yml` |
| 8 | Medium (quality, dev only) | **Local `llama3` 8B extraction quality** (real `OllamaLlmClient` run on the 3 fixture PDFs with `ResumeSchema`, before any real prompt): schema-valid and names/companies/titles/dates/bullet counts/education correct (incl. the 2-column PDF), **but the email was dropped in all 3, and skills came back as empty groups in 2 of 3**; earlier probe invented skill categories. 11–20 s per resume | Day 7 | Open → Day 8: write the parse prompt with explicit field rules, add post-processing (drop empty groups) and fixture-based quality checks (email present, skills non-empty, bullets verbatim). Consider trying a newer 8–14B local model (user's choice, a few GB). Final quality must be checked on the production provider (OD-10) | **Day 8 update:** with parse-v1 + post-processing → **53/56 checks (95%), stable over 2 runs, zero invented content**; email, skills, degree, dates and links fixed. Still open on llama3: headline missed in 2/3 (it shares a line with contact details), location missed in 1/3.
| 10 | Medium (quality, dev only) | **Local `llama3` does not tailor with `tailor-v1`** (2 runs, synthetic frontend resume × frontend JD, 29.5–36.5 s, 1,880 input / 765 output tokens, schema-valid on the first attempt). Job analysis and keywords were good (11 keywords, all from the JD). The tailored resume was a **verbatim copy**: no bullet, summary or skill changed; the third job, the education degree/field/dates, the email/phone/location, job locations and the project link were left out; the 2 listed changes had no target and described edits that were not made. The guardrails put everything back (6 warnings, 10 locked fields restored, 1 job put back), so the final resume equalled the original. Keyword score 55 before and after | Day 13 | **Fixed in structure by `tailor-v2` (D-94): `llama3` now rewrites.** Runs the same day: (1) swe × frontend, 29.9 s, 12 bullets reworded, 0 warnings, **but 2 fabricated keywords** ("GraphQL APIs", "A/B testing"; score 50 → 63) → D-95; (2) same pair after D-95 + prompt edits, 32.8 s, summary + 10 bullets reworded, 0 warnings, score 55 → 55, no fabricated keyword; (3) new grad × data analyst, 16.2 s, 2 bullets reworded, 3 rewrites rejected by the keyword rule ("data analysis", "data visualization"), score 44 → 44. **Still open on `llama3`:** filler endings on most bullets ("showcasing expertise in…") although the prompt forbids them; unverifiable claims that are not keywords ("PWA design", "project management"); one dropped number in a rewrite ("Mentored 3 junior engineers" → "Mentored junior engineers"); job title/company sometimes merged into one field; the keyword score did not improve in runs 2–3. Final quality must be judged on the production provider (OD-10). **2026-11-15, same six pairs on both providers with the same code:** `llama3` 15–36.5 s (avg 21.6 s), 11 guardrail warnings, a filler ending on all 31 reworded bullets, 6 numbers dropped from bullets (not caught), 1 invented number (caught), a summary kept in 2 of 6; Claude (`claude-opus-5-5`) 7.9–16.1 s (avg 12.1 s), 0 warnings, no filler, no dropped or invented number, a summary in 6 of 6. **Accepted for `llama3`: it is a free plumbing check, not a quality reference**  **2026-11-16 (Day 17, 3 fixture PDFs × 3 postings through the API):** 9 of 9 tailored on `llama3` (8.1–18.6 s, parse 7.6–14.8 s), but 8 of 9 came back with 0 changes: every rewrite added commentary ("…, which aligns with the job requirement…") and summaries named missing keywords (GraphQL, SQL), all rejected by the guardrails (checked on the raw answer: no false positive). The company was left out of the job summary in 7 of 9 |
| 9 | Low (dev only) | **Slow local parse: 49.7 s for a 1-page PDF** on the first real upload (Session 13), against 7–20 s for the fixtures. The log shows one `llama3` call, attempt 1, 1,352 input / 1,029 output tokens, no retry, no error. **Cause not confirmed**; the likely one is a cold start (Ollama reloads the ~4.7 GB model after it has been idle) | Day 11 | **Accepted (D-87), cause found in Session 14: not a cold start.** Same PDF twice: 45 s with the model unloaded, 37.5 s warm, so the load is only ~8 s. The warm call: 1,352 input / 1,029 output tokens in 37.5 s (~27 tokens/s, model 100% on the GPU, Apple M3 Pro). The time is the length of the output (37 skills, 3 projects); the fixtures are shorter (7.7–12.2 s the same day). The progress copy covers waits this long (D-82) |

---

## 📓 Session Log

### 2026-11-03: Session 1 (Planning)
**Day:** 0 (pre-development)
**Done**
- Wrote the planning docs: PRD, Technical Design, API Spec, Implementation Roadmap, Development Guide, ADRs (`docs/01`–`06`), and the root README.

**Discussed**
- Product: upload a PDF resume + paste a JD → tailored resume.
- Stack preference: JS-focused, React frontend + JS backend.
- Key design ideas: two-step API (parse → tailor), Claude reads the PDF natively, locked fields + deterministic guardrails (no fabrication), stateless MVP, client-side PDF export.

**Decisions:** D-1, D-2, D-3 (see the Decision Log).
**Open:** OD-1…OD-6.

### 2026-11-03: Session 2 (Daily plan + journal)
**Day:** 0 (pre-development)
**Done**
- Created `docs/07-daily-development-plan.md`: 25-day plan (Phase 0 + MVP) with daily goals, checklists, deliverables, exit checks and a progress tracker.
- Created this `DEVLOG.md` and `CLAUDE.md` (so new sessions auto-load the session protocol).

**Discussed**
- User wants day-by-day goals before any coding starts.
- User wants every discussion and decision persisted so a fresh session can resume.

**Decisions:** D-4, D-5.
**Next session:** Day 1, starting with OD-1, OD-3 and OD-5.

### 2026-11-03: Session 3 (Day 1: Kickoff, repo & tooling)
**Day:** 1
**Done**
- [Decisions] Resolved OD-1 (TypeScript), OD-2 (Vercel + Render free), OD-3 (`@tailorcv`), OD-5 (private GitHub on the user's account).
- [PLT-1] `git init -b main`. Root `package.json` (npm workspaces `apps/*`, `packages/*`, ESM, engines Node ≥ 24 / npm ≥ 11), `.nvmrc`, `.gitignore`, `.editorconfig`, `tsconfig.base.json`.
- [PLT-2] ESLint flat config (`eslint.config.js`), Prettier (`.prettierrc.json`, `.prettierignore`), root scripts `lint`, `lint:fix`, `format`, `format:check`, `typecheck`. VS Code shared settings.
- Verified: `npm run lint` ✅, `npm run format:check` ✅, no peer-dependency conflicts.

**Discussed**
- Free hosting options. Frontend: Vercel / Cloudflare Pages / Netlify / GitHub Pages. API: Render free (sleeps when idle), Koyeb, Cloud Run (card needed), Oracle VM (self-managed). Not free or not suitable: Railway, Fly.io, Vercel functions (4.5 MB body limit), Cloudflare Workers (no Express). The real running cost is the Claude API, not hosting, so set a monthly spend limit in the Anthropic Console.
- npm audit warnings are dev-only. Force-fixing them would break the toolchain.

**Decisions:** D-6 → D-16 (see the Decision Log). ADR-001 Accepted, ADR-009 added.

**Note for Day 2 (decide at the start):** because of `moduleResolution: Bundler` + ESM, the API should run in dev with **`tsx watch`** and build with **`tsup`** (bundles, so no `.js` import-extension issues), rather than plain `tsc` emit. `packages/shared` is consumed as TS source via workspace `exports` (no separate build step) unless a problem shows up.

**Issues / blockers:** none. Known Issues #1 and #2 logged.
**Exit check met?** ✅ Yes. User confirmed the commit email (D-17) and approved the first commit `chore: initialize monorepo`.

**Extra (same session):** the user couldn't find the repo on GitHub. Explained that Day 1 is local-only and the push was planned for Day 3. The user chose to do it now (D-18): installed `gh` via Homebrew, the user ran `gh auth login` (browser device flow), and Claude ran `gh repo create tailorcv --private --source=. --push`. Repo: https://github.com/tmuzu98/tailorcv, private, default branch `main`.
**Next session:** Day 2, PLT-3 (`packages/shared`).



### 2026-11-03: Session 4 (Day 2: Scaffold the three workspaces)
**Day:** 2 (started the same evening as Day 1, at the user's request)
**User instructions this session:** do Day 2 now, **don't push anything yet**.

**Done**
- [Decision] API run/build: `tsx` (dev) + `tsup` (prod) (D-19).
- [PLT-3] `packages/shared`: package.json (`exports` → TS source), tsconfig, zod, `API_PREFIX`, `HealthResponseSchema`.
- [PLT-4] `apps/api`: Express 5, `app.ts` factory, `server.ts` (graceful shutdown), zod env validation (`config/env.ts`), pino logger, `GET /api/v1/health`, `.env.example`, `tsup.config.ts`. Scripts: `dev`, `build`, `start`, `typecheck`.
- [PLT-5] `apps/web`: Vite 8 + React 19 + TS, Tailwind v4, React Router (`/`, `/review`, `/job`, `/result`, 404), `AppLayout`, placeholder pages, favicon, Vite proxy `/api` → `:4000`, `ApiStatus` footer indicator that calls the health check and validates it with the shared schema.

**Verified (by Claude)**
- `curl :4000/api/v1/health` → `{"status":"ok","version":"0.1.0","uptimeSec":0}`. Unknown route → 404.
- Through the Vite proxy: `curl :5173/api/v1/health` → ok. Deep link `/review` → 200 (SPA fallback).
- Production: `tsup` → `dist/server.js` (3 KB) runs under plain `node`, logs JSON. Invalid `PORT=abc` → clear zod error and exit 1.
- `typecheck` (3 workspaces) ✅, `lint` ✅, `format:check` ✅, web `vite build` ✅.

**Discussed**
- Whether Day 2 could be done the same day. Yes, about 1–1.5 h when pairing. The user chose to continue.
- npm 11 blocks dependency install scripts by default. We tested without approving them; everything works (D-21).
- npm workspace install quirk (Known Issues #4).

**Decisions:** D-19 → D-27.
**Issues / blockers:** Known Issues #3, #4, #5 logged. None blocking.
**Exit check met?** ✅ Yes. Claude verified it with curl, and the **user confirmed "API: ok" in the browser**. Committed locally as 2 commits (scaffold code, then docs). Not pushed, per the user's instruction.
**Next session:** Day 3: Vitest in all workspaces + sample tests (health route via Supertest, shared schema, `<App/>` render), root `npm run dev` (concurrently), GitHub Actions CI, branch protection, README quickstart. (Repo creation already done, D-18.)

### 2026-11-03: Session 5 (Day 3: Tests, single dev command, CI)
**Day:** 3 (same evening as Days 1–2, at the user's request)
**Done**
- [PLT-6] Vitest 5.1 in all workspaces. **13 tests**: shared `HealthResponseSchema` (5), API `GET /health` via Supertest (3: 200 + schema, no `x-powered-by`, 404), web app shell via Testing Library (5: renders, calls health, API down, schema mismatch, 404 page). `routes` exported for memory-router tests.
- [PLT-8] Root `npm run dev` (concurrently, `[api]` / `[web]` labels). Root `test`, `build`, and the new `check` script.
- [PLT-7] `.github/workflows/ci.yml` (actions v7). Pushed; **first run green** (all 9 steps).
- README quickstart, scripts table, project layout.
- Fixed a Vite warning about the native config loader (D-32).
- Rechecked `npm audit` (Known Issue #1): unchanged.

**Verified**
- Mutation check: broke the health route on purpose, the test failed (1 failed / 2 passed), restored from git (D-33).
- CI simulated in a clean copy (`npm ci` + full pipeline) before pushing.
- `npm run dev` brings up both apps, and web → API works through the proxy.
- GitHub Actions run `41776288280`: success on `db657a5`.

**Discussed**
- Branch protection: confirmed via the GitHub API (403) that it needs **GitHub Pro or a public repo** for private repos on the Free plan. The user chose to **skip it** (D-35).
- Pushing: the user approved committing Day 3 and pushing all local commits (D-34).
- Push failure: stale Keychain credential + missing `workflow` scope. Fixed with `gh auth setup-git` (Claude) + `gh auth refresh -s workflow` (user, browser) (D-36).

**Decisions:** D-28 → D-36.
**Issues / blockers:** Known Issue #6 (resolved). None open.
**Exit check met?** ✅ Yes. CI is green on GitHub, and a fresh copy installs and passes everything with `npm ci`. **Phase 0 complete.**
**Next session:** Day 4: shared schemas (SHR-1) + synthetic fixtures (SHR-2).

### 2026-11-04: Session 6 (Day 4: Shared schemas, the contract)
**Day:** 4
**User instructions this session:** work **locally only, don't push anything**.

**Done**
- [SHR-1] `resume.schema.ts` (ResumeSchema + sub-schemas, `LOCKED_FIELDS`), `tailor.schema.ts` (request/options/tone, Change, KeywordAnalysis, JobSummary, TailorResult, JD limits), `api.schema.ts` (`ERROR_CODES`, `ApiErrorResponseSchema`, `ParseResponseSchema`, `TailorResponseSchema`). All types exported.
- [SHR-2] Synthetic fixtures: `sampleResumeSwe` (all sections), `sampleResumeNewGrad` (sparse), JDs frontend/data-analyst/PM (strong/partial/weak match), `sampleTailorResultSweFrontend`.
- Tests: **53 in shared** (schemas, fixtures, unique ids, synthetic-data check, an honesty check on the sample result, LLM compatibility). Total 61.
- Docs: Tech Design §4/§5.1/§6.1, API spec §5/§6, Day 4 checklist updated to match the code.

**Verified**
- Read the structured-outputs limits from the Claude API reference: no recursion, no numeric/string constraints (the SDK strips them and checks client-side), `additionalProperties:false` required, limited formats. Encoded in `llm-compat.test.ts` and mutation-tested.
- Fixtures are not in the web production bundle.
- `npm run check` ✅.

**Discussed / notes**
- Started at the user's request right after Day 3.
- The user asked how to see the app in the browser: explained `npm run dev` → http://localhost:5173 and started the servers in the background. Stopped them at the end of the session.
- Wrote a full project summary (product, stack, design, progress, decisions, gotchas, open items) for the user's personal notes.
- Wrap-up: the user first asked to wrap up without pushing (committed locally as `433cb95`), then changed their mind and asked to **push as well**. Pushed, and CI is green (run 41778035944).

**Decisions:** D-37 → D-43.
**Issues / blockers:** none.
**Exit check met?** ✅ Tests green, and the API spec matches the schemas. Committed and pushed. CI green.
**Next session:** Day 5: error foundation + security middleware (BE-1, BE-2).

### 2026-11-05: Session 7 (Day 5: Error foundation & security middleware)
**Day:** 5 (started late on 2026-11-05, finished after midnight)
**User instructions this session:** ask for input where needed. Wrap up at the end, but **don't push anything**.

**Done**
- [Decisions] Asked the user: rate limits (keep 10/20, D-44), deploy (defer to Day 24, D-45), CORS (exact list, D-46).
- [BE-1] `lib/errors.ts` (`AppError`, `ERROR_CATALOG`), `middleware/requestId.ts`, `middleware/requestLogger.ts` (pino-http, redaction, minimal serializers), `middleware/errorHandler.ts` (`notFoundHandler` + central `errorHandler`).
- [BE-2] helmet, CORS allowlist, `express.json({ limit: "200kb" })`, `trust proxy`, `middleware/rateLimit.ts` (`createRateLimiter`, `createRateLimiters`).
- `config/env.ts`: `CORS_ORIGIN` list, `TRUST_PROXY`, `RATE_LIMIT_PARSE_PER_HOUR`, `RATE_LIMIT_TAILOR_PER_HOUR`, `parseEnv()`. `.env.example` updated. `createApp({ env, logger })`.
- Installed `helmet` 8.3, `cors` 2.8 (+ `@types/cors`), `pino-http` 11.0, `express-rate-limit` 8.7. Runtime deps were saved correctly (Known Issue #4 checked).
- Tests: API went from 3 to **31** (errors catalog/AppError, env, 404, error handler incl. async + non-Error throwables, body limit/malformed JSON, request id, helmet, CORS incl. preflight, rate limit + independent budgets, log redaction captured from real log output, minimal log line). Total **89**.
- Docs: API spec (cross-cutting behaviour: request id, body limit, rate limits, CORS), Tech Design env table, ADR-010, README status, Day 5 checklist + tracker.
- **Doc-sync audit** (the user asked for everything to be documented, D-52). Fixed drift:
  - Tech Design §4 repo tree: `requestLogger`, `tests/helpers/`, unit tests next to the code (removed `tests/unit/`).
  - Tech Design §7: rate-limit, PII-in-logs, CORS and headers rows now match D-46/D-50/D-51.
  - Tech Design §8: `AppError` shape (`status`/`message`, not `httpStatus`/`userMessage`), catalog, body-parser mapping, 404.
  - Tech Design §11: the access-log fields we actually log.
  - Dev Guide §4: how to throw `AppError`, adding a new error code (shared + catalog + spec), logging rules.
  - Dev Guide §5: removed "main is protected" (contradicted D-35).
  - Dev Guide §6: `buildTestApp` helper, testing middleware in isolation, deliberately break code once (D-33).
  - Logged Known Issue #7 (Tech Design promises `npm audit` in CI + Dependabot; neither exists).

**Verified**
- Mutation check (D-33): removed the redaction and broke the 404 handler → 3 tests failed, restored → green.
- Built `dist/server.js` and ran it in production mode: 404 + 250 KB body return the correct JSON, JSON logs.
- Manual checks against `npm run dev` (the user asked for them): health, 404, custom/unsafe request id, malformed JSON (400), 250 KB (413) vs 150 KB (passes), CORS allowed/foreign/preflight, auth + cookie shown as `[REDACTED]`, no secret strings anywhere in the log, Vite proxy → API, web app 200. **All passed.**
- Found during the manual check: access logs were about 40 lines per request (all helmet response headers, query, params). Trimmed with the user's approval (D-50) and re-verified (about 9 lines, no query string).
- Not testable by hand yet: rate limiting (no parse/tailor routes until Day 6+). Covered by automated tests.

**Discussed**
- How to test the changes: automated (`npm run check`, watch mode, deliberately break the code), curl against the dev server, browser.
- Corrected a mix-up: Claude first said "20 parses / 10 tailors"; the Tech Design says 10 parses / 20 tailors.

**Decisions:** D-44 → D-54. ADR-010.
**Issues / blockers:** none blocking. Known Issue #7 (doc drift) logged.
**Final verification pass** (the user asked to test everything once more):
- CI simulated in a clean copy (`git ls-files` → `npm ci` → lint, format:check, typecheck, test, build): all ✅.
- `npm audit --omit=dev`: **0 vulnerabilities**. Full audit: 10 moderate, all the known dev-only `minimatch` (Known Issue #1, down from 13). No lint warnings. New runtime deps saved correctly (Known Issue #4 checked).
- Edge-case probes (a temporary test, deleted afterwards) found 🐛 **a bug: client-caused request errors returned 500 `INTERNAL_ERROR`** (unsupported charset, unknown `Content-Encoding`, corrupt gzip), and a minor one: `/health?x=1` was still logged. Both fixed test-first (the new tests failed first, then passed), plus a hardening change so upstream SDK errors with a `status` aren't treated as client errors (D-53). 5 new tests → api 36, total **94**.
- Correct after the fix: malformed URL → 404, `HEAD /health` → 200, `DELETE /health` → 404, a spoofed `X-Forwarded-For` is ignored with `TRUST_PROXY=0`.
- Dev servers smoke-tested from the repo root: web `/` and `/review` 200, the Vite proxy works (health 200, 404 JSON), CORS allowed, no errors in the logs. (A first attempt started only the API because the shell's working directory had drifted to `apps/api`; this was a tooling slip, not a code issue.)
- Docs updated for the fix: API spec (unreadable requests → 400), Tech Design §8.

**Full manual test pass** (the user asked for it after the automated pass). Against `npm run dev` from the repo root, all ✅:
- A. Health + helmet headers (nosniff, X-Frame-Options, HSTS, CSP, Referrer-Policy, COOP), no `x-powered-by`.
- B. 404 JSON for `/api/v1/nope`, `/` and `DELETE /health`. Header request id = body request id.
- C. Request id: safe incoming reused, `<script>` and too-short ids replaced, unique per request.
- D. Body handling: malformed JSON / bad charset / unknown encoding / corrupt gzip → 400 `VALIDATION_ERROR`. Valid gzip JSON parsed. 199 KB passes, 201 KB → 413.
- E. CORS: allowed origin + exposed headers. A foreign origin and the lookalike `localhost:5173.evil.com` get no allow-origin. Preflight 204 with `GET,POST`.
- F. Web `/`, `/review`, `/job`, `/result`, unknown page → 200 (SPA). Vite proxy → API health + 404 JSON.
- G. Logs: 0 secret strings (token, cookie, resume name, JD text, query email), health checks not logged, 0 ERROR lines, minimal access-log entries.
- H. Rate limits by hand (a throwaway server with the real middleware, limits 3/2, deleted afterwards): 4th parse → 429 + `Retry-After: 3600` + `RateLimit` header + `RATE_LIMITED` JSON; tailor budget independent. **`TRUST_PROXY=0`: a spoofed `X-Forwarded-For` is ignored (client "B" on the same machine is also blocked, so spoofing can't bypass the limit). `TRUST_PROXY=1`: per real client IP.** Added a warning to `.env.example`: never set `TRUST_PROXY` > 0 without a real proxy in front.
- I. Env validation: `CORS_ORIGIN=*`, an invalid second origin, `RATE_LIMIT_PARSE_PER_HOUR=0`, `TRUST_PROXY=abc` → the server refuses to start (exit 1, clear message). Production build with two origins + `TRUST_PROXY=1`: health, second origin allowed, 404, JSON logs, graceful SIGTERM.
- Test-script slips (not app bugs): zsh doesn't split an unquoted `$J` (curl sent a malformed header → Node's bare 400), macOS has no `timeout`, and a script outside the repo can't resolve `express`. Each was fixed and re-run.
- The user interrupted the docs step to ask whether we were stuck (we weren't: all tests had passed), then approved it. The interrupted write had already saved the `.env.example` warning and this entry; only this note was added afterwards.

**Exit check met?** ✅ **Milestone 1.1 complete**: every error leaves the API in the standard shape, and the API is protected against basic abuse. `npm run check` green, the clean-copy CI simulation green, the full manual pass green.

**Push:** the user then asked to push (D-54). Staged diff scanned for secrets (none, no `.env`). Committed `c1b731d feat(api): add error contract and security middleware (Day 5)` and pushed. **GitHub CI green** (run 42294164955, all 9 steps). Then committed and pushed this DEVLOG update as `docs: log Day 5 push`.
**Next session:** ask about committing/pushing the Day 5 work, then Day 6 (PDF upload & validation, BE-3/BE-4).

### 📅 Week 1 summary (Days 1–5, 2026-11-03 → 2026-11-06)
- **Delivered:** monorepo (npm workspaces, strict TS, ESLint/Prettier), API skeleton (Express 5, zod env, pino), web skeleton (React 19, Vite 8, Tailwind 4, Router), Vitest in all workspaces, single `npm run dev`, GitHub Actions CI, private GitHub repo. Shared zod contract (resume, tailor, API envelopes, error codes, locked fields) with synthetic fixtures and a structured-outputs compatibility test. Error contract + security middleware. **Phase 0 + Milestone 1.1 done on schedule.**
- **Numbers:** 94 tests (shared 53, web 5, api 36). 54 decisions logged, 10 ADRs. CI green through Day 5.
- **Went well:** contracts first (shared schemas + typed error catalog catch drift at compile time). Deliberately breaking code proved the tests can fail every day. Manual checks found real noise (the log size) that tests didn't.
- **Watch out for:** npm workspace install quirk (Known Issue #4); the `npm audit` dev-only findings (#1); Render cold starts and `TRUST_PROXY=1` when deploying; the rate-limit store is per instance.
- **Next week (Days 6–11):** PDF upload & validation → LLM client (needs the Anthropic API key, **OD-4**, by Day 7) → AI parsing → parse endpoint → upload & review pages → **Milestone 1.2**.

### 2026-11-06: Session 8 (Day 6: PDF upload & validation)
**Day:** 6 (same session as Day 5, started right after the Day 5 push at the user's request)

**Done**
- [Decisions] Asked the user: fixture approach (generator + commit, D-55), encrypted fixture (hand-written, D-56), temporary parse route (yes, D-57).
- Installed `multer` 2.5 + `unpdf` 2.1 (runtime), `@types/multer` + `pdf-lib` 1.17 (dev). All saved correctly (Known Issue #4 checked), 0 vulnerabilities.
- [BE-3] `tests/fixtures/pdfs/generate.ts` → `resume-1page`, `resume-2page`, `resume-2column`, `seven-pages`, `encrypted`, `not-a-pdf`, `empty`, `corrupt` (.pdf). Deterministic output, committed. Script `fixtures:pdfs`.
- [BE-3] `middleware/upload.ts` (`uploadPdf()`: multer memory storage, 5 MB, single `file` field, declared-type pre-check, multer/busboy errors → our codes).
- [BE-4] `services/pdfValidationService.ts` (`hasPdfMagicBytes`, `validatePdf` via unpdf: damaged / encrypted / > 5 pages).
- `routes/resumes.ts` (`createResumesRouter`) with the stub parse route; wired into `createApp` with per-app rate limiters (D-59).
- Tests: `pdfValidationService.test.ts` (11) + `tests/integration/parse.test.ts` (19): every fixture, octet-stream, image/png, > 5 MB, no body, JSON, text-only, wrong field, two files, truncated multipart, GET, and the rate limit running before the upload. Helper `tests/helpers/fixtures.ts`. API 36 → **66**, total **124**.
- Docs (D-52 audit): API spec §2 (rules, check order, stub note, per-situation error table, `VALIDATION_ERROR` added to the error list), Tech Design §4 tree + §6.1 pipeline, Dev Guide §6 (PDF fixtures), plan (Day 6 ticked, stub task added, Day 9 note to replace the stub).

**Verified**
- Probed unpdf against every fixture before writing the service: page counts 1/2/1/7, `PasswordException` for the encrypted file, `InvalidPDFException` for empty/fake/corrupt.
- Deliberate break (D-33): page limit → 10, encryption mapping removed, rate limiter removed from the route, empty-file check disabled → **6 tests failed**; restored → 66 green.
- `npm run check` ✅.
- Manual pass on `npm run dev` (with `RATE_LIMIT_PARSE_PER_HOUR=20`): every fixture over HTTP with `curl -F` (also through the Vite proxy), octet-stream accepted, image/png → 415, 5.05 MB → 413, 4.77 MB junk with a `%PDF` header → 415 "damaged", every malformed request → 400, GET → 404. **Parse rate limit by hand**: request 20 → 200, 21+ → 429 with `Retry-After`; a request with no file while limited → 429 (limiter first); health unaffected. Logs: no fixture text, no filenames, 0 ERROR lines.

**Discussed**
- pdf-lib is unmaintained, so it's used only as a dev dependency for the generator.
- The stub returns 200, not 501, so the shared error contract stays unchanged.

**Decisions:** D-55 → D-61.
**Issues / blockers:** none. **OD-4 (Anthropic API key) is needed at the start of Day 7.**
**Pre-push manual test pass** (the user asked to test everything by hand before pushing):
- **Production build** (`node dist/server.js`, the first time unpdf ran from the tsup build): every fixture gives the right code. tsup keeps npm packages external (19 KB bundle), so Render's `npm install` provides unpdf.
- 🐛 Found: pdf.js printed `Warning: Indexing all PDF objects` (raw, non-JSON) to the production log on the damaged PDF. Fixed with `verbosity: 0` and a console-spy test written first (it failed, then passed) (D-60). Re-verified: 0 non-JSON log lines.
- **Load:** 100 uploads, 20 at a time (75 valid + 25 damaged) → exactly 75×200 + 25×415 in 182 ms. RSS 81 → 103 MB. Health OK afterwards, graceful SIGTERM, 0 errors in the log.
- **Regression script** (Days 5–6, against `npm run dev` from the repo root, PASS/FAIL per check): **54/54 passed**. It covers health/helmet/request id/error contract/body limits/CORS, every parse fixture and malformed request, the Vite proxy, the parse rate limit (429 + `Retry-After`, limiter before upload), the web routes, and the logs (no fixture text/filenames, no ERROR, no pdf.js warnings, health not logged).
- **Clean-copy CI simulation** (`npm ci` + full pipeline): all ✅, fixtures present. `npm audit --omit=dev`: 0 vulnerabilities.
- Script slips (not app bugs): a bare `wait` also waited on the background server (hung, stopped), and zsh didn't split an unquoted `$PIDS` (counted before all uploads finished, re-run with `xargs -P`). Afterwards the checks went into a script file with explicit PASS/FAIL comparisons, to avoid more quoting slips.

**Exit check met?** ✅ Every bad fixture returns its expected error code in the tests, by hand, and in the production build. API 67 tests, total **125**.

**Push:** the user asked whether everything works with zero errors. Answered yes for everything built, and listed what isn't covered yet: GitHub CI not yet run on Day 6, only synthetic PDFs (real Word/Docs/Canva exports and scanned PDFs untested), the parse route is a stub, nothing deployed, Known Issues #1 and #7 open. The user approved the push (D-61). Staged diff scanned for secrets (none, no `.env`). Committed `90db1fe feat(api): add PDF upload and validation with parse stub (Day 6)` and pushed. **GitHub CI green** (run 42298188550, all steps). Then pushed this DEVLOG update as `docs: log Day 6 push`.
**Next session:** Day 7: LLM client (AI-1). Get the Anthropic API key first (OD-4).

### 2026-11-06: Session 9 (Day 7: LLM client)
**Day:** 7 (same session as Days 5–6, at the user's request)

**Done**
- Loaded the Claude API reference skill before writing SDK code (current parameter names, `fallbacks: "default"`, `$ref` support, error classes).
- Checked credentials without printing them: no `.env`, no `ant` profile, nothing in the shell. Built and tested everything with fakes; only the real smoke run waits for the key.
- Installed `@anthropic-ai/sdk` 1.6.0 (saved correctly, 0 vulnerabilities).
- [AI-1] `src/llm/LlmClient.ts` (interface), `AnthropicLlmClient.ts` (D-63/D-64), `FakeLlmClient.ts`, `index.ts` (`createLlmClient`). Env: key rules + `LLM_TIMEOUT_MS` (D-65). `scripts/llm-smoke.ts` + `npm run llm:smoke` (`scripts/` added to the API tsconfig).
- Ran the SDK's real schema converter on our shared schemas → `$ref`/`$defs` present, which contradicted the Day 4 "no `$ref`" wording → checked the docs (refs supported, recursion not) → new SDK-output test + corrected wording (D-62).
- 🐛 Chased a flaky Day 6 rate-limit test → found rate-limited uploads get connection resets instead of 429 → fixed in `errorHandler` (D-66).
- Tests: `AnthropicLlmClient.test.ts` (request shape, data/usage, thinking blocks skipped, retry-once, invalid JSON, give-up, refusal, max_tokens, 9 error mappings, upstream request-id logging, no content in logs), `tests/integration/anthropicSdk.test.ts` (real SDK vs local fake API: request/headers, 529 + SDK retries, 401, timeout, refused connection), `FakeLlmClient.test.ts`, `outputFormat.test.ts`, `index.test.ts`, env tests, 2 early-response upload tests. API 67 → **114**, total **172**.
- Docs (D-52 audit): Tech Design §4 tree, §6.3 (method, SDK version/auth, refusal/max_tokens, retries, timeout worst case, error mapping, logging, testing), §8 (drain), §9 env table (`ANTHROPIC_API_KEY` prod-only, `LLM_TIMEOUT_MS`); API spec (drain note, `AI_PROVIDER_ERROR` incl. refusals, `INTERNAL_ERROR` incl. AI misconfig); Dev Guide §6 (FakeLlmClient usage, smoke script); ADR-008 → Accepted, **ADR-011** added; `.env.example`; plan (Day 7 ticked, smoke run pending, 🟡 in tracker).

**Verified**
- My own test assumption was wrong once: I expected `x-api-key`, but SDK 1.6 sends `Authorization: Bearer`. Checked with a local server and fixed the test, not the code.
- Deliberate break (D-33): retry disabled, timeout check skipped, refusal check skipped, body draining removed → **9 tests failed**; restored → 114 green.
- Flakiness: the original reproduction (20 rate-limited 4 MB uploads) went from 20× EPIPE/ECONNRESET to **20× 429**; full API suite **10× in a row green**.
- Built server: production without a key (or with an empty key) → exit 1 with "ANTHROPIC_API_KEY is required in production"; development without a key → starts, health 200.
- `npm run llm:smoke` without a key → clear "not set" message, exit 1.
- `npm run check` ✅.

**Discussion: paying for the API, and the local-model decision** (after the Day 7 code was done)
- The user asked how to create an API key → gave the Console steps (platform.claude.com: billing/credits, spend limit, create key, copy once, put it in `.env`, never paste it into chat).
- The user asked whether they'd have to pay → yes, the API is pay-as-you-go and separate from claude.ai or ChatGPT subscriptions. Estimates: smoke < \$0.01; a parse ~\$0.05–0.15; a tailor ~\$0.10–0.25 on Opus 5.5; ~\$5–20 for the rest of development. Options: fake client (free), a spend limit, a cheaper model via `ANTHROPIC_MODEL` (Haiku 5.5 ≈ 1/40th of the cost).
- The user asked about free alternatives (they have ChatGPT Go) → ChatGPT Go doesn't include OpenAI API access. Compared Gemini's free tier (may train on data: privacy conflict), Groq/OpenRouter free models (weaker, text only), local Ollama (free, private, weaker, dev only), Claude Haiku. Noted openly that Claude (Anthropic) was giving the comparison.
- The user already had Ollama installed → checked: Ollama 0.40.14 running, `llama3` 8B, M3 Pro 18 GB. **Real test** on `resume-2page.pdf` (text via unpdf + `z.toJSONSchema(ResumeSchema)`): schema-valid; name, both jobs, titles, dates and all 3 bullets verbatim; education/project/cert correct; **but it invented skill categories** ("Programming", "Database"); 25.7 s cold / 19.5 s warm; 8K context.
- **User decision:** use the Ollama client for local development for now; log it, and when we think about deploying, consider a Claude API key or something better (D-68, OD-10). The user asked for an easy way to switch → the `LLM_PROVIDER` one-line switch.

**Built for D-68**
- `src/llm/structured.ts` (shared `parseStructuredText` + `SchemaMismatch`, used by both clients), `src/llm/OllamaLlmClient.ts`, `createLlmClient` switch + startup log, env (`LLM_PROVIDER` + Ollama vars, production refusal), smoke script via the factory, `.env.example` switch section, README "AI provider" note.
- Tests: `tests/integration/ollamaClient.test.ts` (against a local fake Ollama: request shape, inline schema with no `$ref`, PDF → text, unsupported block, retry, give-up, truncation, 404 + pull hint, 500, timeout, not running + serve hint, no content in logs), env provider tests, factory tests. API 114 → **130**, total **188**.
- Verified: **real smoke via Ollama ✅** (`{"status":"ok","echo":"tailorcv"}`, 627 ms warm). `LLM_PROVIDER=anthropic` without a key → clear hint; production + ollama → refuses to start; unknown model → `ollama pull` hint. Deliberate break (default provider, truncation check, PDF conversion) → 3 failures; restored → green. `npm run check` ✅.
- Slip: a leftover throwaway probe script (`probe-ollama.mts`) caused 5 lint warnings; deleted (never staged).
- Docs (D-52): Tech Design §4/§6.3/§9 + Ollama paragraph, Dev Guide §6 (switching), ADR-012, plan (Day 7 ✅, Day 24 starts with OD-10), README, `.env.example`.

**Scalability pass for the provider switch** (user: switching Ollama → Claude must not need many code changes)
- Audit: no SDK or concrete-client imports outside `src/llm/` ✅, one switch ✅, shared validation/retry/error codes ✅. **Leak found:** `LlmContent` used the Claude SDK's block types. **Gaps:** nothing enforced the boundary, and nothing proved both clients behave the same.
- Fixes (D-69, ADR-013): neutral content parts + per-client translation; ESLint provider boundary; LLM client contract suite (20 checks). Tests updated (the compiler flagged the one Claude-shaped usage in a test); `toClaudeContent` tests added.
- Verified: boundary probe → 2 lint errors (factory allowed), repo lints clean; contract divergence probe → 3 failures; restored → API **151** green, total **209**.
- Result: Ollama → Claude = `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` in `.env`, restart, `npm run llm:smoke`. No code changes. Adding a provider = new class + contract harness (Dev Guide checklist).

**"Did we test the Ollama client and the API properly?"** (user question). Answered honestly with what was and wasn't covered, then closed the gaps that can be closed today:
- **Real `OllamaLlmClient` + real `llama3` + full `ResumeSchema` + neutral PDF parts** on `resume-1page`, `resume-2page`, `resume-2column` (temporary script, deleted): all ✅ schema-valid on the 1st attempt (11–20 s). Correct: names, companies, titles, dates, bullet counts, education (2-column too). **Quality gaps: email dropped in all 3, empty skill groups in 2 of 3** → Known Issue #8, input for the Day 8 prompt.
- **API manual regression re-run after today's changes** (error-handler drain, env/provider settings): regression script extended with 2 D-66 checks (4 MB upload while rate-limited → 429 JSON; 4 MB upload to an unknown route → 404 JSON) → **56/56 passed**.
- Not testable yet: the API calling the LLM (the parse route is wired to the LLM on Day 9); no upload UI until Day 10.

**Decisions:** D-62 → D-69. ADR-011, ADR-012, ADR-013. OD-4 replaced by OD-10.
**Issues / blockers:** none. OD-10 before Day 24. Parking Lot: overall LLM deadline.
**Exit check met?** ✅ The smoke script succeeds (on local Ollama, the agreed development provider), and unit tests pass with the fake client. A real Claude call is deferred to OD-10.

**Push:** approved (D-70). Secret scan clean, no `.env`. Committed `53c4694 feat(api): add provider-neutral LLM layer with Claude and Ollama clients (Day 7)`, pushed, **GitHub CI green** (run 42304423698).
**Next session:** Day 8: AI resume parsing on local Ollama (started right away).

### 2026-11-06: Session 10 (Day 8: Resume parsing with AI)
**Day:** 8 (same session as Days 5–7)
**User instructions:** stay on llama3 (D-74); overall AI deadline (D-72) and React context (D-73) for Day 9; one day at a time, commit/push only when told (D-71).

**Done**
- [AI-2] `llm/prompts/parse.v1.ts` (`PARSE_PROMPT_VERSION`, `ParseLlmOutputSchema`, `PARSE_SYSTEM_PROMPT`, `buildParseContent`), `services/resumeNormalizer.ts` (`normalizeParsedResume`, `looksLikeResume`), `services/resumeParserService.ts` (`createResumeParserService({ llm, logger })` → `ParseResponse`) (D-75/D-76).
- Fixtures: `invoice.pdf` added to the generator (other PDFs byte-identical); `tests/fixtures/pdfs/expected.ts` + `scoreParse` (D-77). Script `scripts/parse-pdf.ts` + `npm run parse:pdf`.
- Tests: `resumeNormalizer.test.ts` (ids, cleanup, placeholders, dropped entries, skill recovery/merge/dedupe, email rescue rules, degree move, single dates, links, "never invents content", `looksLikeResume`), `resumeParserService.test.ts` (FakeLlmClient: contract-valid response + meta, email rescue from the real fixture PDF, LLM call knobs, both RESUME_NOT_DETECTED paths, error pass-through, content-free logs), `ParseLlmOutputSchema` added to `outputFormat.test.ts` (exact SDK schema: keywords, closed objects, refs, no recursion). API 151 → **177**, total **235**.
- Docs (D-52 audit): Tech Design §4 tree + §6.1 steps 4–6 (prompt, schema, post-processing, RESUME_NOT_DETECTED); API spec §5 `RESUME_NOT_DETECTED` meaning; Dev Guide (prompt + schema versioning, `parse:pdf`); plan (Day 8 ticked, adjustments noted, ✅ in tracker).

**Accuracy (real `npm run parse:pdf`, local Ollama `llama3`, parse-v1)**

| Iteration | resume-1page | resume-2page | resume-2column | invoice | Notes |
|---|---|---|---|---|---|
| Day 7 baseline (no prompt) | email ❌, skills ✅ (invented categories) | email ❌, skills empty | email ❌, skills empty | — | Known Issue #8 |
| parse-v1, first run | 15/17 | 17/19 | 12/14 | ✅ not a resume | email + skills fixed; headline ❌, degree in details ❌, phantom link, start=end date |
| + prompt rules + normalizer fixes | 17/19 | 20/21 | 15/16 | ✅ | degree/dates fixed; llama3 put the location into links once |
| + links must look like URLs (run 1 & run 2) | **18/19** | **20/21** | **15/16** | ✅ | **53/56 (95%), identical across 2 runs, 0 invented**; open: headline (2/3), location (1/3) |

- Timing on M3 Pro: 7–17 s per resume (2-column fastest). Every bullet verbatim in every run.

**Verified**
- Deliberate break (D-33): skill recovery, email rescue, degree move, duplicate-date fix, link filter and the `isResume` check disabled → **10 tests failed**; restored → 177 green.
- `npm run check` ✅.

**Decisions:** D-71 → D-77.
**Issues / blockers:** none. Known Issue #8 updated (95%; headline/location gaps on llama3).
**Exit check met?** ✅ The 2-column fixture parses correctly on all core fields (name, email, location, job, dates, both bullets verbatim, education, all 3 skills, nothing invented); only the headline is missed by llama3. Results recorded above.

**Push:** the user said "yes push day 8 and start day 9". Secret scan clean. Committed `30a093c feat(api): add AI resume parsing service with parse-v1 prompt (Day 8)`, pushed, **GitHub CI green** (run 42306856344).
**Next session:** Day 9 (started right away).

### 2026-11-06: Session 11 (Day 9: Parse endpoint + frontend plumbing)
**Day:** 9 (same session; started after the user said "yes push day 8 and start day 9")

**Done**
- **Day 8 push:** `30a093c` pushed, **GitHub CI green** (run 42306856344); DEVLOG push note `848ce6c`.
- [BE-5] Real parse endpoint: `controllers/resumesController.ts`, `routes/resumes.ts` (stub removed), `createApp` builds the parser from the injected `llm`, `server.ts` uses `createLlmClient` (D-78).
- Overall AI deadline + cancel on disconnect: `llm/withDeadline.ts`, signal support in both clients, `LLM_DEADLINE_MS` (D-79). Contract suite: + caller-cancel scenario (22 checks).
- [FE-2/FE-3] `src/api/client.ts`, `resumes.ts`, `errorMessages.ts`; `health.ts` via `apiRequest`; `src/state/sessionContext.ts` + `session.tsx`; `app/RequireSession.tsx`, `AppProviders.tsx`, `queryClient.ts`; router guards; `main.tsx` providers. Installed `@tanstack/react-query` 5.107; declared `zod` in the web workspace (D-80).
- Tests: API `parse.test.ts` rewritten for real responses (ParseResponse + meta, email rescue through the route, 4 AI error codes, 2 RESUME_NOT_DETECTED paths, "no AI call for files that fail validation"), `withDeadline.test.ts` (5), factory deadline test, contract cancel. Web: `client.test.ts` (7), `errorMessages.test.ts` (6), `session.test.tsx` (store 7 + guards 6). API 177 → **193**, web 5 → **31**, total **277**.
- Docs (D-52): API spec §2 (stub note removed, AI step + cancel) and §5 (`AI_TIMEOUT` = overall deadline); Tech Design §4 tree, §6.3 timeout row, §6.4 (session, API layer, guards), §9 env (`LLM_DEADLINE_MS`); Dev Guide frontend conventions (+ Fast Refresh rule); `.env.example`; plan (Day 9 ticked, ✅).

**Verified**
- **Exit check, real:** API with local Ollama → `curl -F file=@resume-2column.pdf …/resumes/parse` → **200, contract-valid Resume in ~13 s**, everything correct (name, email, location, job, dates, both bullets verbatim, education, all 3 skills, 0 invented). `invoice.pdf` → 422 `RESUME_NOT_DETECTED`; `seven-pages.pdf` → 422 before any AI call. Startup log names the provider.
- **Cancel on disconnect, real:** `curl -m 1` on a 2-page upload → server logged `request aborted`, and no `llm call completed` for that request (the Ollama call was cancelled).
- Logs: 0 fixture text.
- **Manual regression on `npm run dev` with real Ollama: 57/57** (script updated: real Resume check, invoice check, rate-limit loop uses empty requests so it doesn't trigger 45 AI calls), incl. a **real parse through the Vite proxy** (the browser's path).
- Deliberate break (D-33): guards off, session save off, ABORTED mapping removed, deadline race removed, controller back to a stub → **16 tests failed** (web 5, API 11); restored → all green.
- Lint: 2 `react-refresh/only-export-components` warnings → fixed by splitting helpers into `sessionContext.ts` / `queryClient.ts` (0 warnings).
- `npm run check` ✅; `npm run build` ✅.

**Decisions:** D-78 → D-80 (D-72/D-73 implemented).
**Issues / blockers:** none. Known Issue #5 updated (bundle 438 KB).
**Pre-push end-to-end pass, Days 5–9** (user: "test end to end whatever changes we made until day 9 before pushing anything"). All ✅:
1. **Clean-copy CI simulation** (`npm ci` → lint 0 warnings, format, typecheck, 277 tests, build) ✅; `npm test` **5× in a row green**. (A first loop used root-level `npx vitest run`, which ignores the per-workspace configs, so web tests ran without jsdom: a check mistake, not flakiness. Re-run with `npm test`.)
2. **Production bundle + real Ollama** (`dist/server.js`, development mode because production refuses ollama): 3 resumes → 200 (7–14 s, correct counts), invoice → 422; 0 errors, 0 fixture text in logs.
3. **Production mode on the Claude path** (no key, so the built server pointed at a local fake Messages API via `ANTHROPIC_BASE_URL`): 200 real Resume. The fake API received Bearer auth, API version 2026-10-21, `claude-opus-5-5`, effort low, adaptive thinking, `json_schema` format, fallback beta + `fallbacks: "default"`, cached system prompt, and **content = native PDF `document` block + text**. 529 → 502 `AI_PROVIDER_ERROR`; 401 → 500 `INTERNAL_ERROR`.
4. **AI failure cases through the real endpoint** (built server, Ollama): `LLM_DEADLINE_MS=2000` → **504 `AI_TIMEOUT` at 2.06 s** (a normal parse takes ~12 s); Ollama not running → 502 + `ollama serve` hint; missing model → 500 + `ollama pull` hint; anthropic without a key → 500 + startup warning.
5. **Parse accuracy** (`npm run parse:pdf`): 18/19, 20/21, 15/16 (= Day 8, 53/56), invoice rejected.
6. **Manual regression on `npm run dev` + real Ollama: 57/57.**
7. **Frontend modules compile in the real Vite dev server:** 14 modules (providers, query client, router, guard, session, API client/resumes/errors/health, layout, pages) → 200, 0 errors; the shared package resolves in the browser build.
8. **Audit:** production deps 0 vulnerabilities; full 10 moderate (known dev-only `minimatch`, Known Issue #1).
- Not covered yet: clicking through the UI in a real browser (the upload page arrives on Day 10).

**Exit check met?** ✅ `curl -F file=@sample.pdf localhost:4000/api/v1/resumes/parse` returns a Resume (real, local Ollama). FE data layer ready.

**Push:** the user said "lets push day 9 and start day 10". Secret scan clean. Committed `0f85314 feat: real parse endpoint, AI deadline and frontend data layer (Day 9)`, pushed, **GitHub CI green** (run 42309869605).
**Next session:** Day 10 (upload page), started right away.

### 2026-11-06: Session 12 (Day 10: Upload page)
**Day:** 10 (same session; started after the user said "lets push day 9 and start day 10")

**Done**
- **Day 9 push:** `0f85314` pushed, **GitHub CI green** (run 42309869605); DEVLOG push note `05e780a`.
- `packages/shared/src/limits.ts` (`UPLOAD_LIMITS`), used by the API and the web app (D-81).
- [FE-1] `components/ui/` Button, Card, Alert, Spinner; `features/upload/` `fileChecks.ts`, `useParseResume.ts` (mutation + cancel + abort on unmount), `Dropzone.tsx`, `ParseProgress.tsx`, `progressMessage.ts`; `pages/UploadPage.tsx` (real page); `pages/ReviewPage.tsx` temporary summary (D-82).
- Tests: `pages/UploadPage.test.tsx` (14): limits hint, non-PDF, > 5 MB, empty, blank-MIME `.PDF` accepted, loading state with file name, success → session + `/review`, multipart field, drag and drop, cancel aborts (no error shown), encrypted (no retry, reference shown), page-count message from the server, AI timeout → Try again → success, network error; `progressMessage`. Web 31 → **45**, total **291**.
- Docs (D-52): plan (Day 10 ticked, exit check pending), Tech Design §4 tree + §6.4 (loading UX, upload page), API spec §6 (`UPLOAD_LIMITS`).

**Verified**
- Deliberate break (D-33): size check, navigate to `/review`, cancel abort, Try again button, request-id reference → **5 tests failed**; restored → 45 green.
- `npm run check` ✅ (0 lint warnings); builds ✅.
- Dev servers: all 11 new modules compile in Vite (0 errors); a real parse through the Vite proxy (the browser's path) → 200 in ~12 s.

**Decisions:** D-81 → D-83.
**Issues / blockers:** none. Known Issue #5: web bundle 449 KB / 138 KB gzip. Known Issue #7 (npm audit in CI + Dependabot) still open.
**After the build (conversation)**
- The user asked whether both dev servers were running → checked: API :4000 ✅ (health ok), web :5173 ✅, Vite proxy ✅, Ollama 0.40.14 ✅.
- The user asked what they can do if they upload their resume now → explained: step 1 of 4 only. Checks → local llama3 extracts everything (contact, headline, summary, jobs with verbatim bullets, education, skills, projects, certifications, other sections) in ~7–20 s → lands on Review with a one-line summary; full JSON via `npm run parse:pdf -w @tailorcv/api -- ~/resume.pdf --json`. Private (local AI, nothing stored, counts-only logs; the result stays in the tab's sessionStorage). Known llama3 gaps (headline/location). Not yet: review/edit (Day 11), tailoring (Days 12–15), change list + keywords (Day 16), PDF download (Days 18–19). Asked them to report wrong fields to improve the prompt.
- The user asked to **stop the servers and test later** → stopped (ports 4000/5173 free; a leftover VS Code network-helper connection, PID 14983, was not a server).

**Doc-sync audit** (user: "make sure we have logged everything in the md files", D-52). Checked every doc against the code and decisions; decisions D-1…D-82 have no numbering gaps, sessions 1–12 present, tracker current. Fixed:
- **ADR statuses** (D-83): ADR-002, ADR-003, ADR-005, ADR-007 → Accepted.
- **README:** status updated to Week 2 / Day 10 (upload + AI parsing work); added the API workspace scripts (`llm:smoke`, `parse:pdf`, `fixtures:pdfs`).
- **Dev Guide §2/§3:** setup no longer says to set `ANTHROPIC_API_KEY` (Ollama default, `ollama pull llama3`, `llm:smoke`); `build` described correctly; added `npm run check`; `test:e2e`/`eval` marked *planned* (Days 21/22); workspace scripts listed.
- **Tech Design:** §2 stack row (Claude in production + local Ollama in dev, OD-10), §6.2 tailor pipeline (structured output through `LlmClient`, not `zodOutputFormat`), §10 testing strategy (normalizer/LLM unit tests, real transports vs local fake APIs, contract suite, component tests, practices D-33 + clean-copy CI + `parse:pdf`), §11 observability (LLM, parse and startup log lines are implemented).
- **CLAUDE.md:** describes the provider-neutral LLM layer; hard rules now say tests never call a real model (Claude **or** Ollama) and state the `src/llm/` boundary (D-69).
- **PRD A2:** notes the local dev model reads extracted text only.
- **Roadmap AI-2/AI-5, plan Days 14/22:** "real API" → the selected real provider (Ollama in dev; production provider via OD-10); AI-2 uses the neutral PDF part.

**Exit check met?** 🟡 Pending: "uploading a real PDF in the browser lands on /review" needs the user's click-through; the user will test later (servers stopped). **Not committed** (D-71).
**Next session:** `npm run dev` → the user's browser check → commit/push Day 10 when told → Day 11.

### 2026-11-09: Session 13 (Day 10 exit check + Day 11: Review page)
**Day:** 10 → 11
**Done**
- Session start: read the DEVLOG and the plan, gave the user a status summary (Day 10 built, uncommitted, waiting for the browser check).
- Started the dev servers at the user's request (`npm run dev`; ports free, Ollama up with `llama3`, no `apps/api/.env` so the defaults apply: `LLM_PROVIDER=ollama`). API health ✅ directly and through the Vite proxy.
- **Day 10 exit check ✅ (by the user, real browser):** uploaded a real 1-page PDF resume → landed on `/review` with the summary line.
- [FE-4] **Review page** (D-84): `features/resume-view/ResumeView.tsx` (new) and `pages/ReviewPage.tsx` (replaces the Day 10 placeholder summary).
- Tests: `pages/ReviewPage.test.tsx` (10): every string of the full fixture is on the page (ids are not), details sit under the right section, counts line, no warning when nothing is missing, resume links are not clickable, sparse fixture skips empty sections and has no dangling date dash, "We couldn't find…" warning, name-only resume, Continue → `/job` keeps the session, "Upload a different file" clears the session → `/`, no session → back to `/`. `UploadPage.test.tsx` hand-off test now checks the name heading on `/review`. Web 45 → **55**, total **301**.

**The user's first real upload (counts only; no resume content is recorded here)**
- Result on screen: 2 jobs, 3 education entries, 37 skills, read in 49.7 s.
- Server log for the request: 200; one `llama3` call (parse-v1, attempt 1, stop reason `stop`, 1,352 input / 1,029 output tokens, 49,672 ms); 1 page; counts: experience 2, bullets 5, education 3, skills 37, projects 3, certifications 0; dropped entries 0; **the model missed the email and the normalizer recovered it from the PDF text** (`emailFromText: true`, D-76).
- **Not yet checked against the actual resume** (the old page only showed the summary line): whether 5 bullets across 2 jobs and 0 certifications are right. The new review page makes this check possible.
- 49.7 s is slow compared with the fixtures (7–20 s). Cause not confirmed → Known Issue #9.

**Verified**
- Deliberate break (D-33): hid certifications, removed the date filter, removed `reset()`, sent Continue to `/` → **5 tests failed**; restored → 55 green.
- `npm run check` ✅ (0 lint warnings, 301 tests); web build ✅ (455 KB / 139 KB gzip).
- The running Vite dev server serves the two new modules (200).
- **Not verified yet:** the new review page in a real browser with the user's resume (the user's next step).

**Discussed**
- The user asked for the review page to list all the important details of the resume, and for this to go into the DEVLOG.

**Decisions:** D-84.
**Doc-sync audit (D-52):** plan (Day 10 exit check + tracker ✅; Day 11 tasks ticked, demo left open), Tech Design §6.4 (review page), README status. No schema or API change, so the API spec is unchanged. Known Issue #5 bundle size: 455 KB / 139 KB gzip.
**Issues / blockers:** none blocking. Known Issue #9 logged (slow first parse).
**Exit check met?** Day 10 ✅. Day 11 🟡: the review page is built; "the demo works on all the test PDFs" is still open (1 real PDF so far). **Not committed** (D-71).
**Next session:** the user checks the review page against their resume → commit/push Days 10–11 when told → Day 11 demo with 3–5 PDFs → Day 12.

### 2026-11-09: Session 13, part 2 (Day 11: compact review page + user additions)
**Day:** 11 (same session)
**Done**
- User feedback on the first review page (D-84): it looks the same as a resume. Asked for a compact version where the user can also add things, with the backend and frontend changes needed.
- [SHR] `packages/shared/src/resumeAdditions.ts` (new): `ResumeAdditionsSchema`, `RESUME_ADDITION_LIMITS`, `EMPTY_RESUME_ADDITIONS`, `applyResumeAdditions`, `hasResumeAdditions`, `resumeHasSkill`, `collectResumeIds`, `findDuplicateResumeIds`. `TailorRequestSchema`: duplicate ids rejected (D-86).
- [FE-4] `features/resume-review/` (new): `ResumeSummary.tsx`, `InlineAdd.tsx`, `AddCertification.tsx`. `pages/ReviewPage.tsx` uses it (counts line and warning now use the merged resume; the warning says details can be added below). Session: `additions` + `setAdditions` (`state/sessionContext.ts`, `state/session.tsx`).
- `features/resume-view/ResumeView.tsx` kept unchanged for Day 16, with its own tests now.
- **Backend:** no `apps/api` code change was needed (stateless; the tailor route is Day 15). The backend-side change is the shared contract the API validates with.
- Tests: shared `resumeAdditions.test.ts` (16: schema limits, merge rules, ids, immutability, determinism, tailor request accepts the merged resume and rejects duplicate ids); web `ReviewPage.test.tsx` (16: compact layout, folded text, every parsed detail still present, add/remove for phone, skills, bullet point, certification, duplicate and blank input, limits attribute, refresh restores, navigation), `ResumeView.test.tsx` (5), `session.test.tsx` (+3). Shared 53 → **69**, web 55 → **69**, total **331**.

**Verified**
- Deliberate break (D-33): removed the next-free-id loop, the "never overwrite" rule, the duplicate-skill check, bullet removal and the duplicate-id rejection → **8 tests failed** (6 shared, 2 web); restored → all green.
- `npm run check` ✅ (0 lint warnings, 331 tests); builds ✅ (web 464 KB / 141 KB gzip).
- The running Vite dev server serves the new and changed modules (200); the API restarted cleanly after the shared change (health ok).
- **Not verified:** how the page looks and feels in a real browser (the user's next step).

**Discussed**
- What "add some things" covers was left open by the user; Claude chose add-only for missing contact fields, skills, bullet points on existing jobs and certifications, and parked editing/deleting and whole new entries (D-85). To be confirmed by the user after trying it.
- The user asked for a list of next steps → written under Current Status.

**Decisions:** D-85, D-86. ADR-014.
**Doc-sync audit (D-52):** PRD (flow + FR-4: no longer "read-only"), roadmap FE-4, API spec §3 (unique ids, merged resume) and §6 (additions module), Tech Design §4 tree + §6.4 (session store, review page), ADR-014, plan (Day 11 items, notes on Days 12 and 15), README status, Parking Lot (2 items), Known Issue #5 (bundle size).
**Issues / blockers:** none.
**Exit check met?** Day 11 🟡: built and tested; the browser check and the 3–5 PDF demo are open. **Not committed** (D-71).
**Next session:** see "Next steps" under Current Status.

### 2026-11-14: Session 14 (Day 11 exit check: browser check, demo, push)
**Day:** 11
**Done**
- Session start: read the DEVLOG and the local changes, gave the user a status summary; re-ran `npm run check` ✅ (331 tests).
- Checked Ollama (0.40.16 up, `llama3` installed, not loaded) and started the dev servers at the user's request (`npm run dev`). API health ✅ directly and through the Vite proxy.
- **Known Issue #9 settled (counts only):** the user uploaded the same real PDF twice: 45 s (model unloaded), then 37.5 s (warm). Log for the warm call: one `llama3` call, parse-v1, stop reason `stop`, 1,352 input / 1,029 output tokens, 37,517 ms; `ollama ps`: 100% GPU. Same counts as Session 13 (experience 2, bullets 5, education 3, skills 37, projects 3, certifications 0), `emailFromText: true` again. So it is generation speed (~27 tokens/s), not a cold start → accepted (D-87).
- **Day 11 browser check ✅ (by the user):** add and remove work; additions survive a page reload.
- **Parse of the real resume confirmed by the user** ("everything looks good"): the counts above are right.
- **Demo ✅:** Claude uploaded every fixture PDF through the running app (the Vite proxy, real `llama3`):
  - `resume-1page` 200 in 10.7 s (2 jobs, 1 education; headline found, no location); `resume-2page` 200 in 12.2 s (2 jobs, 1 education, 1 project, 1 certification; no headline); `resume-2column` 200 in 7.7 s (1 job, 1 education; no headline). Only which fields were filled was checked, not their text; the missing headline/location fit Known Issue #8.
  - Rejections: `not-a-pdf` 415 `UNSUPPORTED_FILE_TYPE`, `seven-pages` 422 `PDF_TOO_MANY_PAGES`, `empty` 400 `FILE_MISSING`, `encrypted` 422 `PDF_ENCRYPTED`, `corrupt` 415 `UNSUPPORTED_FILE_TYPE` ("appears to be damaged"), `invoice` 422 `RESUME_NOT_DETECTED` (2.5 s).
  - The uploads used up the parse rate limit (10 per hour, in memory): the 10th and 11th requests got 429 `RATE_LIMITED`, as designed. Reset by a watch-restart of the API (`touch` on a source file, no content change), then the last two files were uploaded.
- No bugs found by the demo, so nothing to fix under "fix bugs and catch up".
- Committed and pushed Days 10–11 at the user's request (D-71): `6447fea`.
- **CI failed on `6447fea`** (run 43659259409, Test step, 1 of 331): `UploadPage.test.tsx` "on success stores the resume and lands on /review" could not find the "Review your resume" heading; the page in the failure output was still the upload page. Cause: the test waited for `router.state.location.pathname`, then asserted on the page with a synchronous `getByRole`; the router's location changes before React renders the new page. It passed locally every time and lost the race on the slower CI runner.
- Fix `0f36cdb`: `await screen.findByRole(...)` in that test and in the one other test with the same pattern (`ReviewPage.test.tsx`, "Upload a different file"). No app code changed. `npm run check` ✅ → pushed → **CI green** (run 43659439041).

**Discussed**
- Add-only on the review page (D-85): the user tried it and raised no objection; editing/deleting stays in the Parking Lot. (Claude's reading of "everything looks good"; not stated by the user in so many words.)
- The user asked for the list of Day 12 tasks.

**Decisions:** D-87.
**Doc-sync audit (D-52):** no code changed in this session. Plan (Day 11 ticked, tracker ✅), README status, DEVLOG (Current Status, Known Issue #9). Other docs unaffected.
**Issues / blockers:** none open. Lesson for new web tests: after a navigation, wait for the page (`findBy…`), not only for the router's pathname.
**Exit check met?** Day 11 ✅ ("the demo works on all the test PDFs"). **Milestone 1.2 complete.**
**Next session:** Day 12, first task: write the guardrail tests with the "bad tailored output" fixtures.

### 2026-11-14: Session 14, part 2 (Day 12: guardrail service, test-first)
**Day:** 12 (same session; started when the user said "lets cook day 12")
**Done**
- [AI-4] **Tests first:** `apps/api/src/services/guardrailService.test.ts`, 58 tests on the synthetic fixtures, each "tailored" resume a handcrafted bad model output. Ran them before the service existed → the file failed to load (red).
- [AI-4] `apps/api/src/services/guardrailService.ts`: `applyGuardrails(original, tailored)` → `{ resume, warnings, stats }` (D-88). All 58 tests passed on the first run of the implementation.
- Test groups: honest output untouched (identity, the hand-written honest fixture, removals, regrouped skills, skill found only in a bullet point, new headline, sparse resume); locked fields (every experience / education / certification field, invented and deleted values, case-only change, several fields in one warning, contact details, project name/link, section title); entries (new job / school / certification / project / section dropped, repeated id dropped, left-out entries put back, job order kept, project order free); bullet points (added, repeated id, moved from another job, details and project bullets, blanked); skills (new skill, part-of-a-word, empty group, shared group id, **user-added skill survives**, project technology, section item); numbers (bullet, reuse of existing numbers, 5,000 = 5000, summary, headline / detail / description); general (schema-valid + unique ids, inputs not modified, deterministic + settles after one pass, stats are counts only).
- Coverage (D-90): installed `@vitest/coverage-v8` (root `package.json` checked after the install, Known Issue #4: saved correctly); `apps/api/vitest.config.ts` thresholds; API `test` script runs with `--coverage`.
- Not wired into anything yet: no route or service calls `applyGuardrails` until Day 14.

**Verified**
- **Coverage of `guardrailService.ts`: 98.07% branches (51/52), 100% functions, 100% lines.** The one uncovered branch is the non-text fallback in `collectText`.
- Deliberate break (D-33): 12 single-rule breaks, each run separately; every one failed at least one test (locked fields not restored 11, repeated entry ids 1, left-out entries 2, every skill accepted 7, no whole-word check 1, repeated bullet ids 1, new numbers accepted 6, 5,000 ≠ 5000 1, section items unchecked 1, contact details not restored 4, case-only change warns 1, technologies unchecked 3). File restored and compared with the saved copy.
- `npm run check` ✅ (0 lint warnings, **389 tests**: api 193 → 251).

**Discussed**
- Nothing was discussed before the build; the rules that go beyond the plan's list were chosen by Claude and are recorded as D-89 for the user to confirm.

**Decisions:** D-88, D-89, D-90. ADR-006 → Accepted.
**Doc-sync audit (D-52):** plan (Day 12 ticked + the added rules, tracker ✅), Tech Design §6.2 step 3 (the real rules) and §10 (coverage), ADR-006 status, Dev Guide §3 (`npm test` runs coverage in the API) and §6 (how the target is enforced), roadmap AI-4, README status. API spec: checked, no change needed (the tailor response shape is unchanged, and the "200+ users" note in §3 is now true in code). No schema change.
**Issues / blockers:** none. Known limits of the guardrails are in D-89 (number words and non-numeric invented claims are not caught).
**Exit check met?** Day 12 ✅: all guardrail tests green, coverage target met. **Not committed** (D-71).
**Next session:** see "Next steps" under Current Status.

### 2026-11-14: Session 14, part 3 (Day 12 push + Day 13: keyword service, tailor prompt draft)
**Day:** 12 → 13 (same session; started when the user said "lets get done with this day 12 task and start day 13")
**Done**
- **Day 12 push:** `3e1e4dc` pushed, **GitHub CI green** (run 43660602401; first CI run with coverage).
- [BE-6] Tests first (`keywordService.test.ts`, `resumeText.test.ts`; red: modules missing), then `apps/api/src/services/keywordService.ts` (`analyzeKeywords`, `normalizeForMatching`) and `services/resumeText.ts` (`collectResumeText`, moved out of the guardrail service, which now imports it). D-91.
- [AI-3, part 1] Tests first (`llm/prompts/tailor.v1.test.ts`; red), then `apps/api/src/llm/prompts/tailor.v1.ts`: `TAILOR_PROMPT_VERSION` ("tailor-v1"), `TailorLlmOutputSchema`, `TAILOR_SYSTEM_PROMPT`, `buildTailorContent`. `TailorLlmOutputSchema` added to `llm/outputFormat.test.ts` (the JSON schema the SDK sends fits Claude's structured-output subset). D-92.
- Coverage: `keywordService.ts` and `resumeText.ts` added to `coverage.include`.
- Tests: keyword 46, resume text 3, tailor prompt 21, output format +4. API 251 → **324**, total **462**.
- Fixture results: frontend JD keywords vs the honest tailored fixture → exactly the fixture's hand-written analysis (8 matched, 4 missing, 67); data analyst JD vs the new-grad resume → 7 of 10 (70); product manager JD vs the frontend resume → 0.

**Verified**
- Coverage of the three measured files: **100%** statements / branches (75/75) / functions / lines.
- One real bug found by the tests while building: the first plural rule kept words ending in "is", so "APIs" was not made singular; rule simplified (only "ss" endings and short words are kept).
- Deliberate break (D-33): 8 keyword-service breaks and 5 prompt breaks, each run separately. 12 failed at least one test. **One did not:** joining resume fields without a separator still passed, because the test's two fields were not adjacent (a skill category sat between them). Test rewritten with two adjacent skill items; the same break now fails 1 test.
- `npm run check` ✅ (0 lint warnings, 462 tests).
- **Not verified:** the prompt has not been sent to any model (Day 14).

**Discussed**
- The user did not comment on the D-89 question (may the AI remove a job?) before moving on; the rule stays as built and the question is repeated under Next steps.

**Decisions:** D-91, D-92.
**Doc-sync audit (D-52):** plan (Day 13 items ticked, review left open, tracker 🟡), Tech Design §6.2 steps 2 and 4 and §10, Dev Guide §3 (coverage list), roadmap BE-6, README status, Parking Lot (2 items). API spec: checked, no change (response shape unchanged; `keywordAnalysis` semantics match §3). No shared schema change.
**Issues / blockers:** none. Day 14 risks are listed under Next steps (context size on `llama3`, strict output schema, undone changes still in the change list).
**Exit check met?** Day 13 🟡: keyword tests green; "the prompt has been reviewed together" is open. **Not committed** (D-71).
**Next session:** see "Next steps" under Current Status.

### 2026-11-14: Session 14, part 4 (Day 13 exit check: prompt review + first local tailoring trial)
**Day:** 13
**Done**
- **Prompt review ✅ (Day 13 exit check):** the user answered both review questions (D-93): no removing whole jobs; build each job's bullet points around the job description; the summary and bullet-removal rules are fine. Bullet rule in `TAILOR_SYSTEM_PROMPT` rewritten accordingly.
- `apps/api/scripts/tailor-run.ts` + `npm run tailor:run -w @tailorcv/api` (new): runs a resume × JD through the tailor prompt, `applyGuardrails` and `analyzeKeywords` with the selected provider and prints timing, tokens, job analysis, keyword score before → after, warnings, what differs from the original, and the model's change list. Fixtures by name, or your own resume JSON + JD file.
- **First trial on local `llama3`** at the user's request (synthetic frontend resume × frontend JD, twice). Result in Known Issue #10: the pipeline runs end to end and the guardrails held, but the model did not tailor anything.

**Verified**
- `npm run check` ✅ after the prompt edit and the new script (462 tests, 0 lint warnings).
- The trial is the first real model call through `tailor-v1`, the guardrails and the keyword service together.

**Discussed**
- Why the trial failed and what to do: returning the whole resume asks a small model to copy ~1,000 tokens faithfully and tailor at the same time; it only copies, and loses parts. Claude proposed edits-only output → OD-11, for the user to decide.
- Two smaller findings for Day 14: omitted optional locked fields produce "the AI changed…" warnings (noise), and the model's change list cannot be trusted as a record of what changed.

**Decisions:** D-93. Open: OD-11.
**Doc-sync audit (D-52):** plan (review ticked, Day 13 ✅ in the tracker), Dev Guide §6 (`tailor:run`), README (script list), DEVLOG (Current Status, OD-11, Known Issue #10). Tech Design §6.2 still describes `tailor-v1` as built, which is correct until OD-11 is decided.
**Issues / blockers:** Known Issue #10. Not a blocker for the service code; it blocks useful local prompt iteration until OD-11 is decided.
**Exit check met?** Day 13 ✅ (keyword tests green, prompt reviewed together). **Not committed** (D-71).
**Next session:** OD-11, then Day 14.

### 2026-11-14: Session 14, part 5 (edits-only tailoring: tailor-v2, apply-edits, tailor service)
**Day:** 13 → 14 (same session)
**Done**
- The user asked where we were stuck and whether tailoring could be tested locally, then: "get in all the information you can from the job description and apply it to all the info we have from the user's parsed resume JSON; what's the issue in that?" Claude explained the issue (the model was asked to return the whole resume and copied it) and built the edits-only design it had recommended (D-94, ADR-015).
- `llm/prompts/tailor.v2.ts` (new; `tailor.v1.ts` and its test removed, they were never committed): `TAILOR_PROMPT_VERSION` "tailor-v2", lenient `TailorLlmOutputSchema`, `TAILOR_SYSTEM_PROMPT`, `renderResumeForPrompt`, `buildTailorContent`.
- `services/tailorEdits.ts` (new): `applyTailorEdits`, `describeChanges`.
- `services/jobTailorService.ts` (new): `createJobTailorService({ llm, logger }).tailor(request, { signal })` → `TailorResponse`. [AI-3]
- `services/guardrailService.ts`: keyword rule + `jobKeywords` option (D-95).
- `scripts/tailor-run.ts` now runs `jobTailorService` and prints every change with before/after.
- Tests: `tailorEdits.test.ts` 14, `jobTailorService.test.ts` 9, `tailor.v2.test.ts` 20 (replaces the 21 v1 tests), guardrail +6. API 324 → **354**, total **492**. `tailorEdits.ts` and `jobTailorService.ts` added to `coverage.include`.

**Prompt iterations on local `llama3` (synthetic fixtures only)**
1. `tailor-v1`, full resume back: no tailoring (Known Issue #10, part 4 of this session).
2. `tailor-v2` first version, swe × frontend: every bullet reworded, but two fabricated job keywords and filler endings; no summary, no reasons, no job title (they were optional in the schema).
3. `tailor-v2` + keyword guardrail + schema making title/summary/reason required + prompt rules against commentary and against importing the job's tools: summary and 10 bullets reworded with reasons, no fabricated keyword; filler endings remain.
4. Same prompt, new grad × data analyst: works; the keyword rule rejected 3 rewrites over generic terms.

**Verified**
- `npm run check` ✅ (0 lint warnings, 492 tests). Coverage of the five measured services: 97.14% branches (136/140), 100% functions.
- Deliberate break (D-33): 14 breaks across `tailorEdits`, `jobTailorService` and the keyword rule, each run separately; all 14 failed at least one test.
- Three real `tailor-v2` runs on `llama3` (16–33 s). In all three the final resume kept every job, every locked field and every id.
- **Not verified:** tailoring with the user's own resume and a real job description; any hosted model; the browser (no endpoint or page until Day 15).

**Discussed**
- Local quality limits (Known Issue #10) and the trade-off of the keyword rule; listed under Next steps for the user.

**Decisions:** D-94, D-95. ADR-015. OD-11 resolved.
**Doc-sync audit (D-52):** Tech Design §6.2 (steps 2, 2b, 3, 4b, 5 and the prompt file names), API spec §3 example (`tailor-v2`), ADR-015, plan (Day 14 items, tracker 🟡), Dev Guide §3/§6, roadmap AI-3, README status, DEVLOG. D-92 and Session 14 part 3 describe `tailor-v1` as it was; left as history. No shared schema change.
**Issues / blockers:** Known Issue #10 (quality on the local model). No blocker.
**Exit check met?** Day 13 ✅. Day 14 🟡: service done; "6 real runs with 0 fabricated facts" not met yet (3 runs; fabricated keywords are now blocked, other invented claims are not). **Not committed** (D-71).
**Next session:** see "Next steps" under Current Status.

### 2026-11-14: Session 14, part 6 (quality check without a model call; keyword rule fixed)
**Day:** 14 (same session)
**Done**
- The user asked how to improve quality, then whether the Claude Pro subscription could power the app. Answer given: no, the API is billed separately (Console key + credit; roughly 4 cents per tailoring run on Claude Opus 5.5 at $4 / $20 per million tokens); switching is `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` in `apps/api/.env`. OD-10 stays open.
- The user chose a no-cost check first. Claude wrote, by hand, the answer a strong model would give for the two synthetic pairs (swe × frontend, new grad × data analyst) and replayed them through the real `jobTailorService` steps. `scripts/tailor-run.ts` got `--edits <file>` for this (uses `FakeLlmClient`, no model call).
- **Findings:** (1) with model-quality edits the output is clean: no filler, every job kept, reasons shown, so the filler and padding seen earlier come from `llama3`, not from the design; (2) our own keyword rule (D-95) rejected 3 honest rewrites (both summaries and one bullet: "frontend performance", "mentor", "internship") and the score could not move (39 → 39, 50 → 50).
- Fix (D-96): stemming in `keywordService`, word-level keyword rule in `guardrailService`. Tests: keyword +4, guardrail +3. API 354 → **361**, total **499**.
- **Same answers after the fix:** 0 warnings; swe × frontend 44 → 50 (18 changes, summary kept); new grad × data analyst 50 → 57 (7 changes, summary kept).

**Verified**
- `npm run check` ✅ (0 lint warnings, 499 tests); coverage of the measured services 97.43% branches.
- **Limits of this check:** the answers were written by Claude, who knows the guardrail rules, so they are a best case, not a measurement of any model. They are not committed (scratchpad only). No hosted model has been run.

**Decisions:** D-96.
**Doc-sync audit (D-52):** Tech Design §6.2 steps 3–4, Dev Guide §6 (`--edits`), Parking Lot item updated, DEVLOG. No schema or API change.
**Issues / blockers:** none new. Known Issue #10 (local model quality) unchanged.
**Exit check met?** Day 14 🟡 (unchanged: real runs and prompt iteration still open). **Not committed** (D-71).
**Next session:** see "Next steps" under Current Status.

### 2026-11-15: Session 15 (Day 14: Claude API runs, provider comparison, prompt revision; push)
**Day:** 14 → 15
**Done**
- The user added a Claude API key to `apps/api/.env` and set `LLM_PROVIDER=anthropic`. `npm run llm:smoke`: ✅ `claude-opus-5-5`, 3.0 s.
- **Six pairs (2 resumes × 3 JDs) on Claude**, then the same six on local `llama3` with the same code, for a like-for-like comparison. Numbers in Known Issue #10. Synthetic fixtures only; one run per pair and provider.
- **Bug fixed in `scripts/tailor-run.ts`:** without `--edits` the first positional argument was dropped (`editsAt + 1` is 0 when the flag is absent), so every run with named fixtures failed. Introduced with `--edits` in Session 14 part 6; not caught because the script has no tests.
- `scripts/tailor-run.ts` prints the call's token counts (input, cache write, cache read, output).
- **Prompt revision (D-97)**, tests first (4 new assertions in `tailor.v2.test.ts`, red, then green): no embellishment, headline = a held job title, reword a bullet only when it helps, summary from resume facts without first person.
- **One check run after the revision** (new grad × data analyst, Claude): 5.7 s, 669 input + 570 output tokens (cache tokens were not printed yet), 0 warnings, headline "Data Analyst Intern" (was "Data Analyst | SQL, Python (pandas), Tableau"), no embellishment, 3 changes instead of 7: headline, summary, skills order; **no bullet reworded**. The summary used "where I cleaned…"; the no-first-person rule was added after this run.

**Verified**
- `npm run check` ✅ (0 lint warnings, 503 tests: api 365).
- GitHub CI on the pushed commit: see part 2.
- **Not verified:** the revised prompt on the other five pairs; the no-first-person rule on any model; effort `low`; cost per run (cache token counts missing from the one run); the user's own resume.

**Discussed**
- How the provider switch works (`LLM_PROVIDER` → `createLlmClient`, ESLint boundary). No change.
- Claude answered the user's question on `llama3` vs Claude with the comparison above.

**Decisions:** D-97, D-98. Still open: OD-10 (the key works; the production-provider decision is not recorded), ADR-015 confirmation.
**Doc-sync audit (D-52):** Tech Design §6.2 step 2 (prompt rules), Dev Guide §6 (`tailor:run` prints tokens), plan (Day 14 items and tracker), README status, DEVLOG (Current Status, Decision Log, Known Issue #10, Parking Lot). API spec: checked, no change (no schema or contract change; prompt version still `tailor-v2`). `.env.example`: checked, no change.
**Issues / blockers:** none.
**Exit check met?** Day 14 ✅ by decision D-98: six real runs on each provider with latency recorded. "0 fabricated facts": no invented tool, employer or number on Claude; the mild embellishments found are addressed by D-97, confirmed on one pair. Effort tuning not done.
**Next session:** Day 15.

### 2026-11-15: Session 15, part 2 (Days 13–14 pushed; Day 15: tailor endpoint + job description page)
**Day:** 15
**Done**
- **Push:** `1160cc8` (Days 13–14) pushed; **GitHub CI green**.
- [BE-7] Tests first (`tests/integration/tailor.test.ts`, 21 of 26 red), then `tailorResumeHandler` in `controllers/resumesController.ts`, the route in `routes/resumes.ts` (rate limit → controller) and `createJobTailorService` wired in `app.ts`.
- [FE-5, FE-6] Tests first (`pages/JobDescriptionPage.test.tsx` 20, `features/job/tailorSteps.test.ts` 6), then: `api/client.ts` (`json` option), `api/resumes.ts` (`tailorResume`), `features/job/` (`useTailorResume`, `StepProgress`, `tailorSteps`, `jobDescriptionChecks`), `pages/JobDescriptionPage.tsx` (replaces the placeholder), `api/errorMessages.ts` (server field message for `jobDescription`).
- Tests: api 365 → **391**, web 69 → **95**, total **555**.

**Verified**
- `npm run check` ✅ (0 lint warnings, 555 tests).
- Deliberate break (D-33): 8 breaks, each run separately (no rate limiter on the route, no cap on listed fields, a submitted value echoed in the message, additions not sent, result not stored, message shown before submit, Cancel not aborting, no JSON content type). All 8 failed at least one test.
- **Real HTTP request** to a temporary API (`PORT=4010`, `LLM_PROVIDER=ollama`, synthetic fixture): `POST /api/v1/resumes/tailor` → 200 in 36.1 s with a contract-shaped body (5 changes, 6 warnings, score 50); `{"jobDescription":"too short"}` → 400 `VALIDATION_ERROR` naming `resume` and `jobDescription`.
- **Not verified:** the page in a real browser (the Day 15 exit check); the endpoint on Claude; the page with a screen reader.

**Decisions:** D-99, D-100.
**Doc-sync audit (D-52):** API spec §3 (validation details, order of checks), Tech Design §6.4 (job description page, step indicator), roadmap (BE-7, FE-5, FE-6), plan (Day 15 items, tracker 🟡), README status, DEVLOG. No shared schema change. `.env.example`: no change.
**Issues / blockers:** none. Noted: on `llama3` the D-97 prompt gave 6 guardrail warnings and 5 changes for swe × frontend (13 changes and 0 warnings before D-97); one run, not investigated (Known Issue #10: `llama3` is not the quality reference).
**Exit check met?** Day 15 🟡: built and tested; "submitting a JD in the browser returns a TailorResult" not done yet. **Not committed** (D-71).
**Next session:** the browser check, then Day 16.

### 2026-11-15: Session 15, part 3 (security review before calling Claude; two spend limits added)
**Day:** 15
**Done**
- The user asked for a security review of the backend before it calls Claude, and said: **no more Claude API calls without asking first** (standing instruction; `apps/api/.env` is on `anthropic`, so `tailor:run`, `parse:pdf`, `llm:smoke` and the dev server would call Claude: use `LLM_PROVIDER=ollama` or `--edits`).
- **Review, in place and correct:** key only in the backend env, never logged, not in git history (only test placeholders); production refuses to start without it. Logs carry ids, sizes, timings and token counts, never content; access log without headers, query or body. Uploads: 5 MB, magic bytes, ≤ 5 pages, memory only. CORS allowlist, helmet, sanitized request id, 200 KB JSON limit. Per call: `max_tokens`, timeout, overall deadline, cancel on disconnect, refusal handled. Prompt injection: delimited data, no tools, schema-checked output, guardrails. `npm audit --omit=dev`: 0 vulnerabilities.
- **Gaps fixed, tests first:** service-wide AI limits (D-101: `llm/withUsageLimits.ts`, 8 tests, env vars, `.env.example`); resume text cap (D-102: shared schema, 2 tests + 1 integration test); the error handler adds `Retry-After` for a `RATE_LIMITED` raised outside the per-IP limiter; long waits shown in hours in the web copy.
- Tests: shared 69 → 71, api 391 → **402**, total **568**.

**Verified**
- `npm run check` ✅ (0 lint warnings, 568 tests). No model was called.
- Tried and dropped: `isEvalSupported: false` for pdf.js; the option does not exist in the pdf.js that `unpdf` 2.1.0 ships.

**Decisions:** D-101, D-102.
**Doc-sync audit (D-52):** API spec (intro, §3 field table, §5 `RATE_LIMITED`), Tech Design §7 (AI spend row, prompt injection row) and the env table, `.env.example`, DEVLOG. Known Issue #7 (`npm audit` in CI + Dependabot listed in §7 but not set up) is still open.
**Issues / blockers:** open for the user: Console spend limit, privacy wording, the D-101 numbers. Accepted and noted: the limits are in memory (per process, reset on restart); the JSON body is parsed (≤ 200 KB) before the rate limiter runs.
**Exit check met?** Day 15 🟡 (unchanged: the browser check is open). **Not committed** (D-71).
**Next session:** the browser check, then Day 16.

### 2026-11-15: Session 15, part 4 (Day 15 exit check by the user; temporary provider switch)
**Day:** 15
**Done**
- `apps/api/.env` switched back to `LLM_PROVIDER=ollama` at the user's request; dev servers started.
- **Day 15 exit check ✅ by the user:** upload → review → job description → tailor in the browser, with their own resume and a real posting, on local `llama3`; 200 in 40.1 s, the response visible in devtools.
- **What that run showed on `llama3`** (no resume content recorded here): every reworded bullet got an ending quoting a job requirement ("which demonstrates the ability to '…'"); the model listed the resume's skills as the job's keywords, so the score was 100 with nothing missing; numbers and tools were dropped from bullets; a generic summary with one phrase from the posting that the resume does not state; 0 guardrail warnings, because none of these is checked. Claude proposed three guardrails in code (see Next steps); the user has not answered yet.
- **Temporary provider switch (D-103)**, at the user's request, tests alongside: `llm/providerSwitch.ts`, `middleware/llmProvider.ts`, `createHealthRouter`, `LLM_PROVIDER_SWITCH` in `env.ts` and `.env.example`, shared `LlmProviderSchema` / `LLM_PROVIDER_HEADER` / `llmSwitch` on the health schema; web: `api/llmProvider.ts`, `features/dev/ProviderSwitch.tsx`, the header in `api/client.ts`, `ApiStatus` passes the health response to the layout.
- Tests: api 402 → **416**, web 95 → **101**, total **588**.

**Verified**
- `npm run check` ✅ (0 lint warnings, 588 tests).
- Running dev API with the switch on: health carries `llmSwitch` (`default: ollama`, both available); an unknown `X-LLM-Provider` → 400.
- Covered by tests with fake providers: the header routes tailor **and parse (multipart)** to the chosen provider; concurrent requests stay apart; switch off → header ignored and no `llmSwitch`; production refuses the flag.
- **Not verified:** a real Claude call through the switch (billed; the user's to make); the buttons in a real browser.

**Decisions:** D-103. Day 15 ✅.
**Doc-sync audit (D-52):** API spec §1 (health field, header), Tech Design env table, Dev Guide §6, `.env.example`, plan (Day 15 ✅ in the tracker, removal checkboxes on Days 24 and 25), DEVLOG. Shared schema change (health): spec updated in the same change.
**Issues / blockers:** none.
**Exit check met?** Day 15 ✅. **Not committed** (D-71).
**Next session:** see Next steps.

### 2026-11-15: Session 15, part 5 (tailoring quality enforced in code, D-104)
**Day:** 15 → 16 (before the result page)
**Done**
- The user ran the same resume through Claude from the browser with the provider switch (14.3 s, 0 warnings, keyword score 36 with a real missing list). Honest and clean, and light: headline, summary and bullet order changed, no bullet reworded, three typos left in. No resume content is recorded here.
- The user asked for the changes a principal engineer would make. Tests first, then (D-104): `keywordService.keywordsFoundIn`; `guardrailService` (`safeItemText`: dropped number, commentary; `safeHeadline`); `matchScoreBefore` in the shared schema and the service; the typo rule in `tailor.v2.ts`; the headline reason text in `tailorEdits.ts`.
- Tests: api 416 → **446**, total **618**.

**Verified**
- `npm run check` ✅ (0 lint warnings, 618 tests).
- Deliberate break (D-33): 7 breaks, each run separately (dropped-number rule off, commentary rule off, commentary rule ignoring the original, headline rule off, keyword filter off, before score missing, filter matching any word). All 7 failed at least one test.
- One real run on local `llama3` (swe × frontend, 33.8 s): 3 bullets with commentary rejected with a warning each; keywords 10, all from the posting, score 60 → 60. One form got through ("…, which shows strong communication skills"): pattern added, with a test for it and one for a legitimate "a report that shows…".
- **Not verified:** the new prompt rule and the new guardrails on Claude (the user will run it; no Claude call was made by Claude Code).

**Decisions:** D-104.
**Doc-sync audit (D-52):** API spec §3 (`matchScoreBefore`, keyword filter), Tech Design §5.2 type, §6.2 steps 2, 2a and 3, DEVLOG. Shared schema change (optional field): spec updated in the same change.
**Issues / blockers:** none.
**Exit check met?** n/a (between Day 15 ✅ and Day 16). **Not committed** (D-71).
**Next session:** the user's browser run, then Day 16.

### 2026-11-15: Session 15, close
**Day:** 15 ✅ → 16 next
**State at close**
- Pushed: `1160cc8` (Days 13–14), CI green. Uncommitted: Day 15 (tailor endpoint, job description page), D-101/D-102 (spend limits), D-103 (temporary provider switch), D-104 (quality rules in code), the docs for all of them. `npm run check` ✅, 618 tests.
- `apps/api/.env` (not in git): `LLM_PROVIDER=ollama`, `LLM_PROVIDER_SWITCH=true`, the Claude key in place. Dev servers stopped.
- Standing instruction from the user: **no Claude API call without asking first**.
- Waiting on the user: the browser run on the D-104 changes; whether to commit; ADR-015 and OD-10 confirmations; the security follow-ups (Console spend limit, privacy wording, D-101 numbers).
- The user noted the Claude Code usage allowance was running out quickly in this long session. Suggested: start each session fresh (this file carries the state) and use a smaller model for routine work.

**Decisions this session:** D-97 to D-104. ADR-016 (spend limits in the LLM layer), ADR-017 (quality rules enforced in code).
**Doc-sync audit (D-52), whole session:** DEVLOG, plan (Days 13–15 ✅, removal checkboxes on Days 24–25), API spec (§1 health, §3 tailor, §5 catalog, intro), Tech Design (§5.2, §6.2, §6.4, §7, env table), Dev Guide §6, roadmap (BE-7, FE-5, FE-6), ADRs 016–017, README status, `.env.example`. Known Issue #7 still open.
**Next session:** see Next action under Current Status.

### 2026-11-15: Session 16 (D-105 fixes, competitor research, Day 15 commit)
**Day:** 15 ✅ → 16
**Done**
- Dev servers started; the user ran their own resume on `llama3` through the browser (parse 42.5 s; tailor 56.5 s, 13 bullets "reworded", 0 warnings, keyword score 88 → 88, 8 of 24 model keywords dropped by the D-104 filter). No resume content is recorded here.
- Found in that response: "for this job." appended to every bullet (copied from the prompt's field description), every reason a copy of the bullet, most rewrites only punctuation/case. **D-105**, tests first (22 new, 18 red before the code): `tailor.v2.ts` (field descriptions, two rules), `guardrailService.ts` (job-mention rule for bullets/details and the summary), `tailorEdits.ts` (`usableReason`, `isCorrection`, `bulletsCorrected`).
- Explained the API flow (routes → controllers → services → LLM layer) to the user.
- Research on nextraise.ai for after the MVP (D-106): `research/nextraise-ai.md`.
- Tests: api 446 → **468**, total **640**.

**Verified**
- `npm run check` ✅ (0 lint warnings, 640 tests).
- Replay of saved runs through the new code (no model call): Claude, six pairs, 45 reworded bullets, 45 reasons, 6 summaries → no change; `llama3`, six pairs → the same 17 of 31 rejections as before, all by D-104 rules.
- Deliberate break (D-33): 5 breaks (job rule for bullets, for the summary, reason check, correction label, 30-word cap). All 5 failed at least one test.
- A browser console error "Cannot read properties of undefined (reading 'M_ID')" came from a Chrome extension (`chrome-extension://…/executors/200.js`), not from our code.
- **Not verified:** the new prompt wording on a live model (`llama3` or Claude). The D-104 browser check on Claude (typos, false warnings) is still not reported.

**Decisions:** D-105, D-106.
**Doc-sync audit (D-52):** Tech Design §6.2 (step 3 job-mention rule, step 4b reasons and corrections), API spec §3 (`changes[].reason`), ADR-017 (extension note), DEVLOG (decisions, Parking Lot), `research/` (new). No shared schema change; `.env.example` unchanged; README unchanged (no test counts in it).
**Issues / blockers:** none.
**Exit check met?** n/a (Day 15 ✅, Day 16 not started).
**Next session:** Day 16, result page.

### 2026-11-16: Session 17 (Day 16: Result page)
**Day:** 16 ✅
**Done**
- [FE-7] `pages/ResultPage.tsx`: job header ("Tailored for <title> at <company>", top requirements, "Change job description"), warnings banner, tailored preview (`ResumeView`), side panel with accessible tabs (`features/result/ResultTabs.tsx`).
- `features/result/changeGroups.ts` (group by section, find an item's text by id, score delta), `ChangeList.tsx` (type, before → after, reason; a reorder shows the moved item), `KeywordPanel.tsx` (score /100 with "up from N", matched and missing chips, "Add it on the review page" → `/review`).
- Tests first: 8 helper tests, 17 page tests (14 red before the code). Web 101 → **126**, total **665**.
- Explained the whole tailoring pipeline to the user (request → one AI call for edits → keyword filter → apply edits → guardrails → keyword score → change list → result page).

**Verified**
- `npm run check` ✅ (0 lint warnings, 665 tests).
- Deliberate break (D-33): 8 breaks, each run separately (empty sections kept, no reorder text, score delta reversed, matched keywords shown as missing, preview dropping jobs, no arrow keys, only the first warning, reason hidden). The first round missed "matched shown as missing"; the test was tightened and now fails on it. All 8 fail at least one test.
- Dev servers started; health OK on `llama3`.
- **Not verified:** the Day 16 exit check in the browser (the user chose to push first; it moves to the Day 17 full manual run).

**Discussed**
- The tailored resume is the left preview; a download comes on Days 18–19. Proposed a preview title and highlighted reworded bullets (Parking Lot, not answered).

**Decisions:** D-107.
**Doc-sync audit (D-52):** Tech Design §6.4 (result page), plan (Day 16 ticked, tracker, Day 15 note), README status, DEVLOG (status, D-107, Parking Lot). No shared schema or API change, so the API spec and `.env.example` are unchanged.
**Issues / blockers:** none.
**Exit check met?** Not yet in the browser (moved to Day 17's manual run); all tests and breaks pass.
**Next session:** Day 17, full manual run.

### 2026-11-16: Session 17, part 2 (Day 17: Milestone 1.3 demo, security review)
**Day:** 17 ✅
**Done**
- Full manual run through the real API on `llama3` (no Claude call): the 3 fixture PDFs × the 3 fixture postings. 3/3 parsed (7.6–14.8 s), 9/9 tailored (8.1–18.6 s), all HTTP 200, schema-valid.
- Finding: 8 of 9 tailorings had 0 changes. Checked `llama3`'s raw answer with a throwaway script (deleted, not committed): every rewrite added commentary and summaries named keywords the resume lacks; the guardrails rejected exactly those (no false positive). Known Issue #10 updated.
- **Bug fixed (Day 16 page):** with 0 changes the Changes tab said "your resume already fits this job well" even when the edits were rejected. Now it says the suggested edits did not pass our checks when there are warnings. Test first (red, then green); deliberate break fails it.
- Security review of the API and the frontend (D-108): added the CI audit step and Dependabot (Known Issue #7 resolved), made the footer say the resume goes to an AI provider. Checked: no secrets in git, `.env`/`dist` ignored, `npm audit --omit=dev` 0 vulnerabilities, PDF library = pdf.js 6.4 serverless build without `eval`.
- Tests: web 126 → **127**, total **666**.

**Verified**
- `npm run check` ✅ (0 lint warnings, 666 tests). `npm audit --omit=dev --audit-level=high` exit 0.
- **Not verified:** the user's click-through in the browser (upload → result); the CI audit step and Dependabot run only on GitHub after the push.

**Decisions:** D-108.
**Doc-sync audit (D-52):** Tech Design §6.4 (no-changes wording) and §7 (data retention, dependency risk), plan (Day 17 ticked, tracker, privacy-note wording on Day 20), DEVLOG (status, D-108, Known Issues #7 and #10). No schema or API change: API spec and `.env.example` unchanged. README status line (Day 17, Milestone 1.3).
**Issues / blockers:** none blocking. `llama3` output quality (Known Issue #10) is accepted for development.
**Exit check met?** Yes: no known blocking bugs. Open: the user's browser click-through.
**Next session:** tailoring quality pass, then Day 18.

### 2026-11-16: Session 17, part 3 (tailoring quality eval)
**Day:** between 17 ✅ and 18
**Done**
- Day 17 committed and pushed (`db101fe`); CI green, including the new "Audit production dependencies" step. Dependabot's first run succeeded.
- `tailor:eval` built (D-109): `src/eval/tailorEval.ts` (pairs, warning rules, counts, summary, table, log row), `scripts/tailor-eval.ts` (CLI: `--log`, `--replay`, `--provider`), `CORRECTION_REASON` exported from `tailorEdits.ts`, `.eval-runs/` git-ignored, `docs/quality-log.md` created.
- Tests: 25 new (api 468 → **492**, total **690**). One test was wrong at first (it counted job bullets only; the fixture also has project bullets) and was fixed.
- **Baseline on `llama3`** (logged): 6/6 ran, 6 of 48 bullets reworded, 0 typo fixes, summaries 3/6, score avg 22 → 22, titles 5/6, companies 1/6, 19 warnings (commentary 15, missingKeyword 4), avg 22 s.

**Verified**
- `npm run check` ✅ (0 lint warnings, 690 tests).
- Replay of the saved baseline gives the same counts with no model call; a wrong replay path stops with a clear error (first version resolved the path from the repo root and found nothing; fixed).
- Deliberate break (D-33): 6 breaks (commentary rule gone, typo fixes counted as rewrites, one failure stopping the run, failed pairs in the totals, any company counted as found, answers not saved). The first round missed "any company counts as found"; the test now also checks a wrong company. All 6 fail at least one test.

**Decisions:** D-109.
**Doc-sync audit (D-52):** Dev Guide (scripts), README (scripts table), CLAUDE.md docs map (`docs/quality-log.md`), DEVLOG (status, D-109). No schema or API change; `.env.example` unchanged.
**Issues / blockers:** none.
**Next session:** first quality change (commentary), then Day 18.

<!--
TEMPLATE FOR NEW ENTRIES (copy below the last entry):

### YYYY-MM-DD: Session N (Day X: <focus>)
**Day:** X
**Done**
- [task id] what was completed
**Discussed**
- key points
**Decisions:** D-n (add rows to the Decision Log)
**Issues / blockers**
- ...
**Exit check met?** yes / no (why)
**Next session:** Day Y, first task
-->
