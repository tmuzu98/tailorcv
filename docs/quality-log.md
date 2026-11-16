# Tailoring quality log

One row per `npm run tailor:eval -w @tailorcv/api -- --log "<note>"` run over the 6 synthetic
fixture pairs. Counts only: never resume, job description or model text. "Bullets reworded"
counts real rewrites that passed the guardrails; typo fixes are counted apart. Warnings are
the guardrails' rejections, by rule (`src/eval/tailorEval.ts`).

| Date | Prompt | Model | Ran | Bullets reworded | Typo fixes | Summaries | Score before → after (avg) | Titles / companies found | Warnings (by rule) | Avg time | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-11-16 | tailor-v2 | llama3 | 6/6 | 6/48 | 0 | 3/6 | 22 → 22 | 5/6 · 1/6 | 19 (commentary 15, missingKeyword 4) | 22 s | baseline (Day 17) |
| 2026-11-16 | tailor-v2 | llama3 (replay) | 6/6 | 1/48 | 1 | 3/6 | 22 → 22 | 5/6 · 1/6 | 4 (missingKeyword 4) | 0 s | D-110 filler cut + model notes removed (replay of the baseline answers; baseline's 6 rewrites were mostly original + filler/note) |
| 2026-11-16 | tailor-v2 | llama3 | 6/6 | 1/48 | 1 | 3/6 | 22 → 22 | 5/6 · 1/6 | 4 (missingKeyword 4) | 24 s | D-110 fresh run |
| 2026-11-16 | tailor-v3 | llama3 (replay) | 6/6 | 14/48 | 0 | 4/6 | 19 → 23 | 6/6 · 0/6 | 13 (missingKeyword 10, droppedNumber 3) | 0 s | tailor-v3 trial, NOT kept: 14/48 reworded but most add claims the resume lacks (patient-facing, design system, stakeholder management); guardrails miss them |
