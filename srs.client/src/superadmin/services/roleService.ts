import type { RoleDefinition } from "@/superadmin/types";

const roleDefinitions: RoleDefinition[] = [
    {
        id: "role-owner",
        name: "Owner",
        description: "Full restaurant-level ownership with tenant assignment.",
        permissions: ["tenant.manage", "restaurant.manage", "staff.manage"]
    },
    {
        id: "role-manager",
        name: "Manager",
        description: "Operational access without platform-wide control.",
        permissions: ["orders.manage", "menu.manage", "staff.view"]
    },
    {
        id: "role-admin",
        name: "Admin",
        description: "Administrative access for tenant setup and staff operations.",
        permissions: ["tenant.manage", "staff.manage", "reports.view"]
    },
    {
        id: "role-user",
        name: "User",
        description: "Basic signed-in user with limited access.",
        permissions: ["profile.view"]
    }
];

export async function getRoles(): Promise<RoleDefinition[]> {
    return roleDefinitions;
}

export async function saveRoleDefinition(role: RoleDefinition): Promise<RoleDefinition> {
    return role;
}
