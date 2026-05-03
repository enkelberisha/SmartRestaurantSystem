import { Banknote, CreditCard, ReceiptText, TrendingUp } from "lucide-react";
import { OwnerInsight, OwnerKpiCard } from "@/owner/components/OwnerCommon";
import { RevenueChart } from "@/owner/components/OwnerCharts";
import type { OwnerDashboardData } from "@/owner/types";
import { formatCurrency, inactiveOrderStatuses, normalizeStatus, percent } from "@/owner/ownerUtils";

export function FinanceTab({ data }: { data: OwnerDashboardData }) {
    const unpaidOrders = data.scopedOrders.filter(order => !inactiveOrderStatuses.has(normalizeStatus(order.status)));
    const unpaidValue = unpaidOrders.reduce((sum, order) => sum + order.total, 0);
    const paidRate = percent(data.completedOrders, data.scopedOrders.length);
    const revenuePerTable = data.scopedTables.length > 0 ? data.bookedRevenue / data.scopedTables.length : 0;
    const strongestRestaurant = [...data.portfolioRows].sort((first, second) => second.revenue - first.revenue)[0];
    const weakestRestaurant = [...data.portfolioRows].sort((first, second) => first.revenue - second.revenue)[0];

    return (
        <>
            <section className="owner-grid owner-grid--kpis">
                <OwnerKpiCard
                    icon={<Banknote size={19} />}
                    meta="gross"
                    title={formatCurrency(data.bookedRevenue)}
                    detail="Total order value in scope"
                    positive
                />
                <OwnerKpiCard
                    icon={<CreditCard size={19} />}
                    meta={`${paidRate}% paid`}
                    title={formatCurrency(data.paidRevenue)}
                    detail="Revenue from paid orders"
                />
                <OwnerKpiCard
                    icon={<ReceiptText size={19} />}
                    meta={`${unpaidOrders.length} open`}
                    title={formatCurrency(unpaidValue)}
                    detail="Value still not closed"
                />
                <OwnerKpiCard
                    icon={<TrendingUp size={19} />}
                    meta="per table"
                    title={formatCurrency(revenuePerTable)}
                    detail="Revenue divided by active tables"
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
                            title="Best performer"
                            tone="success"
                            detail={strongestRestaurant ? `${strongestRestaurant.name} leads with ${formatCurrency(strongestRestaurant.revenue)}.` : "No restaurant revenue yet."}
                        />
                        <OwnerInsight
                            title="Needs attention"
                            tone={weakestRestaurant && strongestRestaurant && weakestRestaurant.id !== strongestRestaurant.id ? "warning" : "neutral"}
                            detail={weakestRestaurant ? `${weakestRestaurant.name} is currently at ${formatCurrency(weakestRestaurant.revenue)}.` : "No restaurant revenue yet."}
                        />
                        <OwnerInsight
                            title="Cash discipline"
                            tone={unpaidOrders.length > 0 ? "warning" : "success"}
                            detail={unpaidOrders.length > 0 ? `${unpaidOrders.length} orders still need payment follow-up.` : "Every visible order is closed or inactive."}
                        />
                    </div>
                </article>
            </section>

            <section className="admin-section-card">
                <header className="admin-section-card__header">
                    <div>
                        <h3>Revenue Ranking</h3>
                        <p>Compare restaurants by current booked revenue</p>
                    </div>
                </header>
                <div className="owner-finance-ranking">
                    {[...data.portfolioRows]
                        .sort((first, second) => second.revenue - first.revenue)
                        .map((row, index) => (
                            <div key={row.id} className="owner-finance-ranking__row">
                                <span>#{index + 1}</span>
                                <strong>{row.name}</strong>
                                <small>{row.openOrders} open orders</small>
                                <b>{formatCurrency(row.revenue)}</b>
                            </div>
                        ))}
                    {data.portfolioRows.length === 0 && <p className="admin-muted">No restaurants found.</p>}
                </div>
            </section>
        </>
    );
}
