import type { AdminOrder } from "@/lib/admin/adminService";
import type { PosTableMood } from "@/features/pos/types";

export const activeOrderStatuses = new Set(["pending", "inprogress", "ready"]);
export const closedOrderStatuses = new Set(["completed", "cancelled"]);
export const keypadValues = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLR", "0", "GO"];

export function normalizeStatus(status: string) {
    return status.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

export function money(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
    }).format(value);
}

export function buildTableMood(status: string, total: number): PosTableMood {
    const normalized = normalizeStatus(status);

    if (normalized === "outofservice") {
        return "attention";
    }

    if (normalized === "reserved") {
        return "reserved";
    }

    if (activeOrderStatuses.has(normalized)) {
        return "live";
    }

    if (total > 0) {
        return "bill";
    }

    return "idle";
}

export function newestFirst(first: AdminOrder, second: AdminOrder) {
    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
}
