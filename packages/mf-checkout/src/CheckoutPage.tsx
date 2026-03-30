import { type FormEvent, useEffect, useState } from "react";
import type { CartState, MfRuntimeContext } from "@mf-benchmark/contracts";
import { makeNavHandler } from "@mf-benchmark/contracts";

function isEmail(x: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}

export function CheckoutPage(props: { ctx: MfRuntimeContext }) {
    const { ctx } = props;

    const [cart, setCart] = useState<CartState>({ items: [] });
    useEffect(() => ctx.cartApi.subscribe(setCart), [ctx.cartApi]);

    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [promo, setPromo] = useState("");
    const [err, setErr] = useState<string | null>(null);

    const canSubmit = cart.items.length > 0;

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErr(null);

        if (!canSubmit) return setErr("Корзина пуста.");
        if (!isEmail(email)) return setErr("Введите корректный email.");
        if (address.trim().length < 6) return setErr("Адрес слишком короткий.");

        await new Promise((r) => setTimeout(r, 120));

        if (promo.trim().toLowerCase() === "fail") {
            setErr("Промокод недействителен (тест).");
            ctx.events.emit("toast:show", { message: "Промокод отклонён", level: "warning" });
            return;
        }

        ctx.events.emit("toast:show", { message: "Заказ оформлен", level: "success" });
        await ctx.cartApi.clear();
        ctx.navigate("/success", { replace: true });
    };

    return (
        <section className="page" data-testid="checkout-page">
            <h1 className="page-title" data-testid="checkout-title">Оформление</h1>

            {!canSubmit && (
                <div className="card" data-testid="checkout-empty-cart">
                    <div data-testid="checkout-empty-cart-text">Сначала добавьте товары в корзину.</div>
                    <a
                        className="btn btn--primary"
                        href="/catalog"
                        onClick={makeNavHandler(ctx, "/catalog")}
                        data-testid="checkout-go-catalog"
                    >
                        В каталог
                    </a>
                </div>
            )}

            <form className="card" onSubmit={onSubmit} data-testid="checkout-form">
                <label className="field">
                    <span className="field__label">Email</span>
                    <input
                        className="input"
                        data-testid="checkout-email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@example.com"
                    />
                </label>

                <label className="field">
                    <span className="field__label">Адрес</span>
                    <input
                        className="input"
                        data-testid="checkout-address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Город, улица, дом"
                    />
                </label>

                <label className="field">
                    <span className="field__label">Промокод (опционально)</span>
                    <input
                        className="input"
                        data-testid="checkout-promo"
                        value={promo}
                        onChange={(e) => setPromo(e.target.value)}
                        placeholder="SAVE10 (или fail для теста)"
                    />
                </label>

                {err && (
                    <div className="error-inline" data-testid="checkout-error">
                        {err}
                    </div>
                )}

                <div className="row" data-testid="checkout-actions">
                    <button
                        className="btn btn--primary"
                        type="submit"
                        disabled={!canSubmit}
                        data-testid="checkout-submit"
                    >
                        Подтвердить
                    </button>
                    <div className="row__spacer" />
                    <a
                        className="btn btn--ghost"
                        href="/cart"
                        onClick={makeNavHandler(ctx, "/cart")}
                        data-testid="checkout-back-to-cart"
                    >
                        Назад в корзину
                    </a>
                </div>
            </form>
        </section>
    );
}