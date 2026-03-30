import React from "react";
import ReactDOMClient from "react-dom/client";
import singleSpaReact from "single-spa-react";
import type { MfRuntimeContext } from "@mf-benchmark/contracts";
import { BENCH_MARKS } from "@mf-benchmark/contracts";
import { CatalogPage } from "@mf-benchmark/mf-catalog";

type Props = { ctx: MfRuntimeContext };

function Root(props: Props) {
    return <CatalogPage ctx={props.ctx} />;
}

const lifecycles = singleSpaReact({
    React,
    ReactDOMClient,
    rootComponent: Root,
    errorBoundary(err) {
        return (
            <div className="page">
                <div className="card">
                    <div>Ошибка в spa-catalog</div>
                    <pre className="muted small" style={{ whiteSpace: "pre-wrap" }}>
            {String(err)}
          </pre>
                </div>
            </div>
        );
    },
    domElementGetter: () => {
        const el = document.getElementById("spa-catalog");
        if (!el) throw new Error('Container "#spa-catalog" not found');
        return el;
    },
});

export const bootstrap = lifecycles.bootstrap;

export const mount = async (props: any) => {
    await lifecycles.mount(props);
    performance.mark(BENCH_MARKS.MF_CATALOG_READY);
};

export const unmount = lifecycles.unmount;
