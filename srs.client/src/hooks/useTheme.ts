import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const themeStorageKey = "srs-theme";

function getPreferredTheme(): Theme {
    if (typeof window === "undefined") {
        return "light";
    }

    const savedTheme = window.localStorage.getItem(themeStorageKey);
    if (savedTheme === "light" || savedTheme === "dark") {
        return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(getPreferredTheme);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        window.localStorage.setItem(themeStorageKey, theme);
    }, [theme]);

    return {
        theme,
        toggleTheme: () => setTheme(currentTheme => (currentTheme === "light" ? "dark" : "light"))
    };
}
