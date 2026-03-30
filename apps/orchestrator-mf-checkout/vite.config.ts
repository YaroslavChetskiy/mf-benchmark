import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

const ORIGIN = "http://localhost:5103";

export default defineConfig({
  server: {
    port: 5103,
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
      name: "mf_checkout",
      filename: "remoteEntry.js",
      dts: false,

      exposes: {
        "./CartPage": "./src/exposes/CartPage.ts",
        "./CheckoutPage": "./src/exposes/CheckoutPage.ts",
        "./SuccessPage": "./src/exposes/SuccessPage.ts"
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
