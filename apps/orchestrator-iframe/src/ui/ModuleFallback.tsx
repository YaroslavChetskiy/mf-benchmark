export function ModuleFallback(props: {
    title: string;
    details?: string;
    onReload?: () => void;
    onGoCatalog?: () => void;
}) {
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
                        Обновить страницу
                    </button>

                    <button
                        className="btn"
                        onClick={props.onReload}
                        data-testid="module-fallback-reload-module"
                    >
                        Перезагрузить модуль
                    </button>

                    <button
                        className="btn btn--primary"
                        onClick={props.onGoCatalog}
                        data-testid="module-fallback-go-catalog"
                    >
                        В каталог
                    </button>
                </div>
            </div>
        </div>
    );
}