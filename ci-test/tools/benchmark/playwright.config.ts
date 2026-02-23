import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 4173;
const HOST = "127.0.0.1";
const BASE_URL = `http://${HOST}:${PORT}`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    testDir: "./tests",
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: [["html", { outputFolder: "benchmark-report/playwright", open: "never" }]],
    use: { baseURL: BASE_URL },

    webServer: {
        command: "pnpm run preview:bench",
        cwd: path.resolve(__dirname, "../../mf-test"),
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },

    projects: [
        { name: "chromium", use: { browserName: "chromium" } }
    ],
});
