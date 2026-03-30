import { Header } from "./ui/Header";
import { Toasts } from "./ui/Toasts";
import { usePathname } from "./ui/usePathname";
import IframeHost from "./iframe/IframeHost";

function pickActive(pathname: string): "catalog" | "product" | "checkout" {
    if (pathname.startsWith("/product/")) return "product";
    if (pathname.startsWith("/cart") || pathname.startsWith("/checkout") || pathname.startsWith("/success")) {
        return "checkout";
    }
    return "catalog";
}

function envNumber(name: string, fallback: number): number {
    const v = (import.meta as any).env?.[name];
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

const DEFAULT_IFRAME_READY_TIMEOUT_MS = 6000;
const DEFAULT_PRODUCT_READY_TIMEOUT_MS = 1500;
const DEFAULT_IFRAME_POST_LOAD_GRACE_MS = 400;

export function App() {
    const pathname = usePathname();
    const active = pickActive(pathname);

    const timeoutAll = envNumber("VITE_IFRAME_READY_TIMEOUT_MS", DEFAULT_IFRAME_READY_TIMEOUT_MS);

    const timeoutCatalog = envNumber("VITE_IFRAME_READY_TIMEOUT_MS_CATALOG", timeoutAll);
    const timeoutProduct = envNumber(
        "VITE_IFRAME_READY_TIMEOUT_MS_PRODUCT",
        Math.min(timeoutAll, DEFAULT_PRODUCT_READY_TIMEOUT_MS)
    );
    const timeoutCheckout = envNumber("VITE_IFRAME_READY_TIMEOUT_MS_CHECKOUT", timeoutAll);

    const postLoadGraceMs = envNumber(
        "VITE_IFRAME_POST_LOAD_GRACE_MS",
        DEFAULT_IFRAME_POST_LOAD_GRACE_MS
    );

    return (
        <div className="app-root">
            <Header />

            <main className="app-main">
                <IframeHost
                    moduleId="catalog"
                    active={active === "catalog"}
                    timeoutMs={timeoutCatalog}
                    postLoadGraceMs={postLoadGraceMs}
                />
                <IframeHost
                    moduleId="product"
                    active={active === "product"}
                    timeoutMs={timeoutProduct}
                    postLoadGraceMs={postLoadGraceMs}
                />
                <IframeHost
                    moduleId="checkout"
                    active={active === "checkout"}
                    timeoutMs={timeoutCheckout}
                    postLoadGraceMs={postLoadGraceMs}
                />
            </main>

            <Toasts />
        </div>
    );
}