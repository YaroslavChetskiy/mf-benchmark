import { useEffect, useMemo, useState } from "react";
import type { CartState } from "@mf-benchmark/contracts";
import { useShellRuntime } from "../runtime/runtime";
import { usePathname } from "./usePathname";
import { onNav } from "./onNav";

function isActive(pathname: string, href: string) {
    if (href === "/catalog") return pathname === "/" || pathname.startsWith("/catalog");
    return pathname.startsWith(href);
}

export function Header() {
    const runtime = useShellRuntime();
    const [cart, setCart] = useState<CartState>({ items: [] });

    useEffect(() => runtime.cartStore.subscribe(setCart), [runtime.cartStore]);

    const count = useMemo(() => cart.items.reduce((acc, it) => acc + it.qty, 0), [cart]);
    const pathname = usePathname();

    return (
        <header className="app-header" data-testid="shell-header">
            <div className="app-header__left">
                <a
                    className="logo"
                    href="/catalog"
                    onClick={onNav(runtime.navigate, "/catalog")}
                    data-testid="shell-logo"
                >
                    mf-benchmark
                </a>

                <nav className="nav" data-testid="shell-nav">
                    <a
                        className={`nav__link ${isActive(pathname, "/catalog") ? "nav__link--active" : ""}`}
                        href="/catalog"
                        onClick={onNav(runtime.navigate, "/catalog")}
                        data-testid="nav-catalog"
                        aria-current={isActive(pathname, "/catalog") ? "page" : undefined}
                    >
                        Каталог
                    </a>

                    <a
                        className={`nav__link ${isActive(pathname, "/cart") ? "nav__link--active" : ""}`}
                        href="/cart"
                        onClick={onNav(runtime.navigate, "/cart")}
                        data-testid="nav-cart"
                        aria-current={isActive(pathname, "/cart") ? "page" : undefined}
                    >
                        Корзина <span className="badge" data-testid="cart-badge">{count}</span>
                    </a>
                </nav>
            </div>
        </header>
    );
}