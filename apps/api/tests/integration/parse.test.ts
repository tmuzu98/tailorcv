import request from "supertest";
import { describe, expect, it } from "vitest";
import { ApiErrorResponseSchema, type ErrorCode } from "@tailorcv/shared";
import { MAX_UPLOAD_BYTES } from "../../src/middleware/upload";
import { buildTestApp } from "../helpers/app";
import { pdfFixturePath, readPdfFixture, type PdfFixture } from "../helpers/fixtures";

const PARSE = "/api/v1/resumes/parse";

function expectError(res: request.Response, status: number, code: ErrorCode) {
  expect(res.status).toBe(status);
  const body = ApiErrorResponseSchema.parse(res.body);
  expect(body.error.code).toBe(code);
  expect(body.error.requestId).toBe(res.headers["x-request-id"]);
  return body.error;
}

describe("POST /api/v1/resumes/parse (Day 6 stub: upload + validation)", () => {
  // High limit so these tests never trip the rate limiter.
  const app = buildTestApp({ RATE_LIMIT_PARSE_PER_HOUR: "1000" });

  describe("accepts valid PDFs", () => {
    it.each<[PdfFixture, number]>([
      ["resume-1page.pdf", 1],
      ["resume-2page.pdf", 2],
      ["resume-2column.pdf", 1],
    ])("%s → 200 with %i page(s)", async (fixture, pages) => {
      const res = await request(app).post(PARSE).attach("file", pdfFixturePath(fixture));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ stub: true, pages });
    });

    it("accepts application/octet-stream as the declared type (magic bytes decide)", async () => {
      const res = await request(app)
        .post(PARSE)
        .attach("file", readPdfFixture("resume-1page.pdf"), {
          filename: "resume.pdf",
          contentType: "application/octet-stream",
        });
      expect(res.status).toBe(200);
    });
  });

  describe("rejects bad files with the right error code", () => {
    it("seven pages → 422 PDF_TOO_MANY_PAGES with details", async () => {
      const res = await request(app).post(PARSE).attach("file", pdfFixturePath("seven-pages.pdf"));
      const error = expectError(res, 422, "PDF_TOO_MANY_PAGES");
      expect(error.details).toEqual({ pages: 7, maxPages: 5 });
    });

    it("password-protected → 422 PDF_ENCRYPTED", async () => {
      const res = await request(app).post(PARSE).attach("file", pdfFixturePath("encrypted.pdf"));
      expectError(res, 422, "PDF_ENCRYPTED");
    });

    it("non-PDF renamed to .pdf (declared application/pdf) → 415 UNSUPPORTED_FILE_TYPE", async () => {
      const res = await request(app).post(PARSE).attach("file", readPdfFixture("not-a-pdf.pdf"), {
        filename: "resume.pdf",
        contentType: "application/pdf",
      });
      expectError(res, 415, "UNSUPPORTED_FILE_TYPE");
    });

    it("damaged PDF → 415 UNSUPPORTED_FILE_TYPE with a 'damaged' message", async () => {
      const res = await request(app).post(PARSE).attach("file", pdfFixturePath("corrupt.pdf"));
      expect(expectError(res, 415, "UNSUPPORTED_FILE_TYPE").message).toMatch(/damaged/i);
    });

    it("declared non-PDF type (image/png) → 415 before any parsing", async () => {
      const res = await request(app)
        .post(PARSE)
        .attach("file", readPdfFixture("resume-1page.pdf"), {
          filename: "photo.png",
          contentType: "image/png",
        });
      const error = expectError(res, 415, "UNSUPPORTED_FILE_TYPE");
      expect(error.details).toEqual({ declaredType: "image/png" });
    });

    it("empty file → 400 FILE_MISSING", async () => {
      const res = await request(app).post(PARSE).attach("file", readPdfFixture("empty.pdf"), {
        filename: "empty.pdf",
        contentType: "application/pdf",
      });
      expect(expectError(res, 400, "FILE_MISSING").message).toMatch(/empty/i);
    });

    it("file over 5 MB → 413 FILE_TOO_LARGE", async () => {
      const big = Buffer.concat([
        Buffer.from("%PDF-1.7\n"),
        Buffer.alloc(MAX_UPLOAD_BYTES + 1, 0x20),
      ]);
      const res = await request(app)
        .post(PARSE)
        .attach("file", big, { filename: "big.pdf", contentType: "application/pdf" });
      const error = expectError(res, 413, "FILE_TOO_LARGE");
      expect(error.details).toEqual({ maxBytes: MAX_UPLOAD_BYTES });
    });
  });

  describe("rejects malformed requests", () => {
    it("no body at all → 400 FILE_MISSING", async () => {
      expectError(await request(app).post(PARSE), 400, "FILE_MISSING");
    });

    it("JSON instead of multipart → 400 FILE_MISSING", async () => {
      expectError(await request(app).post(PARSE).send({ file: "x" }), 400, "FILE_MISSING");
    });

    it("multipart without a file (text field only) → 400 FILE_MISSING", async () => {
      expectError(await request(app).post(PARSE).field("note", "hello"), 400, "FILE_MISSING");
    });

    it("file in the wrong field → 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post(PARSE)
        .attach("resume", pdfFixturePath("resume-1page.pdf"));
      expectError(res, 400, "VALIDATION_ERROR");
    });

    it("two files → 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post(PARSE)
        .attach("file", pdfFixturePath("resume-1page.pdf"))
        .attach("file", pdfFixturePath("resume-2page.pdf"));
      expectError(res, 400, "VALIDATION_ERROR");
    });

    it("truncated multipart body → 400 VALIDATION_ERROR, not 500", async () => {
      const res = await request(app)
        .post(PARSE)
        .set("Content-Type", "multipart/form-data; boundary=XYZ")
        .send(
          '--XYZ\r\nContent-Disposition: form-data; name="file"; filename="a.pdf"\r\n\r\n%PDF-1.7',
        );
      expectError(res, 400, "VALIDATION_ERROR");
    });

    it("GET is not allowed → 404 NOT_FOUND", async () => {
      expectError(await request(app).get(PARSE), 404, "NOT_FOUND");
    });
  });
});

describe("parse rate limit", () => {
  it("returns 429 after RATE_LIMIT_PARSE_PER_HOUR requests, checked before the upload is read", async () => {
    const app = buildTestApp({ RATE_LIMIT_PARSE_PER_HOUR: "2" });
    const send = () => request(app).post(PARSE).attach("file", pdfFixturePath("resume-1page.pdf"));

    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    const limited = await send();
    expectError(limited, 429, "RATE_LIMITED");
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);

    // Even a request with no file gets 429, so the limiter runs before multer/validation.
    expectError(await request(app).post(PARSE), 429, "RATE_LIMITED");
  });
});

describe("early error responses during an upload (found on Day 7)", () => {
  const big = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(4 * 1024 * 1024, 0x20)]);
  const attachBig = (req: request.Test) =>
    req.attach("file", big, { filename: "big.pdf", contentType: "application/pdf" });

  it("a rate-limited 4 MB upload gets a 429 response, not a connection reset", async () => {
    const app = buildTestApp({ RATE_LIMIT_PARSE_PER_HOUR: "1" });
    await request(app).post(PARSE); // uses up the budget
    for (let i = 0; i < 5; i++) {
      expectError(await attachBig(request(app).post(PARSE)), 429, "RATE_LIMITED");
    }
  });

  it("a 4 MB upload to an unknown route gets a 404 response, not a connection reset", async () => {
    const app = buildTestApp();
    for (let i = 0; i < 3; i++) {
      expectError(await attachBig(request(app).post("/api/v1/nope")), 404, "NOT_FOUND");
    }
  });
});
