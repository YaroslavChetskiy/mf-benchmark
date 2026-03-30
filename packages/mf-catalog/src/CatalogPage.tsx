import { useEffect, useMemo, useState } from "react";
import type { MfRuntimeContext } from "@mf-benchmark/contracts";
import { makeNavHandler } from "@mf-benchmark/contracts";

export function CatalogPage(props: { ctx: MfRuntimeContext }) {
    const { ctx } = props;

    const products = useMemo(() => ctx.productsApi.getProductsSync(), [ctx.productsApi]);

    const [q, setQ] = useState("");
    const [debounced, setDebounced] = useState("");

    useEffect(() => {
        const t = window.setTimeout(() => setDebounced(q.trim().toLowerCase()), 200);
        return () => window.clearTimeout(t);
    }, [q]);

    const filtered = useMemo(() => {
        if (!debounced) return products;
        return products.filter((p) => p.title.toLowerCase().includes(debounced));
    }, [debounced, products]);

    return (
        <section className="page" data-testid="catalog-page">
            <h1 className="page-title" data-testid="catalog-title">Каталог</h1>

            <div className="card" data-testid="catalog-search-card">
                <label className="field">
                    <span className="field__label">Поиск</span>
                    <input
                        className="input"
                        data-testid="catalog-search-input"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Введите часть названия..."
                    />
                </label>
                <div className="muted" data-testid="catalog-results-count">
                    Найдено: {filtered.length}
                </div>
            </div>

            <div className="grid" data-testid="catalog-grid">
                {filtered.map((p) => {
                    const to = `/product/${p.id}`;
                    return (
                        <a
                            key={p.id}
                            href={to}
                            onClick={makeNavHandler(ctx, to)}
                            className="product-card"
                            data-testid={`product-card-${p.id}`}
                            data-product-id={p.id}
                        >
                            <img
                                className="product-card__img"
                                src={p.imageUrl}
                                width={96}
                                height={96}
                                alt=""
                                data-testid={`product-card-image-${p.id}`}
                            />
                            <div className="product-card__body">
                                <div
                                    className="product-card__title"
                                    data-testid={`product-card-title-${p.id}`}
                                >
                                    {p.title}
                                </div>
                                <div
                                    className="product-card__desc"
                                    data-testid={`product-card-desc-${p.id}`}
                                >
                                    {p.shortDescription}
                                </div>
                                <div
                                    className="product-card__price"
                                    data-testid={`product-card-price-${p.id}`}
                                >
                                    {(p.priceCents / 100).toFixed(2)} ₽
                                </div>
                            </div>
                        </a>
                    );
                })}
            </div>

            <div className="card" data-testid="catalog-actions-card">
                <button
                    className="btn"
                    data-testid="catalog-toast-button"
                    onClick={() =>
                        ctx.events.emit("toast:show", {
                            message: "Тестовый тост из каталога",
                            level: "info",
                        })
                    }
                >
                    Показать тост
                </button>
            </div>
        </section>
    );
}