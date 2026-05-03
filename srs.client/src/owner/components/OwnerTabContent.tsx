import type { OwnerDashboardData, OwnerTabId } from "@/owner/types";
import { FinanceTab } from "@/owner/tabs/FinanceTab";
import { OperationsTab } from "@/owner/tabs/OperationsTab";
import { OverviewTab } from "@/owner/tabs/OverviewTab";
import { StaffTab } from "@/owner/tabs/StaffTab";
import { PortfolioTab } from "@/owner/tabs/PortfolioTab";

type OwnerTabContentProps = {
    activeTab: OwnerTabId;
    data: OwnerDashboardData;
    isLoading: boolean;
};

export function OwnerTabContent({ activeTab, data, isLoading }: OwnerTabContentProps) {
    if (isLoading) {
        return (
            <div className="owner-grid owner-grid--kpis">
                {Array.from({ length: 6 }, (_, index) => (
                    <div key={index} className="skeleton-block admin-kpi-skeleton" />
                ))}
            </div>
        );
    }

    if (activeTab === "portfolio") {
        return <PortfolioTab data={data} />;
    }

    if (activeTab === "operations") {
        return <OperationsTab data={data} />;
    }

    if (activeTab === "staff") {
        return <StaffTab data={data} />;
    }

    if (activeTab === "finance") {
        return <FinanceTab data={data} />;
    }

    return <OverviewTab data={data} />;
}
