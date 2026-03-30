export const LIGHTHOUSE_METRICS = [
    {
        key: "perfScore",
        label: "Performance score",
        format: "score",
        runValue: (run) => (run?.perfScore != null ? run.perfScore * 100 : null),
    },
    {
        key: "fcp",
        label: "FCP",
        format: "ms",
        runValue: (run) => run?.fcp,
    },
    {
        key: "lcp",
        label: "LCP",
        format: "ms",
        runValue: (run) => run?.lcp,
    },
    {
        key: "cls",
        label: "CLS",
        format: "float3",
        runValue: (run) => run?.cls,
    },
    {
        key: "tbt",
        label: "TBT",
        format: "ms",
        runValue: (run) => run?.tbt,
    },
    {
        key: "totalBytes",
        label: "Total bytes",
        format: "bytes",
        runValue: (run) => run?.totalBytes,
    },
    {
        key: "requests",
        label: "Requests",
        format: "int",
        runValue: (run) => run?.requests,
    },
];

export const RUNTIME_METRICS = [
    {
        key: "ttfb",
        label: "TTFB",
        format: "ms",
        runValue: (run) => run?.ttfb,
    },
    {
        key: "inp",
        label: "INP",
        format: "ms",
        runValue: (run) => run?.inp,
    },
    {
        key: "fcp",
        label: "Runtime FCP",
        format: "ms",
        runValue: (run) => run?.fcp,
    },
    {
        key: "lcp",
        label: "Runtime LCP",
        format: "ms",
        runValue: (run) => run?.lcp,
    },
    {
        key: "cls",
        label: "Runtime CLS",
        format: "float3",
        runValue: (run) => run?.cls,
    },
    {
        key: "durationMs",
        label: "Duration",
        format: "ms",
        runValue: (run) => run?.durationMs,
    },
    {
        key: "requests",
        label: "Requests",
        format: "int",
        runValue: (run) => run?.requests,
    },
    {
        key: "failedRequests",
        label: "Failed requests",
        format: "int",
        runValue: (run) => run?.failedRequests,
    },
    {
        key: "abortedRequests",
        label: "Aborted requests",
        format: "int",
        runValue: (run) => run?.abortedRequests,
    },
    {
        key: "hardFailedRequests",
        label: "Hard failed requests",
        format: "int",
        runValue: (run) => run?.hardFailedRequests,
    },
    {
        key: "transferBytes",
        label: "Transfer bytes (encoded, CDP)",
        format: "bytes",
        runValue: (run) => run?.transferBytes,
    },
];

export const FAILURE_METRICS = [
    {
        key: "timeToFallbackMs",
        label: "Time to fallback",
        format: "ms",
        runValue: (run) => run?.timeToFallbackMs,
    },
    {
        key: "timeToRecoveryMs",
        label: "Time to recovery",
        format: "ms",
        runValue: (run) => run?.timeToRecoveryMs,
    },
    {
        key: "requests",
        label: "Requests",
        format: "int",
        runValue: (run) => run?.requests,
    },
    {
        key: "failedRequests",
        label: "Failed requests",
        format: "int",
        runValue: (run) => run?.failedRequests,
    },
    {
        key: "abortedRequests",
        label: "Aborted requests",
        format: "int",
        runValue: (run) => run?.abortedRequests,
    },
    {
        key: "hardFailedRequests",
        label: "Hard failed requests",
        format: "int",
        runValue: (run) => run?.hardFailedRequests,
    },
    {
        key: "transferBytes",
        label: "Transfer bytes",
        format: "bytes",
        runValue: (run) => run?.transferBytes,
    },
];

export const RUNTIME_MARK_ROWS = [
    { key: "shellReadyRuns", label: "Shell ready runs" },
    { key: "mfCatalogReadyRuns", label: "Catalog ready runs" },
    { key: "mfProductReadyRuns", label: "Product ready runs" },
    { key: "mfCheckoutReadyRuns", label: "Checkout ready runs" },
    { key: "fallbackShownRuns", label: "Fallback shown runs" },
];

export const DETAIL_SECTIONS = [
    { kind: "environment" },
    { kind: "warm-delta" },
    {
        kind: "metric-table",
        title: "Lighthouse cold",
        blockPath: "lighthouse.cold",
        metrics: LIGHTHOUSE_METRICS,
    },
    {
        kind: "metric-table",
        title: "Lighthouse warm",
        blockPath: "lighthouse.warm",
        metrics: LIGHTHOUSE_METRICS,
    },
    {
        kind: "runtime-marks",
        title: "Runtime marks",
        rows: RUNTIME_MARK_ROWS,
    },
    {
        kind: "metric-table",
        title: "Runtime (Playwright + web-vitals)",
        blockPath: "runtime",
        metrics: RUNTIME_METRICS,
    },
    {
        kind: "failure-scenario",
        title: "Failure scenario",
        metrics: FAILURE_METRICS,
        groups: [
            { title: "Fallback signal kinds", path: "signalKinds" },
            { title: "Blocked URLs", path: "blockedUrls" },
            { title: "Error texts", path: "failureBreakdown.errorTexts" },
            { title: "Resource types", path: "failureBreakdown.resourceTypes" },
        ],
    },
    {
        kind: "breakdown",
        title: "Runtime request failures",
        path: "runtime.failureBreakdown",
        groups: [
            { title: "Error texts", path: "errorTexts" },
            { title: "Resource types", path: "resourceTypes" },
            { title: "Top aborted URLs", path: "topAbortedUrls" },
            { title: "Top hard failed URLs", path: "topHardFailedUrls" },
        ],
    },
];

export const AGGREGATE_RANKINGS = [
    {
        title: "Лучший p50 Lighthouse cold LCP",
        mode: "min",
        value: (item) => item.summary?.lighthouse?.cold?.lcp?.p50,
        label: (value) => `cold p50 LCP = ${value}`,
        format: "ms",
    },
    {
        title: "Лучший p50 Lighthouse warm LCP",
        mode: "min",
        value: (item) => item.summary?.lighthouse?.warm?.lcp?.p50,
        label: (value) => `warm p50 LCP = ${value}`,
        format: "ms",
    },
    {
        title: "Лучший p50 Lighthouse warm Performance Score",
        mode: "max",
        value: (item) => item.summary?.lighthouse?.warm?.perfScore?.p50,
        label: (value) => `warm p50 score = ${value}`,
        format: "score",
    },
    {
        title: "Лучшее улучшение warm vs cold по LCP",
        mode: "min",
        value: (item) => item.summary?.lighthouse?.deltas?.lcpP50DeltaMs,
        label: (value) => `delta LCP p50 = ${value}`,
        format: "ms",
    },
    {
        title: "Лучший p50 Runtime INP",
        mode: "min",
        value: (item) => item.summary?.runtime?.inp?.p50,
        label: (value) => `p50 INP = ${value}`,
        format: "ms",
    },
    {
        title: "Лучший p50 Runtime Duration",
        mode: "min",
        value: (item) => item.summary?.runtime?.durationMs?.p50,
        label: (value) => `p50 duration = ${value}`,
        format: "ms",
    },
    {
        title: "Минимум p50 Runtime Transfer Bytes",
        mode: "min",
        value: (item) => item.summary?.runtime?.transferBytes?.p50,
        label: (value) => `p50 bytes = ${value}`,
        format: "bytes",
    },
    {
        title: "Минимум p50 Runtime Hard Failed Requests",
        mode: "min",
        value: (item) => item.summary?.runtime?.hardFailedRequests?.p50,
        label: (value) => `p50 hard failed = ${value}`,
        format: "int",
    },
    {
        title: "Минимум p50 Time to fallback",
        mode: "min",
        value: (item) => item.summary?.failure?.timeToFallbackMs?.p50,
        label: (value) => `p50 fallback = ${value}`,
        format: "ms",
    },
    {
        title: "Минимум p50 Time to recovery",
        mode: "min",
        value: (item) => item.summary?.failure?.timeToRecoveryMs?.p50,
        label: (value) => `p50 recovery = ${value}`,
        format: "ms",
    },
    {
        title: "Максимум Recovery rate",
        mode: "max",
        value: (item) => item.summary?.failure?.recoveredRate,
        label: (value) => `recovery rate = ${value}`,
        format: "pct",
    },
];

export const AGGREGATE_TABLES = [
    {
        title: "Сравнение Lighthouse cold",
        columns: [
            { header: "Key", value: (item) => item.key },
            { header: "Architecture", value: (item) => item.arch.displayName },
            {
                header: "Perf score p50",
                value: (item) => item.summary?.lighthouse?.cold?.perfScore?.p50,
                format: "score",
            },
            {
                header: "LCP p50",
                value: (item) => item.summary?.lighthouse?.cold?.lcp?.p50,
                format: "ms",
            },
            {
                header: "FCP p50",
                value: (item) => item.summary?.lighthouse?.cold?.fcp?.p50,
                format: "ms",
            },
            {
                header: "TBT p50",
                value: (item) => item.summary?.lighthouse?.cold?.tbt?.p50,
                format: "ms",
            },
            {
                header: "Total bytes p50",
                value: (item) => item.summary?.lighthouse?.cold?.totalBytes?.p50,
                format: "bytes",
            },
            { header: "Links", kind: "links", includePlaywright: false },
        ],
    },
    {
        title: "Сравнение Lighthouse warm",
        columns: [
            { header: "Key", value: (item) => item.key },
            { header: "Architecture", value: (item) => item.arch.displayName },
            {
                header: "Perf score p50",
                value: (item) => item.summary?.lighthouse?.warm?.perfScore?.p50,
                format: "score",
            },
            {
                header: "LCP p50",
                value: (item) => item.summary?.lighthouse?.warm?.lcp?.p50,
                format: "ms",
            },
            {
                header: "FCP p50",
                value: (item) => item.summary?.lighthouse?.warm?.fcp?.p50,
                format: "ms",
            },
            {
                header: "TBT p50",
                value: (item) => item.summary?.lighthouse?.warm?.tbt?.p50,
                format: "ms",
            },
            {
                header: "Total bytes p50",
                value: (item) => item.summary?.lighthouse?.warm?.totalBytes?.p50,
                format: "bytes",
            },
            {
                header: "LCP warm-cold delta",
                value: (item) => item.summary?.lighthouse?.deltas?.lcpP50DeltaMs,
                format: "ms",
            },
            { header: "Links", kind: "links", includePlaywright: false },
        ],
    },
    {
        title: "Сравнение Runtime",
        columns: [
            { header: "Key", value: (item) => item.key },
            { header: "Architecture", value: (item) => item.arch.displayName },
            {
                header: "INP p50",
                value: (item) => item.summary?.runtime?.inp?.p50,
                format: "ms",
            },
            {
                header: "Duration p50",
                value: (item) => item.summary?.runtime?.durationMs?.p50,
                format: "ms",
            },
            {
                header: "Requests p50",
                value: (item) => item.summary?.runtime?.requests?.p50,
                format: "int",
            },
            {
                header: "Transfer bytes p50",
                value: (item) => item.summary?.runtime?.transferBytes?.p50,
                format: "bytes",
            },
            {
                header: "Failed p50",
                value: (item) => item.summary?.runtime?.failedRequests?.p50,
                format: "int",
            },
            {
                header: "Aborted p50",
                value: (item) => item.summary?.runtime?.abortedRequests?.p50,
                format: "int",
            },
            {
                header: "Hard failed p50",
                value: (item) => item.summary?.runtime?.hardFailedRequests?.p50,
                format: "int",
            },
            {
                header: "Fallback runs",
                value: (item) => item.summary?.runtime?.marks?.fallbackShownRuns,
                format: "int",
            },
            { header: "Links", kind: "links", includePlaywright: true },
        ],
    },
    {
        title: "Сравнение failure-сценария",
        columns: [
            { header: "Key", value: (item) => item.key },
            { header: "Architecture", value: (item) => item.arch.displayName },
            {
                header: "Fallback shown rate",
                value: (item) => item.summary?.failure?.fallbackShownRate,
                format: "pct",
            },
            {
                header: "Recovery rate",
                value: (item) => item.summary?.failure?.recoveredRate,
                format: "pct",
            },
            {
                header: "Time to fallback p50",
                value: (item) => item.summary?.failure?.timeToFallbackMs?.p50,
                format: "ms",
            },
            {
                header: "Time to recovery p50",
                value: (item) => item.summary?.failure?.timeToRecoveryMs?.p50,
                format: "ms",
            },
            {
                header: "Failure requests p50",
                value: (item) => item.summary?.failure?.requests?.p50,
                format: "int",
            },
            {
                header: "Failure failed p50",
                value: (item) => item.summary?.failure?.failedRequests?.p50,
                format: "int",
            },
            {
                header: "Failure transfer bytes p50",
                value: (item) => item.summary?.failure?.transferBytes?.p50,
                format: "bytes",
            },
            { header: "Links", kind: "links", includePlaywright: true },
        ],
    },
];