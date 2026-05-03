import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
    createAdminRestaurant,
    createAdminStaff,
    createAdminTable,
    deleteAdminRestaurant,
    deleteAdminStaff,
    deleteAdminTable,
    deleteAdminUser,
    getAdminRestaurants,
    getAdminStaff,
    getAdminTables,
    getAdminUsers,
    updateAdminRestaurant,
    updateAdminStaff,
    updateAdminTable,
    updateAdminUserRole,
    type AdminRestaurant,
    type AdminStaff,
    type AdminTable,
    type AdminUser,
    type RestaurantPayload,
    type StaffPayload,
    type StaffPosition,
    type TablePayload,
    type TableStatus
} from "@/lib/admin/adminService";
import { useToast } from "@/superadmin/context/ToastContext";

type AdminTab = "restaurants" | "users" | "tables" | "staff";

const tabs: { id: AdminTab; label: string }[] = [
    { id: "restaurants", label: "Restaurants" },
    { id: "users", label: "Users" },
    { id: "tables", label: "Tables" },
    { id: "staff", label: "Staff" }
];

const tableStatuses: TableStatus[] = ["Available", "Occupied", "Reserved", "OutOfService"];
const staffPositions: StaffPosition[] = ["Host", "Chef", "Waiter", "Manager"];
const tenantUserRoles: Array<"Owner" | "Manager" | "User"> = ["Owner", "Manager", "User"];

const emptyRestaurantForm: RestaurantPayload = {
    name: "",
    location: "",
    ownerId: null,
    managerId: null
};

const emptyTableForm: TablePayload = {
    restaurantId: 0,
    number: 1,
    capacity: 2,
    status: "Available",
    assignedStaffId: null
};

const emptyStaffForm: StaffPayload = {
    userId: 0,
    restaurantId: 0,
    position: "Waiter"
};

function toOptionalNumber(value: string) {
    return value ? Number(value) : null;
}

export function AdminPage() {
    const [activeTab, setActiveTab] = useState<AdminTab>("restaurants");
    const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [tables, setTables] = useState<AdminTable[]>([]);
    const [staff, setStaff] = useState<AdminStaff[]>([]);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
    const [staffRestaurantFilter, setStaffRestaurantFilter] = useState<number | "all">("all");
    const [restaurantForm, setRestaurantForm] = useState<RestaurantPayload>(emptyRestaurantForm);
    const [editingRestaurantId, setEditingRestaurantId] = useState<number | null>(null);
    const [tableForm, setTableForm] = useState<TablePayload>(emptyTableForm);
    const [editingTableId, setEditingTableId] = useState<number | null>(null);
    const [staffForm, setStaffForm] = useState<StaffPayload>(emptyStaffForm);
    const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actionPending, setActionPending] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { pushToast } = useToast();

    const owners = users.filter(user => user.role === "Owner");
    const managers = users.filter(user => user.role === "Manager");
    const staffUsers = users.filter(user => user.role !== "Admin");

    const selectedRestaurant = restaurants.find(restaurant => restaurant.id === selectedRestaurantId) ?? null;
    const visibleTables = selectedRestaurantId === null
        ? []
        : tables.filter(table => table.restaurantId === selectedRestaurantId);
    const visibleStaff = staffRestaurantFilter === "all"
        ? staff
        : staff.filter(staffMember => staffMember.restaurantId === staffRestaurantFilter);

    const restaurantsById = useMemo(() => {
        return new Map(restaurants.map(restaurant => [restaurant.id, restaurant]));
    }, [restaurants]);

    const usersById = useMemo(() => {
        return new Map(users.map(user => [user.id, user]));
    }, [users]);

    const staffById = useMemo(() => {
        return new Map(staff.map(staffMember => [staffMember.id, staffMember]));
    }, [staff]);

    const loadDashboard = async () => {
        const [restaurantResult, userResult, tableResult, staffResult] = await Promise.all([
            getAdminRestaurants(),
            getAdminUsers(),
            getAdminTables(),
            getAdminStaff()
        ]);

        setRestaurants(restaurantResult);
        setUsers(userResult);
        setTables(tableResult);
        setStaff(staffResult);
        setSelectedRestaurantId(currentId => currentId ?? restaurantResult[0]?.id ?? null);
        setTableForm(currentForm => ({
            ...currentForm,
            restaurantId: currentForm.restaurantId || restaurantResult[0]?.id || 0
        }));
        setStaffForm(currentForm => ({
            ...currentForm,
            userId: currentForm.userId || userResult.find(user => user.role !== "Admin")?.id || 0,
            restaurantId: currentForm.restaurantId || restaurantResult[0]?.id || 0
        }));
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
    }, []);

    const runAction = async (label: string, action: () => Promise<void>) => {
        try {
            setActionPending(label);
            setError(null);
            await action();
            await loadDashboard();
            pushToast("success", `${label} complete.`);
        } catch (actionError) {
            const message = actionError instanceof Error ? actionError.message : `${label} failed.`;
            setError(message);
            pushToast("error", message);
        } finally {
            setActionPending(null);
        }
    };

    const restaurantName = (id: number | null | undefined) => {
        if (!id) {
            return "Unassigned";
        }

        return restaurantsById.get(id)?.name ?? "Unknown restaurant";
    };

    const userEmail = (id: number | null | undefined) => {
        if (!id) {
            return "Unassigned";
        }

        return usersById.get(id)?.email ?? "Unknown user";
    };

    const userRestaurant = (user: AdminUser) => {
        const owned = restaurants.find(restaurant => restaurant.ownerId === user.id);
        if (owned) {
            return `${owned.name} (Owner)`;
        }

        const managed = restaurants.find(restaurant => restaurant.managerId === user.id);
        if (managed) {
            return `${managed.name} (Manager)`;
        }

        const staffAssignment = staff.find(staffMember => staffMember.userId === user.id);
        return staffAssignment ? restaurantName(staffAssignment.restaurantId) : "Unassigned";
    };

    const resetRestaurantForm = () => {
        setEditingRestaurantId(null);
        setRestaurantForm(emptyRestaurantForm);
    };

    const resetTableForm = () => {
        setEditingTableId(null);
        setTableForm({
            ...emptyTableForm,
            restaurantId: selectedRestaurantId ?? restaurants[0]?.id ?? 0
        });
    };

    const resetStaffForm = () => {
        setEditingStaffId(null);
        setStaffForm({
            ...emptyStaffForm,
            userId: staffUsers[0]?.id ?? 0,
            restaurantId: selectedRestaurantId ?? restaurants[0]?.id ?? 0
        });
    };

    return (
        <main className="admin-dashboard">
            <section className="admin-dashboard__header">
                <div>
                    <p className="role-card__eyebrow">Tenant Admin</p>
                    <h1>Admin Dashboard</h1>
                    <p>Manage restaurants, tenant users, tables, and staff assignments.</p>
                </div>
                <div className="admin-dashboard__tabs" aria-label="Admin sections">
                    {tabs.map(tab => (
                        <Button
                            key={tab.id}
                            variant={activeTab === tab.id ? "primary" : "secondary"}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </div>
            </section>

            {error && <p className="role-status role-status--error admin-dashboard__status">{error}</p>}

            {isLoading ? (
                <section className="role-card role-card--wide">
                    <p className="role-status">Loading admin dashboard...</p>
                </section>
            ) : activeTab === "restaurants" ? (
                <section className="admin-panel">
                    <div className="admin-panel__heading">
                        <div>
                            <h2>Restaurants</h2>
                            <p>All restaurants are scoped to your tenant.</p>
                        </div>
                    </div>

                    <form
                        className="admin-form"
                        onSubmit={event => {
                            event.preventDefault();
                            const action = editingRestaurantId
                                ? () => updateAdminRestaurant(editingRestaurantId, restaurantForm).then(() => undefined)
                                : () => createAdminRestaurant(restaurantForm).then(() => undefined);

                            void runAction(editingRestaurantId ? "Restaurant update" : "Restaurant creation", async () => {
                                await action();
                                resetRestaurantForm();
                            });
                        }}
                    >
                        <Input
                            id="restaurant-name"
                            label="Name"
                            value={restaurantForm.name}
                            onChange={event => setRestaurantForm(current => ({ ...current, name: event.target.value }))}
                            required
                        />
                        <Input
                            id="restaurant-location"
                            label="Location"
                            value={restaurantForm.location}
                            onChange={event => setRestaurantForm(current => ({ ...current, location: event.target.value }))}
                            required
                        />
                        <label className="admin-field">
                            <span>Owner</span>
                            <select
                                value={restaurantForm.ownerId ?? ""}
                                onChange={event => setRestaurantForm(current => ({ ...current, ownerId: toOptionalNumber(event.target.value) }))}
                            >
                                <option value="">Unassigned</option>
                                {owners.map(owner => (
                                    <option key={owner.id} value={owner.id}>
                                        {owner.email}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="admin-field">
                            <span>Manager</span>
                            <select
                                value={restaurantForm.managerId ?? ""}
                                onChange={event => setRestaurantForm(current => ({ ...current, managerId: toOptionalNumber(event.target.value) }))}
                            >
                                <option value="">Unassigned</option>
                                {managers.map(manager => (
                                    <option key={manager.id} value={manager.id}>
                                        {manager.email}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="admin-form__actions">
                            <Button type="submit" isLoading={actionPending === "Restaurant creation" || actionPending === "Restaurant update"}>
                                {editingRestaurantId ? "Save Restaurant" : "Create Restaurant"}
                            </Button>
                            {editingRestaurantId && (
                                <Button variant="ghost" onClick={resetRestaurantForm}>
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </form>

                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Location</th>
                                    <th>Owner</th>
                                    <th>Manager</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {restaurants.map(restaurant => (
                                    <tr key={restaurant.id}>
                                        <td>{restaurant.name}</td>
                                        <td>{restaurant.location}</td>
                                        <td>{userEmail(restaurant.ownerId)}</td>
                                        <td>{userEmail(restaurant.managerId)}</td>
                                        <td>
                                            <div className="admin-inline-actions">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setEditingRestaurantId(restaurant.id);
                                                        setRestaurantForm({
                                                            name: restaurant.name,
                                                            location: restaurant.location,
                                                            ownerId: restaurant.ownerId,
                                                            managerId: restaurant.managerId
                                                        });
                                                    }}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => {
                                                        void runAction("Restaurant deletion", async () => {
                                                            await deleteAdminRestaurant(restaurant.id);
                                                        });
                                                    }}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : activeTab === "users" ? (
                <section className="admin-panel">
                    <div className="admin-panel__heading">
                        <div>
                            <h2>Users</h2>
                            <p>Review tenant users and adjust operational roles.</p>
                        </div>
                    </div>
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Restaurant</th>
                                    <th>Tenant</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.email}</td>
                                        <td>
                                            {user.role === "Admin" ? (
                                                <span>{user.role}</span>
                                            ) : (
                                                <select
                                                    value={user.role}
                                                    onChange={event => {
                                                        const role = event.target.value as "Owner" | "Manager" | "User";
                                                        void runAction("User role update", async () => {
                                                            await updateAdminUserRole(user, role);
                                                        });
                                                    }}
                                                >
                                                    {tenantUserRoles.map(role => (
                                                        <option key={role} value={role}>
                                                            {role}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </td>
                                        <td>{userRestaurant(user)}</td>
                                        <td>{user.tenantName ?? "Current tenant"}</td>
                                        <td>
                                            <Button
                                                variant="ghost"
                                                disabled={user.role === "Admin"}
                                                onClick={() => {
                                                    void runAction("User removal", async () => {
                                                        await deleteAdminUser(user.id);
                                                    });
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : activeTab === "tables" ? (
                <section className="admin-panel">
                    <div className="admin-panel__heading">
                        <div>
                            <h2>Tables</h2>
                            <p>{selectedRestaurant ? `Managing ${selectedRestaurant.name}` : "Select a restaurant to manage tables."}</p>
                        </div>
                        <label className="admin-field admin-field--compact">
                            <span>Restaurant</span>
                            <select
                                value={selectedRestaurantId ?? ""}
                                onChange={event => {
                                    const nextId = Number(event.target.value);
                                    setSelectedRestaurantId(nextId);
                                    setTableForm(current => ({ ...current, restaurantId: nextId }));
                                    setStaffForm(current => ({ ...current, restaurantId: nextId }));
                                }}
                            >
                                {restaurants.map(restaurant => (
                                    <option key={restaurant.id} value={restaurant.id}>
                                        {restaurant.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <form
                        className="admin-form"
                        onSubmit={event => {
                            event.preventDefault();
                            const payload = {
                                ...tableForm,
                                restaurantId: tableForm.restaurantId || selectedRestaurantId || 0
                            };

                            void runAction(editingTableId ? "Table update" : "Table creation", async () => {
                                if (editingTableId) {
                                    await updateAdminTable(editingTableId, payload);
                                } else {
                                    await createAdminTable(payload);
                                }

                                resetTableForm();
                            });
                        }}
                    >
                        <Input
                            id="table-number"
                            label="Number"
                            type="number"
                            min={1}
                            value={tableForm.number}
                            onChange={event => setTableForm(current => ({ ...current, number: Number(event.target.value) }))}
                        />
                        <Input
                            id="table-capacity"
                            label="Capacity"
                            type="number"
                            min={1}
                            value={tableForm.capacity}
                            onChange={event => setTableForm(current => ({ ...current, capacity: Number(event.target.value) }))}
                        />
                        <label className="admin-field">
                            <span>Status</span>
                            <select
                                value={tableForm.status}
                                onChange={event => setTableForm(current => ({ ...current, status: event.target.value as TableStatus }))}
                            >
                                {tableStatuses.map(status => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="admin-field">
                            <span>Assigned Staff</span>
                            <select
                                value={tableForm.assignedStaffId ?? ""}
                                onChange={event => setTableForm(current => ({ ...current, assignedStaffId: toOptionalNumber(event.target.value) }))}
                            >
                                <option value="">Unassigned</option>
                                {staff
                                    .filter(staffMember => staffMember.restaurantId === (selectedRestaurantId ?? tableForm.restaurantId))
                                    .map(staffMember => (
                                        <option key={staffMember.id} value={staffMember.id}>
                                            {userEmail(staffMember.userId)} - {staffMember.position}
                                        </option>
                                    ))}
                            </select>
                        </label>
                        <div className="admin-form__actions">
                            <Button type="submit" isLoading={actionPending === "Table creation" || actionPending === "Table update"}>
                                {editingTableId ? "Save Table" : "Add Table"}
                            </Button>
                            {editingTableId && (
                                <Button variant="ghost" onClick={resetTableForm}>
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </form>

                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Number</th>
                                    <th>Capacity</th>
                                    <th>Status</th>
                                    <th>Assigned Staff</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleTables.map(table => (
                                    <tr key={table.id}>
                                        <td>{table.number}</td>
                                        <td>{table.capacity}</td>
                                        <td>{table.status}</td>
                                        <td>{userEmail(staffById.get(table.assignedStaffId ?? 0)?.userId)}</td>
                                        <td>
                                            <div className="admin-inline-actions">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setEditingTableId(table.id);
                                                        setTableForm({
                                                            restaurantId: table.restaurantId,
                                                            number: table.number,
                                                            capacity: table.capacity,
                                                            status: table.status,
                                                            assignedStaffId: table.assignedStaffId
                                                        });
                                                    }}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => {
                                                        void runAction("Table deletion", async () => {
                                                            await deleteAdminTable(table.id);
                                                        });
                                                    }}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : (
                <section className="admin-panel">
                    <div className="admin-panel__heading">
                        <div>
                            <h2>Staff</h2>
                            <p>Manage staff memberships and positions across restaurants.</p>
                        </div>
                        <label className="admin-field admin-field--compact">
                            <span>Filter</span>
                            <select
                                value={staffRestaurantFilter}
                                onChange={event => setStaffRestaurantFilter(event.target.value === "all" ? "all" : Number(event.target.value))}
                            >
                                <option value="all">All restaurants</option>
                                {restaurants.map(restaurant => (
                                    <option key={restaurant.id} value={restaurant.id}>
                                        {restaurant.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <form
                        className="admin-form"
                        onSubmit={event => {
                            event.preventDefault();
                            void runAction(editingStaffId ? "Staff update" : "Staff creation", async () => {
                                if (editingStaffId) {
                                    await updateAdminStaff(editingStaffId, staffForm);
                                } else {
                                    await createAdminStaff(staffForm);
                                }

                                resetStaffForm();
                            });
                        }}
                    >
                        <label className="admin-field">
                            <span>User</span>
                            <select
                                value={staffForm.userId}
                                onChange={event => setStaffForm(current => ({ ...current, userId: Number(event.target.value) }))}
                            >
                                {staffUsers.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.email}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="admin-field">
                            <span>Restaurant</span>
                            <select
                                value={staffForm.restaurantId}
                                onChange={event => setStaffForm(current => ({ ...current, restaurantId: Number(event.target.value) }))}
                            >
                                {restaurants.map(restaurant => (
                                    <option key={restaurant.id} value={restaurant.id}>
                                        {restaurant.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="admin-field">
                            <span>Position</span>
                            <select
                                value={staffForm.position}
                                onChange={event => setStaffForm(current => ({ ...current, position: event.target.value as StaffPosition }))}
                            >
                                {staffPositions.map(position => (
                                    <option key={position} value={position}>
                                        {position}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="admin-form__actions">
                            <Button type="submit" isLoading={actionPending === "Staff creation" || actionPending === "Staff update"}>
                                {editingStaffId ? "Save Staff" : "Add Staff"}
                            </Button>
                            {editingStaffId && (
                                <Button variant="ghost" onClick={resetStaffForm}>
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </form>

                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Position</th>
                                    <th>Restaurant</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleStaff.map(staffMember => (
                                    <tr key={staffMember.id}>
                                        <td>{userEmail(staffMember.userId)}</td>
                                        <td>{staffMember.position}</td>
                                        <td>{restaurantName(staffMember.restaurantId)}</td>
                                        <td>
                                            <div className="admin-inline-actions">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setEditingStaffId(staffMember.id);
                                                        setStaffForm({
                                                            userId: staffMember.userId,
                                                            restaurantId: staffMember.restaurantId,
                                                            position: staffMember.position
                                                        });
                                                    }}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => {
                                                        void runAction("Staff removal", async () => {
                                                            await deleteAdminStaff(staffMember.id);
                                                        });
                                                    }}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </main>
    );
}
