import { useState } from "react";
import { Plus, Edit2, Trash2, Search, Filter } from "lucide-react";
import { Button } from "@/components/Button";
import { Modal } from "@/admin/components/Modal";
import { useToast } from "@/admin/context/ToastContext";

type MenuItem = {
    id: number;
    name: string;
    description: string;
    category: string;
    price: number;
    available: boolean;
};

const mockMenuItems: MenuItem[] = [
    {
        id: 1,
        name: "Grilled Salmon",
        description: "Fresh Atlantic salmon with herb butter and seasonal vegetables",
        category: "Main Course",
        price: 28.00,
        available: true,
    },
    {
        id: 2,
        name: "Caesar Salad",
        description: "Crisp romaine, parmesan, croutons, house-made dressing",
        category: "Appetizers",
        price: 12.00,
        available: true,
    },
    {
        id: 3,
        name: "Ribeye Steak",
        description: "12oz prime ribeye, garlic mashed potatoes, asparagus",
        category: "Main Course",
        price: 45.00,
        available: true,
    },
    {
        id: 4,
        name: "Chocolate Lava Cake",
        description: "Warm chocolate cake with molten center, vanilla ice cream",
        category: "Desserts",
        price: 9.50,
        available: true,
    },
    {
        id: 5,
        name: "Margherita Pizza",
        description: "San Marzano tomatoes, fresh mozzarella, basil",
        category: "Main Course",
        price: 16.00,
        available: false,
    },
    {
        id: 6,
        name: "Tiramisu",
        description: "Classic Italian dessert with espresso-soaked ladyfingers",
        category: "Desserts",
        price: 8.00,
        available: true,
    },
];

const categories = ["All", "Main Course", "Appetizers", "Desserts", "Beverages"];

export function MenuPage() {
    const { pushToast } = useToast();
    const [menuItems, setMenuItems] = useState<MenuItem[]>(mockMenuItems);
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [filterCategory, setFilterCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredItems = menuItems.filter(item => {
        const matchesCategory = filterCategory === "All" || item.category === filterCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const toggleAvailability = (id: number) => {
        setMenuItems(prev =>
            prev.map(item =>
                item.id === id ? { ...item, available: !item.available } : item
            )
        );
        const item = menuItems.find(i => i.id === id);
        pushToast(
            "success",
            `${item?.name} is now ${item?.available ? "unavailable" : "available"}`
        );
    };

    const deleteItem = (id: number) => {
        const item = menuItems.find(i => i.id === id);
        setMenuItems(prev => prev.filter(i => i.id !== id));
        pushToast("success", `${item?.name} has been removed`);
    };

    return (
        <div className="admin-stack">
            <header className="admin-page-header">
                <div>
                    <h1>Menu Management</h1>
                    <p>Add, edit, and manage your restaurant menu items</p>
                </div>
                <Button onClick={() => setIsFormOpen(true)}>
                    <Plus size={18} />
                    Add Item
                </Button>
            </header>

            <div className="admin-filters">
                <label className="admin-search admin-search--inline">
                    <Search size={16} />
                    <input
                        type="search"
                        placeholder="Search menu items..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </label>
                <div className="admin-filter-group">
                    <Filter size={16} />
                    <select
                        className="admin-select"
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="admin-menu-grid">
                {filteredItems.map(item => (
                    <article
                        key={item.id}
                        className={`admin-menu-card ${!item.available ? "admin-menu-card--unavailable" : ""}`}
                    >
                        <div className="admin-menu-card__image">
                            <div className="admin-menu-card__placeholder">
                                {item.name.charAt(0)}
                            </div>
                        </div>
                        <div className="admin-menu-card__content">
                            <div className="admin-menu-card__header">
                                <h3>{item.name}</h3>
                                <span className="admin-menu-card__price">${item.price.toFixed(2)}</span>
                            </div>
                            <p className="admin-menu-card__description">{item.description}</p>
                            <div className="admin-menu-card__footer">
                                <span className="admin-badge">{item.category}</span>
                                <span
                                    className={`admin-badge admin-badge--${item.available ? "available" : "unavailable"}`}
                                >
                                    {item.available ? "Available" : "Unavailable"}
                                </span>
                            </div>
                            <div className="admin-menu-card__actions">
                                <button
                                    type="button"
                                    className="admin-link-button"
                                    onClick={() => toggleAvailability(item.id)}
                                >
                                    {item.available ? "Mark Unavailable" : "Mark Available"}
                                </button>
                                <button
                                    type="button"
                                    className="icon-button icon-button--sm"
                                    onClick={() => setSelectedItem(item)}
                                    aria-label="Edit item"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    type="button"
                                    className="icon-button icon-button--sm icon-button--danger"
                                    onClick={() => deleteItem(item.id)}
                                    aria-label="Delete item"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            <Modal
                title={selectedItem ? "Edit Menu Item" : "Add Menu Item"}
                open={isFormOpen || !!selectedItem}
                onClose={() => {
                    setIsFormOpen(false);
                    setSelectedItem(null);
                }}
            >
                <form
                    className="admin-form"
                    onSubmit={e => {
                        e.preventDefault();
                        pushToast("success", selectedItem ? "Item updated" : "Item added");
                        setIsFormOpen(false);
                        setSelectedItem(null);
                    }}
                >
                    <div className="admin-field">
                        <label>Name</label>
                        <input
                            type="text"
                            className="admin-input"
                            defaultValue={selectedItem?.name ?? ""}
                            required
                        />
                    </div>
                    <div className="admin-field">
                        <label>Description</label>
                        <textarea
                            className="admin-textarea"
                            rows={3}
                            defaultValue={selectedItem?.description ?? ""}
                        />
                    </div>
                    <div className="admin-form-row">
                        <div className="admin-field">
                            <label>Category</label>
                            <select
                                className="admin-select"
                                defaultValue={selectedItem?.category ?? "Main Course"}
                            >
                                {categories.filter(c => c !== "All").map(cat => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="admin-field">
                            <label>Price</label>
                            <input
                                type="number"
                                step="0.01"
                                className="admin-input"
                                defaultValue={selectedItem?.price ?? ""}
                                required
                            />
                        </div>
                    </div>
                    <div className="admin-inline-actions">
                        <Button type="submit">
                            {selectedItem ? "Save Changes" : "Add Item"}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setIsFormOpen(false);
                                setSelectedItem(null);
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
