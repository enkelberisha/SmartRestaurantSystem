import { authorizedApiFetch } from "@/lib/auth/authService";
import { getManagerRestaurantSelection } from "@/manager/services/managerRestaurantService";
import type { AdminRestaurant } from "@/lib/admin/adminService";

export type AiMenuDoctorItem = {
    itemName: string;
    status: "healthy" | "warning" | "critical" | string;
    insight: string;
    recommendation: string;
    quantitySold: number;
    revenue: number;
};

export type AiRestockInsight = {
    itemName: string;
    urgency: "normal" | "warning" | "critical" | string;
    insight: string;
    recommendation: string;
    quantity: number;
    supplierName: string | null;
};

export type ManagerAiInsights = {
    smartSummary: string;
    menuDoctor: AiMenuDoctorItem[];
    restockIntelligence: AiRestockInsight[];
    revenueStory: string;
    actionItems: string[];
    isConfigured: boolean;
    model: string;
    generatedAt: string;
};

export type ManagerAiInsightRestaurants = {
    restaurants: AdminRestaurant[];
    selectedRestaurantId: number | null;
};

export type ManagerAiInsightsJob = {
    jobId: string;
    status: "queued" | "running" | "completed" | "failed" | "cancelled" | string;
    restaurantId: number;
    result: ManagerAiInsights | null;
    error: string | null;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
};

async function readJson<T>(response: Response, fallback: string): Promise<T> {
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || fallback);
    }

    return (await response.json()) as T;
}

async function readOptionalJson<T>(response: Response, fallback: string): Promise<T | null> {
    if (response.status === 204) {
        return null;
    }

    return readJson<T>(response, fallback);
}

export async function getManagerAiInsightRestaurants(
    managerUserId: number,
    selectedRestaurantId: number | null
): Promise<ManagerAiInsightRestaurants> {
    const { restaurants, restaurantId } = await getManagerRestaurantSelection(managerUserId, selectedRestaurantId);

    return {
        restaurants,
        selectedRestaurantId: restaurantId
    };
}

export async function generateManagerAiInsights(restaurantId: number): Promise<ManagerAiInsights> {
    const response = await authorizedApiFetch("/api/ai/manager-insights", {
        method: "POST",
        body: JSON.stringify({ restaurantId })
    });

    return readJson<ManagerAiInsights>(response, "Failed to generate AI insights.");
}

export async function startManagerAiInsightsJob(restaurantId: number): Promise<ManagerAiInsightsJob> {
    const response = await authorizedApiFetch("/api/ai/manager-insights/jobs", {
        method: "POST",
        body: JSON.stringify({ restaurantId })
    });

    return readJson<ManagerAiInsightsJob>(response, "Failed to start AI insights job.");
}

export async function getManagerAiInsightsJob(jobId: string): Promise<ManagerAiInsightsJob> {
    const response = await authorizedApiFetch(`/api/ai/manager-insights/jobs/${jobId}`);

    return readJson<ManagerAiInsightsJob>(response, "Failed to load AI insights job.");
}

export async function getLatestManagerAiInsightsJob(restaurantId: number): Promise<ManagerAiInsightsJob | null> {
    const response = await authorizedApiFetch(`/api/ai/manager-insights/latest?restaurantId=${restaurantId}`);

    return readOptionalJson<ManagerAiInsightsJob>(response, "Failed to load latest AI insights job.");
}
