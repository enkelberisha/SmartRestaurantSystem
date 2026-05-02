import { useState } from "react";
import { Download, Calendar, TrendingUp, DollarSign, Users, ShoppingBag } from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
} from "recharts";
import { Button } from "@/components/Button";
import { useToast } from "@/admin/context/ToastContext";

const monthlyRevenue = [
    { month: "Jan", revenue: 42500, orders: 1250, customers: 890 },
    { month: "Feb", revenue: 38200, orders: 1100, customers: 780 },
    { month: "Mar", revenue: 51800, orders: 1480, customers: 1020 },
    { month: "Apr", revenue: 48500, orders: 1350, customers: 950 },
    { month: "May", revenue: 55200, orders: 1580, customers: 1100 },
    { month: "Jun", revenue: 62400, orders: 1720, customers: 1250 },
];

const topItems = [
    { name: "Grilled Salmon", orders: 245, revenue: 6860 },
    { name: "Ribeye Steak", orders: 198, revenue: 8910 },
    { name: "Caesar Salad", orders: 312, revenue: 3744 },
    { name: "Chocolate Lava Cake", orders: 189, revenue: 1795 },
    { name: "Margherita Pizza", orders: 267, revenue: 4272 },
];

const peakHours = [
    { hour: "11 AM", orders: 45 },
    { hour: "12 PM", orders: 120 },
    { hour: "1 PM", orders: 135 },
    { hour: "2 PM", orders: 85 },
    { hour: "3 PM", orders: 42 },
    { hour: "4 PM", orders: 38 },
    { hour: "5 PM", orders: 65 },
    { hour: "6 PM", orders: 145 },
    { hour: "7 PM", orders: 185 },
    { hour: "8 PM", orders: 168 },
    { hour: "9 PM", orders: 125 },
    { hour: "10 PM", orders: 72 },
];

export function ReportsPage() {
    const { pushToast } = useToast();
    const [dateRange, setDateRange] = useState("this-month");

    const kpis = [
        {
            label: "Total Revenue",
            value: "$298,600",
            change: "+18.5%",
            icon: DollarSign,
        },
        {
            label: "Total Orders",
            value: "8,480",
            change: "+12.3%",
            icon: ShoppingBag,
        },
        {
            label: "Unique Customers",
            value: "5,990",
            change: "+22.1%",
            icon: Users,
        },
        {
            label: "Avg Order Value",
            value: "$35.20",
            change: "+5.8%",
            icon: TrendingUp,
        },
    ];

    const exportReport = (type: string) => {
        pushToast("success", `${type} report exported`);
    };

    return (
        <div className="admin-stack">
            <header className="admin-page-header">
                <div>
                    <h1>Reports</h1>
                    <p>Analytics and performance insights</p>
                </div>
                <div className="admin-inline-actions">
                    <div className="admin-filter-group">
                        <Calendar size={16} />
                        <select
                            className="admin-select"
                            value={dateRange}
                            onChange={e => setDateRange(e.target.value)}
                        >
                            <option value="today">Today</option>
                            <option value="this-week">This Week</option>
                            <option value="this-month">This Month</option>
                            <option value="this-year">This Year</option>
                        </select>
                    </div>
                    <Button variant="secondary" onClick={() => exportReport("PDF")}>
                        <Download size={18} />
                        Export PDF
                    </Button>
                </div>
            </header>

            <div className="admin-kpi-grid">
                {kpis.map(kpi => (
                    <article key={kpi.label} className="admin-kpi-card">
                        <div className="admin-kpi-card__header">
                            <span className="admin-kpi-card__icon">
                                <kpi.icon size={20} />
                            </span>
                            <span className="admin-kpi-card__change admin-kpi-card__change--up">
                                <TrendingUp size={14} />
                                {kpi.change}
                            </span>
                        </div>
                        <strong>{kpi.value}</strong>
                        <span>{kpi.label}</span>
                    </article>
                ))}
            </div>

            <div className="admin-chart-grid">
                <article className="admin-chart-card admin-chart-card--wide">
                    <h3>Revenue Trend</h3>
                    <div className="admin-chart-card__chart">
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={monthlyRevenue}>
                                <defs>
                                    <linearGradient id="revenueGradient2" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#7b5cff" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#7b5cff" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                <XAxis dataKey="month" stroke="var(--muted)" fontSize={12} />
                                <YAxis stroke="var(--muted)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--surface-strong)",
                                        border: "1px solid var(--line)",
                                        borderRadius: "12px",
                                    }}
                                    labelStyle={{ color: "var(--text)" }}
                                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#7b5cff"
                                    strokeWidth={2}
                                    fill="url(#revenueGradient2)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </article>
            </div>

            <div className="admin-chart-grid">
                <article className="admin-section-card">
                    <header className="admin-section-card__header">
                        <div>
                            <h3>Top Selling Items</h3>
                            <p>Best performing menu items this period</p>
                        </div>
                    </header>
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Item</th>
                                    <th>Orders</th>
                                    <th>Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topItems.map((item, index) => (
                                    <tr key={item.name}>
                                        <td>
                                            <span className="admin-rank">#{index + 1}</span>
                                        </td>
                                        <td>
                                            <strong>{item.name}</strong>
                                        </td>
                                        <td>{item.orders}</td>
                                        <td>${item.revenue.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </article>

                <article className="admin-chart-card">
                    <h3>Peak Hours</h3>
                    <div className="admin-chart-card__chart">
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={peakHours}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                <XAxis dataKey="hour" stroke="var(--muted)" fontSize={11} />
                                <YAxis stroke="var(--muted)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--surface-strong)",
                                        border: "1px solid var(--line)",
                                        borderRadius: "12px",
                                    }}
                                    labelStyle={{ color: "var(--text)" }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="orders"
                                    stroke="#39b5c1"
                                    strokeWidth={2}
                                    dot={{ fill: "#39b5c1", r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </article>
            </div>
        </div>
    );
}
