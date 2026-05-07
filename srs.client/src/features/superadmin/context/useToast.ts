import { useContext } from "react";
import { ToastContext } from "@/features/superadmin/context/toastContextValue";

export function useToast() {
    return useContext(ToastContext);
}
