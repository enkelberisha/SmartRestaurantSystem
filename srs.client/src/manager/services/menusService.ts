import {
    getAdminRestaurantMenuItems,
    getAdminRestaurantMenus,
    getAdminRestaurantOrders
} from "@/lib/admin/adminService";
import { authorizedApiFetch } from "@/lib/auth/authService";
import { getManagerRestaurantSelection } from "@/manager/services/managerRestaurantService";
import type { ManagerMenusData, ManagerOrderItem } from "@/manager/types";

export const emptyManagerMenusData: ManagerMenusData = {
    restaurants: [],
    menus: [],
    menuItems: [],
    orders: [],
    orderItems: []
};

async function readJson<T>(response: Response, fallback: string): Promise<T> {
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || fallback);
    }

    return (await response.json()) as T;
}

async function getManagerOrderItems(restaurantId: number): Promise<ManagerOrderItem[]> {
    const response = await authorizedApiFetch(`/api/order-items/restaurant/${restaurantId}`);
    return readJson<ManagerOrderItem[]>(response, "Failed to load order items.");
}

export async function getManagerMenus(
    managerUserId: number,
    selectedRestaurantId: number | null
): Promise<{ data: ManagerMenusData; selectedRestaurantId: number | null }> {
    const { restaurants, restaurantId } = await getManagerRestaurantSelection(managerUserId, selectedRestaurantId);

    if (!restaurantId) {
        return {
            selectedRestaurantId: null,
            data: {
                ...emptyManagerMenusData,
                restaurants
            }
        };
    }

    const [menus, menuItems, orders, orderItems] = await Promise.all([
        getAdminRestaurantMenus(restaurantId),
        getAdminRestaurantMenuItems(restaurantId),
        getAdminRestaurantOrders(restaurantId),
        getManagerOrderItems(restaurantId)
    ]);

    return {
        selectedRestaurantId: restaurantId,
        data: {
            restaurants,
            menus,
            menuItems,
            orders,
            orderItems
        }
    };
}
