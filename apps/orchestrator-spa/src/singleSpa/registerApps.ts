import { registerApplication, start } from "single-spa";
import type { ShellRuntime } from "../runtime/runtime";
import { createMfContext } from "../runtime/createMfContext";
import { loadAppSafe } from "./loadAppSafe";

function resolveSpaUrl(port: number): string {
    if (import.meta.env.DEV) {
        return `http://localhost:${port}/src/spaEntry.tsx`;
    }
    return `http://127.0.0.1:${port}/spaEntry.js`;
}

export function registerSpaApps(runtime: ShellRuntime) {
    registerApplication({
        name: "spa-catalog",
        app: loadAppSafe("spa-catalog", resolveSpaUrl(5201), "spa-catalog"),
        activeWhen: (loc) => loc.pathname === "/" || loc.pathname.startsWith("/catalog"),
        customProps: { ctx: createMfContext(runtime, "catalog") },
    });

    registerApplication({
        name: "spa-product",
        app: loadAppSafe("spa-product", resolveSpaUrl(5202), "spa-product"),
        activeWhen: (loc) => loc.pathname.startsWith("/product/"),
        customProps: { ctx: createMfContext(runtime, "product") },
    });

    registerApplication({
        name: "spa-checkout",
        app: loadAppSafe("spa-checkout", resolveSpaUrl(5203), "spa-checkout"),
        activeWhen: (loc) =>
            loc.pathname.startsWith("/cart") ||
            loc.pathname.startsWith("/checkout") ||
            loc.pathname.startsWith("/success"),
        customProps: { ctx: createMfContext(runtime, "checkout") },
    });
}

export function startSpa() {
    start();
}