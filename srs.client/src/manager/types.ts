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

export type ManagerInventory = {
    id: number;
    restaurantId: number;
    createdAt: string;
};

export type ManagerInventoryItem = {
    id: number;
    inventoryId: number;
    itemName: string;
    quantity: number;
    unitPrice: number;
    supplierId: number | null;
    createdAt: string;
};

export type ManagerSupplier = {
    id: number;
    restaurantId: number;
    name: string;
    contact: string | null;
};

export type ManagerPurchaseOrder = {
    id: number;
    restaurantId: number;
    supplierId: number;
    supplierName: string;
    inventoryItemId: number | null;
    itemName: string | null;
    quantity: number | null;
    unitPrice: number | null;
    createdByUserId: number | null;
    createdByEmail: string | null;
    total: number;
    createdAt: string;
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

export type ManagerInventoryData = {
    restaurants: AdminRestaurant[];
    inventories: ManagerInventory[];
    inventoryItems: ManagerInventoryItem[];
    suppliers: ManagerSupplier[];
    purchaseOrders: ManagerPurchaseOrder[];
};
