import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const targets = [
    path.join(ROOT, "benchmark-report"),
    path.join(ROOT, ".lighthouseci"),
];

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function rmRetry(p, tries = 12) {
    for (let i = 0; i < tries; i++) {
        try {
            fs.rmSync(p, { recursive: true, force: true });
            return;
        } catch (e) {
            const code = e?.code;
            const retryable = code === "EPERM" || code === "EBUSY" || code === "ENOTEMPTY";
            if (!retryable || i === tries - 1) throw e;
            await sleep(150 + i * 50);
        }
    }
}

(async () => {
    for (const p of targets) {
        if (!fs.existsSync(p)) continue;
        try {
            await rmRetry(p);
            console.log(`clean: removed ${path.relative(ROOT, p)}`);
        } catch (e) {
            console.error(`clean: failed to remove ${p}`);
            console.error(e);
            process.exit(1);
        }
    }
})();
