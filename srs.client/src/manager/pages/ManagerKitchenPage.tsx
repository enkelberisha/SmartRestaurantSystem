import { useEffect, useMemo, useState } from "react";
import {
    Bell,
    BookOpen,
    Building2,
    ChevronDown,
    CookingPot,
    LayoutDashboard,
    Menu,
    Search,
    Package,
    Table2,
    WalletCards
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ProfileModal } from "@/components/ProfileModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUserContext } from "@/context/useUserContext";
import { useTheme } from "@/hooks/useTheme";
import { getBrandLogo } from "@/lib/branding/brandLogo";
import {
    emptyManagerKitchenData,
    getManagerKitchen
} from "@/manager/services/kitchenService";
import {
    getStoredManagerRestaurantId,
    storeManagerRestaurantId
} from "@/manager/services/managerRestaurantService";
import type { ManagerKitchenData } from "@/manager/types";
import { Modal } from "@/features/superadmin/components/Modal";

const navItems = [
    { href: "/manager", label: "Dashboard", icon: LayoutDashboard, end: true, disabled: false },
    { href: "/manager/orders", label: "Orders", icon: WalletCards, disabled: false },
    { href: "/manager/tables", label: "Tables", icon: Table2, disabled: false },
    { href: "/manager/kitchen", label: "Kitchen", icon: CookingPot, disabled: false },
    { href: "/manager/menus", label: "Menus", icon: BookOpen, disabled: false },
    { href: "/manager/inventory", label: "Inventory", icon: Package, disabled: false }
];

type KitchenStaffMember = ManagerKitchenData["staff"][number] & {
    role?: string | null;
    email?: string | null;
};

function isWaiterMember(member: ManagerKitchenData["staff"][number]) {
    const kitchenMember = member as KitchenStaffMember;
    const role = kitchenMember.role?.trim().toLowerCase();
    const email = kitchenMember.email?.trim().toLowerCase();
    const fullName = member.fullName.trim().toLowerCase();

    if (role === "waiter") {
        return true;
    }

    if (email?.startsWith("waiter")) {
        return true;
    }

    return fullName.startsWith("waiter");
}

function getRoleFromMember(member: ManagerKitchenData["staff"][number]) {
    const kitchenMember = member as KitchenStaffMember;
    const email = kitchenMember.email?.trim().toLowerCase();
    const fullName = member.fullName.trim().toLowerCase();
    const source = email || fullName;

    if (!source.includes("@")) {
        return "Staff";
    }

    const localPart = source.split("@")[0]?.trim();

    if (!localPart) {
        return "Staff";
    }

    const normalized = localPart.replace(/[._-]+/g, " ").trim();

    if (!normalized) {
        return "Staff";
    }

    return normalized
        .split(/\s+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export function ManagerKitchenPage() {
    const { profile, isLoading: profileLoading, logout } = useUserContext();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const brandLogo = getBrandLogo(theme);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(() => getStoredManagerRestaurantId());
    const [data, setData] = useState<ManagerKitchenData>(emptyManagerKitchenData);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const localPart = profile?.email.split("@")[0] ?? "manager";
    const avatar = localPart
        .split(/[^a-zA-Z0-9]/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part[0]?.toUpperCase() ?? "")
        .join("") || "MG";
    const canSwitchRestaurants = data.restaurants.length > 1;
    const selectedRestaurant = data.restaurants.find(restaurant => restaurant.id === selectedRestaurantId) ?? data.restaurants[0] ?? null;

    const waiterSchedule = useMemo(() => data.staff
        .filter(isWaiterMember)
        .map(member => {
            return {
                member
            };
        }), [data.shifts, data.staff]);

    async function loadKitchen(restaurantId = selectedRestaurantId) {
        if (!profile) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const result = await getManagerKitchen(profile.appUserId, restaurantId);
            setSelectedRestaurantId(result.selectedRestaurantId);
            storeManagerRestaurantId(result.selectedRestaurantId);
            setData(result.data);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load kitchen data.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        void loadKitchen();
    }, [profile, selectedRestaurantId]);

    if (profileLoading || isLoading) {
        return (
            <main className="sa-content manager-shell--loading">
                <section className="manager-loading-card">
                    <div className="skeleton-block manager-loading-card__logo" />
                    <div className="skeleton-block manager-loading-card__line" />
                    <div className="skeleton-block manager-loading-card__body" />
                </section>
            </main>
        );
    }

    return (
        <div className={`sa-shell manager-layout ${sidebarOpen ? "sa-shell--sidebar-open" : ""}`}>
            <aside className="sa-sidebar manager-sidebar">
                <div className="sa-sidebar__brand">
                    <Link to="/manager" className="brand-mark">
                        <img className="brand-mark__image brand-mark__image--sidebar" src={brandLogo} alt="Smart Restaurant System" />
                    </Link>
                </div>
                <nav className="sa-nav admin-nav" aria-label="Manager">
                    {navItems.map(item => item.disabled ? (
                        <span key={item.label} className="sa-nav__link admin-nav__link manager-nav__disabled">
                            <item.icon size={18} aria-hidden="true" />
                            <span>{item.label}</span>
                        </span>
                    ) : (
                        <NavLink
                            key={`${item.href}-${item.label}`}
                            to={item.href}
                            end={item.end}
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
                            <input type="search" placeholder="Search manager records..." />
                        </label>
                    </div>
                    <div className="sa-topbar__right">
                        <label className={`admin-restaurant-switcher manager-restaurant-switcher ${canSwitchRestaurants ? "" : "manager-restaurant-switcher--static"}`}>
                            <Building2 size={16} />
                            {canSwitchRestaurants ? (
                                <>
                                    <span className="manager-restaurant-switcher__value">
                                        {selectedRestaurant?.name ?? "Choose restaurant"}
                                    </span>
                                    <select
                                        value={selectedRestaurantId ?? ""}
                                        onChange={event => setSelectedRestaurantId(Number(event.target.value))}
                                        aria-label="Choose managed restaurant"
                                    >
                                        {data.restaurants.map(restaurant => (
                                            <option key={restaurant.id} value={restaurant.id}>
                                                {restaurant.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} />
                                </>
                            ) : (
                                <span className="manager-restaurant-switcher__value">{selectedRestaurant?.name ?? "No restaurant assigned"}</span>
                            )}
                        </label>
                        <ThemeToggle theme={theme} onToggle={toggleTheme} />
                        <button type="button" className="icon-button" aria-label="Notifications" onClick={() => setNotificationsOpen(true)}>
                            <Bell size={18} />
                        </button>
                        <button type="button" className="sa-avatar" onClick={() => setProfileOpen(true)}>
                            <span>{avatar}</span>
                            <div className="sa-avatar__meta">
                                <strong>{localPart}</strong>
                                <small>{profile?.role ?? "Manager"}</small>
                            </div>
                            <ChevronDown size={16} />
                        </button>
                    </div>
                </header>

                <main className="sa-content manager-content">
                    <div className="admin-stack">
                        <header className="admin-page-header">
                            <div>
                                <h1>Kitchen</h1>
                                <p>Track staff coverage for {selectedRestaurant?.name ?? "your restaurant"}.</p>
                            </div>
                        </header>

                        {error && <div className="manager-alert">{error}</div>}

                        <section>
                            <article className="manager-panel">
                                <header className="manager-panel__header">
                                    <div>
                                        <h2>Staff roster</h2>
                                        <p>Staff roles for the kitchen view.</p>
                                    </div>
                                </header>
                                {waiterSchedule.length > 0 ? (
                                    <div className="manager-roster-table-wrap">
                                        <table className="manager-roster-table">
                                            <thead>
                                                <tr>
                                                    <th>Staff ID</th>
                                                    <th>Name</th>
                                                    <th>Role</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {waiterSchedule.map(({ member }) => (
                                                    <tr key={member.id}>
                                                        <td>#{member.id}</td>
                                                        <td>{member.fullName}</td>
                                                        <td>{getRoleFromMember(member)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : <p className="manager-empty">No waiters assigned.</p>}
                            </article>
                        </section>
                    </div>
                </main>

                <Modal title="Notifications" open={notificationsOpen} onClose={() => setNotificationsOpen(false)}>
                    <div className="sa-activity-list">
                        <article className="sa-activity">
                            <p>No notifications yet.</p>
                        </article>
                    </div>
                </Modal>

                {profile ? (
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
                ) : null}
            </div>
        </div>
    );
}
