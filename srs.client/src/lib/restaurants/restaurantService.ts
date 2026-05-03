import { authorizedApiFetch } from "@/lib/auth/authService";

export type Restaurant = {
    id: number;
    tenantId: string;
    name: string;
    location: string;
    ownerId: number | null;
    managerId: number | null;
};

type RestaurantRequest = {
    name: string;
    location: string;
};

export async function getCurrentRestaurant(): Promise<Restaurant | null> {
    const response = await authorizedApiFetch("/api/restaurants/current");

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error("Could not load the restaurant.");
    }

    return (await response.json()) as Restaurant;
}

export async function createRestaurant(request: RestaurantRequest): Promise<Restaurant> {
    const response = await authorizedApiFetch("/api/restaurants", {
        method: "POST",
        body: JSON.stringify(request)
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "Could not create the restaurant.");
    }

    return (await response.json()) as Restaurant;
}

export async function updateRestaurant(id: number, request: RestaurantRequest): Promise<Restaurant> {
    const response = await authorizedApiFetch(`/api/restaurants/${id}`, {
        method: "PUT",
        body: JSON.stringify(request)
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "Could not update the restaurant.");
    }

    return (await response.json()) as Restaurant;
}
