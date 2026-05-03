import { X } from "lucide-react";

export function Modal({
    title,
    open,
    onClose,
    children
}: {
    title: string;
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
}) {
    if (!open) {
        return null;
    }

    return (
        <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
            <div className="admin-modal-surface" role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}>
                <header className="admin-modal-header">
                    <h3>{title}</h3>
                    <button type="button" className="icon-button icon-button--sm" onClick={onClose} aria-label="Close modal">
                        <X size={16} />
                    </button>
                </header>
                <div className="admin-modal-body">{children}</div>
            </div>
        </div>
    );
}
