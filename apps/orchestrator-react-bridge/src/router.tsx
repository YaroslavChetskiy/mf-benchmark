import {
    createBrowserRouter,
    Outlet,
    useNavigate,
    useParams,
    useRouteError,
    useSearchParams,
} from "react-router-dom";
import type { ProductId } from "@mf-benchmark/contracts";
import { useMfContext } from "./runtime/useMfContext";
import { useRuntime } from "./runtime/runtime";
import { Header } from "./ui/Header";
import { Toasts } from "./ui/Toasts";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { CatalogRemote, ProductRemote, CheckoutRemote } from "./bridge/remoteApps";
import { useEffect } from "react";

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
    return <CatalogRemote ctx={ctx} />;
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
        <ProductRemote
            ctx={ctx}
            productId={id as ProductId}
            stress={sp.get("stress") === "1"}
        />
    );
}

function CartRoute() {
    const ctx = useMfContext("checkout");
    return <CheckoutRemote ctx={ctx} view="cart" />;
}

function CheckoutRoute() {
    const ctx = useMfContext("checkout");
    return <CheckoutRemote ctx={ctx} view="checkout" />;
}

function SuccessRoute() {
    const ctx = useMfContext("checkout");
    return <CheckoutRemote ctx={ctx} view="success" />;
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