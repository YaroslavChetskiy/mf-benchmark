import { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { initBenchVitals } from "@mf-benchmark/bench-runtime";
import type { ProductId } from "@mf-benchmark/contracts";
import { ProductPage } from "@mf-benchmark/mf-product";
import { createIframeRuntime, startAutoResize, type IframeRuntime } from "./iframeRuntime";

initBenchVitals();

function useShellLocation(rt: IframeRuntime) {
    const [loc, setLoc] = useState(() => rt.getLocation());
    useEffect(() => rt.subscribeLocation(setLoc), [rt]);
    return loc;
}

function parseProductId(pathname: string): ProductId | null {
    const m = pathname.match(/^\/product\/([^/]+)\/?$/);
    return m ? (decodeURIComponent(m[1]) as ProductId) : null;
}

function Root(props: { rt: IframeRuntime }) {
    const loc = useShellLocation(props.rt);

    const productId = useMemo(() => parseProductId(loc.pathname), [loc.pathname]);
    const stress = useMemo(() => new URLSearchParams(loc.search).get("stress") === "1", [loc.search]);

    if (!productId) {
        return (
            <section className="page">
                <h1 className="page-title">Некорректный URL товара</h1>
                <div className="card">Ожидается: /product/&lt;id&gt;</div>
            </section>
        );
    }

    return <ProductPage ctx={props.rt.ctx} productId={productId} stress={stress} />;
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root not found");
const root = ReactDOM.createRoot(rootEl);

root.render(
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
        Waiting for shell…
    </div>
);

async function bootstrap() {
    const rt = createIframeRuntime("product");
    await rt.readyPromise;

    root.render(<Root rt={rt} />);

    requestAnimationFrame(() => {
        startAutoResize(rt.ctx);
        rt.ctx.events.emit("module:ready" as any, { moduleId: "product" } as any);
    });
}

bootstrap().catch((e) => {
    console.error(e);
    root.render(
        <div style={{ padding: 16, fontFamily: "system-ui" }}>
            <h2>iframe-product failed</h2>
            <pre style={{ whiteSpace: "pre-wrap" }}>{String(e)}</pre>
        </div>
    );
});