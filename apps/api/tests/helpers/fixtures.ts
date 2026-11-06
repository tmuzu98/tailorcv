import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const PDF_FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "../fixtures/pdfs");

export type PdfFixture =
  | "resume-1page.pdf"
  | "resume-2page.pdf"
  | "resume-2column.pdf"
  | "seven-pages.pdf"
  | "encrypted.pdf"
  | "not-a-pdf.pdf"
  | "empty.pdf"
  | "corrupt.pdf";

export function pdfFixturePath(name: PdfFixture): string {
  return join(PDF_FIXTURES_DIR, name);
}

export function readPdfFixture(name: PdfFixture): Buffer {
  return readFileSync(pdfFixturePath(name));
}
