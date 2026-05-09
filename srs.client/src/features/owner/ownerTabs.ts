import type { OwnerTabId } from "@/features/owner/types";

export const ownerTabs: Array<{ id: OwnerTabId; label: string; description: string }> = [
    { id: "overview", label: "Dashboard", description: "Money, orders, occupancy, and top-level health" },
    { id: "portfolio", label: "Portfolio", description: "Restaurants, locations, teams, and revenue" },
    { id: "operations", label: "Operations", description: "POS, reservations, kitchen flow, and service risk" },
    { id: "staff", label: "Staff", description: "Staff coverage and role mix" },
    { id: "finance", label: "Finance", description: "Revenue, payment health, and ticket value" }
];
