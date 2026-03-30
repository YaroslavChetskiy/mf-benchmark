import {
    buildBenchEnv,
    getArchitectureConfig,
    parseSingleArchFromArgv,
} from "./benchmark-config.mjs";
import {
    runPnpm,
    startBackgroundPnpm,
    stopProcessTree,
    waitForUrls,
} from "./bench-helpers.mjs";

const ROOT = process.cwd();

async function main() {
    const arch = getArchitectureConfig(parseSingleArchFromArgv(process.argv.slice(2)));
    const benchEnv = buildBenchEnv(arch);

    await runPnpm(["run", "clean:report"], { cwd: ROOT, env: benchEnv });
    await runPnpm(["-C", "../..", arch.buildScript], { cwd: ROOT, env: benchEnv });

    const previewProc = startBackgroundPnpm(["-C", "../..", arch.previewScript], {
        cwd: ROOT,
        env: benchEnv,
    });

    try {
        await waitForUrls(arch.previewUrls, 120000);

        await runPnpm(["run", "test"], {
            cwd: ROOT,
            env: {
                ...benchEnv,
                BENCH_REUSE_SERVER: "1",
            },
        });

        await runPnpm(["run", "lhci"], {
            cwd: ROOT,
            env: {
                ...benchEnv,
                BENCH_LH_MODE: "cold",
            },
        });

        await runPnpm(["run", "lhci"], {
            cwd: ROOT,
            env: {
                ...benchEnv,
                BENCH_LH_MODE: "warm",
            },
        });

        await runPnpm(["run", "data:extract-lh"], {
            cwd: ROOT,
            env: benchEnv,
        });

        await runPnpm(["run", "data:summary"], {
            cwd: ROOT,
            env: benchEnv,
        });

        await runPnpm(["run", "report:dashboard"], {
            cwd: ROOT,
            env: benchEnv,
        });

        await runPnpm(["run", "report:aggregate"], {
            cwd: ROOT,
            env: benchEnv,
        });
    } finally {
        await stopProcessTree(previewProc, 2000);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});