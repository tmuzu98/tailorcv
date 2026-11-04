// Public entry point of @tailorcv/shared.
// Consumed as TypeScript source by both apps (no build step): Vite compiles it
// for the web app, and tsx / tsup compile it for the API.
//
// Test fixtures are NOT exported here (they'd end up in the web bundle);
// import them from "@tailorcv/shared/fixtures" in tests only.

export const API_PREFIX = "/api/v1";

export * from "./health.schema";
export * from "./resume.schema";
export * from "./tailor.schema";
export * from "./api.schema";
