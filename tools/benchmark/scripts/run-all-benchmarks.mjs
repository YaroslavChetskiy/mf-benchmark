import { spawn } from "node:child_process";
import {
    ARCHITECTURE_KEYS,
    BENCHMARK_DIR,
    parseArchListFromArgv,
} from "./benchmark-config.mjs";

function runCommand(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, {
            cwd: opts.cwd ?? BENCHMARK_DIR,
            env: { ...process.env, ...(opts.env ?? {}) },
            stdio: "inherit",
            shell: process.platform === "win32",
        });

        child.on("error", reject);

        child.on("exit", (code, signal) => {
            if (signal) {
                reject(new Error(`${cmd} ${args.join(" ")} terminated by signal ${signal}`));
                return;
            }
            if (code !== 0) {
                reject(new Error(`${cmd} ${args.join(" ")} failed with exit code ${code}`));
                return;
            }
            resolve();
        });
    });
}

async function main() {
    const selected = parseArchListFromArgv(process.argv.slice(2));
    const arches = selected.length > 0 ? selected : ARCHITECTURE_KEYS;

    for (const arch of arches) {
        process.stdout.write(`\n=== benchmark: ${arch} ===\n\n`);

        await runCommand("pnpm", ["run", "benchmark", "--", `--arch=${arch}`], {
            cwd: BENCHMARK_DIR,
        });
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});