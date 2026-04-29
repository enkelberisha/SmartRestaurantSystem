import { useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/superadmin/components/ConfirmDialog";
import { Modal } from "@/superadmin/components/Modal";
import { SectionCard } from "@/superadmin/components/SectionCard";
import { SkeletonBlock } from "@/superadmin/components/SkeletonBlock";
import { useToast } from "@/superadmin/context/ToastContext";
import {
    useBillingQuery,
    useChangeBillingPlanMutation,
    useInvoicesQuery
} from "@/superadmin/hooks/useSuperadminQueries";
import type { BillingRecord, PlanTier } from "@/superadmin/types";

export function BillingPage() {
    const [planFilter, setPlanFilter] = useState<PlanTier | "All">("All");
    const [invoiceTenant, setInvoiceTenant] = useState<BillingRecord | null>(null);
    const [cancelTenant, setCancelTenant] = useState<BillingRecord | null>(null);
    const { data, isLoading } = useBillingQuery();
    const invoicesQuery = useInvoicesQuery(invoiceTenant?.tenantId ?? null);
    const updatePlanMutation = useChangeBillingPlanMutation();
    const { pushToast } = useToast();

    const filtered = (data ?? []).filter(record => (planFilter === "All" ? true : record.plan === planFilter));
    const revenue = filtered.reduce((sum, item) => sum + item.mrr, 0);

    return (
        <div className="sa-stack">
            <div className="sa-kpi-grid">
                <article className="sa-kpi-card">
                    <span>Revenue</span>
                    <strong>${revenue.toLocaleString()}</strong>
                </article>
                <article className="sa-kpi-card">
                    <span>Active Plans</span>
                    <strong>{filtered.filter(item => item.status === "Paid").length}</strong>
                </article>
                <article className="sa-kpi-card">
                    <span>Past Due</span>
                    <strong>{filtered.filter(item => item.status === "Past Due").length}</strong>
                </article>
            </div>

            <SectionCard
                title="Billing & Subscriptions"
                subtitle="Monitor plan health and billing operations"
                actions={
                    <select className="sa-select" value={planFilter} onChange={event => setPlanFilter(event.target.value as PlanTier | "All")}>
                        <option value="All">All Plans</option>
                        <option value="Free">Free</option>
                        <option value="Pro">Pro</option>
                        <option value="Enterprise">Enterprise</option>
                    </select>
                }
            >
                {isLoading ? (
                    <SkeletonBlock className="sa-table-skeleton" />
                ) : (
                    <div className="sa-table-wrap">
                        <table className="sa-table">
                            <thead>
                                <tr>
                                    <th>Tenant</th>
                                    <th>Plan</th>
                                    <th>MRR</th>
                                    <th>Status</th>
                                    <th>Next Billing Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(item => (
                                    <tr key={item.tenantId}>
                                        <td>{item.tenantName}</td>
                                        <td>{item.plan}</td>
                                        <td>${item.mrr}</td>
                                        <td>{item.status}</td>
                                        <td>{new Date(item.nextBillingDate).toLocaleDateString()}</td>
                                        <td>
                                            <div className="sa-inline-actions">
                                                <Button
                                                    variant="ghost"
                                                    onClick={async () => {
                                                        const nextPlan: PlanTier =
                                                            item.plan === "Free" ? "Pro" : item.plan === "Pro" ? "Enterprise" : "Enterprise";
                                                        await updatePlanMutation.mutateAsync({
                                                            tenantId: item.tenantId,
                                                            plan: nextPlan
                                                        });
                                                        pushToast("success", `Moved ${item.tenantName} to ${nextPlan}.`);
                                                    }}
                                                >
                                                    Upgrade
                                                </Button>
                                                <Button variant="ghost" onClick={() => setCancelTenant(item)}>
                                                    Cancel
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => pushToast("success", `Coupon modal opened for ${item.tenantName}.`)}
                                                >
                                                    Apply Coupon
                                                </Button>
                                                <Button variant="ghost" onClick={() => setInvoiceTenant(item)}>
                                                    View Invoices
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </SectionCard>

            <Modal
                title={invoiceTenant ? `Invoices for ${invoiceTenant.tenantName}` : "Invoices"}
                open={Boolean(invoiceTenant)}
                onClose={() => setInvoiceTenant(null)}
            >
                {invoicesQuery.isLoading ? (
                    <SkeletonBlock className="sa-table-skeleton" />
                ) : (
                    <div className="sa-table-wrap">
                        <table className="sa-table">
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th>Amount</th>
                                    <th>Issued</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(invoicesQuery.data ?? []).map(invoice => (
                                    <tr key={invoice.id}>
                                        <td>{invoice.id}</td>
                                        <td>${invoice.amount}</td>
                                        <td>{new Date(invoice.issuedDate).toLocaleDateString()}</td>
                                        <td>{invoice.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Modal>

            <ConfirmDialog
                open={Boolean(cancelTenant)}
                title="Cancel subscription?"
                message={cancelTenant ? `This will cancel ${cancelTenant.tenantName}'s plan in the current billing stub.` : ""}
                confirmLabel="Cancel Plan"
                onClose={() => setCancelTenant(null)}
                onConfirm={async () => {
                    if (!cancelTenant) {
                        return;
                    }
                    pushToast("success", `${cancelTenant.tenantName}'s subscription was marked for cancellation.`);
                    setCancelTenant(null);
                }}
            />
        </div>
    );
}
