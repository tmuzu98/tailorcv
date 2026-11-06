import { HealthResponseSchema, type HealthResponse } from "@tailorcv/shared";
import { apiRequest } from "./client";

/** Calls GET /api/v1/health and validates the response with the shared schema. */
export function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiRequest("/health", { schema: HealthResponseSchema, ...(signal && { signal }) });
}
