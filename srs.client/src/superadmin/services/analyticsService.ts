import type { AnalyticsSummary } from "@/superadmin/types";

export async function getAnalyticsSummary(rangeLabel: string): Promise<AnalyticsSummary> {
    return {
        dateRangeLabel: rangeLabel,
        signupSeries: [],
        activeUsersSeries: [],
        tenantGrowthSeries: [],
        featureUsage: []
    };
}

export async function exportAnalyticsCsv() {
    return;
}
