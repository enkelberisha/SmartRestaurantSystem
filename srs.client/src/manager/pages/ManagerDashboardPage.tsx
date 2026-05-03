import { useEffect, useMemo, useState } from "react";
import {
    ArrowUpRight,
    Bell,
    BookOpen,
    CalendarDays,
    ChevronDown,
    CircleHelp,
    Clock3,
    CookingPot,
    LayoutDashboard,
    LogOut,
    Settings,
    Store,
    Table2,
    TrendingUp,
    Utensils,
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
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUserContext } from "@/context/UserContext";
import { getBrandLogo } from "@/lib/branding/brandLogo";
import { useTheme } from "@/hooks/useTheme";
import {
    emptyManagerDashboardData,
    getManagerDashboard
} from "@/manager/services/dashboardService";

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
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
    const [data, setData] = useState(emptyManagerDashboardData);
    const [dateRange, setDateRange] = useState({
        from: toDateInputValue(daysAgo(6)),
        to: toDateInputValue(new Date())
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const localPart = profile?.email.split("@")[0] ?? "manager";
    const selectedRestaurant = data.restaurants.find(restaurant => restaurant.id === selectedRestaurantId) ?? data.restaurants[0] ?? null;
    const tablesById = useMemo(() => new Map(data.tables.map(table => [table.id, table])), [data.tables]);
    const menuItemsById = useMemo(() => new Map(data.menuItems.map(item => [item.id, item])), [data.menuItems]);
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
            const current = totals.get(item.menuItemId) ?? {
                id: item.menuItemId,
                name: menuItem?.name ?? `Menu Item #${item.menuItemId}`,
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

    const recentOrders = useMemo(() => [...filteredOrders].sort((left, right) => right.id - left.id).slice(0, 4), [filteredOrders]);
    const recentActivity = useMemo(() => recentOrders.map(order => {
        const table = tablesById.get(order.tableId);
        const items = restaurantOrderItems.filter(item => item.orderId === order.id);
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        const itemNames = items
            .slice(0, 3)
            .map(item => menuItemsById.get(item.menuItemId)?.name ?? `Menu Item #${item.menuItemId}`);
        const status = orderStatusLabel(order.status);
        const tableLabel = table ? `Table ${table.number}` : `Table #${order.tableId}`;

        return {
            id: order.id,
            status,
            tone: statusTone[order.status] ?? "pending",
            title: `${status} order #${order.id}`,
            tableLabel,
            tableStatus: table?.status ?? "Unknown",
            total: order.total,
            itemCount,
            items: itemNames.length > 0 ? itemNames.join(", ") : "No items added yet"
        };
    }), [menuItemsById, recentOrders, restaurantOrderItems, tablesById]);

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
            <main className="manager-shell manager-shell--loading">
                <section className="manager-loading-card">
                    <div className="skeleton-block manager-loading-card__logo" />
                    <div className="skeleton-block manager-loading-card__line" />
                    <div className="skeleton-block manager-loading-card__body" />
                </section>
            </main>
        );
    }

    return (
        <div className="manager-shell">
            <aside className="manager-sidebar">
                <div className="manager-brand">
                    <img src={brandLogo} alt="Smart Restaurant System" />
                </div>

                <label className="manager-store-picker">
                    <span>Store</span>
                    <div>
                        <Store size={16} />
                        <select
                            value={selectedRestaurantId ?? ""}
                            onChange={event => setSelectedRestaurantId(Number(event.target.value))}
                            disabled={data.restaurants.length === 0}
                        >
                            {data.restaurants.map(restaurant => (
                                <option key={restaurant.id} value={restaurant.id}>
                                    {restaurant.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} />
                    </div>
                </label>

                <nav className="manager-nav" aria-label="Manager">
                    <a className="manager-nav__item manager-nav__item--active" href="/manager">
                        <LayoutDashboard size={17} />
                        <span>Dashboard</span>
                    </a>
                    <a className="manager-nav__item" href="/manager">
                        <WalletCards size={17} />
                        <span>Orders</span>
                    </a>
                    <a className="manager-nav__item" href="/manager">
                        <Table2 size={17} />
                        <span>Tables</span>
                    </a>
                    <a className="manager-nav__item" href="/manager">
                        <CookingPot size={17} />
                        <span>Kitchen</span>
                    </a>
                    <a className="manager-nav__item" href="/manager">
                        <BookOpen size={17} />
                        <span>Menus</span>
                    </a>
                </nav>

                <div className="manager-sidebar__bottom">
                    <a className="manager-nav__item" href="/manager">
                        <CircleHelp size={17} />
                        <span>Help</span>
                    </a>
                    <a className="manager-nav__item" href="/manager">
                        <Settings size={17} />
                        <span>Settings</span>
                    </a>
                    <button
                        type="button"
                        className="manager-profile"
                        onClick={async () => {
                            await logout();
                            navigate("/login", { replace: true });
                        }}
                    >
                        <span>{localPart.slice(0, 2).toUpperCase()}</span>
                        <div>
                            <strong>{localPart}</strong>
                            <small>Manager</small>
                        </div>
                        <LogOut size={16} />
                    </button>
                </div>
            </aside>

            <main className="manager-main">
                <header className="manager-topbar">
                    <div>
                        <h1>Dashboard</h1>
                        <p>{selectedRestaurant ? `Welcome back to ${selectedRestaurant.name}` : "No restaurant assigned"}</p>
                    </div>
                    <div className="manager-topbar__actions">
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
                        <ThemeToggle theme={theme} onToggle={toggleTheme} />
                        <button type="button" className="manager-icon-button" aria-label="Notifications">
                            <Bell size={18} />
                        </button>
                    </div>
                </header>

                {error && <div className="manager-alert">{error}</div>}

                <section className="manager-kpi-grid">
                    <article className="manager-kpi-card">
                        <div>
                            <span><WalletCards size={15} /> Pending Orders</span>
                            <button type="button" aria-label="Open pending orders">
                                <ArrowUpRight size={15} />
                            </button>
                        </div>
                        <strong>{pendingOrders.length}</strong>
                        <p><TrendingUp size={14} /> {percent(completedOrders.length, filteredOrders.length)}% closed</p>
                    </article>
                    <article className="manager-kpi-card">
                        <div>
                            <span><CookingPot size={15} /> Orders in Progress</span>
                            <button type="button" aria-label="Open active orders">
                                <ArrowUpRight size={15} />
                            </button>
                        </div>
                        <strong>{activeOrders.length}</strong>
                        <p>{filteredOrders.length} total orders</p>
                    </article>
                    <article className="manager-kpi-card">
                        <div>
                            <span><Table2 size={15} /> Available Tables</span>
                            <button type="button" aria-label="Open tables">
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
                        <header className="manager-panel__header">
                            <div>
                                <h2>Business Data</h2>
                            </div>
                            <span><CalendarDays size={15} /> {periodLabel}</span>
                        </header>
                        <div className="manager-business-list">
                            <div className="manager-business-list__item manager-business-list__item--customers">
                                <span>Number of Customers</span>
                                <strong>{uniqueGuests}</strong>
                                <ArrowUpRight size={15} />
                            </div>
                            <div className="manager-business-list__item manager-business-list__item--orders">
                                <span>Total Orders</span>
                                <strong>{filteredOrders.length}</strong>
                                <ArrowUpRight size={15} />
                            </div>
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
                                <h2>Recent Activity</h2>
                            </div>
                            <button type="button" aria-label="Open recent activity">
                                <ArrowUpRight size={15} />
                            </button>
                        </header>
                        <div className="manager-activity-list">
                            {recentActivity.map(activity => (
                                <article key={activity.id} className="manager-activity">
                                    <span className={`manager-activity__thumb manager-activity__thumb--${activity.tone}`}>
                                        <Utensils size={18} />
                                    </span>
                                    <div className="manager-activity__content">
                                        <strong>{activity.title}</strong>
                                        <p>{activity.tableLabel} is {activity.tableStatus.toLowerCase()} with {activity.itemCount} item{activity.itemCount === 1 ? "" : "s"}.</p>
                                        <small>
                                            <span>{activity.items}</span>
                                            <span>{money(activity.total)}</span>
                                            <span><Clock3 size={13} /> Live order</span>
                                        </small>
                                    </div>
                                    <span className={`manager-status manager-status--${activity.tone}`}>
                                        {activity.status}
                                    </span>
                                </article>
                            ))}
                            {recentActivity.length === 0 && <p className="manager-empty">No recent orders found.</p>}
                        </div>
                    </article>

                    <article className="manager-panel">
                        <header className="manager-panel__header">
                            <div>
                                <h2>Menu Performance</h2>
                                <p>
                                    Showing {visibleMenuPerformance.length} of {menuPerformance.length} ordered dishes for the selected period
                                </p>
                            </div>
                            <span><CalendarDays size={15} /> {periodLabel}</span>
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
            </main>
        </div>
    );
}
