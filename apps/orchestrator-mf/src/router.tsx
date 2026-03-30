import React, { Suspense, useEffect } from "react";
import {
    createBrowserRouter,
    Outlet,
    useNavigate,
    useParams,
    useRouteError,
    useSearchParams,
} from "react-router-dom";
import type { ProductId } from "@mf-benchmark/contracts";
import { BENCH_MARKS } from "@mf-benchmark/contracts";
import { useMfContext } from "./runtime/useMfContext";
import { Header } from "./ui/Header";
import { Toasts } from "./ui/Toasts";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { useRuntime } from "./runtime/runtime";
import { lazyRemote, type WithCtx, type WithCtxProduct } from "./runtime/lazyRemote";


const RemoteCatalog = lazyRemote<WithCtx>(
    "mf_catalog",
    () => import("mf_catalog/CatalogPage"),
    "CatalogPage",
    BENCH_MARKS.MF_CATALOG_READY
);

const RemoteProduct = lazyRemote<WithCtxProduct>(
    "mf_product",
    () => import("mf_product/ProductPage"),
    "ProductPage",
    BENCH_MARKS.MF_PRODUCT_READY
);

const RemoteCart = lazyRemote<WithCtx>(
    "mf_checkout",
    () => import("mf_checkout/CartPage"),
    "CartPage",
    BENCH_MARKS.MF_CHECKOUT_READY
);

const RemoteCheckout = lazyRemote<WithCtx>(
    "mf_checkout",
    () => import("mf_checkout/CheckoutPage"),
    "CheckoutPage",
    BENCH_MARKS.MF_CHECKOUT_READY
);

const RemoteSuccess = lazyRemote<WithCtx>(
    "mf_checkout",
    () => import("mf_checkout/SuccessPage"),
    "SuccessPage",
    BENCH_MARKS.MF_CHECKOUT_READY
);

function NavSync() {
    const runtime = useRuntime();
    const navigate = useNavigate();
    useEffect(() => runtime.setNavigate(navigate), [runtime, navigate]);
    return null;
}

function RootLayout() {
    return (
        <div className="app-root">
            <NavSync />
            <Header />
            <main className="app-main">
                <Outlet />
            </main>
            <Toasts />
        </div>
    );
}

function RootError() {
    const err = useRouteError();
    const details =
        err instanceof Error
            ? `${err.name}: ${err.message}\n${err.stack ?? ""}`
            : typeof err === "string"
                ? err
                : JSON.stringify(err, null, 2);

    return (
        <div className="app-root">
            <NavSync />
            <Header />
            <main className="app-main">
                <ErrorBoundary title="Ошибка роутинга" details={details} />
            </main>
            <Toasts />
        </div>
    );
}

function CatalogRoute() {
    const ctx = useMfContext("catalog");
    return (
        <Suspense fallback={<div className="page"><div className="card">Загрузка Catalog…</div></div>}>
            <RemoteCatalog ctx={ctx} />
        </Suspense>
    );
}

function ProductRoute() {
    const ctx = useMfContext("product");
    const { id } = useParams<{ id: string }>();
    const [sp] = useSearchParams();

    if (!id) {
        return (
            <div className="page">
                <ErrorBoundary title="Некорректный идентификатор товара" />
            </div>
        );
    }

    return (
        <Suspense fallback={<div className="page"><div className="card">Загрузка Product…</div></div>}>
            <RemoteProduct
                ctx={ctx}
                productId={id as ProductId}
                stress={sp.get("stress") === "1"}
            />
        </Suspense>
    );
}

function CartRoute() {
    const ctx = useMfContext("checkout");
    return (
        <Suspense fallback={<div className="page"><div className="card">Загрузка Cart…</div></div>}>
            <RemoteCart ctx={ctx} />
        </Suspense>
    );
}

function CheckoutRoute() {
    const ctx = useMfContext("checkout");
    return (
        <Suspense fallback={<div className="page"><div className="card">Загрузка Checkout…</div></div>}>
            <RemoteCheckout ctx={ctx} />
        </Suspense>
    );
}

function SuccessRoute() {
    const ctx = useMfContext("checkout");
    return (
        <Suspense fallback={<div className="page"><div className="card">Загрузка Success…</div></div>}>
            <RemoteSuccess ctx={ctx} />
        </Suspense>
    );
}

export const router = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        errorElement: <RootError />,
        children: [
            { index: true, element: <CatalogRoute /> },
            { path: "catalog", element: <CatalogRoute /> },
            { path: "product/:id", element: <ProductRoute /> },
            { path: "cart", element: <CartRoute /> },
            { path: "checkout", element: <CheckoutRoute /> },
            { path: "success", element: <SuccessRoute /> },
        ],
    },
]);