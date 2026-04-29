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
        <div className="modal-backdrop" role="presentation" onClick={onClose}>
            <div className="modal-surface" role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}>
                <header className="modal-surface__header">
                    <h3>{title}</h3>
                    <button type="button" className="icon-button" onClick={onClose} aria-label="Close modal">
                        x
                    </button>
                </header>
                <div className="modal-surface__body">{children}</div>
            </div>
        </div>
    );
}
