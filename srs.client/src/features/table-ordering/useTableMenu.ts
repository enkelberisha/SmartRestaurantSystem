import { useEffect, useState } from "react";
import { getAdminMenuItems, getAdminMenus, getAdminRestaurantMenuItems, getAdminRestaurantMenus, getMenuItemFilters } from "@/lib/admin/adminService";
import type { MenuItemFilter } from "@/lib/admin/adminService";
import type { MenuItem } from "@/features/table-ordering/types";
import { mapMenuItems } from "@/features/table-ordering/utils";

export function useTableMenu(isSessionOpen: boolean, restaurantId: number | null, searchTerm = "", activeFilters: string[] = []) {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [filters, setFilters] = useState<MenuItemFilter[]>([]);
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
                const [menus, liveItems, availableFilters] = await Promise.all(
                    activeRestaurantId > 0
                        ? [
                            getAdminRestaurantMenus(activeRestaurantId),
                            getAdminRestaurantMenuItems(activeRestaurantId, searchTerm, activeFilters),
                            getMenuItemFilters(activeRestaurantId)
                        ]
                        : [getAdminMenus(), getAdminMenuItems(searchTerm, activeFilters), getMenuItemFilters()]
                );
                const mappedItems = mapMenuItems(liveItems, menus);
                if (isMounted) {
                    setItems(mappedItems);
                    setFilters(availableFilters);
                }
            } catch {
                if (isMounted) {
                    setItems([]);
                    setFilters([]);
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
    }, [isSessionOpen, restaurantId, searchTerm, activeFilters]);

    return { filters, isLoading, items };
}
