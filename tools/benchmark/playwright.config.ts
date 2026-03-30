import { defineConfig } from "@playwright/test";

const BASE_URL = process.env.BENCH_BASE_URL ?? "http://127.0.0.1:5100";
const REPORT_DIR = process.env.BENCH_REPORT_DIR ?? "benchmark-report";
const TEST_GREP = process.env.BENCH_TEST_GREP;

export default defineConfig({
    testDir: "./tests",
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    outputDir: `${REPORT_DIR}/test-results`,
    reporter: [
        ["html", { outputFolder: `${REPORT_DIR}/playwright`, open: "never" }],
    ],
    grep: TEST_GREP ? new RegExp(TEST_GREP, "i") : undefined,
    use: {
        baseURL: BASE_URL,
    },

    projects: [
        {
            name: "chromium",
            use: { browserName: "chromium" },
        },
    ],
});