import {
    getAdminRestaurantMenuItems,
    getAdminRestaurantOrders,
    getAdminRestaurantStaff,
    getAdminRestaurantTables,
    type AdminOrder
} from "@/lib/admin/adminService";
import { authorizedApiFetch } from "@/lib/auth/authService";
import type { PosFloorData, PosOrderItem, PosWaiterSession } from "@/features/pos/types";

export const demoWaiterSession: PosWaiterSession = {
    staffId: -1,
    fullName: "Demo Waiter",
    restaurantId: 0,
    tenantId: "demo-tenant",
    sessionId: -1,
    openedAt: new Date().toISOString()
};

async function readJson<T>(response: Response, fallback: string): Promise<T> {
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || fallback);
    }

    return (await response.json()) as T;
}

export async function loginWaiter(credentialValue: string): Promise<PosWaiterSession> {
    const response = await authorizedApiFetch("/api/pos/waiter-login", {
        method: "POST",
        body: JSON.stringify({ credentialValue })
    });

    return readJson<PosWaiterSession>(response, "Waiter login failed.");
}

export async function getRestaurantOrderItems(restaurantId: number): Promise<PosOrderItem[]> {
    const response = await authorizedApiFetch(`/api/order-items/restaurant/${restaurantId}`);
    return readJson<PosOrderItem[]>(response, "Failed to load order items.");
}

export async function createPosOrder(tableId: number): Promise<AdminOrder> {
    const response = await authorizedApiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({ tableId })
    });

    return readJson<AdminOrder>(response, "Failed to create order.");
}

export async function createPosOrderItem(orderId: number, menuItemId: number, quantity: number): Promise<PosOrderItem> {
    const response = await authorizedApiFetch("/api/order-items", {
        method: "POST",
        body: JSON.stringify({ orderId, menuItemId, quantity })
    });

    return readJson<PosOrderItem>(response, "Failed to add item to order.");
}

export async function loadPosFloorData(restaurantId: number): Promise<PosFloorData> {
    const [tables, staff, orders, menuItems, orderItems] = await Promise.all([
        getAdminRestaurantTables(restaurantId),
        getAdminRestaurantStaff(restaurantId),
        getAdminRestaurantOrders(restaurantId),
        getAdminRestaurantMenuItems(restaurantId),
        getRestaurantOrderItems(restaurantId)
    ]);

    return { tables, staff, orders, menuItems, orderItems };
}
