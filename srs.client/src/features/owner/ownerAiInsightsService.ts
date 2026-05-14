import { authorizedApiFetch } from "@/lib/auth/authService";
import type { RestaurantScope } from "@/features/owner/types";

export type OwnerRestaurantDoctorItem = {
    restaurantName: string;
    status: "healthy" | "warning" | "critical" | string;
    insight: string;
    recommendation: string;
    revenue: number;
    gapToForecast: number | null;
    occupancyRate: number;
    paymentCaptureRate: number;
    lowStockItems: number;
};

export type OwnerRiskItem = {
    title: string;
    severity: "normal" | "warning" | "critical" | string;
    insight: string;
    recommendation: string;
};

export type OwnerAiInsights = {
    executiveSummary: string;
    restaurantDoctor: OwnerRestaurantDoctorItem[];
    financialStory: string;
    riskBoard: OwnerRiskItem[];
    actionPlan: string[];
    isConfigured: boolean;
    model: string;
    generatedAt: string;
};

export type OwnerAiInsightsJob = {
    jobId: string;
    status: "queued" | "running" | "completed" | "failed" | "cancelled" | string;
    restaurantId: number | null;
    result: OwnerAiInsights | null;
    error: string | null;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
};

async function readJson<T>(response: Response, fallback: string): Promise<T> {
    if (!response.ok) {
        const text = await response.text();

        if (!text) {
            throw new Error(fallback);
        }

        let message = text;

        try {
            const payload = JSON.parse(text) as { message?: string };
            message = payload.message ?? text;
        } catch {
            message = text;
        }

        throw new Error(message || fallback);
    }

    return (await response.json()) as T;
}

async function readOptionalJson<T>(response: Response, fallback: string): Promise<T | null> {
    if (response.status === 204) {
        return null;
    }

    return readJson<T>(response, fallback);
}

function restaurantIdFromScope(scope: RestaurantScope) {
    return scope === "all" ? null : scope;
}

export async function generateOwnerAiInsights(scope: RestaurantScope): Promise<OwnerAiInsights> {
    const restaurantId = restaurantIdFromScope(scope);
    const response = await authorizedApiFetch("/api/ai/owner-insights", {
        method: "POST",
        body: JSON.stringify({ restaurantId })
    });

    return readJson<OwnerAiInsights>(response, "Failed to generate owner AI insights.");
}

export async function startOwnerAiInsightsJob(scope: RestaurantScope): Promise<OwnerAiInsightsJob> {
    const restaurantId = restaurantIdFromScope(scope);
    const response = await authorizedApiFetch("/api/ai/owner-insights/jobs", {
        method: "POST",
        body: JSON.stringify({ restaurantId })
    });

    return readJson<OwnerAiInsightsJob>(response, "Failed to start owner AI insights job.");
}

export async function getOwnerAiInsightsJob(jobId: string): Promise<OwnerAiInsightsJob> {
    const response = await authorizedApiFetch(`/api/ai/owner-insights/jobs/${jobId}`);

    return readJson<OwnerAiInsightsJob>(response, "Failed to load owner AI insights job.");
}

export async function getLatestOwnerAiInsightsJob(scope: RestaurantScope): Promise<OwnerAiInsightsJob | null> {
    const restaurantId = scope === "all" ? null : scope;
    const query = restaurantId === null ? "" : `?restaurantId=${restaurantId}`;
    const response = await authorizedApiFetch(`/api/ai/owner-insights/latest${query}`);

    return readOptionalJson<OwnerAiInsightsJob>(response, "Failed to load latest owner AI insights job.");
}
