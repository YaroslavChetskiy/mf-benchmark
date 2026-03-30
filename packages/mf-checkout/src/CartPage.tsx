import { useEffect, useMemo, useState } from "react";
import type { CartState, MfRuntimeContext } from "@mf-benchmark/contracts";
import { makeNavHandler } from "@mf-benchmark/contracts";

export function CartPage(props: { ctx: MfRuntimeContext }) {
    const { ctx } = props;

    const [cart, setCart] = useState<CartState>({ items: [] });
    useEffect(() => ctx.cartApi.subscribe(setCart), [ctx.cartApi]);

    const products = useMemo(() => ctx.productsApi.getProductsSync(), [ctx.productsApi]);
    const byId = useMemo(() => ctx.productsApi.productsById(products), [ctx.productsApi, products]);

    const lines = cart.items
        .map((it) => ({ it, p: byId.get(it.productId) }))
        .filter((x) => !!x.p);

    const total = lines.reduce((acc, x) => acc + x.p!.priceCents * x.it.qty, 0);

    return (
        <section className="page" data-testid="cart-page">
            <h1 className="page-title" data-testid="cart-title">Корзина</h1>

            {lines.length === 0 ? (
                <div className="card" data-testid="cart-empty">
                    <div data-testid="cart-empty-text">Корзина пуста.</div>
                    <a
                        className="btn btn--primary"
                        href="/catalog"
                        onClick={makeNavHandler(ctx, "/catalog")}
                        data-testid="cart-empty-go-catalog"
                    >
                        Перейти в каталог
                    </a>
                </div>
            ) : (
                <div className="card" data-testid="cart-content">
                    <table className="table" data-testid="cart-table">
                        <thead>
                        <tr>
                            <th>Товар</th>
                            <th>Кол-во</th>
                            <th>Цена</th>
                            <th></th>
                        </tr>
                        </thead>
                        <tbody>
                        {lines.map(({ it, p }) => (
                            <tr
                                key={it.productId}
                                data-testid={`cart-line-${it.productId}`}
                                data-product-id={it.productId}
                            >
                                <td data-testid={`cart-line-title-${it.productId}`}>{p!.title}</td>
                                <td style={{ width: 180 }}>
                                    <div className="qty" data-testid={`cart-line-qty-${it.productId}`}>
                                        <button
                                            className="btn btn--ghost"
                                            data-testid={`cart-decrease-${it.productId}`}
                                            onClick={() => ctx.cartApi.setQty(it.productId, Math.max(0, it.qty - 1))}
                                        >
                                            −
                                        </button>
                                        <span
                                            className="qty__val"
                                            data-testid={`cart-qty-value-${it.productId}`}
                                        >
                                            {it.qty}
                                        </span>
                                        <button
                                            className="btn btn--ghost"
                                            data-testid={`cart-increase-${it.productId}`}
                                            onClick={() => ctx.cartApi.setQty(it.productId, it.qty + 1)}
                                        >
                                            +
                                        </button>
                                    </div>
                                </td>
                                <td data-testid={`cart-line-price-${it.productId}`}>
                                    {((p!.priceCents * it.qty) / 100).toFixed(2)} ₽
                                </td>
                                <td style={{ width: 120 }}>
                                    <button
                                        className="btn btn--ghost"
                                        data-testid={`cart-remove-${it.productId}`}
                                        onClick={() => ctx.cartApi.remove(it.productId)}
                                    >
                                        Удалить
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>

                    <div className="row" data-testid="cart-actions">
                        <div className="price" data-testid="cart-total">
                            Итого: {(total / 100).toFixed(2)} ₽
                        </div>
                        <div className="row__spacer" />
                        <button
                            className="btn btn--ghost"
                            data-testid="cart-clear"
                            onClick={() => ctx.cartApi.clear()}
                        >
                            Очистить
                        </button>
                        <a
                            className="btn btn--primary"
                            href="/checkout"
                            onClick={makeNavHandler(ctx, "/checkout")}
                            data-testid="cart-go-checkout"
                        >
                            Оформить
                        </a>
                    </div>
                </div>
            )}
        </section>
    );
}