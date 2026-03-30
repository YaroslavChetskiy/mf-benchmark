import ReactDOM from "react-dom/client";
import { initBenchVitals } from "@mf-benchmark/bench-runtime";
import { CatalogPage } from "@mf-benchmark/mf-catalog";
import { createIframeRuntime, startAutoResize } from "./iframeRuntime";

initBenchVitals();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root not found");

const root = ReactDOM.createRoot(rootEl);

root.render(
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
        Waiting for shell…
    </div>
);

async function bootstrap() {
    const rt = createIframeRuntime("catalog");
    await rt.readyPromise;

    root.render(<CatalogPage ctx={rt.ctx} />);

    requestAnimationFrame(() => {
        startAutoResize(rt.ctx);
        rt.ctx.events.emit("module:ready" as any, { moduleId: "catalog" } as any);
    });
}

bootstrap().catch((e) => {
    console.error(e);
    root.render(
        <div style={{ padding: 16, fontFamily: "system-ui" }}>
            <h2>iframe-catalog failed</h2>
            <pre style={{ whiteSpace: "pre-wrap" }}>{String(e)}</pre>
        </div>
    );
});