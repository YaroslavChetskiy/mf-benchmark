import { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { initBenchVitals } from "@mf-benchmark/bench-runtime";
import { CartPage, CheckoutPage, SuccessPage } from "@mf-benchmark/mf-checkout";
import { createIframeRuntime, startAutoResize, type IframeRuntime } from "./iframeRuntime";

initBenchVitals();

function useShellLocation(rt: IframeRuntime) {
    const [loc, setLoc] = useState(() => rt.getLocation());
    useEffect(() => rt.subscribeLocation(setLoc), [rt]);
    return loc;
}

function Root(props: { rt: IframeRuntime }) {
    const loc = useShellLocation(props.rt);

    const view = useMemo(() => {
        if (loc.pathname.startsWith("/checkout")) return "checkout";
        if (loc.pathname.startsWith("/success")) return "success";
        return "cart";
    }, [loc.pathname]);

    if (view === "checkout") return <CheckoutPage ctx={props.rt.ctx} />;
    if (view === "success") return <SuccessPage ctx={props.rt.ctx} />;
    return <CartPage ctx={props.rt.ctx} />;
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
    const rt = createIframeRuntime("checkout");
    await rt.readyPromise;

    root.render(<Root rt={rt} />);

    requestAnimationFrame(() => {
        startAutoResize(rt.ctx);
        rt.ctx.events.emit("module:ready" as any, { moduleId: "checkout" } as any);
    });
}

bootstrap().catch((e) => {
    console.error(e);
    root.render(
        <div style={{ padding: 16, fontFamily: "system-ui" }}>
            <h2>iframe-checkout failed</h2>
            <pre style={{ whiteSpace: "pre-wrap" }}>{String(e)}</pre>
        </div>
    );
});