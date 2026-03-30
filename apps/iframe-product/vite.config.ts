import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const PORT = 5302;
const ORIGIN = `http://localhost:${PORT}`;

export default defineConfig({
  base: "/",
  server: {
    port: PORT,
    strictPort: true,
    origin: ORIGIN,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },

  resolve: {
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    preserveSymlinks: true,
  },

  optimizeDeps: {
    force: true,
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "@mf-benchmark/contracts",
      "@mf-benchmark/mf-product",
    ],
  },

  plugins: [react()],
  build: { target: "chrome89" },
});
