import type { PropsWithChildren, ReactNode } from "react";

type FormContainerProps = PropsWithChildren<{
    eyebrow: string;
    title: string;
    subtitle: string;
    aside?: ReactNode;
    footer?: ReactNode;
}>;

export function FormContainer({
    aside,
    children,
    eyebrow,
    footer,
    subtitle,
    title
}: FormContainerProps) {
    return (
        <main className="auth-shell auth-shell--compact">
            <section className="auth-stage">
                <div className="auth-stage__brand">
                    <div className="brand-mark">
                        <span className="brand-mark__icon">SR</span>
                        <span className="brand-mark__text">Smart Restaurant System</span>
                    </div>

                    <div className="auth-stage__copy">
                        <p className="form-card__eyebrow">{eyebrow}</p>
                        <h1>{title}</h1>
                        <p>{subtitle}</p>
                    </div>

                    <div className="auth-stage__highlights">
                        <article>
                            <span>Guest-first flows</span>
                            <strong>Menus, ordering, and team access that feel clean from the first click.</strong>
                        </article>
                        <article>
                            <span>Built for service</span>
                            <strong>Fast on mobile, calm on desktop, and polished enough for front-of-house teams.</strong>
                        </article>
                    </div>
                </div>

                <section className="form-panel">
                    <div className="form-card">
                        {aside && <div className="form-card__aside">{aside}</div>}
                        <div className="form-card__header">
                            <p className="form-card__eyebrow">{eyebrow}</p>
                            <h2>{title}</h2>
                            <p>{subtitle}</p>
                        </div>

                        {children}

                        {footer && <div className="form-card__footer">{footer}</div>}
                    </div>
                </section>
            </section>
        </main>
    );
}
