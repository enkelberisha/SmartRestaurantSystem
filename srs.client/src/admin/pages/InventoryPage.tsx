import { useState } from "react";
import { Plus, Search, AlertTriangle, Package, TrendingDown } from "lucide-react";
import { Button } from "@/components/Button";
import { Modal } from "@/admin/components/Modal";
import { useToast } from "@/admin/context/ToastContext";

type InventoryItem = {
    id: number;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    minStock: number;
    costPerUnit: number;
    supplier: string;
    lastRestocked: string;
};

const mockInventory: InventoryItem[] = [
    {
        id: 1,
        name: "Olive Oil",
        category: "Oils & Fats",
        quantity: 5,
        unit: "liters",
        minStock: 10,
        costPerUnit: 12.50,
        supplier: "Mediterranean Foods",
        lastRestocked: "2024-01-10",
    },
    {
        id: 2,
        name: "Atlantic Salmon",
        category: "Seafood",
        quantity: 25,
        unit: "lbs",
        minStock: 15,
        costPerUnit: 18.00,
        supplier: "Ocean Fresh",
        lastRestocked: "2024-01-14",
    },
    {
        id: 3,
        name: "Chicken Breast",
        category: "Poultry",
        quantity: 40,
        unit: "lbs",
        minStock: 30,
        costPerUnit: 8.50,
        supplier: "Farm Direct",
        lastRestocked: "2024-01-13",
    },
    {
        id: 4,
        name: "Parmesan Cheese",
        category: "Dairy",
        quantity: 8,
        unit: "lbs",
        minStock: 5,
        costPerUnit: 22.00,
        supplier: "Italian Imports",
        lastRestocked: "2024-01-12",
    },
    {
        id: 5,
        name: "Fresh Tomatoes",
        category: "Produce",
        quantity: 12,
        unit: "lbs",
        minStock: 20,
        costPerUnit: 3.50,
        supplier: "Local Farms Co",
        lastRestocked: "2024-01-14",
    },
    {
        id: 6,
        name: "Red Wine",
        category: "Beverages",
        quantity: 24,
        unit: "bottles",
        minStock: 12,
        costPerUnit: 28.00,
        supplier: "Wine Distributors",
        lastRestocked: "2024-01-08",
    },
];

const categories = ["All", "Oils & Fats", "Seafood", "Poultry", "Dairy", "Produce", "Beverages"];

export function InventoryPage() {
    const { pushToast } = useToast();
    const [inventory, setInventory] = useState<InventoryItem[]>(mockInventory);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isRestockOpen, setIsRestockOpen] = useState(false);
    const [filterCategory, setFilterCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    const lowStockItems = inventory.filter(item => item.quantity <= item.minStock);

    const filteredInventory = inventory.filter(item => {
        const matchesCategory = filterCategory === "All" || item.category === filterCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const restockItem = (id: number, quantity: number) => {
        setInventory(prev =>
            prev.map(item =>
                item.id === id
                    ? { ...item, quantity: item.quantity + quantity, lastRestocked: new Date().toISOString().split("T")[0] }
                    : item
            )
        );
        pushToast("success", "Inventory restocked");
        setIsRestockOpen(false);
        setSelectedItem(null);
    };

    return (
        <div className="admin-stack">
            <header className="admin-page-header">
                <div>
                    <h1>Inventory</h1>
                    <p>Track and manage restaurant inventory levels</p>
                </div>
                <Button onClick={() => setIsFormOpen(true)}>
                    <Plus size={18} />
                    Add Item
                </Button>
            </header>

            {lowStockItems.length > 0 && (
                <article className="admin-alert admin-alert--warning">
                    <AlertTriangle size={20} />
                    <div>
                        <strong>Low Stock Alert</strong>
                        <p>
                            {lowStockItems.length} item(s) are running low:{" "}
                            {lowStockItems.map(i => i.name).join(", ")}
                        </p>
                    </div>
                </article>
            )}

            <div className="admin-kpi-grid admin-kpi-grid--compact">
                <article className="admin-kpi-card admin-kpi-card--small">
                    <span>Total Items</span>
                    <strong>{inventory.length}</strong>
                </article>
                <article className="admin-kpi-card admin-kpi-card--small admin-kpi-card--warning">
                    <span>Low Stock</span>
                    <strong>{lowStockItems.length}</strong>
                </article>
                <article className="admin-kpi-card admin-kpi-card--small">
                    <span>Categories</span>
                    <strong>{categories.length - 1}</strong>
                </article>
                <article className="admin-kpi-card admin-kpi-card--small">
                    <span>Total Value</span>
                    <strong>
                        ${inventory.reduce((sum, i) => sum + i.quantity * i.costPerUnit, 0).toFixed(0)}
                    </strong>
                </article>
            </div>

            <div className="admin-filters">
                <label className="admin-search admin-search--inline">
                    <Search size={16} />
                    <input
                        type="search"
                        placeholder="Search inventory..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </label>
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

            <article className="admin-section-card">
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Category</th>
                                <th>Stock</th>
                                <th>Min Stock</th>
                                <th>Cost/Unit</th>
                                <th>Supplier</th>
                                <th>Last Restocked</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInventory.map(item => (
                                <tr key={item.id}>
                                    <td>
                                        <div className="admin-inventory-item">
                                            <Package size={18} />
                                            <strong>{item.name}</strong>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="admin-badge">{item.category}</span>
                                    </td>
                                    <td>
                                        <span
                                            className={
                                                item.quantity <= item.minStock
                                                    ? "admin-text--warning"
                                                    : ""
                                            }
                                        >
                                            {item.quantity} {item.unit}
                                            {item.quantity <= item.minStock && (
                                                <TrendingDown size={14} className="admin-icon--warning" />
                                            )}
                                        </span>
                                    </td>
                                    <td>
                                        {item.minStock} {item.unit}
                                    </td>
                                    <td>${item.costPerUnit.toFixed(2)}</td>
                                    <td>{item.supplier}</td>
                                    <td>{new Date(item.lastRestocked).toLocaleDateString()}</td>
                                    <td>
                                        <Button
                                            variant="secondary"
                                            onClick={() => {
                                                setSelectedItem(item);
                                                setIsRestockOpen(true);
                                            }}
                                        >
                                            Restock
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </article>

            <Modal
                title={`Restock ${selectedItem?.name ?? ""}`}
                open={isRestockOpen}
                onClose={() => {
                    setIsRestockOpen(false);
                    setSelectedItem(null);
                }}
            >
                {selectedItem && (
                    <form
                        className="admin-form"
                        onSubmit={e => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            restockItem(selectedItem.id, Number(formData.get("quantity")));
                        }}
                    >
                        <p>
                            Current stock: <strong>{selectedItem.quantity} {selectedItem.unit}</strong>
                        </p>
                        <div className="admin-field">
                            <label>Quantity to Add ({selectedItem.unit})</label>
                            <input
                                type="number"
                                name="quantity"
                                min="1"
                                className="admin-input"
                                required
                            />
                        </div>
                        <div className="admin-inline-actions">
                            <Button type="submit">Confirm Restock</Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    setIsRestockOpen(false);
                                    setSelectedItem(null);
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            <Modal
                title="Add Inventory Item"
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
            >
                <form
                    className="admin-form"
                    onSubmit={e => {
                        e.preventDefault();
                        pushToast("success", "Item added to inventory");
                        setIsFormOpen(false);
                    }}
                >
                    <div className="admin-field">
                        <label>Item Name</label>
                        <input type="text" className="admin-input" required />
                    </div>
                    <div className="admin-form-row">
                        <div className="admin-field">
                            <label>Category</label>
                            <select className="admin-select">
                                {categories.filter(c => c !== "All").map(cat => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="admin-field">
                            <label>Unit</label>
                            <input type="text" className="admin-input" placeholder="lbs, liters, etc." required />
                        </div>
                    </div>
                    <div className="admin-form-row">
                        <div className="admin-field">
                            <label>Initial Quantity</label>
                            <input type="number" min="0" className="admin-input" required />
                        </div>
                        <div className="admin-field">
                            <label>Minimum Stock</label>
                            <input type="number" min="0" className="admin-input" required />
                        </div>
                        <div className="admin-field">
                            <label>Cost per Unit</label>
                            <input type="number" step="0.01" min="0" className="admin-input" required />
                        </div>
                    </div>
                    <div className="admin-field">
                        <label>Supplier</label>
                        <input type="text" className="admin-input" />
                    </div>
                    <div className="admin-inline-actions">
                        <Button type="submit">Add Item</Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsFormOpen(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
