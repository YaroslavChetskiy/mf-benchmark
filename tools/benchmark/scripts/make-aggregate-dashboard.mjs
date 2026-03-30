import fs from "node:fs";
import path from "node:path";
import {
    ARCH_ORDER,
    ARCHITECTURES,
} from "./benchmark-config.mjs";
import {
    AGGREGATE_RANKINGS,
    AGGREGATE_TABLES,
} from "./dashboard-schema.mjs";
import {
    esc,
    formatValue,
} from "./dashboard-utils.mjs";

function readJsonIfExists(p) {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function isFiniteNumber(x) {
    return x != null && Number.isFinite(x);
}

function approxEqual(a, b, epsilon = 1e-9) {
    return Math.abs(a - b) <= epsilon;
}

function pickWithTies(items, ranking) {
    const valid = items.filter((item) => isFiniteNumber(ranking.value(item)));
    if (valid.length === 0) return null;

    const values = valid.map((item) => ranking.value(item));
    const bestValue =
        ranking.mode === "max"
            ? Math.max(...values)
            : Math.min(...values);

    const winners = valid.filter((item) =>
        approxEqual(ranking.value(item), bestValue)
    );

    return { value: bestValue, winners };
}

function renderLinksCell(item, { includePlaywright }) {
    if (!item.summary) {
        return `<span class="muted">нет данных</span>`;
    }

    return `
      <a href="${item.key}/index.html">dashboard</a>
      ${includePlaywright ? `<a href="${item.key}/playwright/index.html">playwright</a>` : ""}
      <a href="${item.key}/data/summary.json">summary</a>
    `;
}

function renderRankingCard(def, items) {
    const result = pickWithTies(items, def);

    if (!result || result.winners.length === 0) {
        return `
          <div class="card">
            <h2>${esc(def.title)}</h2>
            <p class="muted">Недостаточно данных.</p>
          </div>
        `;
    }

    const names = result.winners.map((winner) => winner.arch.displayName);
    const label =
        names.length === 1
            ? names[0]
            : `Ничья: ${names.join(", ")}`;

    const links =
        result.winners.length === 1
            ? `
                <div class="links">
                  <a href="${result.winners[0].key}/index.html">Открыть dashboard</a>
                </div>
              `
            : `
                <div class="links">
                  ${result.winners
                .map(
                    (winner) =>
                        `<a href="${winner.key}/index.html">${esc(winner.arch.displayName)}</a>`
                )
                .join("")}
                </div>
              `;

    return `
      <div class="card">
        <h2>${esc(def.title)}</h2>
        <p><strong>${esc(label)}</strong></p>
        <p class="muted">${esc(def.label(formatValue(def.format, result.value)))}</p>
        ${links}
      </div>
    `;
}

function renderAggregateTable(def, items) {
    const rows = items
        .map((item) => {
            if (!item.summary) {
                return `
                  <tr>
                    <td>${esc(item.key)}</td>
                    <td>${esc(item.arch.displayName)}</td>
                    ${def.columns
                    .slice(2, -1)
                    .map(() => "<td>—</td>")
                    .join("")}
                    <td><span class="muted">нет данных</span></td>
                  </tr>
                `;
            }

            const cells = def.columns
                .map((col) => {
                    if (col.kind === "links") {
                        return `<td class="links">${renderLinksCell(item, col)}</td>`;
                    }

                    const raw = col.value(item);
                    const rendered = col.format
                        ? formatValue(col.format, raw)
                        : raw == null
                            ? "—"
                            : esc(String(raw));

                    return `<td>${rendered}</td>`;
                })
                .join("");

            return `<tr>${cells}</tr>`;
        })
        .join("");

    return `
      <div class="card">
        <h2>${esc(def.title)}</h2>
        <table>
          <thead>
            <tr>
              ${def.columns.map((col) => `<th>${esc(col.header)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
}

const reportRoot = path.resolve(process.env.BENCH_REPORT_ROOT ?? "benchmark-report");
fs.mkdirSync(reportRoot, { recursive: true });

const items = ARCH_ORDER.map((key) => {
    const arch = ARCHITECTURES[key];
    const summaryPath = path.join(reportRoot, key, "data", "summary.json");
    const summary = readJsonIfExists(summaryPath);
    return { key, arch, summary };
});

const overviewCards = items.map((item) => {
    if (!item.summary) {
        return `
          <div class="card">
            <h2>${esc(item.arch.displayName)}</h2>
            <p class="muted">Пока нет summary.json для архитектуры ${esc(item.key)}.</p>
            <p><code>pnpm bench:${esc(item.key)}</code></p>
          </div>
        `;
    }

    return `
      <div class="card">
        <h2>${esc(item.arch.displayName)}</h2>
        <p class="muted">
          Runtime: ${esc(item.summary.scenarios?.runtime ?? "—")}<br/>
          Failure: ${esc(item.summary.scenarios?.failure ?? "—")}<br/>
          Lighthouse cold: ${esc(item.summary.scenarios?.lighthouseCold ?? "—")}<br/>
          Lighthouse warm: ${esc(item.summary.scenarios?.lighthouseWarm ?? "—")}<br/>
          Generated: ${esc(item.summary.generatedAt ?? "—")}
        </p>
        <div class="links">
          <a href="${item.key}/index.html">Открыть dashboard</a>
          <a href="${item.key}/playwright/index.html">Playwright</a>
          <a href="${item.key}/data/summary.json">summary.json</a>
        </div>
      </div>
    `;
}).join("");

const rankedItems = items.filter((item) => item.summary);
const rankingCards = AGGREGATE_RANKINGS
    .map((def) => renderRankingCard(def, rankedItems))
    .join("");

const aggregateTables = AGGREGATE_TABLES
    .map((def) => renderAggregateTable(def, items))
    .join("");

const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Benchmark comparison</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 32px; line-height: 1.4; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 16px; max-width: 1320px; }
    .card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px 18px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    h1 { font-size: 24px; margin: 0 0 12px; }
    h2 { font-size: 16px; margin: 0 0 10px; }
    p { margin: 0 0 10px; }
    .muted { color: #6b7280; font-size: 12px; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .links a { margin-right: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { border-bottom: 1px solid #eee; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #fafafa; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="grid">
    <div class="card">
      <h1>Сравнение архитектур benchmark</h1>
      <p>
        Главная страница со сводным сравнением архитектур по лабораторным метрикам загрузки
        для cold и warm start, runtime-метрикам пользовательского сценария и сценарию отказа продуктового модуля.
      </p>
      <div class="links">
        <a href="mf/index.html">MF dashboard</a>
        <a href="spa/index.html">SPA dashboard</a>
        <a href="iframe/index.html">iframe dashboard</a>
        <a href="bridge/index.html">React Bridge dashboard</a>
      </div>
    </div>

    <div class="cards">
      ${rankingCards}
    </div>

    <div class="cards">
      ${overviewCards}
    </div>

    ${aggregateTables}
  </div>
</body>
</html>
`;

fs.writeFileSync(path.join(reportRoot, "index.html"), html, "utf-8");
console.log(`Aggregate dashboard generated: ${path.join(reportRoot, "index.html")}`);