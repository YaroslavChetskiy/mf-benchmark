import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const RUNS = Number(process.env.BENCH_RUNS ?? "5");

function ensureDir(p: string) {
    fs.mkdirSync(p, { recursive: true });
}

test.describe("benchmark: vite counter click", () => {
    for (let i = 1; i <= RUNS; i++) {
        test(`run #${i}`, async ({ page, browserName }) => {
            if (browserName !== "chromium") test.skip();

            const runDir = path.resolve("benchmark-report/data/runs");
            ensureDir(runDir);

            let requests = 0;
            let responses = 0;
            let failed = 0;

            const cdp = await page.context().newCDPSession(page);
            await cdp.send("Network.enable");

            let transferBytes = 0;
            cdp.on("Network.loadingFinished", (e: any) => {
                transferBytes += e?.encodedDataLength ?? 0;
            });

            page.on("request", () => { requests += 1; });
            page.on("response", () => { responses += 1; });
            page.on("requestfailed", () => { failed += 1; });

            const startedAt = Date.now();

            await page.goto("/");

            const button = page.getByRole("button", { name: /count is/i });
            await expect(button).toBeVisible();

            await button.click();
            await expect(button).toHaveText(/count is 1/i);

            await page.waitForFunction(() => {
                // @ts-ignore
                return window.__benchVitals?.inp?.value != null;
            }, { timeout: 10_000 });

            const vitals = await page.evaluate(() => {
                // @ts-ignore
                return window.__benchVitals ?? null;
            });

            const finishedAt = Date.now();

            const run = {
                scenario: "click-counter",
                runIndex: i,
                startedAt,
                finishedAt,
                durationMs: finishedAt - startedAt,
                url: page.url(),
                vitals,
                network: {
                    requests,
                    responses,
                    failed,
                    transferBytes,
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
