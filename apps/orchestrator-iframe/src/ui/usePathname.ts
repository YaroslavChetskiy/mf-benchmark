import { useEffect, useState } from "react";

export function usePathname(): string {
    const [p, setP] = useState(() => window.location.pathname);

    useEffect(() => {
        const onChange = () => setP(window.location.pathname);
        window.addEventListener("popstate", onChange);
        window.addEventListener("hashchange", onChange);
        return () => {
            window.removeEventListener("popstate", onChange);
            window.removeEventListener("hashchange", onChange);
        };
    }, []);

    return p;
}
