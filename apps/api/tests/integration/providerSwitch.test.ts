import { pino } from "pino";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { HealthResponseSchema, LLM_PROVIDER_HEADER } from "@tailorcv/shared";
import { jdFrontendEngineer, sampleResumeSwe } from "@tailorcv/shared/fixtures";
import { parseEnv } from "../../src/config/env";
import { FakeLlmClient } from "../../src/llm/FakeLlmClient";
import type { ParseLlmOutput } from "../../src/llm/prompts/parse.v1";
import type { TailorLlmOutput } from "../../src/llm/prompts/tailor.v2";
import { SwitchableLlmClient } from "../../src/llm/providerSwitch";
import { buildTestApp } from "../helpers/app";
import { pdfFixturePath } from "../helpers/fixtures";

const TAILOR = "/api/v1/resumes/tailor";
const PARSE = "/api/v1/resumes/parse";
const HEALTH = "/api/v1/health";
const body = { resume: sampleResumeSwe, jobDescription: jdFrontendEngineer };

const TAILOR_OUTPUT: TailorLlmOutput = {
  jobSummary: { title: "Senior Frontend Engineer", topRequirements: ["React"] },
  keywords: ["React"],
  summary: "Frontend engineer with 6 years of experience.",
  bullets: [],
  removedBulletIds: [],
};
const PARSE_OUTPUT: ParseLlmOutput = {
  isResume: true,
  basics: { fullName: "Alex Example", links: [] },
  experience: [{ company: "Acme", title: "Engineer", bullets: ["Built things."] }],
  education: [],
  skills: [{ category: "Skills", items: ["TypeScript"] }],
  projects: [],
  certifications: [],
  additionalSections: [],
};
/** Answers both prompts, so one fake can stand in for a provider on either endpoint. */
const provider = () =>
  new FakeLlmClient((p) => (p.promptVersion.startsWith("parse") ? PARSE_OUTPUT : TAILOR_OUTPUT));

function switchedApp(env: NodeJS.ProcessEnv = {}) {
  const anthropic = provider();
  const ollama = provider();
  const llm = new SwitchableLlmClient({ anthropic, ollama }, "ollama", pino({ level: "silent" }));
  const app = buildTestApp(
    { LLM_PROVIDER_SWITCH: "true", RATE_LIMIT_TAILOR_PER_HOUR: "1000", ...env },
    { llm },
  );
  return { app, anthropic, ollama };
}

describe("development provider switch (D-103, temporary)", () => {
  describe("switch ON (LLM_PROVIDER_SWITCH=true)", () => {
    it("without the header the configured provider is used", async () => {
      const { app, anthropic, ollama } = switchedApp();
      expect((await request(app).post(TAILOR).send(body)).status).toBe(200);
      expect(ollama.calls).toHaveLength(1);
      expect(anthropic.calls).toHaveLength(0);
    });

    it("tailor: the header chooses the provider for that request only", async () => {
      const { app, anthropic, ollama } = switchedApp();
      const chosen = await request(app)
        .post(TAILOR)
        .set(LLM_PROVIDER_HEADER, "anthropic")
        .send(body);
      expect(chosen.status).toBe(200);
      expect(anthropic.calls).toHaveLength(1);
      expect(ollama.calls).toHaveLength(0);

      await request(app).post(TAILOR).send(body);
      expect(ollama.calls).toHaveLength(1);
      expect(anthropic.calls).toHaveLength(1);
    });

    it("parse (multipart upload): the header chooses the provider too", async () => {
      const { app, anthropic, ollama } = switchedApp();
      const res = await request(app)
        .post(PARSE)
        .set(LLM_PROVIDER_HEADER, "anthropic")
        .attach("file", pdfFixturePath("resume-1page.pdf"));
      expect(res.status).toBe(200);
      expect(anthropic.calls).toHaveLength(1);
      expect(ollama.calls).toHaveLength(0);
    });

    it("an unknown provider in the header → 400 VALIDATION_ERROR, no AI call", async () => {
      const { app, anthropic, ollama } = switchedApp();
      const res = await request(app).post(TAILOR).set(LLM_PROVIDER_HEADER, "openai").send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(anthropic.calls.length + ollama.calls.length).toBe(0);
    });

    it("health tells the web app the switch is on, the default, and what can be chosen", async () => {
      const withKey = switchedApp({ ANTHROPIC_API_KEY: "sk-ant-x" });
      const health = HealthResponseSchema.parse((await request(withKey.app).get(HEALTH)).body);
      expect(health.llmSwitch).toEqual({ default: "ollama", available: ["anthropic", "ollama"] });

      const res = await request(switchedApp().app).get(HEALTH);
      expect(res.body.llmSwitch).toEqual({ default: "ollama", available: ["ollama"] });
      expect(JSON.stringify(res.body)).not.toContain("sk-ant");
    });
  });

  describe("switch OFF (the default, and always in production)", () => {
    it("the header is ignored: the injected client is used as is", async () => {
      const anthropic = provider();
      const ollama = provider();
      const llm = new SwitchableLlmClient(
        { anthropic, ollama },
        "ollama",
        pino({ level: "silent" }),
      );
      const app = buildTestApp({}, { llm });
      const res = await request(app).post(TAILOR).set(LLM_PROVIDER_HEADER, "anthropic").send(body);
      expect(res.status).toBe(200);
      expect(anthropic.calls).toHaveLength(0);
      expect(ollama.calls).toHaveLength(1);
    });

    it("health does not mention the switch", async () => {
      const res = await request(buildTestApp()).get(HEALTH);
      expect(res.body).not.toHaveProperty("llmSwitch");
    });

    it("production refuses to start with the switch on", () => {
      const production = { NODE_ENV: "production", ANTHROPIC_API_KEY: "sk-ant-x" };
      expect(() => parseEnv({ ...production, LLM_PROVIDER_SWITCH: "true" })).toThrow(
        /local development only/,
      );
      expect(parseEnv(production).LLM_PROVIDER_SWITCH).toBe(false);
      expect(parseEnv({}).LLM_PROVIDER_SWITCH).toBe(false);
      expect(() => parseEnv({ LLM_PROVIDER_SWITCH: "yes" })).toThrow();
    });
  });
});
