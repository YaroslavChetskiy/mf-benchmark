import React, { createContext, useMemo, useRef } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { AppEventMap, EventBus, ProductsApi } from "@mf-benchmark/contracts";
import { SimpleEventBus } from "@mf-benchmark/contracts";
import { CartStore } from "./cartStore";

export type Runtime = {
    events: EventBus<AppEventMap>;
    cartStore: CartStore;
    productsApi: ProductsApi;

    setNavigate(fn: NavigateFunction): void;
    getNavigate(): NavigateFunction;
};

const RuntimeCtx = createContext<Runtime | null>(null);

export function RuntimeProvider(props: { children: React.ReactNode; productsApi: ProductsApi }) {
    const events = useMemo(() => new SimpleEventBus<AppEventMap>(), []);
    const cartStore = useMemo(() => new CartStore(), []);

    const navRef = useRef<NavigateFunction>(() => {
        throw new Error("navigate is not set yet");
    });

    const runtime = useMemo<Runtime>(() => {
        return {
            events,
            cartStore,
            productsApi: props.productsApi,
            setNavigate: (fn) => (navRef.current = fn),
            getNavigate: () => navRef.current,
        };
    }, [events, cartStore, props.productsApi]);

    return <RuntimeCtx.Provider value={runtime}>{props.children}</RuntimeCtx.Provider>;
}

export function useRuntime(): Runtime {
    const v = React.useContext(RuntimeCtx);
    if (!v) throw new Error("RuntimeProvider is missing");
    return v;
}
