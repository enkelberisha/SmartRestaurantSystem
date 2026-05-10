import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getCurrentProfile, signOut, type CurrentProfile } from "@/lib/auth/authService";
import { UserContext, type UserContextValue } from "@/context/userContextValue";

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<CurrentProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshProfile = useCallback(async () => {
        try {
            const currentProfile = await getCurrentProfile();
            setProfile(currentProfile);
        } catch (error) {
            console.error("Could not refresh the current user profile.", error);

            const status = error instanceof Error && "status" in error
                ? (error as Error & { status?: number }).status
                : undefined;

            if (status === 403) {
                await signOut();
            }

            setProfile(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        queueMicrotask(() => {
            void refreshProfile();
        });

        const { data } = supabase.auth.onAuthStateChange(() => {
            void refreshProfile();
        });

        return () => {
            data.subscription.unsubscribe();
        };
    }, [refreshProfile]);

    const value = useMemo<UserContextValue>(() => ({
        profile,
        isLoading,
        refreshProfile,
        logout: async () => {
            await signOut();
            setProfile(null);
        }
    }), [isLoading, profile, refreshProfile]);

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
