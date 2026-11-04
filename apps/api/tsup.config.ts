import { defineConfig } from "tsup";

// Production build: bundles src/server.ts (and the TS source of @tailorcv/shared)
// into a single ESM file at dist/server.js. npm dependencies stay external
// and are installed on the server as usual.
export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  sourcemap: true,
  clean: true,
  noExternal: [/^@tailorcv\//],
});
