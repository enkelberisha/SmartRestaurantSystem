import { supabase } from "@/lib/supabase/client";
import type { AppRole } from "@/lib/auth/roles";

export type CurrentProfile = {
    appUserId: number;
    supabaseUserId: string;
    email: string;
    role: AppRole;
    tenantId: string | null;
    restaurantId: number | null;
};

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
    const response = await authorizedApiFetch("/api/auth/me");

    if (response.status === 401) {
        return null;
    }

    if (!response.ok) {
        const message = await response.text().then(text => {
            if (!text) {
                return "We could not load your application profile.";
            }

            try {
                const payload = JSON.parse(text) as { message?: string };
                return payload.message ?? "We could not load your application profile.";
            } catch {
                return text;
            }
        });

        const error = new Error(message) as Error & { status?: number };
        error.status = response.status;
        throw error;
    }

    return (await response.json()) as CurrentProfile;
}

export async function authorizedApiFetch(input: string, init: RequestInit = {}) {
    const {
        data: { session }
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;
    if (!accessToken) {
        return new Response(null, { status: 401 });
    }

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);

    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    return fetch(input, {
        ...init,
        headers
    });
}

export async function signOut() {
    await supabase.auth.signOut();
}

export async function changeCurrentPassword(currentPassword: string, newPassword: string) {
    const response = await authorizedApiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
            currentPassword,
            newPassword
        })
    });

    if (!response.ok) {
        const message = await response.text().then(text => {
            if (!text) {
                return "Failed to update password.";
            }

            try {
                const payload = JSON.parse(text) as { message?: string };
                return payload.message ?? "Failed to update password.";
            } catch {
                return text;
            }
        });

        throw new Error(message);
    }
}
