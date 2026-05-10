import { useMemo, useState } from "react";
import { CreditCard, Table2, Utensils } from "lucide-react";
import { OwnerPriority } from "@/features/owner/components/OwnerCommon";
import { OrderStatusChart } from "@/features/owner/components/OwnerCharts";
import type { OwnerDashboardData } from "@/features/owner/types";
import { formatCurrency, inactiveOrderStatuses, normalizeStatus } from "@/features/owner/ownerUtils";

export function OperationsTab({ data }: { data: OwnerDashboardData }) {
    const [statusFilter, setStatusFilter] = useState("all");
    const orderStatuses = useMemo(
        () => Array.from(new Set(data.scopedOrders.map(order => order.status))),
        [data.scopedOrders]
    );
    const visibleOrders = useMemo(
        () => statusFilter === "all"
            ? data.recentOrders
            : data.scopedOrders.filter(order => order.status === statusFilter).slice(-8).reverse(),
        [data.recentOrders, data.scopedOrders, statusFilter]
    );

    return (
        <>
            <section className="owner-grid owner-grid--operations">
                <article className="admin-section-card owner-flow-card">
                    <header className="admin-section-card__header">
                        <div>
                            <h3>Operational Priorities</h3>
                            <p>What needs owner attention right now</p>
                        </div>
                    </header>
                    <div className="owner-priority-list">
                        <OwnerPriority icon={<Utensils size={18} />} title={`${data.activeOrders} active orders`} detail="Monitor kitchen and POS speed before service quality drops." />
                        <OwnerPriority icon={<Table2 size={18} />} title={`${data.availableTables} tables available`} detail="Hosts can seat new guests without creating table conflicts." />
                        <OwnerPriority
                            icon={<CreditCard size={18} />}
                            title={`${data.scopedOrders.filter(order => !inactiveOrderStatuses.has(normalizeStatus(order.status))).length} bills not closed`}
                            detail="Waiters should close POS payments before shift end."
                        />
                    </div>
                </article>

                <RecentOrdersTable data={data} orderStatuses={orderStatuses} statusFilter={statusFilter} visibleOrders={visibleOrders} onStatusFilterChange={setStatusFilter} />
            </section>

            <section className="owner-grid owner-grid--operations">
                <ReservationsTable data={data} />
                <OrderStatusChart data={data} />
            </section>
        </>
    );
}

function RecentOrdersTable({
    data,
    onStatusFilterChange,
    orderStatuses,
    statusFilter,
    visibleOrders
}: {
    data: OwnerDashboardData;
    onStatusFilterChange: (status: string) => void;
    orderStatuses: string[];
    statusFilter: string;
    visibleOrders: OwnerDashboardData["scopedOrders"];
}) {
    return (
        <article className="admin-section-card">
            <header className="admin-section-card__header">
                <div>
                    <h3>Orders</h3>
                    <p>Latest table activity by POS or tablet</p>
                </div>
                <select className="admin-select owner-status-filter" value={statusFilter} onChange={event => onStatusFilterChange(event.target.value)}>
                    <option value="all">All statuses</option>
                    {orderStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </header>
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Order</th>
                            <th>Table</th>
                            <th>Status</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleOrders.map(order => (
                            <tr key={order.id}>
                                <td>#{order.id}</td>
                                <td>{data.tableLabel(order.tableId)}</td>
                                <td><span className={`admin-badge admin-badge--${normalizeStatus(order.status)}`}>{order.status}</span></td>
                                <td>{formatCurrency(order.total)}</td>
                            </tr>
                        ))}
                        {visibleOrders.length === 0 && (
                            <tr>
                                <td colSpan={4} className="admin-empty-cell">No orders found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </article>
    );
}

function ReservationsTable({ data }: { data: OwnerDashboardData }) {
    return (
        <article className="admin-section-card">
            <header className="admin-section-card__header">
                <div>
                    <h3>Reservations</h3>
                    <p>Host flow and table planning</p>
                </div>
            </header>
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Guest</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Table</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.upcomingReservations.map(reservation => (
                            <tr key={reservation.id}>
                                <td>{reservation.name}</td>
                                <td>{reservation.reservationDate}</td>
                                <td>{reservation.reservationTime}</td>
                                <td>{data.tableLabel(reservation.tableId)}</td>
                                <td><span className={`admin-badge admin-badge--${normalizeStatus(reservation.status)}`}>{reservation.status}</span></td>
                            </tr>
                        ))}
                        {data.upcomingReservations.length === 0 && (
                            <tr>
                                <td colSpan={5} className="admin-empty-cell">No reservations found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </article>
    );
}
