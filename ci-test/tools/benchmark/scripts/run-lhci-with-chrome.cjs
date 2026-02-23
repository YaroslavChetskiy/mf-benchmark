const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");

async function resolveChromePath() {
    const envPath = process.env.CHROME_PATH || process.env.CHROME_BIN;
    if (envPath && fs.existsSync(envPath)) return envPath;


    try {
        const chromeLauncher = require("chrome-launcher");

        const L = chromeLauncher.Launcher;
        if (L?.getFirstInstallation) {
            const p = L.getFirstInstallation();
            if (p && fs.existsSync(p)) return p;
        }

        if (L?.getInstallations) {
            const installs = L.getInstallations();
            const list = typeof installs?.then === "function" ? await installs : installs;
            if (Array.isArray(list) && list[0] && fs.existsSync(list[0])) return list[0];
        }
    } catch (_) {}

    if (process.platform === "win32") {
        const candidates = [
            path.join(process.env.PROGRAMFILES || "", "Google/Chrome/Application/chrome.exe"),
            path.join(process.env["PROGRAMFILES(X86)"] || "", "Google/Chrome/Application/chrome.exe"),
            path.join(process.env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe"),
        ].filter(Boolean);

        for (const p of candidates) {
            if (fs.existsSync(p)) return p;
        }
    }

    throw new Error("Chrome executable not found (set CHROME_PATH if needed).");
}

function waitPort(port, timeoutMs) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const tick = () => {
            const socket = net.createConnection({ host: "127.0.0.1", port });
            socket.once("connect", () => {
                socket.destroy();
                resolve();
            });
            socket.once("error", () => {
                socket.destroy();
                if (Date.now() - start > timeoutMs) return reject(new Error(`Chrome port ${port} not open in ${timeoutMs}ms`));
                setTimeout(tick, 150);
            });
        };
        tick();
    });
}

function getFreePort() {
    return new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.unref();
        srv.on("error", reject);
        srv.listen(0, "127.0.0.1", () => {
            const port = srv.address().port;
            srv.close(() => resolve(port));
        });
    });
}

function rmBestEffort(dir) {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch (_) {
    }
}

(async () => {
    const root = path.resolve(__dirname, "..");
    const reportDir = path.join(root, "benchmark-report");
    fs.mkdirSync(reportDir, { recursive: true });

    const profileDir = path.join(os.tmpdir(), `lhci-profile-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    fs.mkdirSync(profileDir, { recursive: true });

    const port = await getFreePort();
    const chromePath = await resolveChromePath();

    const chromeArgs = [
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${profileDir}`,
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--no-sandbox",
        "--disable-background-networking",
        "--disable-breakpad",
        "--disable-crash-reporter",
        "--disable-component-update",
        "about:blank",
    ];

    const chrome = spawn(chromePath, chromeArgs, {
        stdio: "ignore",
        windowsHide: true,
        detached: false,
    });

    try {
        await waitPort(port, 15000);
    } catch (e) {
        try { if (chrome.pid) spawnSync("taskkill", ["/pid", String(chrome.pid), "/T", "/F"], { stdio: "ignore" }); } catch (_) {}
        console.error(String(e));
        process.exit(1);
    }

    const env = { ...process.env, LHCI_CHROME_PORT: String(port) };

    const lhci = spawn(
        process.platform === "win32" ? "cmd.exe" : "pnpm",
        process.platform === "win32"
            ? ["/d", "/s", "/c", "pnpm", "exec", "lhci", "autorun", "--config=./lighthouserc.cjs"]
            : ["exec", "lhci", "autorun", "--config=./lighthouserc.cjs"],
        {
            cwd: root,
            stdio: "inherit",
            env,
            windowsHide: true,
        }
    );

    const code = await new Promise((r) => lhci.on("close", (c) => r(c ?? 1)));

    try {
        if (process.platform === "win32" && chrome.pid) {
            spawnSync("taskkill", ["/pid", String(chrome.pid), "/T", "/F"], { stdio: "ignore" });
        } else if (chrome.pid) {
            process.kill(chrome.pid, "SIGKILL");
        }
    } catch (_) {}

    rmBestEffort(profileDir);

    process.exit(code);
})();
