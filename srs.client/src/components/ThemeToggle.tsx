type ThemeToggleProps = {
    theme: "light" | "dark";
    onToggle: () => void;
};

export function ThemeToggle({ onToggle, theme }: ThemeToggleProps) {
    return (
        <button
            type="button"
            className="theme-toggle"
            onClick={onToggle}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
            <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
        </button>
    );
}
