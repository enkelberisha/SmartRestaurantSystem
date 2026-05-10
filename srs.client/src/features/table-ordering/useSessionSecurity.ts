import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { StaffGesture } from "@/features/table-ordering/types";
import { enterFullscreen } from "@/features/table-ordering/utils";

export function useSessionSecurity(isSessionOpen: boolean, showToast: (message: string) => void) {
    const [gesture, setGesture] = useState<StaffGesture>({ count: 0, step: "logo" });
    const [isLogoutVisible, setIsLogoutVisible] = useState(false);
    const fullscreenWarningShownRef = useRef(false);

    useEffect(() => {
        if (!isSessionOpen) {
            return;
        }

        const blockContextMenu = (event: MouseEvent) => event.preventDefault();
        const blockDrag = (event: DragEvent) => event.preventDefault();
        const blockSelection = (event: Event) => event.preventDefault();
        const blockShortcuts = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            const browserShortcut =
                key === "f11" ||
                key === "escape" ||
                (event.ctrlKey && ["l", "n", "r", "t", "w"].includes(key)) ||
                (event.metaKey && ["l", "n", "r", "t", "w"].includes(key)) ||
                (event.altKey && ["arrowleft", "arrowright", "f4"].includes(key));

            if (browserShortcut) {
                event.preventDefault();
                event.stopPropagation();
            }
        };

        const requestFullscreenAgain = () => {
            if (!document.fullscreenElement) {
                void enterFullscreen();
            }
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && !fullscreenWarningShownRef.current) {
                fullscreenWarningShownRef.current = true;
                showToast("Tap the screen to return to fullscreen.");
            }

            if (document.fullscreenElement) {
                fullscreenWarningShownRef.current = false;
            }
        };

        document.addEventListener("contextmenu", blockContextMenu);
        document.addEventListener("dragstart", blockDrag);
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("keydown", blockShortcuts, true);
        document.addEventListener("selectstart", blockSelection);
        window.addEventListener("focus", requestFullscreenAgain);
        window.addEventListener("pointerdown", requestFullscreenAgain, true);
        window.addEventListener("touchstart", requestFullscreenAgain, true);
        void enterFullscreen();

        return () => {
            document.removeEventListener("contextmenu", blockContextMenu);
            document.removeEventListener("dragstart", blockDrag);
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("keydown", blockShortcuts, true);
            document.removeEventListener("selectstart", blockSelection);
            window.removeEventListener("focus", requestFullscreenAgain);
            window.removeEventListener("pointerdown", requestFullscreenAgain, true);
            window.removeEventListener("touchstart", requestFullscreenAgain, true);
        };
    }, [isSessionOpen, showToast]);

    useEffect(() => {
        if (!isLogoutVisible) {
            return;
        }

        const timeoutId = window.setTimeout(resetUnlock, 2000);
        return () => window.clearTimeout(timeoutId);
    }, [isLogoutVisible]);

    function resetUnlock() {
        setIsLogoutVisible(false);
        setGesture({ count: 0, step: "logo" });
    }

    function handleLogoTap() {
        if (isLogoutVisible) {
            return;
        }

        setGesture((current) => {
            if (current.step === "powered") {
                return { count: 1, step: "logo" };
            }

            const count = current.count + 1;
            return count >= 3 ? { count: 0, step: "powered" } : { count, step: "logo" };
        });
    }

    function handlePoweredTap() {
        if (isLogoutVisible) {
            return;
        }

        setGesture((current) => {
            if (current.step !== "powered") {
                return { count: 0, step: "logo" };
            }

            if (current.count + 1 >= 3) {
                setIsLogoutVisible(true);
                showToast("Staff lock control unlocked.");
                return { count: 0, step: "unlocked" };
            }

            return { count: current.count + 1, step: "powered" };
        });
    }

    function handlePointerDown(event: PointerEvent<HTMLElement>) {
        if (!document.fullscreenElement) {
            void enterFullscreen();
        }

        const target = event.target instanceof HTMLElement ? event.target : null;
        if (!isLogoutVisible && !target?.closest("[data-staff-gesture-target]") && (gesture.step !== "logo" || gesture.count > 0)) {
            setGesture({ count: 0, step: "logo" });
        }
    }

    return {
        handleLogoTap,
        handlePointerDown,
        handlePoweredTap,
        isLogoutVisible,
        resetUnlock
    };
}
