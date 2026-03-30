import { useEffect } from "react";
import { createBridgeComponent } from "@module-federation/bridge-react/v19";
import type { MfRuntimeContext } from "@mf-benchmark/contracts";
import { BENCH_MARKS } from "@mf-benchmark/contracts";
import { CartPage, CheckoutPage, SuccessPage } from "@mf-benchmark/mf-checkout";

type View = "cart" | "checkout" | "success";

function CheckoutRemoteApp(props: { ctx: MfRuntimeContext; view?: View }) {
    useEffect(() => {
        performance.mark(BENCH_MARKS.MF_CHECKOUT_READY);
    }, []);

    const view = props.view ?? "cart";

    if (view === "checkout") return <CheckoutPage ctx={props.ctx} />;
    if (view === "success") return <SuccessPage ctx={props.ctx} />;
    return <CartPage ctx={props.ctx} />;
}

export default createBridgeComponent({
    rootComponent: CheckoutRemoteApp,
});