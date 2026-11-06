import { describe, expect, it, vi } from "vitest";
import { readPdfFixture, type PdfFixture } from "../../tests/helpers/fixtures";
import { AppError } from "../lib/errors";
import { MAX_PDF_PAGES, hasPdfMagicBytes, validatePdf } from "./pdfValidationService";

async function expectAppError(promise: Promise<unknown>, code: string): Promise<AppError> {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(AppError);
  expect((err as AppError).code).toBe(code);
  return err as AppError;
}

describe("hasPdfMagicBytes", () => {
  it("accepts %PDF- at the start", () => {
    expect(hasPdfMagicBytes(Buffer.from("%PDF-1.7\n..."))).toBe(true);
  });

  it("accepts %PDF- within the first 1024 bytes (leading junk is allowed by the spec)", () => {
    expect(
      hasPdfMagicBytes(Buffer.concat([Buffer.alloc(500, 0x20), Buffer.from("%PDF-1.4")])),
    ).toBe(true);
  });

  it("rejects %PDF- after the first 1024 bytes, other formats and empty input", () => {
    expect(hasPdfMagicBytes(Buffer.concat([Buffer.alloc(1100, 0x20), Buffer.from("%PDF-")]))).toBe(
      false,
    );
    expect(hasPdfMagicBytes(readPdfFixture("not-a-pdf.pdf"))).toBe(false);
    expect(hasPdfMagicBytes(Buffer.alloc(0))).toBe(false);
  });
});

describe("validatePdf", () => {
  it.each<[PdfFixture, number]>([
    ["resume-1page.pdf", 1],
    ["resume-2page.pdf", 2],
    ["resume-2column.pdf", 1],
  ])("accepts %s (%i page)", async (fixture, pages) => {
    await expect(validatePdf(readPdfFixture(fixture))).resolves.toEqual({ pages });
  });

  it("rejects more than 5 pages with PDF_TOO_MANY_PAGES and page details", async () => {
    const err = await expectAppError(
      validatePdf(readPdfFixture("seven-pages.pdf")),
      "PDF_TOO_MANY_PAGES",
    );
    expect(err.status).toBe(422);
    expect(err.details).toEqual({ pages: 7, maxPages: MAX_PDF_PAGES });
    expect(err.message).toContain("7 pages");
  });

  it("rejects a password-protected PDF with PDF_ENCRYPTED", async () => {
    await expectAppError(validatePdf(readPdfFixture("encrypted.pdf")), "PDF_ENCRYPTED");
  });

  it("rejects a non-PDF and an empty buffer with UNSUPPORTED_FILE_TYPE", async () => {
    await expectAppError(validatePdf(readPdfFixture("not-a-pdf.pdf")), "UNSUPPORTED_FILE_TYPE");
    await expectAppError(validatePdf(readPdfFixture("empty.pdf")), "UNSUPPORTED_FILE_TYPE");
  });

  it("rejects a damaged PDF (valid header, broken body) with a clear message", async () => {
    const err = await expectAppError(
      validatePdf(readPdfFixture("corrupt.pdf")),
      "UNSUPPORTED_FILE_TYPE",
    );
    expect(err.message).toMatch(/damaged/i);
  });

  it("does not print pdf.js warnings to the console (they would pollute the JSON logs)", async () => {
    const spies = (["log", "warn", "error", "info"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );
    try {
      await validatePdf(readPdfFixture("corrupt.pdf")).catch(() => undefined);
      await validatePdf(readPdfFixture("encrypted.pdf")).catch(() => undefined);
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });

  it("does not modify or detach the caller's buffer", async () => {
    const bytes = readPdfFixture("resume-1page.pdf");
    const copy = Buffer.from(bytes);
    await validatePdf(bytes);
    expect(bytes.byteLength).toBe(copy.byteLength);
    expect(bytes.equals(copy)).toBe(true);
  });
});
