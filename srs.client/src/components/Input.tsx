import type { InputHTMLAttributes, ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    action?: ReactNode;
    error?: string;
    hint?: string;
    label: string;
};

export function Input({ action, error, hint, id, label, ...props }: InputProps) {
    return (
        <div className="field">
            <label htmlFor={id} className="field__label">
                {label}
            </label>
            <div className={`field__control ${action ? "field__control--with-action" : ""}`}>
                <input
                    {...props}
                    id={id}
                    className={`field__input ${error ? "field__input--error" : ""}`}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
                />
                {action && <div className="field__action">{action}</div>}
            </div>
            {error ? (
                <p id={`${id}-error`} className="field__message field__message--error" role="alert">
                    {error}
                </p>
            ) : hint ? (
                <p id={`${id}-hint`} className="field__message">
                    {hint}
                </p>
            ) : null}
        </div>
    );
}
