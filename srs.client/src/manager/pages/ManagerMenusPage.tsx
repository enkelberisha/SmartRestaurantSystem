import { useEffect, useMemo, useState } from "react";
import {
    Bell,
    BookOpen,
    Building2,
    ChevronDown,
    CookingPot,
    Flame,
    LayoutDashboard,
    Menu,
    Search,
    Package,
    Sparkles,
    Table2,
    Timer,
    Utensils,
    WalletCards
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ProfileModal } from "@/components/ProfileModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUserContext } from "@/context/useUserContext";
import { useTheme } from "@/hooks/useTheme";
import { getBrandLogo } from "@/lib/branding/brandLogo";
import {
    emptyManagerMenusData,
    getManagerMenus
} from "@/manager/services/menusService";
import {
    getStoredManagerRestaurantId,
    storeManagerRestaurantId
} from "@/manager/services/managerRestaurantService";
import { ManagerAiCompletionAlert } from "@/manager/components/ManagerAiCompletionAlert";
import type { ManagerMenusData } from "@/manager/types";
import { Modal } from "@/features/superadmin/components/Modal";

const navItems = [
    { href: "/manager", label: "Dashboard", icon: LayoutDashboard, end: true, disabled: false },
    { href: "/manager/orders", label: "Orders", icon: WalletCards, disabled: false },
    { href: "/manager/tables", label: "Tables", icon: Table2, disabled: false },
    { href: "/manager/kitchen", label: "Kitchen", icon: CookingPot, disabled: false },
    { href: "/manager/menus", label: "Menus", icon: BookOpen, disabled: false },
    { href: "/manager/inventory", label: "Inventory", icon: Package, disabled: false },
    { href: "/manager/ai-insights", label: "AI Insights", icon: Sparkles, disabled: false }
];

function money(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
    }).format(value);
}

function formatMinutes(value: number) {
    return `${value} min`;
}

function compareBySales(
    left: { item: { name: string }; quantity: number; revenue: number },
    right: { item: { name: string }; quantity: number; revenue: number }
) {
    return right.quantity - left.quantity || right.revenue - left.revenue || left.item.name.localeCompare(right.item.name);
}

export function ManagerMenusPage() {
    const { profile, isLoading: profileLoading, logout } = useUserContext();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const brandLogo = getBrandLogo(theme);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(() => getStoredManagerRestaurantId());
    const [data, setData] = useState<ManagerMenusData>(emptyManagerMenusData);
    const [query, setQuery] = useState("");
    const [activeMenuId, setActiveMenuId] = useState<number | "all">("all");
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
    const menusById = useMemo(() => new Map(data.menus.map(menu => [menu.id, menu])), [data.menus]);
    const activeOrderIds = useMemo(
        () => new Set(data.orders.filter(order => order.status !== "Cancelled").map(order => order.id)),
        [data.orders]
    );
    const itemStats = useMemo(() => {
        const stats = new Map<number, { quantity: number; revenue: number; orders: Set<number> }>();

        data.orderItems.forEach(orderItem => {
            if (!activeOrderIds.has(orderItem.orderId)) {
                return;
            }

            const current = stats.get(orderItem.menuItemId) ?? {
                quantity: 0,
                revenue: 0,
                orders: new Set<number>()
            };

            current.quantity += orderItem.quantity;
            current.revenue += orderItem.price * orderItem.quantity;
            current.orders.add(orderItem.orderId);
            stats.set(orderItem.menuItemId, current);
        });

        return stats;
    }, [activeOrderIds, data.orderItems]);

    const menuRows = useMemo(() => data.menuItems.map(item => {
        const stats = itemStats.get(item.id);
        const menu = menusById.get(item.menuId);

        return {
            item,
            menuName: menu?.name ?? "Menu",
            quantity: stats?.quantity ?? 0,
            revenue: stats?.revenue ?? 0,
            orderCount: stats?.orders.size ?? 0
        };
    }), [data.menuItems, itemStats, menusById]);

    const filteredRows = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return menuRows
            .filter(row => activeMenuId === "all" || row.item.menuId === activeMenuId)
            .filter(row => !normalizedQuery || [
                row.item.name,
                row.menuName,
                row.item.description ?? ""
            ].some(value => value.toLowerCase().includes(normalizedQuery)))
            .sort((left, right) => left.item.name.localeCompare(right.item.name));
    }, [activeMenuId, menuRows, query]);

    const topSellers = useMemo(
        () => [...menuRows].sort(compareBySales).slice(0, 5),
        [menuRows]
    );
    const topSeller = topSellers.find(row => row.quantity > 0) ?? null;
    const totalRevenue = useMemo(
        () => menuRows.reduce((sum, row) => sum + row.revenue, 0),
        [menuRows]
    );
    const averagePrepTime = useMemo(() => {
        if (menuRows.length === 0) {
            return 0;
        }

        return Math.round(menuRows.reduce((sum, row) => sum + row.item.cookingTime, 0) / menuRows.length);
    }, [menuRows]);
    const menuInsights = useMemo(() => {
        const usedIds = new Set<number>();

        const take = <T extends { item: { id: number } }>(rows: T[]) => {
            const row = rows.find(candidate => !usedIds.has(candidate.item.id)) ?? null;

            if (row) {
                usedIds.add(row.item.id);
            }

            return row;
        };

        const availableRows = menuRows.filter(row => !usedIds.has(row.item.id));
        const spotlight = topSeller ?? take([...availableRows].sort(compareBySales));

        if (spotlight) {
            usedIds.add(spotlight.item.id);
        }

        const prepWatch = take([...menuRows].sort((left, right) =>
            right.item.cookingTime - left.item.cookingTime || compareBySales(left, right)
        ));
        const quantities = menuRows.map(row => row.quantity);
        const hasSalesSpread = quantities.length > 0 && Math.min(...quantities) !== Math.max(...quantities);
        const lowPerformer = hasSalesSpread
            ? take([...menuRows].sort((left, right) =>
                left.quantity - right.quantity || left.revenue - right.revenue || left.item.name.localeCompare(right.item.name)
            ))
            : null;

        return {
            spotlight,
            prepWatch,
            lowPerformer
        };
    }, [menuRows, topSeller]);

    async function loadMenus(restaurantId = selectedRestaurantId) {
        if (!profile) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const result = await getManagerMenus(profile.appUserId, restaurantId);
            setSelectedRestaurantId(result.selectedRestaurantId);
            storeManagerRestaurantId(result.selectedRestaurantId);
            setData(result.data);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load menus.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        void loadMenus();
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
                    <ManagerAiCompletionAlert />
                    <div className="admin-stack">
                        <header className="manager-menu-hero">
                            <div>
                                <span className="manager-menu-eyebrow"><Sparkles size={16} /> Menu performance</span>
                                <h1>Menus</h1>
                                <p>Track best sellers, prep load, and item performance for {selectedRestaurant?.name ?? "your restaurant"}.</p>
                            </div>
                            <section className="manager-menu-hero__stats" aria-label="Menu performance summary">
                                <article className="manager-menu-hero-card">
                                    <span>Revenue</span>
                                    <strong>{money(totalRevenue)}</strong>
                                    <small>{menuRows.filter(row => row.quantity > 0).length} items with sales</small>
                                </article>
                                <article className="manager-menu-hero-card">
                                    <span>Average Prep</span>
                                    <strong>{formatMinutes(averagePrepTime)}</strong>
                                    <small>{menuRows.length} items in catalog</small>
                                </article>
                            </section>
                        </header>

                        {error && <div className="manager-alert">{error}</div>}

                        <section className="manager-menu-lab">
                            <article className="manager-menu-spotlight">
                                <div>
                                    <span><Sparkles size={16} /> Menu spotlight</span>
                                    <h2>{menuInsights.spotlight?.item.name ?? "No sales yet"}</h2>
                                    <p>{menuInsights.spotlight?.item.description ?? "The top seller appears here once orders are recorded."}</p>
                                </div>
                                <dl>
                                    <div>
                                        <dt>Menu</dt>
                                        <dd>{menuInsights.spotlight?.menuName ?? "None"}</dd>
                                    </div>
                                    <div>
                                        <dt>Price</dt>
                                        <dd>{menuInsights.spotlight ? money(menuInsights.spotlight.item.price) : "$0.00"}</dd>
                                    </div>
                                    <div>
                                        <dt>Sold</dt>
                                        <dd>{menuInsights.spotlight?.quantity ?? 0}</dd>
                                    </div>
                                    <div>
                                        <dt>Revenue</dt>
                                        <dd>{menuInsights.spotlight ? money(menuInsights.spotlight.revenue) : "$0.00"}</dd>
                                    </div>
                                </dl>
                            </article>

                            <article className="manager-menu-mini-panel">
                                <span><Timer size={16} /> Prep watch</span>
                                <strong>{menuInsights.prepWatch?.item.name ?? "No prep data"}</strong>
                                <p>{menuInsights.prepWatch ? `${formatMinutes(menuInsights.prepWatch.item.cookingTime)} cook time` : "Add cooking times to compare prep impact."}</p>
                            </article>

                            <article className="manager-menu-mini-panel">
                                <span><Flame size={16} /> Low performer</span>
                                <strong>{menuInsights.lowPerformer?.item.name ?? "None"}</strong>
                                <p>{menuInsights.lowPerformer ? `${menuInsights.lowPerformer.quantity} sold so far.` : "All items are selling at the same level."}</p>
                            </article>
                        </section>

                        <section className="manager-panel manager-menu-catalog">
                            <header className="manager-panel__header">
                                <div>
                                    <span>Menu items</span>
                                </div>
                            </header>

                            <div className="manager-menu-controls">
                                <section className="manager-orders-toolbar">
                                    <div className="manager-menu-chip-row">
                                        <button
                                            type="button"
                                            className={activeMenuId === "all" ? "manager-menu-chip manager-menu-chip--active" : "manager-menu-chip"}
                                            onClick={() => setActiveMenuId("all")}
                                        >
                                            All menus
                                        </button>
                                        {data.menus.map(menu => (
                                            <button
                                                key={menu.id}
                                                type="button"
                                                className={activeMenuId === menu.id ? "manager-menu-chip manager-menu-chip--active" : "manager-menu-chip"}
                                                onClick={() => setActiveMenuId(menu.id)}
                                            >
                                                {menu.name}
                                            </button>
                                        ))}
                                    </div>
                                    <label className="manager-orders-search manager-menu-search">
                                        <Search size={16} />
                                        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search menu..." />
                                    </label>
                                </section>
                            </div>

                            <div className="manager-menu-card-grid">
                                {filteredRows.map(row => (
                                    <article key={row.item.id} className="manager-menu-card">
                                        <header>
                                            <span>{row.menuName}</span>
                                            <strong>{money(row.item.price)}</strong>
                                        </header>
                                        <div className="manager-menu-card__body">
                                            <h3>{row.item.name}</h3>
                                            <p>{row.item.description ?? "No description provided."}</p>
                                        </div>
                                        <div className="manager-menu-card__metrics">
                                            <span><Utensils size={14} /> {row.quantity} sold</span>
                                            <span><Timer size={14} /> {formatMinutes(row.item.cookingTime)}</span>
                                            <span><WalletCards size={14} /> {row.orderCount} orders</span>
                                        </div>
                                        <footer>
                                            <span className={row.quantity === 0 ? "manager-menu-signal manager-menu-signal--quiet" : "manager-menu-signal"}>
                                                {row.quantity === 0 ? "No sales yet" : "Selling"}
                                            </span>
                                            <strong className="manager-menu-card__revenue">{money(row.revenue)}</strong>
                                        </footer>
                                    </article>
                                ))}
                                {filteredRows.length === 0 && <p className="manager-empty">No menu items found.</p>}
                            </div>
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
