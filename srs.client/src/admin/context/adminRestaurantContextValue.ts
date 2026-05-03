import { createContext, useContext } from "react";
import type { AdminRestaurant } from "@/lib/admin/adminService";

export type AdminRestaurantContextValue = {
    restaurants: AdminRestaurant[];
    selectedRestaurant: AdminRestaurant | null;
    selectedRestaurantId: number | "all";
    isLoadingRestaurants: boolean;
    setSelectedRestaurantId: (restaurantId: number | "all") => void;
    refreshRestaurants: (preferredRestaurantId?: number) => Promise<AdminRestaurant[]>;
};

export const AdminRestaurantContext = createContext<AdminRestaurantContextValue | null>(null);

export function useAdminRestaurant() {
    const context = useContext(AdminRestaurantContext);

    if (!context) {
        throw new Error("useAdminRestaurant must be used inside AdminRestaurantProvider.");
    }

    return context;
}
