# 05 — Development Guide

How to set up, build, and contribute to the project. Sections marked *(after Phase 0)* apply once scaffolding is done.

---

## 1. Prerequisites

| Tool | Version |
|---|---|
| Node.js | 24.x LTS (`.nvmrc`) |
| npm | 11.x |
| Git | any recent |
| Anthropic API key | from the Claude Console. Needed for real AI calls |

## 2. First-time setup *(after Phase 0)*

```bash
git clone <repo-url> resumeParser && cd resumeParser
npm install                       # installs all workspaces
cp apps/api/.env.example apps/api/.env
# edit apps/api/.env → set ANTHROPIC_API_KEY
npm run dev                       # api on :4000, web on :5173
```

## 3. Scripts (root)

| Script | Does |
|---|---|
| `npm run dev` | Runs api + web in watch mode |
| `npm run build` | Builds shared → api → web |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run typecheck` | `tsc --noEmit` in all workspaces |
| `npm test` | Vitest in all workspaces |
| `npm run test:e2e` | Playwright (starts the apps in test mode with the fake LLM) |
| `npm run eval` | Runs the AI eval set against the **real** API. Costs money, run it by hand |

## 4. Coding conventions

- **TypeScript strict** everywhere. No `any` without an explaining comment.
- **Schemas first.** Any new API field starts as a change in `packages/shared`.
- **Backend layering:** `routes → controllers → services → llm/lib`. Controllers handle HTTP only. Services contain the logic and never touch `req`/`res`.
- **Errors:** `throw new AppError("CODE", { message?, details?, cause? })` with a catalog code (`lib/errors.ts`). Never send ad-hoc error JSON; the central `errorHandler` formats everything. `message` and `details` reach the user, so keep them safe and free of resume/JD content. A new error code goes into shared `ERROR_CODES` **and** `ERROR_CATALOG` (the compiler enforces this) **and** API spec §5.
- **Logging:** use `req.log` / `logger`. **Never log resume content, JD text, or file buffers.** The access log is automatic and minimal (id, method, path, status, time). Don't widen its serializers. If you log an object, log counts/sizes/ids, not content.
- **Frontend:** feature folders (`features/<name>`). Server calls go only through `api/` hooks. UI primitives live in `components/ui`.
- **Naming:** `camelCase` for variables and functions, `PascalCase` for components and types, `kebab-case` for folders, `*.schema.ts` for zod schemas, `*.test.ts(x)` next to the code or in `tests/`.
- **Prompts** are versioned constants in `apps/api/src/llm/prompts/<name>.v<N>.ts`, **together with their LLM output schema**. Changing either means bumping the version (e.g. `parse-v2`) and noting it in the PR. The version is logged with every call and returned in `meta.promptVersion`.

## 5. Git workflow

- `main` is always deployable. Branch protection is **not** enabled (private repo on the Free plan, D-35). The safety net is `npm run check` before every commit + CI on every push.
- Branches: `feat/<task-id>-short-desc`, `fix/…`, `chore/…`, `docs/…` (e.g. `feat/BE-5-parse-endpoint`).
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat(api): add parse endpoint`).
- One roadmap task per PR when possible. The PR description links the task ID and includes screenshots for UI changes.
- Squash-merge.

## 6. Testing rules

- CI **never** calls the real Claude API. Tests use `FakeLlmClient` (`apps/api/src/llm/FakeLlmClient.ts`): `new FakeLlmClient().enqueue({ data }, { error: new AppError("AI_TIMEOUT") })`. Queued data is validated against the caller's schema, so stale fixtures fail. Services take an `LlmClient`, never the SDK.
- **Switching LLM providers:** one line in `apps/api/.env`: `LLM_PROVIDER=ollama` (local, free; default in development) or `LLM_PROVIDER=anthropic` (needs `ANTHROPIC_API_KEY`). Restart the API. The startup log names the provider and model. Never branch on the provider in services; add providers as new `LlmClient` classes and a case in `createLlmClient()`.
- **LLM provider boundary (D-69):** only `apps/api/src/llm/` may import an LLM SDK or a concrete client (ESLint `no-restricted-imports` fails the build otherwise). Services build requests with the neutral types from `llm/LlmClient.ts`: content is a string or parts `{ type: "text", text }` / `{ type: "pdf", data }`, never SDK-shaped blocks.
- **Switching providers** (e.g. Ollama → Claude before deploy): set `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` in `apps/api/.env`, restart, run `npm run llm:smoke`. **No code changes.** Then re-check prompt quality on the new provider (ADR-012).
- **Adding a provider** (e.g. another hosted API): (1) new class in `src/llm/` implementing `LlmClient`, translating the neutral content and using `parseStructuredText` for validation; (2) env vars + a value in the `LLM_PROVIDER` enum; (3) a case in `createLlmClient()`; (4) a harness in `tests/contract/llmClient.contract.test.ts` and make it pass (same error codes, retry rule, no content in logs); (5) docs + `.env.example`. Nothing outside `src/llm/` changes.
- **Parse quality check:** `npm run parse:pdf -w @tailorcv/api` runs the 3 resume fixtures + the invoice through the real pipeline with the selected provider and scores them against `tests/fixtures/pdfs/expected.ts` (incl. "invented" checks). Add `-- ~/path/resume.pdf [--json]` to try your own PDF (local only, nothing stored). Record accuracy in the DEVLOG after prompt changes.
- To check the selected provider/model: `npm run llm:smoke -w @tailorcv/api` (one tiny call, reads `apps/api/.env`). Never in tests or CI.
- Every service gets unit tests. Every route gets an integration test (Supertest).
- API integration tests build the app with `buildTestApp(envOverrides)` (`apps/api/tests/helpers/app.ts`): silent logger, test env. To test middleware in isolation, mount it on a small `express()` app with `requestId()` + `errorHandler()`.
- After writing tests, break the code once on purpose to prove they fail (D-33).
- Guardrail and keyword logic must have ≥ 90% branch coverage. These are the safety-critical parts.
- Fixtures are synthetic. **Never commit a real person's resume.**
- PDF fixtures live in `apps/api/tests/fixtures/pdfs/` and are generated by `generate.ts` (`npm run fixtures:pdfs -w @tailorcv/api`). The output is deterministic and committed. To add a case, extend the script, regenerate, and add the name to `PdfFixture` in `tests/helpers/fixtures.ts`.

## 7. Environment files

- `apps/api/.env.example` is committed. `.env` is git-ignored.
- `apps/web/.env.example` is committed (only `VITE_*` vars, which are public by design: never put secrets there).

## 8. Adding a new feature (checklist)

1. Add or update the requirement in the PRD (or the roadmap backlog).
2. Update the shared schema if the API contract changes, and update the API spec doc.
3. Backend service + route + tests.
4. Frontend feature folder + tests.
5. Update the docs and the ADR log if an architectural decision was made.
