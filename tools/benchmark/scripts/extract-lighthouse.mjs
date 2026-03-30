import fs from "node:fs";
import path from "node:path";
import { getArchitectureConfig } from "./benchmark-config.mjs";

function readJson(p) {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function safeBasename(p) {
    return path.basename(String(p || ""));
}

function extractFromDir({ dir, outFile, architecture, scenario }) {
    const manifestPath = path.join(dir, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
        console.log(`No Lighthouse manifest.json found in ${dir}, skip extract.`);
        return;
    }

    const manifest = readJson(manifestPath);

    const runs = manifest.map((r) => {
        const jsonFile = safeBasename(r.jsonPath);
        const lhr = readJson(path.join(dir, jsonFile));

        const audits = lhr.audits || {};
        const perfScore = lhr.categories?.performance?.score ?? null;

        const fcp = audits["first-contentful-paint"]?.numericValue ?? null;
        const lcp = audits["largest-contentful-paint"]?.numericValue ?? null;
        const cls = audits["cumulative-layout-shift"]?.numericValue ?? null;
        const tbt = audits["total-blocking-time"]?.numericValue ?? null;

        const totalBytes = audits["total-byte-weight"]?.numericValue ?? null;
        const reqItems = audits["network-requests"]?.details?.items;
        const requests = Array.isArray(reqItems) ? reqItems.length : null;

        return {
            architecture,
            scenario,
            url: r.url,
            isRepresentativeRun: Boolean(r.isRepresentativeRun),

            perfScore,
            fcp,
            lcp,
            cls,
            tbt,
            totalBytes,
            requests,

            lighthouseVersion: lhr.lighthouseVersion ?? null,
            userAgent: lhr.userAgent ?? null,
            fetchTime: lhr.fetchTime ?? null,
            benchmarkIndex: lhr.environment?.benchmarkIndex ?? null,
            hostUserAgent: lhr.environment?.hostUserAgent ?? null,
            networkUserAgent: lhr.environment?.networkUserAgent ?? null,
        };
    });

    fs.writeFileSync(
        outFile,
        JSON.stringify({ generatedAt: new Date().toISOString(), runs }, null, 2),
        "utf-8"
    );

    console.log(`Extracted Lighthouse metrics -> ${outFile}`);
}

const arch = getArchitectureConfig(process.env.BENCH_ARCH ?? "mf");
const reportDir = path.resolve(process.env.BENCH_REPORT_DIR ?? `benchmark-report/${arch.key}`);
const outDir = path.resolve(reportDir, "data");

fs.mkdirSync(outDir, { recursive: true });

extractFromDir({
    dir: path.resolve(reportDir, "lighthouse-cold"),
    outFile: path.join(outDir, "lighthouse-cold.json"),
    architecture: arch.key,
    scenario: process.env.BENCH_LH_SCENARIO_COLD ?? arch.lighthouseColdScenario,
});

extractFromDir({
    dir: path.resolve(reportDir, "lighthouse-warm"),
    outFile: path.join(outDir, "lighthouse-warm.json"),
    architecture: arch.key,
    scenario: process.env.BENCH_LH_SCENARIO_WARM ?? arch.lighthouseWarmScenario,
});