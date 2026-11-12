/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0"),
  },
  server: {
    // O backend só aceita escritas vindas da origem do portal em 5173 (ALLOWED_ORIGINS, ADR 0011).
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": process.env.API_PROXY_TARGET ?? "http://localhost:8080",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
