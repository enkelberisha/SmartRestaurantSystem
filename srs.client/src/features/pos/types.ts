import type {
    AdminMenu,
    AdminMenuItem,
    AdminOrder,
    AdminStaff,
    AdminTable
} from "@/lib/admin/adminService";

export type PosWaiterSession = {
    staffId: number;
    fullName: string;
    restaurantId: number;
    tenantId: string;
    sessionId: number;
    openedAt: string;
};

export type PosOrderItem = {
    id: number;
    orderId: number;
    menuItemId: number;
    quantity: number;
    price: number;
    notes?: string | null;
};

export type DraftLine = {
    clientId?: string;
    orderItemId?: number;
    menuItemId: number;
    name: string;
    price: number;
    quantity: number;
};

export type PosAssignedWaiter = {
    staffId: number;
    fullName: string;
    initials: string;
};

export type PosOrderStatus = "pending" | "sentToKitchen" | "ready" | "completed";

export type PosReservation = {
    guestName: string;
    partySize: number;
    time: string;
    notes: string;
};

export type PosFloorData = {
    tables: AdminTable[];
    staff: AdminStaff[];
    orders: AdminOrder[];
    menus: AdminMenu[];
    menuItems: AdminMenuItem[];
    orderItems: PosOrderItem[];
};

export type PosFloorFilter = "all" | "available" | "occupied" | "needsWaiter" | "billRequested" | "reserved";
export type PosTableMood = "reserved" | "live" | "bill" | "idle" | "attention";
export type PosTableServiceStatus = "available" | "occupied" | "needsWaiter" | "billRequested" | "waiterOnTheWay" | "billComing" | "delivered" | "closed";

export type PosTableMeta = {
    total: number;
    assignedWaiterName: string | null;
    hasActiveOrder: boolean;
    hasUnassignedAlert: boolean;
    notificationLabel: string | null;
    serviceLabel: string;
    sectionName: string;
    guests: number;
    seatedMinutes: number | null;
    serviceStatus: PosTableServiceStatus;
};

export type PosFloorStats = {
    total: number;
    occupied: number;
    available: number;
    needsWaiter: number;
    billRequested: number;
};

export type PosNotificationType = "assistance" | "bill" | "orderDelivered" | "tableClosed";
export type PosNotificationStatus = "pending" | "accepted" | "closed";

export type PosNotification = {
    id: number;
    tableId: number;
    tableNumber: number;
    type: PosNotificationType;
    timestamp: string;
    status: PosNotificationStatus;
    acceptedBy: string | null;
};
