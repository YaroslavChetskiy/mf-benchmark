import type { Product, ProductDetails, ProductId } from "@mf-benchmark/contracts";
import productsJson from "./products.json";

function asProducts(x: unknown): Product[] {
    if (!Array.isArray(x)) throw new Error("products.json must be an array");
    return x as Product[];
}

const PRODUCTS: Product[] = asProducts(productsJson);

const BY_ID: Record<string, Product> = Object.create(null);
for (const p of PRODUCTS) {
    if (BY_ID[p.id]) throw new Error(`Duplicate product id: ${p.id}`);
    BY_ID[p.id] = p;
}

export class ProductRepo {
    constructor(private readonly delayMs: number = 0) {}

    async list(): Promise<Product[]> {
        if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
        return PRODUCTS.slice();
    }

    async getById(id: ProductId): Promise<ProductDetails | null> {
        if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
        const p = BY_ID[id as unknown as string];
        if (!p) return null;

        return {
            ...p,
            longDescription: `Расширенное описание для ${p.title}.`,
            characteristics: [
                { name: "Материал", value: "условный" },
                { name: "Гарантия", value: "12 месяцев" },
                { name: "Артикул", value: p.id }
            ]
        };
    }
}
