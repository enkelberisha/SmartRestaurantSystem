import { Button } from "@/components/Button";
import { Modal } from "@/superadmin/components/Modal";

export function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel,
    onClose,
    onConfirm
}: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onClose: () => void;
    onConfirm: () => void;
}) {
    return (
        <Modal title={title} open={open} onClose={onClose}>
            <p className="modal-copy">{message}</p>
            <div className="modal-actions">
                <Button variant="secondary" onClick={onClose}>
                    Cancel
                </Button>
                <Button onClick={onConfirm}>{confirmLabel}</Button>
            </div>
        </Modal>
    );
}
