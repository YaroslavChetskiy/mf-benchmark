import { spawn, spawnSync } from "node:child_process";

export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function spawnPnpm(args, opts = {}) {
    if (process.platform === "win32") {
        return spawn("cmd.exe", ["/d", "/s", "/c", "pnpm", ...args], {
            windowsHide: true,
            ...opts,
        });
    }

    return spawn("pnpm", args, opts);
}

export function runPnpm(args, { cwd = process.cwd(), env = {} } = {}) {
    return new Promise((resolve, reject) => {
        const p = spawnPnpm(args, {
            cwd,
            stdio: "inherit",
            env: {
                ...process.env,
                ...env,
            },
        });

        p.on("error", reject);
        p.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`pnpm ${args.join(" ")} failed with exit code ${code}`));
        });
    });
}

export function startBackgroundPnpm(args, { cwd = process.cwd(), env = {} } = {}) {
    const p = spawnPnpm(args, {
        cwd,
        stdio: "ignore",
        detached: process.platform !== "win32",
        env: {
            ...process.env,
            ...env,
        },
    });

    p.unref();
    return p;
}

export async function waitForUrl(url, timeoutMs = 120000) {
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
        try {
            const res = await fetch(url, { method: "GET" });
            if (res.ok) return;
        } catch {
            // ignore
        }

        await sleep(500);
    }

    throw new Error(`Timeout waiting for ${url}`);
}

export async function waitForUrls(urls, timeoutMs = 120000) {
    for (const url of urls) {
        await waitForUrl(url, timeoutMs);
    }
}

export function killTree(child) {
    if (!child?.pid) return;

    try {
        if (process.platform === "win32") {
            spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
                stdio: "ignore",
            });
        } else {
            process.kill(child.pid, "SIGKILL");
        }
    } catch {
        // ignore
    }
}

export async function stopProcessTree(child, settleMs = 1500) {
    if (!child?.pid) return;
    killTree(child);
    await sleep(settleMs);
}