import { useMemo } from "react";
import type { MfRuntimeContext, ModuleId } from "@mf-benchmark/contracts";
import { useRuntime } from "./runtime";

export function useMfContext(moduleId: ModuleId): MfRuntimeContext {
    const runtime = useRuntime();
    const { cartStore, events, getNavigate, productsApi } = runtime;

    return useMemo(() => {
        const cartApi = cartStore.createApiFor(moduleId, events);

        return {
            moduleId,
            cartApi,
            events,
            productsApi,
            navigate: (to, opts) => getNavigate()(to, opts),
        };
    }, [moduleId, cartStore, events, getNavigate, productsApi]);
}
