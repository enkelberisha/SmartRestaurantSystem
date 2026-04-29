import { getTenants } from "@/superadmin/services/tenantService";
import { getUsers } from "@/superadmin/services/userService";
import type { DashboardSummary } from "@/superadmin/types";

export async function getDashboardOverview(): Promise<DashboardSummary> {
    const [users, tenants] = await Promise.all([getUsers(), getTenants()]);

    return {
        totalUsers: users.length,
        activeTenants: tenants.filter(tenant => tenant.isActive).length,
        mrr: 0,
        pendingModeration: 0,
        recentActivity: [],
        userGrowth: [],
        revenueTrend: []
    };
}
