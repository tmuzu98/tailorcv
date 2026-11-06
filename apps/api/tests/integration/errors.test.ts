import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { ApiErrorResponseSchema } from "@tailorcv/shared";
import { AppError } from "../../src/lib/errors";
import { errorHandler, notFoundHandler } from "../../src/middleware/errorHandler";
import { requestId } from "../../src/middleware/requestId";
import { buildTestApp } from "../helpers/app";

/** Minimal app with a route that throws whatever we hand it. */
function appThrowing(error: unknown) {
  const app = express();
  app.use(requestId());
  app.get("/boom", () => {
    throw error;
  });
  app.get("/async-boom", async () => {
    await Promise.resolve();
    throw error;
  });
  app.use(notFoundHandler());
  app.use(errorHandler());
  return app;
}

describe("404 handler", () => {
  const app = buildTestApp();

  it("returns NOT_FOUND in the standard error shape for unknown API routes", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");

    expect(res.status).toBe(404);
    const body = ApiErrorResponseSchema.parse(res.body);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.requestId).toBe(res.headers["x-request-id"]);
  });

  it("also covers paths outside the API prefix", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("errorHandler", () => {
  it("formats a thrown AppError with its status, message and details", async () => {
    const err = new AppError("PDF_TOO_MANY_PAGES", {
      message: "Your resume has 7 pages.",
      details: { pages: 7, maxPages: 5 },
    });
    const res = await request(appThrowing(err)).get("/boom");

    expect(res.status).toBe(422);
    const body = ApiErrorResponseSchema.parse(res.body);
    expect(body.error).toMatchObject({
      code: "PDF_TOO_MANY_PAGES",
      message: "Your resume has 7 pages.",
      details: { pages: 7, maxPages: 5 },
    });
    expect(body.error.requestId).toMatch(/^req_[0-9a-f]{32}$/);
  });

  it("handles errors thrown from async handlers (Express 5)", async () => {
    const res = await request(appThrowing(new AppError("AI_TIMEOUT"))).get("/async-boom");
    expect(res.status).toBe(504);
    expect(res.body.error.code).toBe("AI_TIMEOUT");
  });

  it("turns unknown errors into INTERNAL_ERROR without leaking the message or stack", async () => {
    const res = await request(appThrowing(new Error("db password is hunter2"))).get("/boom");

    expect(res.status).toBe(500);
    const body = ApiErrorResponseSchema.parse(res.body);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(res.body)).not.toContain("hunter2");
    expect(body.error.details).toBeUndefined();
  });

  it("treats a third-party error with a 4xx status (e.g. an upstream SDK 401) as INTERNAL_ERROR", async () => {
    const upstream = Object.assign(new Error("invalid x-api-key"), { status: 401 });
    const res = await request(appThrowing(upstream)).get("/boom");

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(res.body)).not.toContain("x-api-key");
  });

  it("handles non-Error throwables", async () => {
    const res = await request(appThrowing("just a string")).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
  });
});

describe("JSON body errors", () => {
  const app = buildTestApp();

  it("rejects a body over 200 KB with PAYLOAD_TOO_LARGE", async () => {
    const res = await request(app)
      .post("/api/v1/anything")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ text: "x".repeat(210 * 1024) }));

    expect(res.status).toBe(413);
    expect(ApiErrorResponseSchema.parse(res.body).error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it.each([
    ["an unsupported charset", { "Content-Type": "application/json; charset=latin1" }, '{"a":1}'],
    [
      "an unsupported Content-Encoding",
      { "Content-Type": "application/json", "Content-Encoding": "zstd-fake" },
      '{"a":1}',
    ],
    [
      "a corrupt gzip body",
      { "Content-Type": "application/json", "Content-Encoding": "gzip" },
      "not gzip",
    ],
  ])("rejects %s with a 4xx VALIDATION_ERROR, not a 500", async (_name, headers, payload) => {
    const res = await request(app).post("/api/v1/anything").set(headers).send(payload);

    expect(res.status).toBe(400);
    expect(ApiErrorResponseSchema.parse(res.body).error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects malformed JSON with VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/v1/anything")
      .set("Content-Type", "application/json")
      .send('{"broken": ');

    expect(res.status).toBe(400);
    expect(ApiErrorResponseSchema.parse(res.body).error.code).toBe("VALIDATION_ERROR");
  });
});
