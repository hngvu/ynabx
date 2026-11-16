/// <reference types="vitest" />
import { defineConfig, createLogger } from "vite";
import react from "@vitejs/plugin-react";

// Create custom Vite logger to suppress unresolved external runtime web assets
const logger = createLogger();
const originalWarn = logger.warn;
const originalWarnOnce = logger.warnOnce;

logger.warn = (msg, options) => {
  if (
    typeof msg === "string" &&
    msg.includes("didn't resolve at build time, it will remain unchanged to be resolved at runtime")
  ) {
    return;
  }
  originalWarn(msg, options);
};

logger.warnOnce = (msg, options) => {
  if (
    typeof msg === "string" &&
    msg.includes("didn't resolve at build time, it will remain unchanged to be resolved at runtime")
  ) {
    return;
  }
  originalWarnOnce(msg, options);
};

export default defineConfig({
  customLogger: logger,
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (
          warning.message &&
          warning.message.includes("didn't resolve at build time, it will remain unchanged to be resolved at runtime")
        ) {
          return;
        }
        defaultHandler(warning);
      },
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["src/tests/setup.ts"],
    exclude: [
      "node_modules/**",
      "dist/**",
    ],
  },
});
