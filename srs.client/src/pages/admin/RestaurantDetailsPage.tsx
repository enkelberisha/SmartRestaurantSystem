import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/Button";
import { Modal } from "@/features/admin/components/Modal";
import { useAdminRestaurant } from "@/features/admin/context/adminRestaurantContextValue";
import { useToast } from "@/features/admin/context/ToastContext";
import {
    createAdminRestaurant,
    getAdminRestaurants,
    getAdminStaffCandidateUsers,
    updateAdminRestaurant,
    type AdminRestaurant,
    type AdminUser,
    type RestaurantPayload
} from "@/lib/admin/adminService";

const emptyRestaurantForm: RestaurantPayload = {
    name: "",
    location: "",
    ownerId: null,
    managerId: null
};

export function RestaurantDetailsPage() {
    const { pushToast } = useToast();
    const {
        selectedRestaurantId: adminSelectedRestaurantId,
        refreshRestaurants,
        setSelectedRestaurantId: setAdminSelectedRestaurantId
    } = useAdminRestaurant();
    const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
    const [restaurantForm, setRestaurantForm] = useState<RestaurantPayload>(emptyRestaurantForm);
    const [createForm, setCreateForm] = useState<RestaurantPayload>(emptyRestaurantForm);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const restaurantsById = useMemo(
        () => new Map(restaurants.map(restaurant => [restaurant.id, restaurant])),
        [restaurants]
    );
    const assignmentUsers = useMemo(
        () => users
            .filter(user => user.role !== "SuperAdmin")
            .sort((left, right) => left.email.localeCompare(right.email)),
        [users]
    );

    const loadDetails = useCallback(async (preferredRestaurantId: number | null = selectedRestaurantId) => {
        const [restaurantResult, userResult] = await Promise.all([
            getAdminRestaurants(),
            getAdminStaffCandidateUsers()
        ]);

        setRestaurants(restaurantResult);
        setUsers(userResult);

        const preferredId = preferredRestaurantId ?? (
            adminSelectedRestaurantId === "all" ? null : adminSelectedRestaurantId
        );
        const selected = restaurantResult.find(restaurant => restaurant.id === preferredId)
            ?? restaurantResult[0]
            ?? null;

        setSelectedRestaurantId(selected?.id ?? null);
        setRestaurantForm({
            name: selected?.name ?? "",
            location: selected?.location ?? "",
            ownerId: selected?.ownerId ?? null,
            managerId: selected?.managerId ?? null
        });
    }, [adminSelectedRestaurantId, selectedRestaurantId]);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                setIsLoading(true);
                setError(null);
                await loadDetails();
            } catch (loadError) {
                if (isMounted) {
                    setError(loadError instanceof Error ? loadError.message : "Could not load restaurant details.");
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
    }, [loadDetails]);

    const selectRestaurant = (restaurantId: number) => {
        const restaurant = restaurantsById.get(restaurantId);
        setSelectedRestaurantId(restaurantId);
        setRestaurantForm({
            name: restaurant?.name ?? "",
            location: restaurant?.location ?? "",
            ownerId: restaurant?.ownerId ?? null,
            managerId: restaurant?.managerId ?? null
        });
    };

    const openCreateForm = () => {
        setCreateForm(emptyRestaurantForm);
        setIsCreateOpen(true);
    };

    const createRestaurant = async () => {
        try {
            setIsCreating(true);
            setError(null);
            const created = await createAdminRestaurant(createForm);
            await refreshRestaurants(created.id);
            await loadDetails(created.id);
            setIsCreateOpen(false);
            setCreateForm(emptyRestaurantForm);
            pushToast("success", "Restaurant created.");
        } catch (createError) {
            const message = createError instanceof Error ? createError.message : "Could not create restaurant.";
            setError(message);
            pushToast("error", message);
        } finally {
            setIsCreating(false);
        }
    };

    const saveRestaurant = async () => {
        if (selectedRestaurantId === null) {
            return;
        }

        try {
            setIsSaving(true);
            await updateAdminRestaurant(selectedRestaurantId, restaurantForm);
            setAdminSelectedRestaurantId(selectedRestaurantId);
            await refreshRestaurants(selectedRestaurantId);
            await loadDetails();
            pushToast("success", "Restaurant details updated.");
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Could not update restaurant.";
            setError(message);
            pushToast("error", message);
        } finally {
            setIsSaving(false);
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
                    <h1>Restaurant Details</h1>
                    <p>Change restaurant profile information and role assignments.</p>
                </div>
                <Button className="admin-button" onClick={openCreateForm}>
                    <Plus size={18} />
                    Create Restaurant
                </Button>
            </header>

            {error && <div className="admin-alert admin-alert--warning">{error}</div>}

            <article className="admin-section-card admin-section-card--form">
                <form
                    className="admin-form"
                    onSubmit={event => {
                        event.preventDefault();
                        void saveRestaurant();
                    }}
                >
                    <section className="admin-form-section">
                        <h3>Restaurant</h3>
                        <div className="admin-field">
                            <label>Restaurant</label>
                            <select
                                className="admin-select"
                                value={selectedRestaurantId ?? ""}
                                onChange={event => selectRestaurant(Number(event.target.value))}
                            >
                                {restaurants.map(restaurant => (
                                    <option key={restaurant.id} value={restaurant.id}>
                                        {restaurant.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </section>

                    <section className="admin-form-section">
                        <h3>Basic information</h3>
                        <div className="admin-field">
                            <label>Name</label>
                            <input
                                className="admin-input"
                                value={restaurantForm.name}
                                onChange={event => setRestaurantForm(current => ({ ...current, name: event.target.value }))}
                                required
                            />
                        </div>
                        <div className="admin-field">
                            <label>Location</label>
                            <input
                                className="admin-input"
                                value={restaurantForm.location}
                                onChange={event => setRestaurantForm(current => ({ ...current, location: event.target.value }))}
                                required
                            />
                        </div>
                    </section>

                    <section className="admin-form-section">
                        <h3>Assignments</h3>
                        <div className="admin-field">
                            <label>Owner</label>
                            <select
                                className="admin-select"
                                value={restaurantForm.ownerId ?? ""}
                                onChange={event =>
                                    setRestaurantForm(current => ({
                                        ...current,
                                        ownerId: event.target.value ? Number(event.target.value) : null
                                    }))
                                }
                            >
                                <option value="">Unassigned</option>
                                {assignmentUsers.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.email} ({user.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="admin-field">
                            <label>Manager</label>
                            <select
                                className="admin-select"
                                value={restaurantForm.managerId ?? ""}
                                onChange={event =>
                                    setRestaurantForm(current => ({
                                        ...current,
                                        managerId: event.target.value ? Number(event.target.value) : null
                                    }))
                                }
                            >
                                <option value="">Unassigned</option>
                                {assignmentUsers.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.email} ({user.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </section>
                    <div className="admin-inline-actions">
                        <Button className="admin-button" type="submit" isLoading={isSaving}>
                            Save Details
                        </Button>
                    </div>
                </form>
            </article>

            <Modal title="Create Restaurant" open={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
                <form
                    className="admin-form"
                    onSubmit={event => {
                        event.preventDefault();
                        void createRestaurant();
                    }}
                >
                    <section className="admin-form-section">
                        <h3>Basic information</h3>
                        <div className="admin-field">
                            <label>Name</label>
                            <input
                                className="admin-input"
                                value={createForm.name}
                                onChange={event => setCreateForm(current => ({ ...current, name: event.target.value }))}
                                required
                            />
                        </div>
                        <div className="admin-field">
                            <label>Location</label>
                            <input
                                className="admin-input"
                                value={createForm.location}
                                onChange={event => setCreateForm(current => ({ ...current, location: event.target.value }))}
                                required
                            />
                        </div>
                    </section>

                    <section className="admin-form-section">
                        <h3>Assignments</h3>
                        <div className="admin-form-row">
                            <div className="admin-field">
                                <label>Owner</label>
                                <select
                                    className="admin-select"
                                    value={createForm.ownerId ?? ""}
                                    onChange={event =>
                                        setCreateForm(current => ({
                                            ...current,
                                            ownerId: event.target.value ? Number(event.target.value) : null
                                        }))
                                    }
                                >
                                    <option value="">Unassigned</option>
                                    {assignmentUsers.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.email} ({user.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="admin-field">
                                <label>Manager</label>
                                <select
                                    className="admin-select"
                                    value={createForm.managerId ?? ""}
                                    onChange={event =>
                                        setCreateForm(current => ({
                                            ...current,
                                            managerId: event.target.value ? Number(event.target.value) : null
                                        }))
                                    }
                                >
                                    <option value="">Unassigned</option>
                                    {assignmentUsers.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.email} ({user.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    <div className="admin-inline-actions">
                        <Button className="admin-button" type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="admin-button" type="submit" isLoading={isCreating}>
                            Create Restaurant
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
