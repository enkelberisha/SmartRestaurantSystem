import {
    getAdminRestaurantMenuItems,
    getAdminRestaurantOrders,
    getAdminRestaurantReservations,
    getAdminRestaurantTables,
    getAdminRestaurants
} from "@/lib/admin/adminService";
import { authorizedApiFetch } from "@/lib/auth/authService";
import type { ManagerDashboardData, ManagerOrderItem } from "@/manager/types";

export const emptyManagerDashboardData: ManagerDashboardData = {
    restaurants: [],
    orders: [],
    reservations: [],
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

async function getManagerOrderItems(): Promise<ManagerOrderItem[]> {
    const response = await authorizedApiFetch("/api/order-items");
    return readJson<ManagerOrderItem[]>(response, "Failed to load order items.");
}

export async function getManagerDashboard(
    managerUserId: number,
    selectedRestaurantId: number | null
): Promise<{ data: ManagerDashboardData; selectedRestaurantId: number | null }> {
    const restaurants = await getAdminRestaurants();
    const managedRestaurants = restaurants.filter(restaurant => restaurant.managerId === managerUserId);
    const visibleRestaurants = managedRestaurants.length > 0 ? managedRestaurants : restaurants;
    const restaurantId = selectedRestaurantId && visibleRestaurants.some(restaurant => restaurant.id === selectedRestaurantId)
        ? selectedRestaurantId
        : visibleRestaurants[0]?.id ?? null;

    if (!restaurantId) {
        return {
            selectedRestaurantId: null,
            data: {
                ...emptyManagerDashboardData,
                restaurants: visibleRestaurants
            }
        };
    }

    const [orders, reservations, tables, menuItems, orderItems] = await Promise.all([
        getAdminRestaurantOrders(restaurantId),
        getAdminRestaurantReservations(restaurantId),
        getAdminRestaurantTables(restaurantId),
        getAdminRestaurantMenuItems(restaurantId),
        getManagerOrderItems()
    ]);

    return {
        selectedRestaurantId: restaurantId,
        data: {
            restaurants: visibleRestaurants,
            orders,
            reservations,
            tables,
            menuItems,
            orderItems
        }
    };
}
