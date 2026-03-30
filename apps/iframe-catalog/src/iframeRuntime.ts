import type {
    AppEventMap,
    CartApi,
    CartAddRequest,
    CartAddResponse,
    CartClearRequest,
    CartClearResponse,
    CartGetRequest,
    CartGetResponse,
    CartRemoveRequest,
    CartRemoveResponse,
    CartSetQtyRequest,
    CartSetQtyResponse,
    EventBus,
    IframeMessage,
    IframeReadyEnvelope,
    MfRuntimeContext,
    ModuleId,
    ProductsApi,
    Product,
    ProductDetails,
    ProductId,
    Unsubscribe,
} from "@mf-benchmark/contracts";
import { SimpleEventBus, isIframeMessage, makeRequestId } from "@mf-benchmark/contracts";

type Loc = { pathname: string; search: string };

function parseTo(to: string): Loc {
    try {
        const u = new URL(to, "http://x");
        return { pathname: u.pathname, search: u.search };
    } catch {
        return { pathname: to || "/", search: "" };
    }
}

export type IframeRuntime = {
    ctx: MfRuntimeContext;
    readyPromise: Promise<void>;

    getLocation(): Loc;
    subscribeLocation(handler: (loc: Loc) => void): Unsubscribe;
};

export function startAutoResize(ctx: Pick<MfRuntimeContext, "events">): Unsubscribe {
    let raf = 0;

    const post = () => {
        if (raf) return;
        raf = window.requestAnimationFrame(() => {
            raf = 0;

            const de = document.documentElement;
            const body = document.body;

            const h = Math.max(
                de?.scrollHeight ?? 0,
                de?.offsetHeight ?? 0,
                body?.scrollHeight ?? 0,
                body?.offsetHeight ?? 0
            );

            ctx.events.emit("iframe:resize" as any, { height: h } as any);
        });
    };

    const ro = new ResizeObserver(() => post());
    ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);

    window.addEventListener("resize", post);

    post();

    return () => {
        if (raf) window.cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener("resize", post);
    };
}

export function createIframeRuntime(moduleId: ModuleId): IframeRuntime {
    const inbound = new SimpleEventBus<AppEventMap>();

    const PARENT_ORIGIN =
        document.referrer && document.referrer.startsWith("http")
            ? new URL(document.referrer).origin
            : "*";

    let loc: Loc = { pathname: "/", search: "" };
    const locSubs = new Set<(l: Loc) => void>();

    const emitLoc = () => {
        for (const h of Array.from(locSubs)) {
            try {
                h(loc);
            } catch {
            }
        }
    };

    let PRODUCTS: Product[] | null = null;
    let DETAILS_BY_ID: Map<ProductId, ProductDetails> | null = null;

    let gotSeed = false;
    let gotNav = false;

    let resolveReady!: () => void;
    const readyPromise = new Promise<void>((r) => (resolveReady = r));

    const maybeReady = () => {
        if (gotSeed && gotNav) resolveReady();
    };

    let lastCart: AppEventMap["cart:changed"]["cart"] | null = null;
    const cartSubs = new Set<(c: AppEventMap["cart:changed"]["cart"]) => void>();

    const notifyCartSubs = (c: AppEventMap["cart:changed"]["cart"]) => {
        for (const h of Array.from(cartSubs)) {
            try {
                h(c);
            } catch {
            }
        }
    };

    const pending = new Map<string, { resolve: (x: any) => void; reject: (e: any) => void }>();

    function postMessage(msg: IframeMessage) {
        window.parent.postMessage(msg, PARENT_ORIGIN);
    }

    function postEvent<K extends keyof AppEventMap>(type: K, payload: AppEventMap[K]) {
        const msg: IframeMessage = { v: 1, kind: "event", from: moduleId, type, payload } as any;
        postMessage(msg);
    }

    function request<TReq extends IframeMessage, TRes extends IframeMessage>(
        msg: TReq,
        timeoutMs = 2500
    ): Promise<TRes> {
        return new Promise((resolve, reject) => {
            const requestId = (msg as any).requestId as string;

            const t = window.setTimeout(() => {
                pending.delete(requestId);
                reject(new Error(`postMessage timeout (${timeoutMs}ms) for ${String((msg as any).type)}`));
            }, timeoutMs);

            pending.set(requestId, {
                resolve: (x) => {
                    window.clearTimeout(t);
                    resolve(x);
                },
                reject: (e) => {
                    window.clearTimeout(t);
                    reject(e);
                },
            });

            postMessage(msg);
        });
    }

    const cartApi: CartApi = {
        getCart: async () => {
            const requestId = makeRequestId("cart_get");
            const req: CartGetRequest = {
                v: 1,
                kind: "request",
                from: moduleId,
                type: "cart:get",
                payload: {},
                requestId,
            };
            const res = (await request(req)) as any as CartGetResponse;
            if (!res.ok) throw new Error(res.error?.message ?? "cart:get failed");
            lastCart = res.payload.cart;
            return res.payload.cart;
        },

        add: async (productId, qty = 1) => {
            const requestId = makeRequestId("cart_add");
            const req: CartAddRequest = {
                v: 1,
                kind: "request",
                from: moduleId,
                type: "cart:add",
                payload: { productId, qty },
                requestId,
            };
            const res = (await request(req)) as any as CartAddResponse;
            if (!res.ok) throw new Error(res.error?.message ?? "cart:add failed");
            lastCart = res.payload.cart;
            notifyCartSubs(lastCart);
            return res.payload.cart;
        },

        remove: async (productId) => {
            const requestId = makeRequestId("cart_rm");
            const req: CartRemoveRequest = {
                v: 1,
                kind: "request",
                from: moduleId,
                type: "cart:remove",
                payload: { productId },
                requestId,
            };
            const res = (await request(req)) as any as CartRemoveResponse;
            if (!res.ok) throw new Error(res.error?.message ?? "cart:remove failed");
            lastCart = res.payload.cart;
            notifyCartSubs(lastCart);
            return res.payload.cart;
        },

        setQty: async (productId, qty) => {
            const requestId = makeRequestId("cart_set");
            const req: CartSetQtyRequest = {
                v: 1,
                kind: "request",
                from: moduleId,
                type: "cart:setQty",
                payload: { productId, qty },
                requestId,
            };
            const res = (await request(req)) as any as CartSetQtyResponse;
            if (!res.ok) throw new Error(res.error?.message ?? "cart:setQty failed");
            lastCart = res.payload.cart;
            notifyCartSubs(lastCart);
            return res.payload.cart;
        },

        clear: async () => {
            const requestId = makeRequestId("cart_clear");
            const req: CartClearRequest = {
                v: 1,
                kind: "request",
                from: moduleId,
                type: "cart:clear",
                payload: {},
                requestId,
            };
            const res = (await request(req)) as any as CartClearResponse;
            if (!res.ok) throw new Error(res.error?.message ?? "cart:clear failed");
            lastCart = res.payload.cart;
            notifyCartSubs(lastCart);
            return res.payload.cart;
        },

        subscribe: (handler) => {
            cartSubs.add(handler);

            if (lastCart) handler(lastCart);
            else {
                void cartApi.getCart().then(handler).catch(() => {});
            }

            return () => {
                cartSubs.delete(handler);
            };
        },
    };

    const productsApi: ProductsApi = {
        preload: async () => {
            await readyPromise;
        },

        getProductsSync: () => {
            if (!PRODUCTS) throw new Error("PRODUCTS not seeded yet");
            return PRODUCTS;
        },

        getProductDetailsSync: (id) => {
            if (!DETAILS_BY_ID) throw new Error("DETAILS_BY_ID not seeded yet");
            return DETAILS_BY_ID.get(id) ?? null;
        },

        productsById: (list) => new Map(list.map((p) => [p.id, p] as const)),
    };

    const events: EventBus<AppEventMap> = {
        on: (t, h) => inbound.on(t, h as any),
        once: (t, h) => inbound.once(t, h as any),
        off: (t, h) => inbound.off(t, h as any),
        clear: () => inbound.clear(),

        emit: (t, p) => {
            postEvent(t as any, p as any);
        },
    };

    const ctx: MfRuntimeContext = {
        moduleId,
        cartApi,
        events,
        productsApi,
        navigate: (to, opts) => {
            loc = parseTo(to);
            emitLoc();

            postEvent("navigation:request", { to, replace: opts?.replace } as any);
        },
    };

    function handleInboundEvent<K extends keyof AppEventMap>(type: K, payload: AppEventMap[K]) {
        if (type === "navigation:request") {
            const p = payload as AppEventMap["navigation:request"];
            loc = parseTo(p.to);
            gotNav = true;
            emitLoc();
            maybeReady();
            return;
        }

        if (type === "products:seed") {
            const p = payload as any;
            PRODUCTS = p.products;

            DETAILS_BY_ID = new Map<ProductId, ProductDetails>();
            for (const [k, v] of Object.entries(p.detailsById)) {
                DETAILS_BY_ID.set(k as ProductId, v as ProductDetails);
            }

            gotSeed = true;
            maybeReady();
            return;
        }

        if (type === "cart:changed") {
            const p = payload as AppEventMap["cart:changed"];
            lastCart = p.cart;
            notifyCartSubs(p.cart);
            inbound.emit("cart:changed", p as any);
            return;
        }

        inbound.emit(type as any, payload as any);
    }

    const onMessage = (ev: MessageEvent) => {
        if (PARENT_ORIGIN !== "*" && ev.origin !== PARENT_ORIGIN) return;
        if (ev.source !== window.parent) return;

        const msg = ev.data;
        if (!isIframeMessage(msg)) return;
        if (msg.from !== "shell") return;

        if (msg.kind === "event") {
            handleInboundEvent(msg.type as any, msg.payload as any);
            return;
        }

        if (msg.kind === "response") {
            const p = pending.get(msg.requestId!);
            if (!p) return;
            pending.delete(msg.requestId!);

            if (!msg.ok) {
                p.reject(new Error(msg.error?.message ?? "rpc failed"));
            } else {
                p.resolve(msg);
            }
        }
    };

    window.addEventListener("message", onMessage);

    const ready: IframeReadyEnvelope = { v: 1, kind: "ready", from: moduleId };
    postMessage(ready as any);

    return {
        ctx,
        readyPromise,

        getLocation: () => loc,
        subscribeLocation: (h) => {
            locSubs.add(h);
            h(loc);
            return () => {
                locSubs.delete(h);
            };
        },
    };
}
