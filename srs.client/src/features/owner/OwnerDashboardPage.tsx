import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
    Activity,
    ArrowUpRight,
    BarChart3,
    Bell,
    Building2,
    CalendarDays,
    ChevronDown,
    CircleDollarSign,
    ClipboardList,
    LayoutDashboard,
    Menu,
    Search,
    Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUserContext } from "@/context/useUserContext";
import { useTheme } from "@/hooks/useTheme";
import { getBrandLogo } from "@/lib/branding/brandLogo";
import { OwnerModals } from "@/features/owner/components/OwnerModals";
import { OwnerTabContent } from "@/features/owner/components/OwnerTabContent";
import { ownerTabs } from "@/features/owner/ownerTabs";
import type { OwnerTabId, RestaurantScope } from "@/features/owner/types";
import { formatCurrency, formatNullableCurrency, formatNullablePercent, getInitials } from "@/features/owner/ownerUtils";
import { useOwnerDashboard } from "@/features/owner/useOwnerDashboard";

type OwnerSearchResult = {
    key: string;
    label: string;
    meta: string;
    tab: OwnerTabId;
    scope?: RestaurantScope;
};

const ownerTabIcons: Record<OwnerTabId, ReactNode> = {
    overview: <LayoutDashboard size={19} />,
    portfolio: <Building2 size={19} />,
    operations: <ClipboardList size={19} />,
    staff: <Users size={19} />,
    finance: <CircleDollarSign size={19} />
};

export function OwnerDashboardPage() {
    const navigate = useNavigate();
    const { profile, isLoading: isProfileLoading, logout } = useUserContext();
    const { theme, toggleTheme } = useTheme();
    const brandLogo = getBrandLogo(theme);
    const [activeTab, setActiveTab] = useState<OwnerTabId>("overview");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [restaurantPickerOpen, setRestaurantPickerOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<RestaurantScope>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const { data, error, isLoading } = useOwnerDashboard(selectedRestaurantId);

    const selectedRestaurantName = data.selectedRestaurant?.name ?? "Restaurant Portfolio";
    const localPart = profile?.email.split("@")[0] ?? "owner";
    const avatar = getInitials(localPart, "OW");
    const featuredRestaurants = data.portfolioRows.slice(0, 4);
    const activeOrderPreview = data.recentOrders.slice(0, 3);
    const searchResults = useMemo<OwnerSearchResult[]>(() => {
        const query = searchQuery.trim().toLowerCase();

        if (!query) {
            return [];
        }

        const restaurantResults = data.portfolioRows
            .filter(row => `${row.name} ${row.location}`.toLowerCase().includes(query))
            .slice(0, 4)
            .map(row => ({
                key: `restaurant-${row.id}`,
                label: row.name,
                meta: `${row.location} / ${formatCurrency(row.revenue)} booked`,
                tab: "portfolio" as OwnerTabId,
                scope: row.id
            }));
        const staffResults = data.scopedStaff
            .filter(member => `staff ${member.id} user ${member.userId} ${member.position}`.toLowerCase().includes(query))
            .slice(0, 3)
            .map(member => ({
                key: `staff-${member.id}`,
                label: `Staff #${member.id}`,
                meta: `${member.position} / User #${member.userId}`,
                tab: "staff" as OwnerTabId
            }));
        const orderResults = data.scopedOrders
            .filter(order => `${order.status} ${data.tableLabel(order.tableId)} ${order.total}`.toLowerCase().includes(query))
            .slice(-3)
            .reverse()
            .map(order => ({
                key: `order-${order.id}`,
                label: `${data.tableLabel(order.tableId)} / ${formatCurrency(order.total)}`,
                meta: order.status,
                tab: "operations" as OwnerTabId
            }));

        return [...restaurantResults, ...staffResults, ...orderResults].slice(0, 8);
    }, [data, searchQuery]);

    const handleRestaurantChange = (scope: RestaurantScope) => {
        setSelectedRestaurantId(scope);
        setRestaurantPickerOpen(false);
    };

    const handleSearchResult = (result: OwnerSearchResult) => {
        if (result.scope !== undefined) {
            setSelectedRestaurantId(result.scope);
        }

        setActiveTab(result.tab);
        setSearchQuery("");
    };

    const handleLogout = async () => {
        await logout();
        navigate("/login", { replace: true });
    };

    if (isProfileLoading || !profile) {
        return (
            <main className="sa-content owner-loading">
                <div className="sa-stack">
                    <p>Loading owner session...</p>
                </div>
            </main>
        );
    }

    return (
        <div className={`sa-shell owner-shell ${sidebarOpen ? "sa-shell--sidebar-open" : ""}`}>
            <aside className="sa-sidebar owner-sidebar">
                <div className="sa-sidebar__brand">
                    <button type="button" className="brand-mark owner-brand-button" onClick={() => setActiveTab("overview")}>
                        <img className="brand-mark__image brand-mark__image--sidebar" src={brandLogo} alt="Smart Restaurant System" />
                    </button>
                </div>

                <nav className="sa-nav owner-nav" aria-label="Owner dashboard">
                    {ownerTabs.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            className={`sa-nav__link owner-nav__link ${activeTab === tab.id ? "sa-nav__link--active" : ""}`}
                            aria-label={tab.label}
                            title={tab.label}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setSidebarOpen(false);
                            }}
                        >
                            {ownerTabIcons[tab.id]}
                            <span className="owner-nav__text">{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            <div className="sa-main">
                <header className="sa-topbar owner-topbar">
                    <div className="sa-topbar__left">
                        <button
                            type="button"
                            className="icon-button sa-topbar__menu"
                            onClick={() => setSidebarOpen(current => !current)}
                            aria-label="Toggle sidebar"
                        >
                            <Menu size={18} />
                        </button>
                        <div className="owner-search-wrap">
                            <label className="sa-search owner-search">
                                <Search size={16} />
                                <input
                                    type="search"
                                    value={searchQuery}
                                    placeholder="Search restaurants, orders, staff..."
                                    onChange={event => setSearchQuery(event.target.value)}
                                />
                            </label>
                            {searchQuery.trim() && (
                                <div className="owner-search-results">
                                    {searchResults.length > 0 ? (
                                        searchResults.map(result => (
                                            <button
                                                key={result.key}
                                                type="button"
                                                onClick={() => handleSearchResult(result)}
                                            >
                                                <span>
                                                    <strong>{result.label}</strong>
                                                    <small>{result.meta}</small>
                                                </span>
                                                <ArrowUpRight size={16} />
                                            </button>
                                        ))
                                    ) : (
                                        <p>No owner records found.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="sa-topbar__right">
                        <button
                            type="button"
                            className="admin-restaurant-switcher"
                            onClick={() => setRestaurantPickerOpen(true)}
                            disabled={data.restaurants.length === 0}
                            aria-label="Choose owner restaurant scope"
                        >
                            <Building2 size={16} />
                            <span>{data.selectedRestaurant?.name ?? "All restaurants"}</span>
                            <ChevronDown size={16} />
                        </button>
                        <ThemeToggle theme={theme} onToggle={toggleTheme} />
                        <button
                            type="button"
                            className="icon-button"
                            aria-label="Notifications"
                            onClick={() => setNotificationsOpen(true)}
                        >
                            <Bell size={18} />
                        </button>
                        <button type="button" className="sa-avatar" onClick={() => setProfileOpen(true)}>
                            <span>{avatar}</span>
                            <div className="sa-avatar__meta">
                                <strong>{localPart}</strong>
                                <small>{profile.role}</small>
                            </div>
                            <ChevronDown size={16} />
                        </button>
                    </div>
                </header>

                <main className="sa-content owner-main">
                    <section className="owner-hero">
                        <div className="owner-hero__header">
                            <div>
                                <span className="owner-hero__eyebrow">Owner Live Desk</span>
                                <h1>{selectedRestaurantName}</h1>
                            </div>
                        </div>
                        <div className="owner-hero__metrics" aria-label="Owner dashboard actions">
                            <button type="button" className="owner-hero-card owner-hero-card--revenue" onClick={() => setActiveTab("finance")}>
                                <CircleDollarSign size={22} />
                                <span>Booked Revenue</span>
                                <strong>{formatCurrency(data.bookedRevenue)}</strong>
                                <small>{formatNullableCurrency(data.revenueForecast)} forecast</small>
                            </button>
                            <button type="button" className="owner-hero-card" onClick={() => setActiveTab("operations")}>
                                <ClipboardList size={22} />
                                <span>Gap to Forecast</span>
                                <strong>{formatNullableCurrency(data.gapToForecast)}</strong>
                                <small>{formatNullableCurrency(data.gapToBudget)} vs budget</small>
                            </button>
                            <button type="button" className="owner-hero-card" onClick={() => setActiveTab("operations")}>
                                <Activity size={22} />
                                <span>Pace to Prior Year</span>
                                <strong>{formatNullablePercent(data.paceToPriorYear)}</strong>
                                <small>{formatNullableCurrency(data.priorYearRevenue)} baseline</small>
                            </button>
                            <button type="button" className="owner-hero-card" onClick={() => setActiveTab("staff")}>
                                <Users size={22} />
                                <span>Occupancy / ADR</span>
                                <strong>{data.occupancyRate}%</strong>
                                <small>{formatCurrency(data.adr)} ADR</small>
                            </button>
                        </div>
                        <div className="owner-hero__bottom">
                            <div className="owner-scope-strip" aria-label="Restaurant scope quick switcher">
                                <button
                                    type="button"
                                    className={selectedRestaurantId === "all" ? "owner-scope-strip__item owner-scope-strip__item--active" : "owner-scope-strip__item"}
                                    onClick={() => handleRestaurantChange("all")}
                                >
                                    <Building2 size={17} />
                                    <span>
                                        <strong>All</strong>
                                        <small>{data.restaurants.length} locations</small>
                                    </span>
                                </button>
                                {featuredRestaurants.map(row => (
                                    <button
                                        key={row.id}
                                        type="button"
                                        className={selectedRestaurantId === row.id ? "owner-scope-strip__item owner-scope-strip__item--active" : "owner-scope-strip__item"}
                                        onClick={() => handleRestaurantChange(row.id)}
                                    >
                                        <span>
                                            <strong>{row.name}</strong>
                                            <small>{row.openOrders} open / {formatCurrency(row.revenue)}</small>
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <button type="button" className="owner-flow-card" onClick={() => setActiveTab("operations")}>
                                <div>
                                    <CalendarDays size={18} />
                                    <span>Service Flow</span>
                                </div>
                                {activeOrderPreview.length > 0 ? (
                                    activeOrderPreview.map(order => (
                                        <small key={order.id}>
                                            {data.tableLabel(order.tableId)} / {order.status} / {formatCurrency(order.total)}
                                        </small>
                                    ))
                                ) : (
                                    <small>No active service issues in this scope.</small>
                                )}
                            </button>
                            <button type="button" className="owner-flow-card owner-flow-card--chart" onClick={() => setActiveTab("portfolio")}>
                                <div>
                                    <BarChart3 size={18} />
                                    <span>Portfolio Mix</span>
                                </div>
                                <i style={{ width: `${Math.max(data.occupancyRate, 8)}%` }} />
                                <small>{data.tabletReadyTables} tablet-ready tables</small>
                            </button>
                        </div>
                    </section>

                    {error && <div className="admin-alert admin-alert--warning">{error}</div>}

                    <OwnerTabContent
                        activeTab={activeTab}
                        data={data}
                        isLoading={isLoading}
                    />
                </main>
            </div>

            <OwnerModals
                data={data}
                notificationsOpen={notificationsOpen}
                profile={profile}
                profileOpen={profileOpen}
                restaurantPickerOpen={restaurantPickerOpen}
                selectedRestaurantId={selectedRestaurantId}
                onCloseNotifications={() => setNotificationsOpen(false)}
                onCloseProfile={() => setProfileOpen(false)}
                onCloseRestaurantPicker={() => setRestaurantPickerOpen(false)}
                onLogout={handleLogout}
                onRestaurantChange={handleRestaurantChange}
            />
        </div>
    );
}
