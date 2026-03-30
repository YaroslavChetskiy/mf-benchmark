const path = require("node:path");

const CHROME_PORT = process.env.LHCI_CHROME_PORT ? Number(process.env.LHCI_CHROME_PORT) : undefined;
const TARGET_URL = process.env.BENCH_LH_URL ?? "http://127.0.0.1:5100/catalog";
const REPORT_DIR = process.env.BENCH_REPORT_DIR ?? "benchmark-report/mf";
const MODE = process.env.BENCH_LH_MODE === "warm" ? "warm" : "cold";

module.exports = {
    ci: {
        collect: {
            numberOfRuns: Number(process.env.LHCI_RUNS ?? "3"),
            url: [TARGET_URL],
            settings: {
                chromeFlags: "--headless=new --disable-gpu --no-sandbox --no-first-run --no-default-browser-check",
                port: CHROME_PORT,
                portStrictMode: !!CHROME_PORT,
                disableStorageReset: MODE === "warm",
            },
        },
        upload: {
            target: "filesystem",
            outputDir: path.join(REPORT_DIR, MODE === "warm" ? "lighthouse-warm" : "lighthouse-cold"),
        },
    },
};