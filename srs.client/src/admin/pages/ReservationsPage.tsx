import { useState } from "react";
import { Plus, Search, Filter, Check, X, Calendar } from "lucide-react";
import { Button } from "@/components/Button";
import { Modal } from "@/admin/components/Modal";
import { useToast } from "@/admin/context/ToastContext";

type Reservation = {
    id: number;
    customerName: string;
    phone: string;
    email: string;
    date: string;
    time: string;
    partySize: number;
    tableNumber?: number;
    status: "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no-show";
    notes?: string;
};

const mockReservations: Reservation[] = [
    {
        id: 1,
        customerName: "John Smith",
        phone: "(555) 123-4567",
        email: "john.smith@email.com",
        date: "2024-01-15",
        time: "7:00 PM",
        partySize: 4,
        tableNumber: 3,
        status: "confirmed",
    },
    {
        id: 2,
        customerName: "Sarah Johnson",
        phone: "(555) 234-5678",
        email: "sarah.j@email.com",
        date: "2024-01-15",
        time: "7:30 PM",
        partySize: 2,
        status: "pending",
        notes: "Anniversary dinner",
    },
    {
        id: 3,
        customerName: "Michael Brown",
        phone: "(555) 345-6789",
        email: "m.brown@email.com",
        date: "2024-01-15",
        time: "8:00 PM",
        partySize: 6,
        tableNumber: 7,
        status: "confirmed",
    },
    {
        id: 4,
        customerName: "Emily Davis",
        phone: "(555) 456-7890",
        email: "emily.d@email.com",
        date: "2024-01-15",
        time: "8:30 PM",
        partySize: 4,
        tableNumber: 10,
        status: "seated",
    },
    {
        id: 5,
        customerName: "Robert Wilson",
        phone: "(555) 567-8901",
        email: "r.wilson@email.com",
        date: "2024-01-15",
        time: "6:00 PM",
        partySize: 3,
        status: "completed",
    },
];

export function ReservationsPage() {
    const { pushToast } = useToast();
    const [reservations, setReservations] = useState<Reservation[]>(mockReservations);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredReservations = reservations.filter(res => {
        const matchesStatus = filterStatus === "all" || res.status === filterStatus;
        const matchesSearch =
            res.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            res.phone.includes(searchQuery);
        return matchesStatus && matchesSearch;
    });

    const updateStatus = (id: number, newStatus: Reservation["status"]) => {
        setReservations(prev =>
            prev.map(res => (res.id === id ? { ...res, status: newStatus } : res))
        );
        pushToast("success", `Reservation status updated to ${newStatus}`);
        setSelectedReservation(null);
    };

    return (
        <div className="admin-stack">
            <header className="admin-page-header">
                <div>
                    <h1>Reservations</h1>
                    <p>Manage table reservations and bookings</p>
                </div>
                <Button onClick={() => setIsFormOpen(true)}>
                    <Plus size={18} />
                    New Reservation
                </Button>
            </header>

            <div className="admin-filters">
                <label className="admin-search admin-search--inline">
                    <Search size={16} />
                    <input
                        type="search"
                        placeholder="Search by name or phone..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </label>
                <div className="admin-filter-group">
                    <Calendar size={16} />
                    <input type="date" className="admin-input admin-input--date" defaultValue="2024-01-15" />
                </div>
                <div className="admin-filter-group">
                    <Filter size={16} />
                    <select
                        className="admin-select"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="seated">Seated</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no-show">No Show</option>
                    </select>
                </div>
            </div>

            <article className="admin-section-card">
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Contact</th>
                                <th>Date & Time</th>
                                <th>Party Size</th>
                                <th>Table</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReservations.map(res => (
                                <tr key={res.id}>
                                    <td>
                                        <strong>{res.customerName}</strong>
                                        {res.notes && (
                                            <span className="admin-table-note">{res.notes}</span>
                                        )}
                                    </td>
                                    <td>
                                        <div>{res.phone}</div>
                                        <small className="admin-muted">{res.email}</small>
                                    </td>
                                    <td>
                                        <div>{new Date(res.date).toLocaleDateString()}</div>
                                        <strong>{res.time}</strong>
                                    </td>
                                    <td>{res.partySize} guests</td>
                                    <td>{res.tableNumber ? `Table ${res.tableNumber}` : "—"}</td>
                                    <td>
                                        <span className={`admin-badge admin-badge--${res.status}`}>
                                            {res.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="admin-table-actions">
                                            {res.status === "pending" && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="icon-button icon-button--sm icon-button--success"
                                                        onClick={() => updateStatus(res.id, "confirmed")}
                                                        aria-label="Confirm"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="icon-button icon-button--sm icon-button--danger"
                                                        onClick={() => updateStatus(res.id, "cancelled")}
                                                        aria-label="Cancel"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </>
                                            )}
                                            {res.status === "confirmed" && (
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => setSelectedReservation(res)}
                                                >
                                                    Assign Table
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </article>

            <Modal
                title="Assign Table"
                open={!!selectedReservation}
                onClose={() => setSelectedReservation(null)}
            >
                {selectedReservation && (
                    <div className="admin-stack">
                        <p>
                            Assigning table for <strong>{selectedReservation.customerName}</strong>
                            {" "}({selectedReservation.partySize} guests)
                        </p>
                        <div className="admin-field">
                            <label>Select Table</label>
                            <select className="admin-select" defaultValue="">
                                <option value="" disabled>
                                    Choose a table...
                                </option>
                                <option value="3">Table 3 (4 seats)</option>
                                <option value="7">Table 7 (8 seats)</option>
                                <option value="9">Table 9 (4 seats)</option>
                                <option value="11">Table 11 (4 seats)</option>
                            </select>
                        </div>
                        <div className="admin-inline-actions">
                            <Button
                                onClick={() => {
                                    updateStatus(selectedReservation.id, "seated");
                                    pushToast("success", "Table assigned and guest seated");
                                }}
                            >
                                Assign & Seat
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setSelectedReservation(null)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                title="New Reservation"
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
            >
                <form
                    className="admin-form"
                    onSubmit={e => {
                        e.preventDefault();
                        pushToast("success", "Reservation created");
                        setIsFormOpen(false);
                    }}
                >
                    <div className="admin-form-row">
                        <div className="admin-field">
                            <label>Customer Name</label>
                            <input type="text" className="admin-input" required />
                        </div>
                        <div className="admin-field">
                            <label>Phone</label>
                            <input type="tel" className="admin-input" required />
                        </div>
                    </div>
                    <div className="admin-field">
                        <label>Email</label>
                        <input type="email" className="admin-input" />
                    </div>
                    <div className="admin-form-row">
                        <div className="admin-field">
                            <label>Date</label>
                            <input type="date" className="admin-input" required />
                        </div>
                        <div className="admin-field">
                            <label>Time</label>
                            <input type="time" className="admin-input" required />
                        </div>
                        <div className="admin-field">
                            <label>Party Size</label>
                            <input type="number" min="1" className="admin-input" required />
                        </div>
                    </div>
                    <div className="admin-field">
                        <label>Notes</label>
                        <textarea className="admin-textarea" rows={2} />
                    </div>
                    <div className="admin-inline-actions">
                        <Button type="submit">Create Reservation</Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsFormOpen(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
