import { useEffect, useMemo, useState } from "react";
import {
    Bell,
    BookOpen,
    Building2,
    ChevronDown,
    CookingPot,
    LayoutDashboard,
    Menu,
    RefreshCw,
    Search,
    Settings,
    Sparkles,
    Table2,
    TrendingUp,
    Utensils,
    WalletCards,
    Warehouse
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { ProfileModal } from "@/components/ProfileModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUserContext } from "@/context/useUserContext";
import { useTheme } from "@/hooks/useTheme";
import { getBrandLogo } from "@/lib/branding/brandLogo";
import {
    getLatestManagerAiInsightsJob,
    getManagerAiInsightRestaurants,
    getManagerAiInsightsJob,
    startManagerAiInsightsJob,
    type ManagerAiInsightsJob,
    type ManagerAiInsights
} from "@/manager/services/aiInsightsService";
import {
    getStoredManagerRestaurantId,
    storeManagerRestaurantId
} from "@/manager/services/managerRestaurantService";
import { Modal } from "@/features/superadmin/components/Modal";

const navItems = [
    { href: "/manager", label: "Dashboard", icon: LayoutDashboard, end: true, disabled: false },
    { href: "/manager/orders", label: "Orders", icon: WalletCards, disabled: false },
    { href: "/manager/tables", label: "Tables", icon: Table2, disabled: false },
    { href: "/manager/kitchen", label: "Kitchen", icon: CookingPot, disabled: false },
    { href: "/manager/menus", label: "Menus", icon: BookOpen, disabled: false },
    { href: "/manager/inventory", label: "Inventory", icon: Settings, disabled: false },
    { href: "/manager/ai-insights", label: "AI Insights", icon: Sparkles, disabled: false }
];

function money(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
    }).format(value);
}

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

export function ManagerAiInsightsPage() {
    const { profile, isLoading: profileLoading, logout } = useUserContext();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const brandLogo = getBrandLogo(theme);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(() => getStoredManagerRestaurantId());
    const [restaurants, setRestaurants] = useState<Awaited<ReturnType<typeof getManagerAiInsightRestaurants>>["restaurants"]>([]);
    const [insights, setInsights] = useState<ManagerAiInsights | null>(null);
    const [activeJob, setActiveJob] = useState<ManagerAiInsightsJob | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const localPart = profile?.email.split("@")[0] ?? "manager";
    const avatar = localPart
        .split(/[^a-zA-Z0-9]/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part[0]?.toUpperCase() ?? "")
        .join("") || "MG";
    const canSwitchRestaurants = restaurants.length > 1;
    const selectedRestaurant = restaurants.find(restaurant => restaurant.id === selectedRestaurantId) ?? restaurants[0] ?? null;
    const issueCount = useMemo(() => {
        if (!insights) {
            return 0;
        }

        return insights.menuDoctor.filter(item => item.status !== "healthy").length +
            insights.restockIntelligence.filter(item => item.urgency !== "normal").length;
    }, [insights]);

    async function loadRestaurants(restaurantId = selectedRestaurantId) {
        if (!profile) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const result = await getManagerAiInsightRestaurants(profile.appUserId, restaurantId);
            setRestaurants(result.restaurants);
            setSelectedRestaurantId(result.selectedRestaurantId);
            storeManagerRestaurantId(result.selectedRestaurantId);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load restaurants.");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleGenerate() {
        if (!selectedRestaurantId) {
            setError("No restaurant is selected.");
            return;
        }

        try {
            setIsGenerating(true);
            setError(null);
            const job = await startManagerAiInsightsJob(selectedRestaurantId);
            setActiveJob(job);
            setInsights(job.result);
        } catch (generateError) {
            setError(generateError instanceof Error ? generateError.message : "Could not generate AI insights.");
            setIsGenerating(false);
        }
    }

    function jobStatusText() {
        if (!activeJob) {
            return "No background job has been started for this restaurant yet.";
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

        return "Background job is running. You can leave this page and come back later.";
    }

    useEffect(() => {
        void loadRestaurants();
    }, [profile, selectedRestaurantId]);

    useEffect(() => {
        if (!selectedRestaurantId) {
            return;
        }

        const restaurantId = selectedRestaurantId;
        let isMounted = true;

        async function loadLatestJob() {
            try {
                const latestJob = await getLatestManagerAiInsightsJob(restaurantId);

                if (!isMounted || !latestJob) {
                    return;
                }

                setActiveJob(latestJob);
                setIsGenerating(latestJob.status === "queued" || latestJob.status === "running");

                if (latestJob.status === "completed" && latestJob.result) {
                    setInsights(latestJob.result);
                } else if (latestJob.status === "failed" || latestJob.status === "cancelled") {
                    setError(latestJob.error ?? "AI insights job did not complete.");
                }
            } catch (loadError) {
                if (isMounted) {
                    setError(loadError instanceof Error ? loadError.message : "Could not load latest AI insights job.");
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
                const job = await getManagerAiInsightsJob(activeJob.jobId);

                if (!isMounted) {
                    return;
                }

                setActiveJob(job);
                setIsGenerating(job.status === "queued" || job.status === "running");

                if (job.status === "completed" && job.result) {
                    setInsights(job.result);
                    setError(null);
                } else if (job.status === "failed" || job.status === "cancelled") {
                    setError(job.error ?? "AI insights job did not complete.");
                }
            } catch (pollError) {
                if (isMounted) {
                    setIsGenerating(false);
                    setError(pollError instanceof Error ? pollError.message : "Could not check AI insights job.");
                }
            }
        }, 2000);

        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
        };
    }, [activeJob]);

    if (profileLoading || isLoading) {
        return (
            <main className="sa-content manager-shell--loading">
                <section className="manager-loading-card">
                    <div className="skeleton-block manager-loading-card__logo" />
                    <div className="skeleton-block manager-loading-card__line" />
                    <div className="skeleton-block manager-loading-card__body" />
                </section>
            </main>
        );
    }

    return (
        <div className={`sa-shell manager-layout ${sidebarOpen ? "sa-shell--sidebar-open" : ""}`}>
            <aside className="sa-sidebar manager-sidebar">
                <div className="sa-sidebar__brand">
                    <Link to="/manager" className="brand-mark">
                        <img className="brand-mark__image brand-mark__image--sidebar" src={brandLogo} alt="Smart Restaurant System" />
                    </Link>
                </div>

                <nav className="sa-nav admin-nav" aria-label="Manager">
                    {navItems.map(item => item.disabled ? (
                        <span key={item.label} className="sa-nav__link admin-nav__link manager-nav__disabled">
                            <item.icon size={18} aria-hidden="true" />
                            <span>{item.label}</span>
                        </span>
                    ) : (
                        <NavLink
                            key={`${item.href}-${item.label}`}
                            to={item.href}
                            end={item.end}
                            className={({ isActive }) =>
                                `sa-nav__link admin-nav__link ${isActive ? "sa-nav__link--active admin-nav__link--active" : ""}`
                            }
                            onClick={() => setSidebarOpen(false)}
                        >
                            <item.icon size={18} aria-hidden="true" />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
            </aside>

            <div className="sa-main">
                <header className="sa-topbar">
                    <div className="sa-topbar__left">
                        <button
                            type="button"
                            className="icon-button sa-topbar__menu"
                            onClick={() => setSidebarOpen(current => !current)}
                            aria-label="Toggle sidebar"
                        >
                            <Menu size={18} />
                        </button>
                        <label className="sa-search">
                            <Search size={16} />
                            <input type="search" placeholder="Search manager records..." />
                        </label>
                    </div>

                    <div className="sa-topbar__right">
                        <label className={`admin-restaurant-switcher manager-restaurant-switcher ${canSwitchRestaurants ? "" : "manager-restaurant-switcher--static"}`}>
                            <Building2 size={16} />
                            {canSwitchRestaurants ? (
                                <>
                                    <span className="manager-restaurant-switcher__value">
                                        {selectedRestaurant?.name ?? "Choose restaurant"}
                                    </span>
                                    <select
                                        value={selectedRestaurantId ?? ""}
                                        onChange={event => {
                                            const restaurantId = Number(event.target.value);
                                            setSelectedRestaurantId(restaurantId);
                                            storeManagerRestaurantId(restaurantId);
                                            setInsights(null);
                                        }}
                                        aria-label="Choose managed restaurant"
                                    >
                                        {restaurants.map(restaurant => (
                                            <option key={restaurant.id} value={restaurant.id}>
                                                {restaurant.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} />
                                </>
                            ) : (
                                <span className="manager-restaurant-switcher__value">{selectedRestaurant?.name ?? "No restaurant assigned"}</span>
                            )}
                        </label>
                        <ThemeToggle theme={theme} onToggle={toggleTheme} />
                        <button type="button" className="icon-button" aria-label="Notifications" onClick={() => setNotificationsOpen(true)}>
                            <Bell size={18} />
                        </button>
                        <button type="button" className="sa-avatar" onClick={() => setProfileOpen(true)}>
                            <span>{avatar}</span>
                            <div className="sa-avatar__meta">
                                <strong>{localPart}</strong>
                                <small>{profile?.role ?? "Manager"}</small>
                            </div>
                            <ChevronDown size={16} />
                        </button>
                    </div>
                </header>

                <main className="sa-content manager-content">
                    <div className="admin-stack">
                        <header className="admin-page-header">
                            <div>
                                <h1>AI Insights</h1>
                                <p>{selectedRestaurant ? `Operational insights for ${selectedRestaurant.name}` : "No restaurant assigned"}</p>
                            </div>
                            <Button disabled={!selectedRestaurantId} isLoading={isGenerating} onClick={handleGenerate}>
                                <Sparkles size={16} />
                                Generate Insights
                            </Button>
                        </header>

                        {error && <div className="manager-alert">{error}</div>}
                        <section className="manager-ai-job-card">
                            <div>
                                <strong>Background AI Job</strong>
                                <p>{jobStatusText()}</p>
                            </div>
                            {activeJob && <small className={`manager-ai-job-status manager-ai-job-status--${toneClass(activeJob.status === "failed" ? "critical" : activeJob.status === "completed" ? "healthy" : "warning")}`}>{activeJob.status}</small>}
                        </section>
                        {insights && !insights.isConfigured && (
                            <div className="manager-alert">
                                OpenAI API key is not configured, so these insights are generated from local rules.
                            </div>
                        )}

                        {!insights ? (
                            <section className="manager-ai-insights-empty">
                                <Sparkles size={34} />
                                <h2>Generate AI Insights</h2>
                                <p>One click analyzes recent orders, menu sales, inventory, purchase orders, and revenue patterns for the selected restaurant.</p>
                            </section>
                        ) : (
                            <section className="manager-ai-insights">
                                <article className="manager-ai-insight manager-ai-insight--summary">
                                    <header>
                                        <span><Sparkles size={18} /> Smart Summary</span>
                                        <small>{generatedLabel(insights.generatedAt)} · {insights.model}</small>
                                    </header>
                                    <p>{insights.smartSummary}</p>
                                    <div className="manager-ai-actions">
                                        {insights.actionItems.map(action => (
                                            <span key={action}>{action}</span>
                                        ))}
                                    </div>
                                </article>

                                <article className="manager-ai-insight">
                                    <header>
                                        <span><Utensils size={18} /> Menu Doctor</span>
                                        <small>{issueCount} item{issueCount === 1 ? "" : "s"} need attention</small>
                                    </header>
                                    <div className="manager-ai-list">
                                        {insights.menuDoctor.map(item => (
                                            <section key={item.itemName} className={`manager-ai-row manager-ai-row--${toneClass(item.status)}`}>
                                                <div>
                                                    <strong>{item.itemName}</strong>
                                                    <small>{item.quantitySold} sold · {money(item.revenue)}</small>
                                                </div>
                                                <span>{item.status}</span>
                                                <p>{item.insight}</p>
                                                <p>{item.recommendation}</p>
                                            </section>
                                        ))}
                                        {insights.menuDoctor.length === 0 && <p className="manager-empty">No menu insights found.</p>}
                                    </div>
                                </article>

                                <article className="manager-ai-insight">
                                    <header>
                                        <span><Warehouse size={18} /> Restock Intelligence</span>
                                        <small>Inventory risk timing</small>
                                    </header>
                                    <div className="manager-ai-list">
                                        {insights.restockIntelligence.map(item => (
                                            <section key={item.itemName} className={`manager-ai-row manager-ai-row--${toneClass(item.urgency)}`}>
                                                <div>
                                                    <strong>{item.itemName}</strong>
                                                    <small>{item.quantity} units · {item.supplierName ?? "No supplier"}</small>
                                                </div>
                                                <span>{item.urgency}</span>
                                                <p>{item.insight}</p>
                                                <p>{item.recommendation}</p>
                                            </section>
                                        ))}
                                        {insights.restockIntelligence.length === 0 && <p className="manager-empty">No inventory insights found.</p>}
                                    </div>
                                </article>

                                <article className="manager-ai-insight manager-ai-insight--revenue">
                                    <header>
                                        <span><TrendingUp size={18} /> Revenue Story</span>
                                        <button type="button" onClick={() => void handleGenerate()} disabled={isGenerating}>
                                            <RefreshCw size={15} />
                                            New Job
                                        </button>
                                    </header>
                                    <p>{insights.revenueStory}</p>
                                </article>
                            </section>
                        )}
                    </div>
                </main>

                <Modal title="Notifications" open={notificationsOpen} onClose={() => setNotificationsOpen(false)}>
                    <div className="sa-activity-list">
                        <article className="sa-activity">
                            <p>No notifications yet.</p>
                        </article>
                    </div>
                </Modal>

                {profile ? (
                    <ProfileModal
                        open={profileOpen}
                        profile={profile}
                        primaryLabel={localPart}
                        onClose={() => setProfileOpen(false)}
                        onLogout={async () => {
                            await logout();
                            navigate("/login", { replace: true });
                        }}
                    />
                ) : null}
            </div>
        </div>
    );
}
