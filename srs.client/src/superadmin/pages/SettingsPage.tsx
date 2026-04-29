import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Modal } from "@/superadmin/components/Modal";
import { SectionCard } from "@/superadmin/components/SectionCard";
import { SectionErrorBoundary } from "@/superadmin/components/SectionErrorBoundary";
import { SkeletonBlock } from "@/superadmin/components/SkeletonBlock";
import { useToast } from "@/superadmin/context/ToastContext";
import {
    useSaveGeneralSettingsMutation,
    useSaveSecuritySettingsMutation,
    useSettingsQuery,
    useUpdateFeatureFlagMutation
} from "@/superadmin/hooks/useSuperadminQueries";
import type { EmailTemplate } from "@/superadmin/types";

const generalSchema = z.object({
    platformName: z.string().min(2, "Platform name is required."),
    contactEmail: z.email("Enter a valid contact email."),
    logoUrl: z.url("Enter a valid logo URL.")
});

const securitySchema = z.object({
    passwordPolicy: z.string().min(12, "Password policy description is too short."),
    mfaRequired: z.boolean(),
    sessionTimeoutMinutes: z.number().min(5).max(240)
});

export function SettingsPage() {
    const [tab, setTab] = useState<"general" | "flags" | "emails" | "security" | "integrations">("general");
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
    const { data, isLoading } = useSettingsQuery();
    const saveGeneralMutation = useSaveGeneralSettingsMutation();
    const updateFlagMutation = useUpdateFeatureFlagMutation();
    const saveSecurityMutation = useSaveSecuritySettingsMutation();
    const { pushToast } = useToast();

    const generalForm = useForm<z.infer<typeof generalSchema>>({
        resolver: zodResolver(generalSchema),
        defaultValues: {
            platformName: "",
            contactEmail: "",
            logoUrl: ""
        }
    });

    const securityForm = useForm<z.infer<typeof securitySchema>>({
        resolver: zodResolver(securitySchema),
        defaultValues: {
            passwordPolicy: "",
            mfaRequired: false,
            sessionTimeoutMinutes: 30
        }
    });

    useEffect(() => {
        if (!data) {
            return;
        }
        generalForm.reset(data.general);
        securityForm.reset(data.security);
    }, [data, generalForm, securityForm]);

    return (
        <div className="sa-stack">
            <SectionErrorBoundary>
                <SectionCard
                    title="Settings & Configuration"
                    subtitle="Manage platform-level defaults, policies, and integrations"
                    actions={
                        <div className="sa-inline-actions">
                            {[
                                ["general", "General"],
                                ["flags", "Feature Flags"],
                                ["emails", "Email Templates"],
                                ["security", "Security"],
                                ["integrations", "Integrations"]
                            ].map(([id, label]) => (
                                <Button
                                    key={id}
                                    variant={tab === id ? "primary" : "secondary"}
                                    onClick={() => setTab(id as typeof tab)}
                                >
                                    {label}
                                </Button>
                            ))}
                        </div>
                    }
                >
                    {isLoading || !data ? (
                        <SkeletonBlock className="sa-table-skeleton" />
                    ) : tab === "general" ? (
                        <form
                            className="sa-form-grid"
                            onSubmit={generalForm.handleSubmit(async values => {
                                await saveGeneralMutation.mutateAsync(values);
                                pushToast("success", "Saved general settings.");
                            })}
                        >
                            <Input
                                label="Platform Name"
                                id="platform-name"
                                error={generalForm.formState.errors.platformName?.message}
                                {...generalForm.register("platformName")}
                            />
                            <Input
                                label="Contact Email"
                                id="platform-email"
                                error={generalForm.formState.errors.contactEmail?.message}
                                {...generalForm.register("contactEmail")}
                            />
                            <Input
                                label="Logo URL"
                                id="platform-logo"
                                error={generalForm.formState.errors.logoUrl?.message}
                                {...generalForm.register("logoUrl")}
                            />
                            <Button type="submit" isLoading={saveGeneralMutation.isPending}>
                                Save General Settings
                            </Button>
                        </form>
                    ) : tab === "flags" ? (
                        <div className="sa-flag-list">
                            {data.featureFlags.map(flag => (
                                <div key={flag.id} className="sa-flag-row">
                                    <div>
                                        <strong>{flag.name}</strong>
                                        <p>{flag.scope}</p>
                                    </div>
                                    <label className="sa-switch">
                                        <input
                                            type="checkbox"
                                            checked={flag.enabled}
                                            onChange={async event => {
                                                await updateFlagMutation.mutateAsync({ ...flag, enabled: event.target.checked });
                                                pushToast("success", `Updated ${flag.name}.`);
                                            }}
                                        />
                                        <span />
                                    </label>
                                </div>
                            ))}
                        </div>
                    ) : tab === "emails" ? (
                        <div className="sa-email-grid">
                            {data.emailTemplates.map(template => (
                                <article key={template.id} className="sa-email-card">
                                    <h3>{template.name}</h3>
                                    <strong>{template.subject}</strong>
                                    <p>{template.preview}</p>
                                    <Button variant="secondary" onClick={() => setSelectedTemplate(template)}>
                                        Preview Template
                                    </Button>
                                </article>
                            ))}
                        </div>
                    ) : tab === "security" ? (
                        <form
                            className="sa-form-grid"
                            onSubmit={securityForm.handleSubmit(async values => {
                                await saveSecurityMutation.mutateAsync(values);
                                pushToast("success", "Saved security settings.");
                            })}
                        >
                            <Input
                                label="Password Policy"
                                id="password-policy"
                                error={securityForm.formState.errors.passwordPolicy?.message}
                                {...securityForm.register("passwordPolicy")}
                            />
                            <Input
                                label="Session Timeout Minutes"
                                id="session-timeout"
                                type="number"
                                error={securityForm.formState.errors.sessionTimeoutMinutes?.message}
                                {...securityForm.register("sessionTimeoutMinutes", { valueAsNumber: true })}
                            />
                            <label className="sa-switch-row">
                                <span>Require MFA</span>
                                <input type="checkbox" {...securityForm.register("mfaRequired")} />
                            </label>
                            <Button type="submit" isLoading={saveSecurityMutation.isPending}>
                                Save Security Settings
                            </Button>
                        </form>
                    ) : (
                        <div className="sa-email-grid">
                            {data.integrations.map(integration => (
                                <article key={integration.id} className="sa-email-card">
                                    <h3>{integration.name}</h3>
                                    <strong>{integration.connected ? "Connected" : "Disconnected"}</strong>
                                    <p>{integration.detail}</p>
                                </article>
                            ))}
                        </div>
                    )}
                </SectionCard>
            </SectionErrorBoundary>

            <Modal
                title={selectedTemplate ? selectedTemplate.name : "Template Preview"}
                open={Boolean(selectedTemplate)}
                onClose={() => setSelectedTemplate(null)}
            >
                {selectedTemplate ? (
                    <div className="sa-stack">
                        <div>
                            <strong>{selectedTemplate.subject}</strong>
                            <p className="modal-copy">{selectedTemplate.preview}</p>
                        </div>
                        <Button onClick={() => pushToast("success", `${selectedTemplate.name} opened for editing.`)}>
                            Edit Template
                        </Button>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
}
