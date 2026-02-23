import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function readJsonIfExists(p) {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function quantile(sorted, q) {
    if (sorted.length === 0) return null;
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] === undefined) return sorted[base];
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

function summarize(values) {
    const arr = values
        .filter((v) => typeof v === "number" && Number.isFinite(v))
        .sort((a, b) => a - b);
    return {
        samples: arr.length,
        p50: quantile(arr, 0.5),
        p75: quantile(arr, 0.75),
        p90: quantile(arr, 0.9),
        min: arr.length ? arr[0] : null,
        max: arr.length ? arr[arr.length - 1] : null,
    };
}

function parsePnpmVersion() {
    const ua = process.env.npm_config_user_agent || "";
    const m = ua.match(/pnpm\/([0-9.]+)/);
    return m?.[1] ?? null;
}

const dataDir = path.resolve("benchmark-report/data");
fs.mkdirSync(dataDir, { recursive: true });

const lh = readJsonIfExists(path.join(dataDir, "lighthouse.json"));
const runsDir = path.resolve("benchmark-report/data/runs");

let pwRuns = [];
if (fs.existsSync(runsDir)) {
    const files = fs.readdirSync(runsDir).filter((f) => f.endsWith(".json")).sort();
    pwRuns = files.map((f) => JSON.parse(fs.readFileSync(path.join(runsDir, f), "utf-8")));
}

const runtimeRuns = pwRuns.map((r, idx) => ({
    i: idx + 1,
    inp: r?.vitals?.inp?.value ?? null,
    transferBytes: r?.network?.transferBytes ?? null,
    requests: r?.network?.requests ?? null,
}));

const inpValues = runtimeRuns.map((r) => r.inp).filter((v) => typeof v === "number");
const pwTransfer = runtimeRuns.map((r) => r.transferBytes).filter((v) => typeof v === "number");
const pwRequests = runtimeRuns.map((r) => r.requests).filter((v) => typeof v === "number");

const lighthouseRuns = lh?.runs ?? [];
const repLh = lighthouseRuns.find((r) => r.isRepresentativeRun) ?? lighthouseRuns[0] ?? null;

const cpus = os.cpus();
const summary = {
    generatedAt: new Date().toISOString(),
    scenario: "click-counter",

    env: {
        node: process.version,
        pnpm: parsePnpmVersion(),
        platform: process.platform,
        arch: process.arch,
        osRelease: os.release(),
        cpuModel: cpus?.[0]?.model ?? null,
        cpuCores: cpus?.length ?? null,
        memoryGB: Number.isFinite(os.totalmem()) ? +(os.totalmem() / 1024 ** 3).toFixed(1) : null,
        benchRuns: process.env.BENCH_RUNS ? Number(process.env.BENCH_RUNS) : runtimeRuns.length,
        lhciRuns: process.env.LHCI_RUNS ? Number(process.env.LHCI_RUNS) : lighthouseRuns.length,

        lighthouse: repLh
            ? {
                lighthouseVersion: repLh.lighthouseVersion ?? null,
                userAgent: repLh.userAgent ?? null,
                benchmarkIndex: repLh.benchmarkIndex ?? null,
                fetchTime: repLh.fetchTime ?? null,
                hostUserAgent: repLh.hostUserAgent ?? null,
                networkUserAgent: repLh.networkUserAgent ?? null,
            }
            : null,
    },

    lighthouse: {
        runs: lighthouseRuns,
        perfScore: summarize(lighthouseRuns.map((r) => (r.perfScore != null ? r.perfScore * 100 : null))),
        fcp: summarize(lighthouseRuns.map((r) => r.fcp)),
        lcp: summarize(lighthouseRuns.map((r) => r.lcp)),
        cls: summarize(lighthouseRuns.map((r) => r.cls)),
        tbt: summarize(lighthouseRuns.map((r) => r.tbt)),
        totalBytes: summarize(lighthouseRuns.map((r) => r.totalBytes)),
        requests: summarize(lighthouseRuns.map((r) => r.requests)),
    },

    runtime: {
        runs: runtimeRuns,
        inp: summarize(inpValues),
        transferBytes: summarize(pwTransfer),
        requests: summarize(pwRequests),
    },

    links: {
        dashboard: "index.html",
        playwright: "playwright/index.html",
        lighthouseManifest: "lighthouse/manifest.json",
    },
};

fs.writeFileSync(path.join(dataDir, "summary.json"), JSON.stringify(summary, null, 2), "utf-8");
console.log("Built summary -> benchmark-report/data/summary.json");
