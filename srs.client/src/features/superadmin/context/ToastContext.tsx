import { useCallback, useMemo, useState } from "react";
import { ToastContext, type ToastTone } from "@/features/superadmin/context/toastContextValue";

type Toast = {
    id: number;
    tone: ToastTone;
    message: string;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const pushToast = useCallback((tone: ToastTone, message: string) => {
        const next = { id: Date.now() + Math.random(), tone, message };
        setToasts(current => [...current, next]);
        window.setTimeout(() => {
            setToasts(current => current.filter(item => item.id !== next.id));
        }, 3200);
    }, []);

    const value = useMemo(() => ({ pushToast }), [pushToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="toast-stack">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast--${toast.tone}`}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
