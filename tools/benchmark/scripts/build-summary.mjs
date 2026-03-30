import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getArchitectureConfig } from "./benchmark-config.mjs";

function readJsonIfExists(p) {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function listJsonFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .sort()
        .map((f) => path.join(dir, f));
}

function readScenarioRunFiles(baseDir, scenario) {
    const scenarioDir = path.join(baseDir, scenario);
    const scenarioFiles = listJsonFiles(scenarioDir);
    if (scenarioFiles.length > 0) {
        return scenarioFiles.map((p) => JSON.parse(fs.readFileSync(p, "utf-8")));
    }

    const flatFiles = listJsonFiles(baseDir);
    if (flatFiles.length > 0) {
        return flatFiles.map((p) => JSON.parse(fs.readFileSync(p, "utf-8")));
    }

    return [];
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

function inc(map, key) {
    map.set(key, (map.get(key) ?? 0) + 1);
}

function topEntries(map, limit = 10) {
    return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
        .slice(0, limit)
        .map(([key, count]) => ({ key, count }));
}

function buildLighthouseBlock(json) {
    const runs = json?.runs ?? [];
    const rep = runs.find((r) => r.isRepresentativeRun) ?? runs[0] ?? null;

    return {
        representative: rep
            ? {
                lighthouseVersion: rep.lighthouseVersion ?? null,
                userAgent: rep.userAgent ?? null,
                benchmarkIndex: rep.benchmarkIndex ?? null,
                fetchTime: rep.fetchTime ?? null,
                hostUserAgent: rep.hostUserAgent ?? null,
                networkUserAgent: rep.networkUserAgent ?? null,
            }
            : null,
        runs,
        perfScore: summarize(runs.map((r) => (r.perfScore != null ? r.perfScore * 100 : null))),
        fcp: summarize(runs.map((r) => r.fcp)),
        lcp: summarize(runs.map((r) => r.lcp)),
        cls: summarize(runs.map((r) => r.cls)),
        tbt: summarize(runs.map((r) => r.tbt)),
        totalBytes: summarize(runs.map((r) => r.totalBytes)),
        requests: summarize(runs.map((r) => r.requests)),
    };
}

function isAborted(errorText) {
    return typeof errorText === "string" && errorText.includes("ERR_ABORTED");
}

const arch = getArchitectureConfig(process.env.BENCH_ARCH ?? "mf");
const reportDir = path.resolve(process.env.BENCH_REPORT_DIR ?? `benchmark-report/${arch.key}`);
const dataDir = path.resolve(reportDir, "data");

fs.mkdirSync(dataDir, { recursive: true });

const lhColdJson = readJsonIfExists(path.join(dataDir, "lighthouse-cold.json"));
const lhWarmJson = readJsonIfExists(path.join(dataDir, "lighthouse-warm.json"));

const runtimeScenarioDefault = process.env.BENCH_RUNTIME_SCENARIO ?? arch.runtimeScenario;
const failureScenarioDefault = process.env.BENCH_FAILURE_SCENARIO ?? arch.failureScenario;

const runtimeRunsRaw = readScenarioRunFiles(path.resolve(reportDir, "data/runs"), runtimeScenarioDefault);
const failureRunsRaw = readScenarioRunFiles(path.resolve(reportDir, "data/failure-runs"), failureScenarioDefault);

const architecture =
    process.env.BENCH_ARCH ??
    runtimeRunsRaw[0]?.architecture ??
    failureRunsRaw[0]?.architecture ??
    lhColdJson?.runs?.[0]?.architecture ??
    lhWarmJson?.runs?.[0]?.architecture ??
    arch.key;

const runtimeScenario =
    process.env.BENCH_RUNTIME_SCENARIO ??
    runtimeRunsRaw[0]?.scenario ??
    arch.runtimeScenario;

const failureScenario =
    process.env.BENCH_FAILURE_SCENARIO ??
    failureRunsRaw[0]?.scenario ??
    arch.failureScenario;

const lighthouseColdScenario =
    process.env.BENCH_LH_SCENARIO_COLD ??
    lhColdJson?.runs?.[0]?.scenario ??
    arch.lighthouseColdScenario;

const lighthouseWarmScenario =
    process.env.BENCH_LH_SCENARIO_WARM ??
    lhWarmJson?.runs?.[0]?.scenario ??
    arch.lighthouseWarmScenario;

const allRuntimeErrorTexts = new Map();
const allRuntimeResourceTypes = new Map();
const allRuntimeAbortedUrls = new Map();
const allRuntimeHardFailedUrls = new Map();

const runtimeRuns = runtimeRunsRaw.map((r, idx) => {
    const details = Array.isArray(r?.network?.failedRequestsDetails)
        ? r.network.failedRequestsDetails
        : [];

    const abortedDetails = details.filter((d) => isAborted(d?.errorText));
    const hardFailedDetails = details.filter((d) => !isAborted(d?.errorText));

    for (const d of details) {
        inc(allRuntimeErrorTexts, d?.errorText ?? "unknown");
        inc(allRuntimeResourceTypes, d?.resourceType ?? "unknown");
    }

    for (const d of abortedDetails) {
        inc(allRuntimeAbortedUrls, d?.url ?? "unknown");
    }

    for (const d of hardFailedDetails) {
        inc(allRuntimeHardFailedUrls, d?.url ?? "unknown");
    }

    return {
        i: idx + 1,
        ttfb: r?.vitals?.ttfb?.value ?? null,
        inp: r?.vitals?.inp?.value ?? null,
        cls: r?.vitals?.cls?.value ?? null,
        lcp: r?.vitals?.lcp?.value ?? null,
        fcp: r?.vitals?.fcp?.value ?? null,
        transferBytes: r?.network?.transferBytes ?? null,
        requests: r?.network?.requests ?? null,
        failedRequests: r?.network?.failed ?? details.length ?? null,
        abortedRequests:
            typeof r?.network?.abortedRequests === "number"
                ? r.network.abortedRequests
                : abortedDetails.length,
        hardFailedRequests:
            typeof r?.network?.hardFailedRequests === "number"
                ? r.network.hardFailedRequests
                : hardFailedDetails.length,
        durationMs: r?.durationMs ?? null,
        shellReady: r?.marks?.shell_ready ?? 0,
        mfCatalogReady: r?.marks?.mf_catalog_ready ?? 0,
        mfProductReady: r?.marks?.mf_product_ready ?? 0,
        mfCheckoutReady: r?.marks?.mf_checkout_ready ?? 0,
        fallbackShown: r?.marks?.fallback_shown ?? 0,
    };
});

const allFailureErrorTexts = new Map();
const allFailureResourceTypes = new Map();
const allFailureBlockedUrls = new Map();
const allFailureSignalKinds = new Map();

const failureRuns = failureRunsRaw.map((r, idx) => {
    const details = Array.isArray(r?.network?.failedRequestsDetails)
        ? r.network.failedRequestsDetails
        : [];

    const blockedUrls = Array.isArray(r?.injection?.blockedUrls)
        ? r.injection.blockedUrls
        : [];

    const abortedDetails = details.filter((d) => isAborted(d?.errorText));
    const hardFailedDetails = details.filter((d) => !isAborted(d?.errorText));

    for (const d of details) {
        inc(allFailureErrorTexts, d?.errorText ?? "unknown");
        inc(allFailureResourceTypes, d?.resourceType ?? "unknown");
    }

    for (const url of blockedUrls) {
        inc(allFailureBlockedUrls, url ?? "unknown");
    }

    inc(allFailureSignalKinds, r?.result?.fallbackSignal ?? "unknown");

    return {
        i: idx + 1,
        fallbackShown: !!r?.result?.fallbackShown,
        recoveredToCatalog: !!r?.result?.recoveredToCatalog,
        fallbackSignal: r?.result?.fallbackSignal ?? null,
        timeToFallbackMs: r?.result?.timeToFallbackMs ?? null,
        timeToRecoveryMs: r?.result?.timeToRecoveryMs ?? null,
        requests: r?.network?.requests ?? null,
        failedRequests: r?.network?.failed ?? details.length ?? null,
        abortedRequests:
            typeof r?.network?.abortedRequests === "number"
                ? r.network.abortedRequests
                : abortedDetails.length,
        hardFailedRequests:
            typeof r?.network?.hardFailedRequests === "number"
                ? r.network.hardFailedRequests
                : hardFailedDetails.length,
        transferBytes: r?.network?.transferBytes ?? null,
        blockedUrls,
    };
});

const lhCold = buildLighthouseBlock(lhColdJson);
const lhWarm = buildLighthouseBlock(lhWarmJson);

const runtimeTtfb = runtimeRuns.map((r) => r.ttfb);
const runtimeInp = runtimeRuns.map((r) => r.inp);
const runtimeCls = runtimeRuns.map((r) => r.cls);
const runtimeLcp = runtimeRuns.map((r) => r.lcp);
const runtimeFcp = runtimeRuns.map((r) => r.fcp);
const runtimeTransfer = runtimeRuns.map((r) => r.transferBytes);
const runtimeRequests = runtimeRuns.map((r) => r.requests);
const runtimeFailed = runtimeRuns.map((r) => r.failedRequests);
const runtimeAborted = runtimeRuns.map((r) => r.abortedRequests);
const runtimeHardFailed = runtimeRuns.map((r) => r.hardFailedRequests);
const runtimeDuration = runtimeRuns.map((r) => r.durationMs);

const failureFallbackTimes = failureRuns.map((r) => r.timeToFallbackMs);
const failureRecoveryTimes = failureRuns.map((r) => r.timeToRecoveryMs);
const failureRequests = failureRuns.map((r) => r.requests);
const failureFailedRequests = failureRuns.map((r) => r.failedRequests);
const failureAbortedRequests = failureRuns.map((r) => r.abortedRequests);
const failureHardFailedRequests = failureRuns.map((r) => r.hardFailedRequests);
const failureTransferBytes = failureRuns.map((r) => r.transferBytes);

const cpus = os.cpus();

const fallbackShownRuns = failureRuns.filter((r) => r.fallbackShown).length;
const recoveredRuns = failureRuns.filter((r) => r.recoveredToCatalog).length;

const summary = {
    generatedAt: new Date().toISOString(),
    architecture,
    architectureDisplayName: arch.displayName,

    scenarios: {
        runtime: runtimeScenario,
        failure: failureScenario,
        lighthouseCold: lighthouseColdScenario,
        lighthouseWarm: lighthouseWarmScenario,
    },

    env: {
        node: process.version,
        pnpm: parsePnpmVersion(),
        platform: process.platform,
        arch: process.arch,
        osRelease: os.release(),
        cpuModel: cpus?.[0]?.model ?? null,
        cpuCores: cpus?.length ?? null,
        memoryGB: Number.isFinite(os.totalmem())
            ? +(os.totalmem() / 1024 ** 3).toFixed(1)
            : null,
        benchRuns: process.env.BENCH_RUNS
            ? Number(process.env.BENCH_RUNS)
            : runtimeRuns.length,
        lhciRuns: process.env.LHCI_RUNS
            ? Number(process.env.LHCI_RUNS)
            : Math.max(lhCold.runs.length, lhWarm.runs.length),
        lighthouseCold: lhCold.representative,
        lighthouseWarm: lhWarm.representative,
    },

    lighthouse: {
        cold: lhCold,
        warm: lhWarm,
        deltas: {
            lcpP50DeltaMs:
                lhCold.lcp.p50 != null && lhWarm.lcp.p50 != null
                    ? lhWarm.lcp.p50 - lhCold.lcp.p50
                    : null,
            fcpP50DeltaMs:
                lhCold.fcp.p50 != null && lhWarm.fcp.p50 != null
                    ? lhWarm.fcp.p50 - lhCold.fcp.p50
                    : null,
            totalBytesP50Delta:
                lhCold.totalBytes.p50 != null && lhWarm.totalBytes.p50 != null
                    ? lhWarm.totalBytes.p50 - lhCold.totalBytes.p50
                    : null,
            requestsP50Delta:
                lhCold.requests.p50 != null && lhWarm.requests.p50 != null
                    ? lhWarm.requests.p50 - lhCold.requests.p50
                    : null,
        },
    },

    runtime: {
        runs: runtimeRuns,
        ttfb: summarize(runtimeTtfb),
        inp: summarize(runtimeInp),
        fcp: summarize(runtimeFcp),
        lcp: summarize(runtimeLcp),
        cls: summarize(runtimeCls),
        transferBytes: summarize(runtimeTransfer),
        requests: summarize(runtimeRequests),
        failedRequests: summarize(runtimeFailed),
        abortedRequests: summarize(runtimeAborted),
        hardFailedRequests: summarize(runtimeHardFailed),
        durationMs: summarize(runtimeDuration),
        marks: {
            shellReadyRuns: runtimeRuns.filter((r) => r.shellReady > 0).length,
            mfCatalogReadyRuns: runtimeRuns.filter((r) => r.mfCatalogReady > 0).length,
            mfProductReadyRuns: runtimeRuns.filter((r) => r.mfProductReady > 0).length,
            mfCheckoutReadyRuns: runtimeRuns.filter((r) => r.mfCheckoutReady > 0).length,
            fallbackShownRuns: runtimeRuns.filter((r) => r.fallbackShown > 0).length,
        },
        failureBreakdown: {
            errorTexts: topEntries(allRuntimeErrorTexts, 10),
            resourceTypes: topEntries(allRuntimeResourceTypes, 10),
            topAbortedUrls: topEntries(allRuntimeAbortedUrls, 10),
            topHardFailedUrls: topEntries(allRuntimeHardFailedUrls, 10),
        },
    },

    failure: {
        runs: failureRuns,
        fallbackShownRate: failureRuns.length ? fallbackShownRuns / failureRuns.length : null,
        recoveredRate: failureRuns.length ? recoveredRuns / failureRuns.length : null,
        fallbackShownRuns,
        recoveredRuns,
        timeToFallbackMs: summarize(failureFallbackTimes),
        timeToRecoveryMs: summarize(failureRecoveryTimes),
        requests: summarize(failureRequests),
        failedRequests: summarize(failureFailedRequests),
        abortedRequests: summarize(failureAbortedRequests),
        hardFailedRequests: summarize(failureHardFailedRequests),
        transferBytes: summarize(failureTransferBytes),
        signalKinds: topEntries(allFailureSignalKinds, 10),
        blockedUrls: topEntries(allFailureBlockedUrls, 10),
        failureBreakdown: {
            errorTexts: topEntries(allFailureErrorTexts, 10),
            resourceTypes: topEntries(allFailureResourceTypes, 10),
        },
    },

    links: {
        dashboard: "index.html",
        playwright: "playwright/index.html",
        lighthouseColdManifest: "lighthouse-cold/manifest.json",
        lighthouseWarmManifest: "lighthouse-warm/manifest.json",
    },
};

fs.writeFileSync(path.join(dataDir, "summary.json"), JSON.stringify(summary, null, 2), "utf-8");
console.log(`Built summary -> ${path.join(dataDir, "summary.json")}`);