import { createContext, useContext, useState } from "react";

type Toast = {
    id: number;
    tone: "success" | "error";
    message: string;
};

type ToastContextValue = {
    pushToast: (tone: Toast["tone"], message: string) => void;
};

const ToastContext = createContext<ToastContextValue>({
    pushToast: () => undefined
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const pushToast = (tone: Toast["tone"], message: string) => {
        const next = { id: Date.now() + Math.random(), tone, message };
        setToasts(current => [...current, next]);
        window.setTimeout(() => {
            setToasts(current => current.filter(item => item.id !== next.id));
        }, 3200);
    };

    return (
        <ToastContext.Provider value={{ pushToast }}>
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

export function useToast() {
    return useContext(ToastContext);
}
