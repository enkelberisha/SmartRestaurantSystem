import { getModerationItems } from "@/superadmin/services/moderationService";
import { getTenants } from "@/superadmin/services/tenantService";
import { getUsers } from "@/superadmin/services/userService";
import type { ActivityItem, ChartPoint, DashboardSummary } from "@/superadmin/types";

function buildUserGrowthPoints(dateValues: string[]): ChartPoint[] {
    const monthlyTotals = new Map<string, number>();

    for (const value of dateValues) {
        const date = new Date(value);
        const label = date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
        monthlyTotals.set(label, (monthlyTotals.get(label) ?? 0) + 1);
    }

    return Array.from(monthlyTotals.entries()).map(([label, value]) => ({ label, value }));
}

function buildRecentActivity(users: Awaited<ReturnType<typeof getUsers>>, tenants: Awaited<ReturnType<typeof getTenants>>): ActivityItem[] {
    const userItems = users.slice(0, 4).map(user => ({
        id: `user-${user.id}`,
        title: `${user.email} joined the platform`,
        detail: `${user.role} access ${user.tenantName ? `for ${user.tenantName}` : "without a tenant assignment"}.`,
        timestamp: user.createdAt,
        tone: "info" as const
    }));

    const tenantItems = tenants.slice(0, 3).map(tenant => ({
        id: `tenant-${tenant.id}`,
        title: `${tenant.name} tenant is available`,
        detail: `${tenant.usersCount} assigned user${tenant.usersCount === 1 ? "" : "s"}.`,
        timestamp: tenant.createdDate,
        tone: tenant.isActive ? "success" as const : "warning" as const
    }));

    return [...userItems, ...tenantItems]
        .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
        .slice(0, 6);
}

export async function getDashboardOverview(): Promise<DashboardSummary> {
    const [users, tenants, moderationItems] = await Promise.all([getUsers(), getTenants(), getModerationItems()]);

    const userGrowth = buildUserGrowthPoints(users.map(user => user.createdAt));
    const restaurantsByTenant: ChartPoint[] = tenants.map(tenant => ({
        label: tenant.name,
        value: tenant.usersCount
    }));

    return {
        totalUsers: users.length,
        activeTenants: tenants.filter(tenant => tenant.isActive).length,
        pendingModeration: moderationItems.filter(item => item.status === "Pending").length,
        recentActivity: buildRecentActivity(users, tenants),
        userGrowth,
        restaurantsByTenant
    };
}
