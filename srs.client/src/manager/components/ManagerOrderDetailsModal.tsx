import { ClipboardList, ShoppingBag, Timer, X } from "lucide-react";
import type { AdminMenuItem, AdminOrder, AdminPayment, AdminTable } from "@/lib/admin/adminService";
import type { ManagerOrderItem } from "@/manager/types";

type ManagerOrderDetailsModalProps = {
    order: AdminOrder;
    payments: AdminPayment[];
    orderItems: ManagerOrderItem[];
    table: AdminTable | null | undefined;
    menuItems: AdminMenuItem[];
    onClose: () => void;
};

function money(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
    }).format(value);
}

function orderStatusLabel(status: string) {
    return status === "InProgress"
        ? "Preparing"
        : status.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function orderDate(value: string) {
    return new Date(value).toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function buildOrderNumber(order: AdminOrder) {
    return `#${String(order.id).padStart(6, "0")}`;
}

export function ManagerOrderDetailsModal({
    menuItems,
    onClose,
    order,
    payments,
    orderItems,
    table
}: ManagerOrderDetailsModalProps) {
    const menuItemsById = new Map(menuItems.map(item => [item.id, item]));
    const orderPayments = payments.filter(payment => payment.orderId === order.id);
    const latestPayment = orderPayments.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null;

    return (
        <div className="manager-order-modal-backdrop" role="presentation" onClick={onClose}>
            <section className="manager-order-modal" role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}>
                <header className="manager-order-modal__header">
                    <div>
                        <h2>Order Details</h2>
                        <p>Order {buildOrderNumber(order)}</p>
                    </div>
                    <button type="button" className="icon-button" onClick={onClose} aria-label="Close order details">
                        <X size={18} />
                    </button>
                </header>

                <div className="manager-order-detail-section">
                    <h3><ClipboardList size={16} /> Order Info</h3>
                    <dl className="manager-order-details">
                        <div><dt>Order Date & Time</dt><dd>{orderDate(order.createdAt)}</dd></div>
                        <div><dt>Number of Items</dt><dd>{orderItems.reduce((sum, item) => sum + item.quantity, 0)}</dd></div>
                        <div><dt>Amount</dt><dd>{money(order.total)}</dd></div>
                        <div><dt>Table</dt><dd>{table ? `Table ${table.number}` : `Table #${order.tableId}`}</dd></div>
                        <div><dt>Status</dt><dd>{orderStatusLabel(order.status)}</dd></div>
                        <div><dt>Payment Method</dt><dd>{latestPayment ? latestPayment.method : "Unpaid"}</dd></div>
                        <div><dt>Payment Status</dt><dd>{latestPayment ? latestPayment.status : "Pending"}</dd></div>
                    </dl>
                </div>

                <div className="manager-order-detail-section">
                    <h3><ShoppingBag size={16} /> Order Items ({orderItems.length})</h3>
                    <div className="manager-order-items">
                        {orderItems.map(item => {
                            const menuItem = menuItemsById.get(item.menuItemId);

                            return (
                                <div key={item.id}>
                                    <span>{menuItem?.name ?? `Menu Item #${item.menuItemId}`}</span>
                                    <span>Qty x{item.quantity}</span>
                                    <span>{money(item.price)}</span>
                                    <strong>{money(item.quantity * item.price)}</strong>
                                </div>
                            );
                        })}
                    </div>
                    <div className="manager-order-total">
                        <span>Total</span>
                        <strong>{money(order.total)}</strong>
                    </div>
                </div>

                <div className="manager-order-detail-section">
                    <h3><Timer size={16} /> Operation History</h3>
                    <div className="manager-order-history">
                        <strong>Order Created</strong>
                        <span>{orderDate(order.createdAt)}</span>
                    </div>
                </div>
            </section>
        </div>
    );
}
