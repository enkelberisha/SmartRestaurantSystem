import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getCurrentProfile, signOut, type CurrentProfile } from "@/lib/auth/authService";

type UserContextValue = {
    profile: CurrentProfile | null;
    isLoading: boolean;
    refreshProfile: () => Promise<void>;
    logout: () => Promise<void>;
};

const UserContext = createContext<UserContextValue>({
    profile: null,
    isLoading: true,
    refreshProfile: async () => undefined,
    logout: async () => undefined
});

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<CurrentProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshProfile = async () => {
        const currentProfile = await getCurrentProfile();
        setProfile(currentProfile);
        setIsLoading(false);
    };

    useEffect(() => {
        void refreshProfile();

        const { data } = supabase.auth.onAuthStateChange(() => {
            void refreshProfile();
        });

        return () => {
            data.subscription.unsubscribe();
        };
    }, []);

    const value = useMemo<UserContextValue>(() => ({
        profile,
        isLoading,
        refreshProfile,
        logout: async () => {
            await signOut();
            setProfile(null);
        }
    }), [isLoading, profile]);

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext() {
    return useContext(UserContext);
}
