import fs from "node:fs";
import path from "node:path";

function readJson(p) {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function safeBasename(p) {
    return path.basename(String(p || ""));
}

const outDir = path.resolve("benchmark-report/data");
fs.mkdirSync(outDir, { recursive: true });

const lhciDir = path.resolve("benchmark-report/lighthouse");
const manifestPath = path.join(lhciDir, "manifest.json");

if (!fs.existsSync(manifestPath)) {
    console.log("No Lighthouse manifest.json found, skip extract.");
    process.exit(0);
}

const manifest = readJson(manifestPath);

const runs = manifest.map((r) => {
    const jsonFile = safeBasename(r.jsonPath);
    const lhr = readJson(path.join(lhciDir, jsonFile));

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
    path.join(outDir, "lighthouse.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), runs }, null, 2),
    "utf-8"
);

console.log("Extracted Lighthouse metrics -> benchmark-report/data/lighthouse.json");
