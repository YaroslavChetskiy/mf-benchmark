export {};

declare global {
    interface Window {
        __benchVitals?: {
            cls?: { value: number };
            fcp?: { value: number };
            lcp?: { value: number };
            inp?: { value: number };
            ttfb?: { value: number };
        };
    }
}
