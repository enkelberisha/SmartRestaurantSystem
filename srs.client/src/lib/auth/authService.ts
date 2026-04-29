import { supabase } from "@/lib/supabase/client";
import type { AppRole } from "@/lib/auth/roles";

export type CurrentProfile = {
    appUserId: number;
    supabaseUserId: string;
    email: string;
    role: AppRole;
    tenantId: string | null;
};

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
    const response = await authorizedApiFetch("/api/auth/me");

    if (!response.ok) {
        return null;
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

    if (init.body && !headers.has("Content-Type")) {
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
