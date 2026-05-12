import { Fragment, useMemo, useState } from "react";
import { SectionCard } from "@/features/superadmin/components/SectionCard";
import { SkeletonBlock } from "@/features/superadmin/components/SkeletonBlock";
import { useAuditLogsQuery } from "@/features/superadmin/hooks/useSuperadminQueries";

function formatDetail(detail: string) {
    try {
        return JSON.stringify(JSON.parse(detail), null, 2);
    } catch {
        return detail;
    }
}

export function AuditLogsPage() {
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [actorFilter, setActorFilter] = useState("");
    const [actionFilter, setActionFilter] = useState("");
    const [dateFilter, setDateFilter] = useState("");
    const { data, isLoading } = useAuditLogsQuery();

    const filtered = useMemo(() => {
        return (data ?? []).filter(log => {
            const actor = `${log.actorEmail ?? "System"} ${log.actorRole ?? ""}`.trim().toLowerCase();
            const action = log.action.toLowerCase();
            const matchesActor = actor.includes(actorFilter.toLowerCase());
            const matchesAction = action.includes(actionFilter.toLowerCase());
            const matchesDate = dateFilter === "" || log.createdAt.slice(0, 10) === dateFilter;

            return matchesActor && matchesAction && matchesDate;
        });
    }, [actionFilter, actorFilter, data, dateFilter]);

    return (
        <div className="sa-stack">
            <SectionCard
                title="Audit Logs"
                subtitle="Event-based activity stream across the platform"
                actions={
                    <div className="sa-inline-actions">
                        <input
                            className="sa-search-field"
                            value={actorFilter}
                            onChange={event => setActorFilter(event.target.value)}
                            placeholder="Filter by actor"
                        />
                        <input
                            className="sa-search-field"
                            value={actionFilter}
                            onChange={event => setActionFilter(event.target.value)}
                            placeholder="Filter by action"
                        />
                        <input
                            className="sa-search-field"
                            value={dateFilter}
                            onChange={event => setDateFilter(event.target.value)}
                            type="date"
                        />
                    </div>
                }
            >
                {isLoading ? (
                    <SkeletonBlock className="sa-table-skeleton" />
                ) : (
                    <div className="sa-table-wrap">
                        <table className="sa-table">
                            <thead>
                                <tr>
                                    <th>Actor</th>
                                    <th>Action</th>
                                    <th>Target</th>
                                    <th>Timestamp</th>
                                    <th>Tenant</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(log => (
                                    <Fragment key={log.id}>
                                        <tr onClick={() => setExpandedId(current => (current === log.id ? null : log.id))}>
                                            <td>{log.actorEmail ?? "System"}</td>
                                            <td>{log.action}</td>
                                            <td>{log.target}</td>
                                            <td>{new Date(log.createdAt).toLocaleString()}</td>
                                            <td>{log.tenantId ?? "System"}</td>
                                        </tr>
                                        {expandedId === log.id ? (
                                            <tr className="sa-expanded-row">
                                                <td colSpan={5}>
                                                    <pre className="sa-code-block">{formatDetail(log.detail)}</pre>
                                                </td>
                                            </tr>
                                        ) : null}
                                    </Fragment>
                                ))}
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5}>No audit log entries match the current filters.</td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                )}
            </SectionCard>
        </div>
    );
}
