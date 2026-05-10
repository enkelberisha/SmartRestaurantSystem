import { createContext } from "react";
import type { CurrentProfile } from "@/lib/auth/authService";

export type UserContextValue = {
    profile: CurrentProfile | null;
    isLoading: boolean;
    refreshProfile: () => Promise<void>;
    logout: () => Promise<void>;
};

export const UserContext = createContext<UserContextValue>({
    profile: null,
    isLoading: true,
    refreshProfile: async () => undefined,
    logout: async () => undefined
});
