import type { FormEvent, ReactNode } from "react";
import { Banknote, CreditCard, Lock, Minus, Plus, ReceiptText, ShoppingCart, X } from "lucide-react";
import type { CartLine, MenuItem, PaymentStep } from "@/features/table-ordering/types";
import { currency, getItemInitials } from "@/features/table-ordering/utils";

function Modal({ children, className = "", onClose }: { children: ReactNode; className?: string; onClose: () => void }) {
    return (
        <div className="pos-modal-backdrop" role="presentation">
            <section className={`pos-modal ${className}`.trim()} aria-modal="true" role="dialog">
                <button className="pos-modal__close" onClick={onClose} type="button">
                    <X size={20} />
                </button>
                {children}
            </section>
        </div>
    );
}

type ItemModalProps = {
    item: MenuItem;
    notes: string;
    onAdd: () => void;
    onClose: () => void;
    onNotesChange: (notes: string) => void;
    onQuantityChange: (quantity: number) => void;
    quantity: number;
};

export function ItemModal({ item, notes, onAdd, onClose, onNotesChange, onQuantityChange, quantity }: ItemModalProps) {
    return (
        <Modal className="pos-item-modal" onClose={onClose}>
            <div className="pos-item-modal__visual">
                <span>{getItemInitials(item.name)}</span>
            </div>
            <p>{item.category}</p>
            <h2>{item.name}</h2>
            <strong className="pos-item-modal__price">{currency.format(item.price)}</strong>
            <p className="pos-item-modal__description">{item.description}</p>
            <label className="pos-item-notes">
                Special instructions
                <textarea
                    maxLength={300}
                    onChange={(event) => onNotesChange(event.target.value)}
                    placeholder="No onions, sauce on the side..."
                    value={notes}
                />
            </label>
            <div className="pos-quantity-control" aria-label="Quantity">
                <button onClick={() => onQuantityChange(Math.max(1, quantity - 1))} type="button">
                    <Minus size={22} />
                </button>
                <span>{quantity}</span>
                <button onClick={() => onQuantityChange(quantity + 1)} type="button">
                    <Plus size={22} />
                </button>
            </div>
            <button className="pos-primary-button" onClick={onAdd} type="button">
                <ShoppingCart size={20} />
                Add {quantity} to Cart
            </button>
        </Modal>
    );
}

type CartModalProps = {
    cartLines: CartLine[];
    cartTotal: number;
    onClose: () => void;
    onOrder: () => void;
    orderedLines: CartLine[];
    table: string;
};

export function CartModal({ cartLines, cartTotal, onClose, onOrder, orderedLines, table }: CartModalProps) {
    return (
        <Modal className="pos-cart-modal" onClose={onClose}>
            <p>Table {table}</p>
            <h2>Cart</h2>
            <OrderLines emptyText="No items are waiting in the cart." lines={cartLines} />
            <div className="pos-bill-total">
                <span>Total</span>
                <strong>{currency.format(cartTotal)}</strong>
            </div>
            <button className="pos-primary-button" disabled={cartLines.length === 0} onClick={onOrder} type="button">
                <ReceiptText size={20} />
                Order Now
            </button>
            <div className="pos-ordered-history">
                <strong>Already ordered</strong>
                <OrderLines emptyText="No orders sent yet." lines={orderedLines} />
            </div>
        </Modal>
    );
}

type PaymentModalProps = {
    amount: number;
    lines: CartLine[];
    onCardPayment: () => void;
    onCardSelect: () => void;
    onCash: () => void;
    onClose: () => void;
    step: PaymentStep;
    table: string;
};

export function PaymentModal({ amount, lines, onCardPayment, onCardSelect, onCash, onClose, step, table }: PaymentModalProps) {
    if (step === "card") {
        return (
            <Modal className="pos-card-payment" onClose={onClose}>
                <p>Card Payment</p>
                <h2>{currency.format(amount)}</h2>
                <button className="pos-card-reader" onClick={onCardPayment} type="button">
                    <CreditCard size={54} />
                    <strong>Tap card against tablet</strong>
                    <span>Press here to simulate contactless payment</span>
                </button>
            </Modal>
        );
    }

    if (step !== "choice") {
        return null;
    }

    return (
        <Modal className="pos-payment-modal" onClose={onClose}>
            <p>Table {table}</p>
            <h2>Choose Payment</h2>
            <OrderLines lines={lines} />
            <div className="pos-bill-total">
                <span>Amount due</span>
                <strong>{currency.format(amount)}</strong>
            </div>
            <div className="pos-payment-options">
                <button onClick={onCash} type="button">
                    <Banknote size={26} />
                    <strong>Cash</strong>
                    <span>Call waiter for payment</span>
                </button>
                <button onClick={onCardSelect} type="button">
                    <CreditCard size={26} />
                    <strong>Card</strong>
                    <span>Open tap-to-pay screen</span>
                </button>
            </div>
        </Modal>
    );
}

type LockModalProps = {
    lockPin: string;
    onClose: () => void;
    onPinChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    table: string;
};

export function LockModal({ lockPin, onClose, onPinChange, onSubmit, table }: LockModalProps) {
    return (
        <div className="pos-modal-backdrop" role="presentation">
            <form className="pos-modal pos-lock-modal" aria-modal="true" onSubmit={onSubmit} role="dialog">
                <button className="pos-modal__close" onClick={onClose} type="button">
                    <X size={20} />
                </button>
                <p>Security Check</p>
                <h2>Confirm Table Logout</h2>
                <label>
                    Table account password
                    <input autoFocus autoComplete="current-password" onChange={(event) => onPinChange(event.target.value)} type="password" value={lockPin} />
                </label>
                <button className="pos-primary-button" type="submit">
                    <Lock size={18} />
                    Log Out Table {table}
                </button>
            </form>
        </div>
    );
}

function OrderLines({ emptyText, lines }: { emptyText?: string; lines: CartLine[] }) {
    return (
        <div className="pos-bill-lines">
            {lines.length === 0 && emptyText ? (
                <span>{emptyText}</span>
            ) : (
                lines.map((line) => (
                    <div className="pos-bill-line" key={line.key}>
                        <span>
                            {line.quantity}x {line.item.name}
                            {line.notes && <small>{line.notes}</small>}
                        </span>
                        <strong>{currency.format(line.item.price * line.quantity)}</strong>
                    </div>
                ))
            )}
        </div>
    );
}
