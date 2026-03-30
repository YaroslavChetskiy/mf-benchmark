import React, { createContext, useContext } from "react";
import type { IframeBridge } from "./IframeBridge";

const Ctx = createContext<IframeBridge | null>(null);

export function BridgeProvider(props: { bridge: IframeBridge; children: React.ReactNode }) {
    return <Ctx.Provider value={props.bridge}>{props.children}</Ctx.Provider>;
}

export function useIframeBridge(): IframeBridge {
    const v = useContext(Ctx);
    if (!v) throw new Error("BridgeProvider missing");
    return v;
}
