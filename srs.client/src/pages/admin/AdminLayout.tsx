import { Bell, BookOpen, Building2, Check, ChevronDown, LayoutDashboard, Menu, Search, Table2, Users } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ProfileModal } from "@/components/ProfileModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUserContext } from "@/context/useUserContext";
import { useTheme } from "@/hooks/useTheme";
import { getBrandLogo } from "@/lib/branding/brandLogo";
import { Modal } from "@/features/admin/components/Modal";
import { useAdminRestaurant } from "@/features/admin/context/adminRestaurantContextValue";
const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/restaurant", label: "Restaurant", icon: Building2 },
    { href: "/admin/tables", label: "Tables", icon: Table2 },
    { href: "/admin/menu", label: "Menu", icon: BookOpen },
    { href: "/admin/staff", label: "Staff", icon: Users }
];

export function AdminLayout() {
    const { theme, toggleTheme } = useTheme();
    const brandLogo = getBrandLogo(theme);
    const { profile, isLoading, logout } = useUserContext();
    const navigate = useNavigate();
    const {
        restaurants,
        selectedRestaurant,
        selectedRestaurantId,
        isLoadingRestaurants,
        setSelectedRestaurantId
    } = useAdminRestaurant();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [restaurantPickerOpen, setRestaurantPickerOpen] = useState(false);

    if (isLoading || !profile) {
        return (
            <main className="sa-content">
                <div className="sa-stack">
                    <p>Loading admin session...</p>
                </div>
            </main>
        );
    }

    const localPart = profile.email.split("@")[0] ?? "admin";
    const avatar = localPart
        .split(/[^a-zA-Z0-9]/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() ?? "")
        .join("") || "AD";

    return (
        <div className={`sa-shell admin-shell ${sidebarOpen ? "sa-shell--sidebar-open" : ""}`}>
            <aside className="sa-sidebar admin-sidebar">
                <div className="sa-sidebar__brand">
                    <Link to="/admin/dashboard" className="brand-mark">
                        <img className="brand-mark__image brand-mark__image--sidebar" src={brandLogo} alt="Smart Restaurant System" />
                    </Link>
                </div>
                <nav className="sa-nav admin-nav" aria-label="Admin">
                    {navItems.map(item => (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            className={({ isActive }) =>
                                `sa-nav__link admin-nav__link ${isActive ? "sa-nav__link--active admin-nav__link--active" : ""}`
                            }
                            onClick={() => setSidebarOpen(false)}
                        >
                            <item.icon size={18} aria-hidden="true" />
                            <span>{item.label}</span>
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
                            <input type="search" placeholder="Search admin records..." />
                        </label>
                    </div>

                    <div className="sa-topbar__right">
                        <button
                            type="button"
                            className="admin-restaurant-switcher"
                            onClick={() => setRestaurantPickerOpen(true)}
                            disabled={isLoadingRestaurants || restaurants.length === 0}
                            aria-label="Choose restaurant to admin"
                        >
                            <Building2 size={16} />
                            <span>{selectedRestaurant?.name ?? "All restaurants"}</span>
                            <ChevronDown size={16} />
                        </button>
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

                <main className="sa-content admin-main">
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

            <Modal title="Choose Restaurant" open={restaurantPickerOpen} onClose={() => setRestaurantPickerOpen(false)}>
                <div className="admin-choice-list">
                    <button
                        type="button"
                        className={`admin-choice-list__item ${selectedRestaurantId === "all" ? "admin-choice-list__item--active" : ""}`}
                        onClick={() => {
                            setSelectedRestaurantId("all");
                            setRestaurantPickerOpen(false);
                        }}
                    >
                        <span>
                            <strong>All restaurants</strong>
                            <small>Show every admin record in this tenant.</small>
                        </span>
                        {selectedRestaurantId === "all" && <Check size={18} />}
                    </button>
                    {restaurants.map(restaurant => (
                        <button
                            key={restaurant.id}
                            type="button"
                            className={`admin-choice-list__item ${selectedRestaurantId === restaurant.id ? "admin-choice-list__item--active" : ""}`}
                            onClick={() => {
                                setSelectedRestaurantId(restaurant.id);
                                setRestaurantPickerOpen(false);
                            }}
                        >
                            <span>
                                <strong>{restaurant.name}</strong>
                                <small>{restaurant.location}</small>
                            </span>
                            {selectedRestaurantId === restaurant.id && <Check size={18} />}
                        </button>
                    ))}
                </div>
            </Modal>

            <ProfileModal
                open={profileOpen}
                profile={profile}
                primaryLabel={localPart}
                onClose={() => setProfileOpen(false)}
                onLogout={async () => {
                    await logout();
                    navigate("/login", { replace: true });
                }}
            />
        </div>
    );
}
