import { useEffect, useMemo, useState } from "react";
import {
    getAdminMenuItems,
    getAdminMenus,
    getAdminOrders,
    getAdminReservations,
    getAdminRestaurants,
    getAdminStaff,
    getAdminTables,
    type AdminMenu,
    type AdminMenuItem,
    type AdminOrder,
    type AdminReservation,
    type AdminRestaurant,
    type AdminStaff,
    type AdminTable
} from "@/lib/admin/adminService";
import { getOwnerAnalytics, type OwnerAnalytics } from "@/features/owner/ownerAnalyticsService";
import type { OwnerDashboardData, RestaurantScope } from "@/features/owner/types";
import { normalizeStatus, openOrderStatuses, percent } from "@/features/owner/ownerUtils";

const cancelledStatuses = new Set(["cancelled", "canceled"]);
const completedStatuses = new Set(["paid", "completed"]);

export function useOwnerDashboard(selectedRestaurantId: RestaurantScope): {
    data: OwnerDashboardData;
    error: string | null;
    isLoading: boolean;
} {
    const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
    const [tables, setTables] = useState<AdminTable[]>([]);
    const [staff, setStaff] = useState<AdminStaff[]>([]);
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [reservations, setReservations] = useState<AdminReservation[]>([]);
    const [menus, setMenus] = useState<AdminMenu[]>([]);
    const [menuItems, setMenuItems] = useState<AdminMenuItem[]>([]);
    const [analytics, setAnalytics] = useState<OwnerAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function loadOwnerDashboard() {
            try {
                setIsLoading(true);
                setError(null);

                const [
                    restaurantResult,
                    tableResult,
                    staffResult,
                    orderResult,
                    reservationResult,
                    menuResult,
                    menuItemResult,
                    analyticsResult
                ] = await Promise.all([
                    getAdminRestaurants(),
                    getAdminTables(),
                    getAdminStaff(),
                    getAdminOrders(),
                    getAdminReservations(),
                    getAdminMenus(),
                    getAdminMenuItems(),
                    getOwnerAnalytics(selectedRestaurantId)
                ]);

                if (!isMounted) {
                    return;
                }

                setRestaurants(restaurantResult);
                setTables(tableResult);
                setStaff(staffResult);
                setOrders(orderResult);
                setReservations(reservationResult);
                setMenus(menuResult);
                setMenuItems(menuItemResult);
                setAnalytics(analyticsResult);
            } catch (loadError) {
                if (isMounted) {
                    setError(loadError instanceof Error ? loadError.message : "Could not load owner dashboard.");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void loadOwnerDashboard();

        return () => {
            isMounted = false;
        };
    }, [selectedRestaurantId]);

    const data = useMemo<OwnerDashboardData>(() => {
        const restaurantById = new Map(restaurants.map(restaurant => [restaurant.id, restaurant]));
        const tablesById = new Map(tables.map(table => [table.id, table]));
        const selectedRestaurant = selectedRestaurantId === "all"
            ? null
            : restaurantById.get(selectedRestaurantId) ?? null;
        const scopedTables = selectedRestaurantId === "all"
            ? tables
            : tables.filter(table => table.restaurantId === selectedRestaurantId);
        const scopedTableIds = new Set(scopedTables.map(table => table.id));
        const scopedStaff = selectedRestaurantId === "all"
            ? staff
            : staff.filter(member => member.restaurantId === selectedRestaurantId);
        const scopedMenus = selectedRestaurantId === "all"
            ? menus
            : menus.filter(menu => menu.restaurantId === selectedRestaurantId);
        const scopedMenuIds = new Set(scopedMenus.map(menu => menu.id));
        const scopedMenuItems = selectedRestaurantId === "all"
            ? menuItems
            : menuItems.filter(item => scopedMenuIds.has(item.menuId));
        const scopedOrders = selectedRestaurantId === "all"
            ? orders
            : orders.filter(order => scopedTableIds.has(order.tableId));
        const scopedReservations = selectedRestaurantId === "all"
            ? reservations
            : reservations.filter(reservation => scopedTableIds.has(reservation.tableId));
        const nonCancelledScopedOrders = scopedOrders.filter(order => !cancelledStatuses.has(normalizeStatus(order.status)));
        const fallbackPaidRevenue = scopedOrders
            .filter(order => completedStatuses.has(normalizeStatus(order.status)))
            .reduce((sum, order) => sum + order.total, 0);
        const fallbackBookedRevenue = nonCancelledScopedOrders.reduce((sum, order) => sum + order.total, 0);
        const fallbackOpenOrderValue = scopedOrders
            .filter(order => openOrderStatuses.has(normalizeStatus(order.status)))
            .reduce((sum, order) => sum + order.total, 0);
        const fallbackCancelledRevenue = scopedOrders
            .filter(order => cancelledStatuses.has(normalizeStatus(order.status)))
            .reduce((sum, order) => sum + order.total, 0);
        const fallbackActiveOrders = scopedOrders.filter(order => openOrderStatuses.has(normalizeStatus(order.status))).length;
        const fallbackCompletedOrders = scopedOrders.filter(order => completedStatuses.has(normalizeStatus(order.status))).length;
        const fallbackCancelledOrders = scopedOrders.filter(order => cancelledStatuses.has(normalizeStatus(order.status))).length;
        const fallbackOccupiedTables = scopedTables.filter(table => table.status === "Occupied").length;
        const fallbackReservedTables = scopedTables.filter(table => table.status === "Reserved").length;
        const fallbackAvailableTables = scopedTables.filter(table => table.status === "Available").length;
        const fallbackAverageTicket = nonCancelledScopedOrders.length > 0 ? fallbackBookedRevenue / nonCancelledScopedOrders.length : 0;
        const fallbackOccupancyRate = percent(fallbackOccupiedTables + fallbackReservedTables, scopedTables.length);
        const paidRevenue = analytics?.paidRevenue ?? fallbackPaidRevenue;
        const bookedRevenue = analytics?.bookedRevenue ?? fallbackBookedRevenue;
        const openOrderValue = analytics?.openOrderValue ?? fallbackOpenOrderValue;
        const cancelledRevenue = analytics?.cancelledRevenue ?? fallbackCancelledRevenue;
        const activeOrders = analytics?.activeOrders ?? fallbackActiveOrders;
        const completedOrders = analytics?.completedOrders ?? fallbackCompletedOrders;
        const cancelledOrders = analytics?.cancelledOrders ?? fallbackCancelledOrders;
        const occupiedTables = analytics?.occupiedTables ?? fallbackOccupiedTables;
        const reservedTables = analytics?.reservedTables ?? fallbackReservedTables;
        const availableTables = analytics?.availableTables ?? fallbackAvailableTables;
        const averageTicket = analytics?.averageTicket ?? fallbackAverageTicket;
        const occupancyRate = analytics?.occupancyRate ?? fallbackOccupancyRate;
        const tabletReadyTables = scopedTables.filter(table => table.status !== "OutOfService").length;
        const adr = analytics?.adr ?? averageTicket;
        const revenuePerAvailableSeat = analytics?.revenuePerAvailableSeat ?? 0;
        const revpash = analytics?.revpash ?? 0;
        const serviceCaptureRate = analytics?.serviceCaptureRate ?? 0;
        const paymentCaptureRate = analytics?.paymentCaptureRate ?? percent(paidRevenue, bookedRevenue);
        const completionRate = analytics?.completionRate ?? percent(completedOrders, nonCancelledScopedOrders.length);
        const inventoryValue = analytics?.inventoryValue ?? 0;
        const inventoryItemCount = analytics?.inventoryItemCount ?? 0;
        const lowStockItems = analytics?.lowStockItems ?? 0;
        const outOfStockItems = analytics?.outOfStockItems ?? 0;
        const inventorySupplierCount = analytics?.inventorySupplierCount ?? 0;
        const recentPurchaseOrderSpend = analytics?.recentPurchaseOrderSpend ?? 0;
        const recentPurchaseOrderCount = analytics?.recentPurchaseOrderCount ?? 0;
        const analyticsByRestaurantId = new Map(
            (analytics?.restaurants ?? []).map(row => [row.restaurantId, row])
        );
        const orderStatusCounts = new Map<string, number>();
        const staffMixCounts = new Map<string, number>();

        scopedOrders.forEach(order => {
            orderStatusCounts.set(order.status, (orderStatusCounts.get(order.status) ?? 0) + 1);
        });
        scopedStaff.forEach(member => {
            staffMixCounts.set(member.credentialType, (staffMixCounts.get(member.credentialType) ?? 0) + 1);
        });

        const revenueByRestaurant = restaurants.map(restaurant => {
            const restaurantTableIds = new Set(
                tables.filter(table => table.restaurantId === restaurant.id).map(table => table.id)
            );
            const restaurantOrders = orders.filter(order => restaurantTableIds.has(order.tableId));
            const restaurantAnalytics = analyticsByRestaurantId.get(restaurant.id);
            const restaurantRevenue = restaurantAnalytics?.bookedRevenue
                ?? restaurantOrders
                    .filter(order => !cancelledStatuses.has(normalizeStatus(order.status)))
                    .reduce((sum, order) => sum + order.total, 0);

            return {
                name: restaurant.name,
                revenue: restaurantRevenue,
                active: restaurantOrders.filter(order => openOrderStatuses.has(normalizeStatus(order.status))).length,
                forecast: restaurantAnalytics?.revenueForecast ?? null,
                priorYear: restaurantAnalytics?.priorYearRevenue ?? null
            };
        });

        const portfolioRows = restaurants.map(restaurant => {
            const restaurantTables = tables.filter(table => table.restaurantId === restaurant.id);
            const restaurantTableIds = new Set(restaurantTables.map(table => table.id));
            const restaurantMenus = menus.filter(menu => menu.restaurantId === restaurant.id);
            const restaurantMenuIds = new Set(restaurantMenus.map(menu => menu.id));
            const restaurantOrders = orders.filter(order => restaurantTableIds.has(order.tableId));
            const restaurantAnalytics = analyticsByRestaurantId.get(restaurant.id);
            const restaurantRevenue = restaurantAnalytics?.bookedRevenue
                ?? restaurantOrders
                    .filter(order => !cancelledStatuses.has(normalizeStatus(order.status)))
                    .reduce((sum, order) => sum + order.total, 0);
            const restaurantPaidOrders = restaurantOrders.filter(order => completedStatuses.has(normalizeStatus(order.status)));
            const restaurantAverageTicket = restaurantOrders.length > 0
                ? restaurantRevenue / restaurantOrders.length
                : averageTicket;
            const restaurantOccupiedTables = restaurantTables.filter(table => table.status === "Occupied" || table.status === "Reserved").length;

            return {
                id: restaurant.id,
                name: restaurant.name,
                location: restaurant.location,
                tables: restaurantTables.length,
                staff: staff.filter(member => member.restaurantId === restaurant.id).length,
                menuItems: menuItems.filter(item => restaurantMenuIds.has(item.menuId)).length,
                revenue: restaurantRevenue,
                forecast: restaurantAnalytics?.revenueForecast ?? null,
                priorYearRevenue: restaurantAnalytics?.priorYearRevenue ?? null,
                gapToForecast: restaurantAnalytics?.gapToForecast ?? null,
                paceToPriorYear: restaurantAnalytics?.paceToPriorYear ?? null,
                adr: restaurantAnalytics?.adr ?? (restaurantPaidOrders.length > 0
                    ? restaurantPaidOrders.reduce((sum, order) => sum + order.total, 0) / restaurantPaidOrders.length
                    : restaurantAverageTicket),
                occupancyRate: restaurantAnalytics?.occupancyRate ?? percent(restaurantOccupiedTables, restaurantTables.length),
                openOrders: restaurantOrders.filter(order => openOrderStatuses.has(normalizeStatus(order.status))).length,
                paidRevenue: restaurantAnalytics?.paidRevenue ?? restaurantPaidOrders.reduce((sum, order) => sum + order.total, 0),
                inventoryValue: restaurantAnalytics?.inventoryValue ?? 0,
                lowStockItems: restaurantAnalytics?.lowStockItems ?? 0
            };
        });

        return {
            restaurants,
            selectedRestaurant,
            scopedTables,
            scopedStaff,
            scopedOrders,
            scopedReservations,
            scopedMenuItems,
            menus,
            paidRevenue,
            bookedRevenue,
            openOrderValue,
            cancelledRevenue,
            activeOrders,
            completedOrders,
            cancelledOrders,
            occupiedTables,
            reservedTables,
            availableTables,
            averageTicket,
            adr,
            occupancyRate,
            tabletReadyTables,
            revenueForecast: analytics?.revenueForecast ?? null,
            gapToForecast: analytics?.gapToForecast ?? null,
            revenueBudget: analytics?.revenueBudget ?? null,
            gapToBudget: analytics?.gapToBudget ?? null,
            priorYearRevenue: analytics?.priorYearRevenue ?? null,
            paceToPriorYear: analytics?.paceToPriorYear ?? null,
            projectedMonthEndRevenue: analytics?.projectedMonthEndRevenue ?? null,
            revenuePerAvailableSeat,
            revpash,
            serviceCaptureRate,
            paymentCaptureRate,
            completionRate,
            inventoryValue,
            inventoryItemCount,
            lowStockItems,
            outOfStockItems,
            inventorySupplierCount,
            recentPurchaseOrderSpend,
            recentPurchaseOrderCount,
            revenueTrendData: analytics?.revenueTrendData ?? [],
            forecastBridgeData: analytics?.forecastBridgeData ?? [],
            orderStatusData: Array.from(orderStatusCounts, ([name, value]) => ({ name, value })),
            revenueByRestaurant,
            staffMixData: Array.from(staffMixCounts, ([name, value]) => ({ name, value })),
            portfolioRows,
            recentOrders: [...scopedOrders].slice(-6).reverse(),
            upcomingReservations: [...scopedReservations].slice(-6).reverse(),
            tableLabel: tableId => {
                const table = tablesById.get(tableId);
                return table ? `Table ${table.number}` : `Table #${tableId}`;
            }
        };
    }, [analytics, menuItems, menus, orders, reservations, restaurants, selectedRestaurantId, staff, tables]);

    return { data, error, isLoading };
}
