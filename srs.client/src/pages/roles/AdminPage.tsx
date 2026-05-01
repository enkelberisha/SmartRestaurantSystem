import { useEffect, useState } from "react";
import { authorizedApiFetch } from "@/lib/auth/authService";
import type { AppRole } from "@/lib/auth/roles";

type TenantUser = {
    id: number;
    supabaseUserId: string;
    email: string;
    role: AppRole;
    tenantId: string | null;
    tenantName: string | null;
    createdAt: string;
};

async function getTenantUsers(): Promise<TenantUser[]> {
    const response = await authorizedApiFetch("/api/users");

    if (!response.ok) {
        throw new Error("Failed to load tenant users.");
    }

    return (await response.json()) as TenantUser[];
}

export function AdminPage() {
    const [users, setUsers] = useState<TenantUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function loadUsers() {
            try {
                setIsLoading(true);
                setError(null);
                const result = await getTenantUsers();

                if (isMounted) {
                    setUsers(result);
                }
            } catch (loadError) {
                if (isMounted) {
                    setError(loadError instanceof Error ? loadError.message : "Could not load tenant users.");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void loadUsers();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <main className="role-shell">
            <section className="role-card role-card--wide admin-users-card">
                <p className="role-card__eyebrow">Tenant Admin</p>
                <h1>Tenant Users</h1>
                <p className="role-card__lead">
                    Users returned from your protected <code>/api/users</code> endpoint.
                </p>

                {isLoading ? (
                    <p className="role-status">Loading users...</p>
                ) : error ? (
                    <p className="role-status role-status--error">{error}</p>
                ) : users.length === 0 ? (
                    <p className="role-status">No users found for this tenant.</p>
                ) : (
                    <div className="admin-users-table-wrap">
                        <table className="admin-users-table">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Tenant</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.email}</td>
                                        <td>{user.role}</td>
                                        <td>{user.tenantName ?? "Unassigned"}</td>
                                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}
