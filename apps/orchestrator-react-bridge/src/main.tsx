import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { createProductsApi, initBenchVitals } from "@mf-benchmark/bench-runtime";
import { BENCH_MARKS } from "@mf-benchmark/contracts";
import { RuntimeProvider } from "./runtime/runtime";
import { router } from "./router";
import "./styles.css";

initBenchVitals();

const rootEl = document.getElementById("root");
if (!rootEl) {
    throw new Error("#root not found");
}

const root = ReactDOM.createRoot(rootEl);

root.render(
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
        Booting orchestrator-react-bridge…
    </div>
);

async function bootstrap() {
    const delayMs = Number(import.meta.env.VITE_DATA_DELAY_MS ?? "0") || 0;

    const productsApi = createProductsApi({ delayMs });
    await productsApi.preload();

    root.render(
        <RuntimeProvider productsApi={productsApi}>
            <RouterProvider router={router} />
        </RuntimeProvider>
    );

    performance.mark(BENCH_MARKS.SHELL_READY);
}

bootstrap().catch((e) => {
    console.error("[bootstrap] failed", e);

    const msg =
        e instanceof Error ? `${e.name}: ${e.message}\n${e.stack ?? ""}` : String(e);

    root.render(
        <div style={{ padding: 16, fontFamily: "system-ui" }}>
            <h2>Bootstrap failed</h2>
            <pre style={{ whiteSpace: "pre-wrap" }}>{msg}</pre>
        </div>
    );
});