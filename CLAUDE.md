# CLAUDE.md

AI resume-tailoring web app ("TailorCV", working name): upload a PDF resume + paste a job description → honest, ATS-friendly tailored resume. React + Vite frontend, Node.js + Express backend, shared zod schemas, Claude API. We are **pair programming** this project.

## Session protocol (mandatory)

**At the start of every session:**

1. Read `docs/DEVLOG.md`: the Current Status, the Open Decisions, and the last Session Log entry.
2. Open `docs/07-daily-development-plan.md` at the current day and confirm today's goal with the user.

**During the session:** when a decision is made (by the user or agreed together), note it so it goes into the DEVLOG Decision Log. Put out-of-scope ideas in the Parking Lot. Don't start them.

**At the end of every session (or when the user says they're stopping):**

1. Append a Session Log entry to `docs/DEVLOG.md` using the template at the bottom of that file.
2. Overwrite the Current Status block (day, branch, last commit, next action, blockers).
3. Tick the completed checkboxes and update the progress tracker in `docs/07-daily-development-plan.md`.
4. Add an ADR to `docs/06-architecture-decisions.md` for architectural decisions.
5. **Doc-sync audit (D-52):** check every doc the session's changes touch (Tech Design, API spec, Dev Guide, ADRs, plan, README, `.env.example`) against the code and decisions. Fix any drift, and list what was fixed in the Session Log entry. Drift not covered by a decision goes to Known Issues.

## Docs map

- `docs/01-product-requirements.md`: scope and requirements
- `docs/02-technical-design.md`: architecture, schemas, AI pipeline
- `docs/03-api-specification.md`: API contracts and error codes
- `docs/04-implementation-roadmap.md`: task IDs (PLT-, SHR-, BE-, AI-, FE-, QA-)
- `docs/05-development-guide.md`: conventions and git workflow
- `docs/06-architecture-decisions.md`: ADRs
- `docs/07-daily-development-plan.md`: day-by-day plan
- `docs/DEVLOG.md`: running journal (source of truth for "where are we")

## Hard rules

- Tailor, never fabricate. Locked resume fields are enforced by `guardrailService`.
- Never log or commit real resume content, JD text, or secrets.
- Tests and CI never call the real Claude API (use `FakeLlmClient`).
- Schema changes start in `packages/shared`, and the API spec doc is updated in the same change.
- Commit or push only when the user asks.
