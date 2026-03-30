import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

const PORT = 5100;
const ORIGIN = `http://localhost:${PORT}`;

export default defineConfig({
  base: "/",

  server: {
    port: PORT,
    strictPort: true,
    origin: ORIGIN
  },

  plugins: [
    react(),
    federation({
      name: "orchestrator_mf_host",

      remotes: {
        mf_catalog: {
          type: "module",
          name: "mf_catalog",
          entry: "http://localhost:5101/remoteEntry.js"
        },
        mf_product: {
          type: "module",
          name: "mf_product",
          entry: "http://localhost:5102/remoteEntry.js"
        },
        mf_checkout: {
          type: "module",
          name: "mf_checkout",
          entry: "http://localhost:5103/remoteEntry.js"
        }
      },

      shared: {
        react: { singleton: true, requiredVersion: "19.2.0" },
        "react-dom": { singleton: true, requiredVersion: "19.2.0" },
        "react-router-dom": { singleton: true }
      },

      dts: false
    })
  ],

  build: {
    target: "chrome89"
  }
});
