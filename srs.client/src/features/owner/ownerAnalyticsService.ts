import { authorizedApiFetch } from "@/lib/auth/authService";
import type { RestaurantScope } from "@/features/owner/types";

export type OwnerAnalyticsRestaurant = {
    restaurantId: number;
    bookedRevenue: number;
    paidRevenue: number;
    averageTicket: number;
    adr: number;
    activeOrders: number;
    completedOrders: number;
    occupiedTables: number;
    reservedTables: number;
    availableTables: number;
    totalTables: number;
    totalSeats: number;
    occupancyRate: number;
    revenuePerAvailableSeat: number;
    revpash: number;
    serviceCaptureRate: number;
    revenueForecast: number | null;
    gapToForecast: number | null;
    revenueBudget: number | null;
    gapToBudget: number | null;
    priorYearRevenue: number | null;
    paceToPriorYear: number | null;
    projectedMonthEndRevenue: number | null;
};

export type OwnerAnalyticsTrend = {
    name: string;
    actual: number;
    forecast: number | null;
    priorYear: number | null;
};

export type OwnerAnalyticsBridge = {
    name: string;
    value: number | null;
};

export type OwnerAnalytics = {
    bookedRevenue: number;
    paidRevenue: number;
    averageTicket: number;
    adr: number;
    activeOrders: number;
    completedOrders: number;
    occupiedTables: number;
    reservedTables: number;
    availableTables: number;
    totalTables: number;
    totalSeats: number;
    occupancyRate: number;
    revenuePerAvailableSeat: number;
    revpash: number;
    serviceCaptureRate: number;
    revenueForecast: number | null;
    gapToForecast: number | null;
    revenueBudget: number | null;
    gapToBudget: number | null;
    priorYearRevenue: number | null;
    paceToPriorYear: number | null;
    projectedMonthEndRevenue: number | null;
    revenueTrendData: OwnerAnalyticsTrend[];
    forecastBridgeData: OwnerAnalyticsBridge[];
    restaurants: OwnerAnalyticsRestaurant[];
};

async function readErrorMessage(response: Response, fallback: string) {
    const text = await response.text();

    if (!text) {
        return fallback;
    }

    try {
        const error = JSON.parse(text) as { message?: string };
        return error.message ?? fallback;
    } catch {
        return text;
    }
}

export async function getOwnerAnalytics(scope: RestaurantScope): Promise<OwnerAnalytics> {
    const query = scope === "all" ? "" : `?restaurantId=${scope}`;
    const response = await authorizedApiFetch(`/api/owner/analytics${query}`);

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load owner analytics."));
    }

    return (await response.json()) as OwnerAnalytics;
}
