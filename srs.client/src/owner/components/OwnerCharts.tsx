import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import type { OwnerDashboardData } from "@/owner/types";
import { chartColors } from "@/owner/ownerUtils";

export function RevenueChart({ data }: { data: OwnerDashboardData }) {
    return (
        <article className="admin-section-card">
            <header className="admin-section-card__header">
                <div>
                    <h3>Revenue by Restaurant</h3>
                    <p>Portfolio income and active order load</p>
                </div>
            </header>
            <div className="admin-chart-card__chart">
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.revenueByRestaurant}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                        <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} />
                        <YAxis stroke="var(--muted)" fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="active" fill="var(--accent)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </article>
    );
}

export function OrderStatusChart({ data }: { data: OwnerDashboardData }) {
    return (
        <article className="admin-section-card">
            <header className="admin-section-card__header">
                <div>
                    <h3>Order Status</h3>
                    <p>Kitchen, POS, and payment movement</p>
                </div>
            </header>
            <div className="admin-chart-card__chart admin-chart-card__chart--centered">
                <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                        <Pie data={data.orderStatusData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84}>
                            {data.orderStatusData.map((entry, index) => (
                                <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="admin-legend">
                {data.orderStatusData.map((item, index) => (
                    <div key={item.name} className="admin-legend__item">
                        <span className="admin-legend__dot" style={{ background: chartColors[index % chartColors.length] }} />
                        <span>{item.name}</span>
                        <span className="admin-legend__value">{item.value}</span>
                    </div>
                ))}
                {data.orderStatusData.length === 0 && <p className="admin-muted">No orders yet.</p>}
            </div>
        </article>
    );
}
