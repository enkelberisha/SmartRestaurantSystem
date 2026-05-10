type DevicePlaceholderPageProps = {
    title: string;
    description: string;
};

export function DevicePlaceholderPage({ title, description }: DevicePlaceholderPageProps) {
    return (
        <main className="role-shell">
            <section className="role-card">
                <p className="role-card__eyebrow">Device Workspace</p>
                <h1>{title}</h1>
                <p>{description}</p>
            </section>
        </main>
    );
}
