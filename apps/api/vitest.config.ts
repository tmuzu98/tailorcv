import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "api",
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    env: { NODE_ENV: "test" },
    // Enabled by `npm test` (--coverage). Only the files with a coverage target are measured,
    // and the run fails below the target (guardrails: Day 12 exit check, >= 90% branches).
    coverage: {
      provider: "v8",
      include: [
        "src/services/guardrailService.ts",
        "src/services/keywordService.ts",
        "src/services/resumeText.ts",
        "src/services/tailorEdits.ts",
        "src/services/jobTailorService.ts",
      ],
      reporter: ["text"],
      thresholds: { branches: 90, functions: 90, lines: 90, statements: 90 },
    },
  },
});
