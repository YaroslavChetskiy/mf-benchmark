import React, { useEffect } from "react";
import type { BenchMark, MfRuntimeContext, ProductId } from "@mf-benchmark/contracts";
import { BENCH_MARKS } from "@mf-benchmark/contracts";
import { ErrorBoundary } from "../ui/ErrorBoundary";

function mark(name: BenchMark) {
    performance.mark(name);
}

function withReadyMark<TProps extends object>(
    Component: React.ComponentType<TProps>,
    readyMark: BenchMark
): React.ComponentType<TProps> {
    return function MarkedRemote(props: TProps) {
        useEffect(() => {
            mark(readyMark);
        }, []);

        return React.createElement(Component, props);
    };
}

function withFallback<TProps extends object>(
    moduleLabel: string,
    details: string
): React.ComponentType<TProps> {
    return function RemoteFallback(_: TProps) {
        useEffect(() => {
            mark(BENCH_MARKS.FALLBACK_SHOWN);
        }, []);

        return (
            <ErrorBoundary
                title={`Модуль "${moduleLabel}" недоступен`}
                details={details}
            />
        );
    };
}

export function lazyRemote<TProps extends object>(
    moduleLabel: string,
    importer: () => Promise<any>,
    exportName: string,
    readyMark: BenchMark
): React.LazyExoticComponent<React.ComponentType<TProps>> {
    return React.lazy(async () => {
        try {
            const mod = await importer();
            const C = mod?.[exportName];

            if (!C) {
                throw new Error(`Remote "${moduleLabel}" does not export "${exportName}"`);
            }

            return {
                default: withReadyMark(C as React.ComponentType<TProps>, readyMark),
            };
        } catch (e) {
            const details =
                e instanceof Error
                    ? `${e.name}: ${e.message}\n${e.stack ?? ""}`
                    : typeof e === "string"
                        ? e
                        : JSON.stringify(e, null, 2);

            return {
                default: withFallback<TProps>(moduleLabel, details),
            };
        }
    });
}

export type WithCtx = { ctx: MfRuntimeContext };
export type WithCtxProduct = { ctx: MfRuntimeContext; productId: ProductId; stress?: boolean };