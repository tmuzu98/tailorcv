/* eslint-disable no-console -- CLI output */
/**
 * Runs PDFs through the real parse pipeline (validation → LLM → post-processing) with the
 * configured LLM_PROVIDER, and scores the synthetic fixtures against their expected content.
 *
 *   npm run parse:pdf -w @tailorcv/api                      # the 3 resume fixtures + invoice
 *   npm run parse:pdf -w @tailorcv/api -- ~/my-resume.pdf   # your own PDF (summary)
 *   npm run parse:pdf -w @tailorcv/api -- ~/my-resume.pdf --json   # full JSON
 *
 * Runs locally only; prints to your terminal and stores nothing. Never run in CI.
 */
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import type { Resume } from "@tailorcv/shared";
import { loadEnv } from "../src/config/env";
import { isAppError } from "../src/lib/errors";
import { createLogger } from "../src/lib/logger";
import { createLlmClient } from "../src/llm";
import { createResumeParserService } from "../src/services/resumeParserService";
import { validatePdf } from "../src/services/pdfValidationService";
import { EXPECTED, scoreParse } from "../tests/fixtures/pdfs/expected";
import { PDF_FIXTURES_DIR } from "../tests/helpers/fixtures";

const args = process.argv.slice(2);
const json = args.includes("--json");
const fileArgs = args.filter((a) => a !== "--json");
// npm runs workspace scripts in apps/api; resolve user paths against where npm was invoked.
const baseDir = process.env.INIT_CWD ?? process.cwd();
const files =
  fileArgs.length > 0
    ? fileArgs.map((f) => resolve(baseDir, f.replace(/^~(?=$|\/)/, process.env.HOME ?? "~")))
    : ["resume-1page.pdf", "resume-2page.pdf", "resume-2column.pdf", "invoice.pdf"].map((f) =>
        resolve(PDF_FIXTURES_DIR, f),
      );

const env = loadEnv();
const logger = createLogger({ NODE_ENV: "development", LOG_LEVEL: "warn" });
const parser = createResumeParserService({ llm: createLlmClient(env, logger), logger });
const model = env.LLM_PROVIDER === "ollama" ? env.OLLAMA_MODEL : env.ANTHROPIC_MODEL;
console.log(`Provider: ${env.LLM_PROVIDER} (${model})\n`);

function summary(r: Resume): string {
  const b = r.basics;
  return [
    `  name: ${b.fullName} · headline: ${b.headline ?? "—"} · email: ${b.email ?? "—"} · phone: ${b.phone ?? "—"} · location: ${b.location ?? "—"} · links: ${b.links.length}`,
    ...r.experience.map(
      (e) =>
        `  job: ${e.title} @ ${e.company} (${e.startDate ?? "?"}–${e.endDate ?? "?"}) · ${e.bullets.length} bullets`,
    ),
    ...r.education.map((e) =>
      `  education: ${e.degree ?? ""} ${e.field ?? ""} @ ${e.institution}`.replace(/\s+/g, " "),
    ),
    `  skills: ${r.skills.map((g) => `${g.category}: ${g.items.join(", ")}`).join(" | ") || "—"}`,
    `  projects: ${r.projects.length} · certifications: ${r.certifications.length} · other sections: ${r.additionalSections.length}`,
  ].join("\n");
}

let failures = 0;
for (const file of files) {
  const name = basename(file);
  process.stdout.write(`━━ ${name}\n`);
  try {
    const bytes = new Uint8Array(readFileSync(file));
    const { pages } = await validatePdf(bytes);
    const { resume, meta } = await parser.parse(bytes, { pages });
    console.log(
      `  parsed in ${(meta.durationMs / 1000).toFixed(1)} s · ${pages} page(s) · ${meta.promptVersion}`,
    );
    console.log(summary(resume));
    if (json) console.log(JSON.stringify(resume, null, 2));
    const expected = EXPECTED[name];
    if (expected) {
      const checks = scoreParse(resume, expected);
      const passed = checks.filter((c) => c.ok).length;
      for (const c of checks)
        console.log(`  ${c.ok ? "✅" : "❌"} ${c.check}${c.detail ? `  (${c.detail})` : ""}`);
      console.log(`  ACCURACY: ${passed}/${checks.length}`);
      if (passed < checks.length) failures++;
    }
    if (name === "invoice.pdf") {
      console.log("  ❌ expected RESUME_NOT_DETECTED, but it was parsed as a resume");
      failures++;
    }
  } catch (err) {
    const code = isAppError(err) ? err.code : "ERROR";
    if (name === "invoice.pdf" && code === "RESUME_NOT_DETECTED") {
      console.log("  ✅ RESUME_NOT_DETECTED (correct: an invoice is not a resume)");
    } else {
      console.log(`  ❌ ${code}: ${isAppError(err) ? err.message : String(err)}`);
      failures++;
    }
  }
  console.log();
}
process.exit(failures > 0 ? 1 : 0);
