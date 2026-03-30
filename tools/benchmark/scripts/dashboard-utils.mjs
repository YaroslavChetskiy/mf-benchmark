export function esc(x) {
    return String(x ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

export function getByPath(obj, path) {
    if (!path) return obj;
    return String(path)
        .split(".")
        .reduce((acc, key) => acc?.[key], obj);
}

export function fmtMs(x) {
    if (x == null) return "—";
    return `${Math.round(x)} ms`;
}

export function fmtNum(x, digits = 0) {
    if (x == null) return "—";
    return Number(x).toFixed(digits);
}

export function fmtPct(x) {
    if (x == null) return "—";
    return `${Math.round(x * 100)}%`;
}

export function fmtBytes(x) {
    if (x == null) return "—";
    const kb = x / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(1)} KB`;
}

export function fmtBytesAxis(x) {
    if (x == null) return "—";
    const kb = x / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${kb.toFixed(1)} KB`;
}

export function formatValue(kind, value, { axis = false } = {}) {
    switch (kind) {
        case "ms":
            return fmtMs(value);
        case "bytes":
            return axis ? fmtBytesAxis(value) : fmtBytes(value);
        case "pct":
            return fmtPct(value);
        case "int":
            return value == null ? "—" : `${Math.round(value)}`;
        case "float3":
            return value == null ? "—" : fmtNum(value, 3);
        case "score":
            if (value == null) return "—";
            return axis ? Number(value).toFixed(1) : `${Math.round(value)}`;
        default:
            return value == null ? "—" : String(value);
    }
}

export function toFiniteNumbers(arr) {
    return (arr ?? []).filter((v) => typeof v === "number" && Number.isFinite(v));
}

function chooseBins(n) {
    const b = Math.round(Math.sqrt(Math.max(1, n)) * 3);
    return Math.min(16, Math.max(5, b));
}

export function histogramSvg(values, { labelX, fmtX } = {}) {
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

export function renderTopList(items, formatter = (x) => x.key) {
    if (!items || items.length === 0) {
        return `<div class="muted">—</div>`;
    }

    return `
      <div class="toplist">
        ${items
        .map(
            (x) =>
                `<div><code>${esc(formatter(x))}</code> <span class="muted">× ${x.count}</span></div>`
        )
        .join("")}
      </div>
    `;
}