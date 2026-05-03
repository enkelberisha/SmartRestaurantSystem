import { useEffect, useMemo, useState } from "react";
import { Edit2, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Modal } from "@/admin/components/Modal";
import { useToast } from "@/admin/context/ToastContext";
import {
    createAdminStaff,
    deleteAdminStaff,
    getAdminRestaurants,
    getAdminStaff,
    getAdminStaffCandidateUsers,
    getAdminUsers,
    updateAdminStaff,
    type AdminRestaurant,
    type AdminStaff,
    type AdminUser,
    type StaffPayload,
    type StaffPosition
} from "@/lib/admin/adminService";
import { useAdminRestaurant } from "@/admin/context/adminRestaurantContextValue";

const staffPositions: StaffPosition[] = ["Host", "Chef", "Waiter", "Manager"];

const emptyStaffForm: StaffPayload = {
    userId: 0,
    restaurantId: 0,
    position: "Waiter"
};

export function StaffPage() {
    const { pushToast } = useToast();
    const { selectedRestaurantId } = useAdminRestaurant();
    const [staff, setStaff] = useState<AdminStaff[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [staffCandidateUsers, setStaffCandidateUsers] = useState<AdminUser[]>([]);
    const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
    const [staffForm, setStaffForm] = useState<StaffPayload>(emptyStaffForm);
    const [editingStaff, setEditingStaff] = useState<AdminStaff | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const usersById = useMemo(() => new Map(users.map(user => [user.id, user])), [users]);
    const restaurantsById = useMemo(
        () => new Map(restaurants.map(restaurant => [restaurant.id, restaurant])),
        [restaurants]
    );
    const visibleRestaurants = selectedRestaurantId === "all"
        ? restaurants
        : restaurants.filter(restaurant => restaurant.id === selectedRestaurantId);

    const loadStaff = async () => {
        const [staffResult, userResult, candidateUserResult, restaurantResult] = await Promise.all([
            getAdminStaff(),
            getAdminUsers(),
            getAdminStaffCandidateUsers(),
            getAdminRestaurants()
        ]);

        setStaff(staffResult);
        setUsers(userResult);
        setStaffCandidateUsers(candidateUserResult);
        setRestaurants(restaurantResult);
        setStaffForm(current => ({
            ...current,
            userId: current.userId || candidateUserResult[0]?.id || 0,
            restaurantId: current.restaurantId || restaurantResult[0]?.id || 0
        }));
    };

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                setIsLoading(true);
                setError(null);
                await loadStaff();
            } catch (loadError) {
                if (isMounted) {
                    setError(loadError instanceof Error ? loadError.message : "Could not load staff.");
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

    const filteredStaff = staff.filter(member => {
        const user = usersById.get(member.userId);
        const restaurant = restaurantsById.get(member.restaurantId);
        const query = searchQuery.toLowerCase();

        return (
            String(member.id).includes(query) ||
            member.position.toLowerCase().includes(query) ||
            (user?.email.toLowerCase().includes(query) ?? false) ||
            (restaurant?.name.toLowerCase().includes(query) ?? false)
        );
    });

    const openCreateForm = () => {
        setEditingStaff(null);
        setStaffForm({
            ...emptyStaffForm,
            userId: staffCandidateUsers[0]?.id || 0,
            restaurantId: selectedRestaurantId === "all" ? restaurants[0]?.id || 0 : selectedRestaurantId
        });
        setIsFormOpen(true);
    };

    const openEditForm = (member: AdminStaff) => {
        setEditingStaff(member);
        setStaffForm({
            userId: member.userId,
            restaurantId: member.restaurantId,
            position: member.position
        });
        setIsFormOpen(true);
    };

    const saveStaff = async () => {
        try {
            if (editingStaff) {
                await updateAdminStaff(editingStaff.id, staffForm);
                pushToast("success", "Staff assignment updated.");
            } else {
                await createAdminStaff(staffForm);
                pushToast("success", "Staff assignment created.");
            }

            setIsFormOpen(false);
            setEditingStaff(null);
            await loadStaff();
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Could not save staff.";
            setError(message);
            pushToast("error", message);
        }
    };

    const removeStaff = async (member: AdminStaff) => {
        try {
            await deleteAdminStaff(member.id);
            pushToast("success", `Staff #${member.id} removed.`);
            await loadStaff();
        } catch (deleteError) {
            const message = deleteError instanceof Error ? deleteError.message : "Could not remove staff.";
            setError(message);
            pushToast("error", message);
        }
    };

    if (isLoading) {
        return (
            <div className="admin-stack">
                <div className="skeleton-block admin-chart-skeleton" />
            </div>
        );
    }

    return (
        <div className="admin-stack">
            <header className="admin-page-header">
                <div>
                    <h1>Staff</h1>
                    <p>Create and manage staff assignments.</p>
                </div>
                <Button className="admin-button" onClick={openCreateForm}>
                    <Plus size={18} />
                    Add Staff
                </Button>
            </header>

            {error && <div className="admin-alert admin-alert--warning">{error}</div>}

            <div className="admin-filters">
                <label className="admin-search admin-search--inline">
                    <Search size={16} />
                    <input
                        type="search"
                        placeholder="Search staff..."
                        value={searchQuery}
                        onChange={event => setSearchQuery(event.target.value)}
                    />
                </label>
            </div>

            <article className="admin-section-card">
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Staff ID</th>
                                <th>User</th>
                                <th>Restaurant</th>
                                <th>Position</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStaff.map(member => (
                                <tr key={member.id}>
                                    <td>#{member.id}</td>
                                    <td>{usersById.get(member.userId)?.email ?? `User #${member.userId}`}</td>
                                    <td>
                                        {restaurantsById.get(member.restaurantId)?.name ??
                                            `Restaurant #${member.restaurantId}`}
                                    </td>
                                    <td>
                                        <span className="admin-badge">{member.position}</span>
                                    </td>
                                    <td>
                                        <div className="admin-table-actions">
                                            <button
                                                type="button"
                                                className="icon-button icon-button--sm"
                                                onClick={() => openEditForm(member)}
                                                aria-label="Edit staff"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-button icon-button--sm icon-button--danger"
                                                onClick={() => removeStaff(member)}
                                                aria-label="Delete staff"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredStaff.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="admin-empty-cell">
                                        No staff found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </article>

            <Modal
                title={editingStaff ? "Edit Staff" : "Add Staff"}
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
            >
                <form
                    className="admin-form"
                    onSubmit={event => {
                        event.preventDefault();
                        void saveStaff();
                    }}
                >
                    <section className="admin-form-section">
                        <h3>Staff member</h3>
                        <div className="admin-field">
                            <label>User</label>
                            <select
                                className="admin-select"
                                value={staffForm.userId}
                                onChange={event =>
                                    setStaffForm(current => ({ ...current, userId: Number(event.target.value) }))
                                }
                                required
                            >
                                {staffCandidateUsers.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.email} ({user.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </section>

                    <section className="admin-form-section">
                        <h3>Assignment</h3>
                        <div className="admin-form-row">
                            <div className="admin-field">
                                <label>Restaurant</label>
                                <select
                                    className="admin-select"
                                    value={staffForm.restaurantId}
                                    onChange={event =>
                                        setStaffForm(current => ({ ...current, restaurantId: Number(event.target.value) }))
                                    }
                                    required
                                >
                                    {visibleRestaurants.map(restaurant => (
                                        <option key={restaurant.id} value={restaurant.id}>
                                            {restaurant.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="admin-field">
                                <label>Position</label>
                                <select
                                    className="admin-select"
                                    value={staffForm.position}
                                    onChange={event =>
                                        setStaffForm(current => ({
                                            ...current,
                                            position: event.target.value as StaffPosition
                                        }))
                                    }
                                >
                                    {staffPositions.map(position => (
                                        <option key={position} value={position}>
                                            {position}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>
                    <div className="admin-inline-actions">
                        <Button className="admin-button" type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="admin-button" type="submit">
                            {editingStaff ? "Save Changes" : "Add Staff"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
