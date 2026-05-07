export function SectionCard({
    title,
    subtitle,
    actions,
    children
}: {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="section-card">
            <header className="section-card__header">
                <div>
                    <h2>{title}</h2>
                    {subtitle ? <p>{subtitle}</p> : null}
                </div>
                {actions ? <div className="section-card__actions">{actions}</div> : null}
            </header>
            {children}
        </section>
    );
}
