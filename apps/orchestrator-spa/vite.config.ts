import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const PORT = 5200;
const ORIGIN = `http://localhost:${PORT}`;

export default defineConfig({
  base: "/",

  server: {
    port: PORT,
    strictPort: true,
    origin: ORIGIN,
  },

  preview: {
    host: "127.0.0.1",
    port: PORT,
    strictPort: true,
  },

  resolve: {
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },

  optimizeDeps: {
    force: true,
    include: ["react", "react-dom", "react-dom/client", "single-spa"],
  },

  plugins: [react()],
  build: { target: "chrome89" },
});