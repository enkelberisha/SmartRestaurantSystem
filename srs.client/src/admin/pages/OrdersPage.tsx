import { useState } from "react";
import { Plus, Filter, Search, MoreVertical, Eye, Check, X } from "lucide-react";
import { Button } from "@/components/Button";
import { Modal } from "@/admin/components/Modal";
import { useToast } from "@/admin/context/ToastContext";

type Order = {
    id: string;
    table: string;
    items: { name: string; quantity: number; price: number }[];
    total: number;
    status: "pending" | "preparing" | "ready" | "served" | "completed" | "cancelled";
    createdAt: string;
    customerNote?: string;
};

const mockOrders: Order[] = [
    {
        id: "#1024",
        table: "Table 5",
        items: [
            { name: "Grilled Salmon", quantity: 2, price: 28.00 },
            { name: "Caesar Salad", quantity: 1, price: 12.00 },
            { name: "Chocolate Cake", quantity: 1, price: 9.50 },
        ],
        total: 77.50,
        status: "preparing",
        createdAt: "2024-01-15T12:30:00",
        customerNote: "No nuts, allergic",
    },
    {
        id: "#1023",
        table: "Table 12",
        items: [
            { name: "Ribeye Steak", quantity: 1, price: 45.00 },
            { name: "Red Wine", quantity: 2, price: 24.00 },
        ],
        total: 69.00,
        status: "served",
        createdAt: "2024-01-15T12:15:00",
    },
    {
        id: "#1022",
        table: "Takeout",
        items: [
            { name: "Chicken Pasta", quantity: 3, price: 54.00 },
            { name: "Garlic Bread", quantity: 2, price: 12.00 },
            { name: "Tiramisu", quantity: 2, price: 16.00 },
        ],
        total: 82.00,
        status: "ready",
        createdAt: "2024-01-15T12:00:00",
    },
    {
        id: "#1021",
        table: "Table 3",
        items: [
            { name: "Margherita Pizza", quantity: 1, price: 16.00 },
            { name: "Soda", quantity: 2, price: 6.00 },
        ],
        total: 22.00,
        status: "pending",
        createdAt: "2024-01-15T11:45:00",
    },
    {
        id: "#1020",
        table: "Table 8",
        items: [
            { name: "Seafood Paella", quantity: 2, price: 72.00 },
            { name: "Sangria", quantity: 4, price: 40.00 },
        ],
        total: 112.00,
        status: "completed",
        createdAt: "2024-01-15T11:30:00",
    },
];

export function OrdersPage() {
    const { pushToast } = useToast();
    const [orders, setOrders] = useState<Order[]>(mockOrders);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredOrders = orders.filter(order => {
        const matchesStatus = filterStatus === "all" || order.status === filterStatus;
        const matchesSearch =
            order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.table.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const updateOrderStatus = (orderId: string, newStatus: Order["status"]) => {
        setOrders(prev =>
            prev.map(order =>
                order.id === orderId ? { ...order, status: newStatus } : order
            )
        );
        pushToast("success", `Order ${orderId} updated to ${newStatus}`);
        setSelectedOrder(null);
    };

    return (
        <div className="admin-stack">
            <header className="admin-page-header">
                <div>
                    <h1>Orders</h1>
                    <p>Manage and track all restaurant orders</p>
                </div>
                <Button>
                    <Plus size={18} />
                    New Order
                </Button>
            </header>

            <div className="admin-filters">
                <label className="admin-search admin-search--inline">
                    <Search size={16} />
                    <input
                        type="search"
                        placeholder="Search orders..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </label>
                <div className="admin-filter-group">
                    <Filter size={16} />
                    <select
                        className="admin-select"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="preparing">Preparing</option>
                        <option value="ready">Ready</option>
                        <option value="served">Served</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            <article className="admin-section-card">
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Table/Type</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Time</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(order => (
                                <tr key={order.id}>
                                    <td>
                                        <strong>{order.id}</strong>
                                    </td>
                                    <td>{order.table}</td>
                                    <td>{order.items.length} items</td>
                                    <td>${order.total.toFixed(2)}</td>
                                    <td>
                                        <span className={`admin-badge admin-badge--${order.status}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td>
                                        {new Date(order.createdAt).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </td>
                                    <td>
                                        <div className="admin-table-actions">
                                            <button
                                                type="button"
                                                className="icon-button icon-button--sm"
                                                onClick={() => setSelectedOrder(order)}
                                                aria-label="View order"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-button icon-button--sm"
                                                aria-label="More options"
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </article>

            <Modal
                title={`Order ${selectedOrder?.id ?? ""}`}
                open={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
            >
                {selectedOrder && (
                    <div className="admin-stack">
                        <div className="admin-order-meta">
                            <div>
                                <span className="admin-order-meta__label">Table</span>
                                <strong>{selectedOrder.table}</strong>
                            </div>
                            <div>
                                <span className="admin-order-meta__label">Status</span>
                                <span className={`admin-badge admin-badge--${selectedOrder.status}`}>
                                    {selectedOrder.status}
                                </span>
                            </div>
                            <div>
                                <span className="admin-order-meta__label">Time</span>
                                <strong>
                                    {new Date(selectedOrder.createdAt).toLocaleTimeString()}
                                </strong>
                            </div>
                        </div>

                        {selectedOrder.customerNote && (
                            <div className="admin-order-note">
                                <strong>Customer Note:</strong>
                                <p>{selectedOrder.customerNote}</p>
                            </div>
                        )}

                        <div className="admin-order-items">
                            <h4>Items</h4>
                            {selectedOrder.items.map((item, index) => (
                                <div key={index} className="admin-order-item">
                                    <span>
                                        {item.quantity}x {item.name}
                                    </span>
                                    <span>${item.price.toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="admin-order-item admin-order-item--total">
                                <strong>Total</strong>
                                <strong>${selectedOrder.total.toFixed(2)}</strong>
                            </div>
                        </div>

                        <div className="admin-inline-actions">
                            {selectedOrder.status === "pending" && (
                                <Button onClick={() => updateOrderStatus(selectedOrder.id, "preparing")}>
                                    Start Preparing
                                </Button>
                            )}
                            {selectedOrder.status === "preparing" && (
                                <Button onClick={() => updateOrderStatus(selectedOrder.id, "ready")}>
                                    <Check size={18} />
                                    Mark Ready
                                </Button>
                            )}
                            {selectedOrder.status === "ready" && (
                                <Button onClick={() => updateOrderStatus(selectedOrder.id, "served")}>
                                    Mark Served
                                </Button>
                            )}
                            {selectedOrder.status !== "completed" && selectedOrder.status !== "cancelled" && (
                                <Button
                                    variant="secondary"
                                    onClick={() => updateOrderStatus(selectedOrder.id, "cancelled")}
                                >
                                    <X size={18} />
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
