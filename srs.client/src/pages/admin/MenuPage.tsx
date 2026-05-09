import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit2, Plus, Tags, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Modal } from "@/features/admin/components/Modal";
import { useToast } from "@/features/admin/context/ToastContext";
import {
    createAdminMenu,
    createAdminMenuItem,
    createMenuItemFilter,
    deleteAdminMenuItem,
    deleteMenuItemFilter,
    getAdminMenuItems,
    getAdminMenus,
    getAdminRestaurantMenuItems,
    getAdminRestaurantMenus,
    getAdminRestaurants,
    getMenuItemFilters,
    updateAdminMenuItem,
    type AdminMenu,
    type AdminMenuItem,
    type AdminRestaurant,
    type MenuItemFilter,
    type MenuItemPayload
} from "@/lib/admin/adminService";
import { useAdminRestaurant } from "@/features/admin/context/adminRestaurantContextValue";

const emptyItemForm: MenuItemPayload = {
    menuId: 0,
    name: "",
    price: 0,
    description: "",
    cookingTime: 0,
    filterIds: []
};

export function MenuPage() {
    const { pushToast } = useToast();
    const { selectedRestaurantId } = useAdminRestaurant();
    const [menus, setMenus] = useState<AdminMenu[]>([]);
    const [menuItems, setMenuItems] = useState<AdminMenuItem[]>([]);
    const [filters, setFilters] = useState<MenuItemFilter[]>([]);
    const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
    const [selectedMenuId, setSelectedMenuId] = useState<number | "all">("all");
    const [itemForm, setItemForm] = useState<MenuItemPayload>(emptyItemForm);
    const [editingItem, setEditingItem] = useState<AdminMenuItem | null>(null);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [newMenuName, setNewMenuName] = useState("");
    const [newMenuRestaurantId, setNewMenuRestaurantId] = useState(0);
    const [newFilterName, setNewFilterName] = useState("");
    const [newFilterRestaurantId, setNewFilterRestaurantId] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const menusById = useMemo(() => new Map(menus.map(menu => [menu.id, menu])), [menus]);
    const filtersBySlug = useMemo(() => new Map(filters.map(filter => [filter.slug, filter])), [filters]);
    const restaurantsById = useMemo(
        () => new Map(restaurants.map(restaurant => [restaurant.id, restaurant])),
        [restaurants]
    );
    const visibleRestaurants = selectedRestaurantId === "all"
        ? restaurants
        : restaurants.filter(restaurant => restaurant.id === selectedRestaurantId);
    const visibleMenus = useMemo(
        () => selectedRestaurantId === "all"
            ? menus
            : menus.filter(menu => menu.restaurantId === selectedRestaurantId),
        [menus, selectedRestaurantId]
    );
    const visibleMenuIds = useMemo(
        () => new Set(visibleMenus.map(menu => menu.id)),
        [visibleMenus]
    );

    const visibleItems = selectedMenuId === "all"
        ? menuItems.filter(item => visibleMenuIds.has(item.menuId))
        : menuItems.filter(item => item.menuId === selectedMenuId && visibleMenuIds.has(item.menuId));

    const loadMenu = useCallback(async () => {
        const menuRequest = selectedRestaurantId === "all"
            ? getAdminMenus()
            : getAdminRestaurantMenus(selectedRestaurantId);
        const itemRequest = selectedRestaurantId === "all"
            ? getAdminMenuItems()
            : getAdminRestaurantMenuItems(selectedRestaurantId);
        const filterRequest = selectedRestaurantId === "all"
            ? getMenuItemFilters()
            : getMenuItemFilters(selectedRestaurantId);
        const [menuResult, itemResult, restaurantResult, filterResult] = await Promise.allSettled([
            menuRequest,
            itemRequest,
            getAdminRestaurants(),
            filterRequest
        ]);

        const loadedMenus = menuResult.status === "fulfilled" ? menuResult.value : [];
        const loadedItems = itemResult.status === "fulfilled" ? itemResult.value : [];
        const loadedRestaurants = restaurantResult.status === "fulfilled" ? restaurantResult.value : [];
        const loadedFilters = filterResult.status === "fulfilled" ? filterResult.value : [];
        const failures = [menuResult, itemResult, restaurantResult, filterResult].filter(result => result.status === "rejected");

        setMenus(loadedMenus);
        setMenuItems(loadedItems);
        setRestaurants(loadedRestaurants);
        setFilters(loadedFilters);
        setNewMenuRestaurantId(
            selectedRestaurantId === "all" ? loadedRestaurants[0]?.id ?? 0 : selectedRestaurantId
        );
        setNewFilterRestaurantId(
            selectedRestaurantId === "all" ? loadedRestaurants[0]?.id ?? 0 : selectedRestaurantId
        );
        setItemForm(current => ({
            ...current,
            menuId: current.menuId || loadedMenus[0]?.id || 0
        }));

        if (failures.length > 0) {
            throw new Error("Menu opened, but some menu data could not be loaded.");
        }
    }, [selectedRestaurantId]);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                setIsLoading(true);
                setError(null);
                await loadMenu();
            } catch (loadError) {
                if (isMounted) {
                    setError(loadError instanceof Error ? loadError.message : "Could not load menu.");
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
    }, [loadMenu]);

    const openCreateItem = () => {
        setEditingItem(null);
        setItemForm({
            ...emptyItemForm,
            menuId: selectedMenuId === "all" ? visibleMenus[0]?.id ?? 0 : selectedMenuId
        });
        setIsItemModalOpen(true);
    };

    const openCreateMenu = () => {
        setNewMenuRestaurantId(selectedRestaurantId === "all" ? restaurants[0]?.id ?? 0 : selectedRestaurantId);
        setIsMenuModalOpen(true);
    };

    const openEditItem = (item: AdminMenuItem) => {
        setEditingItem(item);
        setItemForm({
            menuId: item.menuId,
            name: item.name,
            price: item.price,
            description: item.description ?? "",
            cookingTime: item.cookingTime,
            filterIds: item.filters
                .map(slug => filtersBySlug.get(slug)?.id)
                .filter((id): id is number => typeof id === "number")
        });
        setIsItemModalOpen(true);
    };

    const toggleItemFilter = (filterId: number) => {
        setItemForm(current => ({
            ...current,
            filterIds: current.filterIds.includes(filterId)
                ? current.filterIds.filter(id => id !== filterId)
                : [...current.filterIds, filterId]
        }));
    };

    const saveItem = async () => {
        try {
            if (editingItem) {
                await updateAdminMenuItem(editingItem.id, itemForm);
                pushToast("success", "Menu item updated.");
            } else {
                await createAdminMenuItem(itemForm);
                pushToast("success", "Menu item created.");
            }

            setIsItemModalOpen(false);
            setEditingItem(null);
            await loadMenu();
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Could not save menu item.";
            setError(message);
            pushToast("error", message);
        }
    };

    const saveMenu = async () => {
        try {
            await createAdminMenu({
                name: newMenuName,
                restaurantId: newMenuRestaurantId
            });
            pushToast("success", "Menu created.");
            setNewMenuName("");
            setIsMenuModalOpen(false);
            await loadMenu();
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Could not create menu.";
            setError(message);
            pushToast("error", message);
        }
    };

    const removeItem = async (item: AdminMenuItem) => {
        try {
            await deleteAdminMenuItem(item.id);
            pushToast("success", `${item.name} deleted.`);
            await loadMenu();
        } catch (deleteError) {
            const message = deleteError instanceof Error ? deleteError.message : "Could not delete menu item.";
            setError(message);
            pushToast("error", message);
        }
    };

    const saveFilter = async () => {
        const name = newFilterName.trim();

        if (!name) {
            return;
        }

        try {
            await createMenuItemFilter({
                restaurantId: newFilterRestaurantId,
                name,
                sortOrder: filters.length + 1
            });
            setNewFilterName("");
            pushToast("success", "Menu filter created.");
            await loadMenu();
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Could not create menu filter.";
            setError(message);
            pushToast("error", message);
        }
    };

    const removeFilter = async (filter: MenuItemFilter) => {
        try {
            await deleteMenuItemFilter(filter.id);
            pushToast("success", `${filter.name} removed.`);
            await loadMenu();
        } catch (deleteError) {
            const message = deleteError instanceof Error ? deleteError.message : "Could not remove menu filter.";
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
                    <h1>Menu</h1>
                    <p>Add and edit menu items for restaurant menus.</p>
                </div>
                <div className="admin-inline-actions">
                    <Button className="admin-button" variant="secondary" onClick={openCreateMenu}>
                        <Plus size={18} />
                        New Menu
                    </Button>
                    <Button className="admin-button" onClick={openCreateItem} disabled={visibleMenus.length === 0}>
                        <Plus size={18} />
                        Add Item
                    </Button>
                </div>
            </header>

            {error && <div className="admin-alert admin-alert--warning">{error}</div>}

            <div className="admin-filters">
                <select
                    className="admin-select"
                    value={selectedMenuId}
                    onChange={event =>
                        setSelectedMenuId(event.target.value === "all" ? "all" : Number(event.target.value))
                    }
                >
                    <option value="all">All Menus</option>
                    {visibleMenus.map(menu => (
                        <option key={menu.id} value={menu.id}>
                            {menu.name} - {restaurantsById.get(menu.restaurantId)?.name ?? `Restaurant #${menu.restaurantId}`}
                        </option>
                    ))}
                </select>
            </div>

            <article className="admin-section-card admin-filter-manager">
                <div className="admin-section-card__header">
                    <div>
                        <h2>Dietary Filters</h2>
                        <p>Create reusable filters, then assign them to menu items.</p>
                    </div>
                    <Tags size={20} className="admin-icon--primary" />
                </div>
                <form
                    className="admin-filter-create"
                    onSubmit={event => {
                        event.preventDefault();
                        void saveFilter();
                    }}
                >
                    <select
                        className="admin-select"
                        value={newFilterRestaurantId}
                        onChange={event => setNewFilterRestaurantId(Number(event.target.value))}
                        required
                    >
                        {visibleRestaurants.map(restaurant => (
                            <option key={restaurant.id} value={restaurant.id}>
                                {restaurant.name}
                            </option>
                        ))}
                    </select>
                    <input
                        className="admin-input"
                        value={newFilterName}
                        onChange={event => setNewFilterName(event.target.value)}
                        placeholder="Gluten free, Vegan, Spicy..."
                    />
                    <Button className="admin-button" type="submit" disabled={!newFilterName.trim() || newFilterRestaurantId === 0}>
                        <Plus size={18} />
                        Add Filter
                    </Button>
                </form>
                <div className="admin-chip-list">
                    {filters.map(filter => (
                        <span className="admin-chip admin-chip--with-action" key={filter.id}>
                            {filter.name}
                            <button type="button" onClick={() => removeFilter(filter)} aria-label={`Remove ${filter.name}`}>
                                <Trash2 size={14} />
                            </button>
                        </span>
                    ))}
                    {filters.length === 0 && <span className="admin-muted">No filters yet.</span>}
                </div>
            </article>

            <article className="admin-section-card">
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Menu</th>
                                <th>Price</th>
                                <th>Cooking Time</th>
                                <th>Filters</th>
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleItems.map(item => (
                                <tr key={item.id}>
                                    <td>{item.name}</td>
                                    <td>{menusById.get(item.menuId)?.name ?? `Menu #${item.menuId}`}</td>
                                    <td>${item.price.toFixed(2)}</td>
                                    <td>{item.cookingTime} min</td>
                                    <td>
                                        <div className="admin-chip-list admin-chip-list--compact">
                                            {item.filters.map(slug => (
                                                <span className="admin-chip" key={slug}>
                                                    {filtersBySlug.get(slug)?.name ?? slug}
                                                </span>
                                            ))}
                                            {item.filters.length === 0 && <span className="admin-muted">None</span>}
                                        </div>
                                    </td>
                                    <td>{item.description ?? "No description"}</td>
                                    <td>
                                        <div className="admin-table-actions">
                                            <button
                                                type="button"
                                                className="icon-button icon-button--sm"
                                                onClick={() => openEditItem(item)}
                                                aria-label="Edit menu item"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-button icon-button--sm icon-button--danger"
                                                onClick={() => removeItem(item)}
                                                aria-label="Delete menu item"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {visibleItems.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="admin-empty-cell">
                                        No menu items found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </article>

            <Modal title={editingItem ? "Edit Menu Item" : "Add Menu Item"} open={isItemModalOpen} onClose={() => setIsItemModalOpen(false)}>
                <form
                    className="admin-form"
                    onSubmit={event => {
                        event.preventDefault();
                        void saveItem();
                    }}
                >
                    <div className="admin-field">
                        <label>Menu</label>
                        <select
                            className="admin-select"
                            value={itemForm.menuId}
                            onChange={event => setItemForm(current => ({ ...current, menuId: Number(event.target.value) }))}
                            required
                        >
                            {visibleMenus.map(menu => (
                                <option key={menu.id} value={menu.id}>
                                    {menu.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="admin-form-row">
                        <div className="admin-field">
                            <label>Name</label>
                            <input
                                className="admin-input"
                                value={itemForm.name}
                                onChange={event => setItemForm(current => ({ ...current, name: event.target.value }))}
                                required
                            />
                        </div>
                        <div className="admin-field">
                            <label>Price</label>
                            <input
                                type="number"
                                step="0.01"
                                className="admin-input"
                                value={itemForm.price}
                                onChange={event => setItemForm(current => ({ ...current, price: Number(event.target.value) }))}
                                required
                            />
                        </div>
                    </div>
                    <div className="admin-field">
                        <label>Description</label>
                        <textarea
                            className="admin-textarea"
                            value={itemForm.description ?? ""}
                            onChange={event => setItemForm(current => ({ ...current, description: event.target.value || null }))}
                        />
                    </div>
                    <div className="admin-field">
                        <label>Cooking Time</label>
                        <input
                            type="number"
                            className="admin-input"
                            value={itemForm.cookingTime}
                            onChange={event => setItemForm(current => ({ ...current, cookingTime: Number(event.target.value) }))}
                        />
                    </div>
                    <div className="admin-field">
                        <label>Filters</label>
                        <div className="admin-check-grid">
                            {filters.map(filter => (
                                <label className="admin-check-card" key={filter.id}>
                                    <input
                                        type="checkbox"
                                        checked={itemForm.filterIds.includes(filter.id)}
                                        onChange={() => toggleItemFilter(filter.id)}
                                    />
                                    <span>{filter.name}</span>
                                </label>
                            ))}
                            {filters.length === 0 && (
                                <div className="admin-alert admin-alert--warning">
                                    Add a filter first, then assign it to this item.
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="admin-inline-actions">
                        <Button className="admin-button" type="button" variant="secondary" onClick={() => setIsItemModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="admin-button" type="submit">{editingItem ? "Save Changes" : "Add Item"}</Button>
                    </div>
                </form>
            </Modal>

            <Modal title="New Menu" open={isMenuModalOpen} onClose={() => setIsMenuModalOpen(false)}>
                <form
                    className="admin-form"
                    onSubmit={event => {
                        event.preventDefault();
                        void saveMenu();
                    }}
                >
                    <div className="admin-field">
                        <label>Restaurant</label>
                        <select
                            className="admin-select"
                            value={newMenuRestaurantId}
                            onChange={event => setNewMenuRestaurantId(Number(event.target.value))}
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
                        <label>Menu Name</label>
                        <input
                            className="admin-input"
                            value={newMenuName}
                            onChange={event => setNewMenuName(event.target.value)}
                            required
                        />
                    </div>
                    <div className="admin-inline-actions">
                        <Button className="admin-button" type="button" variant="secondary" onClick={() => setIsMenuModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="admin-button" type="submit">Create Menu</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
