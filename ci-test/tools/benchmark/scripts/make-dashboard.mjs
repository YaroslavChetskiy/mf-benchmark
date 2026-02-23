import fs from "node:fs";
import path from "node:path";

function readJson(p) {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function esc(x) {
    return String(x ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function fmtMs(x) {
    if (x == null) return "—";
    return `${Math.round(x)} ms`;
}

function fmtNum(x, digits = 0) {
    if (x == null) return "—";
    return Number(x).toFixed(digits);
}

function fmtBytes(x) {
    if (x == null) return "—";
    const kb = x / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(1)} KB`;
}

function fmtBytesAxis(x) {
    if (x == null) return "—";
    const kb = x / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${kb.toFixed(1)} KB`;
}

function toFiniteNumbers(arr) {
    return (arr ?? []).filter((v) => typeof v === "number" && Number.isFinite(v));
}

function chooseBins(n) {
    const b = Math.round(Math.sqrt(Math.max(1, n)) * 3);
    return Math.min(16, Math.max(5, b));
}

function histogramSvg(values, { labelX, fmtX } = {}) {
    const v = toFiniteNumbers(values);
    const n = v.length;
    if (!n) return `<div class="muted">—</div>`;

    const W = 300;
    const H = 140;


    const mL = 54;
    const mR = 10;
    const mT = 10;
    const mB = 40;

    const cw = W - mL - mR;
    const ch = H - mT - mB;

    const min = Math.min(...v);
    const max = Math.max(...v);
    const same = min === max;


    const yMax = n;

    const minLabelGapPx = 12;
    const maxLabels = Math.max(2, Math.floor(ch / minLabelGapPx));
    let yLabelStep = 1;
    if (yMax + 1 > maxLabels) {
        yLabelStep = Math.ceil((yMax + 1) / maxLabels);
    }

    const yTicks = Array.from({ length: yMax + 1 }, (_, i) => i);

    const x0 = mL;
    const y0 = mT + ch;
    const x1 = mL + cw;
    const y1 = mT;


    const grid = yTicks
        .map((t) => {
            const yy = mT + ch - (t / Math.max(1, yMax)) * ch;

            const isZero = t === 0;
            const isMajor = isZero || t === yMax || t % yLabelStep === 0;

            return `
        <line x1="${x0}" y1="${yy}" x2="${x1}" y2="${yy}" class="${
                isMajor ? "hgrid-major" : "hgrid-minor"
            }" />
        ${
                isMajor
                    ? `<text x="${x0 - 8}" y="${yy + 3}" text-anchor="end" class="tick">${t}</text>`
                    : ""
            }
      `;
        })
        .join("");


    const axis = `
    <line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" class="axis" />
    <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" class="axis" />
  `;


    let bars = "";
    if (same) {

        const barW = Math.min(44, cw * 0.28);
        const h = (n / Math.max(1, yMax)) * ch;
        const x = mL + cw / 2 - barW / 2;
        const y = mT + (ch - h);
        bars = `<rect x="${x.toFixed(2)}" y="${y.toFixed(
            2
        )}" width="${barW.toFixed(2)}" height="${h.toFixed(
            2
        )}" rx="2" ry="2" class="bar-rect" />`;
    } else {
        const bins = chooseBins(n);
        const counts = Array.from({ length: bins }).fill(0);
        const range = max - min || 1;

        for (const x of v) {
            const t = (x - min) / range;
            const idx = Math.min(bins - 1, Math.max(0, Math.floor(t * bins)));
            counts[idx]++;
        }

        const gap = 2;
        const slot = cw / bins;
        const barW = Math.max(1, slot - gap);

        bars = counts
            .map((c, i) => {
                const x = mL + i * slot + gap / 2;
                const h = (c / Math.max(1, yMax)) * ch;
                const y = mT + (ch - h);
                return `<rect x="${x.toFixed(2)}" y="${y.toFixed(
                    2
                )}" width="${barW.toFixed(2)}" height="${h.toFixed(
                    2
                )}" rx="2" ry="2" class="bar-rect" />`;
            })
            .join("");
    }


    const fmt = (x) => esc(fmtX ? fmtX(x) : String(x));

    const ticksX = [];
    const pushTick = (val, anchor) => {
        const t = same ? 0.5 : (val - min) / (max - min);
        const xx = mL + t * cw;
        ticksX.push({ xx, label: fmt(val), anchor });
    };

    if (same) {
        pushTick(min, "middle");
    } else {
        pushTick(min, "start");
        pushTick(max, "end");

        const mid = (min + max) / 2;
        const midLabel = fmt(mid);
        const minLabel = fmt(min);
        const maxLabel = fmt(max);

        const approxMinX = mL;
        const approxMidX = mL + cw / 2;
        const approxMaxX = mL + cw;

        const safe = (a, b) => Math.abs(a - b) > 64;
        const midOk =
            midLabel !== minLabel &&
            midLabel !== maxLabel &&
            safe(approxMidX, approxMinX) &&
            safe(approxMaxX, approxMidX);

        if (midOk) {
            ticksX.splice(1, 0, { xx: approxMidX, label: midLabel, anchor: "middle" });
        }
    }

    const xTicksSvg = ticksX
        .map((t) => {
            const tickH = 6;
            return `
        <line x1="${t.xx}" y1="${y0}" x2="${t.xx}" y2="${y0 + tickH}" class="tickline" />
        <text x="${t.xx}" y="${y0 + 18}" text-anchor="${t.anchor}" class="tickx">${t.label}</text>
      `;
        })
        .join("");

    const xLabel = esc(labelX ?? "значение");
    const labels = `
    <text x="${mL + cw / 2}" y="${H - 8}" text-anchor="middle" class="xlabel">${xLabel}</text>
    <text x="16" y="${mT + ch / 2}" text-anchor="middle" class="ylabel"
      transform="rotate(-90 16 ${mT + ch / 2})">количество</text>
  `;

    const title = same ? `all=${min}, n=${n}` : `min=${min}, max=${max}, n=${n}`;

    return `
    <svg class="hist-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">
      <title>${esc(title)}</title>
      ${grid}
      ${axis}
      ${bars}
      ${xTicksSvg}
      ${labels}
    </svg>
  `;
}

const reportRoot = path.resolve("benchmark-report");
const dataDir = path.join(reportRoot, "data");
const summaryPath = path.join(dataDir, "summary.json");

fs.mkdirSync(reportRoot, { recursive: true });

let body = `<p>Нет summary.json — сначала запусти benchmark.</p>`;
let links = { playwright: "playwright/index.html", lighthouseManifest: "lighthouse/manifest.json" };

if (fs.existsSync(summaryPath)) {
    const s = readJson(summaryPath);
    links = s.links ?? links;

    const lh = s.lighthouse ?? {};
    const rt = s.runtime ?? {};
    const env = s.env ?? {};

    const lhRuns = lh.runs ?? [];
    const rtRuns = rt.runs ?? [];

    const row = (name, unitFmt, obj, distValues, distFmt) => `
    <tr>
      <td>${esc(name)}</td>
      <td>${unitFmt(obj.p50)}</td>
      <td>${unitFmt(obj.p75)}</td>
      <td>${unitFmt(obj.p90)}</td>
      <td>${unitFmt(obj.min)}</td>
      <td>${unitFmt(obj.max)}</td>
      <td class="dist-cell">
        ${histogramSvg(distValues, { labelX: `значение (${name})`, fmtX: distFmt })}
      </td>
      <td class="muted">${obj.samples ?? 0}</td>
    </tr>
  `;

    const envRows = [
        ["Scenario", s.scenario],
        ["Generated at", s.generatedAt],
        ["Node", env.node],
        ["pnpm", env.pnpm],
        ["OS", `${env.platform ?? ""} ${env.arch ?? ""} ${env.osRelease ?? ""}`.trim()],
        ["CPU", `${env.cpuModel ?? "—"} (${env.cpuCores ?? "?"} cores)`],
        ["Memory", env.memoryGB != null ? `${env.memoryGB} GB` : "—"],
        ["BENCH_RUNS", env.benchRuns],
        ["LHCI_RUNS", env.lhciRuns],
        ["LH (version)", env.lighthouse?.lighthouseVersion],
        ["Chrome UA", env.lighthouse?.userAgent],
        ["BenchmarkIndex", env.lighthouse?.benchmarkIndex != null ? String(Math.round(env.lighthouse.benchmarkIndex)) : null],
    ]
        .filter(([, v]) => v != null && String(v).trim() !== "")
        .map(([k, v]) => `<tr><td class="muted">${esc(k)}</td><td>${esc(v)}</td></tr>`)
        .join("");

    body = `
    <div class="card">
      <h2>Environment</h2>
      <table class="kv">
        <tbody>${envRows}</tbody>
      </table>
      <p class="muted">
        Lighthouse runs: ${lhRuns.length}, Runtime runs: ${rtRuns.length}.
      </p>
    </div>

    <div class="card">
      <h2>Lighthouse (lab)</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th><th>p50</th><th>p75</th><th>p90</th><th>min</th><th>max</th><th class="dist-col">dist</th><th class="muted">n</th>
          </tr>
        </thead>
        <tbody>
          ${row(
        "Performance score",
        (v) => (v == null ? "—" : `${Math.round(v)}`),
        lh.perfScore ?? {},
        lhRuns.map((r) => (r.perfScore != null ? r.perfScore * 100 : null)),
        (x) => (x == null ? "—" : Number(x).toFixed(1))
    )}
          ${row("FCP", fmtMs, lh.fcp ?? {}, lhRuns.map((r) => r.fcp), (x) => fmtMs(x))}
          ${row("LCP", fmtMs, lh.lcp ?? {}, lhRuns.map((r) => r.lcp), (x) => fmtMs(x))}
          ${row("CLS", (v) => (v == null ? "—" : fmtNum(v, 3)), lh.cls ?? {}, lhRuns.map((r) => r.cls), (x) => fmtNum(x, 3))}
          ${row("TBT", fmtMs, lh.tbt ?? {}, lhRuns.map((r) => r.tbt), (x) => fmtMs(x))}
          ${row("Total bytes", fmtBytes, lh.totalBytes ?? {}, lhRuns.map((r) => r.totalBytes), (x) => fmtBytesAxis(x))}
          ${row("Requests", (v) => (v == null ? "—" : `${Math.round(v)}`), lh.requests ?? {}, lhRuns.map((r) => r.requests), (x) => (x == null ? "—" : String(Math.round(x))))}
        </tbody>
      </table>
      <p class="muted">Источник: Lighthouse CI отчёты (все прогоны).</p>
    </div>

    <div class="card">
      <h2>Runtime (Playwright + web-vitals)</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th><th>p50</th><th>p75</th><th>p90</th><th>min</th><th>max</th><th class="dist-col">dist</th><th class="muted">n</th>
          </tr>
        </thead>
        <tbody>
          ${row("INP (click)", fmtMs, rt.inp ?? {}, rtRuns.map((r) => r.inp), (x) => fmtMs(x))}
          ${row("Requests (approx)", (v) => (v == null ? "—" : `${Math.round(v)}`), rt.requests ?? {}, rtRuns.map((r) => r.requests), (x) => (x == null ? "—" : String(Math.round(x))))}
          ${row("Transfer bytes (encoded, CDP)", fmtBytes, rt.transferBytes ?? {}, rtRuns.map((r) => r.transferBytes), (x) => fmtBytesAxis(x))}
        </tbody>
      </table>
      <p class="muted">INP снят через web-vitals внутри приложения во время клика в Playwright.</p>
    </div>
  `;
}

const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>CI Benchmark report</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 32px; line-height: 1.4; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 16px; max-width: 1180px; }
    .card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px 18px; }
    h1 { font-size: 22px; margin: 0 0 12px; }
    h2 { font-size: 16px; margin: 0 0 10px; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { border-bottom: 1px solid #eee; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #fafafa; }
    .muted { color: #6b7280; font-size: 12px; }
    .links a { margin-right: 12px; }
    .kv td { border-bottom: 1px dashed #f1f5f9; }
    .dist-col { width: 320px; }
    .dist-cell { padding-top: 8px; padding-bottom: 8px; }

    /* SVG histogram */
    .hist-svg { width: 300px; height: 140px; display: block; }
    .bar-rect { fill: #93c5fd; }
    .axis { stroke: #94a3b8; stroke-width: 1; shape-rendering: crispEdges; }
    .hgrid-minor { stroke: #eef2f7; stroke-width: 1; shape-rendering: crispEdges; }
    .hgrid-major { stroke: #e2e8f0; stroke-width: 1; shape-rendering: crispEdges; }
    .tick { fill: #64748b; font-size: 10px; }
    .tickline { stroke: #94a3b8; stroke-width: 1; shape-rendering: crispEdges; }
    .tickx { fill: #64748b; font-size: 10px; }
    .xlabel { fill: #475569; font-size: 10px; }
    .ylabel { fill: #475569; font-size: 10px; }
  </style>
</head>
<body>
  <div class="grid">
    <div class="card">
      <h1>CI Benchmark report</h1>
      <div class="links">
        <a href="${links.playwright}">Playwright report</a>
        <a href="${links.lighthouseManifest}">Lighthouse manifest.json</a>
        <a href="data/summary.json">summary.json</a>
      </div>
      <p class="muted">Один сценарий: click-counter (vite template).</p>
    </div>

    ${body}
  </div>
</body>
</html>
`;

fs.writeFileSync(path.join(reportRoot, "index.html"), html, "utf-8");
console.log("Dashboard generated: benchmark-report/index.html");
