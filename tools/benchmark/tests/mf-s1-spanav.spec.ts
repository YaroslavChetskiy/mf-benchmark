import { test, expect, type Page, type Frame, type FrameLocator } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const RUNS = Number(process.env.BENCH_RUNS ?? "5");
const ARCH = process.env.BENCH_ARCH ?? "mf";
const RUNTIME_SCENARIO = process.env.BENCH_RUNTIME_SCENARIO ?? "s1-spanav";
const REPORT_DIR =
    process.env.BENCH_REPORT_DIR ??
    `benchmark-report/${ARCH}`;

type ModuleId = "catalog" | "product" | "checkout";
type TestRoot = Pick<Page, "getByTestId"> | Pick<FrameLocator, "getByTestId">;
type PageOrFrame = Page | Frame;

type BenchMetricName = "cls" | "fcp" | "inp" | "lcp" | "ttfb";

type BenchMetric = {
    value: number;
    rating?: string;
    delta?: number;
    id?: string;
    navigationType?: string;
    at?: number;
    sourceContext?: string;
    sourceContexts?: string[];
};

type BenchVitals = Partial<Record<BenchMetricName, BenchMetric>>;

type CollectedVitals = {
    mode: "top-level" | "iframe-composite";
    rules: Record<BenchMetricName, string>;
    contexts: Record<string, BenchVitals | null>;
    aggregated: BenchVitals | null;
};

function ensureDir(p: string) {
    fs.mkdirSync(p, { recursive: true });
}

function isIframeArch(): boolean {
    return ARCH === "iframe";
}

function rootFor(page: Page, moduleId: ModuleId): TestRoot {
    if (isIframeArch()) {
        return page.frameLocator(`[data-testid="iframe-${moduleId}"]`);
    }
    return page;
}

async function waitModuleReady(page: Page, moduleId: ModuleId) {
    if (!isIframeArch()) return;
    await expect(page.getByTestId(`iframe-${moduleId}`)).toBeVisible({ timeout: 15_000 });
}

async function getIframeFrame(page: Page, moduleId: ModuleId): Promise<Frame> {
    const locator = page.getByTestId(`iframe-${moduleId}`);

    await locator.waitFor({ state: "attached", timeout: 15_000 });

    await expect
        .poll(
            async () => {
                const handle = await locator.elementHandle();
                if (!handle) return false;
                const frame = await handle.contentFrame();
                return !!frame;
            },
            {
                timeout: 15_000,
                message: `contentFrame() is null for iframe "${moduleId}"`,
            }
        )
        .toBe(true);

    const handle = await locator.elementHandle();
    if (!handle) {
        throw new Error(`Iframe element not found for module "${moduleId}"`);
    }

    const frame = await handle.contentFrame();
    if (!frame) {
        throw new Error(`contentFrame() is null for module "${moduleId}"`);
    }

    return frame;
}

async function waitForInp(target: PageOrFrame, timeoutMs = 10_000) {
    await target.waitForFunction(() => {
        // @ts-ignore
        return window.__benchVitals?.inp?.value != null;
    }, { timeout: timeoutMs });
}

async function readBenchVitals(target: PageOrFrame): Promise<BenchVitals | null> {
    return await target.evaluate(() => {
        // @ts-ignore
        return window.__benchVitals ?? null;
    });
}

function isFiniteMetric(x: BenchMetric | null | undefined): x is BenchMetric {
    return !!x && typeof x.value === "number" && Number.isFinite(x.value);
}

function pickMaxMetric(
    contexts: Record<string, BenchVitals | null>,
    metricName: Exclude<BenchMetricName, "cls">
): BenchMetric | undefined {
    let best: { source: string; metric: BenchMetric } | null = null;

    for (const [source, vitals] of Object.entries(contexts)) {
        const metric = vitals?.[metricName];
        if (!isFiniteMetric(metric)) continue;

        if (!best || metric.value > best.metric.value) {
            best = { source, metric };
        }
    }

    if (!best) return undefined;

    return {
        ...best.metric,
        sourceContext: best.source,
    };
}

function sumClsMetric(contexts: Record<string, BenchVitals | null>): BenchMetric | undefined {
    const parts: Array<{ source: string; metric: BenchMetric }> = [];

    for (const [source, vitals] of Object.entries(contexts)) {
        const metric = vitals?.cls;
        if (!isFiniteMetric(metric)) continue;
        parts.push({ source, metric });
    }

    if (parts.length === 0) return undefined;

    return {
        value: parts.reduce((acc, x) => acc + x.metric.value, 0),
        delta: parts.reduce((acc, x) => acc + (x.metric.delta ?? x.metric.value), 0),
        at: parts.reduce((acc, x) => Math.max(acc, x.metric.at ?? 0), 0),
        sourceContexts: parts.map((x) => x.source),
    };
}

function aggregateIframeVitals(contexts: Record<string, BenchVitals | null>): BenchVitals | null {
    const aggregated: BenchVitals = {};

    const ttfb = pickMaxMetric(contexts, "ttfb");
    if (ttfb) aggregated.ttfb = ttfb;

    const fcp = pickMaxMetric(contexts, "fcp");
    if (fcp) aggregated.fcp = fcp;

    const lcp = pickMaxMetric(contexts, "lcp");
    if (lcp) aggregated.lcp = lcp;

    const inp = pickMaxMetric(contexts, "inp");
    if (inp) aggregated.inp = inp;

    const cls = sumClsMetric(contexts);
    if (cls) aggregated.cls = cls;

    return Object.keys(aggregated).length > 0 ? aggregated : null;
}

async function collectVitals(page: Page): Promise<CollectedVitals> {
    if (!isIframeArch()) {
        await waitForInp(page);

        const top = await readBenchVitals(page);

        return {
            mode: "top-level",
            rules: {
                ttfb: "top-level-page",
                fcp: "top-level-page",
                lcp: "top-level-page",
                inp: "top-level-page",
                cls: "top-level-page",
            },
            contexts: {
                top,
            },
            aggregated: top,
        };
    }

    const modules: ModuleId[] = ["catalog", "product", "checkout"];

    const checkoutFrame = await getIframeFrame(page, "checkout");
    await waitForInp(checkoutFrame);

    const contexts: Record<string, BenchVitals | null> = {
        shell: await readBenchVitals(page),
    };

    for (const moduleId of modules) {
        const frame = await getIframeFrame(page, moduleId);
        contexts[moduleId] = await readBenchVitals(frame);
    }

    return {
        mode: "iframe-composite",
        rules: {
            ttfb: "max(shell,catalog,product,checkout)",
            fcp: "max(shell,catalog,product,checkout)",
            lcp: "max(shell,catalog,product,checkout)",
            inp: "max(shell,catalog,product,checkout)",
            cls: "sum(shell,catalog,product,checkout)",
        },
        contexts,
        aggregated: aggregateIframeVitals(contexts),
    };
}

test.describe(`benchmark: ${ARCH} ${RUNTIME_SCENARIO}`, () => {
    for (let i = 1; i <= RUNS; i++) {
        test(`run #${i}`, async ({ page, browserName }) => {
            if (browserName !== "chromium") test.skip();

            const runDir = path.resolve(REPORT_DIR, "data/runs");
            ensureDir(runDir);

            let requests = 0;
            let responses = 0;
            let failed = 0;
            const failedRequestsDetails: Array<{
                url: string;
                method: string;
                resourceType: string;
                errorText: string | null;
            }> = [];

            const cdp = await page.context().newCDPSession(page);
            await cdp.send("Network.enable");

            let transferBytes = 0;
            cdp.on("Network.loadingFinished", (e: any) => {
                transferBytes += e?.encodedDataLength ?? 0;
            });

            page.on("request", () => {
                requests += 1;
            });

            page.on("response", () => {
                responses += 1;
            });

            page.on("requestfailed", (req) => {
                failed += 1;
                failedRequestsDetails.push({
                    url: req.url(),
                    method: req.method(),
                    resourceType: req.resourceType(),
                    errorText: req.failure()?.errorText ?? null,
                });
            });

            const startedAt = Date.now();

            await page.goto("/catalog");

            await expect(page.getByTestId("shell-header")).toBeVisible();

            await waitModuleReady(page, "catalog");
            const catalogRoot = rootFor(page, "catalog");
            await expect(catalogRoot.getByTestId("catalog-page")).toBeVisible({ timeout: 15_000 });

            await catalogRoot.getByTestId("product-card-p001").click();

            await waitModuleReady(page, "product");
            const productRoot = rootFor(page, "product");
            await expect(productRoot.getByTestId("product-page")).toBeVisible({ timeout: 15_000 });

            await productRoot.getByTestId("product-add-to-cart").click();
            await expect(page.getByTestId("toast-item").first()).toBeVisible();

            await productRoot.getByTestId("product-go-to-cart").click();

            await waitModuleReady(page, "checkout");
            const checkoutRoot = rootFor(page, "checkout");
            await expect(checkoutRoot.getByTestId("cart-page")).toBeVisible({ timeout: 15_000 });
            await expect(checkoutRoot.getByTestId("cart-line-p001")).toBeVisible();

            await checkoutRoot.getByTestId("cart-go-checkout").click();
            await expect(checkoutRoot.getByTestId("checkout-page")).toBeVisible({ timeout: 15_000 });

            await checkoutRoot.getByTestId("checkout-email").fill("bench@example.com");
            await checkoutRoot.getByTestId("checkout-address").fill("Amsterdam Test Street 1");
            await checkoutRoot.getByTestId("checkout-submit").click();

            await expect(checkoutRoot.getByTestId("success-page")).toBeVisible({ timeout: 15_000 });

            const vitalsCollected = await collectVitals(page);

            const marks = await page.evaluate(() => {
                const names = [
                    "shell_ready",
                    "mf_catalog_ready",
                    "mf_product_ready",
                    "mf_checkout_ready",
                    "fallback_shown",
                ] as const;

                const result: Record<string, number> = {};
                for (const name of names) {
                    result[name] = performance.getEntriesByName(name).length;
                }
                return result;
            });

            const finishedAt = Date.now();

            const run = {
                architecture: ARCH,
                scenario: RUNTIME_SCENARIO,
                runIndex: i,
                startedAt,
                finishedAt,
                durationMs: finishedAt - startedAt,
                url: page.url(),
                vitals: vitalsCollected.aggregated,
                vitalsCollection: {
                    mode: vitalsCollected.mode,
                    rules: vitalsCollected.rules,
                    contexts: vitalsCollected.contexts,
                },
                marks,
                network: {
                    requests,
                    responses,
                    failed,
                    transferBytes,
                    failedRequestsDetails,
                },
            };

            fs.writeFileSync(
                path.join(runDir, `run-${String(i).padStart(4, "0")}.json`),
                JSON.stringify(run, null, 2),
                "utf-8"
            );
        });
    }
});