import { ProductRepo } from "@mf-benchmark/data";
import type { Product, ProductDetails, ProductId } from "@mf-benchmark/contracts";

export interface ProductsRuntime {
    preload(): Promise<void>;
    getProductsSync(): Product[];
    getProductDetailsSync(id: ProductId): ProductDetails | null;
    productsById(list: Product[]): Map<ProductId, Product>;
}

let RT: ProductsRuntime | null = null;

function assertNotNull<T>(value: T | null | undefined, name: string): asserts value is T {
    if (value == null) throw new Error(`${name} is not initialized`);
}

export function initProductsRuntime(opts: { delayMs: number }): ProductsRuntime {
    if (RT) return RT;

    const repo = new ProductRepo(opts.delayMs);

    let PRODUCTS: Product[] | null = null;
    let DETAILS_BY_ID: Map<ProductId, ProductDetails> | null = null;
    let preloadPromise: Promise<void> | null = null;

    async function preload(): Promise<void> {
        if (preloadPromise) return preloadPromise;

        preloadPromise = (async () => {
            const list = await repo.list();
            const detailsMap = new Map<ProductId, ProductDetails>();

            for (const p of list) {
                const d = await repo.getById(p.id);
                if (d) detailsMap.set(p.id, d);
            }

            PRODUCTS = list;
            DETAILS_BY_ID = detailsMap;
        })();

        return preloadPromise;
    }

    function getProductsSync(): Product[] {
        assertNotNull(PRODUCTS, "PRODUCTS");
        return PRODUCTS;
    }

    function getProductDetailsSync(id: ProductId): ProductDetails | null {
        assertNotNull(DETAILS_BY_ID, "DETAILS_BY_ID");
        return DETAILS_BY_ID.get(id) ?? null;
    }

    function productsById(list: Product[]): Map<ProductId, Product> {
        return new Map(list.map((p) => [p.id, p] as const));
    }

    RT = { preload, getProductsSync, getProductDetailsSync, productsById };
    return RT;
}

function requireRT(): ProductsRuntime {
    assertNotNull(RT, "ProductsRuntime");
    return RT;
}

export async function preloadProducts(): Promise<void> {
    return requireRT().preload();
}
export function getProductsSync(): Product[] {
    return requireRT().getProductsSync();
}
export function getProductDetailsSync(id: ProductId): ProductDetails | null {
    return requireRT().getProductDetailsSync(id);
}
export function productsById(list: Product[]): Map<ProductId, Product> {
    return requireRT().productsById(list);
}
