import { getAdminRestaurants, type AdminRestaurant } from "@/lib/admin/adminService";

const selectedRestaurantStorageKey = "manager:selectedRestaurantId";

export function getStoredManagerRestaurantId(): number | null {
    const value = window.localStorage.getItem(selectedRestaurantStorageKey);
    const id = value ? Number(value) : null;
    return id && Number.isFinite(id) ? id : null;
}

export function storeManagerRestaurantId(restaurantId: number | null) {
    if (restaurantId) {
        window.localStorage.setItem(selectedRestaurantStorageKey, String(restaurantId));
        return;
    }

    window.localStorage.removeItem(selectedRestaurantStorageKey);
}

export async function getManagerRestaurantSelection(
    managerUserId: number,
    selectedRestaurantId: number | null
): Promise<{ restaurants: AdminRestaurant[]; restaurantId: number | null }> {
    const restaurants = await getAdminRestaurants();
    const managedRestaurants = restaurants.filter(restaurant => restaurant.managerId === managerUserId);
    const visibleRestaurants = managedRestaurants.length > 0 ? managedRestaurants : restaurants;
    const restaurantId = selectedRestaurantId && visibleRestaurants.some(restaurant => restaurant.id === selectedRestaurantId)
        ? selectedRestaurantId
        : visibleRestaurants[0]?.id ?? null;

    return {
        restaurants: visibleRestaurants,
        restaurantId
    };
}
