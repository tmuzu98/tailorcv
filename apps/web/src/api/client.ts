import { API_PREFIX, ApiErrorResponseSchema, type ErrorCode } from "@tailorcv/shared";
import type { z } from "zod";

// Empty in local dev (the Vite proxy handles /api). Set to the API URL in production.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/** Problems that happen in the browser, before or instead of an API error response. */
export type ClientErrorCode =
  | "NETWORK_ERROR" // no response at all (offline, API down, CORS)
  | "BAD_RESPONSE" // a response that isn't our contract (proxy error page, wrong shape)
  | "ABORTED"; // we cancelled the request (navigation, unmount)

export type ApiErrorCode = ErrorCode | ClientErrorCode;

/** Every failed API call throws this, so the UI only has one error shape to handle. */
export class ApiError extends Error {
  override readonly name = "ApiError";

  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status?: number,
    readonly requestId?: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${API_PREFIX}${path}`;
}

/**
 * Typed fetch wrapper: sends the request, turns the standard error JSON (API spec §4) into an
 * ApiError, and validates successful bodies with the shared schema (the FE↔BE contract).
 */
export async function apiRequest<S extends z.ZodType>(
  path: string,
  options: { schema: S; method?: "GET" | "POST"; body?: BodyInit; signal?: AbortSignal },
): Promise<z.infer<S>> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method: options.method ?? "GET",
      ...(options.body !== undefined && { body: options.body }),
      ...(options.signal && { signal: options.signal }),
    });
  } catch (err) {
    if (options.signal?.aborted) throw new ApiError("ABORTED", "The request was cancelled.");
    throw new ApiError("NETWORK_ERROR", err instanceof Error ? err.message : "Network error");
  }

  const body: unknown = await res.json().catch(() => undefined);

  if (!res.ok) {
    const parsed = ApiErrorResponseSchema.safeParse(body);
    if (parsed.success) {
      const { code, message, requestId, details } = parsed.data.error;
      throw new ApiError(code, message, res.status, requestId, details);
    }
    throw new ApiError(
      "BAD_RESPONSE",
      `Unexpected error response (HTTP ${res.status})`,
      res.status,
    );
  }

  const parsed = options.schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      "BAD_RESPONSE",
      "The server response didn't match the expected format",
      res.status,
    );
  }
  return parsed.data;
}
