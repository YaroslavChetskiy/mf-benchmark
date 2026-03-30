import type { MfRuntimeContext } from "@mf-benchmark/contracts";
import { makeNavHandler } from "@mf-benchmark/contracts";

export function SuccessPage(props: { ctx: MfRuntimeContext }) {
    const { ctx } = props;

    return (
        <section className="page" data-testid="success-page">
            <h1 className="page-title" data-testid="success-title">Успех</h1>
            <div className="card" data-testid="success-card">
                <div data-testid="success-message">Заказ оформлен (демо).</div>
                <div className="muted" data-testid="success-description">
                    Это финал сценария S1.
                </div>
                <div className="row">
                    <a
                        className="btn btn--primary"
                        href="/catalog"
                        onClick={makeNavHandler(ctx, "/catalog")}
                        data-testid="success-go-catalog"
                    >
                        Вернуться в каталог
                    </a>
                </div>
            </div>
        </section>
    );
}