import { useEffect, useMemo, useState } from "react";
import {
    ArrowUpRight,
    Bell,
    BookOpen,
    Building2,
    CalendarDays,
    ChevronDown,
    CookingPot,
    FileDown,
    LayoutDashboard,
    Menu,
    Search,
    Settings,
    Table2,
    TrendingUp,
    WalletCards
} from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUserContext } from "@/context/UserContext";
import { getBrandLogo } from "@/lib/branding/brandLogo";
import { useTheme } from "@/hooks/useTheme";
import {
    emptyManagerDashboardData,
    getManagerDashboard
} from "@/manager/services/dashboardService";
import {
    getStoredManagerRestaurantId,
    storeManagerRestaurantId
} from "@/manager/services/managerRestaurantService";
import { Modal } from "@/superadmin/components/Modal";

const navItems = [
    { href: "/manager", label: "Dashboard", icon: LayoutDashboard, end: true, disabled: false },
    { href: "/manager/orders", label: "Orders", icon: WalletCards, disabled: false },
    { href: "/manager/tables", label: "Tables", icon: Table2, disabled: false },
    { href: "/manager/kitchen", label: "Kitchen", icon: CookingPot, disabled: false },
    { href: "/manager/menus", label: "Menus", icon: BookOpen, disabled: false },
    { href: "/manager/inventory", label: "Inventory", icon: Settings, disabled: false }
];

const statusTone: Record<string, string> = {
    Pending: "pending",
    InProgress: "progress",
    Ready: "ready",
    Completed: "completed",
    Cancelled: "cancelled"
};

function toDateInputValue(date: Date) {
    return date.toISOString().slice(0, 10);
}

function daysAgo(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
}

function startOfInputDay(value: string) {
    return new Date(`${value}T00:00:00`);
}

function endOfInputDay(value: string) {
    return new Date(`${value}T23:59:59.999`);
}

function money(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
    }).format(value);
}

function percent(part: number, whole: number) {
    if (whole === 0) {
        return 0;
    }

    return Math.round((part / whole) * 100);
}

function orderStatusLabel(status: string) {
    return status.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function dateLabel(value: string) {
    return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
    });
}

export function ManagerDashboardPage() {
    const { profile, isLoading: profileLoading, logout } = useUserContext();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const brandLogo = getBrandLogo(theme);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(() => getStoredManagerRestaurantId());
    const [data, setData] = useState(emptyManagerDashboardData);
    const [dateRange, setDateRange] = useState({
        from: toDateInputValue(daysAgo(6)),
        to: toDateInputValue(new Date())
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const localPart = profile?.email.split("@")[0] ?? "manager";
    const avatar = localPart
        .split(/[^a-zA-Z0-9]/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() ?? "")
        .join("") || "MG";
    const canSwitchRestaurants = data.restaurants.length > 1;
    const selectedRestaurant = data.restaurants.find(restaurant => restaurant.id === selectedRestaurantId) ?? data.restaurants[0] ?? null;
    const filteredOrders = useMemo(() => {
        const from = startOfInputDay(dateRange.from);
        const to = endOfInputDay(dateRange.to);

        return data.orders.filter(order => {
            if (!order.createdAt) {
                return true;
            }

            const createdAt = new Date(order.createdAt);
            return createdAt >= from && createdAt <= to;
        });
    }, [data.orders, dateRange.from, dateRange.to]);
    const filteredReservations = useMemo(
        () => data.reservations.filter(reservation =>
            reservation.reservationDate >= dateRange.from &&
            reservation.reservationDate <= dateRange.to
        ),
        [data.reservations, dateRange.from, dateRange.to]
    );
    const periodLabel = `${dateLabel(dateRange.from)} - ${dateLabel(dateRange.to)}`;
    const orderIds = useMemo(() => new Set(filteredOrders.map(order => order.id)), [filteredOrders]);
    const restaurantOrderItems = useMemo(
        () => data.orderItems.filter(item => orderIds.has(item.orderId)),
        [data.orderItems, orderIds]
    );
    const completedOrders = filteredOrders.filter(order => order.status === "Completed");
    const activeOrders = filteredOrders.filter(order => ["Pending", "InProgress", "Ready"].includes(order.status));
    const pendingOrders = filteredOrders.filter(order => order.status === "Pending");
    const availableTables = data.tables.filter(table => table.status === "Available");
    const revenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const averageOrderValue = filteredOrders.length > 0 ? revenue / filteredOrders.length : 0;
    const activeReservations = filteredReservations.filter(reservation => reservation.status !== "Cancelled");
    const uniqueGuests = new Set(
        activeReservations.map(reservation => reservation.phone || reservation.name.toLowerCase())
    ).size;

    const salesByDay = useMemo(() => {
        const buckets: Array<{ day: string; date: string; revenue: number }> = [];
        const cursor = startOfInputDay(dateRange.from);
        const end = startOfInputDay(dateRange.to);

        while (cursor <= end && buckets.length < 31) {
            const date = toDateInputValue(cursor);
            buckets.push({
                date,
                day: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                revenue: 0
            });
            cursor.setDate(cursor.getDate() + 1);
        }

        filteredOrders.forEach(order => {
            if (!order.createdAt) {
                return;
            }

            const date = toDateInputValue(new Date(order.createdAt));
            const bucket = buckets.find(item => item.date === date);

            if (bucket) {
                bucket.revenue += order.total;
            }
        });

        return buckets;
    }, [dateRange.from, dateRange.to, filteredOrders]);

    const menuPerformance = useMemo(() => {
        const menuById = new Map(data.menuItems.map(item => [item.id, item]));
        const totals = new Map<number, { id: number; name: string; orders: number; revenue: number }>();

        restaurantOrderItems.forEach(item => {
            const menuItem = menuById.get(item.menuItemId);
            if (!menuItem) {
                return;
            }

            const current = totals.get(item.menuItemId) ?? {
                id: item.menuItemId,
                name: menuItem.name,
                orders: 0,
                revenue: 0
            };

            current.orders += item.quantity;
            current.revenue += item.quantity * item.price;
            totals.set(item.menuItemId, current);
        });

        return Array.from(totals.values())
            .sort((left, right) => right.orders - left.orders)
    }, [data.menuItems, restaurantOrderItems]);
    const visibleMenuPerformance = menuPerformance.slice(0, 8);
    const topDishUnits = visibleMenuPerformance[0]?.orders ?? 0;
    const tableOverview = useMemo(() => data.tables
        .map(table => {
            const tableOrders = filteredOrders
                .filter(order => order.tableId === table.id)
                .sort((left, right) => right.id - left.id);
            const activeOrder = tableOrders.find(order => ["Pending", "InProgress", "Ready"].includes(order.status)) ?? null;
            const latestOrder = activeOrder ?? tableOrders[0] ?? null;
            const tableOrderIds = new Set(tableOrders.map(order => order.id));
            const items = restaurantOrderItems.filter(item => tableOrderIds.has(item.orderId));
            const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
            const total = tableOrders.reduce((sum, order) => sum + order.total, 0);

            return {
                id: table.id,
                number: table.number,
                capacity: table.capacity,
                tableStatus: table.status,
                orderId: latestOrder?.id ?? null,
                orderCount: tableOrders.length,
                orderStatus: latestOrder ? orderStatusLabel(latestOrder.status) : "No order",
                orderTone: latestOrder ? statusTone[latestOrder.status] ?? "pending" : table.status.toLowerCase(),
                total,
                itemCount
            };
        })
        .sort((left, right) => {
            const leftActive = left.orderId === null ? 1 : 0;
            const rightActive = right.orderId === null ? 1 : 0;
            return leftActive - rightActive || left.number - right.number;
        })
        .slice(0, 8), [data.tables, filteredOrders, restaurantOrderItems]);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            if (!profile) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);
                const result = await getManagerDashboard(profile.appUserId, selectedRestaurantId);

                if (isMounted) {
                    setSelectedRestaurantId(result.selectedRestaurantId);
                    storeManagerRestaurantId(result.selectedRestaurantId);
                    setData(result.data);
                }
            } catch (loadError) {
                if (isMounted) {
                    setError(loadError instanceof Error ? loadError.message : "Could not load manager dashboard.");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void load();

        return () => {
            isMounted = false;
        };
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
                        <h1>Dashboard</h1>
                        <p>{selectedRestaurant ? `Welcome back to ${selectedRestaurant.name}` : "No restaurant assigned"}</p>
                    </div>
                    <div className="admin-inline-actions">
                        <Button variant="secondary" disabled title="Reporting export will be added later">
                            <FileDown size={16} />
                            Export PDF
                        </Button>
                        <div className="manager-date-filter" aria-label="Dashboard date range">
                            <label>
                                <span>From</span>
                                <input
                                    type="date"
                                    value={dateRange.from}
                                    max={dateRange.to}
                                    onChange={event => setDateRange(current => ({ ...current, from: event.target.value }))}
                                />
                            </label>
                            <label>
                                <span>To</span>
                                <input
                                    type="date"
                                    value={dateRange.to}
                                    min={dateRange.from}
                                    onChange={event => setDateRange(current => ({ ...current, to: event.target.value }))}
                                />
                            </label>
                        </div>
                    </div>
                </header>

                {error && <div className="manager-alert">{error}</div>}

                <section className="manager-kpi-grid">
                    <article className="manager-kpi-card">
                        <div>
                            <span><WalletCards size={15} /> Pending Orders</span>
                            <button type="button" aria-label="Open pending orders" onClick={() => navigate("/manager/orders?status=Pending")}>
                                <ArrowUpRight size={15} />
                            </button>
                        </div>
                        <strong>{pendingOrders.length}</strong>
                        <p><TrendingUp size={14} /> {percent(completedOrders.length, filteredOrders.length)}% closed</p>
                    </article>
                    <article className="manager-kpi-card">
                        <div>
                            <span><CookingPot size={15} /> Orders in Progress</span>
                            <button type="button" aria-label="Open active orders" onClick={() => navigate("/manager/orders?status=InProgress")}>
                                <ArrowUpRight size={15} />
                            </button>
                        </div>
                        <strong>{activeOrders.length}</strong>
                        <p>{filteredOrders.length} total orders</p>
                    </article>
                    <article className="manager-kpi-card">
                        <div>
                            <span><Table2 size={15} /> Available Tables</span>
                            <button type="button" aria-label="Open available tables" onClick={() => navigate("/manager/tables?status=Available")}>
                                <ArrowUpRight size={15} />
                            </button>
                        </div>
                        <strong>{availableTables.length}<small>/{data.tables.length}</small></strong>
                        <p>{percent(availableTables.length, data.tables.length)}% bookable</p>
                    </article>
                </section>

                <section className="manager-dashboard-grid">
                    <article className="manager-panel manager-panel--revenue">
                        <header className="manager-panel__header">
                            <div>
                                <h2>Total Revenue</h2>
                                <p>Sales overview</p>
                            </div>
                            <span><CalendarDays size={15} /> {periodLabel}</span>
                        </header>
                        <div className="manager-chart">
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={salesByDay}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={12} />
                                    <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={money} width={54} />
                                    <Tooltip
                                        formatter={value => money(typeof value === "number" ? value : Number(value ?? 0))}
                                        cursor={{ fill: "var(--primary-soft)" }}
                                    />
                                    <Bar dataKey="revenue" radius={[12, 12, 12, 12]}>
                                        {salesByDay.map(day => (
                                            <Cell key={day.day} fill={day.revenue === Math.max(...salesByDay.map(item => item.revenue)) ? "var(--primary)" : "var(--surface-muted)"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </article>

                    <article className="manager-panel manager-business-card">
                        <header className="manager-panel__header manager-panel__header--menu">
                            <div>
                                <h2>Business Data</h2>
                            </div>
                            <span className="manager-period-pill manager-period-pill--menu"><CalendarDays size={15} /> {periodLabel}</span>
                        </header>
                        <div className="manager-business-list">
                            <div className="manager-business-list__item manager-business-list__item--customers">
                                <span>Number of Customers</span>
                                <strong>{uniqueGuests}</strong>
                                <ArrowUpRight size={15} />
                            </div>
                            <button
                                type="button"
                                className="manager-business-list__item manager-business-list__item--orders"
                                onClick={() => navigate("/manager/orders")}
                            >
                                <span>Total Orders</span>
                                <strong>{filteredOrders.length}</strong>
                                <ArrowUpRight size={15} />
                            </button>
                            <div className="manager-business-list__item manager-business-list__item--average">
                                <span>Average Order Value</span>
                                <strong>{money(averageOrderValue)}</strong>
                                <ArrowUpRight size={15} />
                            </div>
                        </div>
                    </article>
                </section>

                <section className="manager-dashboard-grid manager-dashboard-grid--bottom">
                    <article className="manager-panel">
                        <header className="manager-panel__header">
                            <div>
                                <h2>Table Overview</h2>
                            </div>
                            <button type="button" aria-label="Open table overview" onClick={() => navigate("/manager/tables")}>
                                <ArrowUpRight size={15} />
                            </button>
                        </header>
                        <div className="manager-table-list">
                            {tableOverview.map(table => (
                                <article key={table.id} className="manager-table-row">
                                    <span className="manager-table-row__number">
                                        {table.number}
                                    </span>
                                    <div className="manager-table-row__content">
                                        <strong>Table {table.number}</strong>
                                        <small>
                                            <span>{table.capacity} seats</span>
                                            <span>{table.itemCount} item{table.itemCount === 1 ? "" : "s"}</span>
                                            <span>
                                                {table.orderCount > 0
                                                    ? `${table.orderCount} order${table.orderCount === 1 ? "" : "s"}`
                                                    : "No orders"}
                                            </span>
                                            {table.orderId && <span>Latest #{table.orderId}</span>}
                                        </small>
                                    </div>
                                    <div className="manager-table-row__status">
                                        <span className={`manager-status manager-status--${table.orderTone}`}>
                                            {table.orderStatus}
                                        </span>
                                        <small>{table.orderCount > 0 ? money(table.total) : table.tableStatus}</small>
                                    </div>
                                </article>
                            ))}
                            {tableOverview.length === 0 && <p className="manager-empty">No tables found.</p>}
                        </div>
                    </article>

                    <article className="manager-panel">
                        <header className="manager-panel__header manager-panel__header--menu">
                            <div>
                                <h2>Menu Performance</h2>
                            </div>
                            <span className="manager-period-pill manager-period-pill--menu"><CalendarDays size={15} /> {periodLabel}</span>
                        </header>
                        <div className="manager-dish-list">
                            {visibleMenuPerformance.map((dish, index) => (
                                <article key={dish.id} className="manager-dish">
                                    <span className="manager-dish__rank">#{index + 1}</span>
                                    <div className="manager-dish__content">
                                        <div className="manager-dish__title">
                                            <strong>{dish.name}</strong>
                                        </div>
                                        <span className="manager-dish__bar">
                                            <span style={{ width: `${percent(dish.orders, topDishUnits)}%` }} />
                                        </span>
                                    </div>
                                    <div className="manager-dish__stats">
                                        <span>{dish.orders} sold</span>
                                        <span>{money(dish.revenue)} revenue</span>
                                    </div>
                                </article>
                            ))}
                            {menuPerformance.length === 0 && <p className="manager-empty">No ordered dishes yet.</p>}
                        </div>
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

