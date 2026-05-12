import { useState } from "react";
import { Eye, EyeOff, LogOut, X } from "lucide-react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { changeCurrentPassword, type CurrentProfile } from "@/lib/auth/authService";

type ProfileModalProps = {
    open: boolean;
    onClose: () => void;
    onLogout: () => Promise<void> | void;
    profile: CurrentProfile;
    primaryLabel: string;
    secondaryLines?: string[];
    title?: string;
};

const passwordPolicyHint = "At least 8 characters, one uppercase, one lowercase, one number, and one symbol.";

export function ProfileModal({
    open,
    onClose,
    onLogout,
    profile,
    primaryLabel,
    secondaryLines = [],
    title = "Profile"
}: ProfileModalProps) {
    const [passwordFormOpen, setPasswordFormOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!open) {
        return null;
    }

    const shouldShowEmailLine = profile.email !== primaryLabel;

    const clearFeedback = () => {
        setError(null);
        setSuccess(null);
    };

    const resetForm = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    };

    const closePasswordForm = () => {
        setPasswordFormOpen(false);
        clearFeedback();
        resetForm();
    };

    const handleClose = () => {
        closePasswordForm();
        onClose();
    };

    const handleChangePassword = async () => {
        clearFeedback();

        if (!currentPassword.trim()) {
            setError("Current password is required.");
            return;
        }

        if (!newPassword.trim()) {
            setError("New password is required.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("New password and confirm password must match.");
            return;
        }

        setIsSubmitting(true);

        try {
            await changeCurrentPassword(currentPassword, newPassword);
            setSuccess("Password updated successfully.");
            resetForm();
            setPasswordFormOpen(false);
        } catch (changeError) {
            setError(changeError instanceof Error ? changeError.message : "Failed to update password.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-backdrop" role="presentation" onClick={handleClose}>
            <div
                className="modal-surface profile-modal"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={event => event.stopPropagation()}
            >
                <div className="modal-surface__header">
                    <h3>{title}</h3>
                    <button type="button" className="icon-button" onClick={handleClose} aria-label={`Close ${title}`}>
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-surface__body">
                    <div className="sa-stack profile-modal__content">
                        <div className="profile-modal__identity">
                            <strong>{primaryLabel}</strong>
                            {shouldShowEmailLine ? <p className="modal-copy">{profile.email}</p> : null}
                            <p className="modal-copy">{profile.role}</p>
                            {secondaryLines.map(line => (
                                <p key={line} className="modal-copy">{line}</p>
                            ))}
                        </div>

                        {passwordFormOpen ? (
                            <div className="profile-password-panel">
                                <h4>Change password</h4>
                                <Input
                                    id="profile-current-password"
                                    label="Current password"
                                    type={showCurrentPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    value={currentPassword}
                                    onChange={event => {
                                        clearFeedback();
                                        setCurrentPassword(event.target.value);
                                    }}
                                    action={(
                                        <button
                                            type="button"
                                            className="icon-button"
                                            aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                                            onClick={() => setShowCurrentPassword(current => !current)}
                                        >
                                            {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    )}
                                />
                                <Input
                                    id="profile-new-password"
                                    label="New password"
                                    type={showNewPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    value={newPassword}
                                    hint={passwordPolicyHint}
                                    onChange={event => {
                                        clearFeedback();
                                        setNewPassword(event.target.value);
                                    }}
                                    action={(
                                        <button
                                            type="button"
                                            className="icon-button"
                                            aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                                            onClick={() => setShowNewPassword(current => !current)}
                                        >
                                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    )}
                                />
                                <Input
                                    id="profile-confirm-password"
                                    label="Confirm new password"
                                    type={showConfirmPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={event => {
                                        clearFeedback();
                                        setConfirmPassword(event.target.value);
                                    }}
                                    action={(
                                        <button
                                            type="button"
                                            className="icon-button"
                                            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                            onClick={() => setShowConfirmPassword(current => !current)}
                                        >
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    )}
                                />
                                {error && <p className="field__message field__message--error" role="alert">{error}</p>}
                                {success && <p className="field__message">{success}</p>}
                                <div className="sa-inline-actions profile-modal__actions profile-modal__actions--form">
                                    <Button variant="secondary" onClick={closePasswordForm} disabled={isSubmitting}>
                                        Cancel
                                    </Button>
                                    <Button variant="secondary" onClick={handleChangePassword} disabled={isSubmitting}>
                                        {isSubmitting ? "Updating..." : "Save Password"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            success ? <p className="field__message">{success}</p> : null
                        )}

                        <div className="sa-inline-actions profile-modal__actions">
                            {!passwordFormOpen ? (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        clearFeedback();
                                        setPasswordFormOpen(true);
                                    }}
                                >
                                    Change Password
                                </Button>
                            ) : null}
                            <Button onClick={onLogout}>
                                <LogOut size={18} />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
