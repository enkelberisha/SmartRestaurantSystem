import { authorizedApiFetch } from "@/lib/auth/authService";
import { getManagerRestaurantSelection } from "@/manager/services/managerRestaurantService";
import type {
    ManagerInventory,
    ManagerInventoryData,
    ManagerInventoryItem,
    ManagerPurchaseOrder,
    ManagerSupplier
} from "@/manager/types";

export const emptyManagerInventoryData: ManagerInventoryData = {
    restaurants: [],
    inventories: [],
    inventoryItems: [],
    suppliers: [],
    purchaseOrders: []
};

type PurchaseOrderReceiptCacheEntry = {
    purchaseOrderId: number;
    restaurantId: number;
    inventoryItemId: number;
    itemName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    createdAt: string;
};

const purchaseOrderReceiptCacheKey = "manager:purchaseOrderReceiptCache";

async function readJson<T>(response: Response, fallback: string): Promise<T> {
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || fallback);
    }

    return (await response.json()) as T;
}

function readPurchaseOrderReceiptCache(): PurchaseOrderReceiptCacheEntry[] {
    const raw = window.localStorage.getItem(purchaseOrderReceiptCacheKey);
    if (!raw) {
        return [];
    }

    try {
        return JSON.parse(raw) as PurchaseOrderReceiptCacheEntry[];
    } catch {
        return [];
    }
}

function writePurchaseOrderReceiptCache(entries: PurchaseOrderReceiptCacheEntry[]) {
    window.localStorage.setItem(purchaseOrderReceiptCacheKey, JSON.stringify(entries.slice(-200)));
}

function mergePurchaseOrderReceiptCache(orders: ManagerPurchaseOrder[]): ManagerPurchaseOrder[] {
    const cachedEntries = readPurchaseOrderReceiptCache();
    const cachedById = new Map(cachedEntries.map(entry => [entry.purchaseOrderId, entry]));

    return orders.map(order => {
        const cached = cachedById.get(order.id);
        if (!cached) {
            return order;
        }

        return {
            ...order,
            inventoryItemId: order.inventoryItemId ?? cached.inventoryItemId,
            itemName: order.itemName ?? cached.itemName,
            quantity: order.quantity ?? cached.quantity,
            unitPrice: order.unitPrice ?? cached.unitPrice,
            total: order.total || cached.total
        };
    });
}

async function getInventories(): Promise<ManagerInventory[]> {
    const response = await authorizedApiFetch("/api/inventory");
    return readJson<ManagerInventory[]>(response, "Failed to load inventories.");
}

async function getInventoryItems(): Promise<ManagerInventoryItem[]> {
    const response = await authorizedApiFetch("/api/inventory-items");
    return readJson<ManagerInventoryItem[]>(response, "Failed to load inventory items.");
}

async function getSuppliers(): Promise<ManagerSupplier[]> {
    const response = await authorizedApiFetch("/api/suppliers");
    return readJson<ManagerSupplier[]>(response, "Failed to load suppliers.");
}

async function getPurchaseOrders(restaurantId: number): Promise<ManagerPurchaseOrder[]> {
    const response = await authorizedApiFetch(`/api/purchase-orders/restaurant/${restaurantId}`);
    const orders = await readJson<ManagerPurchaseOrder[]>(response, "Failed to load purchase orders.");
    return mergePurchaseOrderReceiptCache(orders);
}

export async function createManagerPurchaseOrder(payload: {
    restaurantId: number;
    supplierId: number;
    inventoryItemId: number;
    quantity: number;
    total: number;
}): Promise<ManagerPurchaseOrder> {
    const response = await authorizedApiFetch("/api/purchase-orders", {
        method: "POST",
        body: JSON.stringify(payload)
    });

    return readJson<ManagerPurchaseOrder>(response, "Failed to create purchase order.");
}

export function storeManagerPurchaseOrderReceipt(entry: PurchaseOrderReceiptCacheEntry) {
    const entries = readPurchaseOrderReceiptCache().filter(existing => existing.purchaseOrderId !== entry.purchaseOrderId);
    entries.push(entry);
    writePurchaseOrderReceiptCache(entries);
}

export async function updateManagerInventoryItem(payload: ManagerInventoryItem): Promise<void> {
    const response = await authorizedApiFetch(`/api/inventory-items/${payload.id}`, {
        method: "PUT",
        body: JSON.stringify({
            itemName: payload.itemName,
            quantity: payload.quantity,
            unitPrice: payload.unitPrice,
            supplierId: payload.supplierId
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to update inventory item.");
    }
}

export async function getManagerInventory(
    managerUserId: number,
    selectedRestaurantId: number | null
): Promise<{ data: ManagerInventoryData; selectedRestaurantId: number | null }> {
    const { restaurants, restaurantId } = await getManagerRestaurantSelection(managerUserId, selectedRestaurantId);

    if (!restaurantId) {
        return {
            selectedRestaurantId: null,
            data: {
                ...emptyManagerInventoryData,
                restaurants
            }
        };
    }

    const [allInventories, allInventoryItems, allSuppliers, purchaseOrders] = await Promise.all([
        getInventories(),
        getInventoryItems(),
        getSuppliers(),
        getPurchaseOrders(restaurantId)
    ]);
    const inventories = allInventories.filter(inventory => inventory.restaurantId === restaurantId);
    const inventoryIds = new Set(inventories.map(inventory => inventory.id));
    const inventoryItems = allInventoryItems.filter(item => inventoryIds.has(item.inventoryId));
    const suppliers = allSuppliers.filter(supplier => supplier.restaurantId === restaurantId);

    return {
        selectedRestaurantId: restaurantId,
        data: {
            restaurants,
            inventories,
            inventoryItems,
            suppliers,
            purchaseOrders
        }
    };
}
