import { API_PREFIX, HealthResponseSchema, type HealthResponse } from "@tailorcv/shared";

// Empty in local dev (Vite proxy handles /api). Set to the Render URL in production.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/** Calls GET /api/v1/health and validates the response with the shared schema. */
export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}${API_PREFIX}/health`, { signal });
  if (!res.ok) throw new Error(`Health check failed: HTTP ${res.status}`);
  return HealthResponseSchema.parse(await res.json());
}
