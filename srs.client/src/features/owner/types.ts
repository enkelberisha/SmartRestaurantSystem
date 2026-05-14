import type {
    AdminMenu,
    AdminMenuItem,
    AdminOrder,
    AdminReservation,
    AdminRestaurant,
    AdminStaff,
    AdminTable
} from "@/lib/admin/adminService";

export type RestaurantScope = "all" | number;

export type OwnerTabId = "overview" | "portfolio" | "operations" | "staff" | "finance" | "ai";

export type ChartDatum = {
    name: string;
    value: number;
};

export type RevenueDatum = {
    name: string;
    revenue: number;
    active: number;
    forecast: number | null;
    priorYear: number | null;
};

export type RevenueTrendDatum = {
    name: string;
    actual: number;
    forecast: number | null;
    priorYear: number | null;
};

export type ForecastBridgeDatum = {
    name: string;
    value: number | null;
};

export type PortfolioRow = {
    id: number;
    name: string;
    location: string;
    tables: number;
    staff: number;
    menuItems: number;
    revenue: number;
    forecast: number | null;
    priorYearRevenue: number | null;
    gapToForecast: number | null;
    paceToPriorYear: number | null;
    adr: number;
    occupancyRate: number;
    openOrders: number;
    paidRevenue: number;
    inventoryValue: number;
    lowStockItems: number;
};

export type OwnerDashboardData = {
    restaurants: AdminRestaurant[];
    selectedRestaurant: AdminRestaurant | null;
    scopedTables: AdminTable[];
    scopedStaff: AdminStaff[];
    scopedOrders: AdminOrder[];
    scopedReservations: AdminReservation[];
    scopedMenuItems: AdminMenuItem[];
    menus: AdminMenu[];
    paidRevenue: number;
    bookedRevenue: number;
    openOrderValue: number;
    cancelledRevenue: number;
    activeOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    occupiedTables: number;
    reservedTables: number;
    availableTables: number;
    averageTicket: number;
    adr: number;
    occupancyRate: number;
    tabletReadyTables: number;
    revenueForecast: number | null;
    gapToForecast: number | null;
    revenueBudget: number | null;
    gapToBudget: number | null;
    priorYearRevenue: number | null;
    paceToPriorYear: number | null;
    projectedMonthEndRevenue: number | null;
    revenuePerAvailableSeat: number;
    revpash: number;
    serviceCaptureRate: number;
    paymentCaptureRate: number;
    completionRate: number;
    inventoryValue: number;
    inventoryItemCount: number;
    lowStockItems: number;
    outOfStockItems: number;
    inventorySupplierCount: number;
    recentPurchaseOrderSpend: number;
    recentPurchaseOrderCount: number;
    revenueTrendData: RevenueTrendDatum[];
    forecastBridgeData: ForecastBridgeDatum[];
    orderStatusData: ChartDatum[];
    revenueByRestaurant: RevenueDatum[];
    staffMixData: ChartDatum[];
    portfolioRows: PortfolioRow[];
    recentOrders: AdminOrder[];
    upcomingReservations: AdminReservation[];
    tableLabel: (tableId: number) => string;
};
