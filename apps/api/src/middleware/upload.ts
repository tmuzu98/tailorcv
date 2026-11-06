import type { RequestHandler } from "express";
import multer, { MulterError } from "multer";
import { AppError } from "../lib/errors";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const UPLOAD_FIELD = "file";

/**
 * Declared types we accept. The declared type is client-controlled, so the magic-byte check in
 * pdfValidationService is the real gate. This only rejects obvious non-PDFs early. Some browsers
 * and OSes send `application/octet-stream` for PDFs, so that is allowed too.
 */
const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/x-pdf",
  "application/octet-stream",
]);

const multerSingle = multer({
  storage: multer.memoryStorage(), // files never touch disk
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 10, parts: 20 },
}).single(UPLOAD_FIELD);

function fromMulterError(err: unknown): AppError {
  if (err instanceof MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return new AppError("FILE_TOO_LARGE", {
          details: { maxBytes: MAX_UPLOAD_BYTES },
          cause: err,
        });
      case "LIMIT_UNEXPECTED_FILE":
      case "LIMIT_FILE_COUNT":
        return new AppError("VALIDATION_ERROR", {
          message: `Upload exactly one file in the "${UPLOAD_FIELD}" field.`,
          cause: err,
        });
      default:
        return new AppError("VALIDATION_ERROR", { message: "The upload is invalid.", cause: err });
    }
  }
  // busboy errors (e.g. a truncated multipart body) are caused by the client, not by us.
  return new AppError("VALIDATION_ERROR", { message: "The upload could not be read.", cause: err });
}

/**
 * Parses a single PDF from `multipart/form-data` into memory (`req.file.buffer`).
 * FILE_MISSING (no/empty file), FILE_TOO_LARGE (> 5 MB), UNSUPPORTED_FILE_TYPE (declared non-PDF),
 * VALIDATION_ERROR (wrong field, several files, malformed body).
 */
export function uploadPdf(): RequestHandler {
  return (req, res, next) => {
    multerSingle(req, res, (err?: unknown) => {
      if (err) return next(fromMulterError(err));
      const file = req.file;
      if (!file) return next(new AppError("FILE_MISSING"));
      if (file.size === 0) {
        return next(new AppError("FILE_MISSING", { message: "The uploaded file is empty." }));
      }
      if (!ACCEPTED_MIME_TYPES.has(file.mimetype)) {
        return next(
          new AppError("UNSUPPORTED_FILE_TYPE", { details: { declaredType: file.mimetype } }),
        );
      }
      next();
    });
  };
}
