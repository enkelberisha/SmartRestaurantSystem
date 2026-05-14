import {
    authorizedApiFetch
} from "@/lib/auth/authService";
import {
    getAdminRestaurants,
    getAdminRestaurantTables,
    getAdminRestaurantReservations,
    updateAdminTable,
    type AdminRestaurant,
    type AdminTable,
    type AdminReservation,
    type TableStatus
} from "@/lib/admin/adminService";

export type { AdminRestaurant, AdminTable, AdminReservation, TableStatus };

export type HostWaiter = {
    id: number;
    name: string;
};

export async function getHostWaiters(restaurantId: number): Promise<HostWaiter[]> {
    const response = await authorizedApiFetch(`/api/host/restaurant/${restaurantId}/notifiable`);
    if (!response.ok) return [];
    const users = (await response.json()) as { id: number; name: string }[];
    return users.map(u => ({ id: u.id, name: u.name.split("@")[0] }));
}

export type HostReservationPayload = {
    tableId: number;
    name: string;
    phone: string | null;
    reservationDate: string;
    reservationTime: string;
};

export type WaitlistEntry = {
    id: string;
    name: string;
    phone: string | null;
    partySize: number;
    notes: string | null;
    addedAt: string;
};

const WAITLIST_PREFIX = "host:waitlist";
const HOST_RESTAURANT_KEY = "host:selectedRestaurantId";

export function getStoredHostRestaurantId(): number | null {
    const value = localStorage.getItem(HOST_RESTAURANT_KEY);
    const id = value ? Number(value) : null;
    return id && Number.isFinite(id) ? id : null;
}

export function storeHostRestaurantId(restaurantId: number | null) {
    if (restaurantId) {
        localStorage.setItem(HOST_RESTAURANT_KEY, String(restaurantId));
    } else {
        localStorage.removeItem(HOST_RESTAURANT_KEY);
    }
}

export function getWaitlist(restaurantId: number): WaitlistEntry[] {
    try {
        const raw = localStorage.getItem(`${WAITLIST_PREFIX}:${restaurantId}`);
        return raw ? (JSON.parse(raw) as WaitlistEntry[]) : [];
    } catch {
        return [];
    }
}

function saveWaitlist(restaurantId: number, entries: WaitlistEntry[]) {
    localStorage.setItem(`${WAITLIST_PREFIX}:${restaurantId}`, JSON.stringify(entries));
}

export function addToWaitlist(restaurantId: number, entry: Omit<WaitlistEntry, "id" | "addedAt">): WaitlistEntry {
    const newEntry: WaitlistEntry = {
        ...entry,
        id: crypto.randomUUID(),
        addedAt: new Date().toISOString()
    };
    saveWaitlist(restaurantId, [...getWaitlist(restaurantId), newEntry]);
    return newEntry;
}

export function removeFromWaitlist(restaurantId: number, entryId: string) {
    saveWaitlist(restaurantId, getWaitlist(restaurantId).filter(e => e.id !== entryId));
}

async function parseError(response: Response, fallback: string): Promise<string> {
    const text = await response.text();
    if (!text) return fallback;
    try {
        const payload = JSON.parse(text) as { message?: string };
        return payload.message ?? text;
    } catch {
        return text;
    }
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
    if (!response.ok) {
        throw new Error(await parseError(response, fallback));
    }
    return (await response.json()) as T;
}

export async function getHostRestaurants(): Promise<AdminRestaurant[]> {
    return getAdminRestaurants();
}

export async function getHostTables(restaurantId: number): Promise<AdminTable[]> {
    return getAdminRestaurantTables(restaurantId);
}

export async function getHostReservations(restaurantId: number): Promise<AdminReservation[]> {
    return getAdminRestaurantReservations(restaurantId);
}


export async function createHostReservation(payload: HostReservationPayload): Promise<AdminReservation> {
    const response = await authorizedApiFetch("/api/reservations", {
        method: "POST",
        body: JSON.stringify(payload)
    });
    return readJson<AdminReservation>(response, "Failed to create reservation.");
}

export async function updateHostReservation(id: number, payload: HostReservationPayload): Promise<AdminReservation> {
    const response = await authorizedApiFetch(`/api/reservations/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
    });
    return readJson<AdminReservation>(response, "Failed to update reservation.");
}

export async function cancelHostReservation(id: number): Promise<void> {
    const response = await authorizedApiFetch(`/api/reservations/${id}`, { method: "DELETE" });
    if (!response.ok) {
        throw new Error(await parseError(response, "Failed to cancel reservation."));
    }
}

export async function updateHostTableStatus(table: AdminTable, status: TableStatus): Promise<void> {
    await updateAdminTable(table.id, {
        restaurantId: table.restaurantId,
        number: table.number,
        capacity: table.capacity,
        status
    });
}

export async function notifyWaiter(userId: number, message: string): Promise<void> {
    const response = await authorizedApiFetch("/api/notifications", {
        method: "POST",
        body: JSON.stringify({ userId, message })
    });
    if (!response.ok) {
        throw new Error(await parseError(response, "Failed to send notification."));
    }
}
