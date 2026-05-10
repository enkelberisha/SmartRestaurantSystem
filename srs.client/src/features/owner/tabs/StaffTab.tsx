import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChefHat, Crown, Table2, Users } from "lucide-react";
import { OwnerInsight, OwnerPriority } from "@/features/owner/components/OwnerCommon";
import type { OwnerDashboardData } from "@/features/owner/types";

export function StaffTab({ data }: { data: OwnerDashboardData }) {
    const waiterCount = data.scopedStaff.length;
    const activeWaiterCount = data.scopedStaff.filter(member => member.isActive).length;
    const pinCount = data.scopedStaff.filter(member => member.credentialType === "Pin").length;
    const cardCount = data.scopedStaff.filter(member => member.credentialType === "Card").length;
    const manualCount = data.scopedStaff.filter(member => member.credentialType === "ManualId").length;

    return (
        <>
            <section className="owner-grid owner-grid--operations">
                <article className="admin-section-card">
                    <header className="admin-section-card__header">
                        <div>
                            <h3>Waiter Mix</h3>
                            <p>Coverage by waiter credential type</p>
                        </div>
                    </header>
                    <div className="admin-chart-card__chart">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={data.staffMixData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                <XAxis type="number" allowDecimals={false} stroke="var(--muted)" fontSize={12} />
                                <YAxis type="category" dataKey="name" stroke="var(--muted)" fontSize={12} width={100} />
                                <Tooltip />
                                <Bar dataKey="value" fill="var(--accent)" radius={[0, 8, 8, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </article>
                <article className="admin-section-card">
                    <header className="admin-section-card__header">
                        <div>
                            <h3>Coverage Notes</h3>
                            <p>Waiter credential readiness across the current scope</p>
                        </div>
                    </header>
                    <div className="owner-priority-list">
                        <OwnerPriority icon={<Users size={18} />} title={`${waiterCount} waiters`} detail="Waiters authenticate into the POS through cards, PINs, or manual identifiers." />
                        <OwnerPriority icon={<ChefHat size={18} />} title={`${activeWaiterCount} active`} detail="Only active waiters can unlock POS sessions." />
                        <OwnerPriority icon={<Table2 size={18} />} title={`${pinCount + cardCount} credentialed`} detail={`${pinCount} PIN and ${cardCount} card credentials are ready for use.`} />
                        <OwnerPriority icon={<Crown size={18} />} title={`${manualCount} manual IDs`} detail="Manual IDs can be used as backup waiter credentials when needed." />
                    </div>
                </article>
            </section>

            <section className="owner-grid owner-grid--insights">
                <OwnerInsight title="Floor Balance" tone={waiterCount === 0 ? "warning" : "success"} detail={`${waiterCount} waiters for ${data.scopedTables.length} tables in this scope.`} />
                <OwnerInsight title="Credential Readiness" tone={activeWaiterCount === 0 ? "warning" : "neutral"} detail={`${activeWaiterCount} active waiter credentials are available right now.`} />
                <OwnerInsight title="Manual Backup" tone={manualCount === 0 ? "warning" : "neutral"} detail={`${manualCount} manual waiter identifiers are available as fallback.`} />
            </section>
        </>
    );
}
