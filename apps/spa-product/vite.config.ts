import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const PORT = 5202;
const ORIGIN = `http://localhost:${PORT}`;

export default defineConfig({
  base: "/",

  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },

  server: {
    port: PORT,
    strictPort: true,
    origin: ORIGIN,
    cors: true,
    headers: { "Access-Control-Allow-Origin": "*" },
  },

  preview: {
    host: "127.0.0.1",
    port: PORT,
    strictPort: true,
    cors: true,
    headers: { "Access-Control-Allow-Origin": "*" },
  },

  resolve: {
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },

  optimizeDeps: {
    force: true,
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "single-spa",
      "single-spa-react",
      "@mf-benchmark/mf-product"
    ],
  },

  plugins: [react()],

  build: {
    target: "chrome89",
    lib: {
      entry: resolve(__dirname, "src/spaEntry.tsx"),
      formats: ["es"],
      fileName: () => "spaEntry.js",
    },
  },
});