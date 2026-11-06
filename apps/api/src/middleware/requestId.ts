import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const REQUEST_ID_HEADER = "X-Request-Id";

/** Accept an incoming id only if it is short and harmless (prevents log injection). */
const SAFE_INCOMING_ID = /^[\w-]{8,64}$/;

export function generateRequestId(): string {
  return `req_${randomUUID().replaceAll("-", "")}`;
}

/**
 * Assigns `req.id` (reusing a safe incoming X-Request-Id, e.g. from a proxy) and echoes it back
 * in the response header so users can quote it in bug reports.
 */
export function requestId(): RequestHandler {
  return (req, res, next) => {
    const incoming = req.get(REQUEST_ID_HEADER);
    const id = incoming && SAFE_INCOMING_ID.test(incoming) ? incoming : generateRequestId();
    req.id = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
  };
}
