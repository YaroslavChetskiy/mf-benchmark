import type { CartState } from "../domain/cart";
import type { ProductId } from "../domain/product";
import type { AppEventMap } from "../events/appEvents";
import type { ModuleId } from "./mfContext";


export const IFRAME_PROTOCOL_VERSION = 1 as const;

export type IframeFrom = "shell" | ModuleId;

export interface IframeEnvelopeBase {
    v: typeof IFRAME_PROTOCOL_VERSION;
    from: IframeFrom;
    requestId?: string;
}

export interface IframeEventEnvelope<K extends keyof AppEventMap> extends IframeEnvelopeBase {
    kind: "event";
    type: K;
    payload: AppEventMap[K];
}

export interface IframeRequestEnvelope<TType extends string, TPayload> extends IframeEnvelopeBase {
    kind: "request";
    type: TType;
    payload: TPayload;
    requestId: string;
}

export interface IframeResponseEnvelope<TType extends string, TPayload> extends IframeEnvelopeBase {
    kind: "response";
    type: TType;
    payload: TPayload;
    requestId: string;
    ok: boolean;
    error?: { code: string; message: string };
}


export interface IframeReadyEnvelope extends IframeEnvelopeBase {
    kind: "ready";
}


export type CartGetRequest = IframeRequestEnvelope<"cart:get", {}>;
export type CartGetResponse = IframeResponseEnvelope<"cart:get", { cart: CartState }>;

export type CartAddRequest = IframeRequestEnvelope<"cart:add", { productId: ProductId; qty: number }>;
export type CartAddResponse = IframeResponseEnvelope<"cart:add", { cart: CartState }>;

export type CartRemoveRequest = IframeRequestEnvelope<"cart:remove", { productId: ProductId }>;
export type CartRemoveResponse = IframeResponseEnvelope<"cart:remove", { cart: CartState }>;

export type CartSetQtyRequest = IframeRequestEnvelope<"cart:setQty", { productId: ProductId; qty: number }>;
export type CartSetQtyResponse = IframeResponseEnvelope<"cart:setQty", { cart: CartState }>;

export type CartClearRequest = IframeRequestEnvelope<"cart:clear", {}>;
export type CartClearResponse = IframeResponseEnvelope<"cart:clear", { cart: CartState }>;

export type IframeMessage =
    | IframeReadyEnvelope
    | IframeEventEnvelope<keyof AppEventMap>
    | CartGetRequest
    | CartGetResponse
    | CartAddRequest
    | CartAddResponse
    | CartRemoveRequest
    | CartRemoveResponse
    | CartSetQtyRequest
    | CartSetQtyResponse
    | CartClearRequest
    | CartClearResponse;

export function isIframeMessage(x: any): x is IframeMessage {
    if (!x || typeof x !== "object") return false;
    if (x.v !== IFRAME_PROTOCOL_VERSION) return false;
    if (typeof x.kind !== "string") return false;
    if (typeof x.from !== "string") return false;

    if (x.kind === "ready") return true;

    if (x.kind === "event") {
        return typeof x.type === "string" && "payload" in x;
    }

    if (x.kind === "request" || x.kind === "response") {
        return typeof x.type === "string" && typeof x.requestId === "string" && "payload" in x;
    }

    return false;
}

export function makeRequestId(prefix = "req"): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
