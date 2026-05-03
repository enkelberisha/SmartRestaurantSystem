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

export type OwnerTabId = "overview" | "portfolio" | "operations" | "staff" | "finance";

export type ChartDatum = {
    name: string;
    value: number;
};

export type RevenueDatum = {
    name: string;
    revenue: number;
    active: number;
};

export type PortfolioRow = {
    id: number;
    name: string;
    location: string;
    tables: number;
    staff: number;
    menuItems: number;
    revenue: number;
    openOrders: number;
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
    activeOrders: number;
    completedOrders: number;
    occupiedTables: number;
    reservedTables: number;
    availableTables: number;
    averageTicket: number;
    occupancyRate: number;
    tabletReadyTables: number;
    orderStatusData: ChartDatum[];
    revenueByRestaurant: RevenueDatum[];
    staffMixData: ChartDatum[];
    portfolioRows: PortfolioRow[];
    recentOrders: AdminOrder[];
    upcomingReservations: AdminReservation[];
    tableLabel: (tableId: number) => string;
};
