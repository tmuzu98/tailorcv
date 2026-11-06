import { getDocumentProxy } from "unpdf";
import { AppError } from "../lib/errors";

export const MAX_PDF_PAGES = 5;

/** PDF readers accept the `%PDF-` header anywhere in the first 1024 bytes (PDF 32000-1, Annex H). */
const MAGIC = Buffer.from("%PDF-", "latin1");
const MAGIC_SEARCH_WINDOW = 1024;

export interface PdfInfo {
  pages: number;
}

export function hasPdfMagicBytes(bytes: Uint8Array): boolean {
  return Buffer.from(bytes.subarray(0, MAGIC_SEARCH_WINDOW)).includes(MAGIC);
}

/** pdf.js signals problems with named exceptions; map them to our error codes. */
function fromPdfJsError(err: unknown): AppError | undefined {
  const name = err instanceof Error ? err.name : undefined;
  if (name === "PasswordException") return new AppError("PDF_ENCRYPTED", { cause: err });
  if (name === "InvalidPDFException" || name === "FormatError") {
    return new AppError("UNSUPPORTED_FILE_TYPE", {
      message: "This PDF appears to be damaged. Please export it again and re-upload.",
      cause: err,
    });
  }
  return undefined;
}

/**
 * Cheap structural checks before any AI call: real PDF, opens without a password, ≤ 5 pages.
 * Throws AppError (UNSUPPORTED_FILE_TYPE, PDF_ENCRYPTED, PDF_TOO_MANY_PAGES) on failure.
 * Never logs or returns the file's content.
 */
export async function validatePdf(bytes: Uint8Array): Promise<PdfInfo> {
  if (!hasPdfMagicBytes(bytes)) throw new AppError("UNSUPPORTED_FILE_TYPE");

  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    // pdf.js may detach the buffer it is given, so pass a copy and keep the caller's intact.
    // verbosity 0 = errors only: pdf.js otherwise prints "Warning: …" lines straight to the console
    // (e.g. while recovering a damaged file), which would break our JSON logs.
    pdf = await getDocumentProxy(new Uint8Array(bytes), { verbosity: 0 });
  } catch (err) {
    throw fromPdfJsError(err) ?? err;
  }

  try {
    const pages = pdf.numPages;
    if (pages > MAX_PDF_PAGES) {
      throw new AppError("PDF_TOO_MANY_PAGES", {
        message: `Your resume has ${pages} pages. Please upload a resume with ${MAX_PDF_PAGES} pages or fewer.`,
        details: { pages, maxPages: MAX_PDF_PAGES },
      });
    }
    return { pages };
  } finally {
    await pdf.loadingTask.destroy().catch(() => undefined);
  }
}
