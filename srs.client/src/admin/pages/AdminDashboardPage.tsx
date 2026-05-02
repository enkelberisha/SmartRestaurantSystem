import { useEffect, useState } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Users, ShoppingBag, DollarSign, Utensils } from "lucide-react";

const revenueData = [
    { name: "Mon", revenue: 2400, orders: 24 },
    { name: "Tue", revenue: 1398, orders: 13 },
    { name: "Wed", revenue: 9800, orders: 98 },
    { name: "Thu", revenue: 3908, orders: 39 },
    { name: "Fri", revenue: 4800, orders: 48 },
    { name: "Sat", revenue: 8200, orders: 82 },
    { name: "Sun", revenue: 6100, orders: 61 },
];

const categoryData = [
    { name: "Main Course", value: 45, color: "#7b5cff" },
    { name: "Appetizers", value: 25, color: "#39b5c1" },
    { name: "Desserts", value: 15, color: "#49c49f" },
    { name: "Beverages", value: 15, color: "#ff8ca5" },
];

const hourlyOrders = [
    { hour: "11am", orders: 12 },
    { hour: "12pm", orders: 38 },
    { hour: "1pm", orders: 45 },
    { hour: "2pm", orders: 28 },
    { hour: "3pm", orders: 15 },
    { hour: "4pm", orders: 18 },
    { hour: "5pm", orders: 22 },
    { hour: "6pm", orders: 48 },
    { hour: "7pm", orders: 65 },
    { hour: "8pm", orders: 58 },
    { hour: "9pm", orders: 42 },
    { hour: "10pm", orders: 20 },
];

const recentOrders = [
    { id: "#1024", table: "Table 5", items: 4, total: 89.50, status: "preparing" },
    { id: "#1023", table: "Table 12", items: 2, total: 45.00, status: "served" },
    { id: "#1022", table: "Takeout", items: 6, total: 124.75, status: "completed" },
    { id: "#1021", table: "Table 3", items: 3, total: 67.25, status: "preparing" },
    { id: "#1020", table: "Table 8", items: 5, total: 156.00, status: "pending" },
];

const kpiData = [
    {
        label: "Today's Revenue",
        value: "$4,285",
        change: "+12.5%",
        trending: "up",
        icon: DollarSign,
    },
    {
        label: "Active Orders",
        value: "24",
        change: "+8",
        trending: "up",
        icon: ShoppingBag,
    },
    {
        label: "Guests Today",
        value: "156",
        change: "+23.1%",
        trending: "up",
        icon: Users,
    },
    {
        label: "Tables Occupied",
        value: "18/25",
        change: "72%",
        trending: "neutral",
        icon: Utensils,
    },
];

export function AdminDashboardPage() {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 600);
        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return (
            <div className="admin-stack">
                <div className="admin-kpi-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="skeleton-block admin-kpi-skeleton" />
                    ))}
                </div>
                <div className="admin-chart-grid">
                    <div className="skeleton-block admin-chart-skeleton" />
                    <div className="skeleton-block admin-chart-skeleton" />
                </div>
            </div>
        );
    }

    return (
        <div className="admin-stack">
            <header className="admin-page-header">
                <h1>Dashboard</h1>
                <p>Welcome back! Here&apos;s what&apos;s happening at your restaurant today.</p>
            </header>

            <div className="admin-kpi-grid">
                {kpiData.map(kpi => (
                    <article key={kpi.label} className="admin-kpi-card">
                        <div className="admin-kpi-card__header">
                            <span className="admin-kpi-card__icon">
                                <kpi.icon size={20} />
                            </span>
                            <span className={`admin-kpi-card__change admin-kpi-card__change--${kpi.trending}`}>
                                {kpi.trending === "up" && <TrendingUp size={14} />}
                                {kpi.trending === "down" && <TrendingDown size={14} />}
                                {kpi.change}
                            </span>
                        </div>
                        <strong>{kpi.value}</strong>
                        <span>{kpi.label}</span>
                    </article>
                ))}
            </div>

            <div className="admin-chart-grid">
                <article className="admin-chart-card">
                    <h3>Weekly Revenue</h3>
                    <div className="admin-chart-card__chart">
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#7b5cff" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#7b5cff" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} />
                                <YAxis stroke="var(--muted)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--surface-strong)",
                                        border: "1px solid var(--line)",
                                        borderRadius: "12px",
                                    }}
                                    labelStyle={{ color: "var(--text)" }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#7b5cff"
                                    strokeWidth={2}
                                    fill="url(#revenueGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </article>

                <article className="admin-chart-card">
                    <h3>Orders by Hour</h3>
                    <div className="admin-chart-card__chart">
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={hourlyOrders}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                <XAxis dataKey="hour" stroke="var(--muted)" fontSize={12} />
                                <YAxis stroke="var(--muted)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--surface-strong)",
                                        border: "1px solid var(--line)",
                                        borderRadius: "12px",
                                    }}
                                    labelStyle={{ color: "var(--text)" }}
                                />
                                <Bar dataKey="orders" fill="#39b5c1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </article>
            </div>

            <div className="admin-chart-grid">
                <article className="admin-section-card">
                    <header className="admin-section-card__header">
                        <div>
                            <h3>Recent Orders</h3>
                            <p>Latest orders from all channels</p>
                        </div>
                    </header>
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Table/Type</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map(order => (
                                    <tr key={order.id}>
                                        <td>{order.id}</td>
                                        <td>{order.table}</td>
                                        <td>{order.items}</td>
                                        <td>${order.total.toFixed(2)}</td>
                                        <td>
                                            <span className={`admin-badge admin-badge--${order.status}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </article>

                <article className="admin-chart-card">
                    <h3>Sales by Category</h3>
                    <div className="admin-chart-card__chart admin-chart-card__chart--centered">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {categoryData.map(entry => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--surface-strong)",
                                        border: "1px solid var(--line)",
                                        borderRadius: "12px",
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="admin-legend">
                            {categoryData.map(item => (
                                <div key={item.name} className="admin-legend__item">
                                    <span
                                        className="admin-legend__dot"
                                        style={{ background: item.color }}
                                    />
                                    <span>{item.name}</span>
                                    <span className="admin-legend__value">{item.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </article>
            </div>
        </div>
    );
}
