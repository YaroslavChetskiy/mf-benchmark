import type { CartState } from "../domain/cart";
import type { Product, ProductDetails, ProductId } from "../domain/product";

export type ToastLevel = "info" | "success" | "warning" | "error";

export interface AppEventMap {
    "cart:changed": {
        cart: CartState;
        count: number;
        source: "catalog" | "product" | "checkout" | "shell";
    };

    "toast:show": {
        message: string;
        level: ToastLevel;
    };

    "module:error": {
        moduleId: "catalog" | "product" | "checkout" | "shell";
        message: string;
        fatal?: boolean;
    };

    "navigation:request": {
        to: string;
        replace?: boolean;
    };

    "product:addedToCart": {
        productId: ProductId;
        qty: number;
    };

    "products:seed": {
        products: Product[];
        detailsById: Record<string, ProductDetails>;
        shellOrigin: string;
    };

    "module:ready": {
        moduleId: "catalog" | "product" | "checkout";
    };

    "iframe:resize": {
        height: number;
    };
}
