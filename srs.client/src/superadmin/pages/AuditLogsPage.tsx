import { Fragment, useState } from "react";
import { SectionCard } from "@/superadmin/components/SectionCard";
import { SkeletonBlock } from "@/superadmin/components/SkeletonBlock";
import { useAuditLogsQuery } from "@/superadmin/hooks/useSuperadminQueries";

export function AuditLogsPage() {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [actorFilter, setActorFilter] = useState("");
    const [actionFilter, setActionFilter] = useState("");
    const [dateFilter, setDateFilter] = useState("");
    const { data, isLoading } = useAuditLogsQuery();

    const filtered = (data ?? []).filter(log => {
        return (
            log.actor.toLowerCase().includes(actorFilter.toLowerCase()) &&
            log.action.toLowerCase().includes(actionFilter.toLowerCase()) &&
            (dateFilter === "" || log.timestamp.slice(0, 10) === dateFilter)
        );
    });

    return (
        <div className="sa-stack">
            <SectionCard
                title="Audit Logs"
                subtitle="Immutable platform activity stream"
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
                                    <th>IP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(log => (
                                    <Fragment key={log.id}>
                                        <tr onClick={() => setExpandedId(current => (current === log.id ? null : log.id))}>
                                            <td>{log.actor}</td>
                                            <td>{log.action}</td>
                                            <td>{log.target}</td>
                                            <td>{new Date(log.timestamp).toLocaleString()}</td>
                                            <td>{log.ip}</td>
                                        </tr>
                                        {expandedId === log.id ? (
                                            <tr className="sa-expanded-row">
                                                <td colSpan={5}>{log.detail}</td>
                                            </tr>
                                        ) : null}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </SectionCard>
        </div>
    );
}
