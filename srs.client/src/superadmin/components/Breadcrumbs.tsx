import { Link, useLocation } from "react-router-dom";

const labels: Record<string, string> = {
    superadmin: "Superadmin",
    dashboard: "Dashboard",
    users: "Users & Roles",
    tenants: "Tenants",
    analytics: "Analytics",
    billing: "Billing",
    moderation: "Content Moderation",
    settings: "Settings",
    audit: "Audit Logs"
};

export function Breadcrumbs() {
    const location = useLocation();
    const parts = location.pathname.split("/").filter(Boolean);

    return (
        <nav className="breadcrumbs" aria-label="Breadcrumb">
            {parts.map((part, index) => {
                const href = `/${parts.slice(0, index + 1).join("/")}`;
                return (
                    <span key={href}>
                        {index > 0 ? <span className="breadcrumbs__sep">/</span> : null}
                        {index === parts.length - 1 ? (
                            <span>{labels[part] ?? part}</span>
                        ) : (
                            <Link to={href}>{labels[part] ?? part}</Link>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
