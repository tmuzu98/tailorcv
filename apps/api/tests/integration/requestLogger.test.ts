import { Writable } from "node:stream";
import express from "express";
import { pino } from "pino";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "../../src/middleware/errorHandler";
import { requestId } from "../../src/middleware/requestId";
import { requestLogger } from "../../src/middleware/requestLogger";

/** App whose access log is captured in memory so we can inspect what would be written. */
function appWithCapturedLogs() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _enc, done) {
      lines.push(chunk.toString());
      done();
    },
  });
  const app = express();
  app.use(requestId());
  app.use(requestLogger(pino({ level: "info" }, stream)));
  app.use(express.json());
  app.post("/echo", (req, res) => {
    req.log.info({ body: req.body }, "handler log");
    res.json({ ok: true });
  });
  app.get("/api/v1/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/fail", () => {
    throw new Error("kaboom");
  });
  app.use(errorHandler());
  return { app, logs: () => lines.join("") };
}

describe("requestLogger", () => {
  it("logs the requestId and redacts credentials and request bodies", async () => {
    const { app, logs } = appWithCapturedLogs();

    const res = await request(app)
      .post("/echo")
      .set("Authorization", "Bearer secret-token-123")
      .set("Cookie", "session=secret-cookie")
      .send({ resume: { name: "Jane Candidate" }, jobDescription: "Senior role at ACME" });

    expect(res.status).toBe(200);
    const output = logs();
    expect(output).toContain(res.headers["x-request-id"]);
    expect(output).toContain("[REDACTED]");
    for (const secret of ["secret-token-123", "secret-cookie", "Jane Candidate", "ACME"]) {
      expect(output).not.toContain(secret);
    }
  });

  it("keeps the access log line minimal: id, method, path, status, time", async () => {
    const { app, logs } = appWithCapturedLogs();

    const res = await request(app).post("/echo?email=jane@example.com").send({});

    const entry = JSON.parse(logs().trim().split("\n").at(-1) ?? "{}");
    expect(entry.msg).toBe("request completed");
    expect(entry.req).toEqual({ id: res.headers["x-request-id"], method: "POST", url: "/echo" });
    expect(entry.res).toEqual({ statusCode: 200 });
    expect(entry.responseTime).toEqual(expect.any(Number));
    expect(logs()).not.toContain("jane@example.com");
  });

  it("logs unexpected errors at error level with the real message (server side only)", async () => {
    const { app, logs } = appWithCapturedLogs();

    const res = await request(app).get("/fail");

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("kaboom");
    const entry = JSON.parse(logs().trim().split("\n").at(-1) ?? "{}");
    expect(entry.level).toBe(50);
    expect(JSON.stringify(entry)).toContain("kaboom");
  });

  it("does not log health checks, with or without a query string", async () => {
    const { app, logs } = appWithCapturedLogs();

    await request(app).get("/api/v1/health");
    await request(app).get("/api/v1/health?probe=render");

    expect(logs()).toBe("");
  });
});
