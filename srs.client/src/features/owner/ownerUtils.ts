export const chartColors = ["#5b31ff", "#1e9ea9", "#0f8b6d", "#d97706", "#c33f5d"];
export const openOrderStatuses = new Set(["new", "pending", "sent", "preparing", "ready", "served"]);
export const inactiveOrderStatuses = new Set(["paid", "cancelled", "canceled"]);

export function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
    }).format(value);
}

export function formatNullableCurrency(value: number | null) {
    return value === null ? "--" : formatCurrency(value);
}

export function formatNullablePercent(value: number | null) {
    return value === null ? "--" : `${value}%`;
}

export function percent(value: number, total: number) {
    if (total === 0) {
        return 0;
    }

    return Math.round((value / total) * 100);
}

export function normalizeStatus(status: string) {
    return status.toLowerCase().replace(/\s+/g, "");
}

export function getInitials(value: string, fallback: string) {
    return value
        .split(/[^a-zA-Z0-9]/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() ?? "")
        .join("") || fallback;
}
