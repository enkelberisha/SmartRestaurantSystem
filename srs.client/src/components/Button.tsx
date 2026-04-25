import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
    isLoading?: boolean;
    variant?: ButtonVariant;
    fullWidth?: boolean;
};

export function Button({
    children,
    className = "",
    disabled,
    fullWidth = false,
    isLoading = false,
    type = "button",
    variant = "primary",
    ...props
}: ButtonProps) {
    const classes = [
        "button",
        `button--${variant}`,
        fullWidth ? "button--full" : "",
        isLoading ? "button--loading" : "",
        className
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <button
            {...props}
            type={type}
            className={classes}
            disabled={disabled || isLoading}
            aria-busy={isLoading}
        >
            {isLoading && <span className="button__spinner" aria-hidden="true" />}
            <span>{children}</span>
        </button>
    );
}
