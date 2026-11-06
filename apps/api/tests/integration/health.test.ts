import request from "supertest";
import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "@tailorcv/shared";
import { buildTestApp } from "../helpers/app";

describe("GET /api/v1/health", () => {
  const app = buildTestApp();

  it("returns 200 with a body matching the shared HealthResponse schema", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    const body = HealthResponseSchema.parse(res.body);
    expect(body.status).toBe("ok");
  });

  it("does not expose the x-powered-by header", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
