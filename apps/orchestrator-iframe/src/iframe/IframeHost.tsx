import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ModuleId } from "@mf-benchmark/contracts";
import { BENCH_MARKS } from "@mf-benchmark/contracts";
import { useIframeBridge } from "./bridgeContext";
import { ModuleFallback } from "../ui/ModuleFallback";
import { useShellRuntime } from "../runtime/runtime";

export default function IframeHost(props: {
    moduleId: ModuleId;
    active: boolean;
    timeoutMs: number;
    postLoadGraceMs: number;
}) {
    const bridge = useIframeBridge();
    const runtime = useShellRuntime();

    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const fallbackMarkedRef = useRef(false);
    const overallTimeoutRef = useRef<number | null>(null);
    const postLoadTimeoutRef = useRef<number | null>(null);

    const cfg = bridge.getModuleCfg(props.moduleId);

    const [started, setStarted] = useState<boolean>(() => props.active);
    const [failed, setFailed] = useState<string | null>(null);

    const [heightPx, setHeightPx] = useState<number | null>(null);

    const title = useMemo(() => {
        if (props.moduleId === "catalog") return "Каталог недоступен";
        if (props.moduleId === "product") return "Товар недоступен";
        return "Оформление недоступно";
    }, [props.moduleId]);

    const clearOverallTimeout = useCallback(() => {
        if (overallTimeoutRef.current != null) {
            window.clearTimeout(overallTimeoutRef.current);
            overallTimeoutRef.current = null;
        }
    }, []);

    const clearPostLoadTimeout = useCallback(() => {
        if (postLoadTimeoutRef.current != null) {
            window.clearTimeout(postLoadTimeoutRef.current);
            postLoadTimeoutRef.current = null;
        }
    }, []);

    const clearTimers = useCallback(() => {
        clearOverallTimeout();
        clearPostLoadTimeout();
    }, [clearOverallTimeout, clearPostLoadTimeout]);

    const markFallbackOnce = useCallback(() => {
        if (fallbackMarkedRef.current) return;
        fallbackMarkedRef.current = true;
        performance.mark(BENCH_MARKS.FALLBACK_SHOWN);
    }, []);

    const fail = useCallback(
        (details: string) => {
            if (bridge.isHandshakeReady(props.moduleId)) return;
            markFallbackOnce();
            clearTimers();
            setFailed(details);
        },
        [bridge, props.moduleId, markFallbackOnce, clearTimers]
    );

    const resetFailureState = useCallback(() => {
        fallbackMarkedRef.current = false;
        setFailed(null);
        clearTimers();
    }, [clearTimers]);

    useEffect(() => {
        const unsub = bridge.onResize(props.moduleId, (h) => setHeightPx(h));
        return () => unsub();
    }, [bridge, props.moduleId]);

    const setIframeEl = (el: HTMLIFrameElement | null) => {
        iframeRef.current = el;
        bridge.registerFrame(props.moduleId, el);
    };

    useEffect(() => {
        if (!started && props.active) setStarted(true);
    }, [started, props.active]);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        if (!started) {
            if (iframe.src !== "about:blank") iframe.src = "about:blank";
            return;
        }

        if (iframe.src !== cfg.url) iframe.src = cfg.url;
    }, [started, cfg.url]);

    useEffect(() => {
        if (!started || !props.active) {
            clearTimers();
            return;
        }

        if (bridge.isHandshakeReady(props.moduleId)) {
            setFailed(null);
            clearTimers();
            return;
        }

        setFailed(null);

        let disposed = false;

        clearOverallTimeout();
        overallTimeoutRef.current = window.setTimeout(() => {
            if (disposed) return;
            fail(`Timeout ${props.timeoutMs}ms waiting for iframe ready (${cfg.url})`);
        }, props.timeoutMs);

        const unsub = bridge.onHandshakeReady(props.moduleId, () => {
            if (disposed) return;
            clearTimers();
            setFailed(null);
        });

        return () => {
            disposed = true;
            clearTimers();
            unsub();
        };
    }, [
        bridge,
        started,
        props.active,
        props.timeoutMs,
        cfg.url,
        props.moduleId,
        fail,
        clearTimers,
        clearOverallTimeout,
    ]);

    const handleIframeLoad = useCallback(() => {
        if (!started || !props.active) return;
        if (bridge.isHandshakeReady(props.moduleId)) return;

        clearPostLoadTimeout();

        postLoadTimeoutRef.current = window.setTimeout(() => {
            if (bridge.isHandshakeReady(props.moduleId)) return;

            fail(
                `Iframe loaded, but ready-handshake did not arrive within ` +
                `${props.postLoadGraceMs}ms (${cfg.url})`
            );
        }, props.postLoadGraceMs);
    }, [
        started,
        props.active,
        bridge,
        props.moduleId,
        props.postLoadGraceMs,
        cfg.url,
        fail,
        clearPostLoadTimeout,
    ]);

    const handleIframeError = useCallback(() => {
        fail(`Iframe failed to load (${cfg.url})`);
    }, [fail, cfg.url]);

    const wrapperStyle = props.active ? undefined : ({ display: "none" } as const);
    const showFallback = !!failed;

    return (
        <div
            style={wrapperStyle}
            className="iframe-host"
            data-testid={`iframe-host-${props.moduleId}`}
            data-module-id={props.moduleId}
            data-active={props.active ? "true" : "false"}
        >
            {showFallback ? (
                <ModuleFallback
                    title={title}
                    details={failed ?? undefined}
                    onGoCatalog={() => runtime.navigate("/catalog")}
                    onReload={() => {
                        resetFailureState();
                        bridge.reset(props.moduleId);

                        const iframe = iframeRef.current;
                        if (iframe) {
                            iframe.src = "about:blank";
                            requestAnimationFrame(() => {
                                if (iframeRef.current === iframe) {
                                    iframe.src = cfg.url;
                                }
                            });
                        }
                    }}
                />
            ) : (
                <iframe
                    ref={setIframeEl}
                    title={props.moduleId}
                    data-testid={`iframe-${props.moduleId}`}
                    data-module-id={props.moduleId}
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    style={{
                        width: "100%",
                        border: "0",
                        height: heightPx ? `${heightPx}px` : "700px",
                    }}
                />
            )}
        </div>
    );
}