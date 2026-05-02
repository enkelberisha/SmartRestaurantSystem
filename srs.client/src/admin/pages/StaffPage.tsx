import { useState } from "react";
import { Plus, Search, Edit2, Trash2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/Button";
import { Modal } from "@/admin/components/Modal";
import { useToast } from "@/admin/context/ToastContext";

type Staff = {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: "manager" | "chef" | "waiter" | "bartender" | "host";
    status: "active" | "on-break" | "off-duty";
    shift: string;
    avatar?: string;
};

const mockStaff: Staff[] = [
    {
        id: 1,
        name: "Maria Garcia",
        email: "maria.g@restaurant.com",
        phone: "(555) 111-2222",
        role: "manager",
        status: "active",
        shift: "9:00 AM - 5:00 PM",
    },
    {
        id: 2,
        name: "James Chen",
        email: "j.chen@restaurant.com",
        phone: "(555) 222-3333",
        role: "chef",
        status: "active",
        shift: "10:00 AM - 8:00 PM",
    },
    {
        id: 3,
        name: "Emma Wilson",
        email: "emma.w@restaurant.com",
        phone: "(555) 333-4444",
        role: "waiter",
        status: "active",
        shift: "11:00 AM - 7:00 PM",
    },
    {
        id: 4,
        name: "David Martinez",
        email: "d.martinez@restaurant.com",
        phone: "(555) 444-5555",
        role: "bartender",
        status: "on-break",
        shift: "4:00 PM - 12:00 AM",
    },
    {
        id: 5,
        name: "Sophie Anderson",
        email: "s.anderson@restaurant.com",
        phone: "(555) 555-6666",
        role: "host",
        status: "active",
        shift: "5:00 PM - 11:00 PM",
    },
    {
        id: 6,
        name: "Michael Lee",
        email: "m.lee@restaurant.com",
        phone: "(555) 666-7777",
        role: "waiter",
        status: "off-duty",
        shift: "—",
    },
];

const roles = ["All", "manager", "chef", "waiter", "bartender", "host"];

export function StaffPage() {
    const { pushToast } = useToast();
    const [staff, setStaff] = useState<Staff[]>(mockStaff);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [filterRole, setFilterRole] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredStaff = staff.filter(s => {
        const matchesRole = filterRole === "All" || s.role === filterRole;
        const matchesSearch =
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.email.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesRole && matchesSearch;
    });

    const deleteStaff = (id: number) => {
        const member = staff.find(s => s.id === id);
        setStaff(prev => prev.filter(s => s.id !== id));
        pushToast("success", `${member?.name} has been removed`);
    };

    return (
        <div className="admin-stack">
            <header className="admin-page-header">
                <div>
                    <h1>Staff</h1>
                    <p>Manage your restaurant staff and schedules</p>
                </div>
                <Button onClick={() => setIsFormOpen(true)}>
                    <Plus size={18} />
                    Add Staff
                </Button>
            </header>

            <div className="admin-filters">
                <label className="admin-search admin-search--inline">
                    <Search size={16} />
                    <input
                        type="search"
                        placeholder="Search staff..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </label>
                <select
                    className="admin-select"
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value)}
                >
                    {roles.map(role => (
                        <option key={role} value={role}>
                            {role === "All" ? "All Roles" : role.charAt(0).toUpperCase() + role.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            <div className="admin-staff-grid">
                {filteredStaff.map(member => (
                    <article key={member.id} className="admin-staff-card">
                        <div className="admin-staff-card__avatar">
                            {member.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div className="admin-staff-card__content">
                            <h3>{member.name}</h3>
                            <span className={`admin-badge admin-badge--${member.role}`}>
                                {member.role}
                            </span>
                            <span className={`admin-badge admin-badge--${member.status}`}>
                                {member.status.replace("-", " ")}
                            </span>
                        </div>
                        <div className="admin-staff-card__details">
                            <div className="admin-staff-card__detail">
                                <Mail size={14} />
                                <span>{member.email}</span>
                            </div>
                            <div className="admin-staff-card__detail">
                                <Phone size={14} />
                                <span>{member.phone}</span>
                            </div>
                            <div className="admin-staff-card__shift">
                                <strong>Shift:</strong> {member.shift}
                            </div>
                        </div>
                        <div className="admin-staff-card__actions">
                            <button
                                type="button"
                                className="icon-button icon-button--sm"
                                onClick={() => setSelectedStaff(member)}
                                aria-label="Edit staff"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                type="button"
                                className="icon-button icon-button--sm icon-button--danger"
                                onClick={() => deleteStaff(member.id)}
                                aria-label="Delete staff"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </article>
                ))}
            </div>

            <Modal
                title={selectedStaff ? "Edit Staff Member" : "Add Staff Member"}
                open={isFormOpen || !!selectedStaff}
                onClose={() => {
                    setIsFormOpen(false);
                    setSelectedStaff(null);
                }}
            >
                <form
                    className="admin-form"
                    onSubmit={e => {
                        e.preventDefault();
                        pushToast("success", selectedStaff ? "Staff updated" : "Staff added");
                        setIsFormOpen(false);
                        setSelectedStaff(null);
                    }}
                >
                    <div className="admin-field">
                        <label>Full Name</label>
                        <input
                            type="text"
                            className="admin-input"
                            defaultValue={selectedStaff?.name ?? ""}
                            required
                        />
                    </div>
                    <div className="admin-form-row">
                        <div className="admin-field">
                            <label>Email</label>
                            <input
                                type="email"
                                className="admin-input"
                                defaultValue={selectedStaff?.email ?? ""}
                                required
                            />
                        </div>
                        <div className="admin-field">
                            <label>Phone</label>
                            <input
                                type="tel"
                                className="admin-input"
                                defaultValue={selectedStaff?.phone ?? ""}
                                required
                            />
                        </div>
                    </div>
                    <div className="admin-form-row">
                        <div className="admin-field">
                            <label>Role</label>
                            <select
                                className="admin-select"
                                defaultValue={selectedStaff?.role ?? "waiter"}
                            >
                                <option value="manager">Manager</option>
                                <option value="chef">Chef</option>
                                <option value="waiter">Waiter</option>
                                <option value="bartender">Bartender</option>
                                <option value="host">Host</option>
                            </select>
                        </div>
                        <div className="admin-field">
                            <label>Status</label>
                            <select
                                className="admin-select"
                                defaultValue={selectedStaff?.status ?? "active"}
                            >
                                <option value="active">Active</option>
                                <option value="on-break">On Break</option>
                                <option value="off-duty">Off Duty</option>
                            </select>
                        </div>
                    </div>
                    <div className="admin-inline-actions">
                        <Button type="submit">
                            {selectedStaff ? "Save Changes" : "Add Staff"}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setIsFormOpen(false);
                                setSelectedStaff(null);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
