import { getSystemRestaurants } from "@/features/superadmin/services/monitoringService";
import { getRestaurantApprovalRequests } from "@/features/superadmin/services/restaurantApprovalService";
import { getTenants } from "@/features/superadmin/services/tenantService";
import { getUsers } from "@/features/superadmin/services/userService";
import type { AnalyticsSummary, ChartPoint } from "@/features/superadmin/types";

type RangeConfig = {
    label: string;
    startDate: Date | null;
};

function parseRange(rangeLabel: string): RangeConfig {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const buildStartDate = (days: number) => {
        const start = new Date(endOfToday);
        start.setDate(start.getDate() - (days - 1));
        start.setHours(0, 0, 0, 0);
        return start;
    };

    switch (rangeLabel) {
        case "Last 7 Days":
            return { label: rangeLabel, startDate: buildStartDate(7) };
        case "Last 90 Days":
            return { label: rangeLabel, startDate: buildStartDate(90) };
        case "Custom":
            return { label: "All Time", startDate: null };
        case "Last 30 Days":
        default:
            return { label: "Last 30 Days", startDate: buildStartDate(30) };
    }
}

function isInRange(value: string, startDate: Date | null) {
    if (!startDate) {
        return true;
    }

    return new Date(value) >= startDate;
}

function formatDateLabel(value: string) {
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildCountSeries(values: string[], startDate: Date | null): ChartPoint[] {
    const counts = new Map<string, number>();

    for (const value of values) {
        if (!isInRange(value, startDate)) {
            continue;
        }

        const label = formatDateLabel(value);
        counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    return Array.from(counts.entries())
        .map(([label, count]) => ({ label, value: count }))
        .sort((left, right) => new Date(`${left.label}, ${new Date().getFullYear()}`).getTime() - new Date(`${right.label}, ${new Date().getFullYear()}`).getTime());
}

function buildCumulativeSeries(values: string[], startDate: Date | null): ChartPoint[] {
    const filteredValues = values
        .filter(value => isInRange(value, startDate))
        .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());

    const cumulative = new Map<string, number>();
    let runningTotal = 0;

    for (const value of filteredValues) {
        runningTotal += 1;
        cumulative.set(formatDateLabel(value), runningTotal);
    }

    return Array.from(cumulative.entries()).map(([label, value]) => ({ label, value }));
}

function downloadCsv(filename: string, csv: string) {
    if (typeof window === "undefined") {
        return;
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = filename;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

export async function getAnalyticsSummary(rangeLabel: string): Promise<AnalyticsSummary> {
    const [users, tenants, restaurants, approvalRequests] = await Promise.all([
        getUsers(),
        getTenants(),
        getSystemRestaurants(),
        getRestaurantApprovalRequests()
    ]);

    const { label, startDate } = parseRange(rangeLabel);

    const signupSeries = buildCountSeries(users.map(user => user.createdAt), startDate);
    const tenantGrowthSeries = buildCumulativeSeries(tenants.map(tenant => tenant.createdDate), startDate);
    const activeUsersSeries: ChartPoint[] = tenants.map(tenant => {
        const tenantUsers = users.filter(user => user.tenantId === tenant.id);
        return {
            label: tenant.name,
            value: tenantUsers.filter(user => user.isActivated).length,
            secondaryValue: tenantUsers.filter(user => !user.isActivated).length
        };
    });

    const roleCounts = new Map<string, number>();
    for (const user of users) {
        roleCounts.set(user.role, (roleCounts.get(user.role) ?? 0) + 1);
    }

    return {
        totalUsers: users.length,
        activeUsers: users.filter(user => user.isActivated).length,
        totalRestaurants: restaurants.length,
        pendingRequests: approvalRequests.filter(request => request.status === "Pending").length,
        dateRangeLabel: label,
        signupSeries,
        activeUsersSeries,
        tenantGrowthSeries,
        featureUsage: Array.from(roleCounts.entries()).map(([role, count]) => ({
            label: role,
            value: count
        }))
    };
}

export async function exportAnalyticsCsv(rangeLabel = "Last 30 Days") {
    const [summary, users, tenants, restaurants, approvalRequests] = await Promise.all([
        getAnalyticsSummary(rangeLabel),
        getUsers(),
        getTenants(),
        getSystemRestaurants(),
        getRestaurantApprovalRequests()
    ]);

    const lines = [
        ["Metric", "Value"],
        ["Date Range", summary.dateRangeLabel],
        ["Total Users", String(summary.totalUsers)],
        ["Active Users", String(summary.activeUsers)],
        ["Restaurants", String(summary.totalRestaurants)],
        ["Pending Requests", String(summary.pendingRequests)],
        [],
        ["Users"],
        ["Email", "Role", "Status", "Tenant", "Restaurant", "Created At"],
        ...users.map(user => [
            user.email,
            user.role,
            user.status,
            user.tenantName ?? "",
            user.restaurantId?.toString() ?? "",
            user.createdAt
        ]),
        [],
        ["Tenants"],
        ["Name", "Active", "Users", "Created At"],
        ...tenants.map(tenant => [
            tenant.name,
            tenant.isActive ? "Yes" : "No",
            tenant.usersCount.toString(),
            tenant.createdDate
        ]),
        [],
        ["Restaurants"],
        ["Name", "Tenant", "Location", "Owner Id", "Manager Id"],
        ...restaurants.map(restaurant => [
            restaurant.name,
            restaurant.tenantName,
            restaurant.location,
            restaurant.ownerId?.toString() ?? "",
            restaurant.managerId?.toString() ?? ""
        ]),
        [],
        ["Approval Requests"],
        ["Summary", "Type", "Status", "Requester", "Created At"],
        ...approvalRequests.map(request => [
            request.summary,
            request.type,
            request.status,
            request.requestedByEmail,
            request.createdAt
        ])
    ];

    const csv = lines
        .map(line => line.map(value => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`).join(","))
        .join("\n");

    downloadCsv("superadmin-analytics.csv", csv);
}
