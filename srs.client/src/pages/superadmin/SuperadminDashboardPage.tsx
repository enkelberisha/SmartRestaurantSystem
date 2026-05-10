import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/Button";
import { SectionCard } from "@/features/superadmin/components/SectionCard";
import { SectionErrorBoundary } from "@/features/superadmin/components/SectionErrorBoundary";
import { SkeletonBlock } from "@/features/superadmin/components/SkeletonBlock";
import { useDashboardQuery } from "@/features/superadmin/hooks/useSuperadminQueries";
import { useNavigate } from "react-router-dom";

export function SuperadminDashboardPage() {
    const navigate = useNavigate();
    const { data, isLoading } = useDashboardQuery();

    if (isLoading || !data) {
        return (
            <div className="sa-stack">
                <div className="sa-kpi-grid">
                    {Array.from({ length: 4 }, (_, index) => (
                        <SkeletonBlock key={index} className="sa-kpi-skeleton" />
                    ))}
                </div>
                <SkeletonBlock className="sa-chart-skeleton" />
            </div>
        );
    }

    return (
        <div className="sa-stack">
            <div className="sa-kpi-grid">
                <article className="sa-kpi-card">
                    <span>Total Users</span>
                    <strong>{data.totalUsers}</strong>
                </article>
                <article className="sa-kpi-card">
                    <span>Active Tenants</span>
                    <strong>{data.activeTenants}</strong>
                </article>
                <article className="sa-kpi-card">
                    <span>Pending Moderation</span>
                    <strong>{data.pendingModeration}</strong>
                    <small>Flagged items waiting for a superadmin decision.</small>
                </article>
            </div>

            <SectionErrorBoundary>
                <SectionCard
                    title="Quick Actions"
                    subtitle="Fast entry points for common platform work"
                    actions={
                        <div className="sa-inline-actions">
                            <Button onClick={() => navigate("/superadmin/tenants")}>Add Tenant</Button>
                            <Button variant="secondary" onClick={() => navigate("/superadmin/monitoring")}>
                                Open Monitoring
                            </Button>
                        </div>
                    }
                >
                    <div className="sa-chart-grid">
                        <div className="sa-chart-card">
                            <h3>User Growth</h3>
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={data.userGrowth}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                    <XAxis dataKey="label" stroke="var(--muted)" />
                                    <YAxis stroke="var(--muted)" />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="sa-chart-card">
                            <h3>Tenant Load</h3>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={data.restaurantsByTenant}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                    <XAxis dataKey="label" stroke="var(--muted)" />
                                    <YAxis stroke="var(--muted)" />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="var(--accent)" radius={[12, 12, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                            <p className="modal-copy">Restaurant/user load by tenant so you can spot uneven platform activity.</p>
                        </div>
                    </div>
                </SectionCard>
            </SectionErrorBoundary>

            <SectionErrorBoundary>
                <SectionCard title="Recent Activity" subtitle="Latest actions across the platform">
                    <div className="sa-activity-list">
                        {data.recentActivity.map(item => (
                            <article key={item.id} className={`sa-activity sa-activity--${item.tone}`}>
                                <strong>{item.title}</strong>
                                <p>{item.detail}</p>
                                <small>{new Date(item.timestamp).toLocaleString()}</small>
                            </article>
                        ))}
                    </div>
                </SectionCard>
            </SectionErrorBoundary>
        </div>
    );
}
