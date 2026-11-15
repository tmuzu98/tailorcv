# Research: NextRaise (nextraise.ai)

> **Knowledge only, not part of the project plan.** Written 2026-11-15 from NextRaise's public pages (home, job-tailored resumes, ATS checker, keyword scanner, privacy policy). Their numbers and claims are their own marketing and are not verified. Nothing here changes MVP scope. Ideas are for **after the MVP**, and anything adopted goes through the normal flow (DEVLOG Parking Lot → decision → ADR).

## 1. What NextRaise is

NextRaise is a whole job-search copilot. A resume tailor is only one part of it:

| Area                | What it does                                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Job matches         | Scores live listings (they claim 2M+) against your resume: skills %, experience %, title %. Sends alerts                                                                                  |
| ATS resume checker  | 27 checks, each scored /10, rolled into a score /100 with bands: <60 "likely filtered", 60–79, 80–89, 90+ "shortlist-ready". Each fix shows the points it adds; you apply it, then rescan |
| Job-tailored resume | Rewrites the summary, experience bullets and skills for one job description. Line-by-line approve / edit / undo. Match score before → after (they claim an average of 51 → 71)            |
| Keyword scanner     | Skills / experience / qualifications, "12 of 20 keywords found", top missing keywords, _where_ to add each one (after sign-in)                                                            |
| Outreach            | Find HR (recruiter emails), Insider Referrals, Super Apply (sends a note plus the resume from your Gmail after you review it)                                                             |
| Autofill            | Chrome extension for LinkedIn, Workday, Greenhouse, Lever and 80+ other sites                                                                                                             |
| Integrations        | MCP connector (ChatGPT, Claude, Cursor), job tracker                                                                                                                                      |
| Pricing             | Free tier: 1 tailored resume, 5 ATS checks, 3 one-click rewrites. Pro from $24.99, with metered credits. **Downloading a PDF requires Pro**                                               |
| Data                | Account and stored resumes. Uses OpenAI and Google Cloud. Non-Google data _"may be used to improve AI models"_. No stated retention period                                                |

## 2. Where we already stand apart (keep these)

| Ours                                                                                                                                                                   | Theirs                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **No account, nothing stored.** The resume is processed and dropped                                                                                                    | Account required; resumes stored, retention not stated, may train models |
| **Honesty enforced in code** (`guardrailService`: locked fields, new numbers and keywords, dropped numbers, commentary, job mentions), and the user sees every warning | Honesty is a promise ("using only what is true"); no visible enforcement |
| **A transparent score**: keywords taken from the job description only, matched/missing lists, before → after                                                           | Score formula not disclosed. Bands only                                  |
| **Free PDF export** (MVP)                                                                                                                                              | PDF export is behind Pro                                                 |
| Focused: one job, one honest resume                                                                                                                                    | Broad: jobs, outreach, autofill, credits                                 |

These are our positioning. Don't trade them away while adding features.

## 3. Gaps we could close after the MVP

Ranked by value for effort, and by how well each fits our honesty rule.

### High value, fits our architecture

1. **Resume quality checks (an "ATS check" without a job description).** Their 27-check list is a good inventory. Many of the checks can be **deterministic, with no LLM call**, which makes them cheap, testable and honest:
   - Writing: weak verbs, personal pronouns, filler and buzzwords, verb tense consistency, repetition, spelling.
   - Structure: standard section headings, dates present and consistent, contact details, length and page density, bullets with and without numbers ("quantify impact").
   - We already have parts of this: `guardrailService` has the commentary patterns, and the D-104 typo rule is in the prompt. A `resumeQualityService` could reuse them.
   - **Our angle:** explain the score formula openly. They don't.
2. **"Needs your input" fixes instead of invented numbers.** Their checker asks the user for real figures ("team size? time saved?") instead of inventing them. This is the honest answer to the question that came up today about missing keywords:
   - Turn a missing keyword or a bullet without a number into a **question**.
   - The user's answer becomes a user addition (Day 11 feature), and the next run uses it.
   - It extends the Day 16 idea: "Have this experience? Add it and run again."
3. **Per-change approve / edit / undo.** We list the changes; they let the user accept or reject each one before saving. Post-MVP, on the result page:
   - a toggle per change, applied on the client to the original resume;
   - no new AI call needed, because `describeChanges` already gives each change with its `targetId`, before and after.
4. **Where to add each missing keyword.** Beyond "missing", suggest the job or bullet where the user's experience is closest. Present it as a suggestion to confirm, never as an automatic insert.
5. **Score bands with plain-language meaning** ("fair / good / strong"). Our score is a bare number. Showing bands is cheap. Caveat: we must not claim to predict ATS filtering, which they do without evidence.
6. **DOCX input and DOCX export.** They accept PDF, DOCX and photos. Many recruiters and ATS forms ask for DOCX. DOCX _input_ also avoids PDF text-extraction problems.

### Medium value

7. **A sub-score breakdown** (skills / experience / qualifications, or required vs preferred). Our tailor prompt already returns `topRequirements`; we could split the keywords into required and preferred.
8. **Several job descriptions, one resume.** Keep the parsed resume on the client and tailor it for job B without uploading again. Fits "nothing stored" if it stays in the browser.
9. **Tailor history in the browser only** (localStorage, opt-in). A job tracker without accounts.
10. **Cover letter from the same facts**, guarded the same way (no new numbers or skills).

### Low value for us, or a mismatch with our principles (note, don't chase)

- **Super Apply, Find HR, recruiter email finding.** Needs Gmail OAuth, contact-data sourcing, deliverability work and legal care (anti-spam, GDPR). Far outside a resume tailor.
- **Job board aggregation and alerts.** Needs data licensing and scraping infrastructure.
- **Autofill extension.** A separate product to build and maintain.
- **Photo / scan OCR input.** Possible later. Their own page warns that scans may not be read.
- **An MCP connector.** Interesting for a later "API" phase. Our provider-neutral LLM layer doesn't block it.

## 4. Lessons for wording and trust

- They say "nothing changes until you approve" and "the submit button stays with you". Clear consent wording builds trust. Our footer still needs the privacy wording (open item: say the resume is sent to an AI provider and not stored).
- Their claims ("10x more callbacks", "likely filtered") are unbacked. We should only state what we measure, such as the before → after keyword score and the guardrail warnings.
- Their free tier gates the PDF behind payment. A free, honest PDF is a clear differentiator if we keep it.

## 5. Suggested post-MVP order (if adopted)

1. Score bands + the "needs your input" questions from missing keywords (small, honest, builds on Day 16).
2. Per-change accept / reject on the result page (client-only).
3. Deterministic resume quality checks with an open formula (`resumeQualityService`, no LLM).
4. DOCX export, then DOCX input.
5. Multi-job tailoring with browser-only history.

## Sources

- https://nextraise.ai (home, features, FAQ)
- https://nextraise.ai/tools/job-tailored-resumes
- https://nextraise.ai/tools/ats-resume-checker
- https://nextraise.ai/tools/resume-keyword-scanner
- https://nextraise.ai/privacy (last updated 2026-10-07)
- The pricing page did not render for fetching; the pricing details above come from the home page and the tool pages
