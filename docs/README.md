# Documentation Index

Read the documents in order. Each one builds on the one before it.

| # | Document | Answers |
|---|---|---|
| 01 | [Product Requirements (PRD)](01-product-requirements.md) | *What* are we building, for whom, and what is in the MVP? |
| 02 | [Technical Design](02-technical-design.md) | *How* is it built? Stack, architecture, data model, AI pipeline, security |
| 03 | [API Specification](03-api-specification.md) | The exact request and response contracts and error codes |
| 04 | [Implementation Roadmap](04-implementation-roadmap.md) | *In what order* is it built, and how is the work divided (task IDs, estimates, dependencies) |
| 05 | [Development Guide](05-development-guide.md) | Setup, scripts, conventions, git workflow, testing rules |
| 06 | [Architecture Decisions (ADRs)](06-architecture-decisions.md) | *Why* each major choice was made |
| 07 | [Daily Development Plan](07-daily-development-plan.md) | *What do we do today?* 25 day-by-day goals to MVP |
| — | [DEVLOG](DEVLOG.md) | *Where are we?* Running journal of sessions, decisions and status |

## Status

| Phase | State |
|---|---|
| Planning & docs | ✅ Draft v0.1 complete |
| Phase 0: Foundation | ✅ Complete (Days 1–3) |
| Phase 1: MVP | 🟡 In progress (Day 4 ✅, Day 5 next) |
| Phase 2+ | ⬜ |

## Keeping docs alive

- When a task changes the API contract, update `03` in the same PR.
- When you make a non-obvious technical choice, add an ADR to `06`.
- When a phase finishes, update the status table above.
