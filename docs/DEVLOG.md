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
| Last updated | 2026-11-04 |
| Phase | Phase 1 (MVP), Milestone 1.1 (contracts & error foundation) |
| Current day (per `07-daily-development-plan.md`) | **Day 4 ✅ complete (local only)**. Next session = **Day 5** |
| Branch | `main` → in sync with `origin/main` |
| Remote | https://github.com/tmuzu98/tailorcv (**private**) |
| Last commit | `docs: log Day 4 push` (pushed). Day 4 code commit `433cb95` (pushed) |
| Build / CI | `npm run check` ✅ locally (lint, format, typecheck, **61 tests**: shared 53, web 5, api 3). Web build ✅. **CI ✅ green on Day 4** (run 41778035944) |
| Deployed URLs | — (optional on Day 5, otherwise Day 24) |
| Local dev | `npm run dev` from the repo root → API :4000 + Web :5173 |

**Next action:** Day 5: `AppError` + error catalog (HTTP status per `ERROR_CODES`), requestId, pino-http with redaction, central error handler + 404 (`NOT_FOUND`), helmet, CORS, JSON body limit, rate limiters. Optional: deploy the skeleton.

**Blockers:** none.

---

## ❓ Open Decisions (resolve, then move to the Decision Log)

| # | Question | Proposed default | Needed by |
|---|---|---|---|
| OD-4 | Anthropic API key available? | User provides it in `apps/api/.env` | Day 7 |
| OD-6 | Optional anonymous analytics in MVP? | No | Day 20 |

_Resolved on Day 1: OD-1 → D-6, OD-2 → D-9, OD-3 → D-7, OD-5 → D-8, OD-7 → D-17. Resolved on Day 3: OD-8 → D-34, OD-9 → D-35._

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

---

## 🅿️ Parking Lot (ideas that came up, not in the current scope)

- ESLint import-order plugin (e.g. `eslint-plugin-import-x` or `simple-import-sort`). Deferred on Day 1 (D-13).
- Frontend "warm-up" ping to `/api/v1/health` on page load to hide Render free-tier cold starts (ADR-009). Do it on Day 10 or Day 24.

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
