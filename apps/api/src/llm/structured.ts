import type { z } from "zod";

/** The model's answer is not valid JSON or doesn't match the schema (retry-worthy). */
export class SchemaMismatch extends Error {
  override readonly name = "SchemaMismatch";
}

/**
 * Parses model output text as JSON and validates it against the schema. Shared by every
 * LlmClient so all providers apply the same rules. Error messages carry issue paths only,
 * never values (values may contain resume content).
 */
export function parseStructuredText<S extends z.ZodType>(text: string, schema: S): z.infer<S> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new SchemaMismatch("output is not valid JSON");
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    const paths = result.error.issues.slice(0, 5).map((issue) => issue.path.join(".") || "(root)");
    throw new SchemaMismatch(`output does not match schema at: ${paths.join(", ")}`);
  }
  return result.data;
}
