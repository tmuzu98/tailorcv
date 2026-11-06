# TailorCV (working name)

Upload a PDF resume, paste a job description, and get back an honest, ATS-friendly resume tailored to that job.

**Stack:** React 19 + Vite + Tailwind (frontend) · Node.js 24 + Express 5 (backend) · TypeScript + zod (shared) · Claude API (AI)

> 🚧 **Status:** Week 1 done. Phase 0 (skeleton, tests, CI) and Milestone 1.1 (shared schemas, error contract, security middleware) complete. Next: PDF upload & parsing (Week 2). Progress: [`docs/DEVLOG.md`](docs/DEVLOG.md).

## Quickstart

**Prerequisites:** Node.js 24 (`nvm use` reads `.nvmrc`) and npm 11.

```bash
git clone https://github.com/tmuzu98/tailorcv.git
cd tailorcv
npm install
cp apps/api/.env.example apps/api/.env   # optional: defaults work for local development
npm run dev
```

- Web: http://localhost:5173 (the footer should show **"API: ok"**)
- API: http://localhost:4000/api/v1/health

**AI provider (local development):** the app uses a local model through [Ollama](https://ollama.com) by default (`LLM_PROVIDER=ollama`): free and private. Install Ollama, run `ollama pull llama3`, then check it with `npm run llm:smoke -w @tailorcv/api`. To use Claude instead, set `LLM_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` in `apps/api/.env`. Production always uses a hosted provider.

## Scripts (run from the repo root)

| Command                           | What it does                                                            |
| --------------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                     | Starts the API (:4000) and the web app (:5173) together                 |
| `npm test`                        | Runs all test suites (Vitest)                                           |
| `npm run check`                   | Lint + format check + typecheck + tests. **Run this before committing** |
| `npm run build`                   | Production builds (`apps/api/dist`, `apps/web/dist`)                    |
| `npm run lint` / `npm run format` | ESLint / Prettier (write)                                               |

## Project layout

```
apps/api         Express 5 API (tsx in dev, tsup build)
apps/web         React + Vite frontend
packages/shared  zod schemas + types shared by both apps
docs/            Requirements, design, API spec, plans, DEVLOG
```

## Documentation

1. [Product Requirements](docs/01-product-requirements.md)
2. [Technical Design](docs/02-technical-design.md)
3. [API Specification](docs/03-api-specification.md)
4. [Implementation Roadmap](docs/04-implementation-roadmap.md)
5. [Development Guide](docs/05-development-guide.md)
6. [Architecture Decisions](docs/06-architecture-decisions.md)
7. [Daily Development Plan](docs/07-daily-development-plan.md)
8. [DEVLOG](docs/DEVLOG.md): running journal of sessions and decisions
