import { test, expect, type Page, type Locator, type FrameLocator } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const RUNS = Number(process.env.BENCH_RUNS ?? "5");
const ARCH = process.env.BENCH_ARCH ?? "mf";
const REPORT_DIR = process.env.BENCH_REPORT_DIR
    ? path.resolve(process.env.BENCH_REPORT_DIR)
    : path.resolve("benchmark-report");
const SCENARIO = "s2-failure-product";

type TestRoot = Pick<Page, "getByTestId"> | Pick<FrameLocator, "getByTestId">;

const FALLBACK_TIMEOUT_MS = ARCH === "iframe" ? 10_000 : 5_000;

function ensureDir(p: string) {
    fs.mkdirSync(p, { recursive: true });
}

function isAborted(errorText: string | undefined): boolean {
    return typeof errorText === "string" && errorText.includes("ERR_ABORTED");
}

function countMarksByName(entries: Array<{ name?: string }>): Record<string, number> {
    const result: Record<string, number> = {};
    for (const e of entries) {
        const name = e?.name;
        if (!name) continue;
        result[name] = (result[name] ?? 0) + 1;
    }
    return result;
}

function isIframeArch(arch: string): boolean {
    return arch === "iframe";
}

function tryParseUrl(raw: string): URL | null {
    try {
        return new URL(raw);
    } catch {
        return null;
    }
}

function hasPort(raw: string, port: string): boolean {
    const url = tryParseUrl(raw);
    return url?.port === port;
}

function productFailureMatcher(url: string, arch: string): boolean {
    if (arch === "mf") {
        return (
            hasPort(url, "5102") ||
            url.includes("mf_product") ||
            url.includes("ProductPage")
        );
    }

    if (arch === "spa") {
        return hasPort(url, "5202");
    }

    if (arch === "iframe") {
        return hasPort(url, "5302");
    }

    if (arch === "bridge") {
        return hasPort(url, "5402") || url.includes("rb_product");
    }

    return false;
}

function catalogRoot(page: Page): TestRoot {
    if (isIframeArch(ARCH)) {
        return page.frameLocator('iframe[title="catalog"]');
    }
    return page;
}

async function expectCatalogVisible(page: Page) {
    const root = catalogRoot(page);
    await expect(root.getByTestId("catalog-page")).toBeVisible({ timeout: 10_000 });
}

async function clickProductFromCatalog(page: Page, productId: string) {
    const root = catalogRoot(page);
    await root.getByTestId(`product-card-${productId}`).click();
}

function fallbackLocator(page: Page): Locator {
    if (isIframeArch(ARCH)) {
        return page
            .getByTestId("iframe-host-product")
            .getByTestId("module-fallback");
    }

    return page.getByTestId("module-fallback");
}

async function waitForFallbackSignal(page: Page) {
    const fallback = fallbackLocator(page);
    await expect(fallback).toBeVisible({ timeout: FALLBACK_TIMEOUT_MS });
    return { kind: "ui" as const };
}

async function recoverToCatalog(page: Page) {
    const fallbackCatalogButton = page.getByTestId("module-fallback-go-catalog");

    if (await fallbackCatalogButton.count()) {
        await fallbackCatalogButton.first().click();
        return;
    }

    const shellCatalogLink = page.getByRole("link", { name: /^Каталог$/ });
    await shellCatalogLink.first().click();
}

test.describe(`benchmark: ${ARCH} ${SCENARIO}`, () => {
    test.setTimeout(30_000);

    for (let i = 1; i <= RUNS; i++) {
        test(`run #${i}`, async ({ page, browserName }) => {
            if (browserName !== "chromium") test.skip();

            const runDir = path.resolve(REPORT_DIR, "data", "failure-runs", SCENARIO);
            ensureDir(runDir);

            let requests = 0;
            let responses = 0;
            let failed = 0;
            let transferBytes = 0;

            const blockedUrls: string[] = [];
            const failedRequestsDetails: Array<{
                url: string;
                method: string;
                resourceType: string;
                errorText?: string;
            }> = [];

            const pageErrors: string[] = [];
            const consoleErrors: string[] = [];

            page.on("pageerror", (err) => {
                pageErrors.push(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
            });

            page.on("console", (msg) => {
                if (msg.type() === "error") {
                    consoleErrors.push(msg.text());
                }
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
                    errorText: req.failure()?.errorText,
                });
            });

            const cdp = await page.context().newCDPSession(page);
            await cdp.send("Network.enable");
            cdp.on("Network.loadingFinished", (e: any) => {
                transferBytes += e?.encodedDataLength ?? 0;
            });

            await page.route("**/*", async (route) => {
                const url = route.request().url();

                if (productFailureMatcher(url, ARCH)) {
                    blockedUrls.push(url);
                    await route.abort("failed");
                    return;
                }

                await route.continue();
            });

            const startedAt = Date.now();

            await page.goto("/catalog");
            await expect(page.getByTestId("shell-header")).toBeVisible({ timeout: 10_000 });
            await expectCatalogVisible(page);

            const failActionStartedAt = Date.now();

            await clickProductFromCatalog(page, "p001");

            const fallbackSignal = await waitForFallbackSignal(page);

            const fallbackShownAt = Date.now();
            const timeToFallbackMs = fallbackShownAt - failActionStartedAt;

            await recoverToCatalog(page);
            await expectCatalogVisible(page);

            const recoveredAt = Date.now();
            const timeToRecoveryMs = recoveredAt - fallbackShownAt;

            const markEntries = await page.evaluate(() => {
                return performance.getEntriesByType("mark").map((e) => ({ name: e.name }));
            });

            const marks = countMarksByName(markEntries);

            const finishedAt = Date.now();

            const abortedRequests = failedRequestsDetails.filter((x) => isAborted(x.errorText)).length;
            const hardFailedRequests = failedRequestsDetails.length - abortedRequests;

            const run = {
                architecture: ARCH,
                scenario: SCENARIO,
                runIndex: i,
                startedAt,
                finishedAt,
                durationMs: finishedAt - startedAt,
                url: page.url(),

                result: {
                    fallbackShown: true,
                    fallbackSignal: fallbackSignal.kind,
                    recoveredToCatalog: true,
                    timeToFallbackMs,
                    timeToRecoveryMs,
                },

                injection: {
                    moduleId: "product",
                    blockedUrls,
                },

                marks,

                network: {
                    requests,
                    responses,
                    failed,
                    abortedRequests,
                    hardFailedRequests,
                    transferBytes,
                    failedRequestsDetails,
                },

                errors: {
                    pageErrors,
                    consoleErrors,
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