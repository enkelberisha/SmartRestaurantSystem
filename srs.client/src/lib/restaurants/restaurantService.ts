import { supabase } from "@/lib/supabase/client";

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

async function createAuthorizedHeaders() {
    const {
        data: { session }
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;
    if (!accessToken) {
        throw new Error("You are not signed in.");
    }

    return {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
    };
}

export async function getCurrentRestaurant(): Promise<Restaurant | null> {
    const headers = await createAuthorizedHeaders();
    const response = await fetch("/api/restaurants/current", { headers });

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error("Could not load the restaurant.");
    }

    return (await response.json()) as Restaurant;
}

export async function createRestaurant(request: RestaurantRequest): Promise<Restaurant> {
    const headers = await createAuthorizedHeaders();
    const response = await fetch("/api/restaurants", {
        method: "POST",
        headers,
        body: JSON.stringify(request)
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "Could not create the restaurant.");
    }

    return (await response.json()) as Restaurant;
}

export async function updateRestaurant(id: number, request: RestaurantRequest): Promise<Restaurant> {
    const headers = await createAuthorizedHeaders();
    const response = await fetch(`/api/restaurants/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(request)
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "Could not update the restaurant.");
    }

    return (await response.json()) as Restaurant;
}
