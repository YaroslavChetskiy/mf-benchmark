import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

const ORIGIN = "http://localhost:5101";

export default defineConfig({
  server: {
    port: 5101,
    strictPort: true,
    cors: true,
    origin: ORIGIN,
    headers: {
      "Access-Control-Allow-Origin": "*"
    }
  },

  plugins: [
    react(),
    federation({
      name: "mf_catalog",
      filename: "remoteEntry.js",
      dts: false,

      exposes: {
        "./CatalogPage": "./src/exposes/CatalogPage.ts"
      },

      shared: {
        react: { singleton: true, requiredVersion: "19.2.0" },
        "react-dom": { singleton: true, requiredVersion: "19.2.0" },
        "react-router-dom": { singleton: true }
      }
    })
  ],

  optimizeDeps: {
    exclude: ["@mf-benchmark/contracts"]
  },

  build: {
    target: "chrome89"
  }
});
