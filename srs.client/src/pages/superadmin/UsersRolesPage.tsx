import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { appRoles, type AppRole } from "@/lib/auth/roles";
import { ConfirmDialog } from "@/features/superadmin/components/ConfirmDialog";
import { Modal } from "@/features/superadmin/components/Modal";
import { SectionCard } from "@/features/superadmin/components/SectionCard";
import { SectionErrorBoundary } from "@/features/superadmin/components/SectionErrorBoundary";
import { SkeletonBlock } from "@/features/superadmin/components/SkeletonBlock";
import { useToast } from "@/features/superadmin/context/useToast";
import {
    useCreateUserMutation,
    useDeleteUserMutation,
    useSystemRestaurantsQuery,
    useTenantsQuery,
    useUpdateUserMutation,
    useUsersQuery
} from "@/features/superadmin/hooks/useSuperadminQueries";
import type { SuperadminUser } from "@/features/superadmin/types";

const createUserSchema = z.object({
    email: z.email("Enter a valid email."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    role: z.enum(["Owner", "Manager", "Admin"]),
    tenantId: z.string().nullable()
});

const editUserSchema = z.object({
    role: z.enum(["Owner", "Manager", "Admin"]),
    tenantId: z.string().nullable()
});

const tenantScopedRoles = appRoles.filter((role): role is "Owner" | "Manager" | "Admin" => ["Owner", "Manager", "Admin"].includes(role));

export function UsersRolesPage() {
    const [search, setSearch] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [profileUser, setProfileUser] = useState<SuperadminUser | null>(null);
    const [editingUser, setEditingUser] = useState<SuperadminUser | null>(null);
    const [deleteUserState, setDeleteUserState] = useState<SuperadminUser | null>(null);
    const { data: users, isLoading: usersLoading } = useUsersQuery();
    const { data: tenants = [] } = useTenantsQuery();
    const { data: restaurants = [] } = useSystemRestaurantsQuery();
    const createUserMutation = useCreateUserMutation();
    const updateUserMutation = useUpdateUserMutation();
    const deleteUserMutation = useDeleteUserMutation();
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

    const editUserForm = useForm<z.infer<typeof editUserSchema>>({
        resolver: zodResolver(editUserSchema),
        defaultValues: {
            role: "Manager",
            tenantId: null
        }
    });
    const createTenantId = useWatch({
        control: createUserForm.control,
        name: "tenantId"
    });
    const editTenantId = useWatch({
        control: editUserForm.control,
        name: "tenantId"
    });

    useEffect(() => {
        if (!editingUser) {
            return;
        }

        editUserForm.reset({
            role: editingUser.role as z.infer<typeof editUserSchema>["role"],
            tenantId: editingUser.tenantId
        });
    }, [editUserForm, editingUser]);

    const filteredUsers = useMemo(() => {
        return (users ?? []).filter(user =>
            `${user.email} ${user.role} ${user.tenantName ?? ""}`.toLowerCase().includes(search.toLowerCase())
        );
    }, [search, users]);
    const ownerByTenantId = useMemo(() => {
        const entries = new Map<string, SuperadminUser>();

        for (const user of users ?? []) {
            if (user.role === "Owner" && user.tenantId) {
                entries.set(user.tenantId, user);
            }
        }

        return entries;
    }, [users]);
    const createTenantOwner = createTenantId ? ownerByTenantId.get(createTenantId) ?? null : null;
    const editTenantOwner = editTenantId ? ownerByTenantId.get(editTenantId) ?? null : null;

    useEffect(() => {
        if (createTenantOwner && createUserForm.getValues("role") === "Owner") {
            createUserForm.setValue("role", "Manager");
        }
    }, [createTenantOwner, createUserForm]);

    useEffect(() => {
        if (editTenantOwner && editTenantOwner.id !== editingUser?.id && editUserForm.getValues("role") === "Owner") {
            editUserForm.setValue("role", "Manager");
        }
    }, [editTenantOwner, editUserForm, editingUser?.id]);

    return (
        <div className="sa-stack">
            <SectionErrorBoundary>
                <SectionCard
                    title="Users"
                    subtitle="Create, review, and update real platform users."
                    actions={
                        <div className="sa-inline-actions">
                            <Button onClick={() => setCreateOpen(true)}>Create User</Button>
                        </div>
                    }
                >
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
                                        <th>Restaurant</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(user => (
                                        <tr key={user.id}>
                                            <td>{user.email}</td>
                                            <td>{user.role}</td>
                                            <td>{user.tenantName ?? "Unassigned"}</td>
                                            <td><span className={`sa-badge ${user.status === "Active" ? "sa-badge--active" : ""}`}>{user.status}</span></td>
                                            <td>{restaurants.find(restaurant => restaurant.id === user.restaurantId)?.name ?? (user.restaurantId ? `Restaurant #${user.restaurantId}` : "Unassigned")}</td>
                                            <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <div className="sa-inline-actions">
                                                    <Button variant="ghost" onClick={() => setProfileUser(user)}>
                                                        View
                                                    </Button>
                                                    <Button variant="ghost" onClick={() => setEditingUser(user)}>
                                                        Edit User
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
                </SectionCard>
            </SectionErrorBoundary>

            <Modal title="Create User" open={createOpen} onClose={() => setCreateOpen(false)}>
                <form
                    className="sa-form-grid"
                    onSubmit={createUserForm.handleSubmit(async values => {
                        try {
                            await createUserMutation.mutateAsync(values);
                            pushToast("success", `Created ${values.email}.`);
                            setCreateOpen(false);
                            createUserForm.reset();
                        } catch (error) {
                            pushToast("error", error instanceof Error ? error.message : "Could not create the user.");
                        }
                    })}
                >
                    <input type="hidden" {...createUserForm.register("tenantId")} />
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
                                <option
                                    key={role}
                                    value={role}
                                    disabled={role === "Owner" && Boolean(createTenantOwner)}
                                >
                                    {role}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="sa-field">
                        <span>Tenant</span>
                        <select
                            className="sa-select"
                            value={createTenantId ?? ""}
                            onChange={event => createUserForm.setValue("tenantId", event.target.value || null)}
                        >
                            <option value="">Select tenant</option>
                            {tenants.map(tenant => (
                                <option key={tenant.id} value={tenant.id}>
                                    {tenant.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    {createTenantOwner && (
                        <p className="sa-helper-text">This tenant already has an owner: {createTenantOwner.email}. Owner is limited to one account per tenant.</p>
                    )}
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

            <Modal title={profileUser ? profileUser.email : "User"} open={Boolean(profileUser)} onClose={() => setProfileUser(null)}>
                {profileUser ? (
                    <div className="sa-detail-grid">
                        <div>
                            <h4>Identity</h4>
                            <p>{profileUser.email}</p>
                            <p>{profileUser.supabaseUserId}</p>
                        </div>
                        <div>
                            <h4>Assignment</h4>
                            <p>{profileUser.role}</p>
                            <p>{profileUser.tenantName ?? "Unassigned"}</p>
                            <p>{profileUser.isActivated ? "Activated" : "Pending activation"}</p>
                            <p>{restaurants.find(restaurant => restaurant.id === profileUser.restaurantId)?.name ?? "No restaurant assignment"}</p>
                        </div>
                        <div className="sa-detail-grid__full">
                            <h4>Created</h4>
                            <p>{new Date(profileUser.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                ) : null}
            </Modal>

            <Modal title={editingUser ? `Edit ${editingUser.email}` : "Edit User"} open={Boolean(editingUser)} onClose={() => setEditingUser(null)}>
                <form
                    className="sa-form-grid"
                    onSubmit={editUserForm.handleSubmit(async values => {
                        if (!editingUser) {
                            return;
                        }

                        try {
                            await updateUserMutation.mutateAsync({
                                userId: editingUser.id,
                                role: values.role as AppRole,
                                tenantId: values.tenantId
                            });
                            pushToast("success", `Updated ${editingUser.email}.`);
                            setEditingUser(null);
                        } catch (error) {
                            pushToast("error", error instanceof Error ? error.message : "Could not update the user.");
                        }
                    })}
                >
                    <input type="hidden" {...editUserForm.register("tenantId")} />
                    <Input id="edit-user-email" label="Email" value={editingUser?.email ?? ""} disabled />
                    <label className="sa-field">
                        <span>Role</span>
                        <select className="sa-select" {...editUserForm.register("role")}>
                            {tenantScopedRoles.map(role => (
                                <option
                                    key={role}
                                    value={role}
                                    disabled={role === "Owner" && Boolean(editTenantOwner && editTenantOwner.id !== editingUser?.id)}
                                >
                                    {role}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="sa-field">
                        <span>Tenant</span>
                        <select
                            className="sa-select"
                            value={editTenantId ?? ""}
                            onChange={event => editUserForm.setValue("tenantId", event.target.value || null)}
                        >
                            <option value="">Select tenant</option>
                            {tenants.map(tenant => (
                                <option key={tenant.id} value={tenant.id}>
                                    {tenant.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    {editTenantOwner && editTenantOwner.id !== editingUser?.id && (
                        <p className="sa-helper-text">This tenant already has an owner: {editTenantOwner.email}. Change that user instead of adding another owner.</p>
                    )}
                    <div className="modal-actions">
                        <Button variant="secondary" onClick={() => setEditingUser(null)}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={updateUserMutation.isPending}>
                            Save User
                        </Button>
                    </div>
                </form>
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

                    try {
                        await deleteUserMutation.mutateAsync(deleteUserState.id);
                        pushToast("success", `Deleted ${deleteUserState.email}.`);
                        setDeleteUserState(null);
                    } catch (error) {
                        pushToast("error", error instanceof Error ? error.message : "Could not delete the user.");
                    }
                }}
            />
        </div>
    );
}
