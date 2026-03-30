import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

const PORT = 5400;
const ORIGIN = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  base: "/",

  server: {
    host: "127.0.0.1",
    port: PORT,
    strictPort: true,
    origin: ORIGIN,
  },

  preview: {
    host: "127.0.0.1",
    port: PORT,
    strictPort: true,
  },

  plugins: [
    react(),
    federation({
      name: "orchestrator_react_bridge_host",
      remotes: {
        rb_catalog: {
          type: "module",
          name: "rb_catalog",
          entry: "http://127.0.0.1:5401/remoteEntry.js",
        },
        rb_product: {
          type: "module",
          name: "rb_product",
          entry: "http://127.0.0.1:5402/remoteEntry.js",
        },
        rb_checkout: {
          type: "module",
          name: "rb_checkout",
          entry: "http://127.0.0.1:5403/remoteEntry.js",
        },
      },
      shared: {
        react: { singleton: true, requiredVersion: "19.2.0" },
        "react-dom": { singleton: true, requiredVersion: "19.2.0" },
        scheduler: { singleton: true, requiredVersion: "0.27.0" },
      },
      dts: false,
    }),
  ],

  build: {
    target: "chrome89",
  },
});