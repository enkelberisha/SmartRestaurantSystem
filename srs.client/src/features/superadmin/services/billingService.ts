import type { BillingRecord, Invoice, PlanTier } from "@/features/superadmin/types";

export async function getBillingOverview(): Promise<BillingRecord[]> {
    return [];
}

export async function getInvoicesForTenant(_tenantId: string): Promise<Invoice[]> {
    void _tenantId;
    return [];
}

export async function updateBillingPlan(_tenantId: string, _plan: PlanTier): Promise<void> {
    void _tenantId;
    void _plan;
    return;
}
