import type { ButtonHTMLAttributes } from "react";

type SocialButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    provider: string;
};

export function SocialButton({ provider, ...props }: SocialButtonProps) {
    return (
        <button {...props} type="button" className="social-button">
            <span className="social-button__icon" aria-hidden="true">
                {provider.slice(0, 1)}
            </span>
            <span>Continue with {provider}</span>
        </button>
    );
}
