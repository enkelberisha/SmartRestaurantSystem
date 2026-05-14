import { authorizedApiFetch } from "@/lib/auth/authService";
import type { CartLine } from "@/features/table-ordering/types";

export type TableSession = {
    id: string;
    tenantId: string;
    restaurantId: number;
    restaurantName: string;
    tableId: number;
    tableNumber: number;
    status: "Active" | "Closed";
    createdAt: string;
    closedAt: string | null;
    lastSeenAt: string;
};

export type TableSessionOrder = {
    id: number;
    tableSessionId: string;
    tableId: number;
    tableNumber: number;
    status: string;
    total: number;
    createdAt: string;
    lines: Array<{
        id: number;
        menuItemId: number;
        name: string;
        quantity: number;
        price: number;
        notes?: string | null;
    }>;
};

export type TableSessionPayment = {
    id: number;
    orderId: number;
    amount: number;
    method: string;
    status: string;
    createdAt: string;
};

async function readErrorMessage(response: Response, fallback: string) {
    const text = await response.text();

    if (!text) {
        return fallback;
    }

    try {
        const error = JSON.parse(text) as { message?: string };
        return error.message ?? fallback;
    } catch {
        return text;
    }
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, fallback));
    }

    return (await response.json()) as T;
}

export async function createTableSession(tableId: number) {
    const response = await authorizedApiFetch("/api/table-sessions", {
        method: "POST",
        body: JSON.stringify({ tableId })
    });

    return readJson<TableSession>(response, "Failed to open table session.");
}

export async function getTableSession(sessionId: string) {
    const response = await authorizedApiFetch(`/api/table-sessions/${sessionId}`);
    return readJson<TableSession>(response, "Failed to load table session.");
}

export async function getTableSessionOrders(sessionId: string) {
    const response = await authorizedApiFetch(`/api/table-sessions/${sessionId}/orders`);
    return readJson<TableSessionOrder[]>(response, "Failed to load table orders.");
}

export async function closeTableSession(sessionId: string) {
    const response = await authorizedApiFetch(`/api/table-sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Closed" })
    });

    return readJson<TableSession>(response, "Failed to close table session.");
}

export async function createTableSessionOrder(sessionId: string, lines: CartLine[]) {
    const response = await authorizedApiFetch(`/api/table-sessions/${sessionId}/orders`, {
        method: "POST",
        body: JSON.stringify({
            lines: lines.map(line => ({
                menuItemId: line.item.id,
                quantity: line.quantity,
                notes: line.notes || null
            }))
        })
    });

    return readJson<TableSessionOrder>(response, "Failed to send order.");
}

export async function createTableSessionPayment(orderId: number, amount: number, method: "Card" | "Cash" | "Online") {
    const response = await authorizedApiFetch("/api/payments", {
        method: "POST",
        body: JSON.stringify({
            orderId,
            amount,
            method
        })
    });

    return readJson<TableSessionPayment>(response, "Failed to create payment.");
}

export async function completeTableSessionPayment(paymentId: number) {
    const response = await authorizedApiFetch(`/api/payments/${paymentId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "Completed" })
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to complete payment."));
    }
}

export async function completeTableSessionOrder(orderId: number) {
    const response = await authorizedApiFetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "Completed" })
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to complete order."));
    }
}
