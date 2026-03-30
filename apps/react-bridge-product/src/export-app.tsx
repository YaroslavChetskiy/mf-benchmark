import { useEffect } from "react";
import { createBridgeComponent } from "@module-federation/bridge-react/v19";
import type { MfRuntimeContext, ProductId } from "@mf-benchmark/contracts";
import { BENCH_MARKS } from "@mf-benchmark/contracts";
import { ProductPage } from "@mf-benchmark/mf-product";

function ProductRemoteApp(props: {
    ctx: MfRuntimeContext;
    productId: ProductId;
    stress?: boolean;
}) {
    useEffect(() => {
        performance.mark(BENCH_MARKS.MF_PRODUCT_READY);
    }, []);

    return (
        <ProductPage
            ctx={props.ctx}
            productId={props.productId}
            stress={props.stress}
        />
    );
}

export default createBridgeComponent({
    rootComponent: ProductRemoteApp,
});