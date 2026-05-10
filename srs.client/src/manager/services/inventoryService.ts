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

async function readJson<T>(response: Response, fallback: string): Promise<T> {
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || fallback);
    }

    return (await response.json()) as T;
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
    return readJson<ManagerPurchaseOrder[]>(response, "Failed to load purchase orders.");
}

export async function createManagerPurchaseOrder(payload: {
    restaurantId: number;
    supplierId: number;
    total: number;
}): Promise<ManagerPurchaseOrder> {
    const response = await authorizedApiFetch("/api/purchase-orders", {
        method: "POST",
        body: JSON.stringify(payload)
    });

    return readJson<ManagerPurchaseOrder>(response, "Failed to create purchase order.");
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
