import React, { useEffect, useMemo, useState } from "react";
import ReactDOMClient from "react-dom/client";
import singleSpaReact from "single-spa-react";
import type { MfRuntimeContext, ProductId } from "@mf-benchmark/contracts";
import { BENCH_MARKS } from "@mf-benchmark/contracts";
import { ProductPage } from "@mf-benchmark/mf-product";

type Props = { ctx: MfRuntimeContext };

function useLocationSignal(): { pathname: string; search: string } {
    const [v, setV] = useState(() => ({
        pathname: window.location.pathname,
        search: window.location.search,
    }));

    useEffect(() => {
        const onChange = () =>
            setV({ pathname: window.location.pathname, search: window.location.search });

        window.addEventListener("single-spa:routing-event", onChange);
        return () => window.removeEventListener("single-spa:routing-event", onChange);
    }, []);

    return v;
}

function parseProductId(pathname: string): ProductId | null {
    const m = pathname.match(/^\/product\/([^/]+)\/?$/);
    return m ? (decodeURIComponent(m[1]) as ProductId) : null;
}

function Root(props: Props) {
    const { pathname, search } = useLocationSignal();

    const productId = useMemo(() => parseProductId(pathname), [pathname]);
    const stress = useMemo(() => new URLSearchParams(search).get("stress") === "1", [search]);

    if (!productId) {
        return (
            <div className="page">
                <div className="card">Некорректный URL товара</div>
            </div>
        );
    }

    return <ProductPage ctx={props.ctx} productId={productId} stress={stress} />;
}

const lifecycles = singleSpaReact({
    React,
    ReactDOMClient,
    rootComponent: Root,
    errorBoundary(err) {
        return (
            <div className="page">
                <div className="card">
                    <div>Ошибка в spa-product</div>
                    <pre className="muted small" style={{ whiteSpace: "pre-wrap" }}>
            {String(err)}
          </pre>
                </div>
            </div>
        );
    },
    domElementGetter: () => {
        const el = document.getElementById("spa-product");
        if (!el) throw new Error('Container "#spa-product" not found');
        return el;
    },
});

export const bootstrap = lifecycles.bootstrap;

export const mount = async (props: any) => {
    await lifecycles.mount(props);
    performance.mark(BENCH_MARKS.MF_PRODUCT_READY);
};

export const unmount = lifecycles.unmount;
