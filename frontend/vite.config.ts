import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget =
    env.VITE_PROXY_TARGET ||
    env.BACKEND_URL ||
    (env.VITE_API_BASE_URL && env.VITE_API_BASE_URL.startsWith("http")
      ? new URL(env.VITE_API_BASE_URL).origin
      : "http://localhost:8080");

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "node",
      globals: true,
    },
  };
});
