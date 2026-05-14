import {
    getAdminRestaurantMenuItems,
    getAdminRestaurantOrders,
    getAdminRestaurantTables,
    type AdminMenuItem,
    type AdminOrder,
    type AdminTable
} from "@/lib/admin/adminService";
import { authorizedApiFetch } from "@/lib/auth/authService";

export type KitchenDeviceOrderItem = {
    id: number;
    orderId: number;
    menuItemId: number;
    quantity: number;
    price: number;
    notes?: string | null;
};

export type KitchenDeviceData = {
    orders: AdminOrder[];
    tables: AdminTable[];
    menuItems: AdminMenuItem[];
    orderItems: KitchenDeviceOrderItem[];
};

export const emptyKitchenDeviceData: KitchenDeviceData = {
    orders: [],
    tables: [],
    menuItems: [],
    orderItems: []
};

async function readJson<T>(response: Response, fallback: string): Promise<T> {
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || fallback);
    }

    return (await response.json()) as T;
}

async function getKitchenOrderItems(restaurantId: number): Promise<KitchenDeviceOrderItem[]> {
    const response = await authorizedApiFetch(`/api/order-items/restaurant/${restaurantId}`);
    return readJson<KitchenDeviceOrderItem[]>(response, "Failed to load kitchen order items.");
}

export async function getKitchenDeviceData(restaurantId: number): Promise<KitchenDeviceData> {
    const [orders, tables, menuItems, orderItems] = await Promise.all([
        getAdminRestaurantOrders(restaurantId),
        getAdminRestaurantTables(restaurantId),
        getAdminRestaurantMenuItems(restaurantId),
        getKitchenOrderItems(restaurantId)
    ]);

    return {
        orders,
        tables,
        menuItems,
        orderItems
    };
}

export async function updateKitchenOrderStatus(orderId: number, status: "InProgress" | "Ready" | "Completed"): Promise<void> {
    const response = await authorizedApiFetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to update kitchen order status.");
    }
}
