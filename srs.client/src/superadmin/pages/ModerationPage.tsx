import { useState } from "react";
import { Button } from "@/components/Button";
import { SectionCard } from "@/superadmin/components/SectionCard";
import { SkeletonBlock } from "@/superadmin/components/SkeletonBlock";
import { useToast } from "@/superadmin/context/ToastContext";
import { useModerationQuery, useUpdateModerationMutation } from "@/superadmin/hooks/useSuperadminQueries";
import type { ModerationStatus } from "@/superadmin/types";

export function ModerationPage() {
    const [filter, setFilter] = useState<ModerationStatus | "All">("Pending");
    const [selected, setSelected] = useState<string[]>([]);
    const { data, isLoading } = useModerationQuery();
    const mutation = useUpdateModerationMutation();
    const { pushToast } = useToast();

    const filtered = (data ?? []).filter(item => (filter === "All" ? true : item.status === filter));

    const applyBulkAction = async (status: ModerationStatus) => {
        if (selected.length === 0) {
            return;
        }
        await mutation.mutateAsync({ ids: selected, status });
        setSelected([]);
        pushToast("success", `Updated ${selected.length} moderation items.`);
    };

    return (
        <div className="sa-stack">
            <SectionCard
                title="Content Moderation"
                subtitle="Review flagged platform content and take action quickly"
                actions={
                    <div className="sa-inline-actions">
                        {["All", "Pending", "Reviewed", "Escalated"].map(status => (
                            <Button
                                key={status}
                                variant={filter === status ? "primary" : "secondary"}
                                onClick={() => setFilter(status as ModerationStatus | "All")}
                            >
                                {status}
                            </Button>
                        ))}
                    </div>
                }
            >
                <div className="sa-inline-actions">
                    <Button onClick={() => void applyBulkAction("Reviewed")}>Bulk Approve</Button>
                    <Button variant="secondary" onClick={() => void applyBulkAction("Escalated")}>
                        Bulk Escalate
                    </Button>
                </div>
                {isLoading ? (
                    <SkeletonBlock className="sa-table-skeleton" />
                ) : (
                    <div className="sa-table-wrap">
                        <table className="sa-table">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Type</th>
                                    <th>Author</th>
                                    <th>Tenant</th>
                                    <th>Flagged Reason</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(item => (
                                    <tr key={item.id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selected.includes(item.id)}
                                                onChange={event =>
                                                    setSelected(current =>
                                                        event.target.checked
                                                            ? [...current, item.id]
                                                            : current.filter(id => id !== item.id)
                                                    )
                                                }
                                            />
                                        </td>
                                        <td>{item.type}</td>
                                        <td>{item.author}</td>
                                        <td>{item.tenant}</td>
                                        <td>{item.flaggedReason}</td>
                                        <td>{new Date(item.date).toLocaleDateString()}</td>
                                        <td>{item.status}</td>
                                        <td>
                                            <div className="sa-inline-actions">
                                                <Button variant="ghost" onClick={() => void applySingle(item.id, "Reviewed")}>Approve</Button>
                                                <Button variant="ghost" onClick={() => void applySingle(item.id, "Escalated")}>Escalate</Button>
                                                <Button variant="ghost">Warn User</Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </SectionCard>
        </div>
    );

    async function applySingle(id: string, status: ModerationStatus) {
        await mutation.mutateAsync({ ids: [id], status });
        pushToast("success", `Item marked ${status.toLowerCase()}.`);
    }
}
