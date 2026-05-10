import {
    getAdminRestaurantStaff,
    getAdminRestaurantTables
} from "@/lib/admin/adminService";
import { authorizedApiFetch } from "@/lib/auth/authService";
import { getManagerRestaurantSelection } from "@/manager/services/managerRestaurantService";
import type { ManagerKitchenData, ManagerShift } from "@/manager/types";

export const emptyManagerKitchenData: ManagerKitchenData = {
    restaurants: [],
    tables: [],
    staff: [],
    shifts: []
};

async function readJson<T>(response: Response, fallback: string): Promise<T> {
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || fallback);
    }

    return (await response.json()) as T;
}

async function getManagerShifts(restaurantId: number): Promise<ManagerShift[]> {
    const response = await authorizedApiFetch(`/api/shifts/restaurant/${restaurantId}`);
    return readJson<ManagerShift[]>(response, "Failed to load shifts.");
}

export async function getManagerKitchen(
    managerUserId: number,
    selectedRestaurantId: number | null
): Promise<{ data: ManagerKitchenData; selectedRestaurantId: number | null }> {
    const { restaurants, restaurantId } = await getManagerRestaurantSelection(managerUserId, selectedRestaurantId);

    if (!restaurantId) {
        return {
            selectedRestaurantId: null,
            data: {
                ...emptyManagerKitchenData,
                restaurants
            }
        };
    }

    const [tables, staff, shifts] = await Promise.all([
        getAdminRestaurantTables(restaurantId),
        getAdminRestaurantStaff(restaurantId),
        getManagerShifts(restaurantId)
    ]);

    return {
        selectedRestaurantId: restaurantId,
        data: {
            restaurants,
            tables,
            staff,
            shifts
        }
    };
}
