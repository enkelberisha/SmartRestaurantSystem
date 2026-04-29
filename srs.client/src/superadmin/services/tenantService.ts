import { authorizedApiFetch } from "@/lib/auth/authService";
import type { Tenant, TenantMember } from "@/superadmin/types";

type TenantApiDto = {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    usersCount: number;
};

type TenantMemberApiDto = {
    id: number;
    supabaseUserId: string;
    email: string;
    role: TenantMember["role"];
    createdAt: string;
};

function mapTenant(dto: TenantApiDto): Tenant {
    return {
        id: dto.id,
        name: dto.name,
        isActive: dto.isActive,
        usersCount: dto.usersCount,
        createdDate: dto.createdAt
    };
}

export async function getTenants(): Promise<Tenant[]> {
    const response = await authorizedApiFetch("/api/tenants");
    if (!response.ok) {
        throw new Error("Failed to load tenants.");
    }

    const payload = (await response.json()) as TenantApiDto[];
    return payload.map(mapTenant);
}

export async function createTenant(payload: { name: string; isActive: boolean }): Promise<Tenant> {
    const response = await authorizedApiFetch("/api/tenants", {
        method: "POST",
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error("Failed to create tenant.");
    }

    return mapTenant((await response.json()) as TenantApiDto);
}

export async function updateTenant(tenantId: string, payload: { name: string; isActive: boolean }): Promise<Tenant> {
    const response = await authorizedApiFetch(`/api/tenants/${tenantId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error("Failed to update tenant.");
    }

    return mapTenant((await response.json()) as TenantApiDto);
}

export async function deleteTenant(tenantId: string): Promise<void> {
    const response = await authorizedApiFetch(`/api/tenants/${tenantId}`, {
        method: "DELETE"
    });

    if (!response.ok) {
        throw new Error("Failed to delete tenant.");
    }
}

export async function getTenantMembers(tenantId: string): Promise<TenantMember[]> {
    const response = await authorizedApiFetch(`/api/tenants/${tenantId}/users`);
    if (!response.ok) {
        throw new Error("Failed to load tenant members.");
    }

    const payload = (await response.json()) as TenantMemberApiDto[];
    return payload.map(member => ({
        id: member.id,
        supabaseUserId: member.supabaseUserId,
        email: member.email,
        role: member.role,
        createdAt: member.createdAt
    }));
}
