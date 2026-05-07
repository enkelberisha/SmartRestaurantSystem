import type {
    AdminMenuItem,
    AdminOrder,
    AdminReservation,
    AdminRestaurant,
    AdminTable
} from "@/lib/admin/adminService";

export type ManagerOrderItem = {
    id: number;
    orderId: number;
    menuItemId: number;
    quantity: number;
    price: number;
};

export type ManagerDashboardData = {
    restaurants: AdminRestaurant[];
    orders: AdminOrder[];
    reservations: AdminReservation[];
    tables: AdminTable[];
    menuItems: AdminMenuItem[];
    orderItems: ManagerOrderItem[];
};
