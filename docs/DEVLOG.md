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
| Last updated | 2026-11-06 |
| Phase | Phase 1 (MVP), Milestone 1.2 (upload & parse) |
| Current day (per `07-daily-development-plan.md`) | **Day 7 ✅ complete (pushed)**. Next = **Day 8** (started in the same session) |
| Branch | `main` → in sync with `origin/main` |
| Remote | https://github.com/tmuzu98/tailorcv (**private**) |
| Last commit | `docs: log Day 7 push` (pushed). Day 7 code commit `53c4694` (pushed) |
| Build / CI | `npm run check` ✅ locally (lint, format, typecheck, **209 tests**: shared 53, web 5, api 151). **GitHub CI ✅ green on Day 7** (run 42304423698) |
| Deployed URLs | — (deploy deferred to Day 24, D-45) |
| Local dev | `npm run dev` from the repo root → API :4000 + Web :5173. **AI: local Ollama** (`LLM_PROVIDER=ollama`, `llama3`); switch with one line in `apps/api/.env` |

**Next action:** Day 8: AI resume parsing (`PARSE_PROMPT_V1` + `resumeParserService`), developed against local Ollama (and `FakeLlmClient` in tests).

**Blockers:** none. **Before Day 24:** OD-10 (choose the hosted LLM provider and get a key).

---

## ❓ Open Decisions (resolve, then move to the Decision Log)

| # | Question | Proposed default | Needed by |
|---|---|---|---|
| OD-10 | **Which hosted LLM provider for production, and getting its key/credit?** Local development uses Ollama for free (D-68), but Render can't run a local model. Options: Claude API credit (planned, ADR-008), or another hosted provider. Also decide whether to set a spend limit and which model/effort fits the budget. Re-check the prompts on the chosen provider before launch | Claude API (Opus 5.5; ~\$0.05–0.25 per parse/tailor, roughly \$5–20 for the rest of development if used) | **Day 24** (earlier if we want real Claude output for prompt tuning) |
| OD-6 | Optional anonymous analytics in MVP? | No | Day 20 |

_Resolved on Day 1: OD-1 → D-6, OD-2 → D-9, OD-3 → D-7, OD-5 → D-8, OD-7 → D-17. Resolved on Day 3: OD-8 → D-34, OD-9 → D-35. Day 7: OD-4 (API key by Day 7) → replaced by OD-10 after D-68._

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

---

## 🅿️ Parking Lot (ideas that came up, not in the current scope)

- ESLint import-order plugin (e.g. `eslint-plugin-import-x` or `simple-import-sort`). Deferred on Day 1 (D-13).
- Frontend "warm-up" ping to `/api/v1/health` on page load to hide Render free-tier cold starts (ADR-009). Do it on Day 10 or Day 24.
- Shared rate-limit store (e.g. Redis) if the API ever runs on more than one instance (ADR-010).
- If Vercel preview deploys need to call the API: add a preview-URL regex to the CORS allowlist (rejected for now, D-46).
- Overall deadline for LLM calls: `LLM_TIMEOUT_MS` is per attempt and the SDK also retries timeouts, so a worst case is ~3 × 90 s. Consider an `AbortSignal` with a total budget, or `maxRetries: 1` for timeouts (D-65). Decide before Day 15 (tailor endpoint + progress UI).

---

## 🐞 Known Issues / Tech Debt

| # | Severity | Description | Found | Status |
|---|---|---|---|---|
| 1 | Low (dev-only) | `npm audit`: 13 moderate, all from `minimatch` ReDoS (GHSA-g3hv-75wg-m249) inside ESLint / typescript-eslint deps. The only "fix" is a breaking downgrade | Day 1 | Accepted (D-15). **Rechecked Day 3: unchanged** (still 13 moderate, same root). Recheck when ESLint updates |
| 2 | Info | `npm run typecheck` errors with "No workspaces found" until workspaces exist | Day 1 | ✅ Resolved Day 2 |
| 3 | Low | npm 11 warns on every install about blocked install scripts (`esbuild`, `fsevents`). Harmless noise (D-21) | Day 2 | Accepted. If needed: `npm install-scripts approve <pkg>` or `deny <pkg>` to silence |
| 4 | Medium (process) | **npm quirk:** `npm install <pkgs> --workspace=<path>` sometimes installs but **doesn't save runtime deps** to the workspace `package.json` on the first run (happened 3× on Day 2; dev deps were fine). Also, installing a local workspace package by name (`@tailorcv/shared`) fails because it isn't on the registry | Day 2 | Workaround: **always check the workspace `package.json` after installing**, and re-run if missing. Add local packages by hand as `"@tailorcv/shared": "*"` then `npm install` |
| 5 | Info | Web production bundle is 403 KB (124 KB gzipped), mostly React + zod | Day 2 | Revisit on Day 20 (perf/a11y pass) |
| 6 | Resolved | `git push` failed: "Invalid username or token. Password authentication is not supported". Cause: git used an old macOS Keychain credential, and the `gh` token lacked the `workflow` scope needed for `.github/workflows/` files | Day 3 | ✅ Fixed (D-36). If it recurs on a new machine: `gh auth setup-git` + `gh auth refresh -h github.com -s workflow` |
| 7 | Low (doc drift) | Tech Design §7 lists "`npm audit` in CI, Dependabot" as a control, but neither is set up (CI has no audit step, no `dependabot.yml`). Found in the Day 5 doc audit | Day 5 | Open. Decide: add a Dependabot config + a non-blocking `npm audit --omit=dev` CI step (fits Day 21–24), or remove it from the design |
| 8 | Medium (quality, dev only) | **Local `llama3` 8B extraction quality** (real `OllamaLlmClient` run on the 3 fixture PDFs with `ResumeSchema`, before any real prompt): schema-valid and names/companies/titles/dates/bullet counts/education correct (incl. the 2-column PDF), **but the email was dropped in all 3, and skills came back as empty groups in 2 of 3**; earlier probe invented skill categories. 11–20 s per resume | Day 7 | Open → Day 8: write the parse prompt with explicit field rules, add post-processing (drop empty groups) and fixture-based quality checks (email present, skills non-empty, bullets verbatim). Consider trying a newer 8–14B local model (user's choice, a few GB). Final quality must be checked on the production provider (OD-10) |

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
