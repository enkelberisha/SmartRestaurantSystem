import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Line, LineChart, BarChart, Bar } from "recharts";
import { Button } from "@/components/Button";
import { SectionCard } from "@/features/superadmin/components/SectionCard";
import { SkeletonBlock } from "@/features/superadmin/components/SkeletonBlock";
import { useToast } from "@/features/superadmin/context/useToast";
import { useAnalyticsQuery, useExportAnalyticsMutation } from "@/features/superadmin/hooks/useSuperadminQueries";
import { useState } from "react";

const pieColors = ["#5b31ff", "#1e9ea9", "#f59e0b", "#ef4444"];

export function AnalyticsPage() {
    const [rangeLabel, setRangeLabel] = useState("Last 30 Days");
    const { data, isLoading } = useAnalyticsQuery(rangeLabel);
    const exportMutation = useExportAnalyticsMutation();
    const { pushToast } = useToast();

    return (
        <div className="sa-stack">
            <SectionCard
                title="Analytics & Stats"
                subtitle="Track growth, usage, and product engagement"
                actions={
                    <div className="sa-inline-actions">
                        {["Last 7 Days", "Last 30 Days", "Last 90 Days"].map(label => (
                            <Button
                                key={label}
                                variant={rangeLabel === label ? "primary" : "secondary"}
                                onClick={() => setRangeLabel(label)}
                            >
                                {label}
                            </Button>
                        ))}
                        <Button
                            onClick={async () => {
                                await exportMutation.mutateAsync(undefined);
                                pushToast("success", "CSV export completed.");
                            }}
                        >
                            Export CSV
                        </Button>
                    </div>
                }
            >
                {isLoading || !data ? (
                    <SkeletonBlock className="sa-chart-skeleton" />
                ) : (
                    <div className="sa-stack">
                        <div className="sa-kpi-grid">
                            <article className="sa-kpi-card">
                                <span>Total Users</span>
                                <strong>{data.totalUsers}</strong>
                            </article>
                            <article className="sa-kpi-card">
                                <span>Active Users</span>
                                <strong>{data.activeUsers}</strong>
                            </article>
                            <article className="sa-kpi-card">
                                <span>Restaurants</span>
                                <strong>{data.totalRestaurants}</strong>
                            </article>
                            <article className="sa-kpi-card">
                                <span>Pending Requests</span>
                                <strong>{data.pendingRequests}</strong>
                            </article>
                        </div>
                        <div className="sa-chart-grid">
                        <div className="sa-chart-card">
                            <h3>New User Signups</h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={data.signupSeries}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                    <XAxis dataKey="label" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line dataKey="value" stroke="var(--primary)" strokeWidth={3} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="sa-chart-card">
                            <h3>Users by Tenant (Active / Pending)</h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={data.activeUsersSeries}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                    <XAxis dataKey="label" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" name="Active" fill="var(--accent)" />
                                    <Bar dataKey="secondaryValue" name="Pending" fill="var(--primary-soft)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="sa-chart-card">
                            <h3>Tenant Growth</h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={data.tenantGrowthSeries}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                    <XAxis dataKey="label" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line dataKey="value" stroke="var(--success)" strokeWidth={3} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="sa-chart-card">
                            <h3>User Role Breakdown</h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie data={data.featureUsage} dataKey="value" nameKey="label" outerRadius={86}>
                                        {data.featureUsage.map((entry, index) => (
                                            <Cell key={entry.label} fill={pieColors[index % pieColors.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    </div>
                )}
            </SectionCard>
        </div>
    );
}
