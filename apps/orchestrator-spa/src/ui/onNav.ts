import type { MouseEvent } from "react";
import type { NavigateFn } from "@mf-benchmark/contracts";

export function onNav(navigate: NavigateFn, to: string) {
    return (e: MouseEvent<HTMLAnchorElement>) => {
        if (e.defaultPrevented) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(to);
    };
}
