import type { MouseEvent } from "react";
import type { NavigateFunction } from "react-router-dom";

export function onNav(navigate: NavigateFunction, to: string) {
    return (e: MouseEvent<HTMLAnchorElement>) => {
        if (e.defaultPrevented) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(to);
    };
}
