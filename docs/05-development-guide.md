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
- **Errors:** throw `AppError` with a catalog code. Never send ad-hoc error JSON.
- **Logging:** use `req.log` / `logger`. **Never log resume content, JD text, or file buffers.**
- **Frontend:** feature folders (`features/<name>`). Server calls go only through `api/` hooks. UI primitives live in `components/ui`.
- **Naming:** `camelCase` for variables and functions, `PascalCase` for components and types, `kebab-case` for folders, `*.schema.ts` for zod schemas, `*.test.ts(x)` next to the code or in `tests/`.
- **Prompts** are versioned constants. Changing a prompt means bumping its version and noting it in the PR.

## 5. Git workflow

- `main` is always deployable and protected (CI must pass).
- Branches: `feat/<task-id>-short-desc`, `fix/…`, `chore/…`, `docs/…` (e.g. `feat/BE-5-parse-endpoint`).
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat(api): add parse endpoint`).
- One roadmap task per PR when possible. The PR description links the task ID and includes screenshots for UI changes.
- Squash-merge.

## 6. Testing rules

- CI **never** calls the real Claude API. Tests use `FakeLlmClient` with fixture responses.
- Every service gets unit tests. Every route gets an integration test (Supertest).
- Guardrail and keyword logic must have ≥ 90% branch coverage. These are the safety-critical parts.
- Fixtures are synthetic. **Never commit a real person's resume.**

## 7. Environment files

- `apps/api/.env.example` is committed. `.env` is git-ignored.
- `apps/web/.env.example` is committed (only `VITE_*` vars, which are public by design: never put secrets there).

## 8. Adding a new feature (checklist)

1. Add or update the requirement in the PRD (or the roadmap backlog).
2. Update the shared schema if the API contract changes, and update the API spec doc.
3. Backend service + route + tests.
4. Frontend feature folder + tests.
5. Update the docs and the ADR log if an architectural decision was made.
