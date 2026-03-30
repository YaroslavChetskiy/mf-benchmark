import { useEffect, useState } from "react";
import { useRuntime } from "../runtime/runtime";

type Toast = { id: number; message: string; level: "info" | "success" | "warning" | "error" };

export function Toasts() {
    const runtime = useRuntime();
    const [items, setItems] = useState<Toast[]>([]);

    useEffect(() => {
        return runtime.events.on("toast:show", (p) => {
            const id = Date.now();
            const t: Toast = { id, message: p.message, level: p.level };
            setItems((xs) => [t, ...xs].slice(0, 3));

            window.setTimeout(() => {
                setItems((xs) => xs.filter((x) => x.id !== id));
            }, 1800);
        });
    }, [runtime.events]);

    if (items.length === 0) return null;

    return (
        <div className="toast-host" data-testid="toast-host">
            {items.map((t, idx) => (
                <div
                    key={t.id}
                    className={`toast toast--${t.level}`}
                    data-testid="toast-item"
                    data-toast-level={t.level}
                    data-toast-index={idx}
                >
                    {t.message}
                </div>
            ))}
        </div>
    );
}