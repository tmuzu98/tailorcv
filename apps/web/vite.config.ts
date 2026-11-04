import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // In dev, the browser calls /api/... on :5173 and Vite forwards to the API.
    // Same origin → no CORS needed locally.
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
