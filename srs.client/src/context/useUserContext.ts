import { useContext } from "react";
import { UserContext } from "@/context/userContextValue";

export function useUserContext() {
    return useContext(UserContext);
}
