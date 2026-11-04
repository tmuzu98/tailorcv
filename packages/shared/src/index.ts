// Public entry point of @tailorcv/shared.
// Consumed as TypeScript source by both apps (no build step): Vite compiles it
// for the web app, and tsx / tsup compile it for the API.

export const API_PREFIX = "/api/v1";

export * from "./health.schema";
