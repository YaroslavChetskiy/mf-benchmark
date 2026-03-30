export const BENCH_MARKS = {
    SHELL_READY: "shell_ready",
    MF_CATALOG_READY: "mf_catalog_ready",
    MF_PRODUCT_READY: "mf_product_ready",
    MF_CHECKOUT_READY: "mf_checkout_ready",
    FALLBACK_SHOWN: "fallback_shown"
} as const;

export type BenchMark = (typeof BENCH_MARKS)[keyof typeof BENCH_MARKS];
