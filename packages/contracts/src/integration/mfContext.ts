import type { CartState } from "../domain/cart";
import type { ProductId } from "../domain/product";
import type { EventBus, Unsubscribe } from "../events/eventBus";
import type { AppEventMap } from "../events/appEvents";
import type { ProductsApi } from "./productsApi";

export type ModuleId = "catalog" | "product" | "checkout";

export interface CartApi {
    getCart(): Promise<CartState>;
    add(productId: ProductId, qty?: number): Promise<CartState>;
    remove(productId: ProductId): Promise<CartState>;
    setQty(productId: ProductId, qty: number): Promise<CartState>;
    clear(): Promise<CartState>;
    subscribe(handler: (cart: CartState) => void): Unsubscribe;
}

export type NavigateFn = (to: string, opts?: { replace?: boolean }) => void;

export interface MfRuntimeContext {
    moduleId: ModuleId;
    cartApi: CartApi;
    events: EventBus<AppEventMap>;
    navigate: NavigateFn;
    productsApi: ProductsApi;
}

export interface MfMountResult {
    unmount(): void;
}
