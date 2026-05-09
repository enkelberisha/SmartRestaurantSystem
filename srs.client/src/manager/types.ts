import type {
    AdminMenuItem,
    AdminOrder,
    AdminReservation,
    AdminRestaurant,
    AdminStaff,
    AdminTable
} from "@/lib/admin/adminService";

export type ManagerOrderItem = {
    id: number;
    orderId: number;
    menuItemId: number;
    quantity: number;
    price: number;
};

export type ManagerShift = {
    id: number;
    staffId: number;
    startTime: string;
    endTime: string;
};

export type ManagerDashboardData = {
    restaurants: AdminRestaurant[];
    orders: AdminOrder[];
    reservations: AdminReservation[];
    tables: AdminTable[];
    menuItems: AdminMenuItem[];
    orderItems: ManagerOrderItem[];
};

export type ManagerOrdersData = {
    restaurants: AdminRestaurant[];
    orders: AdminOrder[];
    tables: AdminTable[];
    menuItems: AdminMenuItem[];
    orderItems: ManagerOrderItem[];
};

export type ManagerTablesData = {
    restaurants: AdminRestaurant[];
    orders: AdminOrder[];
    tables: AdminTable[];
    orderItems: ManagerOrderItem[];
};

export type ManagerKitchenData = {
    restaurants: AdminRestaurant[];
    tables: AdminTable[];
    staff: AdminStaff[];
    shifts: ManagerShift[];
};

export type ManagerMenusData = {
    restaurants: AdminRestaurant[];
    menus: import("@/lib/admin/adminService").AdminMenu[];
    menuItems: AdminMenuItem[];
    orders: AdminOrder[];
    orderItems: ManagerOrderItem[];
};
