import type { MouseEvent } from "react";
import { navigateToUrl } from "single-spa";

function onSpaNav(to: string) {
    return (e: MouseEvent<HTMLAnchorElement>) => {
        if (e.defaultPrevented) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        e.preventDefault();
        navigateToUrl(to);
    };
}

export function ErrorBoundary(props: { title: string; details?: string }) {
    return (
        <div className="page" data-testid="module-fallback">
            <h1 className="page-title" data-testid="module-fallback-title">{props.title}</h1>

            <div className="card" data-testid="module-fallback-card">
                <div data-testid="module-fallback-message">Модуль недоступен или произошла ошибка.</div>

                {props.details && (
                    <pre
                        className="muted small"
                        style={{ whiteSpace: "pre-wrap" }}
                        data-testid="module-fallback-details"
                    >
                        {props.details}
                    </pre>
                )}

                <div className="muted small" data-testid="module-fallback-hint">
                    Можно обновить страницу или вернуться в каталог.
                </div>

                <div className="row" data-testid="module-fallback-actions">
                    <button
                        className="btn"
                        onClick={() => window.location.reload()}
                        data-testid="module-fallback-reload-page"
                    >
                        Обновить
                    </button>

                    <a
                        className="btn btn--primary"
                        href="/catalog"
                        onClick={onSpaNav("/catalog")}
                        data-testid="module-fallback-go-catalog"
                    >
                        В каталог
                    </a>
                </div>
            </div>
        </div>
    );
}