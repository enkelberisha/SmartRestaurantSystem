import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChefHat, Crown, Table2, Users } from "lucide-react";
import { OwnerInsight, OwnerPriority } from "@/owner/components/OwnerCommon";
import type { OwnerDashboardData } from "@/owner/types";

export function StaffTab({ data }: { data: OwnerDashboardData }) {
    const waiterCount = data.scopedStaff.filter(member => member.position === "Waiter").length;
    const chefCount = data.scopedStaff.filter(member => member.position === "Chef").length;
    const hostCount = data.scopedStaff.filter(member => member.position === "Host").length;
    const managerCount = data.scopedStaff.filter(member => member.position === "Manager").length;
    const ownerAdminCount = data.scopedStaff.filter(member =>
        member.position === "Owner" || member.position === "Admin" || member.position === "SuperAdmin"
    ).length;

    return (
        <>
            <section className="owner-grid owner-grid--operations">
                <article className="admin-section-card">
                    <header className="admin-section-card__header">
                        <div>
                            <h3>Staff Mix</h3>
                            <p>Coverage by restaurant position</p>
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
                            <p>Role expectations based on the project plan</p>
                        </div>
                    </header>
                    <div className="owner-priority-list">
                        <OwnerPriority icon={<Users size={18} />} title={`${waiterCount} waiters`} detail="Use POS, process orders, send food to kitchen and drinks to bar." />
                        <OwnerPriority icon={<ChefHat size={18} />} title={`${chefCount} chefs`} detail="Track preparation flow from sent to ready and served." />
                        <OwnerPriority icon={<Table2 size={18} />} title={`${hostCount} hosts`} detail="Manage reservations, seating, waiting list, and table status." />
                        <OwnerPriority icon={<Crown size={18} />} title={`${ownerAdminCount} leadership seats`} detail="Owner/Admin/SuperAdmin positions should stay limited and intentional." />
                    </div>
                </article>
            </section>

            <section className="owner-grid owner-grid--insights">
                <OwnerInsight title="Floor Balance" tone={waiterCount === 0 ? "warning" : "success"} detail={`${waiterCount} waiters for ${data.scopedTables.length} tables in this scope.`} />
                <OwnerInsight title="Kitchen Coverage" tone={chefCount === 0 ? "warning" : "neutral"} detail={`${chefCount} chefs available for ${data.activeOrders} active orders.`} />
                <OwnerInsight title="Leadership" tone={managerCount === 0 ? "warning" : "neutral"} detail={`${managerCount} managers assigned to keep shifts accountable.`} />
            </section>
        </>
    );
}
