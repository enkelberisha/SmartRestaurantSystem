import { authorizedApiFetch } from "@/lib/auth/authService";
import type { AppRole } from "@/lib/auth/roles";
import type { RoleDefinition, SuperadminUser } from "@/superadmin/types";

type SuperadminUserApiDto = {
    id: number;
    supabaseUserId: string;
    email: string;
    role: AppRole;
    tenantId: string | null;
    tenantName: string | null;
    createdAt: string;
};

function mapUser(dto: SuperadminUserApiDto): SuperadminUser {
    return {
        id: dto.id,
        supabaseUserId: dto.supabaseUserId,
        email: dto.email,
        role: dto.role,
        tenantId: dto.tenantId,
        tenantName: dto.tenantName,
        name: dto.email.split("@")[0],
        status: "Active",
        createdAt: dto.createdAt
    };
}

export async function getUsers(): Promise<SuperadminUser[]> {
    const response = await authorizedApiFetch("/api/superadmin/users");
    if (!response.ok) {
        throw new Error("Failed to load users.");
    }

    const payload = (await response.json()) as SuperadminUserApiDto[];
    return payload.map(mapUser);
}

export async function getRoles(): Promise<RoleDefinition[]> {
    return [
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
}

export async function createUser(payload: {
    email: string;
    password: string;
    role: AppRole;
    tenantId: string | null;
}): Promise<SuperadminUser> {
    const response = await authorizedApiFetch("/api/superadmin/users", {
        method: "POST",
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create user." })) as { message?: string };
        throw new Error(error.message ?? "Failed to create user.");
    }

    return mapUser((await response.json()) as SuperadminUserApiDto);
}

export async function updateUserRole(userId: number, role: AppRole): Promise<SuperadminUser> {
    const response = await authorizedApiFetch(`/api/superadmin/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to update user role." })) as { message?: string };
        throw new Error(error.message ?? "Failed to update user role.");
    }

    return mapUser((await response.json()) as SuperadminUserApiDto);
}

export async function deleteUser(userId: number): Promise<void> {
    const response = await authorizedApiFetch(`/api/superadmin/users/${userId}`, {
        method: "DELETE"
    });

    if (!response.ok) {
        throw new Error("Failed to delete user.");
    }
}
