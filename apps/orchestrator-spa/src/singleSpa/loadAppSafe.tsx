import ReactDOMClient from "react-dom/client";
import type { LifeCycles } from "single-spa";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { BENCH_MARKS } from "@mf-benchmark/contracts";

function formatErr(e: unknown): string {
    return e instanceof Error
        ? `${e.name}: ${e.message}\n${e.stack ?? ""}`
        : typeof e === "string"
            ? e
            : JSON.stringify(e, null, 2);
}

const cache = new Map<string, Promise<LifeCycles<any>>>();

export function loadAppSafe(appLabel: string, url: string, containerId: string) {
    return async (): Promise<LifeCycles<any>> => {
        const key = `${appLabel}@@${url}`;
        const existing = cache.get(key);
        if (existing) return existing;

        const p = (async () => {
            let fallbackRoot: ReactDOMClient.Root | null = null;

            const renderFallback = (details: string) => {
                performance.mark(BENCH_MARKS.FALLBACK_SHOWN);

                const el = document.getElementById(containerId);
                if (!el) return;

                if (!fallbackRoot) fallbackRoot = ReactDOMClient.createRoot(el);

                fallbackRoot.render(
                    <ErrorBoundary title={`Модуль "${appLabel}" недоступен`} details={details} />
                );
            };

            const clearFallback = () => {
                if (fallbackRoot) {
                    try {
                        fallbackRoot.unmount();
                    } catch {
                    }
                    fallbackRoot = null;
                }
            };

            try {
                const mod = await import(/* @vite-ignore */ url);

                const isFn = (x: any) => typeof x === "function";
                if (!isFn(mod?.bootstrap) || !isFn(mod?.mount) || !isFn(mod?.unmount)) {
                    throw new Error(`"${appLabel}" does not export bootstrap/mount/unmount`);
                }

                return {
                    bootstrap: async (props: any) => {
                        await mod.bootstrap(props);
                    },

                    mount: async (props: any) => {
                        try {
                            clearFallback();
                            await mod.mount(props);
                        } catch (e) {
                            renderFallback(formatErr(e));
                        }
                    },

                    unmount: async (props: any) => {
                        try {
                            await mod.unmount(props);
                        } catch {
                        } finally {
                            clearFallback();
                        }
                    },
                } as LifeCycles<any>;
            } catch (e) {
                const details = formatErr(e);

                return {
                    bootstrap: async () => {},

                    mount: async () => {
                        renderFallback(details);
                    },

                    unmount: async () => {
                        if (fallbackRoot) {
                            try {
                                fallbackRoot.unmount();
                            } catch {
                            }
                            fallbackRoot = null;
                        }
                    },
                } as LifeCycles<any>;
            }
        })();

        cache.set(key, p);
        return p;
    };
}