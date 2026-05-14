import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, CircleDollarSign, RefreshCw, Sparkles, Target } from "lucide-react";
import type { OwnerDashboardData, RestaurantScope } from "@/features/owner/types";
import { formatCurrency, formatNullableCurrency } from "@/features/owner/ownerUtils";
import {
    getLatestOwnerAiInsightsJob,
    getOwnerAiInsightsJob,
    startOwnerAiInsightsJob,
    type OwnerAiInsightsJob,
    type OwnerAiInsights
} from "@/features/owner/ownerAiInsightsService";

type AiInsightsTabProps = {
    data: OwnerDashboardData;
    selectedRestaurantId: RestaurantScope;
};

function generatedLabel(value: string) {
    return new Date(value).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function toneClass(value: string) {
    const normalized = value.toLowerCase();

    if (normalized === "critical") {
        return "critical";
    }

    if (normalized === "warning") {
        return "warning";
    }

    return "healthy";
}

export function AiInsightsTab({ data, selectedRestaurantId }: AiInsightsTabProps) {
    const [insights, setInsights] = useState<OwnerAiInsights | null>(null);
    const [activeJob, setActiveJob] = useState<OwnerAiInsightsJob | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const scopeLabel = data.selectedRestaurant?.name ?? "Restaurant Portfolio";
    const issueCount = useMemo(() => {
        if (!insights) {
            return 0;
        }

        return insights.restaurantDoctor.filter(item => item.status !== "healthy").length +
            insights.riskBoard.filter(item => item.severity !== "normal").length;
    }, [insights]);

    useEffect(() => {
        let isMounted = true;

        setInsights(null);
        setActiveJob(null);
        setError(null);

        async function loadLatestJob() {
            try {
                const latestJob = await getLatestOwnerAiInsightsJob(selectedRestaurantId);

                if (!isMounted || !latestJob) {
                    return;
                }

                setActiveJob(latestJob);
                setIsGenerating(latestJob.status === "queued" || latestJob.status === "running");

                if (latestJob.status === "completed" && latestJob.result) {
                    setInsights(latestJob.result);
                } else if (latestJob.status === "failed" || latestJob.status === "cancelled") {
                    setError(latestJob.error ?? "Owner AI insights job did not complete.");
                }
            } catch (loadError) {
                if (isMounted) {
                    setError(loadError instanceof Error ? loadError.message : "Could not load latest owner AI insights job.");
                }
            }
        }

        void loadLatestJob();

        return () => {
            isMounted = false;
        };
    }, [selectedRestaurantId]);

    useEffect(() => {
        if (!activeJob || (activeJob.status !== "queued" && activeJob.status !== "running")) {
            return;
        }

        let isMounted = true;
        const intervalId = window.setInterval(async () => {
            try {
                const job = await getOwnerAiInsightsJob(activeJob.jobId);

                if (!isMounted) {
                    return;
                }

                setActiveJob(job);
                setIsGenerating(job.status === "queued" || job.status === "running");

                if (job.status === "completed" && job.result) {
                    setInsights(job.result);
                    setError(null);
                } else if (job.status === "failed" || job.status === "cancelled") {
                    setError(job.error ?? "Owner AI insights job did not complete.");
                }
            } catch (pollError) {
                if (isMounted) {
                    setIsGenerating(false);
                    setError(pollError instanceof Error ? pollError.message : "Could not check owner AI insights job.");
                }
            }
        }, 2000);

        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
        };
    }, [activeJob]);

    async function handleGenerate() {
        try {
            setIsGenerating(true);
            setError(null);
            const job = await startOwnerAiInsightsJob(selectedRestaurantId);
            setActiveJob(job);
            setInsights(job.result);
        } catch (generateError) {
            setError(generateError instanceof Error ? generateError.message : "Could not generate owner AI insights.");
            setIsGenerating(false);
        }
    }

    function jobStatusText() {
        if (!activeJob) {
            return "No background job has been started for this scope yet.";
        }

        if (activeJob.status === "completed") {
            return `Completed ${generatedLabel(activeJob.completedAt ?? activeJob.updatedAt)}.`;
        }

        if (activeJob.status === "failed") {
            return activeJob.error ?? "The background job failed.";
        }

        if (activeJob.status === "cancelled") {
            return activeJob.error ?? "The background job was cancelled.";
        }

        return "Background job is running. You can leave this tab and come back later.";
    }

    function handleRefreshJob() {
        if (activeJob?.status === "queued" || activeJob?.status === "running") {
            return;
        }

        void handleGenerate();
    }

    function renderStatusBadge() {
        if (!activeJob) {
            return null;
        }

        return (
            <small className={`owner-ai-job-status owner-ai-job-status--${toneClass(activeJob.status === "failed" ? "critical" : activeJob.status === "completed" ? "healthy" : "warning")}`}>
                {activeJob.status}
            </small>
        );
    }

    return (
        <div className="owner-ai-stack">
            <section className="owner-ai-intro">
                <div>
                    <span><Sparkles size={17} /> Owner AI Insights</span>
                    <h3>{scopeLabel}</h3>
                    <p>
                        AI reads the owner dashboard data and turns revenue, operations, inventory, and restaurant performance into clear decisions.
                    </p>
                </div>
                <div className="owner-ai-intro__metrics">
                    <small>Booked {formatCurrency(data.bookedRevenue)}</small>
                    <small>Forecast Gap {formatNullableCurrency(data.gapToForecast)}</small>
                    <small>{data.lowStockItems + data.outOfStockItems} stock risks</small>
                </div>
                <button type="button" className="owner-ai-generate" onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? <RefreshCw size={16} className="owner-ai-spin" /> : <Sparkles size={16} />}
                    {isGenerating ? "Generating..." : "Generate Owner Insights"}
                </button>
            </section>

            <section className="owner-ai-job-card">
                <div>
                    <strong>Background AI Job</strong>
                    <p>{jobStatusText()}</p>
                </div>
                {renderStatusBadge()}
            </section>

            {error && <div className="admin-alert admin-alert--warning">{error}</div>}
            {insights && !insights.isConfigured && (
                <div className="admin-alert admin-alert--warning">
                    OpenAI/OpenRouter is not configured, so these insights are generated from local owner rules.
                </div>
            )}

            {!insights ? (
                <section className="owner-ai-empty">
                    <Sparkles size={34} />
                    <h3>Generate executive insights</h3>
                    <p>
                        One click analyzes the selected owner scope and produces a portfolio summary, restaurant doctor, financial story, and action plan.
                    </p>
                </section>
            ) : (
                <section className="owner-ai-grid">
                    <article className="owner-ai-card owner-ai-card--summary">
                        <header>
                            <span><Sparkles size={18} /> Portfolio Summary</span>
                            <small>{generatedLabel(insights.generatedAt)} / {insights.model}</small>
                        </header>
                        <p>{insights.executiveSummary}</p>
                        <div className="owner-ai-actions">
                            {insights.actionPlan.map((action, index) => (
                                <span key={`${action}-${index}`}>{action}</span>
                            ))}
                        </div>
                    </article>

                    <article className="owner-ai-card">
                        <header>
                            <span><Building2 size={18} /> Restaurant Doctor</span>
                            <small>{issueCount} issue{issueCount === 1 ? "" : "s"} found</small>
                        </header>
                        <div className="owner-ai-list">
                            {insights.restaurantDoctor.map(item => (
                                <section
                                    key={item.restaurantName}
                                    className={`owner-ai-row owner-ai-row--${toneClass(item.status)}`}
                                >
                                    <div>
                                        <strong>{item.restaurantName}</strong>
                                        <small>
                                            {formatCurrency(item.revenue)} revenue / {item.occupancyRate}% occupancy / {item.paymentCaptureRate}% capture
                                        </small>
                                    </div>
                                    <span>{item.status}</span>
                                    <p>{item.insight}</p>
                                    <p>{item.recommendation}</p>
                                </section>
                            ))}
                            {insights.restaurantDoctor.length === 0 && <p className="admin-empty-cell">No restaurant insights found.</p>}
                        </div>
                    </article>

                    <article className="owner-ai-card">
                        <header>
                            <span><AlertTriangle size={18} /> Risk Board</span>
                            <small>Owner attention list</small>
                        </header>
                        <div className="owner-ai-list">
                            {insights.riskBoard.map(item => (
                                <section
                                    key={item.title}
                                    className={`owner-ai-row owner-ai-row--${toneClass(item.severity)}`}
                                >
                                    <div>
                                        <strong>{item.title}</strong>
                                        <small>{item.severity}</small>
                                    </div>
                                    <span>{item.severity}</span>
                                    <p>{item.insight}</p>
                                    <p>{item.recommendation}</p>
                                </section>
                            ))}
                        </div>
                    </article>

                    <article className="owner-ai-card owner-ai-card--story">
                        <header>
                            <span><CircleDollarSign size={18} /> Financial Story</span>
                            <button type="button" onClick={handleRefreshJob} disabled={isGenerating}>
                                <RefreshCw size={15} />
                                New Job
                            </button>
                        </header>
                        <p>{insights.financialStory}</p>
                    </article>

                    <article className="owner-ai-card owner-ai-card--story">
                        <header>
                            <span><Target size={18} /> Next Owner Moves</span>
                            <small>Practical action plan</small>
                        </header>
                        <div className="owner-ai-action-list">
                            {insights.actionPlan.map((action, index) => (
                                <p key={`${action}-${index}`}>
                                    <strong>{index + 1}</strong>
                                    {action}
                                </p>
                            ))}
                        </div>
                    </article>
                </section>
            )}
        </div>
    );
}
