import { OwnerInsight } from "@/owner/components/OwnerCommon";
import { OrderStatusChart, RevenueChart } from "@/owner/components/OwnerCharts";
import type { OwnerDashboardData } from "@/owner/types";
import { formatCurrency, inactiveOrderStatuses, normalizeStatus } from "@/owner/ownerUtils";

export function OverviewTab({ data }: { data: OwnerDashboardData }) {
    const openChecks = data.scopedOrders.filter(order => !inactiveOrderStatuses.has(normalizeStatus(order.status)));
    const shouldWatchService = data.activeOrders > 0 || data.occupancyRate >= 70;
    const shouldReviewStaff = data.scopedStaff.length === 0 || data.occupancyRate >= 70;

    return (
        <>
            <section className="owner-revenue-strip" aria-label="Revenue today">
                <article className="owner-revenue-card">
                    <span>Revenue Today</span>
                    <strong>{formatCurrency(data.paidRevenue)}</strong>
                    <p>{data.completedOrders} paid orders · {formatCurrency(data.averageTicket)} average ticket</p>
                </article>
            </section>

            <section className="owner-grid owner-grid--charts">
                <RevenueChart data={data} />
                <OrderStatusChart data={data} />
            </section>

            <section className="admin-section-card">
                <header className="admin-section-card__header">
                    <div>
                        <h3>Today's Focus</h3>
                        <p>Practical checks based on the current restaurant state</p>
                    </div>
                </header>
                <div className="owner-focus-grid">
                    <article className="owner-focus-item">
                        <span>Cash</span>
                        <strong>{openChecks.length > 0 ? "Close open checks" : "Payments are clean"}</strong>
                        <p>{openChecks.length > 0 ? `${openChecks.length} orders still need payment follow-up.` : "No unpaid checks in the current scope."}</p>
                    </article>
                    <article className="owner-focus-item">
                        <span>Service</span>
                        <strong>{shouldWatchService ? "Watch the floor" : "Floor is calm"}</strong>
                        <p>{shouldWatchService ? `${data.activeOrders} active orders and ${data.occupancyRate}% table usage.` : "No service pressure showing right now."}</p>
                    </article>
                    <article className="owner-focus-item">
                        <span>Staff</span>
                        <strong>{shouldReviewStaff ? "Review coverage" : "Coverage looks stable"}</strong>
                        <p>{shouldReviewStaff ? `${data.scopedStaff.length} staff assigned for ${data.scopedTables.length} tables.` : "Staffing is reasonable for the current table load."}</p>
                    </article>
                </div>
            </section>

            <section className="owner-grid owner-grid--insights">
                <OwnerInsight
                    title="Owner Snapshot"
                    tone="success"
                    detail={`${data.restaurants.length} restaurants, ${data.activeOrders} active orders, and ${data.upcomingReservations.length} visible reservations in scope.`}
                />
                <OwnerInsight
                    title="Service Pressure"
                    tone={data.occupancyRate > 75 ? "warning" : "neutral"}
                    detail={`${data.occupancyRate}% of tables are occupied or reserved. Keep hosts and waiters aligned during peak service.`}
                />
                <OwnerInsight
                    title="Payment Hygiene"
                    tone="neutral"
                    detail={`${data.scopedOrders.filter(order => !inactiveOrderStatuses.has(normalizeStatus(order.status))).length} checks still need closing or follow-up.`}
                />
            </section>
        </>
    );
}
