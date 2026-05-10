export function OwnerKpiCard({
    detail,
    icon,
    meta,
    positive = false,
    title
}: {
    detail: string;
    icon: React.ReactNode;
    meta: React.ReactNode;
    positive?: boolean;
    title: string;
}) {
    return (
        <article className="admin-kpi-card owner-kpi-card">
            <div className="admin-kpi-card__header">
                <span className="admin-kpi-card__icon">{icon}</span>
                <span className={positive ? "admin-kpi-card__change admin-kpi-card__change--up" : "admin-badge"}>{meta}</span>
            </div>
            <strong>{title}</strong>
            <p>{detail}</p>
        </article>
    );
}

export function OwnerPriority({ detail, icon, title }: { detail: string; icon: React.ReactNode; title: string }) {
    return (
        <div className="owner-priority">
            <span className="owner-priority__icon">{icon}</span>
            <div>
                <strong>{title}</strong>
                <p>{detail}</p>
            </div>
        </div>
    );
}

export function DeviceCard({ badge, detail, icon, title }: { badge: string; detail: string; icon: React.ReactNode; title: string }) {
    return (
        <article className="admin-section-card owner-device-card">
            <span className="owner-device-card__icon">{icon}</span>
            <div>
                <h3>{title}</h3>
                <p>{detail}</p>
            </div>
            <span className="admin-badge">{badge}</span>
        </article>
    );
}

export function OwnerInsight({ detail, title, tone }: { detail: string; title: string; tone: "neutral" | "success" | "warning" }) {
    return (
        <article className={`owner-insight owner-insight--${tone}`}>
            <strong>{title}</strong>
            <p>{detail}</p>
        </article>
    );
}
