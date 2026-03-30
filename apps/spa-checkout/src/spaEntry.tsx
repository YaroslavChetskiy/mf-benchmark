import React, { useEffect, useMemo, useState } from "react";
import ReactDOMClient from "react-dom/client";
import singleSpaReact from "single-spa-react";
import type { MfRuntimeContext } from "@mf-benchmark/contracts";
import { BENCH_MARKS } from "@mf-benchmark/contracts";
import { CartPage, CheckoutPage, SuccessPage } from "@mf-benchmark/mf-checkout";

type Props = { ctx: MfRuntimeContext };

function usePathname(): string {
    const [p, setP] = useState(() => window.location.pathname);

    useEffect(() => {
        const onChange = () => setP(window.location.pathname);
        window.addEventListener("single-spa:routing-event", onChange);
        return () => window.removeEventListener("single-spa:routing-event", onChange);
    }, []);

    return p;
}

function Root(props: Props) {
    const pathname = usePathname();

    const view = useMemo(() => {
        if (pathname.startsWith("/checkout")) return "checkout";
        if (pathname.startsWith("/success")) return "success";
        return "cart";
    }, [pathname]);

    if (view === "checkout") return <CheckoutPage ctx={props.ctx} />;
    if (view === "success") return <SuccessPage ctx={props.ctx} />;
    return <CartPage ctx={props.ctx} />;
}

const lifecycles = singleSpaReact({
    React,
    ReactDOMClient,
    rootComponent: Root,
    errorBoundary(err) {
        return (
            <div className="page">
                <div className="card">
                    <div>Ошибка в spa-checkout</div>
                    <pre className="muted small" style={{ whiteSpace: "pre-wrap" }}>
            {String(err)}
          </pre>
                </div>
            </div>
        );
    },
    domElementGetter: () => {
        const el = document.getElementById("spa-checkout");
        if (!el) throw new Error('Container "#spa-checkout" not found');
        return el;
    },
});

export const bootstrap = lifecycles.bootstrap;

export const mount = async (props: any) => {
    await lifecycles.mount(props);
    performance.mark(BENCH_MARKS.MF_CHECKOUT_READY);
};

export const unmount = lifecycles.unmount;
