import type { MfRuntimeContext, ModuleId } from "@mf-benchmark/contracts";
import type { ShellRuntime } from "./runtime";

export function createMfContext(runtime: ShellRuntime, moduleId: ModuleId): MfRuntimeContext {
    const cartApi = runtime.cartStore.createApiFor(moduleId, runtime.events);

    return {
        moduleId,
        cartApi,
        events: runtime.events,
        productsApi: runtime.productsApi,
        navigate: runtime.navigate,
    };
}
