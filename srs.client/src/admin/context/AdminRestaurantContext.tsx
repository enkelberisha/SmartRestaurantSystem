import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getAdminRestaurants, type AdminRestaurant } from "@/lib/admin/adminService";
import { AdminRestaurantContext } from "@/admin/context/adminRestaurantContextValue";

const storageKey = "srs.admin.selectedRestaurantId";

export function AdminRestaurantProvider({ children }: { children: ReactNode }) {
    const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
    const [selectedRestaurantId, setSelectedRestaurantIdState] = useState<number | "all">(() => {
        const stored = window.localStorage.getItem(storageKey);
        return stored ? Number(stored) : "all";
    });
    const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(true);

    const setSelectedRestaurantId = useCallback((restaurantId: number | "all") => {
        setSelectedRestaurantIdState(restaurantId);

        if (restaurantId === "all") {
            window.localStorage.removeItem(storageKey);
        } else {
            window.localStorage.setItem(storageKey, String(restaurantId));
        }
    }, []);

    const refreshRestaurants = useCallback(async (preferredRestaurantId?: number) => {
        const nextRestaurants = await getAdminRestaurants();
        setRestaurants(nextRestaurants);

        if (preferredRestaurantId) {
            setSelectedRestaurantId(preferredRestaurantId);
        } else if (
            selectedRestaurantId !== "all" &&
            !nextRestaurants.some(restaurant => restaurant.id === selectedRestaurantId)
        ) {
            setSelectedRestaurantId("all");
        }

        return nextRestaurants;
    }, [selectedRestaurantId, setSelectedRestaurantId]);

    useEffect(() => {
        let isMounted = true;

        async function loadRestaurants() {
            try {
                setIsLoadingRestaurants(true);
                const loadedRestaurants = await getAdminRestaurants();

                if (!isMounted) {
                    return;
                }

                setRestaurants(loadedRestaurants);
                setSelectedRestaurantIdState(current =>
                    current === "all" || loadedRestaurants.some(restaurant => restaurant.id === current)
                        ? current
                        : "all"
                );
            } finally {
                if (isMounted) {
                    setIsLoadingRestaurants(false);
                }
            }
        }

        void loadRestaurants();

        return () => {
            isMounted = false;
        };
    }, []);

    const selectedRestaurant = selectedRestaurantId === "all"
        ? null
        : restaurants.find(restaurant => restaurant.id === selectedRestaurantId) ?? null;

    const value = useMemo(
        () => ({
            restaurants,
            selectedRestaurant,
            selectedRestaurantId,
            isLoadingRestaurants,
            setSelectedRestaurantId,
            refreshRestaurants
        }),
        [restaurants, selectedRestaurant, selectedRestaurantId, isLoadingRestaurants, setSelectedRestaurantId, refreshRestaurants]
    );

    return (
        <AdminRestaurantContext.Provider value={value}>
            {children}
        </AdminRestaurantContext.Provider>
    );
}
