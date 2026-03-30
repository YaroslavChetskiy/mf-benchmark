import { useEffect } from "react";
import { createRemoteAppComponent } from "@module-federation/bridge-react";
import type { MfRuntimeContext, ProductId } from "@mf-benchmark/contracts";
import { BENCH_MARKS } from "@mf-benchmark/contracts";
import { ErrorBoundary } from "../ui/ErrorBoundary";

function formatErr(e: unknown): string {
    return e instanceof Error ? `${e.name}: ${e.message}\n${e.stack ?? ""}` : String(e);
}

function LoadingCard(props: { label: string }) {
    return (
        <div className="page">
            <div className="card">Загрузка {props.label}…</div>
        </div>
    );
}

function makeFallback(title: string) {
    return function RemoteFallback(props: { error: Error }) {
        useEffect(() => {
            performance.mark(BENCH_MARKS.FALLBACK_SHOWN);
        }, []);

        return <ErrorBoundary title={title} details={formatErr(props.error)} />;
    };
}

type CatalogProps = { ctx: MfRuntimeContext };
type ProductProps = { ctx: MfRuntimeContext; productId: ProductId; stress?: boolean };
type CheckoutProps = { ctx: MfRuntimeContext; view: "cart" | "checkout" | "success" };

const CatalogRemoteBase = createRemoteAppComponent({
    loader: () => import("rb_catalog/export-app"),
    loading: <LoadingCard label="Catalog" />,
    fallback: makeFallback('Модуль "react-bridge-catalog" недоступен'),
});

const ProductRemoteBase = createRemoteAppComponent({
    loader: () => import("rb_product/export-app"),
    loading: <LoadingCard label="Product" />,
    fallback: makeFallback('Модуль "react-bridge-product" недоступен'),
});

const CheckoutRemoteBase = createRemoteAppComponent({
    loader: () => import("rb_checkout/export-app"),
    loading: <LoadingCard label="Checkout" />,
    fallback: makeFallback('Модуль "react-bridge-checkout" недоступен'),
});

export function CatalogRemote(props: CatalogProps) {
    return <CatalogRemoteBase {...props} />;
}

export function ProductRemote(props: ProductProps) {
    return <ProductRemoteBase {...props} />;
}

export function CheckoutRemote(props: CheckoutProps) {
    return <CheckoutRemoteBase {...props} />;
}