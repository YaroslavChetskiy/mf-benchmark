import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BENCHMARK_DIR = path.resolve(__dirname, "..");
export const REPORT_ROOT = path.resolve(BENCHMARK_DIR, "benchmark-report");

export const SCENARIOS = {
    runtime: {
        happyPath: "s1-spanav",
        failureProduct: "s2-failure-product",
    },
    lighthouse: {
        coldCatalog: "s1-hardnav-cold-catalog",
        warmCatalog: "s1-hardnav-warm-catalog",
    },
};

export const ARCHITECTURES = {
    mf: {
        key: "mf",
        displayName: "Module Federation",
        buildScript: "build:mf",
        previewScript: "preview:mf",
        baseUrl: "http://127.0.0.1:5100",
        readyPath: "/catalog",
        lighthousePath: "/catalog",
        previewUrls: [
            "http://127.0.0.1:5100/catalog",
            "http://127.0.0.1:5101/",
            "http://127.0.0.1:5102/",
            "http://127.0.0.1:5103/",
        ],
        runtimeScenario: SCENARIOS.runtime.happyPath,
        failureScenario: SCENARIOS.runtime.failureProduct,
        lighthouseColdScenario: SCENARIOS.lighthouse.coldCatalog,
        lighthouseWarmScenario: SCENARIOS.lighthouse.warmCatalog,
    },

    spa: {
        key: "spa",
        displayName: "single-spa",
        buildScript: "build:spa",
        previewScript: "preview:spa",
        baseUrl: "http://127.0.0.1:5200",
        readyPath: "/catalog",
        lighthousePath: "/catalog",
        previewUrls: [
            "http://127.0.0.1:5200/catalog",
            "http://127.0.0.1:5201/spaEntry.js",
            "http://127.0.0.1:5202/spaEntry.js",
            "http://127.0.0.1:5203/spaEntry.js",
        ],
        runtimeScenario: SCENARIOS.runtime.happyPath,
        failureScenario: SCENARIOS.runtime.failureProduct,
        lighthouseColdScenario: SCENARIOS.lighthouse.coldCatalog,
        lighthouseWarmScenario: SCENARIOS.lighthouse.warmCatalog,
    },

    iframe: {
        key: "iframe",
        displayName: "iframe",
        buildScript: "build:iframe",
        previewScript: "preview:iframe",
        baseUrl: "http://localhost:5300",
        readyPath: "/catalog",
        lighthousePath: "/catalog",
        previewUrls: [
            "http://localhost:5300/catalog",
            "http://localhost:5301/",
            "http://localhost:5302/",
            "http://localhost:5303/",
        ],
        runtimeScenario: SCENARIOS.runtime.happyPath,
        failureScenario: SCENARIOS.runtime.failureProduct,
        lighthouseColdScenario: SCENARIOS.lighthouse.coldCatalog,
        lighthouseWarmScenario: SCENARIOS.lighthouse.warmCatalog,
    },

    bridge: {
        key: "bridge",
        displayName: "React Bridge",
        buildScript: "build:bridge",
        previewScript: "preview:bridge",
        baseUrl: "http://127.0.0.1:5400",
        readyPath: "/catalog",
        lighthousePath: "/catalog",
        previewUrls: [
            "http://127.0.0.1:5400/catalog",
            "http://127.0.0.1:5401/remoteEntry.js",
            "http://127.0.0.1:5402/remoteEntry.js",
            "http://127.0.0.1:5403/remoteEntry.js",
        ],
        runtimeScenario: SCENARIOS.runtime.happyPath,
        failureScenario: SCENARIOS.runtime.failureProduct,
        lighthouseColdScenario: SCENARIOS.lighthouse.coldCatalog,
        lighthouseWarmScenario: SCENARIOS.lighthouse.warmCatalog,
    },
};

export const ARCH_ORDER = ["mf", "spa", "iframe", "bridge"];
export const ARCHITECTURE_KEYS = ARCH_ORDER.filter((key) => key in ARCHITECTURES);

export function getArchitectureConfig(key) {
    const cfg = ARCHITECTURES[key];
    if (!cfg) {
        throw new Error(
            `Unknown architecture "${key}". Supported: ${ARCHITECTURE_KEYS.join(", ")}`
        );
    }
    return cfg;
}

export function parseArchListFromArgv(argv = process.argv.slice(2)) {
    const rawArch = argv.find((arg) => arg.startsWith("--arch="));
    if (!rawArch) return ARCHITECTURE_KEYS;

    const value = rawArch.slice("--arch=".length).trim();
    if (!value) return ARCHITECTURE_KEYS;

    const keys = value
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

    if (keys.length === 0) return ARCHITECTURE_KEYS;

    for (const key of keys) {
        getArchitectureConfig(key);
    }

    return keys;
}

export function parseSingleArchFromArgv(argv = process.argv.slice(2), fallback = "mf") {
    const list = parseArchListFromArgv(argv);
    if (list.length === 0) return fallback;
    if (list.length > 1) {
        throw new Error(
            `run-full-benchmark expects one architecture, got: ${list.join(", ")}`
        );
    }
    return list[0];
}

export function getRelativeReportDir(archInput) {
    const arch =
        typeof archInput === "string"
            ? getArchitectureConfig(archInput)
            : archInput;

    return `benchmark-report/${arch.key}`;
}

export function buildBenchEnv(archInput) {
    const arch =
        typeof archInput === "string"
            ? getArchitectureConfig(archInput)
            : archInput;

    const reportRoot = "benchmark-report";
    const reportDir = getRelativeReportDir(arch);

    return {
        BENCH_ARCH: arch.key,
        BENCH_ARCH_DISPLAY: arch.displayName,
        BENCH_BASE_URL: arch.baseUrl,
        BENCH_READY_URL: `${arch.baseUrl}${arch.readyPath}`,
        BENCH_LH_URL: `${arch.baseUrl}${arch.lighthousePath}`,
        BENCH_RUNTIME_SCENARIO: arch.runtimeScenario,
        BENCH_FAILURE_SCENARIO: arch.failureScenario,
        BENCH_LH_SCENARIO_COLD: arch.lighthouseColdScenario,
        BENCH_LH_SCENARIO_WARM: arch.lighthouseWarmScenario,
        BENCH_REPORT_ROOT: reportRoot,
        BENCH_REPORT_DIR: reportDir,
    };
}