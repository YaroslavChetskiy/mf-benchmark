export {};

declare global {
    interface Window {
        __benchVitals?: {
            cls?: { value: number; rating?: string; delta?: number; id?: string; at?: number };
            fcp?: { value: number; rating?: string; delta?: number; id?: string; at?: number };
            lcp?: { value: number; rating?: string; delta?: number; id?: string; at?: number };
            inp?: { value: number; rating?: string; delta?: number; id?: string; at?: number };
            ttfb?: { value: number; rating?: string; delta?: number; id?: string; at?: number };
        };
    }
}