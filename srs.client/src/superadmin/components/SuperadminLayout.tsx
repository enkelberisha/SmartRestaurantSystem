import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { useUserContext } from "@/context/UserContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";
import { Breadcrumbs } from "@/superadmin/components/Breadcrumbs";
import { Modal } from "@/superadmin/components/Modal";
import { useToast } from "@/superadmin/context/ToastContext";

const navItems = [
    { href: "/superadmin/dashboard", label: "Dashboard" },
    { href: "/superadmin/users", label: "Users & Roles" },
    { href: "/superadmin/tenants", label: "Tenants / Organizations" },
    { href: "/superadmin/analytics", label: "Analytics & Stats" },
    { href: "/superadmin/billing", label: "Billing & Subscriptions" },
    { href: "/superadmin/moderation", label: "Content Moderation" },
    { href: "/superadmin/settings", label: "Settings & Configuration" },
    { href: "/superadmin/audit", label: "Audit Logs" }
];

export function SuperadminLayout() {
    const { theme, toggleTheme } = useTheme();
    const { profile, isLoading, logout } = useUserContext();
    const navigate = useNavigate();
    const { pushToast } = useToast();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    if (isLoading || !profile) {
        return (
            <main className="sa-content">
                <div className="sa-stack">
                    <p>Loading superadmin session...</p>
                </div>
            </main>
        );
    }

    const localPart = profile.email.split("@")[0] ?? "superadmin";
    const avatar = localPart
        .split(/[^a-zA-Z0-9]/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() ?? "")
        .join("") || "SA";

    return (
        <div className={`sa-shell ${sidebarOpen ? "sa-shell--sidebar-open" : ""}`}>
            <aside className="sa-sidebar">
                <div className="sa-sidebar__brand">
                    <Link to="/superadmin/dashboard" className="brand-mark">
                        <span className="brand-mark__icon">sa</span>
                        <span className="brand-mark__text">Superadmin</span>
                    </Link>
                </div>

                <nav className="sa-nav">
                    {navItems.map(item => (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            className={({ isActive }) => `sa-nav__link ${isActive ? "sa-nav__link--active" : ""}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </aside>

            <div className="sa-main">
                <header className="sa-topbar">
                    <div className="sa-topbar__left">
                        <button
                            type="button"
                            className="icon-button sa-topbar__menu"
                            onClick={() => setSidebarOpen(current => !current)}
                            aria-label="Toggle sidebar"
                        >
                            <Menu size={18} />
                        </button>

                        <label className="sa-search">
                            <Search size={16} />
                            <input type="search" placeholder="Search users, tenants, logs..." />
                        </label>
                    </div>

                    <div className="sa-topbar__right">
                        <ThemeToggle theme={theme} onToggle={toggleTheme} />
                        <button
                            type="button"
                            className="icon-button"
                            aria-label="Notifications"
                            onClick={() => setNotificationsOpen(true)}
                        >
                            <Bell size={18} />
                        </button>
                        <button type="button" className="sa-avatar" onClick={() => setProfileOpen(true)}>
                            <span>{avatar}</span>
                            <div className="sa-avatar__meta">
                                <strong>{localPart}</strong>
                                <small>{profile.role}</small>
                            </div>
                            <ChevronDown size={16} />
                        </button>
                    </div>
                </header>

                <main className="sa-content">
                    <Breadcrumbs />
                    <Outlet />
                </main>
            </div>

            <Modal title="Notifications" open={notificationsOpen} onClose={() => setNotificationsOpen(false)}>
                <div className="sa-activity-list">
                    <article className="sa-activity">
                        <p>No notifications yet.</p>
                    </article>
                </div>
            </Modal>

            <Modal title="Profile" open={profileOpen} onClose={() => setProfileOpen(false)}>
                <div className="sa-stack">
                    <div>
                        <strong>{localPart}</strong>
                        <p className="modal-copy">{profile.email}</p>
                        <p className="modal-copy">{profile.role}</p>
                    </div>
                    <div className="sa-inline-actions">
                        <Button variant="secondary" onClick={() => pushToast("success", "Profile preferences opened.")}>
                            Preferences
                        </Button>
                        <Button
                            onClick={async () => {
                                await logout();
                                navigate("/login", { replace: true });
                            }}
                        >
                            Sign Out
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
