import { useEffect, useMemo, useState } from "react";
import type { MfRuntimeContext, ProductId } from "@mf-benchmark/contracts";
import { makeNavHandler } from "@mf-benchmark/contracts";

export function ProductPage(props: { ctx: MfRuntimeContext; productId: ProductId; stress?: boolean }) {
    const { ctx, productId, stress = false } = props;

    const product = useMemo(
        () => ctx.productsApi.getProductDetailsSync(productId),
        [ctx.productsApi, productId]
    );

    const [detailsLoaded, setDetailsLoaded] = useState(false);

    useEffect(() => {
        setDetailsLoaded(false);
        const t = window.setTimeout(() => setDetailsLoaded(true), 450);
        return () => window.clearTimeout(t);
    }, [productId]);

    if (!product) {
        return (
            <section className="page" data-testid="product-not-found-page">
                <h1 className="page-title" data-testid="product-not-found-title">Товар не найден</h1>
                <a
                    className="link"
                    href="/catalog"
                    onClick={makeNavHandler(ctx, "/catalog")}
                    data-testid="product-not-found-back"
                >
                    Вернуться в каталог
                </a>
            </section>
        );
    }

    return (
        <section
            className="page"
            data-testid="product-page"
            data-product-id={product.id}
        >
            <div className="breadcrumbs" data-testid="product-breadcrumbs">
                <a
                    className="link"
                    href="/catalog"
                    onClick={makeNavHandler(ctx, "/catalog")}
                    data-testid="product-back-to-catalog"
                >
                    Каталог
                </a>
                <span className="muted">/</span>
                <span data-testid="product-breadcrumb-current">{product.title}</span>
            </div>

            <div className="hero" data-testid="product-hero">
                <img
                    className="hero__img"
                    src={product.imageUrl}
                    width={220}
                    height={220}
                    alt=""
                    data-testid="product-image"
                />
                <div className="hero__body">
                    <h1 className="page-title" data-testid="product-title">{product.title}</h1>
                    <div className="muted" data-testid="product-short-description">
                        {product.shortDescription}
                    </div>

                    <div className="hero__row" data-testid="product-actions">
                        <div className="price" data-testid="product-price">
                            {(product.priceCents / 100).toFixed(2)} ₽
                        </div>

                        <button
                            className="btn btn--primary"
                            data-testid="product-add-to-cart"
                            onClick={async () => {
                                await ctx.cartApi.add(product.id, 1);
                                ctx.events.emit("toast:show", {
                                    message: "Добавлено в корзину",
                                    level: "success",
                                });
                            }}
                        >
                            Добавить в корзину
                        </button>

                        <a
                            className="btn btn--ghost"
                            href="/cart"
                            onClick={makeNavHandler(ctx, "/cart")}
                            data-testid="product-go-to-cart"
                        >
                            В корзину
                        </a>
                    </div>

                    <div className="muted small" data-testid="product-stress-flag">
                        CLS-stress: {stress ? "on" : "off"}
                    </div>
                </div>
            </div>

            <div className="card" data-testid="product-characteristics-card">
                <h2 className="section-title" data-testid="product-characteristics-title">
                    Характеристики
                </h2>

                <div style={{ minHeight: 140 }}>
                    {!detailsLoaded ? (
                        <div
                            className={stress ? "skeleton skeleton--stress" : "skeleton"}
                            data-testid="product-characteristics-loading"
                        >
                            Загрузка…
                        </div>
                    ) : (
                        <ul className="list" data-testid="product-characteristics-list">
                            {product.characteristics?.map((c) => (
                                <li
                                    key={c.name}
                                    data-testid={`product-characteristic-${c.name}`}
                                >
                                    {c.name}: {c.value}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    );
}