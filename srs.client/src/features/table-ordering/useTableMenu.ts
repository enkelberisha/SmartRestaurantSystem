import { useEffect, useState } from "react";
import { getAdminMenuItems, getAdminMenus, getAdminRestaurantMenuItems, getAdminRestaurantMenus } from "@/lib/admin/adminService";
import type { MenuItem } from "@/features/table-ordering/types";
import { mapMenuItems } from "@/features/table-ordering/utils";

export function useTableMenu(isSessionOpen: boolean, restaurantId: number | null) {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isSessionOpen || restaurantId === null) {
            return;
        }

        let isMounted = true;
        const activeRestaurantId = restaurantId;

        async function loadMenu() {
            try {
                setIsLoading(true);
                const [menus, liveItems] = await Promise.all(
                    activeRestaurantId > 0
                        ? [getAdminRestaurantMenus(activeRestaurantId), getAdminRestaurantMenuItems(activeRestaurantId)]
                        : [getAdminMenus(), getAdminMenuItems()]
                );
                const mappedItems = mapMenuItems(liveItems, menus);
                if (isMounted) {
                    setItems(mappedItems);
                }
            } catch {
                if (isMounted) {
                    setItems([]);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void loadMenu();

        return () => {
            isMounted = false;
        };
    }, [isSessionOpen, restaurantId]);

    return { isLoading, items };
}
