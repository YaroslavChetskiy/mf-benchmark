declare module "mf_catalog/CatalogPage" {
    import type { ComponentType } from "react";
    import type { MfRuntimeContext } from "@mf-benchmark/contracts";
    export const CatalogPage: ComponentType<{ ctx: MfRuntimeContext }>;
}

declare module "mf_product/ProductPage" {
    import type { ComponentType } from "react";
    import type { MfRuntimeContext, ProductId } from "@mf-benchmark/contracts";
    export const ProductPage: ComponentType<{ ctx: MfRuntimeContext; productId: ProductId; stress?: boolean }>;
}

declare module "mf_checkout/CartPage" {
    import type { ComponentType } from "react";
    import type { MfRuntimeContext } from "@mf-benchmark/contracts";
    export const CartPage: ComponentType<{ ctx: MfRuntimeContext }>;
}

declare module "mf_checkout/CheckoutPage" {
    import type { ComponentType } from "react";
    import type { MfRuntimeContext } from "@mf-benchmark/contracts";
    export const CheckoutPage: ComponentType<{ ctx: MfRuntimeContext }>;
}

declare module "mf_checkout/SuccessPage" {
    import type { ComponentType } from "react";
    import type { MfRuntimeContext } from "@mf-benchmark/contracts";
    export const SuccessPage: ComponentType<{ ctx: MfRuntimeContext }>;
}
