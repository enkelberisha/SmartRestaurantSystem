import { ClipboardList, Table2, Wrench, X } from "lucide-react";
import { Button } from "@/components/Button";
import type { AdminOrder, AdminTable, TableStatus } from "@/lib/admin/adminService";

type ManagerTableDetailsModalProps = {
    table: AdminTable;
    orders: AdminOrder[];
    itemCount: number;
    total: number;
    isSaving: boolean;
    onChangeStatus: (table: AdminTable, status: TableStatus) => void;
    onClose: () => void;
    onOpenOrderStatus: (status: string) => void;
};

const tableStatusLabels: Record<string, string> = {
    Available: "Available",
    Occupied: "Occupied",
    Reserved: "Reserved",
    OutOfService: "Out of Service"
};

function money(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
    }).format(value);
}

function orderDate(value: string) {
    return new Date(value).toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function tableSizeLabel(capacity: number) {
    if (capacity <= 4) {
        return "Small";
    }

    if (capacity <= 6) {
        return "Medium";
    }

    return "Large";
}

function orderStatusLabel(status: string) {
    return status === "InProgress"
        ? "Preparing"
        : status.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function ManagerTableDetailsModal({
    isSaving,
    itemCount,
    onChangeStatus,
    onClose,
    onOpenOrderStatus,
    orders,
    table,
    total
}: ManagerTableDetailsModalProps) {
    return (
        <div className="manager-order-modal-backdrop" role="presentation" onClick={onClose}>
            <section className="manager-order-modal" role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}>
                <header className="manager-order-modal__header">
                    <div>
                        <h2>Table {table.number}</h2>
                        <p>{tableSizeLabel(table.capacity)} table with {table.capacity} seats</p>
                    </div>
                    <button type="button" className="icon-button" onClick={onClose} aria-label="Close table details">
                        <X size={18} />
                    </button>
                </header>

                <div className="manager-order-detail-section">
                    <h3><Table2 size={16} /> Table Info</h3>
                    <dl className="manager-order-details">
                        <div><dt>Status</dt><dd>{tableStatusLabels[table.status]}</dd></div>
                        <div><dt>Capacity</dt><dd>{table.capacity} seats</dd></div>
                        <div><dt>Orders</dt><dd>{orders.length}</dd></div>
                        <div><dt>Items Ordered</dt><dd>{itemCount}</dd></div>
                        <div><dt>Table Revenue</dt><dd>{money(total)}</dd></div>
                    </dl>
                </div>

                <div className="manager-order-detail-section">
                    <h3><Wrench size={16} /> Operational Status</h3>
                    <div className="manager-table-status-actions">
                        {(["Available", "Occupied", "Reserved", "OutOfService"] as TableStatus[]).map(status => (
                            <Button
                                key={status}
                                variant={table.status === status ? "primary" : "secondary"}
                                disabled={isSaving || table.status === status}
                                onClick={() => onChangeStatus(table, status)}
                            >
                                {tableStatusLabels[status]}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="manager-order-detail-section">
                    <h3><ClipboardList size={16} /> Recent Orders</h3>
                    <div className="manager-table-orders">
                        {orders.slice(0, 6).map(order => (
                            <button
                                key={order.id}
                                type="button"
                                onClick={() => onOpenOrderStatus(order.status)}
                            >
                                <span>#{String(order.id).padStart(6, "0")}</span>
                                <span>{orderStatusLabel(order.status)}</span>
                                <span>{orderDate(order.createdAt)}</span>
                                <strong>{money(order.total)}</strong>
                            </button>
                        ))}
                        {orders.length === 0 && <p className="manager-empty">No orders for this table yet.</p>}
                    </div>
                </div>
            </section>
        </div>
    );
}
