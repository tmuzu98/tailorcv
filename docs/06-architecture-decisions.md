# 06 — Architecture Decision Records (ADR log)

Short records of significant decisions. Add new ones at the bottom. Never edit an accepted ADR: supersede it with a new one.

Format: **Context → Decision → Consequences** · Status: Proposed / Accepted / Superseded

---

## ADR-001: TypeScript across frontend, backend, and shared code
**Status:** Accepted (2026-11-03, Day 1)
**Context:** The team wants a JavaScript-focused stack. The frontend and backend exchange a fairly complex nested resume structure.
**Decision:** Use TypeScript (strict) in all workspaces, with shared zod schemas in `packages/shared`.
**Consequences:** Type errors at compile time when the contract drifts, and better editor autocomplete. Small build-config overhead. Plain JS is still possible if the team prefers it, at the cost of losing the compile-time contract checks.

## ADR-002: Express 5 for the API
**Status:** Proposed
**Context:** The options were Express, Fastify, NestJS, and Hono. The MVP has a handful of endpoints and multipart upload.
**Decision:** Express 5. It is familiar, handles async errors natively, and multer is a mature upload option.
**Consequences:** Less built-in structure than NestJS, so layering is enforced by convention (routes/controllers/services). Fastify would be faster, but speed isn't the bottleneck here: AI latency is.

## ADR-003: Send the PDF directly to Claude instead of extracting text locally
**Status:** Proposed
**Context:** Local text extraction (pdf-parse/pdfjs) loses layout. Two-column resumes get scrambled, and scanned PDFs return no text, which would require a separate OCR step.
**Decision:** Send the PDF as a base64 `document` block to Claude with a structured-output schema. Use `unpdf` locally only for cheap validation (page count, encryption).
**Consequences:** Much more robust parsing, and scanned PDFs work. Costs more tokens per parse than sending plain text, which the 5-page limit offsets. Parse results are reused across many tailor calls.

## ADR-004: Client-side PDF generation with @react-pdf/renderer
**Status:** Proposed
**Context:** The options were server-side Puppeteer (heavy, needs Chromium), pdfmake, and @react-pdf/renderer.
**Decision:** Use @react-pdf/renderer in the browser. Templates are React components that take a `Resume`.
**Consequences:** No server cost for export, and the output is a real text PDF that ATS software can read. The HTML preview and PDF template are separate components that must be kept visually aligned. It can move to the server later (react-pdf runs in Node) if needed.

## ADR-005: Two-step API (parse → tailor) instead of a single endpoint
**Status:** Proposed
**Context:** A single "upload + JD → result" call is simpler, but it is slow, can't be reviewed partway through, and repeats parsing for every JD.
**Decision:** Separate `/resumes/parse` and `/resumes/tailor` endpoints. The client holds the parsed resume.
**Consequences:** Better UX and lower cost for repeat tailoring. Prepares for saved base resumes in Phase 3. The client must send the resume JSON on each tailor call, which is fine at ≤ 200 KB.

## ADR-006: Honesty guardrails enforced in code, not just in prompts
**Status:** Proposed
**Context:** LLMs can embellish. A fabricated credential on a resume harms the user.
**Decision:** The schema marks locked fields. A deterministic `guardrailService` restores locked fields, strips new skills or entries, and reports warnings. All changes are shown to the user.
**Consequences:** Some valid rewordings may be flagged as false positives (shown as warnings, not silently dropped). This adds a small amount of server code, and the trust it builds justifies that.

## ADR-007: Stateless MVP (no database, no auth)
**Status:** Proposed
**Context:** Persistence adds auth, privacy obligations, and infrastructure.
**Decision:** The MVP keeps everything in client memory or sessionStorage. The server persists nothing.
**Consequences:** Fastest path to launch and the simplest privacy story. Users lose their work if they close the tab. Phase 3 adds Postgres + auth.

## ADR-008: Claude Opus 5.5 as the LLM, configurable by env var
**Status:** Accepted (2026-11-06, Day 7: implemented in `AnthropicLlmClient`; `.parse()` replaced by `create()` + own validation, see ADR-011)
**Context:** We need high writing quality, native PDF reading, and schema-constrained JSON output.
**Decision:** Use `claude-opus-5-5` through `@anthropic-ai/sdk` with `messages.parse()` + `zodOutputFormat`, adaptive thinking, an explicit `effort` per route, and the server-side refusal fallback enabled. The model is set by `ANTHROPIC_MODEL`.
**Consequences:** The best quality by default. If cost becomes a concern, the evals (AI-5) give the data to compare lower effort levels or a cheaper model before switching.

## ADR-009: Hosting on Vercel (frontend) + Render free tier (API)
**Status:** Accepted (2026-11-03, Day 1)
**Context:** The goal is $0 hosting for the MVP. The API needs a long-running Node server (AI calls take 30–60 s) and accepts 5 MB uploads. That rules out Vercel serverless functions (about 4.5 MB body limit) and Cloudflare Workers (not a full Node runtime).
**Decision:** Host the React static build on Vercel Hobby and the Express API on a Render free web service.
**Consequences:** No code changes are needed and both deploy on git push. Render's free tier sleeps after about 15 min idle, so the first request takes roughly 30–60 s. To soften that, the frontend pings `/api/v1/health` when the page loads. Vercel Hobby is for non-commercial use only. **Revisit before monetizing:** move to Cloudflare Pages or Vercel Pro, and pay about $7/month for Render to remove the sleep. Free-tier limits must be re-verified at deploy time (Day 5 / Day 24).

## ADR-010: One error contract and a fixed middleware pipeline in the API
**Status:** Accepted (2026-11-05, Day 5)
**Context:** Every endpoint must fail in the same, documented shape (API spec §4) so the frontend can handle errors generically. Logs must help debugging without ever containing resume content, JD text or credentials. The API is public and every AI call costs money.
**Decision:** Code throws `AppError(code)`. The status and default message come from `ERROR_CATALOG`, which is typed `Record<ErrorCode, …>` against the shared `ERROR_CODES`. One central `errorHandler` turns every error into `{ error: { code, message, requestId, details? } }`. Unknown errors become `INTERNAL_ERROR` with a generic message, and the real error goes to the log only. `createApp({ env, logger })` receives its dependencies and applies the middleware in a fixed order: requestId → pino-http access log (minimal serializers + redaction) → helmet → CORS (exact allowlist from env) → `express.json` (200 KB) → routes → 404 → errorHandler. Per-IP rate limiters (express-rate-limit, in-memory store) are applied per route family (parse, tailor), not globally.
**Consequences:** A new error code can't ship without a status and message, because the build fails. Handlers stay small: they just throw. Tests can build an app with any env. The in-memory rate-limit store only works for a single instance (Render free). Scaling out would need a shared store such as Redis. Vercel preview deploys can't call the API unless their URL is added to `CORS_ORIGIN`.

## ADR-011: LLM access through an `LlmClient` interface with our own validation
**Status:** Accepted (2026-11-06, Day 7)
**Context:** Parsing and tailoring both need schema-valid JSON from Claude. Tests and CI must never call the real API. Failures (timeouts, overload, refusals, truncation, schema drift, bad config) must reach users as the right error codes, and no prompt/resume content may be logged.
**Decision:** Services depend only on `LlmClient.generateStructured({ promptVersion, system, content, schema, effort, maxTokens })`. `AnthropicLlmClient` calls `client.beta.messages.create()` (structured output from `betaZodOutputFormat`, adaptive thinking, explicit effort, cached system prompt, `fallbacks: "default"`), checks `stop_reason` first, then validates the text with the zod schema itself, retrying once on invalid JSON/schema mismatch. SDK errors are mapped most-specific-first (timeout → `AI_TIMEOUT`; connection/429/5xx → `AI_PROVIDER_ERROR`; other 4xx → `INTERNAL_ERROR`). `FakeLlmClient` serves tests; `createLlmClient(env, logger)` builds the real one (or a failing stub when the key is missing in development).
**Consequences:** Swapping models, adding streaming or another provider touches one class. Tests are deterministic and free. We own the validation step instead of `.parse()`, so a future SDK change to `.parse()` doesn't affect us, but we must keep `betaZodOutputFormat` (which also strips unsupported constraints) in the loop; `outputFormat.test.ts` checks its exact output. The app is wired to the client on Day 9 (dependency injection into `createApp`).

## ADR-012: Local Ollama model for development, hosted provider for production
**Status:** Accepted (2026-11-06, Day 7). Amends ADR-008: Claude remains the planned production model, but the final hosted provider is confirmed before deploying (OD-10)
**Context:** Calling the Claude API costs money per request, and the user doesn't want to pay during local development. Ollama (0.40.14) with `llama3` 8B is already installed on the dev machine (M3 Pro, 18 GB). A first test produced schema-valid, mostly faithful `Resume` JSON from a fixture PDF in ~20 s.
**Decision:** Add `OllamaLlmClient` behind the existing `LlmClient` interface and a single switch, `LLM_PROVIDER` (`ollama` | `anthropic`), read only by `createLlmClient()`. Default: `ollama` outside production, `anthropic` in production; **production refuses `ollama`** at startup. PDFs are converted to text for Ollama; otherwise the contract (structured output, own validation, retry once, error codes, content-free logs) is identical.
**Consequences:** Development is free and private, and switching is a one-line config change with no code edits. Local output is weaker (no PDF layout, more embellishment), so prompts tuned on Ollama must be re-checked on the production provider before launch, and the evals (Day 22) should run on it. The Anthropic client stays built and tested (fake API) but hasn't made a real call yet. Before Day 24 we must pick the hosted provider and get a key (OD-10).

## ADR-013: Enforced, provider-neutral LLM boundary
**Status:** Accepted (2026-11-06, Day 7)
**Context:** We develop on local Ollama and plan to deploy on a hosted provider (ADR-012, OD-10). The switch must cost no code changes. An audit found one leak: `LlmContent` was typed with the Claude SDK's content blocks, so services would have built Claude-shaped requests and the Ollama client had to understand Claude's format. Nothing prevented new leaks, and nothing proved the clients behave the same.
**Decision:** (1) `llm/LlmClient.ts` holds provider-neutral types only: content is a string or `{ type: "text" }` / `{ type: "pdf", data }` parts, and each client translates them (Claude: native base64 `document` block before the text; Ollama: extracted text). (2) ESLint `no-restricted-imports` forbids `@anthropic-ai/sdk` (and `openai`/`ollama` SDKs) and concrete client modules everywhere except `apps/api/src/llm/` and tests. (3) `tests/contract/llmClient.contract.test.ts` runs 10 scenarios (valid, retry, give-up, truncation, provider failure, misconfiguration, timeout, unreachable, PDF content, no content in logs) against every client via local fake APIs and requires identical outcomes.
**Consequences:** Switching providers is config only (`LLM_PROVIDER`); adding one is a new class plus a contract harness. Provider-specific strengths (Claude's native PDF layout, caching, fallback) stay inside each client. A capability only one provider has (e.g. images) must be added to the neutral types deliberately, with a defined behaviour for providers that lack it.
