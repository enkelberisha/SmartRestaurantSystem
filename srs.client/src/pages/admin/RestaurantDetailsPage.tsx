import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Modal } from "@/features/admin/components/Modal";
import { useAdminRestaurant } from "@/features/admin/context/adminRestaurantContextValue";
import { useToast } from "@/features/admin/context/ToastContext";
import {
    getAdminRestaurants,
    getAdminUsers,
    getMyRestaurantApprovalRequests,
    resubmitRestaurantCreateRequest,
    submitRestaurantCreateRequest,
    submitRestaurantDeleteRequest,
    updateRestaurantCreateRequest,
    updateAdminRestaurant,
    updateAdminUserEmail,
    updateAdminUserPassword,
    type AdminRestaurant,
    type AdminUser,
    type RestaurantApprovalRequestDetail,
    type RestaurantAccountApprovalPayload,
    type RestaurantPayload
} from "@/lib/admin/adminService";
import type { AppRole } from "@/lib/auth/roles";

type AccountKey = "host" | "table" | "kitchen" | "waiter";
type CreateFlowPhase = "details" | "accounts" | "summary" | "pending";

type AccountDefinition = {
    key: AccountKey;
    label: string;
    role: AppRole;
    description: string;
};

type AccountDraft = {
    email: string;
    password: string;
    confirmPassword: string;
};

type CreateRestaurantForm = RestaurantPayload & {
    accounts: Record<AccountKey, AccountDraft>;
};

type PasswordVisibilityKey =
    | "delete-password"
    | "create-host-password"
    | "create-host-confirm"
    | "create-kitchen-password"
    | "create-kitchen-confirm"
    | "create-waiter-password"
    | "create-waiter-confirm"
    | "create-table-password"
    | "create-table-confirm"
    | "edit-host-password"
    | "edit-host-confirm"
    | "edit-kitchen-password"
    | "edit-kitchen-confirm"
    | "edit-waiter-password"
    | "edit-waiter-confirm"
    | "edit-table-password"
    | "edit-table-confirm";

const operationalAccountDefinitions: AccountDefinition[] = [
    { key: "host", label: "Host Device Account", role: "HostDevice", description: "Front-of-house device access." },
    { key: "kitchen", label: "Kitchen Device Account", role: "KitchenDevice", description: "Kitchen production access." },
    { key: "waiter", label: "Waiter POS Device Account", role: "PosDevice", description: "POS terminal access for waiter logins." },
    { key: "table", label: "Table Tablet Account", role: "TableDevice", description: "Tablet ordering access." }
];

const emptyAccountDraft = (): AccountDraft => ({ email: "", password: "", confirmPassword: "" });

const emptyRestaurantForm: RestaurantPayload = {
    name: "",
    location: "",
    cuisineType: "",
    contactEmail: "",
    contactPhone: "",
    logoUrl: "",
    ownerId: null,
    managerId: null
};

const emptyCreateRestaurantForm = (): CreateRestaurantForm => ({
    ...emptyRestaurantForm,
    accounts: {
        host: emptyAccountDraft(),
        kitchen: emptyAccountDraft(),
        waiter: emptyAccountDraft(),
        table: emptyAccountDraft()
    }
});

function validateMatchingPassword(draft: AccountDraft, required: boolean) {
    if (!required && !draft.password && !draft.confirmPassword) {
        return;
    }

    if (!draft.password) {
        throw new Error("Password is required.");
    }

    if (draft.password !== draft.confirmPassword) {
        throw new Error("Password and confirm password must match.");
    }
}

function validateRequiredAccountStep(definition: AccountDefinition, draft: AccountDraft) {
    if (!draft.email.trim()) {
        throw new Error(`${definition.label} email is required.`);
    }

    validateMatchingPassword(draft, true);
}

function PasswordField({
    label,
    value,
    visible,
    onChange,
    onToggle,
    required = false
}: {
    label: string;
    value: string;
    visible: boolean;
    onChange: (value: string) => void;
    onToggle: () => void;
    required?: boolean;
}) {
    return (
        <div className="admin-field">
            <label>{label}</label>
            <div className="admin-inline-actions" style={{ alignItems: "stretch", gap: "0.65rem" }}>
                <input
                    type={visible ? "text" : "password"}
                    className="admin-input"
                    value={value}
                    onChange={event => onChange(event.target.value)}
                    required={required}
                    style={{ flex: 1 }}
                />
                <Button className="admin-button" type="button" variant="secondary" onClick={onToggle}>
                    {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                    {visible ? "Hide" : "Show"}
                </Button>
            </div>
        </div>
    );
}

export function RestaurantDetailsPage() {
    const { pushToast } = useToast();
    const { selectedRestaurantId: adminSelectedRestaurantId, refreshRestaurants, setSelectedRestaurantId: setAdminSelectedRestaurantId } = useAdminRestaurant();
    const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
    const [restaurantForm, setRestaurantForm] = useState<RestaurantPayload>(emptyRestaurantForm);
    const [createForm, setCreateForm] = useState<CreateRestaurantForm>(emptyCreateRestaurantForm);
    const [createPhase, setCreatePhase] = useState<CreateFlowPhase>("details");
    const [createInfoStepIndex, setCreateInfoStepIndex] = useState(0);
    const [createStepIndex, setCreateStepIndex] = useState(0);
    const [inlineDrafts, setInlineDrafts] = useState<Partial<Record<AccountKey, AccountDraft>>>({});
    const [activeEditorKey, setActiveEditorKey] = useState<AccountKey | null>(null);
    const [deletePassword, setDeletePassword] = useState("");
    const [deletePendingMessage, setDeletePendingMessage] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
    const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
    const [accountActionKey, setAccountActionKey] = useState<AccountKey | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [accountEditorError, setAccountEditorError] = useState<string | null>(null);
    const [visiblePasswords, setVisiblePasswords] = useState<Partial<Record<PasswordVisibilityKey, boolean>>>({});
    const [approvalRequests, setApprovalRequests] = useState<RestaurantApprovalRequestDetail[]>([]);
    const [editingRequestId, setEditingRequestId] = useState<number | null>(null);

    const restaurantsById = useMemo(() => new Map(restaurants.map(restaurant => [restaurant.id, restaurant])), [restaurants]);
    const assignmentUsers = useMemo(
        () => users.filter(user => ["Owner", "Manager", "Admin"].includes(user.role)).sort((left, right) => left.email.localeCompare(right.email)),
        [users]
    );

    const selectedRestaurant = selectedRestaurantId === null ? null : restaurantsById.get(selectedRestaurantId) ?? null;

    const operationalAccounts = useMemo(() => {
        return operationalAccountDefinitions.map(definition => ({
            ...definition,
            account: selectedRestaurantId === null
                ? null
                : users.find(user => user.restaurantId === selectedRestaurantId && user.role === definition.role) ?? null
        }));
    }, [selectedRestaurantId, users]);

    const hydrateSelectedRestaurant = useCallback((restaurant: AdminRestaurant | null) => {
        setSelectedRestaurantId(restaurant?.id ?? null);
        setRestaurantForm({
            name: restaurant?.name ?? "",
            location: restaurant?.location ?? "",
            cuisineType: restaurant?.cuisineType ?? "",
            contactEmail: restaurant?.contactEmail ?? "",
            contactPhone: restaurant?.contactPhone ?? "",
            logoUrl: restaurant?.logoUrl ?? "",
            ownerId: restaurant?.ownerId ?? null,
            managerId: restaurant?.managerId ?? null
        });
    }, []);

    const loadDetails = useCallback(async (preferredRestaurantId?: number | null) => {
        const [restaurantResult, userResult, requestResult] = await Promise.all([
            getAdminRestaurants(),
            getAdminUsers(),
            getMyRestaurantApprovalRequests()
        ]);

        setRestaurants(restaurantResult);
        setUsers(userResult);
        setApprovalRequests(requestResult);

        const preferredId = preferredRestaurantId ?? (adminSelectedRestaurantId === "all" ? null : adminSelectedRestaurantId);
        const nextRestaurant = restaurantResult.find(restaurant => restaurant.id === preferredId) ?? restaurantResult[0] ?? null;
        hydrateSelectedRestaurant(nextRestaurant);
    }, [adminSelectedRestaurantId, hydrateSelectedRestaurant]);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                setIsLoading(true);
                setError(null);
                await loadDetails();
            } catch (loadError) {
                if (isMounted) {
                    setError(loadError instanceof Error ? loadError.message : "Could not load restaurants.");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void load();
        return () => {
            isMounted = false;
        };
    }, [loadDetails]);

    useEffect(() => {
        const refresh = () => {
            void loadDetails(selectedRestaurantId);
        };

        const intervalId = window.setInterval(refresh, 15000);
        const handleFocus = () => refresh();
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                refresh();
            }
        };

        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [loadDetails, selectedRestaurantId]);

    const selectRestaurant = async (restaurantId: number) => {
        const restaurant = restaurantsById.get(restaurantId) ?? null;
        hydrateSelectedRestaurant(restaurant);
        setAdminSelectedRestaurantId(restaurantId);
    };

    const saveRestaurant = async () => {
        if (selectedRestaurantId === null) {
            return;
        }

        try {
            setIsSaving(true);
            setError(null);
            await updateAdminRestaurant(selectedRestaurantId, restaurantForm);
            await refreshRestaurants(selectedRestaurantId);
            await loadDetails(selectedRestaurantId);
            pushToast("success", "Restaurant info updated.");
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Could not update restaurant.";
            setError(message);
            pushToast("error", message);
        } finally {
            setIsSaving(false);
        }
    };

    const updateInlineDraft = (key: AccountKey, patch: Partial<AccountDraft>) => {
        setInlineDrafts(current => ({
            ...current,
            [key]: { ...(current[key] ?? emptyAccountDraft()), ...patch }
        }));
    };

    const beginInlineEdit = (definition: AccountDefinition, email: string) => {
        setAccountEditorError(null);
        setActiveEditorKey(definition.key);
        setInlineDrafts(current => ({
            ...current,
            [definition.key]: { email, password: "", confirmPassword: "" }
        }));
    };

    const saveInlineAccount = async (definition: AccountDefinition, currentUser: AdminUser | null) => {
        const draft = inlineDrafts[definition.key] ?? emptyAccountDraft();

        try {
            if (!currentUser) {
                throw new Error("Create missing accounts from the staff page for now.");
            }

            validateMatchingPassword(draft, false);
            setAccountEditorError(null);
            setAccountActionKey(definition.key);

            if (draft.email.trim() && draft.email.trim() !== currentUser.email) {
                await updateAdminUserEmail(currentUser.id, draft.email.trim());
            }

            if (draft.password) {
                await updateAdminUserPassword(currentUser.id, draft.password);
            }

            if (selectedRestaurantId) {
                await loadDetails(selectedRestaurantId);
            }
            setActiveEditorKey(null);
            pushToast("success", `${definition.label} updated.`);
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Could not update account.";
            setError(message);
            setAccountEditorError(message);
            pushToast("error", message);
        } finally {
            setAccountActionKey(null);
        }
    };

    const openCreateForm = () => {
        setCreateForm(emptyCreateRestaurantForm());
        setCreatePhase("details");
        setCreateInfoStepIndex(0);
        setCreateStepIndex(0);
        setCreateError(null);
        setEditingRequestId(null);
        setIsCreateOpen(true);
    };

    const closeCreateForm = () => {
        setIsCreateOpen(false);
        setCreateError(null);
        setEditingRequestId(null);
    };

    const openEditRequest = (request: RestaurantApprovalRequestDetail) => {
        if (!request.restaurant) {
            return;
        }

        const nextAccounts = {
            host: emptyAccountDraft(),
            kitchen: emptyAccountDraft(),
            waiter: emptyAccountDraft(),
            table: emptyAccountDraft()
        };

        for (const definition of operationalAccountDefinitions) {
            const account = request.accounts.find(current => current.role === definition.role);
            if (account) {
                nextAccounts[definition.key] = {
                    email: account.email,
                    password: account.password,
                    confirmPassword: account.password
                };
            }
        }

        setCreateForm({
            ...request.restaurant,
            accounts: nextAccounts
        });
        setEditingRequestId(request.id);
        setCreatePhase("details");
        setCreateInfoStepIndex(0);
        setCreateStepIndex(0);
        setCreateError(null);
        setIsCreateOpen(true);
    };

    const submitCreateRequest = async () => {
        try {
            setIsSubmittingCreate(true);
            setCreateError(null);

            if (!createForm.name.trim()) {
                throw new Error("Restaurant name is required.");
            }

            if (!createForm.location.trim()) {
                throw new Error("Restaurant location is required.");
            }

            const accounts: RestaurantAccountApprovalPayload[] = operationalAccountDefinitions.map(definition => {
                const draft = createForm.accounts[definition.key];
                const email = draft.email.trim();

                validateRequiredAccountStep(definition, draft);

                return {
                    email,
                    password: draft.password,
                    role: definition.role
                };
            });

            if (editingRequestId) {
                await updateRestaurantCreateRequest(editingRequestId, createForm, accounts);
                pushToast("success", "Restaurant request updated.");
                await loadDetails(selectedRestaurantId);
                setCreatePhase("pending");
                return;
            }

            await submitRestaurantCreateRequest(createForm, accounts);
            setCreatePhase("pending");
            pushToast("success", "Restaurant creation request submitted.");
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : "Could not submit creation request.";
            setCreateError(message);
            pushToast("error", message);
        } finally {
            setIsSubmittingCreate(false);
        }
    };

    const nextCreateStep = () => {
        if (createPhase === "details") {
            if (createInfoStepIndex === 0 && !createForm.name.trim()) {
                setCreateError("Restaurant name is required.");
                return;
            }

            if (createInfoStepIndex === 1 && !createForm.location.trim()) {
                setCreateError("Restaurant location is required.");
                return;
            }

            setCreateError(null);
            if (createInfoStepIndex < 1) {
                setCreateInfoStepIndex(current => current + 1);
                return;
            }

            setCreatePhase("accounts");
            setCreateStepIndex(0);
            return;
        }

        try {
            validateRequiredAccountStep(currentAccountDefinition, currentAccountDraft);
            setCreateError(null);
        } catch (validationError) {
            const message = validationError instanceof Error ? validationError.message : "Please complete all account fields.";
            setCreateError(message);
            return;
        }

        if (createStepIndex < operationalAccountDefinitions.length - 1) {
            setCreateStepIndex(current => current + 1);
            return;
        }

        setCreatePhase("summary");
    };

    const currentAccountDefinition = operationalAccountDefinitions[createStepIndex];
    const currentAccountDraft = createForm.accounts[currentAccountDefinition.key];

    const submitDeleteRequest = async () => {
        if (!selectedRestaurant) {
            return;
        }

        try {
            setIsSubmittingDelete(true);
            setError(null);
            setDeleteError(null);
            await submitRestaurantDeleteRequest(selectedRestaurant.id, deletePassword);
            setDeletePendingMessage("Deletion request sent to Super Admin. Awaiting approval.");
            setDeletePassword("");
            pushToast("success", "Deletion request sent to Super Admin. Awaiting approval.");
        } catch (deleteError) {
            const message = deleteError instanceof Error ? deleteError.message : "Could not submit deletion request.";
            setError(message);
            setDeleteError(message);
            pushToast("error", message);
        } finally {
            setIsSubmittingDelete(false);
        }
    };

    const resendRequest = async (requestId: number) => {
        try {
            const updated = await resubmitRestaurantCreateRequest(requestId);
            setApprovalRequests(current => current.map(request => request.id === requestId ? updated : request));
            pushToast("success", "Restaurant request sent back to Super Admin.");
        } catch (requestError) {
            const message = requestError instanceof Error ? requestError.message : "Could not resend request.";
            setError(message);
            pushToast("error", message);
        }
    };

    const togglePasswordVisibility = (key: PasswordVisibilityKey) => {
        setVisiblePasswords(current => ({ ...current, [key]: !current[key] }));
    };

    if (isLoading) {
        return (
            <div className="admin-stack">
                <div className="skeleton-block admin-chart-skeleton" />
            </div>
        );
    }

    return (
        <div className="admin-stack">
            <header className="admin-page-header">
                <div>
                    <h1>Restaurant</h1>
                    <p>Restaurant profile, operational accounts, and approval requests.</p>
                </div>
                <div className="admin-inline-actions">
                    <Button className="admin-button" onClick={openCreateForm}>
                        <Plus size={18} />
                        Create Restaurant
                    </Button>
                    <Button className="admin-button" variant="secondary" onClick={() => setIsDeleteOpen(true)} disabled={!selectedRestaurant}>
                        <Trash2 size={18} />
                        Delete Restaurant
                    </Button>
                </div>
            </header>

            {error && <div className="admin-alert admin-alert--warning">{error}</div>}

            {selectedRestaurant ? (
                <>
                    <article className="admin-section-card admin-restaurant-profile-card">
                        <form
                            className="admin-form admin-restaurant-profile-card__form"
                            onSubmit={event => {
                                event.preventDefault();
                                void saveRestaurant();
                            }}
                        >
                            <section className="admin-form-section admin-restaurant-profile-card__section">
                                <h3>Restaurant Info</h3>
                                <div className="admin-field">
                                    <label>Restaurant</label>
                                    <select className="admin-select" value={selectedRestaurantId ?? ""} onChange={event => void selectRestaurant(Number(event.target.value))}>
                                        {restaurants.map(restaurant => (
                                            <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="admin-field">
                                    <label>Name</label>
                                    <input className="admin-input" value={restaurantForm.name} onChange={event => setRestaurantForm(current => ({ ...current, name: event.target.value }))} />
                                </div>
                                <div className="admin-field">
                                    <label>Location</label>
                                    <input className="admin-input" value={restaurantForm.location} onChange={event => setRestaurantForm(current => ({ ...current, location: event.target.value }))} />
                                </div>
                                <div className="admin-form-row">
                                    <div className="admin-field">
                                        <label>Owner</label>
                                        <select className="admin-select" value={restaurantForm.ownerId ?? ""} onChange={event => setRestaurantForm(current => ({ ...current, ownerId: event.target.value ? Number(event.target.value) : null }))}>
                                            <option value="">Unassigned</option>
                                            {assignmentUsers.map(user => <option key={user.id} value={user.id}>{user.email} ({user.role})</option>)}
                                        </select>
                                    </div>
                                    <div className="admin-field">
                                        <label>Manager</label>
                                        <select className="admin-select" value={restaurantForm.managerId ?? ""} onChange={event => setRestaurantForm(current => ({ ...current, managerId: event.target.value ? Number(event.target.value) : null }))}>
                                            <option value="">Unassigned</option>
                                            {assignmentUsers.map(user => <option key={user.id} value={user.id}>{user.email} ({user.role})</option>)}
                                        </select>
                                    </div>
                                </div>
                            </section>
                            <div className="admin-inline-actions admin-restaurant-profile-card__actions">
                                <Button className="admin-button" type="submit" isLoading={isSaving}>Save Info</Button>
                            </div>
                        </form>
                    </article>

                    <section className="admin-restaurant-account-grid">
                        {operationalAccounts.map(definition => {
                            const currentUser = definition.account;
                            const isEditing = activeEditorKey === definition.key;
                            const draft = inlineDrafts[definition.key] ?? { email: currentUser?.email ?? "", password: "", confirmPassword: "" };

                            return (
                                <article key={definition.key} className="admin-section-card admin-restaurant-account-card">
                                    <div className="admin-staff-card__content">
                                        <strong>{definition.label}</strong>
                                        <span className="admin-muted">{definition.description}</span>
                                    </div>
                                    {!isEditing ? (
                                        <>
                                            <div className="admin-staff-card__detail"><span className="admin-badge">{definition.role}</span></div>
                                            <p className="admin-muted">{currentUser?.email ?? "Account not created yet"}</p>
                                            <p className="admin-muted">Password: ********</p>
                                            {currentUser && <Button className="admin-button" variant="secondary" onClick={() => beginInlineEdit(definition, currentUser.email)}>Edit</Button>}
                                        </>
                                    ) : (
                                        <div className="admin-legend">
                                            {accountEditorError && <div className="admin-alert admin-alert--warning">{accountEditorError}</div>}
                                            <div className="admin-field">
                                                <label>Email</label>
                                                <input className="admin-input" value={draft.email} onChange={event => updateInlineDraft(definition.key, { email: event.target.value })} />
                                            </div>
                                            <PasswordField
                                                label="New password"
                                                value={draft.password}
                                                visible={Boolean(visiblePasswords[`edit-${definition.key}-password`])}
                                                onChange={value => updateInlineDraft(definition.key, { password: value })}
                                                onToggle={() => togglePasswordVisibility(`edit-${definition.key}-password`)}
                                            />
                                            <PasswordField
                                                label="Confirm password"
                                                value={draft.confirmPassword}
                                                visible={Boolean(visiblePasswords[`edit-${definition.key}-confirm`])}
                                                onChange={value => updateInlineDraft(definition.key, { confirmPassword: value })}
                                                onToggle={() => togglePasswordVisibility(`edit-${definition.key}-confirm`)}
                                            />
                                            <div className="admin-inline-actions">
                                                <Button className="admin-button" variant="secondary" onClick={() => { setActiveEditorKey(null); setAccountEditorError(null); }}>Cancel</Button>
                                                <Button className="admin-button" onClick={() => void saveInlineAccount(definition, currentUser)} isLoading={accountActionKey === definition.key}>Save</Button>
                                            </div>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </section>

                </>
            ) : (
                <article className="admin-section-card"><p className="admin-empty-panel">No restaurants yet. Submit a creation request to get started.</p></article>
            )}

            <section className="admin-section-card admin-restaurant-accounts-panel">
                <div className="admin-section-card__header">
                    <div>
                        <h2>Restaurant Requests</h2>
                        <p>Your create and delete requests, with quick edit and resend actions.</p>
                    </div>
                </div>
                <div className="admin-restaurant-account-grid">
                    {approvalRequests.map(request => (
                        <article key={request.id} className="admin-restaurant-account-card">
                            <div className="admin-staff-card__content">
                                <strong>{request.summary}</strong>
                                <span className="admin-muted">
                                    {request.type} request • {request.status} • {new Date(request.createdAt).toLocaleString()}
                                </span>
                            </div>
                            {request.rejectionReason && <div className="admin-alert admin-alert--warning">{request.rejectionReason}</div>}
                            {request.type === "Create" && request.restaurant && (
                                <>
                                    <p className="admin-muted">{request.restaurant.name} • {request.restaurant.location}</p>
                                    <div className="admin-inline-actions">
                                        <Button className="admin-button" variant="secondary" onClick={() => openEditRequest(request)} disabled={request.status === "Approved"}>
                                            Edit Request
                                        </Button>
                                        {request.status === "Rejected" && (
                                            <Button className="admin-button" onClick={() => void resendRequest(request.id)}>
                                                Resend to Super Admin
                                            </Button>
                                        )}
                                    </div>
                                </>
                            )}
                        </article>
                    ))}
                    {approvalRequests.length === 0 && <p className="admin-empty-panel">No restaurant requests yet.</p>}
                </div>
            </section>

            <Modal title={editingRequestId ? "Edit Restaurant Request" : "Create Restaurant"} open={isCreateOpen} onClose={closeCreateForm}>
                {createPhase === "details" && (
                    <form className="admin-form" onSubmit={event => { event.preventDefault(); nextCreateStep(); }}>
                        {createError && <div className="admin-alert admin-alert--warning admin-modal-error-panel">{createError}</div>}
                        <section className="admin-form-section">
                            {createInfoStepIndex === 0 && (
                                <>
                                    <h3>Step 1 - Restaurant name</h3>
                                    <div className="admin-field"><label>Name</label><input className="admin-input" value={createForm.name} onChange={event => setCreateForm(current => ({ ...current, name: event.target.value }))} required /></div>
                                </>
                            )}
                            {createInfoStepIndex === 1 && (
                                <>
                                    <h3>Step 2 - Location</h3>
                                    <div className="admin-field"><label>Location</label><input className="admin-input" value={createForm.location} onChange={event => setCreateForm(current => ({ ...current, location: event.target.value }))} required /></div>
                                </>
                            )}
                        </section>
                        <div className="admin-inline-actions">
                            <Button className="admin-button" type="button" variant="secondary" onClick={() => setCreateInfoStepIndex(current => Math.max(0, current - 1))} disabled={createInfoStepIndex === 0}>Back</Button>
                            <Button className="admin-button" type="submit">Next</Button>
                        </div>
                    </form>
                )}
                {createPhase === "accounts" && (
                    <form className="admin-form" onSubmit={event => { event.preventDefault(); nextCreateStep(); }}>
                        {createError && <div className="admin-alert admin-alert--warning admin-modal-error-panel">{createError}</div>}
                        <section className="admin-form-section">
                            <h3>Step 3 of 4 - {currentAccountDefinition.label} ({createStepIndex + 1} of {operationalAccountDefinitions.length})</h3>
                            <div className="admin-field"><label>Email</label><input className="admin-input" value={currentAccountDraft.email} onChange={event => setCreateForm(current => ({ ...current, accounts: { ...current.accounts, [currentAccountDefinition.key]: { ...current.accounts[currentAccountDefinition.key], email: event.target.value } } }))} required /></div>
                            <PasswordField
                                label="Password"
                                value={currentAccountDraft.password}
                                visible={Boolean(visiblePasswords[`create-${currentAccountDefinition.key}-password`])}
                                onChange={value => setCreateForm(current => ({ ...current, accounts: { ...current.accounts, [currentAccountDefinition.key]: { ...current.accounts[currentAccountDefinition.key], password: value } } }))}
                                onToggle={() => togglePasswordVisibility(`create-${currentAccountDefinition.key}-password`)}
                                required
                            />
                            <PasswordField
                                label="Confirm password"
                                value={currentAccountDraft.confirmPassword}
                                visible={Boolean(visiblePasswords[`create-${currentAccountDefinition.key}-confirm`])}
                                onChange={value => setCreateForm(current => ({ ...current, accounts: { ...current.accounts, [currentAccountDefinition.key]: { ...current.accounts[currentAccountDefinition.key], confirmPassword: value } } }))}
                                onToggle={() => togglePasswordVisibility(`create-${currentAccountDefinition.key}-confirm`)}
                                required
                            />
                        </section>
                        <div className="admin-inline-actions">
                            <Button className="admin-button" type="button" variant="secondary" onClick={() => createStepIndex === 0 ? (setCreatePhase("details"), setCreateInfoStepIndex(1)) : setCreateStepIndex(current => current - 1)}>Back</Button>
                            <Button className="admin-button" type="submit">Next</Button>
                        </div>
                    </form>
                )}
                {createPhase === "summary" && (
                    <div className="admin-form">
                        {createError && <div className="admin-alert admin-alert--warning admin-modal-error-panel">{createError}</div>}
                        <section className="admin-form-section">
                            <h3>Step 4 - Review summary</h3>
                            <p><strong>{createForm.name}</strong></p>
                            <p className="admin-muted">{createForm.location}</p>
                            {operationalAccountDefinitions.map(definition => (
                                <p key={definition.key} className="admin-muted">{definition.label}: {createForm.accounts[definition.key].email || "Not provided"}</p>
                            ))}
                        </section>
                        <div className="admin-inline-actions">
                            <Button className="admin-button" variant="secondary" onClick={() => setCreatePhase("accounts")}>Back</Button>
                            <Button className="admin-button" onClick={() => void submitCreateRequest()} isLoading={isSubmittingCreate}>
                                {editingRequestId ? "Save Request" : "Submit for Review"}
                            </Button>
                        </div>
                    </div>
                )}
                {createPhase === "pending" && (
                    <div className="admin-form">
                        <section className="admin-form-section">
                            <h3>Pending Super Admin Approval</h3>
                            <p className="admin-muted">
                                {editingRequestId
                                    ? "Your restaurant request changes were saved. Resend it from the Restaurant Requests panel when you are ready."
                                    : "Your restaurant creation request has been submitted and is pending Super Admin approval."}
                            </p>
                        </section>
                        <Button className="admin-button" onClick={closeCreateForm}>Finish</Button>
                    </div>
                )}
            </Modal>

            <Modal title="Confirm Delete Restaurant" open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)}>
                <div className="admin-form">
                    {deletePendingMessage ? (
                        <section className="admin-form-section">
                            <h3>Pending Super Admin Approval</h3>
                            <p className="admin-muted">{deletePendingMessage}</p>
                        </section>
                    ) : (
                        <section className="admin-form-section">
                            {deleteError && <div className="admin-alert admin-alert--warning">{deleteError}</div>}
                            <h3>Admin password required</h3>
                            <p className="admin-muted">Enter your admin password. This sends a deletion request to Super Admin for review and approval.</p>
                            <PasswordField
                                label="Admin password"
                                value={deletePassword}
                                visible={Boolean(visiblePasswords["delete-password"])}
                                onChange={setDeletePassword}
                                onToggle={() => togglePasswordVisibility("delete-password")}
                            />
                        </section>
                    )}
                    <div className="admin-inline-actions">
                        <Button className="admin-button" variant="secondary" onClick={() => setIsDeleteOpen(false)}>Close</Button>
                        {!deletePendingMessage && <Button className="admin-button" onClick={() => void submitDeleteRequest()} isLoading={isSubmittingDelete}>Send Request</Button>}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
