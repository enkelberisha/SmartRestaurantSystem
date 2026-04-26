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
    const {
        data: { session }
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;
    if (!accessToken) {
        return null;
    }

    const response = await fetch("/api/auth/me", {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        return null;
    }

    return (await response.json()) as CurrentProfile;
}
