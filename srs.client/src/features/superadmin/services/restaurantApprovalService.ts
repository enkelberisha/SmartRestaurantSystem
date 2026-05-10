import { authorizedApiFetch } from "@/lib/auth/authService";
import type { RestaurantApprovalRequest, RestaurantApprovalRequestDetail } from "@/lib/admin/adminService";

async function readErrorMessage(response: Response, fallback: string) {
    const error = await response.json().catch(() => ({ message: fallback })) as { message?: string };
    return error.message ?? fallback;
}

export async function getRestaurantApprovalRequests(): Promise<RestaurantApprovalRequestDetail[]> {
    const response = await authorizedApiFetch("/api/restaurant-approval-requests");
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load restaurant approval requests."));
    }

    return (await response.json()) as RestaurantApprovalRequestDetail[];
}

export async function approveRestaurantApprovalRequest(id: number): Promise<RestaurantApprovalRequest> {
    const response = await authorizedApiFetch(`/api/restaurant-approval-requests/${id}/approve`, {
        method: "POST"
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to approve request."));
    }

    return (await response.json()) as RestaurantApprovalRequest;
}

export async function rejectRestaurantApprovalRequest(id: number, reason: string): Promise<RestaurantApprovalRequest> {
    const response = await authorizedApiFetch(`/api/restaurant-approval-requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason })
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to reject request."));
    }

    return (await response.json()) as RestaurantApprovalRequest;
}
