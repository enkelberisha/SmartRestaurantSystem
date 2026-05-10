import { useEffect, useMemo, useState } from "react";
import { Edit2, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Modal } from "@/features/admin/components/Modal";
import { useToast } from "@/features/admin/context/ToastContext";
import {
    createAdminStaff,
    deleteAdminStaff,
    getAdminRestaurants,
    getAdminStaff,
    updateAdminStaff,
    type AdminRestaurant,
    type AdminStaff,
    type StaffCredentialType,
    type StaffPayload
} from "@/lib/admin/adminService";
import { useAdminRestaurant } from "@/features/admin/context/adminRestaurantContextValue";

const credentialTypes: StaffCredentialType[] = ["Pin", "Card", "ManualId"];
const credentialTypeLabels: Record<StaffCredentialType, string> = {
    Pin: "PIN",
    Card: "Card",
    ManualId: "Manual ID"
};

const emptyStaffForm: StaffPayload = {
    restaurantId: 0,
    fullName: "",
    credentialValue: "",
    credentialType: "Pin",
    isActive: true
};

export function StaffPage() {
    const { pushToast } = useToast();
    const { selectedRestaurantId } = useAdminRestaurant();
    const [staff, setStaff] = useState<AdminStaff[]>([]);
    const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
    const [staffForm, setStaffForm] = useState<StaffPayload>(emptyStaffForm);
    const [editingStaff, setEditingStaff] = useState<AdminStaff | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const restaurantsById = useMemo(
        () => new Map(restaurants.map(restaurant => [restaurant.id, restaurant])),
        [restaurants]
    );
    const visibleRestaurants = selectedRestaurantId === "all"
        ? restaurants
        : restaurants.filter(restaurant => restaurant.id === selectedRestaurantId);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                setIsLoading(true);
                setError(null);
                const [staffResult, restaurantResult] = await Promise.all([
                    getAdminStaff(),
                    getAdminRestaurants()
                ]);

                if (!isMounted) {
                    return;
                }

                setStaff(staffResult);
                setRestaurants(restaurantResult);
                setStaffForm(current => ({
                    ...current,
                    restaurantId: current.restaurantId || restaurantResult[0]?.id || 0
                }));
            } catch (loadError) {
                if (isMounted) {
                    setError(loadError instanceof Error ? loadError.message : "Could not load waiters.");
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
        const restaurant = restaurantsById.get(member.restaurantId);
        const query = searchQuery.toLowerCase();

        return (
            String(member.id).includes(query) ||
            member.fullName.toLowerCase().includes(query) ||
            credentialTypeLabels[member.credentialType].toLowerCase().includes(query) ||
            String(member.isActive).toLowerCase().includes(query) ||
            (restaurant?.name.toLowerCase().includes(query) ?? false)
        );
    });

    const openCreateForm = () => {
        setEditingStaff(null);
        setStaffForm({
            ...emptyStaffForm,
            restaurantId: selectedRestaurantId === "all" ? restaurants[0]?.id || 0 : selectedRestaurantId
        });
        setIsFormOpen(true);
    };

    const openEditForm = (member: AdminStaff) => {
        setEditingStaff(member);
        setStaffForm({
            restaurantId: member.restaurantId,
            fullName: member.fullName,
            credentialValue: "",
            credentialType: member.credentialType,
            isActive: member.isActive
        });
        setIsFormOpen(true);
    };

    const loadStaff = async () => {
        const [staffResult, restaurantResult] = await Promise.all([
            getAdminStaff(),
            getAdminRestaurants()
        ]);
        setStaff(staffResult);
        setRestaurants(restaurantResult);
    };

    const saveStaff = async () => {
        try {
            if (editingStaff) {
                await updateAdminStaff(editingStaff.id, staffForm);
                pushToast("success", "Waiter updated.");
            } else {
                await createAdminStaff(staffForm);
                pushToast("success", "Waiter created.");
            }

            setIsFormOpen(false);
            setEditingStaff(null);
            await loadStaff();
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Could not save waiter.";
            setError(message);
            pushToast("error", message);
        }
    };

    const removeStaff = async (member: AdminStaff) => {
        try {
            await deleteAdminStaff(member.id);
            pushToast("success", `Waiter #${member.id} removed.`);
            await loadStaff();
        } catch (deleteError) {
            const message = deleteError instanceof Error ? deleteError.message : "Could not remove waiter.";
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
                    <h1>Waiters</h1>
                    <p>Create waiter staff records for POS card and PIN login.</p>
                </div>
                <Button className="admin-button" onClick={openCreateForm}>
                    <Plus size={18} />
                    Create Waiter
                </Button>
            </header>

            {error && <div className="admin-alert admin-alert--warning">{error}</div>}

            <div className="admin-filters">
                <label className="admin-search admin-search--inline">
                    <Search size={16} />
                    <input
                        type="search"
                        placeholder="Search waiters..."
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
                                <th>Waiter ID</th>
                                <th>Full Name</th>
                                <th>Restaurant</th>
                                <th>Credential</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStaff.map(member => (
                                <tr key={member.id}>
                                    <td>#{member.id}</td>
                                    <td>{member.fullName}</td>
                                    <td>{restaurantsById.get(member.restaurantId)?.name ?? `Restaurant #${member.restaurantId}`}</td>
                                    <td><span className="admin-badge">{credentialTypeLabels[member.credentialType]}</span></td>
                                    <td>{member.isActive ? "Active" : "Inactive"}</td>
                                    <td>{new Date(member.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div className="admin-table-actions">
                                            <button
                                                type="button"
                                                className="icon-button icon-button--sm"
                                                onClick={() => openEditForm(member)}
                                                aria-label="Edit waiter"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-button icon-button--sm icon-button--danger"
                                                onClick={() => removeStaff(member)}
                                                aria-label="Delete waiter"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredStaff.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="admin-empty-cell">
                                        No waiters found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </article>

            <Modal
                title={editingStaff ? "Edit Waiter" : "Create Waiter"}
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
                        <h3>Waiter details</h3>
                        <div className="admin-field">
                            <label>Full Name</label>
                            <input
                                className="admin-input"
                                value={staffForm.fullName}
                                onChange={event => setStaffForm(current => ({ ...current, fullName: event.target.value }))}
                                required
                            />
                        </div>
                        <div className="admin-field">
                            <label>Restaurant</label>
                            <select
                                className="admin-select"
                                value={staffForm.restaurantId}
                                onChange={event => setStaffForm(current => ({ ...current, restaurantId: Number(event.target.value) }))}
                                required
                            >
                                {visibleRestaurants.map(restaurant => (
                                    <option key={restaurant.id} value={restaurant.id}>
                                        {restaurant.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </section>

                    <section className="admin-form-section">
                        <h3>Credential</h3>
                        <div className="admin-form-row">
                            <div className="admin-field">
                                <label>Credential Type</label>
                                <select
                                    className="admin-select"
                                    value={staffForm.credentialType}
                                    onChange={event => setStaffForm(current => ({ ...current, credentialType: event.target.value as StaffCredentialType }))}
                                >
                                    {credentialTypes.map(type => (
                                        <option key={type} value={type}>
                                            {credentialTypeLabels[type]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="admin-field">
                                <label>{editingStaff ? "New Waiter Card ID / PIN / Identifier" : "Waiter Card ID / PIN / Identifier"}</label>
                                <input
                                    className="admin-input"
                                    value={staffForm.credentialValue}
                                    onChange={event => setStaffForm(current => ({ ...current, credentialValue: event.target.value }))}
                                    required
                                />
                            </div>
                        </div>
                        <label className="checkbox">
                            <input
                                type="checkbox"
                                checked={staffForm.isActive}
                                onChange={event => setStaffForm(current => ({ ...current, isActive: event.target.checked }))}
                            />
                            <span>Active waiter</span>
                        </label>
                    </section>

                    <div className="admin-inline-actions">
                        <Button className="admin-button" type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="admin-button" type="submit">
                            {editingStaff ? "Save Changes" : "Create Waiter"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
