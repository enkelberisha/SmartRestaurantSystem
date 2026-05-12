import {
    getAdminRestaurantOrders,
    getAdminRestaurantTables,
    updateAdminTable,
    type AdminTable,
    type TableStatus
} from "@/lib/admin/adminService";
import { authorizedApiFetch } from "@/lib/auth/authService";
import { getManagerRestaurantSelection } from "@/manager/services/managerRestaurantService";
import type { ManagerOrderItem, ManagerTablesData } from "@/manager/types";

export const emptyManagerTablesData: ManagerTablesData = {
    restaurants: [],
    orders: [],
    tables: [],
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

export async function getManagerTables(
    managerUserId: number,
    selectedRestaurantId: number | null
): Promise<{ data: ManagerTablesData; selectedRestaurantId: number | null }> {
    const { restaurants, restaurantId } = await getManagerRestaurantSelection(managerUserId, selectedRestaurantId);

    if (!restaurantId) {
        return {
            selectedRestaurantId: null,
            data: {
                ...emptyManagerTablesData,
                restaurants
            }
        };
    }

    const [orders, tables, orderItems] = await Promise.all([
        getAdminRestaurantOrders(restaurantId),
        getAdminRestaurantTables(restaurantId),
        getManagerOrderItems(restaurantId)
    ]);

    return {
        selectedRestaurantId: restaurantId,
        data: {
            restaurants,
            orders,
            tables,
            orderItems
        }
    };
}

export async function updateManagerTableStatus(table: AdminTable, status: TableStatus) {
    return updateAdminTable(table.id, {
        restaurantId: table.restaurantId,
        number: table.number,
        capacity: table.capacity,
        status
    });
}
