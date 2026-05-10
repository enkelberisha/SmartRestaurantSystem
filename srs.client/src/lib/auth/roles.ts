export const appRoles = ["Owner", "Manager", "Admin", "SuperAdmin", "PosDevice", "TableDevice", "KitchenDevice", "HostDevice"] as const;

export type AppRole = (typeof appRoles)[number];

export const rolePathMap: Record<AppRole, string> = {
    Owner: "/owner",
    Manager: "/manager",
    Admin: "/admin",
    SuperAdmin: "/superadmin",
    PosDevice: "/pos",
    TableDevice: "/table",
    KitchenDevice: "/kitchen",
    HostDevice: "/host"
};
