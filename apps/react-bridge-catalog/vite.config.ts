import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

const PORT = 5401;
const ORIGIN = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: PORT,
    strictPort: true,
    origin: ORIGIN,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },

  preview: {
    host: "127.0.0.1",
    port: PORT,
    strictPort: true,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*"
    }
  },

  plugins: [
    react(),
    federation({
      name: "rb_catalog",
      filename: "remoteEntry.js",
      dts: false,

      exposes: {
        "./export-app": "./src/export-app.tsx"
      },

      shared: {
        react: { singleton: true, requiredVersion: "19.2.0" },
        "react-dom": { singleton: true, requiredVersion: "19.2.0" },
        scheduler: { singleton: true, requiredVersion: "0.27.0" }
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