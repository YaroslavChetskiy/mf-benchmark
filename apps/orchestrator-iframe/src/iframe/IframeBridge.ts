import type {
    AppEventMap,
    BenchMark,
    CartAddRequest,
    CartRemoveRequest,
    CartSetQtyRequest,
    IframeMessage,
    ModuleId,
    ProductsApi,
    ProductDetails,
} from "@mf-benchmark/contracts";
import { BENCH_MARKS, isIframeMessage } from "@mf-benchmark/contracts";
import type { ShellRuntime } from "../runtime/runtime";

type ModuleCfg = { url: string; origin: string };
type Cfg = Record<ModuleId, ModuleCfg>;

export class IframeBridge {
    private readonly originToModule = new Map<string, ModuleId>();
    private readonly frames = new Map<ModuleId, HTMLIFrameElement>();

    private readonly handshakeReady = new Set<ModuleId>();
    private readonly handshakeSubs = new Map<ModuleId, Set<() => void>>();

    private readonly resizeByModule = new Map<ModuleId, number>();
    private readonly resizeSubs = new Map<ModuleId, Set<(h: number) => void>>();

    private readonly runtime: ShellRuntime;
    private readonly cfg: Cfg;

    constructor(runtime: ShellRuntime, cfg: Cfg) {
        this.runtime = runtime;
        this.cfg = cfg;

        for (const k of Object.keys(cfg) as ModuleId[]) {
            this.originToModule.set(cfg[k].origin, k);
        }

        this.runtime.events.on("cart:changed", (p) => {
            this.broadcastEvent("cart:changed", p);
        });

        window.addEventListener("message", this.onMessage);
    }

    getModuleCfg(moduleId: ModuleId): ModuleCfg {
        return this.cfg[moduleId];
    }

    registerFrame(moduleId: ModuleId, iframe: HTMLIFrameElement | null) {
        if (!iframe) {
            this.frames.delete(moduleId);
            return;
        }
        this.frames.set(moduleId, iframe);
    }

    reset(moduleId: ModuleId) {
        this.handshakeReady.delete(moduleId);
    }

    isHandshakeReady(moduleId: ModuleId): boolean {
        return this.handshakeReady.has(moduleId);
    }

    onHandshakeReady(moduleId: ModuleId, cb: () => void): () => void {
        let set = this.handshakeSubs.get(moduleId);
        if (!set) {
            set = new Set();
            this.handshakeSubs.set(moduleId, set);
        }
        set.add(cb);

        if (this.handshakeReady.has(moduleId)) cb();

        return () => {
            set!.delete(cb);
        };
    }

    onResize(moduleId: ModuleId, cb: (h: number) => void): () => void {
        let set = this.resizeSubs.get(moduleId);
        if (!set) {
            set = new Set();
            this.resizeSubs.set(moduleId, set);
        }
        set.add(cb);

        const cur = this.resizeByModule.get(moduleId);
        if (typeof cur === "number") cb(cur);

        return () => {
            set!.delete(cb);
        };
    }

    private setResize(moduleId: ModuleId, h: number) {
        const height = Math.max(0, Math.floor(h));
        this.resizeByModule.set(moduleId, height);

        const set = this.resizeSubs.get(moduleId);
        if (!set) return;
        for (const cb of Array.from(set)) {
            try {
                cb(height);
            } catch {
            }
        }
    }

    private markHandshakeReady(moduleId: ModuleId) {
        if (this.handshakeReady.has(moduleId)) return;
        this.handshakeReady.add(moduleId);

        const set = this.handshakeSubs.get(moduleId);
        if (!set) return;
        for (const cb of Array.from(set)) {
            try {
                cb();
            } catch {
            }
        }
    }

    postEvent<K extends keyof AppEventMap>(moduleId: ModuleId, type: K, payload: AppEventMap[K]) {
        const iframe = this.frames.get(moduleId);
        const win = iframe?.contentWindow;
        if (!win) return;

        const msg: IframeMessage = { v: 1, kind: "event", from: "shell", type, payload } as any;

        try {
            win.postMessage(msg, this.cfg[moduleId].origin);
        } catch {
        }
    }

    broadcastEvent<K extends keyof AppEventMap>(type: K, payload: AppEventMap[K]) {
        for (const moduleId of Object.keys(this.cfg) as ModuleId[]) {
            if (!this.handshakeReady.has(moduleId)) continue;
            this.postEvent(moduleId, type, payload);
        }
    }

    private formatErr(e: unknown): string {
        return e instanceof Error ? `${e.name}: ${e.message}\n${e.stack ?? ""}` : String(e);
    }

    private mark(m: BenchMark) {
        performance.mark(m);
    }

    private onMessage = (ev: MessageEvent) => {
        void this.handleMessage(ev).catch((e) => {
            console.error("[IframeBridge] handleMessage error", e);
        });
    };

    private async handleMessage(ev: MessageEvent) {
        const moduleId = this.originToModule.get(ev.origin);
        if (!moduleId) return;

        const msg = ev.data;
        if (!isIframeMessage(msg)) return;
        if (msg.from !== moduleId) return;

        const frame = this.frames.get(moduleId);
        if (frame?.contentWindow && frame.isConnected && ev.source !== frame.contentWindow) return;

        if (msg.kind === "ready") {
            this.markHandshakeReady(moduleId);

            this.postEvent(moduleId, "navigation:request" as any, {
                to: window.location.pathname + window.location.search,
                replace: true,
            } as any);

            this.seedProducts(moduleId, this.runtime.productsApi);

            const cartApi = this.runtime.cartStore.createApiFor("shell", this.runtime.events);
            const cart = await cartApi.getCart();
            const count = cart.items.reduce((acc, it) => acc + it.qty, 0);
            this.postEvent(moduleId, "cart:changed" as any, { cart, count, source: "shell" } as any);

            return;
        }

        if (msg.kind === "event") {
            const type = msg.type;

            if (type === "navigation:request") {
                const p = msg.payload as AppEventMap["navigation:request"];
                this.runtime.navigate(p.to, { replace: p.replace });
                return;
            }

            if (type === "toast:show") {
                this.runtime.events.emit("toast:show", msg.payload as any);
                return;
            }

            if (type === "module:ready") {
                const p = msg.payload as any;
                const mark =
                    p.moduleId === "catalog"
                        ? BENCH_MARKS.MF_CATALOG_READY
                        : p.moduleId === "product"
                            ? BENCH_MARKS.MF_PRODUCT_READY
                            : BENCH_MARKS.MF_CHECKOUT_READY;
                this.mark(mark);
                return;
            }

            if (type === "iframe:resize") {
                const p = msg.payload as any;
                this.setResize(moduleId, p.height);
                return;
            }

            this.runtime.events.emit(type as any, msg.payload as any);
            return;
        }

        if (msg.kind === "request") {
            const cartApi = this.runtime.cartStore.createApiFor(moduleId, this.runtime.events);

            const respond = (ok: boolean, payload: any, error?: { code: string; message: string }) => {
                const iframe = this.frames.get(moduleId);
                const win = iframe?.contentWindow;
                if (!win) return;

                const res: IframeMessage = {
                    v: 1,
                    kind: "response",
                    from: "shell",
                    type: msg.type,
                    requestId: msg.requestId!,
                    ok,
                    payload,
                    error,
                } as any;

                try {
                    win.postMessage(res, this.cfg[moduleId].origin);
                } catch {
                }
            };

            try {
                if (msg.type === "cart:get") {
                    const cart = await cartApi.getCart();
                    respond(true, { cart });
                    return;
                }

                if (msg.type === "cart:add") {
                    const req = msg as CartAddRequest;
                    const cart = await cartApi.add(req.payload.productId, req.payload.qty);
                    respond(true, { cart });
                    return;
                }

                if (msg.type === "cart:remove") {
                    const req = msg as CartRemoveRequest;
                    const cart = await cartApi.remove(req.payload.productId);
                    respond(true, { cart });
                    return;
                }

                if (msg.type === "cart:setQty") {
                    const req = msg as CartSetQtyRequest;
                    const cart = await cartApi.setQty(req.payload.productId, req.payload.qty);
                    respond(true, { cart });
                    return;
                }

                if (msg.type === "cart:clear") {
                    const cart = await cartApi.clear();
                    respond(true, { cart });
                    return;
                }

                respond(false, {}, { code: "UNKNOWN", message: `Unknown request type: ${msg.type}` });
            } catch (e) {
                respond(false, {}, { code: "MODULE_RUNTIME_FAILED", message: this.formatErr(e) });
            }
        }
    }

    private seedProducts(moduleId: ModuleId, api: ProductsApi) {
        const shellOrigin = window.location.origin;

        const toAbs = (u: string) => {
            try {
                return new URL(u, shellOrigin).toString();
            } catch {
                return u;
            }
        };

        const products = api.getProductsSync().map((p) => ({
            ...p,
            imageUrl: toAbs(p.imageUrl),
        }));

        const detailsById: Record<string, ProductDetails> = {};
        for (const p of products) {
            const d = api.getProductDetailsSync(p.id);
            if (d) detailsById[p.id] = { ...d, imageUrl: toAbs(d.imageUrl) };
        }

        this.postEvent(moduleId, "products:seed" as any, { products, detailsById, shellOrigin } as any);
    }
}
