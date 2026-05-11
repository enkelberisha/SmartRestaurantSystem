import { OwnerInsight } from "@/features/owner/components/OwnerCommon";
import { ForecastBridgeChart, OrderStatusChart, RevenueChart, RevenuePaceChart } from "@/features/owner/components/OwnerCharts";
import type { OwnerDashboardData } from "@/features/owner/types";
import { formatCurrency, formatNullableCurrency, formatNullablePercent } from "@/features/owner/ownerUtils";

export function OverviewTab({ data }: { data: OwnerDashboardData }) {
    return (
        <>
            <section className="owner-revenue-strip" aria-label="Owner revenue">
                <article className="owner-revenue-card">
                    <span>Collected Revenue</span>
                    <strong>{formatCurrency(data.paidRevenue)}</strong>
                    <p>{data.completedOrders} completed orders | {formatCurrency(data.averageTicket)} average ticket</p>
                </article>
            </section>

            <section className="owner-grid owner-grid--kpis owner-grid--owner-reporting">
                <article className="owner-report-card">
                    <span>Occupancy</span>
                    <strong>{data.occupancyRate}%</strong>
                    <small>{data.occupiedTables + data.reservedTables} of {data.scopedTables.length} tables in use</small>
                </article>
                <article className="owner-report-card">
                    <span>ADR</span>
                    <strong>{formatCurrency(data.adr)}</strong>
                    <small>{formatCurrency(data.averageTicket)} average order ticket</small>
                </article>
                <article className="owner-report-card">
                    <span>Booked Revenue</span>
                    <strong>{formatCurrency(data.bookedRevenue)}</strong>
                    <small>{formatNullableCurrency(data.projectedMonthEndRevenue)} projected close</small>
                </article>
                <article className={data.paymentCaptureRate >= 85 ? "owner-report-card owner-report-card--good" : "owner-report-card owner-report-card--warn"}>
                    <span>Payment Capture</span>
                    <strong>{data.paymentCaptureRate}%</strong>
                    <small>{formatCurrency(data.openOrderValue)} still sitting in open checks</small>
                </article>
                <article className={data.gapToForecast !== null && data.gapToForecast >= 0 ? "owner-report-card owner-report-card--good" : "owner-report-card owner-report-card--warn"}>
                    <span>Projected Runway</span>
                    <strong>{formatNullableCurrency(data.gapToForecast)}</strong>
                    <small>Projected month-end revenue: {formatNullableCurrency(data.revenueForecast)}</small>
                </article>
                <article className={data.paceToPriorYear !== null && data.paceToPriorYear >= 100 ? "owner-report-card owner-report-card--good" : "owner-report-card owner-report-card--warn"}>
                    <span>Pace to Prior Year</span>
                    <strong>{formatNullablePercent(data.paceToPriorYear)}</strong>
                    <small>Prior-year baseline: {formatNullableCurrency(data.priorYearRevenue)}</small>
                </article>
                <article className={data.outOfStockItems === 0 ? "owner-report-card owner-report-card--good" : "owner-report-card owner-report-card--warn"}>
                    <span>Inventory Value</span>
                    <strong>{formatCurrency(data.inventoryValue)}</strong>
                    <small>{data.lowStockItems} low-stock items | {data.outOfStockItems} out of stock</small>
                </article>
            </section>

            <section className="owner-grid owner-grid--charts">
                <RevenuePaceChart data={data} />
                <ForecastBridgeChart data={data} />
            </section>

            <section className="owner-grid owner-grid--charts">
                <RevenueChart data={data} />
                <OrderStatusChart data={data} />
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
                    tone={data.openOrderValue > 0 ? "warning" : "success"}
                    detail={data.openOrderValue > 0
                        ? `${formatCurrency(data.openOrderValue)} remains open across active checks and should convert into collected revenue.`
                        : "No open check value is currently waiting to close."}
                />
                <OwnerInsight
                    title="Inventory Watch"
                    tone={data.outOfStockItems > 0 || data.lowStockItems > 0 ? "warning" : "success"}
                    detail={data.outOfStockItems > 0 || data.lowStockItems > 0
                        ? `${data.lowStockItems} low-stock items and ${data.outOfStockItems} stockouts show replenishment pressure in the latest count.`
                        : "Latest inventory snapshot shows healthy stock coverage."}
                />
            </section>
        </>
    );
}
