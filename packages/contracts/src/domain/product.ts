export type ProductId = string;

export interface Product {
    id: ProductId;
    title: string;
    priceCents: number;
    imageUrl: string;
    shortDescription: string;
}

export interface ProductDetails extends Product {
    longDescription?: string;
    characteristics?: Array<{ name: string; value: string }>;
}
