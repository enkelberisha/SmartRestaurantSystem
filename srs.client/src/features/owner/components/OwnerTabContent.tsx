import type { OwnerDashboardData, OwnerTabId } from "@/features/owner/types";
import { FinanceTab } from "@/features/owner/tabs/FinanceTab";
import { OperationsTab } from "@/features/owner/tabs/OperationsTab";
import { OverviewTab } from "@/features/owner/tabs/OverviewTab";
import { StaffTab } from "@/features/owner/tabs/StaffTab";
import { PortfolioTab } from "@/features/owner/tabs/PortfolioTab";

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
