export const appRoles = ["Owner", "Manager", "User", "Admin", "SuperAdmin"] as const;

export type AppRole = (typeof appRoles)[number];

export const rolePathMap: Record<AppRole, string> = {
    Owner: "/owner",
    Manager: "/manager",
    User: "/user",
    Admin: "/admin",
    SuperAdmin: "/superadmin"
};
