import { authorizedApiFetch } from "@/lib/auth/authService";
import { getTenants } from "@/features/superadmin/services/tenantService";
import { getUsers } from "@/features/superadmin/services/userService";
import type { ActivityItem, MonitoringSummary, SystemRestaurant } from "@/features/superadmin/types";

export type SystemRestaurantApiDto = {
    id: number;
    tenantId: string;
    tenantName: string;
    name: string;
    location: string;
    ownerId: number | null;
    managerId: number | null;
};

function mapRestaurant(dto: SystemRestaurantApiDto): SystemRestaurant {
    return {
        id: dto.id,
        tenantId: dto.tenantId,
        tenantName: dto.tenantName,
        name: dto.name,
        location: dto.location,
        ownerId: dto.ownerId,
        managerId: dto.managerId
    };
}

export async function getSystemRestaurants(): Promise<SystemRestaurant[]> {
    const response = await authorizedApiFetch("/api/restaurants/system");

    if (!response.ok) {
        throw new Error("Failed to load restaurants across tenants.");
    }

    const payload = (await response.json()) as SystemRestaurantApiDto[];
    return payload.map(mapRestaurant);
}

export async function getMonitoringSummary(): Promise<MonitoringSummary> {
    const [restaurants, tenants, users] = await Promise.all([getSystemRestaurants(), getTenants(), getUsers()]);

    const activity: ActivityItem[] = [
        ...restaurants.slice(0, 5).map(restaurant => ({
            id: `restaurant-${restaurant.id}`,
            title: `${restaurant.name} is active under ${restaurant.tenantName}`,
            detail: `${restaurant.location} | owner ${restaurant.ownerId ?? "unassigned"} | manager ${restaurant.managerId ?? "unassigned"}`,
            timestamp: new Date().toISOString(),
            tone: "info" as const
        })),
        ...users.slice(0, 3).map(user => ({
            id: `user-${user.id}`,
            title: `${user.email} has platform access`,
            detail: `${user.role} ${user.tenantName ? `for ${user.tenantName}` : "without a tenant"}.`,
            timestamp: user.createdAt,
            tone: "success" as const
        }))
    ].slice(0, 8);

    const unassignedUsers = users.filter(user => !user.tenantId && user.role !== "SuperAdmin").length;
    const inactiveTenants = tenants.filter(tenant => !tenant.isActive).length;
    const restaurantsWithoutOwner = restaurants.filter(restaurant => restaurant.ownerId === null).length;

    return {
        restaurants,
        activity,
        signals: [
            {
                id: "unassigned-users",
                level: unassignedUsers > 3 ? "high" : unassignedUsers > 0 ? "medium" : "low",
                title: "Users without tenant assignment",
                detail: `${unassignedUsers} non-superadmin user${unassignedUsers === 1 ? "" : "s"} are not attached to a tenant.`
            },
            {
                id: "inactive-tenants",
                level: inactiveTenants > 0 ? "medium" : "low",
                title: "Inactive tenants",
                detail: `${inactiveTenants} tenant${inactiveTenants === 1 ? "" : "s"} are marked inactive and should be reviewed.`
            },
            {
                id: "owner-gaps",
                level: restaurantsWithoutOwner > 0 ? "high" : "low",
                title: "Restaurants without owner assignment",
                detail: `${restaurantsWithoutOwner} restaurant${restaurantsWithoutOwner === 1 ? "" : "s"} do not have an owner linked yet.`
            }
        ]
    };
}
