import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Bell,
    Package,
    BookOpen,
    Building2,
    ChevronDown,
    CookingPot,
    LayoutDashboard,
    Menu,
    Search,
    Settings,
    Sparkles,
    Table2,
    Truck,
    WalletCards
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/Button";
import { ProfileModal } from "@/components/ProfileModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUserContext } from "@/context/useUserContext";
import { useTheme } from "@/hooks/useTheme";
import { getBrandLogo } from "@/lib/branding/brandLogo";
import {
    createManagerPurchaseOrder,
    emptyManagerInventoryData,
    getManagerInventory,
    storeManagerPurchaseOrderReceipt,
    updateManagerInventoryItem
} from "@/manager/services/inventoryService";
import { downloadPurchaseOrdersPdf } from "@/manager/services/purchaseOrderPdf";
import {
    getStoredManagerRestaurantId,
    storeManagerRestaurantId
} from "@/manager/services/managerRestaurantService";
import { ManagerAiCompletionAlert } from "@/manager/components/ManagerAiCompletionAlert";
import type { ManagerInventoryData, ManagerPurchaseOrder } from "@/manager/types";
        
import { Modal } from "@/features/superadmin/components/Modal";

const navItems = [
    { href: "/manager", label: "Dashboard", icon: LayoutDashboard, end: true },
    { href: "/manager/orders", label: "Orders", icon: WalletCards },
    { href: "/manager/tables", label: "Tables", icon: Table2 },
    { href: "/manager/kitchen", label: "Kitchen", icon: CookingPot },
    { href: "/manager/menus", label: "Menus", icon: BookOpen },
    { href: "/manager/inventory", label: "Inventory", icon: Package },
    { href: "/manager/ai-insights", label: "AI Insights", icon: Sparkles }
];

const chartColors = ["#7c5cff", "#21c997", "#f59e0b", "#ef4444", "#38bdf8", "#a78bfa"];

function money(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
    }).format(value);
}

function moneyExact(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function dateLabel(value: string) {
    return new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
    });
}

function stockTone(quantity: number) {
    if (quantity <= 2) {
        return "critical";
    }

    if (quantity <= 5) {
        return "low";
    }

    return "healthy";
}

function stockLabel(quantity: number) {
    const tone = stockTone(quantity);

    if (tone === "critical") {
        return "Critical";
    }

    if (tone === "low") {
        return "Low";
    }

    return "Ready";
}

function chartName(value: string | null | undefined, fallback: string) {
    return value?.trim() || fallback;
}

function chooseBestInventoryItemMatch(
    items: ManagerInventoryData["inventoryItems"],
    supplierId: number,
    total: number,
    inventoryItemId: number | null
) {
    const directMatch = inventoryItemId ? items.find(item => item.id === inventoryItemId) ?? null : null;
    if (directMatch) {
        return directMatch;
    }

    const sameSupplierItems = items
        .filter(item => item.supplierId === supplierId)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    if (sameSupplierItems.length === 0) {
        return null;
    }

    const totalMatchedItems = sameSupplierItems.filter(item => Math.abs(item.unitPrice - total) < 0.01);
    if (totalMatchedItems.length > 0) {
        return totalMatchedItems[0];
    }

    const divisibleItems = sameSupplierItems
        .map(item => {
            const derivedQuantity = total / item.unitPrice;
            const roundedQuantity = Math.round(derivedQuantity);
            const isWholeish = Math.abs(derivedQuantity - roundedQuantity) < 0.01;

            return {
                item,
                score: isWholeish && roundedQuantity > 0 ? roundedQuantity : Number.POSITIVE_INFINITY
            };
        })
        .filter(candidate => Number.isFinite(candidate.score))
        .sort((left, right) => left.score - right.score);

    if (divisibleItems.length > 0) {
        return divisibleItems[0].item;
    }

    return sameSupplierItems[0];
}

function toDateInputValue(value: string | Date) {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function todayInputValue() {
    return toDateInputValue(new Date());
}

function displayReportDate(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, (month ?? 1) - 1, day ?? 1);

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

export function ManagerInventoryPage() {
    const { profile, isLoading: profileLoading, logout } = useUserContext();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const brandLogo = getBrandLogo(theme);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(() => getStoredManagerRestaurantId());
    const [data, setData] = useState<ManagerInventoryData>(emptyManagerInventoryData);
    const [query, setQuery] = useState("");
    const [activeSupplierId, setActiveSupplierId] = useState<number | "all">("all");
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [restockOpen, setRestockOpen] = useState(false);
    const [restockSupplierId, setRestockSupplierId] = useState<number | "">("");
    const [restockQuantity, setRestockQuantity] = useState("");
    const [restockConfirmOpen, setRestockConfirmOpen] = useState(false);
    const [purchaseReportDate, setPurchaseReportDate] = useState(todayInputValue);
    const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const localPart = profile?.email?.split("@")[0] ?? "manager";
    const avatar = localPart
        .split(/[^a-zA-Z0-9]/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part[0]?.toUpperCase() ?? "")
        .join("") || "MG";
    const canSwitchRestaurants = data.restaurants.length > 1;
    const selectedRestaurant = data.restaurants.find(restaurant => restaurant.id === selectedRestaurantId) ?? data.restaurants[0] ?? null;
    const suppliersById = useMemo(() => new Map(data.suppliers.map(supplier => [supplier.id, supplier])), [data.suppliers]);
    const inventoryItemsById = useMemo(() => new Map(data.inventoryItems.map(item => [item.id, item])), [data.inventoryItems]);
    const inventoryRows = useMemo(() => data.inventoryItems.map(item => {
        const supplier = item.supplierId ? suppliersById.get(item.supplierId) ?? null : null;
        const value = item.quantity * item.unitPrice;

        return {
            item,
            supplier,
            value,
            tone: stockTone(item.quantity),
            status: stockLabel(item.quantity)
        };
    }), [data.inventoryItems, suppliersById]);
    const filteredRows = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return inventoryRows
            .filter(row => activeSupplierId === "all" || row.item.supplierId === activeSupplierId)
            .filter(row => !normalizedQuery || [
                row.item.itemName,
                row.supplier?.name ?? "Unassigned",
                row.supplier?.contact ?? ""
            ].some(value => value.toLowerCase().includes(normalizedQuery)))
            .sort((left, right) =>
                left.item.quantity - right.item.quantity ||
                right.value - left.value ||
                left.item.itemName.localeCompare(right.item.itemName)
            );
    }, [activeSupplierId, inventoryRows, query]);
    const stockValue = inventoryRows.reduce((sum, row) => sum + row.value, 0);
    const unassignedRows = inventoryRows.filter(row => !row.item.supplierId);
    const criticalStockRows = inventoryRows.filter(row => row.item.quantity <= 2);
    const restockTarget = 10;
    const restockQueue = [...inventoryRows]
        .filter(row => row.item.quantity < restockTarget)
        .sort((left, right) =>
            left.item.quantity - right.item.quantity ||
            right.value - left.value ||
            left.item.itemName.localeCompare(right.item.itemName)
        );
    const scopedPurchaseOrders = useMemo(() => {
        const myOrders = profile
            ? data.purchaseOrders.filter(order => order.createdByUserId === profile.appUserId)
            : [];

        return myOrders.length > 0 ? myOrders : data.purchaseOrders;
    }, [data.purchaseOrders, profile]);
    const dailyPurchaseOrders = useMemo(() => scopedPurchaseOrders
        .filter(order => toDateInputValue(order.createdAt) === purchaseReportDate)
        .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()), [purchaseReportDate, scopedPurchaseOrders]);
    const exportPurchaseOrders = useMemo(() => dailyPurchaseOrders.map(order => {
        const fallbackInventoryItem = chooseBestInventoryItemMatch(
            data.inventoryItems,
            order.supplierId,
            order.total,
            order.inventoryItemId
        );
        const unitPrice = order.unitPrice ?? fallbackInventoryItem?.unitPrice ?? 0;
        const quantity = order.quantity
            ?? (unitPrice > 0 ? Number((order.total / unitPrice).toFixed(2)) : 1);
        const itemName = order.itemName?.trim()
            || fallbackInventoryItem?.itemName
            || "Inventory item";

        return {
            ...order,
            inventoryItemId: order.inventoryItemId ?? fallbackInventoryItem?.id ?? null,
            itemName,
            unitPrice,
            quantity
        };
    }), [dailyPurchaseOrders, data.inventoryItems, inventoryItemsById]);
    const supplierCards = useMemo(() => data.suppliers.map(supplier => {
        const items = inventoryRows.filter(row => row.item.supplierId === supplier.id);
        const lowItems = items.filter(row => row.item.quantity <= 5);
        const value = items.reduce((sum, row) => sum + row.value, 0);

        return {
            supplier,
            items,
            lowItems,
            value
        };
    }).sort((left, right) => right.value - left.value || right.lowItems.length - left.lowItems.length), [data.suppliers, inventoryRows]);
    const itemValueChartData = [...inventoryRows]
        .sort((left, right) => right.value - left.value)
        .slice(0, 8)
        .map(row => ({
            name: chartName(row.item.itemName, `Item ${row.item.id}`),
            value: Number(row.value.toFixed(2))
        }));
    const supplierChartData = supplierCards.slice(0, 6).map(card => ({
        name: chartName(card.supplier.name, `Supplier ${card.supplier.id}`),
        items: card.items.length,
        low: card.lowItems.length,
        value: Number(card.value.toFixed(2))
    }));
    const selectedRow = selectedItemId ? inventoryRows.find(row => row.item.id === selectedItemId) ?? null : null;
    const restockQuantityValue = Number(restockQuantity);
    const restockCalculatedTotal = selectedRow && Number.isFinite(restockQuantityValue) && restockQuantityValue > 0
        ? restockQuantityValue * selectedRow.item.unitPrice
        : 0;
    const projectedQuantity = selectedRow && Number.isFinite(restockQuantityValue) && restockQuantityValue > 0
        ? selectedRow.item.quantity + restockQuantityValue
        : null;

    function openRestockDraft(row = restockQueue[0] ?? null) {
        if (!row) {
            return;
        }

        const units = Math.max(1, Math.ceil(restockTarget - row.item.quantity));
        setSelectedItemId(row.item.id);
        setRestockSupplierId(row.item.supplierId ?? data.suppliers[0]?.id ?? "");
        setRestockQuantity(String(units));
        setRestockOpen(true);
        setRestockConfirmOpen(false);
        setActionMessage(null);
    }

    function closeRestockFlow() {
        setRestockOpen(false);
        setRestockConfirmOpen(false);
    }

    function requestRestockConfirmation() {
        if (!selectedRestaurantId || !restockSupplierId || !selectedRow) {
            setActionMessage("Choose an item and supplier before creating a purchase order.");
            return;
        }

        const quantity = Number(restockQuantity);

        if (!Number.isFinite(quantity) || quantity <= 0) {
            setActionMessage("Restock quantity must be greater than zero.");
            return;
        }

        setActionMessage(null);
        setRestockConfirmOpen(true);
    }

    async function submitRestockDraft() {
        if (!selectedRestaurantId || !restockSupplierId || !selectedRow) {
            setActionMessage("Choose an item and supplier before creating a purchase order.");
            setRestockConfirmOpen(false);
            return;
        }

        const quantity = Number(restockQuantity);

        if (!Number.isFinite(quantity) || quantity <= 0) {
            setActionMessage("Restock quantity must be greater than zero.");
            setRestockConfirmOpen(false);
            return;
        }

        try {
            setIsSubmittingRestock(true);
            setActionMessage(null);
            const order = await createManagerPurchaseOrder({
                restaurantId: selectedRestaurantId,
                supplierId: restockSupplierId,
                inventoryItemId: selectedRow.item.id,
                quantity,
                total: quantity * selectedRow.item.unitPrice
            });
            storeManagerPurchaseOrderReceipt({
                purchaseOrderId: order.id,
                restaurantId: selectedRestaurantId,
                inventoryItemId: selectedRow.item.id,
                itemName: selectedRow.item.itemName,
                quantity,
                unitPrice: selectedRow.item.unitPrice,
                total: quantity * selectedRow.item.unitPrice,
                createdAt: order.createdAt
            });
            const updatedQuantity = selectedRow.item.quantity + quantity;

            await updateManagerInventoryItem({
                ...selectedRow.item,
                quantity: updatedQuantity,
                supplierId: restockSupplierId
            });

            closeRestockFlow();
            setSelectedItemId(null);
            setActionMessage(`Purchase order #${order.id} created for ${order.supplierName}. ${selectedRow.item.itemName} is now at ${updatedQuantity} units.`);
            await loadInventory(selectedRestaurantId);
        } catch (submitError) {
            setActionMessage(submitError instanceof Error ? submitError.message : "Could not create purchase order.");
        } finally {
            setIsSubmittingRestock(false);
        }
    }

    async function loadInventory(restaurantId = selectedRestaurantId) {
        if (!profile) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const result = await getManagerInventory(profile.appUserId, restaurantId);
            setSelectedRestaurantId(current => current === result.selectedRestaurantId ? current : result.selectedRestaurantId);
            storeManagerRestaurantId(result.selectedRestaurantId);
            setData(result.data);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load inventory.");
        } finally {
            setIsLoading(false);
        }
    }

    function exportPurchaseOrdersPdf(orders: ManagerPurchaseOrder[]) {
        if (orders.length === 0) {
            setActionMessage("No purchase orders were found for the selected day.");
            return;
        }

        downloadPurchaseOrdersPdf({
            restaurantName: selectedRestaurant?.name ?? "Smart Restaurant",
            reportDate: purchaseReportDate,
            orders
        });
        setActionMessage(`Downloaded ${orders.length} purchase order${orders.length === 1 ? "" : "s"} for ${purchaseReportDate}.`);
    }

    useEffect(() => {
        void loadInventory();
    }, [profile, selectedRestaurantId]);

    if (profileLoading || isLoading) {
        return (
            <main className="sa-content manager-shell--loading">
                <section className="manager-loading-card">
                    <div className="skeleton-block manager-loading-card__logo" />
                    <div className="skeleton-block manager-loading-card__line" />
                    <div className="skeleton-block manager-loading-card__body" />
                </section>
            </main>
        );
    }

    return (
        <div className={`sa-shell manager-layout ${sidebarOpen ? "sa-shell--sidebar-open" : ""}`}>
            <aside className="sa-sidebar manager-sidebar">
                <div className="sa-sidebar__brand">
                    <Link to="/manager" className="brand-mark">
                        <img className="brand-mark__image brand-mark__image--sidebar" src={brandLogo} alt="Smart Restaurant System" />
                    </Link>
                </div>

                <nav className="sa-nav admin-nav" aria-label="Manager">
                    {navItems.map(item => (
                        <NavLink
                            key={`${item.href}-${item.label}`}
                            to={item.href}
                            end={item.end}
                            className={({ isActive }) =>
                                `sa-nav__link admin-nav__link ${isActive ? "sa-nav__link--active admin-nav__link--active" : ""}`
                            }
                            onClick={() => setSidebarOpen(false)}
                        >
                            <item.icon size={18} aria-hidden="true" />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
            </aside>

            <div className="sa-main">
                <header className="sa-topbar">
                    <div className="sa-topbar__left">
                        <button
                            type="button"
                            className="icon-button sa-topbar__menu"
                            onClick={() => setSidebarOpen(current => !current)}
                            aria-label="Toggle sidebar"
                        >
                            <Menu size={18} />
                        </button>
                        <label className="sa-search">
                            <Search size={16} />
                            <input type="search" placeholder="Search manager records..." />
                        </label>
                    </div>

                    <div className="sa-topbar__right">
                        <label className={`admin-restaurant-switcher manager-restaurant-switcher ${canSwitchRestaurants ? "" : "manager-restaurant-switcher--static"}`}>
                            <Building2 size={16} />
                            {canSwitchRestaurants ? (
                                <>
                                    <span className="manager-restaurant-switcher__value">
                                        {selectedRestaurant?.name ?? "Choose restaurant"}
                                    </span>
                                    <select
                                        value={selectedRestaurantId ?? ""}
                                        onChange={event => setSelectedRestaurantId(Number(event.target.value))}
                                        aria-label="Choose managed restaurant"
                                    >
                                        {data.restaurants.map(restaurant => (
                                            <option key={restaurant.id} value={restaurant.id}>
                                                {restaurant.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} />
                                </>
                            ) : (
                                <span className="manager-restaurant-switcher__value">{selectedRestaurant?.name ?? "No restaurant assigned"}</span>
                            )}
                        </label>
                        <ThemeToggle theme={theme} onToggle={toggleTheme} />
                        <button type="button" className="icon-button" aria-label="Notifications" onClick={() => setNotificationsOpen(true)}>
                            <Bell size={18} />
                        </button>
                        <button type="button" className="sa-avatar" onClick={() => setProfileOpen(true)}>
                            <span>{avatar}</span>
                            <div className="sa-avatar__meta">
                                <strong>{localPart}</strong>
                                <small>{profile?.role ?? "Manager"}</small>
                            </div>
                            <ChevronDown size={16} />
                        </button>
                    </div>
                </header>

                <main className="sa-content manager-content">
                    <ManagerAiCompletionAlert />
                    <div className="admin-stack">
                        <header className="admin-page-header">
                            <div>
                                <h1>Inventory</h1>
                                <p>Track stock risk, supplier coverage, and restock spend for {selectedRestaurant?.name ?? "your restaurant"}.</p>
                            </div>
                        </header>

                        {error && <div className="manager-alert">{error}</div>}
                        {actionMessage && <div className="manager-alert manager-alert--success">{actionMessage}</div>}

                        <section className="manager-inventory-kpi-grid">
                            <article>
                                <span>Total stock value</span>
                                <strong>{money(stockValue)}</strong>
                                <small>{data.inventoryItems.length} tracked item{data.inventoryItems.length === 1 ? "" : "s"}</small>
                            </article>
                            <article>
                                <span><Truck size={15} /> Supplier coverage</span>
                                <strong>{data.inventoryItems.length - unassignedRows.length}/{data.inventoryItems.length}</strong>
                                <small>{unassignedRows.length} unassigned item{unassignedRows.length === 1 ? "" : "s"}</small>
                            </article>
                            <article>
                                <span><AlertTriangle size={15} /> Critical stock</span>
                                <strong>{criticalStockRows.length}</strong>
                                <small>At or below 2 units</small>
                            </article>
                        </section>

                        <section className="manager-inventory-chart-grid">
                            <article className="manager-panel manager-inventory-chart">
                                <header className="manager-panel__header">
                                    <div>
                                        <h2>Stock Value</h2>
                                        <p>Top inventory items by current value.</p>
                                    </div>
                                </header>
                                {itemValueChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={260}>
                                        <BarChart data={itemValueChartData} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={value => `$${value}`} />
                                            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={66} />
                                            <Tooltip
                                                cursor={{ fill: "rgba(124, 92, 255, 0.12)" }}
                                                contentStyle={{
                                                    background: "var(--surface-strong)",
                                                    border: "1px solid var(--line)",
                                                    borderRadius: "12px",
                                                    color: "var(--text)"
                                                }}
                                                labelStyle={{ color: "var(--text)", fontWeight: 800 }}
                                                itemStyle={{ color: "var(--primary)", fontWeight: 800 }}
                                                formatter={value => [money(Number(value)), "Stock value"]}
                                            />
                                            <Bar dataKey="value" fill="var(--primary)" radius={[0, 8, 8, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="manager-empty">No inventory value to chart.</p>
                                )}
                            </article>

                            <article className="manager-panel manager-inventory-chart">
                                <header className="manager-panel__header">
                                    <div>
                                        <h2>Supplier Load</h2>
                                        <p>Stock value distribution by supplier.</p>
                                    </div>
                                </header>
                                {supplierChartData.length > 0 ? (
                                    <div className="manager-inventory-donut-layout">
                                        <ResponsiveContainer width="100%" height={240}>
                                            <PieChart>
                                                <Tooltip
                                                    contentStyle={{
                                                        background: "var(--surface-strong)",
                                                        border: "1px solid var(--line)",
                                                        borderRadius: "12px",
                                                        color: "var(--text)"
                                                    }}
                                                    labelStyle={{ color: "var(--text)", fontWeight: 800 }}
                                                    itemStyle={{ color: "var(--primary)", fontWeight: 800 }}
                                                    formatter={value => [money(Number(value)), "Stock value"]}
                                                />
                                                <Pie
                                                    data={supplierChartData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    innerRadius={62}
                                                    outerRadius={92}
                                                    paddingAngle={3}
                                                >
                                                    {supplierChartData.map((entry, index) => (
                                                        <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="manager-inventory-donut-legend">
                                            {supplierChartData.map((entry, index) => (
                                                <article key={entry.name}>
                                                    <span style={{ background: chartColors[index % chartColors.length] }} />
                                                    <div>
                                                        <strong>{entry.name}</strong>
                                                        <small>{entry.items} item{entry.items === 1 ? "" : "s"} · {entry.low} low · {money(entry.value)}</small>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="manager-empty">No suppliers to chart.</p>
                                )}
                            </article>
                        </section>

                        <section className="manager-inventory-work-grid">
                            <article className="manager-panel manager-po-export-card">
                                <header className="manager-panel__header">
                                    <div>
                                        <h2>Purchase Order Receipt</h2>
                                        <p>Download a day-by-day receipt styled like your sample PDF, with all purchased items for that date.</p>
                                    </div>
                                </header>
                                <div className="manager-po-export-sheet">
                                    <div className="manager-po-export-sheet__eyebrow">
                                        <span>RECEIPT</span>
                                        <span>{selectedRestaurant?.name ?? "Smart Restaurant"}</span>
                                    </div>
                                    <div className="manager-po-export-sheet__title">
                                        <strong>PURCHASE ORDER</strong>
                                        <small>{selectedRestaurant?.name ?? "Smart Restaurant"} · {displayReportDate(purchaseReportDate)}</small>
                                    </div>
                                    <div className="manager-po-export-controls">
                                        <label className="manager-po-export-date">
                                            <span>Choose day</span>
                                            <input
                                                type="date"
                                                value={purchaseReportDate}
                                                max={todayInputValue()}
                                                onChange={event => setPurchaseReportDate(event.target.value)}
                                            />
                                        </label>
                                        <div className="manager-po-export-meta">
                                            <strong>{exportPurchaseOrders.length}</strong>
                                            <small>item order{exportPurchaseOrders.length === 1 ? "" : "s"} in receipt</small>
                                        </div>
                                        <Button
                                            onClick={() => exportPurchaseOrdersPdf(exportPurchaseOrders)}
                                            disabled={exportPurchaseOrders.length === 0}
                                        >
                                            Download PDF
                                        </Button>
                                    </div>
                                </div>
                            </article>

                            <article className="manager-panel manager-inventory-job manager-inventory-job--scrollable">
                                <header className="manager-panel__header">
                                    <div>
                                        <h2>Restock Job</h2>
                                        <p>{restockQueue.length > 0 ? `${restockQueue.length} item${restockQueue.length === 1 ? "" : "s"} below the ${restockTarget}-unit target.` : "No urgent restock needed."}</p>
                                    </div>
                                </header>
                                {restockQueue.length > 0 ? (
                                    <div className="manager-inventory-job-list">
                                        {restockQueue.map(row => {
                                            const suggestedUnits = Math.max(1, Math.ceil(restockTarget - row.item.quantity));

                                            return (
                                                <article key={row.item.id} className="manager-inventory-job-card">
                                                    <div className="manager-inventory-job-card__header">
                                                        <div>
                                                            <strong>{row.item.itemName}</strong>
                                                            <span>{row.supplier?.name ?? "Assign supplier first"}</span>
                                                        </div>
                                                        <span className={`manager-inventory-status manager-inventory-status--${row.tone}`}>
                                                            {row.status}
                                                        </span>
                                                    </div>
                                                    <dl>
                                                        <div><dt>Current</dt><dd>{row.item.quantity}</dd></div>
                                                        <div><dt>Total</dt><dd>{moneyExact(suggestedUnits * row.item.unitPrice)}</dd></div>
                                                    </dl>
                                                    <Button className="manager-restock-button" onClick={() => openRestockDraft(row)}>Draft Purchase Order</Button>
                                                </article>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="manager-empty">All tracked items are above the {restockTarget}-unit comfort line.</p>
                                )}
                            </article>

                        </section>

                        <section className="manager-panel manager-inventory-ledger">
                            <header className="manager-panel__header">
                                <div>
                                    <h2>Inventory Ledger</h2>
                                    <p>Search items and filter by supplier.</p>
                                </div>
                            </header>
                            <div className="manager-inventory-toolbar">
                                <div className="manager-menu-chip-row">
                                    <button
                                        type="button"
                                        className={activeSupplierId === "all" ? "manager-menu-chip manager-menu-chip--active" : "manager-menu-chip"}
                                        onClick={() => setActiveSupplierId("all")}
                                    >
                                        All suppliers
                                    </button>
                                    {data.suppliers.map(supplier => (
                                        <button
                                            key={supplier.id}
                                            type="button"
                                            className={activeSupplierId === supplier.id ? "manager-menu-chip manager-menu-chip--active" : "manager-menu-chip"}
                                            onClick={() => setActiveSupplierId(supplier.id)}
                                        >
                                            {supplier.name}
                                        </button>
                                    ))}
                                </div>
                                <label className="manager-orders-search manager-inventory-search">
                                    <Search size={16} />
                                    <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search stock..." />
                                </label>
                            </div>
                            <div className="manager-inventory-table-wrap">
                                <table className="manager-inventory-table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Supplier</th>
                                            <th>Quantity</th>
                                            <th>Unit Price</th>
                                            <th>Stock Value</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRows.map(row => (
                                            <tr
                                                key={row.item.id}
                                                className={selectedItemId === row.item.id ? "manager-inventory-table__row--selected" : ""}
                                                onClick={() => setSelectedItemId(row.item.id)}
                                            >
                                                <td>
                                                    <strong>{row.item.itemName}</strong>
                                                    <span>Added {dateLabel(row.item.createdAt)}</span>
                                                </td>
                                                <td>{row.supplier?.name ?? "Unassigned"}</td>
                                                <td>{row.item.quantity}</td>
                                                <td>{money(row.item.unitPrice)}</td>
                                                <td>{money(row.value)}</td>
                                                <td>
                                                    <span className={`manager-inventory-status manager-inventory-status--${row.tone}`}>
                                                        {row.status}
                                                    </span>
                                                    {row.item.quantity <= 5 && (
                                                        <button type="button" onClick={event => {
                                                            event.stopPropagation();
                                                            openRestockDraft(row);
                                                        }}>
                                                            Draft PO
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredRows.length === 0 && <p className="manager-empty">No inventory items found.</p>}
                            </div>
                        </section>
                    </div>
                </main>

                <Modal title="Notifications" open={notificationsOpen} onClose={() => setNotificationsOpen(false)}>
                    <div className="sa-activity-list">
                        <article className="sa-activity">
                            <p>No notifications yet.</p>
                        </article>
                    </div>
                </Modal>

                <Modal title="Inventory Action" open={Boolean(selectedRow) && !restockOpen} onClose={() => setSelectedItemId(null)}>
                    {selectedRow && (
                        <div className="manager-inventory-action-modal">
                            <div>
                                <span className={`manager-inventory-status manager-inventory-status--${selectedRow.tone}`}>
                                    {selectedRow.status}
                                </span>
                                <h3>{selectedRow.item.itemName}</h3>
                                <p>{selectedRow.supplier ? `${selectedRow.supplier.name} - ${selectedRow.supplier.contact ?? "No contact"}` : "No supplier assigned"}</p>
                            </div>
                            <dl>
                                <div><dt>Quantity</dt><dd>{selectedRow.item.quantity}</dd></div>
                                <div><dt>Unit price</dt><dd>{money(selectedRow.item.unitPrice)}</dd></div>
                                <div><dt>Stock value</dt><dd>{money(selectedRow.value)}</dd></div>
                            </dl>
                            <div className="sa-inline-actions">
                                <Button variant="secondary" onClick={() => setSelectedItemId(null)}>Close</Button>
                                <Button disabled={!selectedRow.supplier && data.suppliers.length === 0} onClick={() => openRestockDraft(selectedRow)}>
                                    Draft Purchase Order
                                </Button>
                            </div>
                        </div>
                    )}
                </Modal>

                <Modal title="Draft Purchase Order" open={restockOpen} onClose={closeRestockFlow}>
                    <div className="manager-inventory-action-modal">
                        <div>
                            <h3>{selectedRow?.item.itemName ?? "Restock item"}</h3>
                            <p>Prepare the quantity you want to order, then confirm before stock is updated.</p>
                        </div>
                        <label className="manager-inventory-form-field">
                            <span>Supplier</span>
                            <select value={restockSupplierId} onChange={event => setRestockSupplierId(Number(event.target.value))}>
                                <option value="" disabled>Choose supplier</option>
                                {data.suppliers.map(supplier => (
                                    <option key={supplier.id} value={supplier.id}>
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="manager-inventory-form-field">
                            <span>Quantity to order</span>
                            <input
                                min="1"
                                step="1"
                                type="number"
                                value={restockQuantity}
                                onChange={event => setRestockQuantity(event.target.value)}
                            />
                        </label>
                        <div className="manager-inventory-total-preview">
                            <span>Auto total</span>
                            <strong>{moneyExact(restockCalculatedTotal)}</strong>
                            <small>
                                {selectedRow
                                    ? `${restockQuantity || 0} x ${moneyExact(selectedRow.item.unitPrice)} from inventory item #${selectedRow.item.id}`
                                    : "Choose an item first"}
                            </small>
                            {selectedRow && projectedQuantity !== null && (
                                <small>Current {selectedRow.item.quantity} to after restock {projectedQuantity}</small>
                            )}
                        </div>
                        {actionMessage && <p className="manager-inventory-form-message">{actionMessage}</p>}
                        <div className="sa-inline-actions">
                            <Button variant="secondary" onClick={closeRestockFlow}>Cancel</Button>
                            <Button isLoading={isSubmittingRestock} onClick={requestRestockConfirmation}>
                                Review Order
                            </Button>
                        </div>
                    </div>
                </Modal>

                <Modal title="Confirm Purchase Order" open={restockConfirmOpen} onClose={() => setRestockConfirmOpen(false)}>
                    <div className="manager-inventory-action-modal">
                        <div>
                            <h3>{selectedRow?.item.itemName ?? "Restock item"}</h3>
                            <p>Confirm this purchase order. The inventory quantity will be updated immediately after the order is created.</p>
                        </div>
                        <dl>
                            <div><dt>Supplier</dt><dd>{selectedRow ? suppliersById.get(Number(restockSupplierId))?.name ?? "Unknown supplier" : "No item selected"}</dd></div>
                            <div><dt>Order qty</dt><dd>{restockQuantity || 0}</dd></div>
                            <div><dt>Current qty</dt><dd>{selectedRow?.item.quantity ?? 0}</dd></div>
                            <div><dt>New qty</dt><dd>{projectedQuantity ?? 0}</dd></div>
                            <div><dt>Order total</dt><dd>{moneyExact(restockCalculatedTotal)}</dd></div>
                            <div><dt>Status after order</dt><dd>{projectedQuantity !== null ? stockLabel(projectedQuantity) : "Unknown"}</dd></div>
                        </dl>
                        <div className="sa-inline-actions">
                            <Button variant="secondary" onClick={() => setRestockConfirmOpen(false)}>Back</Button>
                            <Button isLoading={isSubmittingRestock} onClick={submitRestockDraft}>
                                Confirm and Update Stock
                            </Button>
                        </div>
                    </div>
                </Modal>

                {profile ? (
                    <ProfileModal
                        open={profileOpen}
                        profile={profile}
                        primaryLabel={localPart}
                        onClose={() => setProfileOpen(false)}
                        onLogout={async () => {
                            await logout();
                            navigate("/login", { replace: true });
                        }}
                    />
                ) : null}
            </div>
        </div>
    );
}
