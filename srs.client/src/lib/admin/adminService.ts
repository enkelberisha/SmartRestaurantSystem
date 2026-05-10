import { authorizedApiFetch } from "@/lib/auth/authService";
import type { AppRole } from "@/lib/auth/roles";

export type AdminRestaurant = {
    id: number;
    tenantId: string;
    name: string;
    location: string;
    cuisineType: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    logoUrl: string | null;
    ownerId: number | null;
    managerId: number | null;
};

export type AdminUser = {
    id: number;
    supabaseUserId: string;
    email: string;
    role: AppRole;
    tenantId: string | null;
    restaurantId: number | null;
    tenantName: string | null;
    createdAt: string;
};

export type AdminTable = {
    id: number;
    restaurantId: number;
    number: number;
    capacity: number;
    status: TableStatus;
    assignedStaffId: number | null;
};

export type AdminStaff = {
    id: number;
    tenantId: string;
    restaurantId: number;
    fullName: string;
    isActive: boolean;
    createdAt: string;
    credentialType: StaffCredentialType;
};

export type AdminOrder = {
    id: number;
    tableId: number;
    status: string;
    total: number;
    createdAt: string;
};

export type AdminReservation = {
    id: number;
    tableId: number;
    name: string;
    phone: string | null;
    reservationDate: string;
    reservationTime: string;
    status: string;
};

export type AdminMenu = {
    id: number;
    restaurantId: number;
    name: string;
};

export type AdminMenuItem = {
    id: number;
    menuId: number;
    name: string;
    price: number;
    description: string | null;
    imageUrl: string | null;
    imagePublicId: string | null;
    cookingTime: number;
    filters: string[];
};

export type MenuItemFilter = {
    id: number;
    restaurantId: number | null;
    name: string;
    slug: string;
    sortOrder: number;
};

export type MenuPayload = {
    restaurantId: number;
    name: string;
};

export type MenuItemPayload = {
    menuId: number;
    name: string;
    price: number;
    description: string | null;
    imageUrl: string | null;
    imagePublicId: string | null;
    cookingTime: number;
    filterIds: number[];
};

export type UploadedMenuItemImage = {
    imageUrl: string;
    imagePublicId: string;
};

export type MenuItemFilterPayload = {
    restaurantId: number;
    name: string;
    sortOrder: number;
};

export type TableStatus = "Available" | "Occupied" | "Reserved" | "OutOfService";
export type StaffCredentialType = "Card" | "Pin" | "ManualId";

export type CreateAdminUserPayload = {
    email: string;
    password: string;
    role: AppRole;
    tenantId: string | null;
    restaurantId?: number | null;
};

export type RestaurantPayload = {
    name: string;
    location: string;
    cuisineType: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    logoUrl: string | null;
    ownerId: number | null;
    managerId: number | null;
};

export type RestaurantAccountApprovalPayload = {
    email: string;
    password: string;
    role: AppRole;
};

export type RestaurantApprovalRequest = {
    id: number;
    tenantId: string;
    requestedByUserId: number;
    requestedByEmail: string;
    restaurantId: number | null;
    type: "Create" | "Delete";
    status: "Pending" | "Approved" | "Rejected";
    summary: string;
    rejectionReason: string | null;
    createdAt: string;
    reviewedAt: string | null;
};

export type RestaurantApprovalRequestDetail = RestaurantApprovalRequest & {
    restaurant: RestaurantPayload | null;
    accounts: RestaurantAccountApprovalPayload[];
};

export type TablePayload = {
    restaurantId: number;
    number: number;
    capacity: number;
    status: TableStatus;
    assignedStaffId: number | null;
};

export type StaffPayload = {
    restaurantId: number;
    fullName: string;
    credentialValue: string;
    credentialType: StaffCredentialType;
    isActive: boolean;
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

async function sendJson<T>(url: string, method: string, body: unknown, fallback: string): Promise<T> {
    const response = await authorizedApiFetch(url, {
        method,
        body: JSON.stringify(body)
    });

    return readJson<T>(response, fallback);
}

export async function getAdminRestaurants(): Promise<AdminRestaurant[]> {
    const response = await authorizedApiFetch("/api/restaurants");
    return readJson<AdminRestaurant[]>(response, "Failed to load restaurants.");
}

export async function createAdminRestaurant(payload: RestaurantPayload): Promise<AdminRestaurant> {
    return sendJson<AdminRestaurant>("/api/restaurants", "POST", payload, "Failed to create restaurant.");
}

export async function updateAdminRestaurant(id: number, payload: RestaurantPayload): Promise<AdminRestaurant> {
    return sendJson<AdminRestaurant>(`/api/restaurants/${id}`, "PUT", payload, "Failed to update restaurant.");
}

export async function deleteAdminRestaurant(id: number): Promise<void> {
    const response = await authorizedApiFetch(`/api/restaurants/${id}`, { method: "DELETE" });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to delete restaurant."));
    }
}

export async function getAdminUsers(): Promise<AdminUser[]> {
    const response = await authorizedApiFetch("/api/users");
    return readJson<AdminUser[]>(response, "Failed to load users.");
}

export async function getAdminStaffCandidateUsers(): Promise<AdminUser[]> {
    const response = await authorizedApiFetch("/api/users/staff-candidates");
    return readJson<AdminUser[]>(response, "Failed to load staff candidate users.");
}

export async function updateAdminUserRole(user: AdminUser, role: AppRole): Promise<AdminUser> {
    return sendJson<AdminUser>(
        `/api/users/${user.id}`,
        "PUT",
        { role, tenantId: user.tenantId, restaurantId: user.restaurantId },
        "Failed to update user."
    );
}

export async function deleteAdminUser(id: number): Promise<void> {
    const response = await authorizedApiFetch(`/api/users/${id}`, { method: "DELETE" });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to remove user."));
    }
}

export async function getAdminTables(): Promise<AdminTable[]> {
    const response = await authorizedApiFetch("/api/tables");
    return readJson<AdminTable[]>(response, "Failed to load tables.");
}

export async function getAdminRestaurantTables(restaurantId: number): Promise<AdminTable[]> {
    const response = await authorizedApiFetch(`/api/tables/restaurant/${restaurantId}`);
    return readJson<AdminTable[]>(response, "Failed to load restaurant tables.");
}

export async function createAdminTable(payload: TablePayload): Promise<AdminTable> {
    return sendJson<AdminTable>("/api/tables", "POST", payload, "Failed to create table.");
}

export async function updateAdminTable(id: number, payload: TablePayload): Promise<AdminTable> {
    return sendJson<AdminTable>(`/api/tables/${id}`, "PUT", payload, "Failed to update table.");
}

export async function deleteAdminTable(id: number): Promise<void> {
    const response = await authorizedApiFetch(`/api/tables/${id}`, { method: "DELETE" });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to delete table."));
    }
}

export async function getAdminStaff(): Promise<AdminStaff[]> {
    const response = await authorizedApiFetch("/api/staff");
    return readJson<AdminStaff[]>(response, "Failed to load staff.");
}

export async function getAdminRestaurantStaff(restaurantId: number): Promise<AdminStaff[]> {
    const response = await authorizedApiFetch(`/api/staff/restaurant/${restaurantId}`);
    return readJson<AdminStaff[]>(response, "Failed to load restaurant staff.");
}

export async function getAdminOrders(): Promise<AdminOrder[]> {
    const response = await authorizedApiFetch("/api/orders");
    return readJson<AdminOrder[]>(response, "Failed to load orders.");
}

export async function getAdminRestaurantOrders(restaurantId: number): Promise<AdminOrder[]> {
    const response = await authorizedApiFetch(`/api/orders/restaurant/${restaurantId}`);
    return readJson<AdminOrder[]>(response, "Failed to load restaurant orders.");
}

export async function getAdminReservations(): Promise<AdminReservation[]> {
    const response = await authorizedApiFetch("/api/reservations");
    return readJson<AdminReservation[]>(response, "Failed to load reservations.");
}

export async function getAdminRestaurantReservations(restaurantId: number): Promise<AdminReservation[]> {
    const response = await authorizedApiFetch(`/api/reservations/restaurant/${restaurantId}`);
    return readJson<AdminReservation[]>(response, "Failed to load restaurant reservations.");
}

export async function getAdminMenus(): Promise<AdminMenu[]> {
    const response = await authorizedApiFetch("/api/menu");
    return readJson<AdminMenu[]>(response, "Failed to load menus.");
}

export async function getAdminRestaurantMenus(restaurantId: number): Promise<AdminMenu[]> {
    const response = await authorizedApiFetch(`/api/menu/restaurant/${restaurantId}`);
    return readJson<AdminMenu[]>(response, "Failed to load restaurant menus.");
}

export async function createAdminMenu(payload: MenuPayload): Promise<AdminMenu> {
    return sendJson<AdminMenu>("/api/menu", "POST", payload, "Failed to create menu.");
}

function withMenuItemQuery(url: string, search?: string, filters: string[] = []) {
    const params = new URLSearchParams();
    const trimmedSearch = search?.trim();

    if (trimmedSearch) {
        params.set("search", trimmedSearch);
    }

    filters.forEach(filter => {
        if (filter.trim()) {
            params.append("filters", filter.trim());
        }
    });

    const query = params.toString();

    if (!query) {
        return url;
    }

    return `${url}${url.includes("?") ? "&" : "?"}${query}`;
}

export async function getAdminMenuItems(search?: string, filters: string[] = []): Promise<AdminMenuItem[]> {
    const response = await authorizedApiFetch(withMenuItemQuery("/api/menu-items", search, filters));
    return readJson<AdminMenuItem[]>(response, "Failed to load menu items.");
}

export async function getAdminRestaurantMenuItems(restaurantId: number, search?: string, filters: string[] = []): Promise<AdminMenuItem[]> {
    const response = await authorizedApiFetch(withMenuItemQuery(`/api/menu-items/restaurant/${restaurantId}`, search, filters));
    return readJson<AdminMenuItem[]>(response, "Failed to load restaurant menu items.");
}

export async function getMenuItemFilters(restaurantId?: number | null): Promise<MenuItemFilter[]> {
    const url = restaurantId ? `/api/menu-items/filters?restaurantId=${restaurantId}` : "/api/menu-items/filters";
    const response = await authorizedApiFetch(url);
    return readJson<MenuItemFilter[]>(response, "Failed to load menu filters.");
}

export async function submitRestaurantCreateRequest(
    restaurant: RestaurantPayload,
    accounts: RestaurantAccountApprovalPayload[]
): Promise<RestaurantApprovalRequest> {
    return sendJson<RestaurantApprovalRequest>(
        "/api/restaurant-approval-requests/create",
        "POST",
        { restaurant, accounts },
        "Failed to submit restaurant creation request."
    );
}

export async function getMyRestaurantApprovalRequests(): Promise<RestaurantApprovalRequestDetail[]> {
    const response = await authorizedApiFetch("/api/restaurant-approval-requests/mine");
    return readJson<RestaurantApprovalRequestDetail[]>(response, "Failed to load your restaurant requests.");
}

export async function updateRestaurantCreateRequest(
    requestId: number,
    restaurant: RestaurantPayload,
    accounts: RestaurantAccountApprovalPayload[]
): Promise<RestaurantApprovalRequestDetail> {
    return sendJson<RestaurantApprovalRequestDetail>(
        `/api/restaurant-approval-requests/${requestId}/create`,
        "PUT",
        { restaurant, accounts },
        "Failed to update restaurant request."
    );
}

export async function resubmitRestaurantCreateRequest(requestId: number): Promise<RestaurantApprovalRequestDetail> {
    return sendJson<RestaurantApprovalRequestDetail>(
        `/api/restaurant-approval-requests/${requestId}/resubmit`,
        "POST",
        {},
        "Failed to resend restaurant request."
    );
}

export async function submitRestaurantDeleteRequest(restaurantId: number, adminPassword: string): Promise<RestaurantApprovalRequest> {
    return sendJson<RestaurantApprovalRequest>(
        "/api/restaurant-approval-requests/delete",
        "POST",
        { restaurantId, adminPassword },
        "Failed to submit restaurant deletion request."
    );
}

export async function createAdminUser(payload: CreateAdminUserPayload): Promise<AdminUser> {
    return sendJson<AdminUser>("/api/users", "POST", payload, "Failed to create user.");
}

export async function updateAdminUserPassword(userId: number, password: string): Promise<AdminUser> {
    return sendJson<AdminUser>(
        `/api/users/${userId}/password`,
        "PUT",
        { password },
        "Failed to update password."
    );
}

export async function updateAdminUserEmail(userId: number, email: string): Promise<AdminUser> {
    return sendJson<AdminUser>(
        `/api/users/${userId}/email`,
        "PUT",
        { email },
        "Failed to update email."
    );
}

export async function createMenuItemFilter(payload: MenuItemFilterPayload): Promise<MenuItemFilter> {
    return sendJson<MenuItemFilter>("/api/menu-items/filters", "POST", payload, "Failed to create menu filter.");
}

export async function deleteMenuItemFilter(id: number): Promise<void> {
    const response = await authorizedApiFetch(`/api/menu-items/filters/${id}`, { method: "DELETE" });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to delete menu filter."));
    }
}

export async function createAdminMenuItem(payload: MenuItemPayload): Promise<AdminMenuItem> {
    return sendJson<AdminMenuItem>("/api/menu-items", "POST", payload, "Failed to create menu item.");
}

export async function uploadMenuItemImage(file: File): Promise<UploadedMenuItemImage> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await authorizedApiFetch("/api/menu-items/upload-image", {
        method: "POST",
        body: formData
    });

    return readJson<UploadedMenuItemImage>(response, "Failed to upload image.");
}

export async function updateAdminMenuItem(id: number, payload: MenuItemPayload): Promise<void> {
    const response = await authorizedApiFetch(`/api/menu-items/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to update menu item."));
    }
}

export async function deleteAdminMenuItem(id: number): Promise<void> {
    const response = await authorizedApiFetch(`/api/menu-items/${id}`, { method: "DELETE" });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to delete menu item."));
    }
}

export async function createAdminStaff(payload: StaffPayload): Promise<AdminStaff> {
    return sendJson<AdminStaff>("/api/staff", "POST", payload, "Failed to create staff member.");
}

export async function updateAdminStaff(id: number, payload: StaffPayload): Promise<AdminStaff> {
    return sendJson<AdminStaff>(`/api/staff/${id}`, "PUT", payload, "Failed to update staff member.");
}

export async function deleteAdminStaff(id: number): Promise<void> {
    const response = await authorizedApiFetch(`/api/staff/${id}`, { method: "DELETE" });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to remove staff member."));
    }
}
