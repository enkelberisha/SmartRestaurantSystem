export const appRoles = ["Owner", "Manager", "Host", "User", "Table", "Admin", "SuperAdmin"] as const;

export type AppRole = (typeof appRoles)[number];

export const rolePathMap: Record<AppRole, string> = {
    Owner: "/owner",
    Manager: "/manager",
    Host: "/host",
    User: "/user",
    Table: "/table",
    Admin: "/admin",
    SuperAdmin: "/superadmin"
};
