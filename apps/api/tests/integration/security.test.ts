import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { ApiErrorResponseSchema } from "@tailorcv/shared";
import { errorHandler } from "../../src/middleware/errorHandler";
import { createRateLimiter, createRateLimiters } from "../../src/middleware/rateLimit";
import { requestId } from "../../src/middleware/requestId";
import { buildTestApp } from "../helpers/app";

describe("request id", () => {
  const app = buildTestApp();

  it("generates an X-Request-Id when none is sent", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.headers["x-request-id"]).toMatch(/^req_[0-9a-f]{32}$/);
  });

  it("reuses a safe incoming X-Request-Id", async () => {
    const res = await request(app).get("/api/v1/health").set("X-Request-Id", "proxy-abc-12345");
    expect(res.headers["x-request-id"]).toBe("proxy-abc-12345");
  });

  it("replaces an unsafe incoming X-Request-Id", async () => {
    const res = await request(app)
      .get("/api/v1/health")
      .set("X-Request-Id", "evil id\twith spaces");
    expect(res.headers["x-request-id"]).toMatch(/^req_[0-9a-f]{32}$/);
  });
});

describe("security headers (helmet)", () => {
  it("sets standard hardening headers", async () => {
    const res = await request(buildTestApp()).get("/api/v1/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toBeDefined();
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("CORS allowlist", () => {
  const app = buildTestApp({ CORS_ORIGIN: "http://localhost:5173,https://tailorcv.example.com" });

  it("allows an origin on the list", async () => {
    const res = await request(app)
      .get("/api/v1/health")
      .set("Origin", "https://tailorcv.example.com");
    expect(res.headers["access-control-allow-origin"]).toBe("https://tailorcv.example.com");
    expect(res.headers["access-control-expose-headers"]).toContain("X-Request-Id");
  });

  it("sends no CORS header for an origin that is not on the list", async () => {
    const res = await request(app).get("/api/v1/health").set("Origin", "https://evil.example.com");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("answers preflight requests for allowed origins", async () => {
    const res = await request(app)
      .options("/api/v1/health")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST");
    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });
});

describe("rate limiting", () => {
  function limitedApp(limit: number) {
    const app = express();
    app.use(requestId());
    app.post("/limited", createRateLimiter({ limit }), (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler());
    return app;
  }

  it("returns RATE_LIMITED with Retry-After once the limit is exceeded", async () => {
    const app = limitedApp(2);

    expect((await request(app).post("/limited")).status).toBe(200);
    expect((await request(app).post("/limited")).status).toBe(200);
    const res = await request(app).post("/limited");

    expect(res.status).toBe(429);
    const body = ApiErrorResponseSchema.parse(res.body);
    expect(body.error.code).toBe("RATE_LIMITED");
    const retryAfter = Number(res.headers["retry-after"]);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(3600);
    expect(body.error.details).toEqual({ retryAfterSec: retryAfter });
  });

  it("keeps parse and tailor budgets independent", async () => {
    const limiters = createRateLimiters({
      RATE_LIMIT_PARSE_PER_HOUR: 1,
      RATE_LIMIT_TAILOR_PER_HOUR: 1,
    });
    const app = express();
    app.post("/parse", limiters.parse, (_req, res) => res.json({ ok: true }));
    app.post("/tailor", limiters.tailor, (_req, res) => res.json({ ok: true }));
    app.use(errorHandler());

    expect((await request(app).post("/parse")).status).toBe(200);
    expect((await request(app).post("/parse")).status).toBe(429);
    expect((await request(app).post("/tailor")).status).toBe(200);
  });
});
