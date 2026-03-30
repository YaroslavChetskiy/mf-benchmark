import type {
    AppEventMap,
    CartApi,
    CartState,
    EventBus,
    ModuleId,
    ProductId,
    Unsubscribe,
} from "@mf-benchmark/contracts";

function normalize(items: CartState["items"]): CartState["items"] {
    const byId = new Map<ProductId, number>();
    for (const it of items) byId.set(it.productId, (byId.get(it.productId) ?? 0) + it.qty);
    return Array.from(byId.entries())
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => ({ productId, qty }));
}

export class CartStore {
    private cart: CartState = { items: [] };
    private subs = new Set<(c: CartState) => void>();

    subscribe(handler: (cart: CartState) => void): Unsubscribe {
        this.subs.add(handler);
        handler(this.cart);
        return () => this.subs.delete(handler);
    }

    private emit(events: EventBus<AppEventMap>, source: AppEventMap["cart:changed"]["source"]) {
        const cart = this.cart;
        for (const s of this.subs) s(cart);

        const count = cart.items.reduce((acc, it) => acc + it.qty, 0);
        events.emit("cart:changed", { cart, count, source });
    }

    createApiFor(source: ModuleId | "shell", events: EventBus<AppEventMap>): CartApi {
        return {
            getCart: async () => this.cart,

            add: async (productId, qty = 1) => {
                this.cart = { items: normalize([...this.cart.items, { productId, qty }]) };
                this.emit(events, source);
                return this.cart;
            },

            remove: async (productId) => {
                this.cart = { items: normalize(this.cart.items.filter((x) => x.productId !== productId)) };
                this.emit(events, source);
                return this.cart;
            },

            setQty: async (productId, qty) => {
                const rest = this.cart.items.filter((x) => x.productId !== productId);
                this.cart = { items: normalize([...rest, { productId, qty }]) };
                this.emit(events, source);
                return this.cart;
            },

            clear: async () => {
                this.cart = { items: [] };
                this.emit(events, source);
                return this.cart;
            },

            subscribe: (h) => this.subscribe(h),
        };
    }
}
