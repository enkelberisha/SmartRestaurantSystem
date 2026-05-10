import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/Button";
import { SectionCard } from "@/features/superadmin/components/SectionCard";
import { SectionErrorBoundary } from "@/features/superadmin/components/SectionErrorBoundary";
import { SkeletonBlock } from "@/features/superadmin/components/SkeletonBlock";
import { useToast } from "@/features/superadmin/context/useToast";
import { useDashboardQuery } from "@/features/superadmin/hooks/useSuperadminQueries";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
    approveRestaurantApprovalRequest,
    getRestaurantApprovalRequests,
    rejectRestaurantApprovalRequest
} from "@/features/superadmin/services/restaurantApprovalService";
import type { RestaurantApprovalRequestDetail } from "@/lib/admin/adminService";

export function SuperadminDashboardPage() {
    const navigate = useNavigate();
    const { data, isLoading } = useDashboardQuery();
    const { pushToast } = useToast();
    const [approvalRequests, setApprovalRequests] = useState<RestaurantApprovalRequestDetail[]>([]);
    const [reviewError, setReviewError] = useState<string | null>(null);
    const [rejectReasons, setRejectReasons] = useState<Record<number, string>>({});

    const loadApprovalRequests = async () => {
        try {
            setReviewError(null);
            setApprovalRequests(await getRestaurantApprovalRequests());
        } catch (error) {
            setReviewError(error instanceof Error ? error.message : "Could not load restaurant requests.");
        }
    };

    useEffect(() => {
        void loadApprovalRequests();
    }, []);

    const pendingApprovalRequests = approvalRequests.filter(request => request.status === "Pending");

    if (isLoading || !data) {
        return (
            <div className="sa-stack">
                <div className="sa-kpi-grid">
                    {Array.from({ length: 4 }, (_, index) => (
                        <SkeletonBlock key={index} className="sa-kpi-skeleton" />
                    ))}
                </div>
                <SkeletonBlock className="sa-chart-skeleton" />
            </div>
        );
    }

    return (
        <div className="sa-stack">
            <div className="sa-kpi-grid">
                <article className="sa-kpi-card">
                    <span>Total Users</span>
                    <strong>{data.totalUsers}</strong>
                </article>
                <article className="sa-kpi-card">
                    <span>Active Tenants</span>
                    <strong>{data.activeTenants}</strong>
                </article>
                <article className="sa-kpi-card">
                    <span>Pending Restaurant Requests</span>
                    <strong>{data.pendingApprovals}</strong>
                    <small>Restaurant create/delete requests waiting for review.</small>
                </article>
                <article className="sa-kpi-card">
                    <span>Pending Activations</span>
                    <strong>{data.pendingActivations}</strong>
                    <small>Signed-in accounts that still need tenant or role activation.</small>
                </article>
            </div>

            <SectionErrorBoundary>
                <SectionCard
                    title="Quick Actions"
                    subtitle="Fast entry points for common platform work"
                    actions={
                        <div className="sa-inline-actions">
                            <Button onClick={() => navigate("/superadmin/tenants")}>Add Tenant</Button>
                            <Button variant="secondary" onClick={() => navigate("/superadmin/monitoring")}>
                                Open Monitoring
                            </Button>
                        </div>
                    }
                >
                    <div className="sa-chart-grid">
                        <div className="sa-chart-card">
                            <h3>User Growth</h3>
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={data.userGrowth}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                    <XAxis dataKey="label" stroke="var(--muted)" />
                                    <YAxis stroke="var(--muted)" />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="sa-chart-card">
                            <h3>Tenant Load</h3>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={data.restaurantsByTenant}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                    <XAxis dataKey="label" stroke="var(--muted)" />
                                    <YAxis stroke="var(--muted)" />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="var(--accent)" radius={[12, 12, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                            <p className="modal-copy">Restaurant/user load by tenant so you can spot uneven platform activity.</p>
                        </div>
                    </div>
                </SectionCard>
            </SectionErrorBoundary>

            <SectionErrorBoundary>
                <SectionCard title="Restaurant Approval Requests" subtitle="Review restaurant create and delete requests">
                    {reviewError && <p className="modal-copy">{reviewError}</p>}
                    <div className="sa-activity-list">
                        {pendingApprovalRequests.map(request => (
                            <article key={request.id} className="sa-activity">
                                <strong>{request.summary}</strong>
                                <p>{request.type} request from {request.requestedByEmail}</p>
                                <small>{new Date(request.createdAt).toLocaleString()}</small>
                                <div className="admin-legend">
                                    <div className="admin-staff-card__detail"><strong>Tenant ID:</strong> <span className="admin-muted">{request.tenantId}</span></div>
                                    <div className="admin-staff-card__detail"><strong>Requester User ID:</strong> <span className="admin-muted">{request.requestedByUserId}</span></div>
                                    <div className="admin-staff-card__detail"><strong>Target Restaurant ID:</strong> <span className="admin-muted">{request.restaurantId ?? "Not created yet"}</span></div>
                                    {request.restaurant && (
                                        <>
                                            <div className="admin-staff-card__detail"><strong>Restaurant Name:</strong> <span className="admin-muted">{request.restaurant.name}</span></div>
                                            <div className="admin-staff-card__detail"><strong>Location:</strong> <span className="admin-muted">{request.restaurant.location}</span></div>
                                            {request.restaurant.ownerId && <div className="admin-staff-card__detail"><strong>Owner ID:</strong> <span className="admin-muted">{request.restaurant.ownerId}</span></div>}
                                            {request.restaurant.managerId && <div className="admin-staff-card__detail"><strong>Manager ID:</strong> <span className="admin-muted">{request.restaurant.managerId}</span></div>}
                                        </>
                                    )}
                                    {request.accounts.length > 0 && (
                                        <div className="admin-legend">
                                            <strong>Operational Accounts</strong>
                                            {request.accounts.map(account => (
                                                <div key={`${request.id}-${account.role}-${account.email}`} className="admin-staff-card__detail">
                                                    <span className="admin-badge">{account.role}</span>
                                                    <span className="admin-muted">{account.email}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <textarea
                                    className="sa-input"
                                    placeholder="Optional rejection reason"
                                    value={rejectReasons[request.id] ?? ""}
                                    onChange={event => setRejectReasons(current => ({ ...current, [request.id]: event.target.value }))}
                                />
                                <div className="sa-inline-actions">
                                    <Button
                                        onClick={async () => {
                                            try {
                                                setReviewError(null);
                                                await approveRestaurantApprovalRequest(request.id);
                                                await loadApprovalRequests();
                                                pushToast("success", `Approved: ${request.summary}`);
                                            } catch (error) {
                                                const message = error instanceof Error ? error.message : "Failed to approve request.";
                                                setReviewError(
                                                    message.toLowerCase().includes("already in use")
                                                        ? `${message} Deny this request or ask the admin to edit the request and resend it.`
                                                        : message
                                                );
                                            }
                                        }}
                                    >
                                        Accept
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={async () => {
                                            try {
                                                setReviewError(null);
                                                await rejectRestaurantApprovalRequest(request.id, rejectReasons[request.id] ?? "");
                                                await loadApprovalRequests();
                                                pushToast("success", `Rejected: ${request.summary}`);
                                            } catch (error) {
                                                setReviewError(error instanceof Error ? error.message : "Failed to reject request.");
                                            }
                                        }}
                                    >
                                        Reject
                                    </Button>
                                </div>
                            </article>
                        ))}
                        {pendingApprovalRequests.length === 0 && (
                            <article className="sa-activity">
                                <p>No pending restaurant requests.</p>
                            </article>
                        )}
                    </div>
                </SectionCard>
            </SectionErrorBoundary>

            <SectionErrorBoundary>
                <SectionCard title="Recent Activity" subtitle="Latest actions across the platform">
                    <div className="sa-activity-list">
                        {data.recentActivity.map(item => (
                            <article key={item.id} className={`sa-activity sa-activity--${item.tone}`}>
                                <strong>{item.title}</strong>
                                <p>{item.detail}</p>
                                <small>{new Date(item.timestamp).toLocaleString()}</small>
                            </article>
                        ))}
                    </div>
                </SectionCard>
            </SectionErrorBoundary>
        </div>
    );
}
