import type { BillingRecord, Invoice, PlanTier } from "@/superadmin/types";

export async function getBillingOverview(): Promise<BillingRecord[]> {
    return [];
}

export async function getInvoicesForTenant(_tenantId: string): Promise<Invoice[]> {
    return [];
}

export async function updateBillingPlan(_tenantId: string, _plan: PlanTier): Promise<void> {
    return;
}
