import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { ConfirmDialog } from "@/superadmin/components/ConfirmDialog";
import { Modal } from "@/superadmin/components/Modal";
import { SectionCard } from "@/superadmin/components/SectionCard";
import { SectionErrorBoundary } from "@/superadmin/components/SectionErrorBoundary";
import { SkeletonBlock } from "@/superadmin/components/SkeletonBlock";
import { useToast } from "@/superadmin/context/ToastContext";
import {
    useCreateTenantMutation,
    useDeleteTenantMutation,
    useTenantMembersQuery,
    useTenantsQuery,
    useUpdateTenantMutation
} from "@/superadmin/hooks/useSuperadminQueries";
import type { Tenant } from "@/superadmin/types";

const tenantSchema = z.object({
    name: z.string().min(2, "Tenant name is required."),
    isActive: z.boolean()
});

export function TenantsPage() {
    const { data: tenants, isLoading } = useTenantsQuery();
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [deleteTenant, setDeleteTenant] = useState<Tenant | null>(null);
    const createTenantMutation = useCreateTenantMutation();
    const updateTenantMutation = useUpdateTenantMutation();
    const deleteTenantMutation = useDeleteTenantMutation();
    const membersQuery = useTenantMembersQuery(selectedTenant?.id ?? null);
    const { pushToast } = useToast();

    const createForm = useForm<z.infer<typeof tenantSchema>>({
        resolver: zodResolver(tenantSchema),
        defaultValues: { name: "", isActive: true }
    });

    const editForm = useForm<z.infer<typeof tenantSchema>>({
        resolver: zodResolver(tenantSchema),
        values: {
            name: editingTenant?.name ?? "",
            isActive: editingTenant?.isActive ?? true
        }
    });

    return (
        <div className="sa-stack">
            <SectionErrorBoundary>
                <SectionCard
                    title="Tenants / Organizations"
                    subtitle="Manage real tenants stored in your database"
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
                        await createTenantMutation.mutateAsync(values);
                        pushToast("success", `Created ${values.name}.`);
                        setCreateOpen(false);
                        createForm.reset();
                    })}
                >
                    <Input
                        label="Tenant Name"
                        id="tenant-name"
                        error={createForm.formState.errors.name?.message}
                        {...createForm.register("name")}
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

                        await updateTenantMutation.mutateAsync({
                            tenantId: editingTenant.id,
                            name: values.name,
                            isActive: values.isActive
                        });
                        pushToast("success", `Updated ${values.name}.`);
                        setEditingTenant(null);
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

                    await deleteTenantMutation.mutateAsync(deleteTenant.id);
                    pushToast("success", `Deleted ${deleteTenant.name}.`);
                    setDeleteTenant(null);
                    if (selectedTenant?.id === deleteTenant.id) {
                        setSelectedTenant(null);
                    }
                }}
            />
        </div>
    );
}
