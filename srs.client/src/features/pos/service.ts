import {
    getAdminRestaurantMenus,
    getAdminRestaurantMenuItems,
    getAdminRestaurantOrders,
    getAdminRestaurantStaff,
    getAdminRestaurantTables,
    type AdminOrder
} from "@/lib/admin/adminService";
import { authorizedApiFetch } from "@/lib/auth/authService";
import type { PosFloorData, PosOrderItem, PosWaiterSession } from "@/features/pos/types";

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

export async function createPosPayment(orderId: number, amount: number, method: "Card" | "Cash" | "Online") {
    const response = await authorizedApiFetch("/api/payments", {
        method: "POST",
        body: JSON.stringify({ orderId, amount, method })
    });

    return readJson<{ id: number; orderId: number; amount: number; method: string; status: string; createdAt: string }>(
        response,
        "Failed to create payment."
    );
}

export async function completePosPayment(paymentId: number) {
    const response = await authorizedApiFetch(`/api/payments/${paymentId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "Completed" })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to complete payment.");
    }
}

export async function completePosOrder(orderId: number) {
    const response = await authorizedApiFetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "Completed" })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to complete order.");
    }
}

export async function updatePosOrderStatus(orderId: number, status: "InProgress" | "Completed") {
    const response = await authorizedApiFetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to update order status to ${status}.`);
    }
}

export async function loadPosFloorData(restaurantId: number): Promise<PosFloorData> {
    const [tables, staff, orders, menus, menuItems, orderItems] = await Promise.all([
        getAdminRestaurantTables(restaurantId),
        getAdminRestaurantStaff(restaurantId),
        getAdminRestaurantOrders(restaurantId),
        getAdminRestaurantMenus(restaurantId),
        getAdminRestaurantMenuItems(restaurantId),
        getRestaurantOrderItems(restaurantId)
    ]);

    return { tables, staff, orders, menus, menuItems, orderItems };
}
