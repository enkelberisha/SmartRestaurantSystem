import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Bell,
    Building2,
    CalendarPlus,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    Clock,
    LayoutGrid,
    Menu,
    Phone,
    Plus,
    Search,
    Send,
    Table2,
    Trash2,
    UserCheck,
    UserPlus,
    Users,
    X
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ProfileModal } from "@/components/ProfileModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUserContext } from "@/context/useUserContext";
import { useTheme } from "@/hooks/useTheme";
import { getBrandLogo } from "@/lib/branding/brandLogo";
import type { TableStatus } from "@/lib/admin/adminService";
import {
    addToWaitlist,
    cancelHostReservation,
    createHostReservation,
    getHostReservations,
    getHostRestaurants,
    getHostTables,
    getHostWaiters,
    getStoredHostRestaurantId,
    getWaitlist,
    notifyWaiter,
    removeFromWaitlist,
    storeHostRestaurantId,
    updateHostReservation,
    updateHostTableStatus,
    type AdminReservation,
    type AdminRestaurant,
    type AdminTable,
    type HostReservationPayload,
    type HostWaiter,
    type WaitlistEntry
} from "@/host/services/hostService";

type HostView = "floorplan" | "waitlist";

const TABLE_STATUSES: TableStatus[] = ["Available", "Occupied", "Reserved", "OutOfService"];

const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
    Available: "Available",
    Occupied: "Occupied",
    Reserved: "Reserved",
    OutOfService: "Out of Service"
};

const STATUS_QUICK_ACTIONS: { status: TableStatus; label: string }[] = [
    { status: "Available", label: "Mark Available" },
    { status: "Occupied", label: "Mark Occupied" },
    { status: "Reserved", label: "Mark Reserved" },
    { status: "OutOfService", label: "Mark Out of Service" }
];

function todayDateString() {
    return new Date().toISOString().split("T")[0];
}

function formatReservationTime(time: string) {
    const [h, m] = time.split(":");
    const hour = Number(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
}

function formatWaitlistTime(iso: string) {
    const d = new Date(iso);
    const h = d.getHours() % 12 || 12;
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = d.getHours() >= 12 ? "PM" : "AM";
    return `${h}:${m} ${ampm}`;
}

function liveTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isUpcoming(reservation: AdminReservation) {
    return reservation.status === "Pending" || reservation.status === "Confirmed";
}


function getTableReservation(table: AdminTable, reservations: AdminReservation[]) {
    return reservations.find(r => r.tableId === table.id && isUpcoming(r)) ?? null;
}

function buildAvatarFromEmail(email: string) {
    return email
        .split("@")[0]
        .split(/[^a-zA-Z0-9]/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p: string) => p[0]?.toUpperCase() ?? "")
        .join("") || "HS";
}

type ReservationFormState = {
    tableId: number;
    name: string;
    phone: string;
    reservationDate: string;
    reservationTime: string;
};

const emptyReservationForm: ReservationFormState = {
    tableId: 0,
    name: "",
    phone: "",
    reservationDate: todayDateString(),
    reservationTime: "19:00"
};

type WaitlistFormState = {
    name: string;
    phone: string;
    partySize: number;
    notes: string;
};

const emptyWaitlistForm: WaitlistFormState = {
    name: "",
    phone: "",
    partySize: 2,
    notes: ""
};

export function HostPage() {
    const { profile, isLoading: profileLoading, logout } = useUserContext();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const brandLogo = getBrandLogo(theme);

    const [view, setView] = useState<HostView>("floorplan");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [upcomingOpen, setUpcomingOpen] = useState(true);
    const [seatedOpen, setSeatedOpen] = useState(true);

    const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(() => getStoredHostRestaurantId());
    const [tables, setTables] = useState<AdminTable[]>([]);
    const [reservations, setReservations] = useState<AdminReservation[]>([]);
    const [staff, setStaff] = useState<HostWaiter[]>([]);
    const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
    const [currentTime, setCurrentTime] = useState(liveTime());

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<TableStatus | "All">("All");

    const [selectedTable, setSelectedTable] = useState<AdminTable | null>(null);
    const [tableDetailOpen, setTableDetailOpen] = useState(false);

    const [reservationModalOpen, setReservationModalOpen] = useState(false);
    const [editingReservation, setEditingReservation] = useState<AdminReservation | null>(null);
    const [reservationForm, setReservationForm] = useState<ReservationFormState>(emptyReservationForm);

    const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
    const [waitlistForm, setWaitlistForm] = useState<WaitlistFormState>(emptyWaitlistForm);

    const [notifyModalOpen, setNotifyModalOpen] = useState(false);
    const [notifyStaffId, setNotifyStaffId] = useState<number | "">("");
    const [notifyMessage, setNotifyMessage] = useState("");

    const [seatWalkinOpen, setSeatWalkinOpen] = useState(false);
    const [seatWalkinName, setSeatWalkinName] = useState("");
    const [seatWalkinPhone, setSeatWalkinPhone] = useState("");

    const selectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId) ?? restaurants[0] ?? null;
    const canSwitchRestaurants = restaurants.length > 1;
    const avatar = profile ? buildAvatarFromEmail(profile.email) : "HS";
    const localPart = profile?.email.split("@")[0] ?? "host";

    const seatedReservations = useMemo(
        () => reservations.filter(r => {
            if (r.status === "Completed") return true;
            const table = tables.find(t => t.id === r.tableId);
            return isUpcoming(r) && table?.status === "Occupied";
        }),
        [reservations, tables]
    );

    const upcomingReservations = useMemo(
        () => reservations
            .filter(r => {
                if (!isUpcoming(r)) return false;
                const table = tables.find(t => t.id === r.tableId);
                return table?.status !== "Occupied";
            })
            .sort((a, b) => a.reservationTime.localeCompare(b.reservationTime)),
        [reservations, tables]
    );

    const filteredTables = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return tables
            .filter(t => statusFilter === "All" || t.status === statusFilter)
            .filter(t => {
                if (!q) return true;
                const reservation = getTableReservation(t, reservations);
                return (
                    `table ${t.number}`.includes(q) ||
                    String(t.number).includes(q) ||
                    (reservation?.name.toLowerCase().includes(q) ?? false)
                );
            })
            .sort((a, b) => a.number - b.number);
    }, [tables, reservations, statusFilter, searchQuery]);

    const tableCounts = useMemo(() => ({
        total: tables.length,
        available: tables.filter(t => t.status === "Available").length,
        occupied: tables.filter(t => t.status === "Occupied").length,
        reserved: tables.filter(t => t.status === "Reserved").length,
        outOfService: tables.filter(t => t.status === "OutOfService").length
    }), [tables]);

    const loadData = useCallback(async (restaurantId: number | null = selectedRestaurantId) => {
        if (!profile) {
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            setError(null);
            const allRestaurants = await getHostRestaurants();
            setRestaurants(allRestaurants);

            const targetId = restaurantId ?? allRestaurants[0]?.id ?? null;
            if (!targetId) {
                setIsLoading(false);
                return;
            }
            setSelectedRestaurantId(targetId);
            storeHostRestaurantId(targetId);

            const [tableData, reservationData, staffData] = await Promise.all([
                getHostTables(targetId),
                getHostReservations(targetId),
                getHostWaiters(targetId)
            ]);
            setTables(tableData);
            setReservations(reservationData);
            setStaff(staffData);
            setWaitlist(getWaitlist(targetId));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data.");
        } finally {
            setIsLoading(false);
        }
    }, [profile, selectedRestaurantId]);

    useEffect(() => {
        void loadData();
    }, [profile]);

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(liveTime()), 60_000);
        return () => clearInterval(interval);
    }, []);

    function flash(msg: string) {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 3000);
    }

    function openCreateReservation(table?: AdminTable) {
        setEditingReservation(null);
        setReservationForm({
            ...emptyReservationForm,
            tableId: table?.id ?? (tables.find(t => t.status === "Available")?.id ?? 0)
        });
        setReservationModalOpen(true);
    }

    function openEditReservation(reservation: AdminReservation) {
        setEditingReservation(reservation);
        setReservationForm({
            tableId: reservation.tableId,
            name: reservation.name,
            phone: reservation.phone ?? "",
            reservationDate: reservation.reservationDate,
            reservationTime: reservation.reservationTime.slice(0, 5)
        });
        setReservationModalOpen(true);
    }

    async function saveReservation() {
        const payload: HostReservationPayload = {
            tableId: reservationForm.tableId,
            name: reservationForm.name.trim(),
            phone: reservationForm.phone.trim() || null,
            reservationDate: reservationForm.reservationDate,
            reservationTime: `${reservationForm.reservationTime}:00`
        };
        try {
            setIsSaving(true);
            setError(null);
            if (editingReservation) {
                await updateHostReservation(editingReservation.id, payload);
                flash("Reservation updated.");
            } else {
                await createHostReservation(payload);
                flash("Reservation created.");
            }
            setReservationModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save reservation.");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleCancelReservation(reservation: AdminReservation) {
        if (!confirm(`Cancel reservation for ${reservation.name}?`)) return;
        try {
            setError(null);
            await cancelHostReservation(reservation.id);
            flash("Reservation cancelled.");
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to cancel reservation.");
        }
    }

    async function handleChangeTableStatus(table: AdminTable, status: TableStatus) {
        try {
            setIsSaving(true);
            setError(null);
            await updateHostTableStatus(table, status);
            flash(`Table ${table.number} marked as ${TABLE_STATUS_LABELS[status]}.`);
            setTableDetailOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update table.");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSeatWalkin(table: AdminTable) {
        const name = seatWalkinName.trim();
        if (!name) return;
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
        try {
            setIsSaving(true);
            setError(null);
            await createHostReservation({
                tableId: table.id,
                name,
                phone: seatWalkinPhone.trim() || null,
                reservationDate: today,
                reservationTime: time
            });
            await updateHostTableStatus(table, "Occupied");
            flash(`${name} seated at Table ${table.number}.`);
            setSeatWalkinOpen(false);
            setSeatWalkinName("");
            setSeatWalkinPhone("");
            setTableDetailOpen(false);
            await loadData();
            openNotifyWaiter(table);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to seat guest.");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSeatReservation(reservation: AdminReservation) {
        const table = tables.find(t => t.id === reservation.tableId);
        if (!table) return;
        try {
            setIsSaving(true);
            setError(null);
            await updateHostTableStatus(table, "Occupied");
            flash(`${reservation.name} seated at Table ${table.number}.`);
            await loadData();
            openNotifyWaiter(table);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to seat guest.");
        } finally {
            setIsSaving(false);
        }
    }

    function openNotifyWaiter(table: AdminTable) {
        setSelectedTable(table);
        setNotifyMessage(`Table ${table.number} is ready for service.`);
        setNotifyStaffId(staff[0]?.id ?? "");
        setNotifyModalOpen(true);
    }

    async function handleNotifyWaiter() {
        if (!notifyStaffId) return;
        try {
            setIsSaving(true);
            setError(null);

            const staffUser = staff.find(s => s.id === notifyStaffId);
            await notifyWaiter(Number(notifyStaffId), notifyMessage || `Table ${selectedTable?.number ?? "?"} is ready.`);
            flash(`Notified ${staffUser?.name ?? "waiter"}.`);
            setNotifyModalOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to send notification.");
        } finally {
            setIsSaving(false);
        }
    }

    function handleAddToWaitlist() {
        if (!selectedRestaurantId || !waitlistForm.name.trim()) return;
        addToWaitlist(selectedRestaurantId, {
            name: waitlistForm.name.trim(),
            phone: waitlistForm.phone.trim() || null,
            partySize: waitlistForm.partySize,
            notes: waitlistForm.notes.trim() || null
        });
        setWaitlist(getWaitlist(selectedRestaurantId));
        setWaitlistForm(emptyWaitlistForm);
        setWaitlistModalOpen(false);
        flash("Added to waitlist.");
    }

    function handleRemoveFromWaitlist(entryId: string) {
        if (!selectedRestaurantId) return;
        removeFromWaitlist(selectedRestaurantId, entryId);
        setWaitlist(getWaitlist(selectedRestaurantId));
    }

    function openTableDetail(table: AdminTable) {
        setSelectedTable(table);
        setTableDetailOpen(true);
    }

    if (profileLoading || isLoading) {
        return (
            <main className="sa-content host-shell--loading">
                <section className="manager-loading-card">
                    <div className="skeleton-block manager-loading-card__logo" />
                    <div className="skeleton-block manager-loading-card__line" />
                    <div className="skeleton-block manager-loading-card__body" />
                </section>
            </main>
        );
    }

    const selectedTableReservation = selectedTable ? getTableReservation(selectedTable, reservations) : null;

    return (
        <div className={`host-shell ${sidebarOpen ? "host-shell--sidebar-open" : ""}`}>
            {/* ── Left reservation panel ── */}
            <aside className="host-panel">
                <div className="host-panel__brand">
                    <Link to="/host">
                        <img src={brandLogo} className="host-panel__logo" alt="Smart Restaurant System" />
                    </Link>
                </div>

                <div className="host-panel__tabs">
                    <button
                        type="button"
                        className={`host-panel__tab ${view === "floorplan" ? "host-panel__tab--active" : ""}`}
                        onClick={() => setView("floorplan")}
                    >
                        <LayoutGrid size={15} />
                        Floor Plan
                    </button>
                    <button
                        type="button"
                        className={`host-panel__tab ${view === "waitlist" ? "host-panel__tab--active" : ""}`}
                        onClick={() => setView("waitlist")}
                    >
                        <ClipboardList size={15} />
                        Waitlist
                        {waitlist.length > 0 && (
                            <span className="host-badge host-badge--sm">{waitlist.length}</span>
                        )}
                    </button>
                </div>

                <div className="host-panel__search">
                    <Search size={14} />
                    <input
                        type="search"
                        placeholder="Search reservations..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Upcoming reservations */}
                <div className="host-section">
                    <button
                        type="button"
                        className="host-section__header"
                        onClick={() => setUpcomingOpen(v => !v)}
                    >
                        <span>Upcoming</span>
                        <div className="host-section__meta">
                            <span className="host-badge">{upcomingReservations.length}</span>
                            <ChevronRight
                                size={14}
                                className={`host-section__chevron ${upcomingOpen ? "host-section__chevron--open" : ""}`}
                            />
                        </div>
                    </button>
                    {upcomingOpen && (
                        <ul className="host-reservation-list">
                            {upcomingReservations.length === 0 && (
                                <li className="host-reservation-list__empty">No upcoming reservations</li>
                            )}
                            {upcomingReservations.map(r => {
                                const table = tables.find(t => t.id === r.tableId);
                                return (
                                    <li key={r.id} className="host-reservation-card">
                                        <div className="host-reservation-card__time">
                                            <Clock size={12} />
                                            {formatReservationTime(r.reservationTime)}
                                        </div>
                                        <div className="host-reservation-card__body">
                                            <strong>{r.name}</strong>
                                            {table && (
                                                <span className="host-reservation-card__table">
                                                    <Table2 size={12} /> Table {table.number}
                                                </span>
                                            )}
                                        </div>
                                        {r.phone && (
                                            <div className="host-reservation-card__phone">
                                                <Phone size={11} /> {r.phone}
                                            </div>
                                        )}
                                        <div className="host-reservation-card__actions">
                                            {table && table.status !== "Occupied" && (
                                                <button
                                                    type="button"
                                                    className="host-action-btn host-action-btn--seat"
                                                    disabled={isSaving}
                                                    onClick={() => void handleSeatReservation(r)}
                                                    title="Seat now"
                                                >
                                                    <UserCheck size={12} /> Seat
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="host-action-btn"
                                                onClick={() => openEditReservation(r)}
                                                title="Edit"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="host-action-btn host-action-btn--danger"
                                                onClick={() => void handleCancelReservation(r)}
                                                title="Cancel"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Seated reservations */}
                <div className="host-section">
                    <button
                        type="button"
                        className="host-section__header"
                        onClick={() => setSeatedOpen(v => !v)}
                    >
                        <span>Seated</span>
                        <div className="host-section__meta">
                            <span className="host-badge">{seatedReservations.length}</span>
                            <ChevronRight
                                size={14}
                                className={`host-section__chevron ${seatedOpen ? "host-section__chevron--open" : ""}`}
                            />
                        </div>
                    </button>
                    {seatedOpen && (
                        <ul className="host-reservation-list">
                            {seatedReservations.length === 0 && (
                                <li className="host-reservation-list__empty">No seated guests</li>
                            )}
                            {seatedReservations.map(r => {
                                const table = tables.find(t => t.id === r.tableId);
                                return (
                                    <li key={r.id} className="host-reservation-card host-reservation-card--seated">
                                        <div className="host-reservation-card__body">
                                            <strong>{r.name}</strong>
                                            {table && (
                                                <span className="host-reservation-card__table">
                                                    <Table2 size={12} /> Table {table.number}
                                                </span>
                                            )}
                                        </div>
                                        <span className="host-status-pill host-status-pill--occupied">Seated</span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="host-panel__bottom">
                    <button
                        type="button"
                        className="host-cta-btn"
                        onClick={() => openCreateReservation()}
                    >
                        <CalendarPlus size={15} />
                        New Reservation
                    </button>
                    <button
                        type="button"
                        className="host-cta-btn host-cta-btn--secondary"
                        onClick={() => {
                            setWaitlistForm(emptyWaitlistForm);
                            setWaitlistModalOpen(true);
                        }}
                    >
                        <UserPlus size={15} />
                        Add to Waitlist
                    </button>
                </div>
            </aside>

            {/* ── Main area ── */}
            <div className="host-main">
                {/* Topbar */}
                <header className="host-topbar">
                    <div className="host-topbar__left">
                        <button
                            type="button"
                            className="icon-button host-topbar__menu"
                            onClick={() => setSidebarOpen(v => !v)}
                            aria-label="Toggle panel"
                        >
                            <Menu size={18} />
                        </button>
                        <div className="host-view-tabs">
                            <button
                                type="button"
                                className={`host-view-tab ${view === "floorplan" ? "host-view-tab--active" : ""}`}
                                onClick={() => setView("floorplan")}
                            >
                                Floor Plan
                            </button>
                            <button
                                type="button"
                                className={`host-view-tab ${view === "waitlist" ? "host-view-tab--active" : ""}`}
                                onClick={() => setView("waitlist")}
                            >
                                Waitlist {waitlist.length > 0 && `(${waitlist.length})`}
                            </button>
                        </div>
                    </div>

                    <div className="host-topbar__right">
                        {canSwitchRestaurants ? (
                            <label className="admin-restaurant-switcher manager-restaurant-switcher">
                                <Building2 size={16} />
                                <span className="manager-restaurant-switcher__value">
                                    {selectedRestaurant?.name ?? "Choose restaurant"}
                                </span>
                                <select
                                    value={selectedRestaurantId ?? ""}
                                    onChange={e => void loadData(Number(e.target.value))}
                                    aria-label="Choose restaurant"
                                >
                                    {restaurants.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} />
                            </label>
                        ) : (
                            <span className="host-restaurant-name">
                                <Building2 size={15} />
                                {selectedRestaurant?.name ?? "Restaurant"}
                            </span>
                        )}

                        <div className="host-clock">
                            <Clock size={14} />
                            {currentTime}
                        </div>

                        <ThemeToggle theme={theme} onToggle={toggleTheme} />

                        <button
                            type="button"
                            className="icon-button"
                            aria-label="Refresh"
                            onClick={() => void loadData()}
                        >
                            <Bell size={18} />
                        </button>

                        <button type="button" className="sa-avatar" onClick={() => setProfileOpen(true)}>
                            <span>{avatar}</span>
                            <div className="sa-avatar__meta">
                                <strong>{localPart}</strong>
                                <small>Host</small>
                            </div>
                            <ChevronDown size={16} />
                        </button>
                    </div>
                </header>

                {/* Alerts */}
                {error && (
                    <div className="host-alert host-alert--error">
                        {error}
                        <button type="button" className="host-alert__close" onClick={() => setError(null)}>
                            <X size={14} />
                        </button>
                    </div>
                )}
                {successMsg && (
                    <div className="host-alert host-alert--success">
                        {successMsg}
                    </div>
                )}

                {/* Content */}
                <main className="host-content">
                    {view === "floorplan" && (
                        <div className="host-floor">
                            {/* Stats strip */}
                            <div className="host-stats">
                                <div className="host-stat">
                                    <span>Total</span>
                                    <strong>{tableCounts.total}</strong>
                                </div>
                                <div className="host-stat host-stat--available">
                                    <span>Available</span>
                                    <strong>{tableCounts.available}</strong>
                                </div>
                                <div className="host-stat host-stat--occupied">
                                    <span>Occupied</span>
                                    <strong>{tableCounts.occupied}</strong>
                                </div>
                                <div className="host-stat host-stat--reserved">
                                    <span>Reserved</span>
                                    <strong>{tableCounts.reserved}</strong>
                                </div>
                                <div className="host-stat host-stat--outofservice">
                                    <span>Out of Service</span>
                                    <strong>{tableCounts.outOfService}</strong>
                                </div>
                            </div>

                            {/* Filter toolbar */}
                            <div className="host-toolbar">
                                <div className="host-status-filters">
                                    {(["All", ...TABLE_STATUSES] as const).map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            className={`host-filter-btn ${statusFilter === s ? "host-filter-btn--active" : ""}`}
                                            onClick={() => setStatusFilter(s)}
                                        >
                                            {s === "All" ? "All Tables" : TABLE_STATUS_LABELS[s]}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="host-new-btn"
                                    onClick={() => openCreateReservation()}
                                >
                                    <Plus size={15} />
                                    New Reservation
                                </button>
                            </div>

                            {/* Table grid */}
                            <div className="host-table-grid">
                                {filteredTables.map(table => {
                                    const reservation = getTableReservation(table, reservations);
                                    return (
                                        <button
                                            key={table.id}
                                            type="button"
                                            className={`host-table-tile host-table-tile--${table.status.toLowerCase()}`}
                                            onClick={() => openTableDetail(table)}
                                        >
                                            <div className="host-table-tile__header">
                                                <span className="host-table-tile__number">T-{String(table.number).padStart(2, "0")}</span>
                                                <span className={`host-status-pill host-status-pill--${table.status.toLowerCase()}`}>
                                                    {TABLE_STATUS_LABELS[table.status]}
                                                </span>
                                            </div>
                                            <div className="host-table-tile__icon">
                                                <Table2 size={28} />
                                            </div>
                                            {reservation && (
                                                <div className="host-table-tile__guest">
                                                    <strong>{reservation.name}</strong>
                                                    <span>{formatReservationTime(reservation.reservationTime)}</span>
                                                </div>
                                            )}
                                            <div className="host-table-tile__capacity">
                                                <Users size={12} />
                                                {table.capacity} seats
                                            </div>
                                        </button>
                                    );
                                })}
                                {filteredTables.length === 0 && (
                                    <p className="host-empty">No tables match the current filter.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {view === "waitlist" && (
                        <div className="host-waitlist-view">
                            <div className="host-waitlist-header">
                                <div>
                                    <h2>Waitlist</h2>
                                    <p>{waitlist.length} {waitlist.length === 1 ? "party" : "parties"} waiting</p>
                                </div>
                                <button
                                    type="button"
                                    className="host-new-btn"
                                    onClick={() => {
                                        setWaitlistForm(emptyWaitlistForm);
                                        setWaitlistModalOpen(true);
                                    }}
                                >
                                    <UserPlus size={15} />
                                    Add Party
                                </button>
                            </div>

                            {waitlist.length === 0 ? (
                                <div className="host-empty-state">
                                    <ClipboardList size={40} />
                                    <p>No parties on the waitlist.</p>
                                </div>
                            ) : (
                                <ul className="host-waitlist-list">
                                    {waitlist.map((entry, index) => (
                                        <li key={entry.id} className="host-waitlist-card">
                                            <div className="host-waitlist-card__position">
                                                #{index + 1}
                                            </div>
                                            <div className="host-waitlist-card__info">
                                                <strong>{entry.name}</strong>
                                                <div className="host-waitlist-card__meta">
                                                    <span><Users size={12} /> Party of {entry.partySize}</span>
                                                    {entry.phone && <span><Phone size={12} /> {entry.phone}</span>}
                                                    <span><Clock size={12} /> Added {formatWaitlistTime(entry.addedAt)}</span>
                                                </div>
                                                {entry.notes && (
                                                    <p className="host-waitlist-card__notes">{entry.notes}</p>
                                                )}
                                            </div>
                                            <div className="host-waitlist-card__actions">
                                                <button
                                                    type="button"
                                                    className="host-new-btn host-new-btn--sm"
                                                    onClick={() => {
                                                        openCreateReservation();
                                                        setReservationForm(f => ({
                                                            ...f,
                                                            name: entry.name,
                                                            phone: entry.phone ?? ""
                                                        }));
                                                        handleRemoveFromWaitlist(entry.id);
                                                    }}
                                                    title="Seat this party"
                                                >
                                                    <UserCheck size={14} />
                                                    Seat
                                                </button>
                                                <button
                                                    type="button"
                                                    className="icon-button icon-button--sm icon-button--danger"
                                                    onClick={() => handleRemoveFromWaitlist(entry.id)}
                                                    title="Remove from waitlist"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* ── Table Detail Modal ── */}
            {tableDetailOpen && selectedTable && (
                <div className="host-modal-backdrop" onClick={() => { setTableDetailOpen(false); setSeatWalkinOpen(false); setSeatWalkinName(""); setSeatWalkinPhone(""); }}>
                    <div className="host-modal" onClick={e => e.stopPropagation()}>
                        <div className="host-modal__header">
                            <h3>Table {selectedTable.number}</h3>
                            <button type="button" className="icon-button" onClick={() => { setTableDetailOpen(false); setSeatWalkinOpen(false); setSeatWalkinName(""); setSeatWalkinPhone(""); }}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="host-modal__body">
                            <div className="host-detail-meta">
                                <div className="host-detail-row">
                                    <span>Status</span>
                                    <span className={`host-status-pill host-status-pill--${selectedTable.status.toLowerCase()}`}>
                                        {TABLE_STATUS_LABELS[selectedTable.status]}
                                    </span>
                                </div>
                                <div className="host-detail-row">
                                    <span>Capacity</span>
                                    <span><Users size={14} /> {selectedTable.capacity} seats</span>
                                </div>
                                {selectedTableReservation && (
                                    <>
                                        <div className="host-detail-row">
                                            <span>Guest</span>
                                            <strong>{selectedTableReservation.name}</strong>
                                        </div>
                                        <div className="host-detail-row">
                                            <span>Time</span>
                                            <span>{formatReservationTime(selectedTableReservation.reservationTime)}</span>
                                        </div>
                                        {selectedTableReservation.phone && (
                                            <div className="host-detail-row">
                                                <span>Phone</span>
                                                <span>{selectedTableReservation.phone}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="host-detail-actions">
                                {selectedTable.status === "Available" && !seatWalkinOpen && (
                                    <button
                                        type="button"
                                        className="host-new-btn"
                                        disabled={isSaving}
                                        onClick={() => setSeatWalkinOpen(true)}
                                    >
                                        <UserCheck size={15} />
                                        Seat Walk-in
                                    </button>
                                )}
                                {selectedTable.status === "Available" && seatWalkinOpen && (
                                    <div className="host-seat-form">
                                        <input
                                            className="host-seat-form__input"
                                            placeholder="Guest name *"
                                            value={seatWalkinName}
                                            onChange={e => setSeatWalkinName(e.target.value)}
                                            autoFocus
                                        />
                                        <input
                                            className="host-seat-form__input"
                                            placeholder="Phone (optional)"
                                            value={seatWalkinPhone}
                                            onChange={e => setSeatWalkinPhone(e.target.value)}
                                        />
                                        <div className="host-seat-form__actions">
                                            <button
                                                type="button"
                                                className="host-action-btn"
                                                onClick={() => { setSeatWalkinOpen(false); setSeatWalkinName(""); setSeatWalkinPhone(""); }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                className="host-new-btn"
                                                disabled={isSaving || !seatWalkinName.trim()}
                                                onClick={() => void handleSeatWalkin(selectedTable)}
                                            >
                                                <UserCheck size={15} />
                                                Seat Guest
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    className="host-new-btn host-new-btn--secondary"
                                    onClick={() => {
                                        setTableDetailOpen(false);
                                        openCreateReservation(selectedTable);
                                    }}
                                >
                                    <CalendarPlus size={15} />
                                    Add Reservation
                                </button>
                                <button
                                    type="button"
                                    className="host-new-btn host-new-btn--secondary"
                                    onClick={() => {
                                        setTableDetailOpen(false);
                                        openNotifyWaiter(selectedTable);
                                    }}
                                >
                                    <Send size={15} />
                                    Notify Waiter
                                </button>
                            </div>

                            <div className="host-detail-status-section">
                                <p className="host-detail-status-label">Change Status</p>
                                <div className="host-status-action-grid">
                                    {STATUS_QUICK_ACTIONS.filter(a => a.status !== selectedTable.status).map(a => (
                                        <button
                                            key={a.status}
                                            type="button"
                                            disabled={isSaving}
                                            className={`host-status-action host-status-action--${a.status.toLowerCase()}`}
                                            onClick={() => void handleChangeTableStatus(selectedTable, a.status)}
                                        >
                                            {a.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Reservation Modal ── */}
            {reservationModalOpen && (
                <div className="host-modal-backdrop" onClick={() => setReservationModalOpen(false)}>
                    <div className="host-modal" onClick={e => e.stopPropagation()}>
                        <div className="host-modal__header">
                            <h3>{editingReservation ? "Edit Reservation" : "New Reservation"}</h3>
                            <button type="button" className="icon-button" onClick={() => setReservationModalOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="host-modal__body">
                            <form
                                className="host-form"
                                onSubmit={e => {
                                    e.preventDefault();
                                    void saveReservation();
                                }}
                            >
                                <div className="host-field">
                                    <label htmlFor="res-name">Guest Name</label>
                                    <input
                                        id="res-name"
                                        type="text"
                                        className="admin-input"
                                        required
                                        value={reservationForm.name}
                                        onChange={e => setReservationForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="Full name"
                                    />
                                </div>
                                <div className="host-field">
                                    <label htmlFor="res-phone">Phone</label>
                                    <input
                                        id="res-phone"
                                        type="tel"
                                        className="admin-input"
                                        value={reservationForm.phone}
                                        onChange={e => setReservationForm(f => ({ ...f, phone: e.target.value }))}
                                        placeholder="Optional"
                                    />
                                </div>
                                <div className="host-field">
                                    <label htmlFor="res-table">Table</label>
                                    <select
                                        id="res-table"
                                        className="admin-select"
                                        required
                                        value={reservationForm.tableId}
                                        onChange={e => setReservationForm(f => ({ ...f, tableId: Number(e.target.value) }))}
                                    >
                                        <option value="">Select table</option>
                                        {tables.map(t => (
                                            <option key={t.id} value={t.id}>
                                                Table {t.number} ({t.capacity} seats) — {TABLE_STATUS_LABELS[t.status]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="host-field-row">
                                    <div className="host-field">
                                        <label htmlFor="res-date">Date</label>
                                        <input
                                            id="res-date"
                                            type="date"
                                            className="admin-input"
                                            required
                                            value={reservationForm.reservationDate}
                                            onChange={e => setReservationForm(f => ({ ...f, reservationDate: e.target.value }))}
                                        />
                                    </div>
                                    <div className="host-field">
                                        <label htmlFor="res-time">Time</label>
                                        <input
                                            id="res-time"
                                            type="time"
                                            className="admin-input"
                                            required
                                            value={reservationForm.reservationTime}
                                            onChange={e => setReservationForm(f => ({ ...f, reservationTime: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="host-form-actions">
                                    <button
                                        type="button"
                                        className="host-new-btn host-new-btn--secondary"
                                        onClick={() => setReservationModalOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="host-new-btn" disabled={isSaving}>
                                        {isSaving ? "Saving..." : editingReservation ? "Save Changes" : "Create Reservation"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Waitlist Add Modal ── */}
            {waitlistModalOpen && (
                <div className="host-modal-backdrop" onClick={() => setWaitlistModalOpen(false)}>
                    <div className="host-modal" onClick={e => e.stopPropagation()}>
                        <div className="host-modal__header">
                            <h3>Add to Waitlist</h3>
                            <button type="button" className="icon-button" onClick={() => setWaitlistModalOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="host-modal__body">
                            <form
                                className="host-form"
                                onSubmit={e => {
                                    e.preventDefault();
                                    handleAddToWaitlist();
                                }}
                            >
                                <div className="host-field">
                                    <label htmlFor="wl-name">Guest Name</label>
                                    <input
                                        id="wl-name"
                                        type="text"
                                        className="admin-input"
                                        required
                                        value={waitlistForm.name}
                                        onChange={e => setWaitlistForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="Full name"
                                    />
                                </div>
                                <div className="host-field">
                                    <label htmlFor="wl-phone">Phone</label>
                                    <input
                                        id="wl-phone"
                                        type="tel"
                                        className="admin-input"
                                        value={waitlistForm.phone}
                                        onChange={e => setWaitlistForm(f => ({ ...f, phone: e.target.value }))}
                                        placeholder="Optional"
                                    />
                                </div>
                                <div className="host-field">
                                    <label htmlFor="wl-size">Party Size</label>
                                    <input
                                        id="wl-size"
                                        type="number"
                                        className="admin-input"
                                        min={1}
                                        max={20}
                                        required
                                        value={waitlistForm.partySize}
                                        onChange={e => setWaitlistForm(f => ({ ...f, partySize: Number(e.target.value) }))}
                                    />
                                </div>
                                <div className="host-field">
                                    <label htmlFor="wl-notes">Notes</label>
                                    <textarea
                                        id="wl-notes"
                                        className="admin-input host-textarea"
                                        value={waitlistForm.notes}
                                        onChange={e => setWaitlistForm(f => ({ ...f, notes: e.target.value }))}
                                        placeholder="Allergies, preferences..."
                                        rows={3}
                                    />
                                </div>
                                <div className="host-form-actions">
                                    <button
                                        type="button"
                                        className="host-new-btn host-new-btn--secondary"
                                        onClick={() => setWaitlistModalOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="host-new-btn">
                                        Add to Waitlist
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Notify Waiter Modal ── */}
            {notifyModalOpen && (
                <div className="host-modal-backdrop" onClick={() => setNotifyModalOpen(false)}>
                    <div className="host-modal" onClick={e => e.stopPropagation()}>
                        <div className="host-modal__header">
                            <h3>Notify Waiter</h3>
                            <button type="button" className="icon-button" onClick={() => setNotifyModalOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="host-modal__body">
                            <div className="host-form">
                                <div className="host-field">
                                    <label htmlFor="notify-staff">Select Staff</label>
                                    <select
                                        id="notify-staff"
                                        className="admin-select"
                                        value={notifyStaffId}
                                        onChange={e => setNotifyStaffId(Number(e.target.value))}
                                    >
                                        <option value="">Choose staff member</option>
                                        {staff.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="host-field">
                                    <label htmlFor="notify-msg">Message</label>
                                    <textarea
                                        id="notify-msg"
                                        className="admin-input host-textarea"
                                        rows={3}
                                        value={notifyMessage}
                                        onChange={e => setNotifyMessage(e.target.value)}
                                    />
                                </div>
                                <div className="host-form-actions">
                                    <button
                                        type="button"
                                        className="host-new-btn host-new-btn--secondary"
                                        onClick={() => setNotifyModalOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="host-new-btn"
                                        disabled={!notifyStaffId || isSaving}
                                        onClick={() => void handleNotifyWaiter()}
                                    >
                                        <Send size={14} />
                                        {isSaving ? "Sending..." : "Send Notification"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Modal */}
            {profile && (
                <ProfileModal
                    open={profileOpen}
                    profile={profile}
                    primaryLabel={localPart}
                    title="Host Profile"
                    onClose={() => setProfileOpen(false)}
                    onLogout={async () => {
                        await logout();
                        navigate("/login", { replace: true });
                    }}
                />
            )}
        </div>
    );
}
