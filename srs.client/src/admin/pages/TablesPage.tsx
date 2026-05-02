import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/Button";
import { Modal } from "@/admin/components/Modal";
import { useToast } from "@/admin/context/ToastContext";

type Table = {
    id: number;
    number: number;
    capacity: number;
    status: "available" | "occupied" | "reserved" | "cleaning";
    currentOrder?: string;
    reservationTime?: string;
};

const mockTables: Table[] = [
    { id: 1, number: 1, capacity: 2, status: "available" },
    { id: 2, number: 2, capacity: 2, status: "occupied", currentOrder: "#1024" },
    { id: 3, number: 3, capacity: 4, status: "reserved", reservationTime: "7:00 PM" },
    { id: 4, number: 4, capacity: 4, status: "available" },
    { id: 5, number: 5, capacity: 6, status: "occupied", currentOrder: "#1023" },
    { id: 6, number: 6, capacity: 4, status: "cleaning" },
    { id: 7, number: 7, capacity: 8, status: "available" },
    { id: 8, number: 8, capacity: 2, status: "occupied", currentOrder: "#1021" },
    { id: 9, number: 9, capacity: 4, status: "available" },
    { id: 10, number: 10, capacity: 6, status: "reserved", reservationTime: "8:30 PM" },
    { id: 11, number: 11, capacity: 4, status: "available" },
    { id: 12, number: 12, capacity: 8, status: "occupied", currentOrder: "#1020" },
];

const statusColors: Record<Table["status"], string> = {
    available: "#49c49f",
    occupied: "#7b5cff",
    reserved: "#d97706",
    cleaning: "#a4abc0",
};

export function TablesPage() {
    const { pushToast } = useToast();
    const [tables, setTables] = useState<Table[]>(mockTables);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const stats = {
        total: tables.length,
        available: tables.filter(t => t.status === "available").length,
        occupied: tables.filter(t => t.status === "occupied").length,
        reserved: tables.filter(t => t.status === "reserved").length,
    };

    const updateTableStatus = (tableId: number, newStatus: Table["status"]) => {
        setTables(prev =>
            prev.map(table =>
                table.id === tableId
                    ? { ...table, status: newStatus, currentOrder: undefined, reservationTime: undefined }
                    : table
            )
        );
        pushToast("success", `Table ${tables.find(t => t.id === tableId)?.number} updated`);
        setSelectedTable(null);
    };

    return (
        <div className="admin-stack">
            <header className="admin-page-header">
                <div>
                    <h1>Tables</h1>
                    <p>Manage table assignments and availability</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus size={18} />
                    Add Table
                </Button>
            </header>

            <div className="admin-kpi-grid admin-kpi-grid--compact">
                <article className="admin-kpi-card admin-kpi-card--small">
                    <span>Total Tables</span>
                    <strong>{stats.total}</strong>
                </article>
                <article className="admin-kpi-card admin-kpi-card--small admin-kpi-card--success">
                    <span>Available</span>
                    <strong>{stats.available}</strong>
                </article>
                <article className="admin-kpi-card admin-kpi-card--small admin-kpi-card--primary">
                    <span>Occupied</span>
                    <strong>{stats.occupied}</strong>
                </article>
                <article className="admin-kpi-card admin-kpi-card--small admin-kpi-card--warning">
                    <span>Reserved</span>
                    <strong>{stats.reserved}</strong>
                </article>
            </div>

            <div className="admin-table-legend">
                {Object.entries(statusColors).map(([status, color]) => (
                    <div key={status} className="admin-table-legend__item">
                        <span
                            className="admin-table-legend__dot"
                            style={{ background: color }}
                        />
                        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    </div>
                ))}
            </div>

            <div className="admin-floor-plan">
                {tables.map(table => (
                    <button
                        key={table.id}
                        type="button"
                        className={`admin-table-tile admin-table-tile--${table.status}`}
                        onClick={() => setSelectedTable(table)}
                    >
                        <span className="admin-table-tile__number">T{table.number}</span>
                        <span className="admin-table-tile__capacity">
                            <Users size={14} />
                            {table.capacity}
                        </span>
                        {table.currentOrder && (
                            <span className="admin-table-tile__order">{table.currentOrder}</span>
                        )}
                        {table.reservationTime && (
                            <span className="admin-table-tile__reservation">
                                {table.reservationTime}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <Modal
                title={`Table ${selectedTable?.number ?? ""}`}
                open={!!selectedTable}
                onClose={() => setSelectedTable(null)}
            >
                {selectedTable && (
                    <div className="admin-stack">
                        <div className="admin-order-meta">
                            <div>
                                <span className="admin-order-meta__label">Capacity</span>
                                <strong>{selectedTable.capacity} seats</strong>
                            </div>
                            <div>
                                <span className="admin-order-meta__label">Status</span>
                                <span className={`admin-badge admin-badge--${selectedTable.status}`}>
                                    {selectedTable.status}
                                </span>
                            </div>
                        </div>

                        {selectedTable.currentOrder && (
                            <p>
                                <strong>Current Order:</strong> {selectedTable.currentOrder}
                            </p>
                        )}
                        {selectedTable.reservationTime && (
                            <p>
                                <strong>Reservation:</strong> {selectedTable.reservationTime}
                            </p>
                        )}

                        <h4>Update Status</h4>
                        <div className="admin-inline-actions">
                            <Button
                                variant={selectedTable.status === "available" ? "primary" : "secondary"}
                                onClick={() => updateTableStatus(selectedTable.id, "available")}
                            >
                                Available
                            </Button>
                            <Button
                                variant={selectedTable.status === "occupied" ? "primary" : "secondary"}
                                onClick={() => updateTableStatus(selectedTable.id, "occupied")}
                            >
                                Occupied
                            </Button>
                            <Button
                                variant={selectedTable.status === "reserved" ? "primary" : "secondary"}
                                onClick={() => updateTableStatus(selectedTable.id, "reserved")}
                            >
                                Reserved
                            </Button>
                            <Button
                                variant={selectedTable.status === "cleaning" ? "primary" : "secondary"}
                                onClick={() => updateTableStatus(selectedTable.id, "cleaning")}
                            >
                                Cleaning
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                title="Add New Table"
                open={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            >
                <form
                    className="admin-form"
                    onSubmit={e => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const newTable: Table = {
                            id: tables.length + 1,
                            number: Number(formData.get("number")),
                            capacity: Number(formData.get("capacity")),
                            status: "available",
                        };
                        setTables(prev => [...prev, newTable]);
                        pushToast("success", `Table ${newTable.number} added`);
                        setIsAddModalOpen(false);
                    }}
                >
                    <div className="admin-form-row">
                        <div className="admin-field">
                            <label>Table Number</label>
                            <input
                                type="number"
                                name="number"
                                className="admin-input"
                                required
                            />
                        </div>
                        <div className="admin-field">
                            <label>Capacity</label>
                            <input
                                type="number"
                                name="capacity"
                                className="admin-input"
                                required
                            />
                        </div>
                    </div>
                    <div className="admin-inline-actions">
                        <Button type="submit">Add Table</Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsAddModalOpen(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
