import type { Product, ProductDetails, ProductId } from "../domain/product";

export interface ProductsApi {
    preload(): Promise<void>;
    getProductsSync(): Product[];
    getProductDetailsSync(id: ProductId): ProductDetails | null;
    productsById(list: Product[]): Map<ProductId, Product>;
}
