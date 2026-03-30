import { Header } from "./ui/Header";
import { Toasts } from "./ui/Toasts";

export function App() {
    return (
        <div className="app-root">
            <Header />

            <main className="app-main">
                <div id="spa-catalog" />
                <div id="spa-product" />
                <div id="spa-checkout" />
            </main>

            <Toasts />
        </div>
    );
}
