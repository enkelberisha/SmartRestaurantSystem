import { Navigate } from "react-router-dom";
import { useUserContext } from "@/context/UserContext";
import { rolePathMap, type AppRole } from "@/lib/auth/roles";

type ProtectedRouteProps = {
    allowedRoles: AppRole[];
    children: React.ReactNode;
};

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
    const { profile, isLoading } = useUserContext();

    if (isLoading) {
        return (
            <main className="role-shell">
                <section className="role-card">
                    <p className="role-card__eyebrow">Checking Access</p>
                    <h1>Loading...</h1>
                </section>
            </main>
        );
    }

    if (profile === null) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(profile.role)) {
        return <Navigate to={rolePathMap[profile.role]} replace />;
    }

    return <>{children}</>;
}
