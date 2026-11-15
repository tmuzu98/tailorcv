import { pino } from "pino";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  ApiErrorResponseSchema,
  JOB_DESCRIPTION_MAX_CHARS,
  JOB_DESCRIPTION_MIN_CHARS,
  RESUME_MAX_TEXT_CHARS,
  TailorResponseSchema,
  type ErrorCode,
} from "@tailorcv/shared";
import { jdFrontendEngineer, sampleResumeSwe } from "@tailorcv/shared/fixtures";
import { AppError } from "../../src/lib/errors";
import { FakeLlmClient } from "../../src/llm/FakeLlmClient";
import { TAILOR_PROMPT_VERSION, type TailorLlmOutput } from "../../src/llm/prompts/tailor.v2";
import { withUsageLimits } from "../../src/llm/withUsageLimits";
import { buildTestApp } from "../helpers/app";

const TAILOR = "/api/v1/resumes/tailor";

function expectError(res: request.Response, status: number, code: ErrorCode) {
  expect(res.status).toBe(status);
  const body = ApiErrorResponseSchema.parse(res.body);
  expect(body.error.code).toBe(code);
  expect(body.error.requestId).toBe(res.headers["x-request-id"]);
  return body.error;
}

/** An honest model answer for the fixture resume and the frontend JD. */
const MODEL_OUTPUT: TailorLlmOutput = {
  jobSummary: {
    title: "Senior Frontend Engineer",
    company: "Northwind Health",
    seniority: "Senior",
    topRequirements: ["React", "TypeScript"],
  },
  keywords: ["React", "TypeScript", "GraphQL"],
  headline: "Senior Frontend Engineer",
  summary:
    "Frontend engineer with 6 years of experience building React and TypeScript applications.",
  bullets: [
    {
      id: "exp_1_b5",
      text: "Improved frontend performance, raising the Lighthouse score from 54 to 91.",
      reason: "The role asks for frontend performance work.",
    },
  ],
  removedBulletIds: [],
};
const fakeLlm = () => new FakeLlmClient(() => MODEL_OUTPUT);
const validBody = { resume: sampleResumeSwe, jobDescription: jdFrontendEngineer };

describe("POST /api/v1/resumes/tailor", () => {
  // High limit so these tests never trip the rate limiter.
  const llm = fakeLlm();
  const app = buildTestApp({ RATE_LIMIT_TAILOR_PER_HOUR: "1000" }, { llm });
  const post = (body: unknown) =>
    request(app)
      .post(TAILOR)
      .send(body as object);

  describe("happy path", () => {
    it("returns 200 with a contract-valid TailorResponse", async () => {
      const res = await post(validBody);
      expect(res.status).toBe(200);
      const body = TailorResponseSchema.parse(res.body);
      expect(body.meta).toEqual({
        durationMs: expect.any(Number),
        promptVersion: TAILOR_PROMPT_VERSION,
      });
      expect(body.jobSummary.title).toBe("Senior Frontend Engineer");
      expect(body.keywordAnalysis.missing).toContain("GraphQL");
    });

    it("applies the model's edits to the submitted resume", async () => {
      const body = TailorResponseSchema.parse((await post(validBody)).body);
      const first = body.tailoredResume.experience[0];
      expect(first?.bullets[0]).toEqual({
        id: "exp_1_b5",
        text: "Improved frontend performance, raising the Lighthouse score from 54 to 91.",
      });
      expect(body.changes).toContainEqual(
        expect.objectContaining({ targetId: "exp_1_b5", type: "reworded" }),
      );
      // Locked fields come from the request, not from the model.
      expect(body.tailoredResume.basics.fullName).toBe(sampleResumeSwe.basics.fullName);
      expect(first?.company).toBe(sampleResumeSwe.experience[0]?.company);
    });

    it("accepts a tone and trims the job description", async () => {
      const res = await post({
        ...validBody,
        jobDescription: `\n\n  ${jdFrontendEngineer}  \n`,
        options: { tone: "concise" },
      });
      expect(res.status).toBe(200);
    });

    it("answers with JSON and a request id", async () => {
      const res = await post(validBody);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.headers["x-request-id"]).toBeTruthy();
    });
  });

  describe("validation errors → 400 VALIDATION_ERROR with the failing fields", () => {
    const fieldPaths = (error: { details?: Record<string, unknown> | undefined }) =>
      (error.details?.fields as { path: string; message: string }[]).map((field) => field.path);

    it("job description too short", async () => {
      const res = await post({ ...validBody, jobDescription: "x".repeat(99) });
      const error = expectError(res, 400, "VALIDATION_ERROR");
      expect(error.details?.fields).toEqual([
        {
          path: "jobDescription",
          message: `Job description must be at least ${JOB_DESCRIPTION_MIN_CHARS} characters`,
        },
      ]);
    });

    it("job description too long", async () => {
      const res = await post({
        ...validBody,
        jobDescription: "x".repeat(JOB_DESCRIPTION_MAX_CHARS + 1),
      });
      expect(fieldPaths(expectError(res, 400, "VALIDATION_ERROR"))).toEqual(["jobDescription"]);
    });

    it("job description that is only whitespace counts as too short", async () => {
      const res = await post({ ...validBody, jobDescription: " ".repeat(500) });
      expect(fieldPaths(expectError(res, 400, "VALIDATION_ERROR"))).toEqual(["jobDescription"]);
    });

    it("missing resume and job description", async () => {
      const error = expectError(await post({}), 400, "VALIDATION_ERROR");
      expect(fieldPaths(error).sort()).toEqual(["jobDescription", "resume"]);
    });

    it("no body at all", async () => {
      expectError(await request(app).post(TAILOR), 400, "VALIDATION_ERROR");
    });

    it("a resume that does not match the schema names the field, not its content", async () => {
      const resume = { ...sampleResumeSwe, basics: { ...sampleResumeSwe.basics, fullName: 42 } };
      const res = await post({ ...validBody, resume });
      const error = expectError(res, 400, "VALIDATION_ERROR");
      expect(fieldPaths(error)).toEqual(["resume.basics.fullName"]);
      expect(JSON.stringify(res.body)).not.toContain(sampleResumeSwe.basics.email);
    });

    it("duplicate item ids in the resume (D-85)", async () => {
      const [first, ...rest] = sampleResumeSwe.experience;
      const resume = { ...sampleResumeSwe, experience: [first, { ...first }, ...rest] };
      const error = expectError(await post({ ...validBody, resume }), 400, "VALIDATION_ERROR");
      expect(fieldPaths(error)).toEqual(["resume"]);
    });

    it("a resume with too much text is refused before the AI is called", async () => {
      const [first, ...rest] = sampleResumeSwe.experience;
      const resume = {
        ...sampleResumeSwe,
        experience: [
          { ...first, bullets: [{ id: "exp_1_pad", text: "x".repeat(RESUME_MAX_TEXT_CHARS) }] },
          ...rest,
        ],
      };
      const quiet = fakeLlm();
      const res = await request(buildTestApp({}, { llm: quiet }))
        .post(TAILOR)
        .send({ ...validBody, resume });
      const error = expectError(res, 400, "VALIDATION_ERROR");
      expect(error.details?.fields).toEqual([
        {
          path: "resume",
          message: `Resume is too long: at most ${RESUME_MAX_TEXT_CHARS} characters of text`,
        },
      ]);
      expect(quiet.calls).toHaveLength(0);
    });

    it("unknown tone", async () => {
      const res = await post({ ...validBody, options: { tone: "funny" } });
      expect(fieldPaths(expectError(res, 400, "VALIDATION_ERROR"))).toEqual(["options.tone"]);
    });

    it("lists at most 10 fields", async () => {
      const experience = sampleResumeSwe.experience.map((job) => ({
        ...job,
        bullets: Array.from({ length: 12 }, (_, i) => ({ id: `${job.id}_x${i}`, text: 7 })),
      }));
      const res = await post({ ...validBody, resume: { ...sampleResumeSwe, experience } });
      expect(fieldPaths(expectError(res, 400, "VALIDATION_ERROR"))).toHaveLength(10);
    });

    it("a multipart body (wrong content type) is a validation error", async () => {
      const res = await request(app).post(TAILOR).field("jobDescription", jdFrontendEngineer);
      expectError(res, 400, "VALIDATION_ERROR");
    });

    it("malformed JSON", async () => {
      const res = await request(app)
        .post(TAILOR)
        .set("Content-Type", "application/json")
        .send('{"resume": ');
      expectError(res, 400, "VALIDATION_ERROR");
    });

    it("does not call the AI for invalid requests", async () => {
      const quiet = fakeLlm();
      const quietApp = buildTestApp({}, { llm: quiet });
      await request(quietApp).post(TAILOR).send({});
      await request(quietApp)
        .post(TAILOR)
        .send({ ...validBody, jobDescription: "short" });
      expect(quiet.calls).toHaveLength(0);
    });
  });

  it("a body over 200 KB → 413 PAYLOAD_TOO_LARGE", async () => {
    const res = await post({ ...validBody, jobDescription: "x".repeat(210 * 1024) });
    expectError(res, 413, "PAYLOAD_TOO_LARGE");
  });

  it("GET is not allowed → 404 NOT_FOUND", async () => {
    expectError(await request(app).get(TAILOR), 404, "NOT_FOUND");
  });

  it("calls the model once, with the tailor prompt", async () => {
    const counted = fakeLlm();
    await request(buildTestApp({}, { llm: counted }))
      .post(TAILOR)
      .send(validBody);
    expect(counted.calls).toEqual([
      expect.objectContaining({ promptVersion: TAILOR_PROMPT_VERSION, content: "text" }),
    ]);
  });
});

describe("POST /api/v1/resumes/tailor: AI errors reach the client with the right code", () => {
  it.each<[string, AppError, number, ErrorCode]>([
    ["timeout", new AppError("AI_TIMEOUT"), 504, "AI_TIMEOUT"],
    ["provider down", new AppError("AI_PROVIDER_ERROR"), 502, "AI_PROVIDER_ERROR"],
    ["invalid output", new AppError("AI_INVALID_OUTPUT"), 502, "AI_INVALID_OUTPUT"],
    ["misconfiguration", new AppError("INTERNAL_ERROR"), 500, "INTERNAL_ERROR"],
  ])("%s → %i %s", async (_name, error, status, code) => {
    const app = buildTestApp({}, { llm: new FakeLlmClient().enqueue({ error }) });
    expectError(await request(app).post(TAILOR).send(validBody), status, code);
  });

  it("a model answer that does not fit the schema → 502 AI_INVALID_OUTPUT", async () => {
    const llm = new FakeLlmClient().enqueue({ data: { nonsense: true } });
    const res = await request(buildTestApp({}, { llm })).post(TAILOR).send(validBody);
    expectError(res, 502, "AI_INVALID_OUTPUT");
  });
});

describe("tailor rate limit", () => {
  it("returns 429 after RATE_LIMIT_TAILOR_PER_HOUR requests, before validation or the AI", async () => {
    const llm = fakeLlm();
    const app = buildTestApp({ RATE_LIMIT_TAILOR_PER_HOUR: "2" }, { llm });
    expect((await request(app).post(TAILOR).send(validBody)).status).toBe(200);
    expect((await request(app).post(TAILOR).send({})).status).toBe(400);
    const res = await request(app).post(TAILOR).send(validBody);
    const error = expectError(res, 429, "RATE_LIMITED");
    expect(error.details).toEqual({ retryAfterSec: Number(res.headers["retry-after"]) });
    expect(llm.calls).toHaveLength(1);
  });

  it("the service-wide AI limit answers 429 with Retry-After, for every client (D-101)", async () => {
    const llm = withUsageLimits(
      fakeLlm(),
      { dailyCalls: 1, maxConcurrent: 5 },
      pino({ level: "silent" }),
    );
    const app = buildTestApp({ RATE_LIMIT_TAILOR_PER_HOUR: "1000" }, { llm });
    expect((await request(app).post(TAILOR).send(validBody)).status).toBe(200);
    const res = await request(app).post(TAILOR).send(validBody);
    const error = expectError(res, 429, "RATE_LIMITED");
    expect(error.message).toMatch(/limit for today/i);
    const retryAfter = Number(res.headers["retry-after"]);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(24 * 3600);
    expect(error.details).toEqual({ retryAfterSec: retryAfter });
  });

  it("is separate from the parse budget", async () => {
    const app = buildTestApp(
      { RATE_LIMIT_TAILOR_PER_HOUR: "1", RATE_LIMIT_PARSE_PER_HOUR: "1" },
      { llm: fakeLlm() },
    );
    expect((await request(app).post(TAILOR).send(validBody)).status).toBe(200);
    expect((await request(app).post(TAILOR).send(validBody)).status).toBe(429);
    // The parse limiter has not been used: the request gets past it (and fails on the missing file).
    expect((await request(app).post("/api/v1/resumes/parse")).status).toBe(400);
  });
});
