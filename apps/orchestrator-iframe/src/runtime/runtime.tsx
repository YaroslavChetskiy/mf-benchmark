import React, { createContext, useContext } from "react";
import type { AppEventMap, EventBus, NavigateFn, ProductsApi } from "@mf-benchmark/contracts";
import { SimpleEventBus } from "@mf-benchmark/contracts";
import { CartStore } from "./cartStore";

export type ShellRuntime = {
    events: EventBus<AppEventMap>;
    cartStore: CartStore;
    productsApi: ProductsApi;
    navigate: NavigateFn;
};

const Ctx = createContext<ShellRuntime | null>(null);

export function RuntimeProvider(props: { runtime: ShellRuntime; children: React.ReactNode }) {
    return <Ctx.Provider value={props.runtime}>{props.children}</Ctx.Provider>;
}

export function useShellRuntime(): ShellRuntime {
    const v = useContext(Ctx);
    if (!v) throw new Error("RuntimeProvider missing");
    return v;
}

function makeNavigate(): NavigateFn {
    return (to, opts) => {
        if (opts?.replace) {
            history.replaceState(null, "", to);
        } else {
            history.pushState(null, "", to);
        }
        window.dispatchEvent(new PopStateEvent("popstate"));
    };
}

export function createShellRuntime(opts: { productsApi: ProductsApi }): ShellRuntime {
    const events = new SimpleEventBus<AppEventMap>();
    const cartStore = new CartStore();
    const navigate = makeNavigate();
    return { events, cartStore, productsApi: opts.productsApi, navigate };
}
