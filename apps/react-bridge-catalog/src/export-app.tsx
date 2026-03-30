import { useEffect } from "react";
import { createBridgeComponent } from "@module-federation/bridge-react/v19";
import type { MfRuntimeContext } from "@mf-benchmark/contracts";
import { BENCH_MARKS } from "@mf-benchmark/contracts";
import { CatalogPage } from "@mf-benchmark/mf-catalog";

function CatalogRemoteApp(props: { ctx: MfRuntimeContext }) {
    useEffect(() => {
        performance.mark(BENCH_MARKS.MF_CATALOG_READY);
    }, []);

    return <CatalogPage ctx={props.ctx} />;
}

export default createBridgeComponent({
    rootComponent: CatalogRemoteApp,
});