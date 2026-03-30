import type { Product, ProductId } from "./product";

export interface CartItem {
    productId: ProductId;
    qty: number;
}

export interface CartLine {
    product: Product;
    qty: number;
    lineTotalCents: number;
}

export interface CartState {
    items: CartItem[];
}

export interface CartView {
    lines: CartLine[];
    totalCents: number;
    count: number;
}

export function calcCartView(productsById: Map<ProductId, Product>, cart: CartState): CartView {
    const lines: CartLine[] = [];
    let totalCents = 0;
    let count = 0;

    for (const it of cart.items) {
        const product = productsById.get(it.productId);
        if (!product) continue;

        const qty = Math.max(0, Math.floor(it.qty));
        const lineTotalCents = product.priceCents * qty;
        totalCents += lineTotalCents;
        count += qty;

        lines.push({ product, qty, lineTotalCents });
    }

    return { lines, totalCents, count };
}
