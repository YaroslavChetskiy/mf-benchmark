import ReactDOM from "react-dom/client";
import { RuntimeProvider, createShellRuntime } from "./runtime/runtime";
import { App } from "./App";
import { createProductsApi, initBenchVitals } from "@mf-benchmark/bench-runtime";
import { BENCH_MARKS } from "@mf-benchmark/contracts";
import { registerSpaApps, startSpa } from "./singleSpa/registerApps";
import "./styles.css";

initBenchVitals();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root not found");

const root = ReactDOM.createRoot(rootEl);

root.render(
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
        Booting orchestrator-spa…
    </div>
);

async function bootstrap() {
    const delayMs = Number(import.meta.env.VITE_DATA_DELAY_MS ?? "0") || 0;

    const productsApi = createProductsApi({ delayMs });
    await productsApi.preload();

    const runtime = createShellRuntime({ productsApi });

    root.render(
        <RuntimeProvider runtime={runtime}>
            <App />
        </RuntimeProvider>
    );

    performance.mark(BENCH_MARKS.SHELL_READY);

    registerSpaApps(runtime);
    startSpa();
}

bootstrap().catch((e) => {
    console.error("[bootstrap] failed", e);

    const msg = e instanceof Error ? `${e.name}: ${e.message}\n${e.stack ?? ""}` : String(e);

    root.render(
        <div style={{ padding: 16, fontFamily: "system-ui" }}>
            <h2>Bootstrap failed</h2>
            <pre style={{ whiteSpace: "pre-wrap" }}>{msg}</pre>
        </div>
    );
});