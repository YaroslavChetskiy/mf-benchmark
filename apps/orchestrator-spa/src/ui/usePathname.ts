import { useEffect, useState } from "react";

export function usePathname(): string {
    const [p, setP] = useState(() => window.location.pathname);

    useEffect(() => {
        const onChange = () => setP(window.location.pathname);

        window.addEventListener("single-spa:routing-event", onChange);
        window.addEventListener("popstate", onChange);
        window.addEventListener("hashchange", onChange);

        return () => {
            window.removeEventListener("single-spa:routing-event", onChange);
            window.removeEventListener("popstate", onChange);
            window.removeEventListener("hashchange", onChange);
        };
    }, []);

    return p;
}
