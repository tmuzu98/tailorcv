import type { ErrorRequestHandler, Request, RequestHandler } from "express";
import type { ApiErrorResponse } from "@tailorcv/shared";
import { AppError, isAppError } from "../lib/errors";

/** Catch-all for unmatched routes → 404 NOT_FOUND. Mount after all routers. */
export function notFoundHandler(): RequestHandler {
  return (_req, _res, next) => {
    next(new AppError("NOT_FOUND"));
  };
}

/**
 * Maps client-caused errors from Express/body-parser (http-errors objects with a 4xx `status`)
 * to our codes. Without this, e.g. an unsupported charset or a corrupt gzip body would be
 * reported as a 500 INTERNAL_ERROR.
 */
function fromClientError(err: unknown): AppError | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const type = "type" in err ? err.type : undefined;
  if (type === "entity.too.large") return new AppError("PAYLOAD_TOO_LARGE", { cause: err });
  if (type === "entity.parse.failed") {
    return new AppError("VALIDATION_ERROR", {
      message: "The request body is not valid JSON.",
      cause: err,
    });
  }
  // Only http-errors objects flagged `expose: true` (set by body-parser/Express for client errors).
  // Other libraries' errors with a `status` (e.g. the Anthropic SDK's 401/429) stay server errors.
  const status = "status" in err ? err.status : undefined;
  const expose = "expose" in err ? err.expose : false;
  if (expose === true && typeof status === "number" && status >= 400 && status < 500) {
    return new AppError("VALIDATION_ERROR", {
      message: "The request could not be read. Check its headers and body.",
      cause: err,
    });
  }
  return undefined;
}

/** Upload limit (5 MB) + multipart overhead. Larger unread bodies are not drained. */
export const MAX_DRAIN_BYTES = 6 * 1024 * 1024;

/**
 * Sends `send()` only after the unread request body has been discarded. If we answer while the
 * client is still uploading (e.g. a 429 from the rate limiter, which runs before multer), the
 * server closes the socket mid-upload and the client sees EPIPE/ECONNRESET instead of our JSON.
 * Bodies above MAX_DRAIN_BYTES (or of unknown length) are not drained: we answer with
 * `Connection: close` rather than read unbounded data from a possibly abusive client.
 */
function afterDrainingBody(
  req: Request,
  res: Parameters<RequestHandler>[1],
  send: () => void,
): void {
  if (req.complete || req.readableEnded) return send();
  const length = Number(req.headers["content-length"]);
  if (!Number.isFinite(length) || length > MAX_DRAIN_BYTES) {
    res.setHeader("Connection", "close");
    return send();
  }
  let sent = false;
  const once = () => {
    if (sent) return;
    sent = true;
    send();
  };
  req.once("end", once);
  req.once("error", once);
  req.resume(); // discard the data, don't buffer it
}

/**
 * Central error handler (API spec §4). Every error leaves the API in the standard shape:
 * `{ error: { code, message, requestId, details? } }`. Unknown errors become INTERNAL_ERROR with
 * a generic message; their real message and stack go to the log only.
 */
export function errorHandler(): ErrorRequestHandler {
  return (err: unknown, req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }

    const appError = isAppError(err)
      ? err
      : (fromClientError(err) ?? new AppError("INTERNAL_ERROR", { cause: err }));

    // pino-http logs the request at completion; attaching the error puts it on that log line.
    if (appError.status >= 500) {
      res.err = err instanceof Error ? err : new Error(String(err));
    }

    const body: ApiErrorResponse = {
      error: {
        code: appError.code,
        message: appError.message,
        requestId: String(req.id),
        ...(appError.details && { details: appError.details }),
      },
    };
    afterDrainingBody(req, res, () => res.status(appError.status).json(body));
  };
}
