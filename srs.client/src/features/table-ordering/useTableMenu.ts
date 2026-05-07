import { useEffect, useState } from "react";
import { getAdminMenuItems, getAdminMenus } from "@/lib/admin/adminService";
import type { MenuItem } from "@/features/table-ordering/types";
import { mapMenuItems } from "@/features/table-ordering/utils";

export function useTableMenu(isSessionOpen: boolean) {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isSessionOpen) {
            return;
        }

        let isMounted = true;

        async function loadMenu() {
            try {
                setIsLoading(true);
                const [menus, liveItems] = await Promise.all([getAdminMenus(), getAdminMenuItems()]);
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
    }, [isSessionOpen]);

    return { isLoading, items };
}
