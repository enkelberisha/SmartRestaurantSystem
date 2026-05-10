import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Table2, Trash2, Users } from "lucide-react";
import { Button } from "@/components/Button";
import { Modal } from "@/features/admin/components/Modal";
import { useToast } from "@/features/admin/context/ToastContext";
import {
    createAdminTable,
    deleteAdminTable,
    getAdminRestaurantStaff,
    getAdminRestaurantTables,
    getAdminRestaurants,
    getAdminStaff,
    getAdminTables,
    updateAdminTable,
    type AdminRestaurant,
    type AdminStaff,
    type AdminTable,
    type TablePayload,
    type TableStatus
} from "@/lib/admin/adminService";
import { useAdminRestaurant } from "@/features/admin/context/adminRestaurantContextValue";

const tableStatuses: TableStatus[] = ["Available", "Occupied", "Reserved", "OutOfService"];

const emptyTableForm: TablePayload = {
    restaurantId: 0,
    number: 1,
    capacity: 2,
    status: "Available",
    assignedStaffId: null
};

export function TablesPage() {
    const { pushToast } = useToast();
    const { selectedRestaurantId } = useAdminRestaurant();
    const [tables, setTables] = useState<AdminTable[]>([]);
    const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
    const [staff, setStaff] = useState<AdminStaff[]>([]);
    const [tableForm, setTableForm] = useState<TablePayload>(emptyTableForm);
    const [editingTable, setEditingTable] = useState<AdminTable | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const restaurantsById = useMemo(
        () => new Map(restaurants.map(restaurant => [restaurant.id, restaurant])),
        [restaurants]
    );
    const visibleTables = selectedRestaurantId === "all"
        ? tables
        : tables.filter(table => table.restaurantId === selectedRestaurantId);
    const visibleStaff = selectedRestaurantId === "all"
        ? staff
        : staff.filter(member => member.restaurantId === selectedRestaurantId);
    const visibleRestaurants = selectedRestaurantId === "all"
        ? restaurants
        : restaurants.filter(restaurant => restaurant.id === selectedRestaurantId);

    const loadTables = useCallback(async () => {
        const tableRequest = selectedRestaurantId === "all"
            ? getAdminTables()
            : getAdminRestaurantTables(selectedRestaurantId);
        const staffRequest = selectedRestaurantId === "all"
            ? getAdminStaff()
            : getAdminRestaurantStaff(selectedRestaurantId);
        const [tableResult, restaurantResult, staffResult] = await Promise.all([
            tableRequest,
            getAdminRestaurants(),
            staffRequest
        ]);

        setTables(tableResult);
        setRestaurants(restaurantResult);
        setStaff(staffResult);
        setTableForm(current => ({
            ...current,
            restaurantId: current.restaurantId || restaurantResult[0]?.id || 0
        }));
    }, [selectedRestaurantId]);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                setIsLoading(true);
                setError(null);
                await loadTables();
            } catch (loadError) {
                if (isMounted) {
                    setError(loadError instanceof Error ? loadError.message : "Could not load tables.");
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
    }, [loadTables]);

    const openCreateForm = () => {
        setEditingTable(null);
        setTableForm({
            ...emptyTableForm,
            restaurantId: selectedRestaurantId === "all" ? restaurants[0]?.id || 0 : selectedRestaurantId
        });
        setIsFormOpen(true);
    };

    const openEditForm = (table: AdminTable) => {
        setEditingTable(table);
        setTableForm({
            restaurantId: table.restaurantId,
            number: table.number,
            capacity: table.capacity,
            status: table.status,
            assignedStaffId: table.assignedStaffId
        });
        setIsFormOpen(true);
    };

    const saveTable = async () => {
        try {
            if (editingTable) {
                await updateAdminTable(editingTable.id, tableForm);
                pushToast("success", "Table updated.");
            } else {
                await createAdminTable(tableForm);
                pushToast("success", "Table created.");
            }

            setIsFormOpen(false);
            setEditingTable(null);
            await loadTables();
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Could not save table.";
            setError(message);
            pushToast("error", message);
        }
    };

    const removeTable = async (table: AdminTable) => {
        try {
            await deleteAdminTable(table.id);
            pushToast("success", `Table ${table.number} deleted.`);
            await loadTables();
        } catch (deleteError) {
            const message = deleteError instanceof Error ? deleteError.message : "Could not delete table.";
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
                    <h1>Tables</h1>
                    <p>Manage table records and status visually.</p>
                </div>
                <Button className="admin-button" onClick={openCreateForm}>
                    <Plus size={18} />
                    Add Table
                </Button>
            </header>

            {error && <div className="admin-alert admin-alert--warning">{error}</div>}

            <div className="admin-table-legend">
                {tableStatuses.map(status => (
                    <div key={status} className="admin-table-legend__item">
                        <span className={`admin-table-legend__dot admin-table-legend__dot--${status.toLowerCase()}`} />
                        <span>{status}</span>
                    </div>
                ))}
            </div>

            <div className="admin-floor-plan">
                {visibleTables.map(table => (
                    <article key={table.id} className={`admin-table-tile admin-table-tile--${table.status.toLowerCase()}`}>
                        <div className="admin-table-tile__top">
                            <span className="admin-table-tile__icon">
                                <Table2 size={22} />
                            </span>
                            <span className={`admin-status-dot admin-status-dot--${table.status.toLowerCase()}`} />
                        </div>
                        <strong className="admin-table-tile__number">Table {table.number}</strong>
                        <span className="admin-table-tile__restaurant">
                            {restaurantsById.get(table.restaurantId)?.name ?? `Restaurant #${table.restaurantId}`}
                        </span>
                        <span className="admin-table-tile__capacity">
                            <Users size={14} />
                            {table.capacity} seats
                        </span>
                        <span className="admin-badge">{table.status}</span>
                        <div className="admin-table-tile__actions">
                            <button
                                type="button"
                                className="icon-button icon-button--sm"
                                onClick={() => openEditForm(table)}
                                aria-label="Edit table"
                            >
                                <Pencil size={16} />
                            </button>
                            <button
                                type="button"
                                className="icon-button icon-button--sm icon-button--danger"
                                onClick={() => removeTable(table)}
                                aria-label="Delete table"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </article>
                ))}
                {visibleTables.length === 0 && (
                    <article className="admin-section-card admin-empty-panel">No tables found.</article>
                )}
            </div>

            <Modal
                title={editingTable ? "Edit Table" : "Add Table"}
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
            >
                <form
                    className="admin-form"
                    onSubmit={event => {
                        event.preventDefault();
                        void saveTable();
                    }}
                >
                    <section className="admin-form-section">
                        <h3>Table details</h3>
                        <div className="admin-field">
                            <label>Restaurant</label>
                            <select
                                className="admin-select"
                                value={tableForm.restaurantId}
                                onChange={event =>
                                    setTableForm(current => ({ ...current, restaurantId: Number(event.target.value) }))
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
                            <label>Table Number</label>
                            <input
                                type="number"
                                className="admin-input"
                                value={tableForm.number}
                                onChange={event =>
                                    setTableForm(current => ({ ...current, number: Number(event.target.value) }))
                                }
                                required
                            />
                        </div>
                        <div className="admin-field">
                            <label>Capacity</label>
                            <input
                                type="number"
                                className="admin-input"
                                value={tableForm.capacity}
                                onChange={event =>
                                    setTableForm(current => ({ ...current, capacity: Number(event.target.value) }))
                                }
                                required
                            />
                        </div>
                    </section>

                    <section className="admin-form-section">
                        <h3>Status and assignment</h3>
                        <div className="admin-field">
                            <label>Status</label>
                            <select
                                className="admin-select"
                                value={tableForm.status}
                                onChange={event =>
                                    setTableForm(current => ({
                                        ...current,
                                        status: event.target.value as TableStatus
                                    }))
                                }
                            >
                                {tableStatuses.map(status => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="admin-field">
                            <label>Assigned Staff</label>
                            <select
                                className="admin-select"
                                value={tableForm.assignedStaffId ?? ""}
                                onChange={event =>
                                    setTableForm(current => ({
                                        ...current,
                                        assignedStaffId: event.target.value ? Number(event.target.value) : null
                                    }))
                                }
                            >
                                <option value="">Unassigned</option>
                                {visibleStaff.map(member => (
                                    <option key={member.id} value={member.id}>
                                        Staff #{member.id} - {member.position}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </section>
                    <div className="admin-inline-actions">
                        <Button className="admin-button" type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="admin-button" type="submit">
                            {editingTable ? "Save Changes" : "Add Table"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
