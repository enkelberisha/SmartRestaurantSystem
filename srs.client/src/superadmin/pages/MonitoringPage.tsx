import { SectionCard } from "@/superadmin/components/SectionCard";
import { SectionErrorBoundary } from "@/superadmin/components/SectionErrorBoundary";
import { SkeletonBlock } from "@/superadmin/components/SkeletonBlock";
import { useMonitoringQuery } from "@/superadmin/hooks/useSuperadminQueries";

export function MonitoringPage() {
    const { data, isLoading } = useMonitoringQuery();

    if (isLoading || !data) {
        return (
            <div className="sa-stack">
                <SkeletonBlock className="sa-chart-skeleton" />
                <SkeletonBlock className="sa-table-skeleton" />
            </div>
        );
    }

    return (
        <div className="sa-stack">
            <SectionErrorBoundary>
                <SectionCard
                    title="System-wide Monitoring"
                    subtitle="View every restaurant across tenants, monitor activity, and spot risky platform patterns."
                >
                    <div className="sa-kpi-grid">
                        <article className="sa-kpi-card">
                            <span>Restaurants</span>
                            <strong>{data.restaurants.length}</strong>
                        </article>
                        <article className="sa-kpi-card">
                            <span>Live Signals</span>
                            <strong>{data.signals.filter(signal => signal.level !== "low").length}</strong>
                        </article>
                        <article className="sa-kpi-card">
                            <span>Recent Activity Items</span>
                            <strong>{data.activity.length}</strong>
                        </article>
                    </div>
                </SectionCard>
            </SectionErrorBoundary>

            <SectionErrorBoundary>
                <SectionCard title="Risk Signals" subtitle="Simple checks to help detect abuse or misuse early.">
                    <div className="sa-activity-list">
                        {data.signals.map(signal => (
                            <article key={signal.id} className={`sa-activity sa-activity--${signal.level === "high" ? "warning" : signal.level === "medium" ? "info" : "success"}`}>
                                <strong>{signal.title}</strong>
                                <p>{signal.detail}</p>
                            </article>
                        ))}
                    </div>
                </SectionCard>
            </SectionErrorBoundary>

            <SectionErrorBoundary>
                <SectionCard title="Restaurants Across Tenants" subtitle="One list for platform-wide visibility.">
                    <div className="sa-table-wrap">
                        <table className="sa-table">
                            <thead>
                                <tr>
                                    <th>Restaurant</th>
                                    <th>Tenant</th>
                                    <th>Location</th>
                                    <th>Owner</th>
                                    <th>Manager</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.restaurants.map(restaurant => (
                                    <tr key={restaurant.id}>
                                        <td>{restaurant.name}</td>
                                        <td>{restaurant.tenantName}</td>
                                        <td>{restaurant.location}</td>
                                        <td>{restaurant.ownerId ?? "Unassigned"}</td>
                                        <td>{restaurant.managerId ?? "Unassigned"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            </SectionErrorBoundary>

            <SectionErrorBoundary>
                <SectionCard title="Platform Activity" subtitle="Recent cross-tenant activity snapshots.">
                    <div className="sa-activity-list">
                        {data.activity.map(item => (
                            <article key={item.id} className={`sa-activity sa-activity--${item.tone}`}>
                                <strong>{item.title}</strong>
                                <p>{item.detail}</p>
                            </article>
                        ))}
                    </div>
                </SectionCard>
            </SectionErrorBoundary>
        </div>
    );
}
