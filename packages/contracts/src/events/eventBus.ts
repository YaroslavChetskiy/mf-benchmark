export type Unsubscribe = () => void;

export interface EventBus<E extends Record<string, any>> {
    on<K extends keyof E>(type: K, handler: (payload: E[K]) => void): Unsubscribe;
    once<K extends keyof E>(type: K, handler: (payload: E[K]) => void): Unsubscribe;
    off<K extends keyof E>(type: K, handler: (payload: E[K]) => void): void;
    emit<K extends keyof E>(type: K, payload: E[K]): void;
    clear(): void;
}

export class SimpleEventBus<E extends Record<string, any>> implements EventBus<E> {
    private handlers = new Map<keyof E, Set<(payload: any) => void>>();

    on<K extends keyof E>(type: K, handler: (payload: E[K]) => void): Unsubscribe {
        let set = this.handlers.get(type);
        if (!set) {
            set = new Set();
            this.handlers.set(type, set);
        }
        set.add(handler as any);
        return () => this.off(type, handler);
    }

    once<K extends keyof E>(type: K, handler: (payload: E[K]) => void): Unsubscribe {
        const wrapped = (payload: E[K]) => {
            this.off(type, wrapped as any);
            handler(payload);
        };
        return this.on(type, wrapped);
    }

    off<K extends keyof E>(type: K, handler: (payload: E[K]) => void): void {
        const set = this.handlers.get(type);
        if (!set) return;
        set.delete(handler as any);
        if (set.size === 0) this.handlers.delete(type);
    }

    emit<K extends keyof E>(type: K, payload: E[K]): void {
        const set = this.handlers.get(type);
        if (!set) return;
        for (const h of Array.from(set)) {
            try {
                h(payload);
            } catch (e) {
                console.error(`[EventBus] handler error for ${String(type)}`, e);
            }
        }
    }

    clear(): void {
        this.handlers.clear();
    }
}
