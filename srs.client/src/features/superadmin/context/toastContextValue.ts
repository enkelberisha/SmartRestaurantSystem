import { createContext } from "react";

export type ToastTone = "success" | "error";

export type ToastContextValue = {
    pushToast: (tone: ToastTone, message: string) => void;
};

export const ToastContext = createContext<ToastContextValue>({
    pushToast: () => undefined
});
