import { Banknote, Boxes, CreditCard, ReceiptText, TrendingDown, TrendingUp } from "lucide-react";
import { OwnerInsight, OwnerKpiCard } from "@/features/owner/components/OwnerCommon";
import { ForecastBridgeChart, RevenueChart, RevenuePaceChart } from "@/features/owner/components/OwnerCharts";
import type { OwnerDashboardData } from "@/features/owner/types";
import { formatCurrency, formatNullableCurrency, formatNullablePercent } from "@/features/owner/ownerUtils";

export function FinanceTab({ data }: { data: OwnerDashboardData }) {
    const strongestRestaurant = [...data.portfolioRows].sort((first, second) => second.paidRevenue - first.paidRevenue)[0];
    const weakestRestaurant = [...data.portfolioRows].sort((first, second) => first.paidRevenue - second.paidRevenue)[0];

    return (
        <>
            <section className="owner-grid owner-grid--kpis">
                <OwnerKpiCard
                    icon={<Banknote size={19} />}
                    meta="booked"
                    title={formatCurrency(data.bookedRevenue)}
                    detail="Non-cancelled order value in scope"
                    positive
                />
                <OwnerKpiCard
                    icon={<CreditCard size={19} />}
                    meta={`${data.paymentCaptureRate}% captured`}
                    title={formatCurrency(data.paidRevenue)}
                    detail="Revenue collected from payments"
                />
                <OwnerKpiCard
                    icon={<ReceiptText size={19} />}
                    meta={`${data.activeOrders} open`}
                    title={formatCurrency(data.openOrderValue)}
                    detail="Open checks still in service"
                />
                <OwnerKpiCard
                    icon={<TrendingUp size={19} />}
                    meta={`${formatNullablePercent(data.paceToPriorYear)} PY`}
                    title={formatNullableCurrency(data.projectedMonthEndRevenue)}
                    detail={`Projected close versus ${formatNullableCurrency(data.priorYearRevenue)} prior-year pace`}
                />
            </section>

            <section className="owner-grid owner-grid--charts">
                <RevenuePaceChart data={data} />
                <ForecastBridgeChart data={data} />
            </section>

            <section className="owner-grid owner-grid--kpis owner-grid--finance-detail">
                <OwnerKpiCard
                    icon={<TrendingUp size={19} />}
                    meta="RevPAS"
                    title={formatCurrency(data.revenuePerAvailableSeat)}
                    detail="Paid revenue per available seat"
                />
                <OwnerKpiCard
                    icon={<ReceiptText size={19} />}
                    meta="RevPASH"
                    title={formatCurrency(data.revpash)}
                    detail="Paid revenue per available seat hour"
                />
                <OwnerKpiCard
                    icon={<CreditCard size={19} />}
                    meta={`${data.completionRate}% completed`}
                    title={`${data.completedOrders} closed`}
                    detail="Completed checks versus non-cancelled orders"
                />
                <OwnerKpiCard
                    icon={<TrendingDown size={19} />}
                    meta={`${data.cancelledOrders} cancelled`}
                    title={formatCurrency(data.cancelledRevenue)}
                    detail="Revenue lost to cancelled orders"
                />
            </section>

            <section className="owner-grid owner-grid--kpis owner-grid--finance-detail">
                <OwnerKpiCard
                    icon={<Boxes size={19} />}
                    meta={`${data.inventoryItemCount} items`}
                    title={formatCurrency(data.inventoryValue)}
                    detail="Latest counted inventory valuation"
                />
                <OwnerKpiCard
                    icon={<Boxes size={19} />}
                    meta={`${data.inventorySupplierCount} suppliers`}
                    title={`${data.lowStockItems} low stock`}
                    detail={`${data.outOfStockItems} items are already out of stock`}
                    positive={data.lowStockItems === 0 && data.outOfStockItems === 0}
                />
                <OwnerKpiCard
                    icon={<Banknote size={19} />}
                    meta="last 30 days"
                    title={formatCurrency(data.recentPurchaseOrderSpend)}
                    detail={`${data.recentPurchaseOrderCount} purchase orders raised`}
                />
                <OwnerKpiCard
                    icon={<CreditCard size={19} />}
                    meta={`${data.serviceCaptureRate}% seat capture`}
                    title={formatNullableCurrency(data.gapToForecast)}
                    detail={`Remaining runway to ${formatNullableCurrency(data.revenueForecast)} projected month-end revenue`}
                    positive={data.gapToForecast !== null && data.gapToForecast >= 0}
                />
            </section>

            <section className="owner-grid owner-grid--charts">
                <RevenueChart data={data} />
                <article className="admin-section-card">
                    <header className="admin-section-card__header">
                        <div>
                            <h3>Finance Brief</h3>
                            <p>Quick signals for owner decisions</p>
                        </div>
                    </header>
                    <div className="owner-priority-list">
                        <OwnerInsight
                            title="Best cash performer"
                            tone="success"
                            detail={strongestRestaurant ? `${strongestRestaurant.name} leads with ${formatCurrency(strongestRestaurant.paidRevenue)} collected.` : "No restaurant revenue yet."}
                        />
                        <OwnerInsight
                            title="Needs attention"
                            tone={weakestRestaurant && strongestRestaurant && weakestRestaurant.id !== strongestRestaurant.id ? "warning" : "neutral"}
                            detail={weakestRestaurant ? `${weakestRestaurant.name} has ${formatCurrency(weakestRestaurant.paidRevenue)} collected and ${weakestRestaurant.lowStockItems} low-stock items.` : "No restaurant revenue yet."}
                        />
                        <OwnerInsight
                            title="Cash discipline"
                            tone={data.openOrderValue > 0 ? "warning" : "success"}
                            detail={data.openOrderValue > 0 ? `${formatCurrency(data.openOrderValue)} is still sitting in open checks.` : "No open check value needs payment follow-up right now."}
                        />
                        <OwnerInsight
                            title="Inventory exposure"
                            tone={data.outOfStockItems > 0 || data.lowStockItems > 0 ? "warning" : "success"}
                            detail={data.outOfStockItems > 0 || data.lowStockItems > 0
                                ? `${data.lowStockItems} low-stock and ${data.outOfStockItems} out-of-stock items need replenishment attention.`
                                : "Inventory looks healthy across the latest counted stock."}
                        />
                    </div>
                </article>
            </section>

            <section className="admin-section-card">
                <header className="admin-section-card__header">
                    <div>
                        <h3>Revenue Ranking</h3>
                        <p>Compare restaurants by collected revenue and stock pressure</p>
                    </div>
                </header>
                <div className="owner-finance-ranking">
                    {[...data.portfolioRows]
                        .sort((first, second) => second.paidRevenue - first.paidRevenue)
                        .map((row, index) => (
                            <div key={row.id} className="owner-finance-ranking__row">
                                <span>#{index + 1}</span>
                                <strong>{row.name}</strong>
                                <small>{row.openOrders} open orders | {row.lowStockItems} low stock</small>
                                <b>{formatCurrency(row.paidRevenue)}</b>
                            </div>
                        ))}
                    {data.portfolioRows.length === 0 && <p className="admin-muted">No restaurants found.</p>}
                </div>
            </section>
        </>
    );
}
