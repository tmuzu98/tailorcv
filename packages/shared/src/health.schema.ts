import { z } from "zod";

/** Response of `GET /api/v1/health` (API spec §1). */
export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  version: z.string(),
  uptimeSec: z.number().int().nonnegative(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
