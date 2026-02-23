import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

type BenchMetric = {
    value: number;
    rating?: string;
    delta?: number;
    id?: string;
    navigationType?: string;
    at: number;
};

type BenchVitals = Partial<Record<"cls" | "fcp" | "inp" | "lcp" | "ttfb", BenchMetric>>;

declare global {
    interface Window {
        __benchVitals?: BenchVitals;
    }
}

function save(name: keyof BenchVitals, m: Metric) {
    window.__benchVitals ??= {};
    window.__benchVitals[name] = {
        value: m.value,
        rating: (m as any).rating,
        delta: (m as any).delta,
        id: m.id,
        navigationType: (m as any).navigationType,
        at: Date.now(),
    };
}

export function initBenchVitals() {
    onCLS((m) => save("cls", m), { reportAllChanges: true });
    onFCP((m) => save("fcp", m));
    onLCP((m) => save("lcp", m), { reportAllChanges: true });
    onINP((m) => save("inp", m), { reportAllChanges: true });
    onTTFB((m) => save("ttfb", m));
}
