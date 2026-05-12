import { useEffect, useMemo, useState } from "react";
import {
    Bell,
    BookOpen,
    Building2,
    ChevronDown,
    ClipboardList,
    CookingPot,
    LayoutDashboard,
    Menu,
    Search,
    Settings,
    ShoppingBag,
    Table2,
    WalletCards
} from "lucide-react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { ProfileModal } from "@/components/ProfileModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUserContext } from "@/context/useUserContext";
import { useTheme } from "@/hooks/useTheme";
import { getBrandLogo } from "@/lib/branding/brandLogo";
import {
    emptyManagerOrdersData,
    getManagerOrders
} from "@/manager/services/ordersService";
import {
    getStoredManagerRestaurantId,
    storeManagerRestaurantId
} from "@/manager/services/managerRestaurantService";
import { ManagerOrderDetailsModal } from "@/manager/components/ManagerOrderDetailsModal";
import type { ManagerOrdersData } from "@/manager/types";
import type { AdminOrder } from "@/lib/admin/adminService";
import { Modal } from "@/features/superadmin/components/Modal";

const navItems = [
    { href: "/manager", label: "Dashboard", icon: LayoutDashboard, end: true, disabled: false },
    { href: "/manager/orders", label: "Orders", icon: WalletCards, disabled: false },
    { href: "/manager/tables", label: "Tables", icon: Table2, disabled: false },
    { href: "/manager/kitchen", label: "Kitchen", icon: CookingPot, disabled: false },
    { href: "/manager/menus", label: "Menus", icon: BookOpen, disabled: false },
    { href: "/manager/inventory", label: "Inventory", icon: Settings, disabled: false }
];

const orderStatuses = ["All", "Pending", "InProgress", "Ready", "Completed", "Cancelled"] as const;
const statusTone: Record<string, string> = {
    Pending: "pending",
    InProgress: "progress",
    Ready: "ready",
    Completed: "completed",
    Cancelled: "cancelled"
};

function money(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
    }).format(value);
}

function orderStatusLabel(status: string) {
    return status.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function orderDate(value: string) {
    return new Date(value).toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function buildOrderNumber(order: AdminOrder) {
    return `#${String(order.id).padStart(6, "0")}`;
}

function isOrderStatus(value: string | null): value is (typeof orderStatuses)[number] {
    return orderStatuses.some(status => status === value);
}

export function ManagerOrdersPage() {
    const { profile, isLoading: profileLoading, logout } = useUserContext();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const brandLogo = getBrandLogo(theme);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(() => getStoredManagerRestaurantId());
    const [data, setData] = useState<ManagerOrdersData>(emptyManagerOrdersData);
    const [activeStatus, setActiveStatus] = useState<(typeof orderStatuses)[number]>(() => {
        const status = searchParams.get("status");
        return isOrderStatus(status) ? status : "All";
    });
    const [query, setQuery] = useState("");
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
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
    const tablesById = useMemo(() => new Map(data.tables.map(table => [table.id, table])), [data.tables]);
    const selectedOrder = data.orders.find(order => order.id === selectedOrderId) ?? null;
    const selectedOrderItems = useMemo(
        () => selectedOrder ? data.orderItems.filter(item => item.orderId === selectedOrder.id) : [],
        [data.orderItems, selectedOrder]
    );
    const selectedOrderTable = selectedOrder ? tablesById.get(selectedOrder.tableId) : null;
    const orderCounts = useMemo(() => ({
        total: data.orders.length,
        pending: data.orders.filter(order => order.status === "Pending").length,
        progress: data.orders.filter(order => order.status === "InProgress").length,
        ready: data.orders.filter(order => order.status === "Ready").length,
        completed: data.orders.filter(order => order.status === "Completed").length,
        cancelled: data.orders.filter(order => order.status === "Cancelled").length
    }), [data.orders]);
    const filteredOrders = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return [...data.orders]
            .filter(order => activeStatus === "All" || order.status === activeStatus)
            .filter(order => {
                if (!normalizedQuery) {
                    return true;
                }

                const table = tablesById.get(order.tableId);
                return [
                    buildOrderNumber(order),
                    String(order.id),
                    table ? `table ${table.number}` : `table ${order.tableId}`,
                    order.status
                ].some(value => value.toLowerCase().includes(normalizedQuery));
            })
            .sort((left, right) => right.id - left.id);
    }, [activeStatus, data.orders, query, tablesById]);

    async function loadDashboard(restaurantId = selectedRestaurantId) {
        if (!profile) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const result = await getManagerOrders(profile.appUserId, restaurantId);
            setSelectedRestaurantId(result.selectedRestaurantId);
            storeManagerRestaurantId(result.selectedRestaurantId);
            setData(result.data);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load orders.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        void loadDashboard();
    }, [profile, selectedRestaurantId]);

    useEffect(() => {
        const status = searchParams.get("status");
        setActiveStatus(isOrderStatus(status) ? status : "All");
    }, [searchParams]);

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
                                <h1>Orders</h1>
                                <p>Manage all orders for {selectedRestaurant?.name ?? "your restaurant"}.</p>
                            </div>
                        </header>

                        {error && <div className="manager-alert">{error}</div>}

                        <section className="manager-order-summary">
                            <article className="manager-order-summary__total">
                                <span>Total Orders</span>
                                <strong>{orderCounts.total}</strong>
                                <ClipboardList size={28} />
                            </article>
                            <article><span>Pending</span><strong>{orderCounts.pending}</strong></article>
                            <article><span>Preparing</span><strong>{orderCounts.progress}</strong></article>
                            <article><span>Ready</span><strong>{orderCounts.ready}</strong></article>
                            <article><span>Completed</span><strong>{orderCounts.completed}</strong></article>
                            <article><span>Cancelled</span><strong>{orderCounts.cancelled}</strong></article>
                        </section>

                        <section className="manager-orders-toolbar">
                            <div className="manager-orders-tabs">
                                {orderStatuses.map(status => (
                                    <button
                                        key={status}
                                        type="button"
                                        className={activeStatus === status ? "manager-orders-tabs__item manager-orders-tabs__item--active" : "manager-orders-tabs__item"}
                                        onClick={() => {
                                            setActiveStatus(status);
                                            setSearchParams(status === "All" ? {} : { status });
                                        }}
                                    >
                                        {status === "InProgress" ? "Preparing" : orderStatusLabel(status)}
                                    </button>
                                ))}
                            </div>
                            <label className="manager-orders-search">
                                <Search size={16} />
                                <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search orders..." />
                            </label>
                        </section>

                        <section className="manager-orders-grid">
                            {filteredOrders.map(order => {
                                const table = tablesById.get(order.tableId);
                                const items = data.orderItems.filter(item => item.orderId === order.id);
                                const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

                                return (
                                    <article key={order.id} className="manager-order-card">
                                        <header>
                                            <div>
                                                <strong>Order {buildOrderNumber(order)}</strong>
                                                <span>{table ? `Table No.${table.number}` : `Table #${order.tableId}`}</span>
                                            </div>
                                            <span className={`manager-status manager-status--${statusTone[order.status] ?? "pending"}`}>
                                                {order.status === "InProgress" ? "Preparing" : orderStatusLabel(order.status)}
                                            </span>
                                        </header>
                                        <p>{orderDate(order.createdAt)}</p>
                                        <strong>{money(order.total)}</strong>
                                        <footer>
                                            <span><ShoppingBag size={14} /> {itemCount} item{itemCount === 1 ? "" : "s"}</span>
                                            <button type="button" onClick={() => setSelectedOrderId(order.id)}>
                                                View Details
                                            </button>
                                        </footer>
                                    </article>
                                );
                            })}
                            {filteredOrders.length === 0 && <p className="manager-empty">No orders found.</p>}
                        </section>
                    </div>
                </main>

                {selectedOrder && (
                    <ManagerOrderDetailsModal
                        menuItems={data.menuItems}
                        onClose={() => setSelectedOrderId(null)}
                        order={selectedOrder}
                        orderItems={selectedOrderItems}
                        table={selectedOrderTable}
                    />
                )}

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

