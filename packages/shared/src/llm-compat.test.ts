import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ResumeSchema, TailorResultSchema } from "./index";

/*
 * Guards the "schemas work with Claude structured outputs" requirement (Day 4).
 * Claude's JSON-schema subset does NOT support: recursive schemas, numeric constraints
 * (minimum/maximum), string length constraints, complex array constraints, or
 * additionalProperties other than false. The TS SDK strips unsupported constraints and
 * validates them client-side, but recursion and unsupported keywords/formats would fail.
 */

type JsonNode = Record<string, unknown>;

const SUPPORTED_TYPES = new Set([
  "object",
  "array",
  "string",
  "integer",
  "number",
  "boolean",
  "null",
]);
const SUPPORTED_FORMATS = new Set([
  "date-time",
  "time",
  "date",
  "duration",
  "email",
  "hostname",
  "uri",
  "ipv4",
  "ipv6",
  "uuid",
]);
// Keywords the SDK strips and checks itself (allowed to appear)
const SDK_HANDLED = new Set([
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
]);
const STRUCTURAL = new Set([
  "$schema",
  "type",
  "properties",
  "required",
  "items",
  "additionalProperties",
  "enum",
  "const",
  "anyOf",
  "allOf",
  "description",
  "format",
  "default",
  "title",
]);

function collect(
  node: unknown,
  out: { keywords: Set<string>; types: Set<string>; formats: Set<string>; objects: JsonNode[] },
) {
  if (Array.isArray(node)) return node.forEach((n) => collect(n, out));
  if (!node || typeof node !== "object") return;
  const n = node as JsonNode;
  if (n.type === "object") out.objects.push(n);
  if (typeof n.type === "string") out.types.add(n.type);
  if (typeof n.format === "string") out.formats.add(n.format);
  for (const [key, value] of Object.entries(n)) {
    out.keywords.add(key);
    if (key === "properties") Object.values(value as JsonNode).forEach((v) => collect(v, out));
    else if (key !== "enum" && key !== "const" && key !== "default") collect(value, out);
  }
}

describe.each([
  ["ResumeSchema", ResumeSchema],
  ["TailorResultSchema", TailorResultSchema],
])("%s → Claude structured outputs compatibility", (_name, schema) => {
  const json = z.toJSONSchema(schema);
  const found = {
    keywords: new Set<string>(),
    types: new Set<string>(),
    formats: new Set<string>(),
    objects: [] as JsonNode[],
  };
  collect(json, found);

  it("is not recursive (no $ref / $defs)", () => {
    expect(found.keywords.has("$ref")).toBe(false);
    expect(found.keywords.has("$defs")).toBe(false);
  });

  it("uses only supported types", () => {
    for (const t of found.types) expect(SUPPORTED_TYPES).toContain(t);
  });

  it("uses only supported string formats", () => {
    for (const f of found.formats) expect(SUPPORTED_FORMATS).toContain(f);
  });

  it("uses only supported keywords (or ones the SDK strips and validates client-side)", () => {
    const unsupported = [...found.keywords].filter(
      (k) => !STRUCTURAL.has(k) && !SDK_HANDLED.has(k),
    );
    expect(unsupported).toEqual([]);
  });

  it("closes every object with additionalProperties: false", () => {
    expect(found.objects.length).toBeGreaterThan(5); // the walker really visited the tree
    const open = found.objects.filter((o) => o.additionalProperties !== false);
    expect(open).toHaveLength(0);
  });
});
