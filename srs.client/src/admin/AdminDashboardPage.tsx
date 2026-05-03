import { useEffect, useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import {
    getAdminOrders,
    getAdminReservations,
    getAdminRestaurantOrders,
    getAdminRestaurantReservations,
    getAdminRestaurantStaff,
    getAdminRestaurantTables,
    getAdminRestaurants,
    getAdminStaff,
    getAdminTables,
    getAdminUsers,
    type AdminOrder,
    type AdminReservation,
    type AdminRestaurant,
    type AdminStaff,
    type AdminTable,
    type AdminUser
} from "@/lib/admin/adminService";
import { useAdminRestaurant } from "@/admin/context/adminRestaurantContextValue";
import { useUserContext } from "@/context/UserContext";

const chartColors = ["#7b5cff", "#39b5c1", "#49c49f", "#d97706", "#ff8ca5"];

export function AdminDashboardPage() {
    const { selectedRestaurantId } = useAdminRestaurant();
    const { profile } = useUserContext();
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [reservations, setReservations] = useState<AdminReservation[]>([]);
    const [staff, setStaff] = useState<AdminStaff[]>([]);
    const [allStaff, setAllStaff] = useState<AdminStaff[]>([]);
    const [tables, setTables] = useState<AdminTable[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const usersById = useMemo(() => new Map(users.map(user => [user.id, user])), [users]);
    const tablesById = useMemo(() => new Map(tables.map(table => [table.id, table])), [tables]);
    const restaurantsById = useMemo(
        () => new Map(restaurants.map(restaurant => [restaurant.id, restaurant])),
        [restaurants]
    );
    const scopedTables = useMemo(
        () => selectedRestaurantId === "all"
            ? tables
            : tables.filter(table => table.restaurantId === selectedRestaurantId),
        [selectedRestaurantId, tables]
    );
    const scopedTableIds = useMemo(
        () => new Set(scopedTables.map(table => table.id)),
        [scopedTables]
    );
    const scopedStaff = useMemo(
        () => selectedRestaurantId === "all"
            ? staff
            : staff.filter(member => member.restaurantId === selectedRestaurantId),
        [selectedRestaurantId, staff]
    );
    const scopedOrders = useMemo(
        () => selectedRestaurantId === "all"
            ? orders
            : orders.filter(order => scopedTableIds.has(order.tableId)),
        [orders, scopedTableIds, selectedRestaurantId]
    );
    const scopedReservations = useMemo(
        () => selectedRestaurantId === "all"
            ? reservations
            : reservations.filter(reservation => scopedTableIds.has(reservation.tableId)),
        [reservations, scopedTableIds, selectedRestaurantId]
    );

    const reservationStatusData = useMemo(() => {
        const counts = new Map<string, number>();
        scopedReservations.forEach(reservation => {
            counts.set(reservation.status, (counts.get(reservation.status) ?? 0) + 1);
        });
        return Array.from(counts, ([name, value]) => ({ name, value }));
    }, [scopedReservations]);

    const tableStatusData = useMemo(() => {
        const counts = new Map<string, number>();
        scopedTables.forEach(table => {
            counts.set(table.status, (counts.get(table.status) ?? 0) + 1);
        });
        return Array.from(counts, ([name, value]) => ({ name, value }));
    }, [scopedTables]);

    const staffPositionData = useMemo(() => {
        const counts = new Map<string, number>();
        scopedStaff.forEach(member => {
            counts.set(member.position, (counts.get(member.position) ?? 0) + 1);
        });
        return Array.from(counts, ([name, value]) => ({ name, value }));
    }, [scopedStaff]);

    const loadDashboard = async () => {
        const orderRequest = selectedRestaurantId === "all"
            ? getAdminOrders()
            : getAdminRestaurantOrders(selectedRestaurantId);
        const reservationRequest = selectedRestaurantId === "all"
            ? getAdminReservations()
            : getAdminRestaurantReservations(selectedRestaurantId);
        const staffRequest = selectedRestaurantId === "all"
            ? getAdminStaff()
            : getAdminRestaurantStaff(selectedRestaurantId);
        const tableRequest = selectedRestaurantId === "all"
            ? getAdminTables()
            : getAdminRestaurantTables(selectedRestaurantId);
        const [orderResult, reservationResult, staffResult, allStaffResult, tableResult, userResult, restaurantResult] =
            await Promise.all([
                orderRequest,
                reservationRequest,
                staffRequest,
                getAdminStaff(),
                tableRequest,
                getAdminUsers(),
                getAdminRestaurants()
            ]);

        setOrders(orderResult);
        setReservations(reservationResult);
        setStaff(staffResult);
        setAllStaff(allStaffResult);
        setTables(tableResult);
        setUsers(userResult);
        setRestaurants(restaurantResult);

    };

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                setIsLoading(true);
                setError(null);
                await loadDashboard();
            } catch (loadError) {
                if (isMounted) {
                    setError(loadError instanceof Error ? loadError.message : "Could not load admin dashboard.");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void load();

        return () => {
            isMounted = false;
        };
    }, [selectedRestaurantId]);

    const tableLabel = (tableId: number) => {
        const table = tablesById.get(tableId);
        return table ? `Table ${table.number}` : `Table #${tableId}`;
    };

    const staffUser = (userId: number) => usersById.get(userId);
    const showCurrentAdmin = profile?.role === "Admin" &&
        !allStaff.some(member => member.userId === profile.appUserId);

    if (isLoading) {
        return (
            <div className="admin-stack">
                <div className="admin-dashboard-grid">
                    <div className="skeleton-block admin-chart-skeleton" />
                    <div className="skeleton-block admin-chart-skeleton" />
                </div>
                <div className="skeleton-block admin-chart-skeleton" />
            </div>
        );
    }

    return (
        <div className="admin-stack">
            <header className="admin-page-header">
                <div>
                    <h1>Admin Dashboard</h1>
                    <p>Tables, charts, and restaurant details for admin operations.</p>
                </div>
            </header>

            {error && <div className="admin-alert admin-alert--warning">{error}</div>}

            <div className="admin-dashboard-grid">
                <article className="admin-section-card">
                    <header className="admin-section-card__header">
                        <div>
                            <h3>Reservations by Status</h3>
                            <p>Booking workflow distribution</p>
                        </div>
                    </header>
                    <div className="admin-chart-card__chart admin-chart-card__chart--centered">
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={reservationStatusData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82}>
                                    {reservationStatusData.map((entry, index) => (
                                        <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="admin-legend">
                        {reservationStatusData.map((item, index) => (
                            <div key={item.name} className="admin-legend__item">
                                <span className="admin-legend__dot" style={{ background: chartColors[index % chartColors.length] }} />
                                <span>{item.name}</span>
                                <span className="admin-legend__value">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </article>

                <article className="admin-section-card">
                    <header className="admin-section-card__header">
                        <div>
                            <h3>Tables by Status</h3>
                            <p>Current table setup</p>
                        </div>
                    </header>
                    <div className="admin-chart-card__chart">
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={tableStatusData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} />
                                <YAxis allowDecimals={false} stroke="var(--muted)" fontSize={12} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#39b5c1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </article>
            </div>

            <div className="admin-dashboard-grid">
                <article className="admin-section-card">
                    <header className="admin-section-card__header">
                        <div>
                            <h3>Orders</h3>
                            <p>Current order records</p>
                        </div>
                    </header>
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Table</th>
                                    <th>Status</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scopedOrders.map(order => (
                                    <tr key={order.id}>
                                        <td>#{order.id}</td>
                                        <td>{tableLabel(order.tableId)}</td>
                                        <td>
                                            <span className={`admin-badge admin-badge--${order.status.toLowerCase()}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td>${order.total.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {scopedOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="admin-empty-cell">No orders found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </article>

                <article className="admin-section-card">
                    <header className="admin-section-card__header">
                        <div>
                            <h3>Staff by Position</h3>
                            <p>Restaurant staffing shape</p>
                        </div>
                    </header>
                    <div className="admin-chart-card__chart">
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={staffPositionData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                <XAxis type="number" allowDecimals={false} stroke="var(--muted)" fontSize={12} />
                                <YAxis type="category" dataKey="name" stroke="var(--muted)" fontSize={12} width={90} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#7b5cff" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </article>
            </div>

            <div className="admin-dashboard-grid">
                <article className="admin-section-card">
                    <header className="admin-section-card__header">
                        <div>
                            <h3>Reservations</h3>
                            <p>Upcoming and active bookings</p>
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
                                {scopedReservations.map(reservation => (
                                    <tr key={reservation.id}>
                                        <td>{reservation.name}</td>
                                        <td>{reservation.reservationDate}</td>
                                        <td>{reservation.reservationTime}</td>
                                        <td>{tableLabel(reservation.tableId)}</td>
                                        <td>
                                            <span className={`admin-badge admin-badge--${reservation.status.toLowerCase()}`}>
                                                {reservation.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {scopedReservations.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="admin-empty-cell">No reservations found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </article>
            </div>

            <article className="admin-section-card">
                <header className="admin-section-card__header">
                    <div>
                        <h3>Staff List</h3>
                        <p>All staff assignments across restaurants</p>
                    </div>
                </header>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Staff ID</th>
                                <th>User</th>
                                <th>Restaurant</th>
                                <th>Position</th>
                            </tr>
                        </thead>
                        <tbody>
                            {showCurrentAdmin && (
                                <tr>
                                    <td>Admin</td>
                                    <td>{profile.email}</td>
                                    <td>All restaurants</td>
                                    <td><span className="admin-badge">Admin</span></td>
                                </tr>
                            )}
                            {allStaff.map(member => {
                                const user = staffUser(member.userId);
                                const restaurant = restaurantsById.get(member.restaurantId);

                                return (
                                    <tr key={member.id}>
                                        <td>#{member.id}</td>
                                        <td>{user?.email ?? `User #${member.userId}`}</td>
                                        <td>{restaurant?.name ?? `Restaurant #${member.restaurantId}`}</td>
                                        <td><span className="admin-badge">{member.position}</span></td>
                                    </tr>
                                );
                            })}
                            {allStaff.length === 0 && !showCurrentAdmin && (
                                <tr>
                                    <td colSpan={4} className="admin-empty-cell">No staff found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </article>
        </div>
    );
}
