import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { appRoles, type AppRole } from "@/lib/auth/roles";
import { ConfirmDialog } from "@/superadmin/components/ConfirmDialog";
import { Modal } from "@/superadmin/components/Modal";
import { SectionCard } from "@/superadmin/components/SectionCard";
import { SectionErrorBoundary } from "@/superadmin/components/SectionErrorBoundary";
import { SkeletonBlock } from "@/superadmin/components/SkeletonBlock";
import { useToast } from "@/superadmin/context/ToastContext";
import {
    useDeleteUserMutation,
    useInviteUserMutation,
    useRolesQuery,
    useSaveRoleMutation,
    useTenantsQuery,
    useUpdateUserRoleMutation,
    useUsersQuery
} from "@/superadmin/hooks/useSuperadminQueries";
import type { RoleDefinition, SuperadminUser } from "@/superadmin/types";

const createUserSchema = z.object({
    email: z.email("Enter a valid email."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    role: z.enum(["Owner", "Manager", "User", "Admin"]),
    tenantId: z.string().nullable()
});

const permissionCatalog = [
    "tenant.manage",
    "restaurant.manage",
    "staff.manage",
    "orders.manage",
    "menu.manage",
    "reports.view",
    "profile.view"
];

const tenantScopedRoles = appRoles.filter(role => role !== "SuperAdmin");

export function UsersRolesPage() {
    const [search, setSearch] = useState("");
    const [roleTab, setRoleTab] = useState<"users" | "roles">("users");
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<SuperadminUser | null>(null);
    const [deleteUserState, setDeleteUserState] = useState<SuperadminUser | null>(null);
    const { data: users, isLoading: usersLoading } = useUsersQuery();
    const { data: roles, isLoading: rolesLoading } = useRolesQuery();
    const { data: tenants = [] } = useTenantsQuery();
    const createUserMutation = useInviteUserMutation();
    const updateRoleMutation = useUpdateUserRoleMutation();
    const deleteUserMutation = useDeleteUserMutation();
    const saveRoleMutation = useSaveRoleMutation();
    const { pushToast } = useToast();

    const createUserForm = useForm<z.infer<typeof createUserSchema>>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            email: "",
            password: "",
            role: "Manager",
            tenantId: null
        }
    });

    const filteredUsers = useMemo(() => {
        return (users ?? []).filter(user =>
            `${user.email} ${user.role} ${user.tenantName ?? ""}`.toLowerCase().includes(search.toLowerCase())
        );
    }, [search, users]);

    const handleRoleSave = async (role: RoleDefinition) => {
        await saveRoleMutation.mutateAsync(role);
        pushToast("success", `Saved role ${role.name}.`);
    };

    return (
        <div className="sa-stack">
            <SectionErrorBoundary>
                <SectionCard
                    title="Users & Roles"
                    subtitle="Manage real application users and tenant assignments"
                    actions={
                        <div className="sa-inline-actions">
                            <Button variant={roleTab === "users" ? "primary" : "secondary"} onClick={() => setRoleTab("users")}>
                                Users
                            </Button>
                            <Button variant={roleTab === "roles" ? "primary" : "secondary"} onClick={() => setRoleTab("roles")}>
                                Roles
                            </Button>
                            <Button onClick={() => setCreateOpen(true)}>Create User</Button>
                        </div>
                    }
                >
                    {roleTab === "users" ? (
                        <>
                            <div className="sa-toolbar">
                                <input
                                    className="sa-search-field"
                                    value={search}
                                    onChange={event => setSearch(event.target.value)}
                                    placeholder="Search users, roles, tenants..."
                                />
                            </div>
                            {usersLoading ? (
                                <SkeletonBlock className="sa-table-skeleton" />
                            ) : (
                                <div className="sa-table-wrap">
                                    <table className="sa-table">
                                        <thead>
                                            <tr>
                                                <th>Email</th>
                                                <th>Role</th>
                                                <th>Tenant</th>
                                                <th>Status</th>
                                                <th>Created</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers.map(user => (
                                                <tr key={user.id}>
                                                    <td>{user.email}</td>
                                                    <td>
                                                        <select
                                                            className="sa-select"
                                                            value={user.role}
                                                            onChange={async event => {
                                                                await updateRoleMutation.mutateAsync({
                                                                    userId: user.id,
                                                                    role: event.target.value as AppRole
                                                                });
                                                                pushToast("success", `Updated ${user.email}.`);
                                                            }}
                                                        >
                                                            {tenantScopedRoles.map(role => (
                                                                <option key={role} value={role}>
                                                                    {role}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>{user.tenantName ?? "Unassigned"}</td>
                                                    <td><span className="sa-badge sa-badge--active">{user.status}</span></td>
                                                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                                    <td>
                                                        <div className="sa-inline-actions">
                                                            <Button variant="ghost" onClick={() => setSelectedUser(user)}>
                                                                View Profile
                                                            </Button>
                                                            <Button variant="ghost" onClick={() => setDeleteUserState(user)}>
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    ) : rolesLoading ? (
                        <SkeletonBlock className="sa-table-skeleton" />
                    ) : (
                        <div className="sa-role-grid">
                            {(roles ?? []).map(role => (
                                <article key={role.id} className="sa-role-card">
                                    <h3>{role.name}</h3>
                                    <p>{role.description}</p>
                                    <div className="sa-permission-list">
                                        {permissionCatalog.map(permission => {
                                            const checked = role.permissions.includes(permission);
                                            return (
                                                <label key={permission} className="sa-permission-pill">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={event => {
                                                            const nextPermissions = event.target.checked
                                                                ? [...role.permissions, permission]
                                                                : role.permissions.filter(item => item !== permission);
                                                            void handleRoleSave({ ...role, permissions: nextPermissions });
                                                        }}
                                                    />
                                                    <span>{permission}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </SectionCard>
            </SectionErrorBoundary>

            <Modal title="Create User" open={createOpen} onClose={() => setCreateOpen(false)}>
                <form
                    className="sa-form-grid"
                    onSubmit={createUserForm.handleSubmit(async values => {
                        await createUserMutation.mutateAsync(values);
                        pushToast("success", `Created ${values.email}.`);
                        setCreateOpen(false);
                        createUserForm.reset();
                    })}
                >
                    <Input
                        label="Email"
                        id="create-user-email"
                        error={createUserForm.formState.errors.email?.message}
                        {...createUserForm.register("email")}
                    />
                    <Input
                        label="Password"
                        id="create-user-password"
                        type="password"
                        error={createUserForm.formState.errors.password?.message}
                        {...createUserForm.register("password")}
                    />
                    <label className="sa-field">
                        <span>Role</span>
                        <select className="sa-select" {...createUserForm.register("role")}>
                            {tenantScopedRoles.map(role => (
                                <option key={role} value={role}>
                                    {role}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="sa-field">
                        <span>Tenant</span>
                        <select
                            className="sa-select"
                            value={createUserForm.watch("tenantId") ?? ""}
                            onChange={event => createUserForm.setValue("tenantId", event.target.value || null)}
                        >
                            <option value="">No tenant</option>
                            {tenants.map(tenant => (
                                <option key={tenant.id} value={tenant.id}>
                                    {tenant.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className="modal-actions">
                        <Button variant="secondary" onClick={() => setCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={createUserMutation.isPending}>
                            Create User
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal title={selectedUser ? selectedUser.email : "User"} open={Boolean(selectedUser)} onClose={() => setSelectedUser(null)}>
                {selectedUser ? (
                    <div className="sa-detail-grid">
                        <div>
                            <h4>Identity</h4>
                            <p>{selectedUser.email}</p>
                            <p>{selectedUser.supabaseUserId}</p>
                        </div>
                        <div>
                            <h4>Assignment</h4>
                            <p>{selectedUser.role}</p>
                            <p>{selectedUser.tenantName ?? "Unassigned"}</p>
                        </div>
                        <div className="sa-detail-grid__full">
                            <h4>Created</h4>
                            <p>{new Date(selectedUser.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                ) : null}
            </Modal>

            <ConfirmDialog
                open={Boolean(deleteUserState)}
                title="Delete user?"
                message={deleteUserState ? `This will delete ${deleteUserState.email} from Supabase and your database.` : ""}
                confirmLabel="Delete"
                onClose={() => setDeleteUserState(null)}
                onConfirm={async () => {
                    if (!deleteUserState) {
                        return;
                    }

                    await deleteUserMutation.mutateAsync(deleteUserState.id);
                    pushToast("success", `Deleted ${deleteUserState.email}.`);
                    setDeleteUserState(null);
                }}
            />
        </div>
    );
}
