import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { ConfirmDialog } from "@/features/superadmin/components/ConfirmDialog";
import { Modal } from "@/features/superadmin/components/Modal";
import { SectionCard } from "@/features/superadmin/components/SectionCard";
import { SectionErrorBoundary } from "@/features/superadmin/components/SectionErrorBoundary";
import { SkeletonBlock } from "@/features/superadmin/components/SkeletonBlock";
import { useToast } from "@/features/superadmin/context/useToast";
import {
    useCreateTenantMutation,
    useDeleteTenantMutation,
    useTenantMembersQuery,
    useTenantsQuery,
    useUpdateTenantMutation
} from "@/features/superadmin/hooks/useSuperadminQueries";
import type { Tenant } from "@/features/superadmin/types";

const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

const tenantSchema = z.object({
    name: z.string().min(2, "Tenant name is required."),
    isActive: z.boolean(),
    adminEmail: z.email("Enter a valid admin email."),
    adminPassword: z.string().regex(
        strongPasswordPattern,
        "Admin password must be at least 8 characters and include uppercase, lowercase, number, and symbol."
    )
});

const editTenantSchema = z.object({
    name: z.string().min(2, "Tenant name is required."),
    isActive: z.boolean()
});

function buildTenantAdminEmail(name: string) {
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
        .trim();

    return `admin@${slug || "tenant"}.com`;
}

export function TenantsPage() {
    const { data: tenants, isLoading } = useTenantsQuery();
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [deleteTenant, setDeleteTenant] = useState<Tenant | null>(null);
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const createTenantMutation = useCreateTenantMutation();
    const updateTenantMutation = useUpdateTenantMutation();
    const deleteTenantMutation = useDeleteTenantMutation();
    const membersQuery = useTenantMembersQuery(selectedTenant?.id ?? null);
    const { pushToast } = useToast();

    const createForm = useForm<z.infer<typeof tenantSchema>>({
        resolver: zodResolver(tenantSchema),
        defaultValues: { name: "", isActive: true, adminEmail: "", adminPassword: "" }
    });
    const createTenantName = useWatch({
        control: createForm.control,
        name: "name"
    });

    const editForm = useForm<z.infer<typeof editTenantSchema>>({
        resolver: zodResolver(editTenantSchema),
        defaultValues: { name: "", isActive: true }
    });

    useEffect(() => {
        if (!editingTenant) {
            return;
        }

        editForm.reset({
            name: editingTenant.name,
            isActive: editingTenant.isActive
        });
    }, [editForm, editingTenant]);

    useEffect(() => {
        createForm.setValue("adminEmail", buildTenantAdminEmail(createTenantName ?? ""), {
            shouldDirty: false,
            shouldValidate: createForm.formState.isSubmitted
        });
    }, [createForm, createTenantName]);

    useEffect(() => {
        if (!createOpen) {
            return;
        }

        setCreateError(null);
    }, [createOpen, createTenantName]);

    return (
        <div className="sa-stack">
            <SectionErrorBoundary>
                <SectionCard
                    title="Tenants / Organizations"
                    subtitle="Create and manage the real tenant records behind the platform."
                    actions={<Button onClick={() => setCreateOpen(true)}>Create Tenant</Button>}
                >
                    {isLoading ? (
                        <SkeletonBlock className="sa-table-skeleton" />
                    ) : (
                        <div className="sa-table-wrap">
                            <table className="sa-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Status</th>
                                        <th>Users Count</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(tenants ?? []).map(tenant => (
                                        <tr key={tenant.id}>
                                            <td>
                                                <button type="button" className="sa-link-button" onClick={() => setSelectedTenant(tenant)}>
                                                    {tenant.name}
                                                </button>
                                            </td>
                                            <td>
                                                <span className={`sa-badge sa-badge--${tenant.isActive ? "active" : "suspended"}`}>
                                                    {tenant.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td>{tenant.usersCount}</td>
                                            <td>{new Date(tenant.createdDate).toLocaleDateString()}</td>
                                            <td>
                                                <div className="sa-inline-actions">
                                                    <Button variant="ghost" onClick={() => setEditingTenant(tenant)}>
                                                        Edit
                                                    </Button>
                                                    <Button variant="ghost" onClick={() => setDeleteTenant(tenant)}>
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
                </SectionCard>
            </SectionErrorBoundary>

            <Modal
                title={selectedTenant ? `${selectedTenant.name} Details` : "Tenant Details"}
                open={Boolean(selectedTenant)}
                onClose={() => setSelectedTenant(null)}
            >
                {selectedTenant ? (
                    <div className="sa-detail-grid">
                        <div>
                            <h4>Overview</h4>
                            <p>Status: {selectedTenant.isActive ? "Active" : "Inactive"}</p>
                            <p>Created: {new Date(selectedTenant.createdDate).toLocaleString()}</p>
                            <p>Users: {selectedTenant.usersCount}</p>
                        </div>
                        <div className="sa-detail-grid__full">
                            <h4>Members</h4>
                            {membersQuery.isLoading ? (
                                <SkeletonBlock className="sa-inline-skeleton" />
                            ) : (
                                <div className="sa-member-list">
                                    {(membersQuery.data ?? []).map(member => (
                                        <div key={member.id} className="sa-member-row">
                                            <strong>{member.email}</strong>
                                            <span>{member.role}</span>
                                            <small>{new Date(member.createdAt).toLocaleDateString()}</small>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}
            </Modal>

            <Modal title="Create Tenant" open={createOpen} onClose={() => setCreateOpen(false)}>
                <form
                    className="sa-form-grid"
                    onSubmit={createForm.handleSubmit(async values => {
                        try {
                            const duplicateTenantExists = (tenants ?? []).some(tenant =>
                                tenant.name.trim().toLowerCase() === values.name.trim().toLowerCase()
                            );

                            if (duplicateTenantExists) {
                                createForm.setError("name", {
                                    type: "validate",
                                    message: "A tenant with that name already exists."
                                });
                                return;
                            }

                            setCreateError(null);
                            await createTenantMutation.mutateAsync(values);
                            pushToast("success", `Created ${values.name}.`);
                            setCreateOpen(false);
                            createForm.reset({ name: "", isActive: true, adminEmail: "", adminPassword: "" });
                            setShowAdminPassword(false);
                        } catch (error) {
                            const message = error instanceof Error ? error.message : "Could not create the tenant.";
                            setCreateError(message);
                            pushToast("error", error instanceof Error ? error.message : "Could not create the tenant.");
                        }
                    })}
                >
                    {createError && <div className="admin-alert admin-alert--warning">{createError}</div>}
                    <Input
                        label="Tenant Name"
                        id="tenant-name"
                        error={createForm.formState.errors.name?.message}
                        {...createForm.register("name")}
                    />
                    <Input
                        label="Admin Email"
                        id="tenant-admin-email"
                        error={createForm.formState.errors.adminEmail?.message}
                        hint="Generated automatically from the tenant name."
                        readOnly
                        {...createForm.register("adminEmail")}
                    />
                    <Input
                        label="Admin Password"
                        id="tenant-admin-password"
                        type={showAdminPassword ? "text" : "password"}
                        error={createForm.formState.errors.adminPassword?.message}
                        hint="Must include uppercase, lowercase, number, and symbol."
                        action={(
                            <button
                                type="button"
                                className="icon-button"
                                aria-label={showAdminPassword ? "Hide password" : "Show password"}
                                onClick={() => setShowAdminPassword(current => !current)}
                            >
                                {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        )}
                        {...createForm.register("adminPassword")}
                    />
                    <label className="sa-switch-row">
                        <span>Active</span>
                        <input type="checkbox" {...createForm.register("isActive")} />
                    </label>
                    <div className="modal-actions">
                        <Button variant="secondary" onClick={() => setCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={createTenantMutation.isPending}>
                            Create Tenant
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal title="Edit Tenant" open={Boolean(editingTenant)} onClose={() => setEditingTenant(null)}>
                <form
                    className="sa-form-grid"
                    onSubmit={editForm.handleSubmit(async values => {
                        if (!editingTenant) {
                            return;
                        }

                        try {
                            await updateTenantMutation.mutateAsync({
                                tenantId: editingTenant.id,
                                name: values.name,
                                isActive: values.isActive
                            });
                            pushToast("success", `Updated ${values.name}.`);
                            setEditingTenant(null);
                        } catch (error) {
                            pushToast("error", error instanceof Error ? error.message : "Could not update the tenant.");
                        }
                    })}
                >
                    <Input
                        label="Tenant Name"
                        id="edit-tenant-name"
                        error={editForm.formState.errors.name?.message}
                        {...editForm.register("name")}
                    />
                    <label className="sa-switch-row">
                        <span>Active</span>
                        <input type="checkbox" {...editForm.register("isActive")} />
                    </label>
                    <div className="modal-actions">
                        <Button variant="secondary" onClick={() => setEditingTenant(null)}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={updateTenantMutation.isPending}>
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                open={Boolean(deleteTenant)}
                title="Delete tenant?"
                message={deleteTenant ? `This will delete ${deleteTenant.name} from the database.` : ""}
                confirmLabel="Delete"
                onClose={() => setDeleteTenant(null)}
                onConfirm={async () => {
                    if (!deleteTenant) {
                        return;
                    }

                    try {
                        await deleteTenantMutation.mutateAsync(deleteTenant.id);
                        pushToast("success", `Deleted ${deleteTenant.name}.`);
                        setDeleteTenant(null);
                        if (selectedTenant?.id === deleteTenant.id) {
                            setSelectedTenant(null);
                        }
                    } catch (error) {
                        pushToast("error", error instanceof Error ? error.message : "Could not delete the tenant.");
                    }
                }}
            />
        </div>
    );
}
