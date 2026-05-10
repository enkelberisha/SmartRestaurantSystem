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
    Settings,
    Table2,
    Users,
    WalletCards
} from "lucide-react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUserContext } from "@/context/useUserContext";
import { useTheme } from "@/hooks/useTheme";
import { getBrandLogo } from "@/lib/branding/brandLogo";
import type { AdminTable, TableStatus } from "@/lib/admin/adminService";
import {
    emptyManagerTablesData,
    getManagerTables,
    updateManagerTableStatus
} from "@/manager/services/tablesService";
import {
    getStoredManagerRestaurantId,
    storeManagerRestaurantId
} from "@/manager/services/managerRestaurantService";
import { ManagerTableDetailsModal } from "@/manager/components/ManagerTableDetailsModal";
import type { ManagerTablesData } from "@/manager/types";
import { Modal } from "@/features/superadmin/components/Modal";

const navItems = [
    { href: "/manager", label: "Dashboard", icon: LayoutDashboard, end: true, disabled: false },
    { href: "/manager/orders", label: "Orders", icon: WalletCards, disabled: false },
    { href: "/manager/tables", label: "Tables", icon: Table2, disabled: false },
    { href: "/manager/kitchen", label: "Kitchen", icon: CookingPot, disabled: false },
    { href: "/manager/menus", label: "Menus", icon: BookOpen, disabled: false },
    { href: "/manager/inventory", label: "Inventory", icon: Settings, disabled: false }
];

const tableStatuses = ["All", "Available", "Occupied", "Reserved", "OutOfService"] as const;
const tableStatusLabels: Record<string, string> = {
    All: "All",
    Available: "Available",
    Occupied: "Occupied",
    Reserved: "Reserved",
    OutOfService: "Out of Service"
};

function money(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
    }).format(value);
}

function tableSizeLabel(capacity: number) {
    if (capacity <= 4) {
        return "Small";
    }

    if (capacity <= 6) {
        return "Medium";
    }

    return "Large";
}

function isTableStatus(value: string | null): value is (typeof tableStatuses)[number] {
    return tableStatuses.some(status => status === value);
}

export function ManagerTablesPage() {
    const { profile, isLoading: profileLoading, logout } = useUserContext();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const brandLogo = getBrandLogo(theme);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(() => getStoredManagerRestaurantId());
    const [data, setData] = useState<ManagerTablesData>(emptyManagerTablesData);
    const [activeStatus, setActiveStatus] = useState<(typeof tableStatuses)[number]>(() => {
        const status = searchParams.get("status");
        return isTableStatus(status) ? status : "All";
    });
    const [query, setQuery] = useState("");
    const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
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
    const selectedTable = data.tables.find(table => table.id === selectedTableId) ?? null;
    const activeOrderStatuses = ["Pending", "InProgress", "Ready"];
    const ordersByTable = useMemo(() => {
        const map = new Map<number, typeof data.orders>();

        data.tables.forEach(table => {
            map.set(table.id, data.orders.filter(order => order.tableId === table.id).sort((left, right) => right.id - left.id));
        });

        return map;
    }, [data.orders, data.tables]);
    const tableSummaries = useMemo(() => data.tables.map(table => {
        const orders = ordersByTable.get(table.id) ?? [];
        const activeOrder = orders.find(order => activeOrderStatuses.includes(order.status)) ?? null;
        const latestOrder = activeOrder ?? orders[0] ?? null;
        const orderIds = new Set(orders.map(order => order.id));
        const itemCount = data.orderItems
            .filter(item => orderIds.has(item.orderId))
            .reduce((sum, item) => sum + item.quantity, 0);
        const total = orders.reduce((sum, order) => sum + order.total, 0);

        return {
            table,
            orders,
            latestOrder,
            itemCount,
            total
        };
    }), [data.orderItems, data.tables, ordersByTable]);
    const filteredTables = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return tableSummaries
            .filter(summary => activeStatus === "All" || summary.table.status === activeStatus)
            .filter(summary => {
                if (!normalizedQuery) {
                    return true;
                }

                return [
                    `table ${summary.table.number}`,
                    String(summary.table.number),
                    tableStatusLabels[summary.table.status],
                    tableSizeLabel(summary.table.capacity)
                ].some(value => value.toLowerCase().includes(normalizedQuery));
            })
            .sort((left, right) => left.table.number - right.table.number);
    }, [activeStatus, query, tableSummaries]);
    const selectedTableSummary = selectedTable ? tableSummaries.find(summary => summary.table.id === selectedTable.id) ?? null : null;
    const tableCounts = useMemo(() => ({
        total: data.tables.length,
        available: data.tables.filter(table => table.status === "Available").length,
        occupied: data.tables.filter(table => table.status === "Occupied").length,
        reserved: data.tables.filter(table => table.status === "Reserved").length,
        outOfService: data.tables.filter(table => table.status === "OutOfService").length
    }), [data.tables]);

    async function loadDashboard(restaurantId = selectedRestaurantId) {
        if (!profile) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const result = await getManagerTables(profile.appUserId, restaurantId);
            setSelectedRestaurantId(result.selectedRestaurantId);
            storeManagerRestaurantId(result.selectedRestaurantId);
            setData(result.data);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load tables.");
        } finally {
            setIsLoading(false);
        }
    }

    async function changeTableStatus(table: AdminTable, status: TableStatus) {
        try {
            setIsSaving(true);
            setError(null);
            await updateManagerTableStatus(table, status);
            await loadDashboard(selectedRestaurantId);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Could not update table.");
        } finally {
            setIsSaving(false);
        }
    }

    useEffect(() => {
        void loadDashboard();
    }, [profile, selectedRestaurantId]);

    useEffect(() => {
        const status = searchParams.get("status");
        setActiveStatus(isTableStatus(status) ? status : "All");
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
                                <h1>Tables</h1>
                                <p>Monitor table availability and service activity for {selectedRestaurant?.name ?? "your restaurant"}.</p>
                            </div>
                        </header>

                        {error && <div className="manager-alert">{error}</div>}

                        <section className="manager-table-summary">
                            <article className="manager-table-summary__total">
                                <span>Total Tables</span>
                                <strong>{tableCounts.total}</strong>
                                <Table2 size={28} />
                            </article>
                            <article><span>Occupied</span><strong>{tableCounts.occupied}</strong></article>
                            <article><span>Reserved</span><strong>{tableCounts.reserved}</strong></article>
                            <article><span>Available</span><strong>{tableCounts.available}</strong></article>
                            <article><span>Out of Service</span><strong>{tableCounts.outOfService}</strong></article>
                        </section>

                        <section className="manager-orders-toolbar">
                            <div className="manager-orders-tabs manager-table-tabs">
                                {tableStatuses.map(status => (
                                    <button
                                        key={status}
                                        type="button"
                                        className={activeStatus === status ? "manager-orders-tabs__item manager-orders-tabs__item--active" : "manager-orders-tabs__item"}
                                        onClick={() => {
                                            setActiveStatus(status);
                                            setSearchParams(status === "All" ? {} : { status });
                                        }}
                                    >
                                        {tableStatusLabels[status]}
                                    </button>
                                ))}
                            </div>
                            <label className="manager-orders-search">
                                <Search size={16} />
                                <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tables..." />
                            </label>
                        </section>

                        <section className="manager-tables-grid">
                            {filteredTables.map(summary => (
                                <button
                                    key={summary.table.id}
                                    type="button"
                                    className="manager-table-card"
                                    onClick={() => setSelectedTableId(summary.table.id)}
                                >
                                    <header>
                                        <div className="manager-table-card__mark">
                                            <Table2 size={18} />
                                            <strong>T-{String(summary.table.number).padStart(2, "0")}</strong>
                                        </div>
                                        <span className={`manager-table-status manager-table-status--${summary.table.status.toLowerCase()}`}>
                                            {tableStatusLabels[summary.table.status]}
                                        </span>
                                    </header>
                                    <div className="manager-table-card__body">
                                        <span>{tableSizeLabel(summary.table.capacity)}</span>
                                        <span><Users size={14} /> {summary.table.capacity} seats</span>
                                        <strong>{money(summary.total)}</strong>
                                    </div>
                                    <footer>
                                        <span>{summary.orders.length} order{summary.orders.length === 1 ? "" : "s"}</span>
                                        <span>{summary.itemCount} item{summary.itemCount === 1 ? "" : "s"}</span>
                                    </footer>
                                </button>
                            ))}
                            {filteredTables.length === 0 && <p className="manager-empty">No tables found.</p>}
                        </section>
                    </div>
                </main>

                {selectedTable && selectedTableSummary && (
                    <ManagerTableDetailsModal
                        isSaving={isSaving}
                        itemCount={selectedTableSummary.itemCount}
                        onChangeStatus={(table, status) => void changeTableStatus(table, status)}
                        onClose={() => setSelectedTableId(null)}
                        onOpenOrderStatus={status => navigate(`/manager/orders?status=${status}`)}
                        orders={selectedTableSummary.orders}
                        table={selectedTable}
                        total={selectedTableSummary.total}
                    />
                )}

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
                            <p className="modal-copy">{profile?.email}</p>
                            <p className="modal-copy">{profile?.role ?? "Manager"}</p>
                        </div>
                        <div className="sa-inline-actions">
                            <Button variant="secondary" onClick={() => setProfileOpen(false)}>
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
        </div>
    );
}

