import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Line, LineChart, BarChart, Bar } from "recharts";
import { Button } from "@/components/Button";
import { SectionCard } from "@/superadmin/components/SectionCard";
import { SkeletonBlock } from "@/superadmin/components/SkeletonBlock";
import { useToast } from "@/superadmin/context/ToastContext";
import { useAnalyticsQuery, useExportAnalyticsMutation } from "@/superadmin/hooks/useSuperadminQueries";
import { useState } from "react";

const pieColors = ["#5b31ff", "#1e9ea9", "#f59e0b", "#ef4444"];

export function AnalyticsPage() {
    const [rangeLabel, setRangeLabel] = useState("Last 30 Days");
    const { data, isLoading } = useAnalyticsQuery(rangeLabel);
    const exportMutation = useExportAnalyticsMutation();
    const { pushToast } = useToast();

    return (
        <div className="sa-stack">
            <SectionCard
                title="Analytics & Stats"
                subtitle="Track growth, usage, and product engagement"
                actions={
                    <div className="sa-inline-actions">
                        {["Last 7 Days", "Last 30 Days", "Last 90 Days", "Custom"].map(label => (
                            <Button
                                key={label}
                                variant={rangeLabel === label ? "primary" : "secondary"}
                                onClick={() => setRangeLabel(label)}
                            >
                                {label}
                            </Button>
                        ))}
                        <Button
                            onClick={async () => {
                                await exportMutation.mutateAsync();
                                pushToast("success", "CSV export completed.");
                            }}
                        >
                            Export CSV
                        </Button>
                    </div>
                }
            >
                {isLoading || !data ? (
                    <SkeletonBlock className="sa-chart-skeleton" />
                ) : (
                    <div className="sa-chart-grid">
                        <div className="sa-chart-card">
                            <h3>New Signups</h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={data.signupSeries}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                    <XAxis dataKey="label" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line dataKey="value" stroke="var(--primary)" strokeWidth={3} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="sa-chart-card">
                            <h3>Active Users (DAU / MAU)</h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={data.activeUsersSeries}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                    <XAxis dataKey="label" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="var(--accent)" />
                                    <Bar dataKey="secondaryValue" fill="var(--primary-soft)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="sa-chart-card">
                            <h3>Tenant Growth</h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={data.tenantGrowthSeries}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                    <XAxis dataKey="label" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line dataKey="value" stroke="var(--success)" strokeWidth={3} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="sa-chart-card">
                            <h3>Feature Usage Breakdown</h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie data={data.featureUsage} dataKey="value" nameKey="label" outerRadius={86}>
                                        {data.featureUsage.map((entry, index) => (
                                            <Cell key={entry.label} fill={pieColors[index % pieColors.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </SectionCard>
        </div>
    );
}
