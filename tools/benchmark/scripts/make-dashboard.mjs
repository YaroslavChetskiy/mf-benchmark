import fs from "node:fs";
import path from "node:path";
import { getArchitectureConfig } from "./benchmark-config.mjs";
import { DETAIL_SECTIONS } from "./dashboard-schema.mjs";
import {
    esc,
    formatValue,
    getByPath,
    histogramSvg,
    renderTopList,
} from "./dashboard-utils.mjs";

function readJson(p) {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function renderMetricTable(title, block, metrics) {
    const runs = block?.runs ?? [];

    const row = (metric) => {
        const obj = block?.[metric.key] ?? {};
        const distValues = runs.map((r) => metric.runValue(r));

        return `
      <tr>
        <td>${esc(metric.label)}</td>
        <td>${formatValue(metric.format, obj?.p50)}</td>
        <td>${formatValue(metric.format, obj?.p75)}</td>
        <td>${formatValue(metric.format, obj?.p90)}</td>
        <td>${formatValue(metric.format, obj?.min)}</td>
        <td>${formatValue(metric.format, obj?.max)}</td>
        <td class="dist-cell">
          ${histogramSvg(distValues, {
            labelX: `значение (${metric.label})`,
            fmtX: (x) => formatValue(metric.format, x, { axis: true }),
        })}
        </td>
        <td class="muted">${obj?.samples ?? 0}</td>
      </tr>
    `;
    };

    return `
      <div class="card">
        <h2>${esc(title)}</h2>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>p50</th>
              <th>p75</th>
              <th>p90</th>
              <th>min</th>
              <th>max</th>
              <th class="dist-col">dist</th>
              <th class="muted">n</th>
            </tr>
          </thead>
          <tbody>
            ${metrics.map(row).join("")}
          </tbody>
        </table>
      </div>
    `;
}

function renderEnvironmentSection(summary) {
    const env = summary.env ?? {};
    const archCfg = getArchitectureConfig(summary.architecture ?? "mf");

    const envRows = [
        ["Architecture", `${summary.architecture} (${archCfg.displayName})`],
        ["Runtime scenario", summary.scenarios?.runtime],
        ["Failure scenario", summary.scenarios?.failure],
        ["Lighthouse cold", summary.scenarios?.lighthouseCold],
        ["Lighthouse warm", summary.scenarios?.lighthouseWarm],
        ["Generated at", summary.generatedAt],
        ["Node", env.node],
        ["pnpm", env.pnpm],
        ["OS", `${env.platform ?? ""} ${env.arch ?? ""} ${env.osRelease ?? ""}`.trim()],
        ["CPU", `${env.cpuModel ?? "—"} (${env.cpuCores ?? "?"} cores)`],
        ["Memory", env.memoryGB != null ? `${env.memoryGB} GB` : "—"],
        ["BENCH_RUNS", env.benchRuns],
        ["LHCI_RUNS", env.lhciRuns],
        ["LH cold (version)", env.lighthouseCold?.lighthouseVersion],
        ["LH warm (version)", env.lighthouseWarm?.lighthouseVersion],
    ]
        .filter(([, v]) => v != null && String(v).trim() !== "")
        .map(([k, v]) => `<tr><td class="muted">${esc(k)}</td><td>${esc(v)}</td></tr>`)
        .join("");

    return `
      <div class="card">
        <h2>Environment</h2>
        <table class="kv">
          <tbody>${envRows}</tbody>
        </table>
      </div>
    `;
}

function renderWarmDeltaSection(summary) {
    const deltas = summary.lighthouse?.deltas ?? {};

    return `
      <div class="card">
        <h2>Warm vs cold delta</h2>
        <table class="kv">
          <tbody>
            <tr><td class="muted">LCP p50 delta</td><td>${formatValue("ms", deltas.lcpP50DeltaMs)}</td></tr>
            <tr><td class="muted">FCP p50 delta</td><td>${formatValue("ms", deltas.fcpP50DeltaMs)}</td></tr>
            <tr><td class="muted">Total bytes p50 delta</td><td>${formatValue("bytes", deltas.totalBytesP50Delta)}</td></tr>
            <tr><td class="muted">Requests p50 delta</td><td>${formatValue("int", deltas.requestsP50Delta)}</td></tr>
          </tbody>
        </table>
        <p class="muted">Отрицательное значение означает улучшение warm относительно cold.</p>
      </div>
    `;
}

function renderRuntimeMarksSection(section, summary) {
    const marks = summary.runtime?.marks ?? {};

    return `
      <div class="card">
        <h2>${esc(section.title)}</h2>
        <table class="kv">
          <tbody>
            ${section.rows
        .map(
            (row) =>
                `<tr><td class="muted">${esc(row.label)}</td><td>${esc(
                    String(marks?.[row.key] ?? 0)
                )}</td></tr>`
        )
        .join("")}
          </tbody>
        </table>
      </div>
    `;
}

function renderFailureSection(section, summary) {
    const failure = summary.failure ?? {};
    const runs = failure.runs ?? [];

    if (runs.length === 0) {
        return `
          <div class="card">
            <h2>${esc(section.title)}</h2>
            <div class="muted">Нет данных по сценарию отказа.</div>
          </div>
        `;
    }

    const groupsHtml = section.groups
        .map((group) => {
            const items = getByPath(failure, group.path);
            return `
              <div>
                <h3>${esc(group.title)}</h3>
                ${renderTopList(items)}
              </div>
            `;
        })
        .join("");

    const headTable = `
      <div class="card">
        <h2>${esc(section.title)}</h2>
        <table class="kv">
          <tbody>
            <tr><td class="muted">Fallback shown runs</td><td>${esc(String(failure.fallbackShownRuns ?? 0))}</td></tr>
            <tr><td class="muted">Recovered runs</td><td>${esc(String(failure.recoveredRuns ?? 0))}</td></tr>
            <tr><td class="muted">Fallback shown rate</td><td>${formatValue("pct", failure.fallbackShownRate)}</td></tr>
            <tr><td class="muted">Recovered rate</td><td>${formatValue("pct", failure.recoveredRate)}</td></tr>
          </tbody>
        </table>

        ${renderMetricTable("", failure, section.metrics)
        .replace('<div class="card">', '<div style="margin-top: 12px;">')
        .replace("</div>", "</div>")}

        <div class="columns" style="margin-top: 16px;">
          ${groupsHtml}
        </div>
      </div>
    `;

    return headTable
        .replace("<h2></h2>", "")
        .replace('<div class="card">\n        <h2></h2>', '<div class="card">');
}

function renderBreakdownSection(section, summary) {
    const base = getByPath(summary, section.path);

    return `
      <div class="card">
        <h2>${esc(section.title)}</h2>
        <div class="columns">
          ${section.groups
        .map((group) => {
            const items = getByPath(base, group.path);
            return `
                <div>
                  <h3>${esc(group.title)}</h3>
                  ${renderTopList(items)}
                </div>
              `;
        })
        .join("")}
        </div>
      </div>
    `;
}

function renderSection(section, summary) {
    switch (section.kind) {
        case "environment":
            return renderEnvironmentSection(summary);
        case "warm-delta":
            return renderWarmDeltaSection(summary);
        case "metric-table":
            return renderMetricTable(
                section.title,
                getByPath(summary, section.blockPath),
                section.metrics
            );
        case "runtime-marks":
            return renderRuntimeMarksSection(section, summary);
        case "failure-scenario":
            return renderFailureSection(section, summary);
        case "breakdown":
            return renderBreakdownSection(section, summary);
        default:
            return "";
    }
}

const arch = getArchitectureConfig(process.env.BENCH_ARCH ?? "mf");
const reportRoot = path.resolve(process.env.BENCH_REPORT_DIR ?? `benchmark-report/${arch.key}`);
const dataDir = path.join(reportRoot, "data");
const summaryPath = path.join(dataDir, "summary.json");

fs.mkdirSync(reportRoot, { recursive: true });

let body = `<p>Нет summary.json — сначала запусти benchmark.</p>`;
let links = {
    playwright: "playwright/index.html",
    lighthouseColdManifest: "lighthouse-cold/manifest.json",
    lighthouseWarmManifest: "lighthouse-warm/manifest.json",
};
let title = "Benchmark report";
let subtitle = "Сначала запусти benchmark.";

if (fs.existsSync(summaryPath)) {
    const summary = readJson(summaryPath);
    const archCfg = getArchitectureConfig(summary.architecture ?? arch.key);

    links = summary.links ?? links;
    title = `${archCfg.displayName} Benchmark report`;
    subtitle =
        `Архитектура: ${summary.architecture}. ` +
        `Сценарии: runtime=${summary.scenarios?.runtime ?? "—"}, ` +
        `failure=${summary.scenarios?.failure ?? "—"}, ` +
        `lighthouse cold=${summary.scenarios?.lighthouseCold ?? "—"}, ` +
        `lighthouse warm=${summary.scenarios?.lighthouseWarm ?? "—"}.`;

    body = DETAIL_SECTIONS.map((section) => renderSection(section, summary)).join("\n");
}

const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(title)}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 32px; line-height: 1.4; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 16px; max-width: 1180px; }
    .card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px 18px; }
    h1 { font-size: 22px; margin: 0 0 12px; }
    h2 { font-size: 16px; margin: 0 0 10px; }
    h3 { font-size: 14px; margin: 0 0 8px; }
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

    .columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .toplist {
      display: grid;
      gap: 6px;
      font-size: 13px;
    }

    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 6px;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="grid">
    <div class="card">
      <h1>${esc(title)}</h1>
      <div class="links">
        <a href="${links.playwright}">Playwright report</a>
        <a href="${links.lighthouseColdManifest}">Lighthouse cold manifest.json</a>
        <a href="${links.lighthouseWarmManifest}">Lighthouse warm manifest.json</a>
        <a href="data/summary.json">summary.json</a>
        <a href="../index.html">Общее сравнение</a>
      </div>
      <p class="muted">${esc(subtitle)}</p>
    </div>

    ${body}
  </div>
</body>
</html>
`;

fs.writeFileSync(path.join(reportRoot, "index.html"), html, "utf-8");
console.log(`Dashboard generated: ${path.join(reportRoot, "index.html")}`);