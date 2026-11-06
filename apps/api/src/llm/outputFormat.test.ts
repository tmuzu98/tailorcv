import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { describe, expect, it } from "vitest";
import { ResumeSchema, TailorResultSchema } from "@tailorcv/shared";
import { ParseLlmOutputSchema } from "./prompts/parse.v1";

/**
 * Final check of D-39 (Day 7): the EXACT JSON schema the SDK sends for our shared schemas fits
 * Claude's structured-output subset. `$ref`/`$defs` are supported; recursion is not.
 */
type Node = Record<string, unknown>;
const ALLOWED_KEYWORDS = new Set([
  "$defs",
  "$ref",
  "type",
  "properties",
  "items",
  "required",
  "additionalProperties",
  "description",
  "enum",
  "const",
  "anyOf",
  "allOf",
  "format",
  "title",
]);

function walk(node: unknown, visit: (n: Node) => void): void {
  if (Array.isArray(node)) return node.forEach((child) => walk(child, visit));
  if (!node || typeof node !== "object") return;
  visit(node as Node);
  for (const [key, value] of Object.entries(node)) {
    if (key === "properties" || key === "$defs")
      Object.values(value as Node).forEach((c) => walk(c, visit));
    else walk(value, visit);
  }
}

/** Keywords present (property names under `properties`/`$defs` are not keywords). */
function keywords(schema: Node): Set<string> {
  const found = new Set<string>();
  walk(schema, (n) => Object.keys(n).forEach((k) => found.add(k)));
  return found;
}

function refsIn(node: unknown): string[] {
  const refs: string[] = [];
  walk(node, (n) => typeof n.$ref === "string" && refs.push(n.$ref));
  return refs;
}

/** True if any $def can reach itself through $refs. */
function hasCycle(schema: Node): boolean {
  const defs = (schema.$defs ?? {}) as Record<string, Node>;
  const edges = new Map(
    Object.entries(defs).map(([name, def]) => [
      name,
      refsIn(def).map((r) => r.replace("#/$defs/", "")),
    ]),
  );
  const visiting = new Set<string>();
  const done = new Set<string>();
  const dfs = (name: string): boolean => {
    if (visiting.has(name)) return true;
    if (done.has(name)) return false;
    visiting.add(name);
    const cyclic = (edges.get(name) ?? []).some(dfs);
    visiting.delete(name);
    done.add(name);
    return cyclic;
  };
  return [...edges.keys()].some(dfs);
}

describe.each([
  ["ResumeSchema", ResumeSchema],
  ["TailorResultSchema", TailorResultSchema],
  ["ParseLlmOutputSchema (parse-v1)", ParseLlmOutputSchema],
])("%s as sent by the SDK", (_name, zodSchema) => {
  const schema = betaZodOutputFormat(zodSchema).schema as Node;

  it("uses only supported keywords (length/number constraints are stripped)", () => {
    for (const keyword of keywords(schema)) expect(ALLOWED_KEYWORDS).toContain(keyword);
  });

  it("closes every object with additionalProperties: false", () => {
    walk(schema, (n) => {
      if (n.type === "object") expect(n.additionalProperties).toBe(false);
    });
  });

  it("only references $defs that exist", () => {
    const defs = Object.keys((schema.$defs ?? {}) as Node);
    for (const ref of refsIn(schema)) expect(defs).toContain(ref.replace("#/$defs/", ""));
  });

  it("is not recursive", () => {
    expect(hasCycle(schema)).toBe(false);
  });
});

describe("hasCycle (sanity)", () => {
  it("detects a self-referencing definition", () => {
    expect(
      hasCycle({ $defs: { a: { type: "object", properties: { next: { $ref: "#/$defs/a" } } } } }),
    ).toBe(true);
    expect(hasCycle({ $defs: { a: { type: "string" } } })).toBe(false);
  });
});
