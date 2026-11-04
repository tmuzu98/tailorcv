# 01 — Product Requirements Document (PRD)

| Field | Value |
|---|---|
| Product (working name) | **TailorCV**: AI resume tailoring |
| Status | Draft v0.1 |
| Last updated | 2026-11-03 |
| Scope of this doc | Problem, users, MVP scope, later-phase features, non-functional requirements |

---

## 1. Problem statement

Job seekers are told to tailor their resume to every job they apply for, but doing it by hand is slow. You have to read the job description (JD), pick out the skills and keywords it asks for, reword your bullets to match, reorder the sections, and keep the result readable by Applicant Tracking Systems (ATS). Most people skip this step and send one generic resume everywhere, which gets fewer callbacks.

## 2. Product vision

> Upload your resume, paste a job description, and within about a minute get an honest, ATS-friendly resume that is tailored to that job and ready to download.

**Guiding principle: tailor, never fabricate.** The system may reword, reorder, emphasize, and condense content that is already in the resume. It must **never** invent employers, titles, dates, degrees, certifications, metrics, or skills the candidate did not provide.

## 3. Target users & personas

| Persona | Description | Key need |
|---|---|---|
| **Active job seeker** (primary) | Applies to 5–30 roles a week | Speed: a tailored resume in under 2 minutes |
| **Career switcher** | Moving to a new domain | Bring transferable skills to the front |
| **New graduate** | Limited experience | Get the most out of projects and coursework |
| **Recruiter / career coach** (later) | Prepares resumes for clients | Many versions, history, export formats |

## 4. Core user flow (MVP)

```
[Landing] → [Upload PDF resume] → [Review parsed resume (read-only in MVP)]
         → [Paste job description] → [Generate tailored resume]
         → [Preview + see what changed + keyword match] → [Download PDF]
```

## 5. MVP scope (Phase 1)

### 5.1 Functional requirements: MVP

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | User can upload **one** resume as a PDF (drag-and-drop or file picker) | Must |
| FR-2 | System validates the file: PDF only, ≤ 5 MB, ≤ 5 pages, not encrypted | Must |
| FR-3 | System extracts the resume into a **structured format** (contact, summary, experience, education, skills, projects, certifications) | Must |
| FR-4 | User sees the parsed result so they can confirm it was read correctly | Must |
| FR-5 | User can paste a job description into a text area (100–15,000 characters) | Must |
| FR-6 | System generates a tailored resume from the parsed resume and the JD | Must |
| FR-7 | Tailored resume keeps all factual fields (company, title, dates, degree, institution) **exactly** as in the original | Must |
| FR-8 | User sees a **preview** of the tailored resume in a clean, ATS-friendly template | Must |
| FR-9 | User sees a **change summary**: what changed and why (for example, "Reworded bullet to bring Kubernetes experience to the front") | Must |
| FR-10 | User sees a **keyword match**: JD keywords that are covered and ones that are missing | Should |
| FR-11 | User can **download** the tailored resume as a text-based PDF that ATS software can read | Must |
| FR-12 | Clear loading states and error messages (bad file, scanned image with no readable content, AI failure, timeout) | Must |
| FR-13 | User can start over, or re-tailor the same resume for a different JD without uploading it again | Should |

### 5.2 Explicitly out of scope for MVP

- User accounts, login, saved history
- Editing the resume inline (planned for Phase 2)
- Multiple templates (MVP ships **one** template)
- DOCX upload or export
- Cover letters
- Fetching the JD from a URL
- Payments

## 6. Post-MVP feature backlog (prioritized)

| Phase | Feature | Value |
|---|---|---|
| 2 | Inline editor for the parsed and tailored resume | Users fix parsing mistakes and fine-tune the output |
| 2 | Accept or reject individual AI changes (diff view) | Trust and control |
| 2 | Live progress updates (streaming) | Better perceived performance |
| 2 | 2–3 additional templates | Personal choice |
| 2 | DOCX export | Many job portals prefer Word files |
| 3 | Accounts (email, Google OAuth) | Persistence |
| 3 | Saved base resumes and a history of tailored versions per job | Reuse |
| 3 | Data deletion and export (GDPR-style controls) | Privacy compliance |
| 4 | Cover letter generator from the same inputs | Upsell |
| 4 | Import the JD from a URL | Convenience |
| 4 | ATS score and formatting checks | Insight |
| 4 | DOCX and LinkedIn-profile import | More ways to get a resume in |
| 4 | Usage plans and billing (Stripe) | Monetization |
| 5 | Multi-language resumes | Market expansion |

## 7. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Performance | Parse in ≤ 30 s p95. Tailor in ≤ 60 s p95. UI interactions under 100 ms |
| NFR-2 | Privacy | MVP stores **no** resume data. Files are processed in memory and thrown away after the response is sent. Resume content is never written to logs |
| NFR-3 | Security | OWASP Top-10 basics: input validation, size limits, rate limiting, security headers, API key only on the server |
| NFR-4 | Reliability | AI failures are retried with backoff, and the user gets an error they can act on, never a blank screen |
| NFR-5 | Cost | AI cost per full tailor run is tracked and logged (token usage). Target: under $0.25 per run in MVP |
| NFR-6 | Accessibility | WCAG 2.1 AA: keyboard navigation, labels, contrast |
| NFR-7 | Responsiveness | Works on desktop and on mobile screens 375 px wide or wider |
| NFR-8 | ATS compatibility | Exported PDF has selectable real text, a single column, standard section headings, and no text inside images |
| NFR-9 | Honesty | Automated guardrail checks flag any new skill, employer, or date that is not in the source resume |
| NFR-10 | Maintainability | TypeScript end to end, shared schemas, ≥ 70% unit test coverage on the core backend logic |

## 8. Success metrics

| Metric | MVP target |
|---|---|
| Upload → download completion rate | ≥ 60% of sessions that upload a file |
| Parse accuracy (manual review of 20 sample resumes) | ≥ 95% of fields correct |
| Fabrication rate (guardrail and manual review) | 0 fabricated facts in the evaluation set |
| Median time from JD submit to preview | ≤ 45 s |

## 9. Assumptions & open questions

| # | Item | Status |
|---|---|---|
| A1 | Users mostly have English-language, text-based PDFs | Assumption |
| A2 | Claude reads PDFs natively, including scanned or image PDFs, so we don't need a separate OCR step | Decided (see ADR-003) |
| Q1 | Product name and branding | Open |
| Q2 | Hosting budget and preferred cloud | Open; default plan uses Vercel + Render (see Tech Design §9) |
| Q3 | Should MVP offer optional anonymous analytics? | Open |
