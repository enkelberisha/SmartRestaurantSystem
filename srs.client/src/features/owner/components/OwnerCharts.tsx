import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import type { OwnerDashboardData } from "@/features/owner/types";
import { chartColors } from "@/features/owner/ownerUtils";

export function RevenueChart({ data }: { data: OwnerDashboardData }) {
    return (
        <article className="admin-section-card">
            <header className="admin-section-card__header">
                <div>
                    <h3>Revenue by Restaurant</h3>
                    <p>Booked revenue against projected close</p>
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
                        <Bar dataKey="forecast" fill="var(--accent)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </article>
    );
}

export function RevenuePaceChart({ data }: { data: OwnerDashboardData }) {
    return (
        <article className="admin-section-card owner-chart-card--compact">
            <header className="admin-section-card__header">
                <div>
                    <h3>Revenue Pace</h3>
                    <p>Recent revenue against prior period and prior-year pace</p>
                </div>
            </header>
            <div className="admin-chart-card__chart">
                <ResponsiveContainer width="100%" height={240}>
                    <ComposedChart data={data.revenueTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                        <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} />
                        <YAxis stroke="var(--muted)" fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="actual" fill="var(--primary)" radius={[7, 7, 0, 0]} />
                        <Line type="monotone" dataKey="forecast" stroke="var(--accent)" strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="priorYear" stroke="var(--muted)" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </article>
    );
}

export function ForecastBridgeChart({ data }: { data: OwnerDashboardData }) {
    return (
        <article className="admin-section-card owner-chart-card--compact">
            <header className="admin-section-card__header">
                <div>
                    <h3>Revenue and Inventory Bridge</h3>
                    <p>Cash, open checks, cancellations, and inventory exposure</p>
                </div>
            </header>
            <div className="admin-chart-card__chart">
                <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.forecastBridgeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                        <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} />
                        <YAxis stroke="var(--muted)" fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[7, 7, 0, 0]}>
                            {data.forecastBridgeData.map((entry, index) => (
                                <Cell
                                    key={entry.name}
                                    fill={entry.value !== null && entry.value < 0 ? "var(--danger, #c33f5d)" : chartColors[index % chartColors.length]}
                                />
                            ))}
                        </Bar>
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
