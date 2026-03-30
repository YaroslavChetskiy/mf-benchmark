import type { MouseEvent } from "react";
import type { MfRuntimeContext } from "./mfContext";

export function makeNavHandler(ctx: Pick<MfRuntimeContext, "navigate">, to: string) {
    return (e: MouseEvent<HTMLAnchorElement>) => {
        if (e.defaultPrevented) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        ctx.navigate(to);
    };
}
