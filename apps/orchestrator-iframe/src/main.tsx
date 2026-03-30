import ReactDOM from "react-dom/client";
import { createProductsApi, initBenchVitals } from "@mf-benchmark/bench-runtime";
import { BENCH_MARKS } from "@mf-benchmark/contracts";
import { App } from "./App";
import { RuntimeProvider, createShellRuntime } from "./runtime/runtime";
import { BridgeProvider } from "./iframe/bridgeContext";
import { IframeBridge } from "./iframe/IframeBridge";

initBenchVitals();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root not found");

const root = ReactDOM.createRoot(rootEl);

root.render(
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
        Booting orchestrator-iframe…
    </div>
);

async function bootstrap() {
    const delayMs = Number(import.meta.env.VITE_DATA_DELAY_MS ?? "0") || 0;

    const productsApi = createProductsApi({ delayMs });
    await productsApi.preload();

    const runtime = createShellRuntime({ productsApi });

    const bridge = new IframeBridge(runtime, {
        catalog: { url: "http://localhost:5301/", origin: "http://localhost:5301" },
        product: { url: "http://localhost:5302/", origin: "http://localhost:5302" },
        checkout: { url: "http://localhost:5303/", origin: "http://localhost:5303" },
    });

    root.render(
        <RuntimeProvider runtime={runtime}>
            <BridgeProvider bridge={bridge}>
                <App />
            </BridgeProvider>
        </RuntimeProvider>
    );

    performance.mark(BENCH_MARKS.SHELL_READY);

    if (window.location.pathname === "/") {
        runtime.navigate("/catalog", { replace: true });
    } else {
        bridge.broadcastEvent("navigation:request", {
            to: window.location.pathname + window.location.search,
            replace: true,
        });
    }

    const syncNav = () => {
        bridge.broadcastEvent("navigation:request", {
            to: window.location.pathname + window.location.search,
            replace: true,
        });
    };

    window.addEventListener("popstate", syncNav);
    window.addEventListener("hashchange", syncNav);
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