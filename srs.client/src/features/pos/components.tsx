import { useEffect, useRef, useState, type FormEvent } from "react";
import {
    Bell,
    Check,
    CheckCircle2,
    ClipboardList,
    Clock,
    CreditCard,
    Lock,
    LogIn,
    LogOut,
    Plus,
    Send,
    Table2,
    Wifi,
    UserRound,
    X
} from "lucide-react";
import { Button } from "@/components/Button";
import type {
    DraftLine,
    PosAssignedWaiter,
    PosFloorFilter,
    PosFloorStats,
    PosNotification,
    PosOrderStatus,
    PosReservation,
    PosTableServiceStatus,
    PosWaiterSession
} from "@/features/pos/types";
import { keypadValues, money } from "@/features/pos/utils";
import type { AdminMenu, AdminMenuItem, AdminStaff, AdminTable } from "@/lib/admin/adminService";

export type PosTableView = {
    table: AdminTable;
    serviceStatus: PosTableServiceStatus;
    guests: number;
    seatedMinutes: number | null;
    runtimeSeatedAt: string | null;
    orderLines: DraftLine[];
    assignedWaiter: PosAssignedWaiter | null;
    orderStatus: PosOrderStatus;
    reservation: PosReservation | null;
    orderSentAt: string | null;
    billTotal: number | null;
    tableNote: string | null;
};

type PosUnifiedTopBarProps = {
    stats: PosFloorStats;
    notifications: PosNotification[];
    unreadCount: number;
    isNotificationOpen: boolean;
    isLoggedIn: boolean;
    waiterName: string | null;
    waiterInitials: string | null;
    onLogoutApp: () => Promise<void> | void;
    onToggleNotifications: () => void;
    onAcceptNotification: (notificationId: number) => void;
    onClearAccepted: () => void;
};

export function PosUnifiedTopBar({
    stats,
    notifications,
    unreadCount,
    isNotificationOpen,
    isLoggedIn,
    waiterName,
    waiterInitials,
    onLogoutApp,
    onToggleNotifications,
    onAcceptNotification,
    onClearAccepted
}: PosUnifiedTopBarProps) {
    return (
        <header className="pos-unified-topbar">
            <div className="pos-unified-topbar__title">
                <span>Restaurant Floor Overview</span>
                <strong>Live floor control</strong>
            </div>

            <div className="pos-stat-strip" aria-label="Live floor stats">
                <span><b>{stats.total}</b> total</span>
                <span className="pos-stat-chip--occupied"><b>{stats.occupied}</b> occupied</span>
                <span className="pos-stat-chip--available"><b>{stats.available}</b> available</span>
                <span className="pos-stat-chip--attention"><b>{stats.needsWaiter}</b> attention</span>
            </div>

            <div className="pos-topbar-actions">
                {waiterName && waiterInitials && (
                    <div className="pos-topbar-waiter" aria-label={`Logged in waiter ${waiterName}`}>
                        <span className="pos-topbar-waiter__avatar">{waiterInitials}</span>
                        <small>{waiterName}</small>
                    </div>
                )}

                <div className="pos-notification-menu">
                    <button className="pos-bell-button" type="button" onClick={onToggleNotifications} aria-expanded={isNotificationOpen}>
                        <Bell size={22} />
                        {unreadCount > 0 && <span>{unreadCount}</span>}
                    </button>

                    {isNotificationOpen && (
                        <section className="pos-notification-dropdown" aria-label="Notifications">
                            <div className="pos-notification-dropdown__header">
                                <strong>Table alerts</strong>
                                <small>{unreadCount} unread</small>
                            </div>

                            <div className="pos-notification-list">
                                {notifications.map((notification) => (
                                    <article
                                        key={notification.id}
                                        className={[
                                            "pos-notification",
                                            notification.status === "pending" ? "pos-notification--pending" : "pos-notification--read"
                                        ].join(" ")}
                                    >
                                        <span className="pos-notification__dot" />
                                        <div>
                                            <strong>Table {notification.tableNumber}</strong>
                                            <small>{formatNotificationType(notification.type)} | {formatNotificationTime(notification.timestamp)}</small>
                                            {notification.status === "accepted" && (
                                                <em><CheckCircle2 size={13} /> Accepted by {notification.acceptedBy}</em>
                                            )}
                                            {notification.status === "closed" && (
                                                <em><CheckCircle2 size={13} /> Table closed{notification.acceptedBy ? ` by ${notification.acceptedBy}` : ""}</em>
                                            )}
                                        </div>

                                        {notification.status === "pending" && isLoggedIn && (
                                            <button type="button" onClick={() => onAcceptNotification(notification.id)}>
                                                <Check size={14} />
                                                Accept
                                            </button>
                                        )}

                                        {notification.status === "pending" && !isLoggedIn && (
                                            <span className="pos-notification__locked">
                                                <Lock size={14} />
                                                Login to act
                                            </span>
                                        )}
                                    </article>
                                ))}
                                {notifications.length === 0 && <p className="pos-panel__empty">No active table alerts.</p>}
                            </div>
                            {notifications.some((notification) => notification.status !== "pending") && (
                                <button className="pos-notification-dropdown__clear" type="button" onClick={onClearAccepted}>
                                    Clear all accepted
                                </button>
                            )}
                        </section>
                    )}
                </div>

                <button className="pos-topbar-logout" type="button" onClick={() => void onLogoutApp()} aria-label="Logout">
                    <LogOut size={16} />
                </button>
            </div>
        </header>
    );
}

type PosLogoutPromptProps = {
    isOpen: boolean;
    password: string;
    error: string | null;
    isSubmitting: boolean;
    onChangePassword: (value: string) => void;
    onCancel: () => void;
    onConfirm: (event: FormEvent<HTMLFormElement>) => void;
};

export function PosLogoutPrompt({
    isOpen,
    password,
    error,
    isSubmitting,
    onChangePassword,
    onCancel,
    onConfirm
}: PosLogoutPromptProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="pos-logout-prompt-backdrop" role="presentation">
            <section className="pos-logout-prompt" role="dialog" aria-modal="true" aria-label="Confirm POS logout">
                <div className="pos-logout-prompt__header">
                    <span>Exit waiter POS</span>
                    <h2>Enter your password</h2>
                    <p>There is no active waiter. Confirm the account password to leave this POS and return to the main login.</p>
                </div>

                <form className="pos-logout-prompt__form" onSubmit={onConfirm}>
                    <label className="pos-login-form__field">
                        <span>Password</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => onChangePassword(event.target.value)}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            required
                        />
                    </label>

                    {error && <p className="pos-logout-prompt__error">{error}</p>}

                    <div className="pos-logout-prompt__actions">
                        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSubmitting}>
                            <LogOut size={16} />
                            Logout
                        </Button>
                    </div>
                </form>
            </section>
        </div>
    );
}

type PosFloorToolbarProps = {
    activeFilter: PosFloorFilter;
    onFilterChange: (filter: PosFloorFilter) => void;
};

const floorFilters: Array<{ value: PosFloorFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "available", label: "Available" },
    { value: "occupied", label: "Occupied" },
    { value: "needsWaiter", label: "Needs Waiter" },
    { value: "billRequested", label: "Bill Requested" },
    { value: "reserved", label: "Reserved" }
];

export function PosFloorToolbar({ activeFilter, onFilterChange }: PosFloorToolbarProps) {
    return (
        <section className="pos-floor-toolbar" aria-label="Floor filters">
            <div className="pos-filter-tabs" role="tablist" aria-label="Filter tables">
                {floorFilters.map((filter) => (
                    <button
                        key={filter.value}
                        type="button"
                        className={activeFilter === filter.value ? "is-active" : ""}
                        onClick={() => onFilterChange(filter.value)}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>
        </section>
    );
}

type PosFloorGridProps = {
    tables: PosTableView[];
    selectedTableId: number | null;
    onSelectTable: (tableId: number) => void;
};

export function PosFloorGrid({ tables, selectedTableId, onSelectTable }: PosFloorGridProps) {
    return (
        <div className="pos-floor">
            <div className="pos-floor__list">
                {tables.length === 0 && (
                    <div className="pos-floor-empty">
                        <Table2 size={52} />
                        <strong>No tables found</strong>
                        <span>Add tables in the manager/admin table setup and they will appear here from the database.</span>
                    </div>
                )}
                {tables.map(({ table, serviceStatus, guests, seatedMinutes, assignedWaiter, tableNote, reservation }) => {
                    const reservationState = getReservationState(reservation);

                    return (
                    <button
                        key={table.id}
                        type="button"
                        className={[
                            "pos-table-card",
                            `pos-table-card--${serviceStatus}`,
                            reservationState === "soon" ? "pos-table-card--reservation-soon" : "",
                            reservationState === "late" ? "pos-table-card--reservation-late" : "",
                            selectedTableId === table.id ? "pos-table-card--active" : ""
                        ].filter(Boolean).join(" ")}
                        onClick={() => onSelectTable(table.id)}
                    >
                        <div className="pos-table-card__top">
                            <span className="pos-table-card__icon">
                                <Table2 size={40} />
                            </span>
                            {serviceStatus === "needsWaiter" && (
                                <span className="pos-table-card__bell">
                                    <Bell size={18} />
                                </span>
                            )}
                        </div>

                        <div className="pos-table-card__main">
                            <strong>Table {table.number}</strong>
                            <small>{table.capacity} seats</small>
                        </div>

                        <div className="pos-table-card__details">
                            <span className={`pos-status-badge pos-status-badge--${serviceStatus}`}>
                                {serviceStatus === "needsWaiter" && <Bell size={13} />}
                                {formatStatus(serviceStatus)}
                            </span>
                            {reservation && (
                                <small className="pos-reservation-line">
                                    <Clock size={13} />
                                    Res. {formatReservationTime(reservation.time)}
                                    {reservationState === "late" && <b>Late</b>}
                                </small>
                            )}
                            {tableNote && <small>{tableNote}</small>}
                            {serviceStatus !== "available" && (
                                <small>{guests} guests | {formatSeatedTime(seatedMinutes)} seated</small>
                            )}
                        </div>

                        <div className={assignedWaiter ? "pos-table-card__waiter" : "pos-table-card__waiter pos-table-card__waiter--empty"}>
                            {assignedWaiter && <b>{assignedWaiter.initials}</b>}
                            <span>{assignedWaiter ? assignedWaiter.fullName : "Unassigned"}</span>
                        </div>
                    </button>
                );
                })}
            </div>
        </div>
    );
}

type PosLoginPanelProps = {
    credentialValue: string;
    isLoading: boolean;
    isSubmitting: boolean;
    staff: AdminStaff[];
    staffError: string | null;
    onChangeCredential: (value: string) => void;
    onKeypadPress: (key: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onRetryStaff: () => void;
    onTapCredential: (credential: string) => Promise<PosWaiterSession | null>;
};

export function PosLoginPanel({
    credentialValue,
    isLoading,
    isSubmitting,
    staff,
    staffError,
    onChangeCredential,
    onKeypadPress,
    onSubmit,
    onRetryStaff,
    onTapCredential
}: PosLoginPanelProps) {
    const [mode, setMode] = useState<"pin" | "tap">("pin");
    const [tapStatus, setTapStatus] = useState<"idle" | "success" | "error">("idle");
    const [tapMessage, setTapMessage] = useState("Hold your card or watch near the reader");
    const scanBuffer = useRef("");
    const lastKeyAt = useRef(0);
    const resetTapFeedback = useRef<number | null>(null);

    useEffect(() => {
        if (mode !== "tap") {
            return;
        }

        function clearFeedbackLater() {
            if (resetTapFeedback.current) {
                window.clearTimeout(resetTapFeedback.current);
            }

            resetTapFeedback.current = window.setTimeout(() => {
                setTapStatus("idle");
                setTapMessage("Hold your card or watch near the reader");
            }, 3000);
        }

        async function submitScannedCredential(value: string) {
            const scannedValue = value.trim();

            if (!scannedValue) {
                return;
            }

            const staffMatch = staff.find((member) => member.id.toString() === scannedValue || member.fullName.toLowerCase() === scannedValue.toLowerCase());

            if (!staffMatch) {
                setTapStatus("error");
                setTapMessage("Card not recognised");
                clearFeedbackLater();
                return;
            }

            const session = await onTapCredential(scannedValue);

            if (session) {
                setTapStatus("success");
                setTapMessage(`${session.fullName} logged in`);
                clearFeedbackLater();
            } else {
                setTapStatus("error");
                setTapMessage("Card not recognised");
                clearFeedbackLater();
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            const now = Date.now();

            if (event.key === "Enter") {
                const scannedValue = scanBuffer.current;
                scanBuffer.current = "";
                void submitScannedCredential(scannedValue);
                return;
            }

            if (event.key.length !== 1) {
                return;
            }

            if (now - lastKeyAt.current > 100) {
                scanBuffer.current = "";
            }

            scanBuffer.current += event.key;
            lastKeyAt.current = now;
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if (resetTapFeedback.current) {
                window.clearTimeout(resetTapFeedback.current);
            }
        };
    }, [mode, onTapCredential, staff]);

    async function startNfcReader() {
        const nfcWindow = window as unknown as {
            NDEFReader?: new () => {
                scan: () => Promise<void>;
                onreading: ((event: { serialNumber?: string }) => void) | null;
            };
        };

        if (!nfcWindow.NDEFReader) {
            setTapStatus("error");
            setTapMessage("NFC unavailable. Use a USB card reader scan.");
            return;
        }

        try {
            const reader = new nfcWindow.NDEFReader();
            await reader.scan();
            setTapMessage("Reader active. Tap card or watch.");
            reader.onreading = (event) => {
                const credential = event.serialNumber ?? "";
                void onTapCredential(credential).then((session) => {
                    setTapStatus(session ? "success" : "error");
                    setTapMessage(session ? `${session.fullName} logged in` : "Card not recognised");
                });
            };
        } catch {
            setTapStatus("error");
            setTapMessage("Could not start NFC reader");
        }
    }

    return (
        <section className="pos-login-panel">
            <div className="pos-panel__header">
                <span>Waiter login</span>
                <h2>Unlock floor actions</h2>
                <p className="pos-panel__subline">Staff are loaded from the restaurant database.</p>
            </div>

            <div className="pos-login-tabs" role="tablist" aria-label="Login mode">
                <button type="button" className={mode === "pin" ? "is-active" : ""} onClick={() => setMode("pin")}>PIN</button>
                <button type="button" className={mode === "tap" ? "is-active" : ""} onClick={() => setMode("tap")}>Tap</button>
            </div>

            {isLoading && (
                <div className="pos-login-skeleton" aria-label="Loading staff">
                    <span />
                    <span />
                    <span />
                </div>
            )}

            {!isLoading && staffError && (
                <div className="pos-login-error">
                    <strong>Could not load staff</strong>
                    <span>{staffError}</span>
                    <button type="button" onClick={onRetryStaff}>Retry</button>
                </div>
            )}

            {!isLoading && !staffError && staff.length === 0 && (
                <div className="pos-login-error">
                    <strong>No active staff found</strong>
                    <span>Add active staff in the manager/admin staff setup before logging in.</span>
                    <button type="button" onClick={onRetryStaff}>Retry</button>
                </div>
            )}

            {mode === "pin" && !staffError && (
            <form className="pos-login-form" onSubmit={onSubmit}>
                <label className="pos-login-form__field">
                    <span>Waiter ID or PIN</span>
                    <input
                        value={credentialValue}
                        onChange={(event) => onChangeCredential(event.target.value)}
                        placeholder="W001 or PIN"
                        autoComplete="off"
                        required
                    />
                </label>

                <div className="pos-keypad">
                    {keypadValues.map((key) => (
                        <button
                            key={key}
                            type={key === "GO" ? "submit" : "button"}
                            className={key === "GO" ? "pos-keypad__key pos-keypad__key--go" : "pos-keypad__key"}
                            onClick={key === "GO" ? undefined : () => onKeypadPress(key)}
                        >
                            {key}
                        </button>
                    ))}
                </div>

                <Button type="submit" fullWidth isLoading={isSubmitting} disabled={staff.length === 0 || isLoading}>
                    <LogIn size={16} />
                    Login waiter
                </Button>
            </form>
            )}

            {mode === "tap" && !staffError && (
                <div className={`pos-tap-login pos-tap-login--${tapStatus}`}>
                    <div className="pos-nfc-orb">
                        <span />
                        <Wifi size={52} />
                    </div>
                    <strong>{tapMessage}</strong>
                    <small>USB card readers work here too: scan the staff card and press Enter.</small>
                    <button type="button" onClick={startNfcReader} disabled={staff.length === 0 || isLoading}>
                        Start NFC reader
                    </button>
                </div>
            )}
        </section>
    );
}

type PosWaiterActionPanelProps = {
    table: PosTableView | null;
    onAssignToMe: () => void;
    onResolveAssistance: () => void;
    onViewOrder: () => void;
    onAddToOrder: () => void;
    onSendOrder: () => void;
    onCloseBill: () => void;
};

export function PosWaiterActionPanel({
    table,
    onAssignToMe,
    onResolveAssistance,
    onViewOrder,
    onAddToOrder,
    onSendOrder,
    onCloseBill
}: PosWaiterActionPanelProps) {
    return (
        <section className="pos-waiter-panel">
            <div className="pos-waiter-panel__content">
                {!table && <PosEmptyTableState />}

                {table && (
                    <>
                    <div className="pos-panel__header">
                        <span>Selected table</span>
                        <h2>Table {table.table.number}</h2>
                        <p className="pos-panel__subline">
                            {formatStatus(table.serviceStatus)} | {table.guests || 0} guests
                        </p>
                    </div>

                    <div className="pos-assignment-card">
                        <span>Assigned waiter</span>
                        <strong>{table.assignedWaiter ? table.assignedWaiter.fullName : "Unassigned"}</strong>
                        <button type="button" onClick={onAssignToMe}>
                            <UserRound size={18} />
                            {table.assignedWaiter ? "Reassign to me" : "Assign to me"}
                        </button>
                    </div>

                    <PosReservationPanel table={table} />
                    </>
                )}
            </div>

            <div className="pos-waiter-actions">
                {table?.serviceStatus === "needsWaiter" && (
                <button type="button" onClick={onResolveAssistance}>
                    <Bell size={18} />
                    Resolve Assistance
                </button>
                )}
                <button type="button" onClick={onViewOrder} disabled={!table}>
                    <ClipboardList size={18} />
                    View Order
                </button>
                <button type="button" onClick={onAddToOrder} disabled={!table}>
                    <Plus size={18} />
                    Add to Order
                </button>
                <button
                    type="button"
                    onClick={onSendOrder}
                    disabled={!table || table.orderStatus !== "ready"}
                    title={table && table.orderStatus !== "ready" ? "Waiting for kitchen" : undefined}
                >
                    <Send size={18} />
                    Send Order
                </button>
                <button type="button" onClick={onCloseBill} disabled={!table}>
                    <CreditCard size={18} />
                    Close & Bill
                </button>
            </div>
        </section>
    );
}

type PosOrderModalProps = {
    isOpen: boolean;
    table: PosTableView | null;
    menus: AdminMenu[];
    menuItems: AdminMenuItem[];
    confirmation: string | null;
    isBillPreview: boolean;
    onClose: () => void;
    onAddItem: (item: AdminMenuItem) => void;
    onSendOrder: () => void;
    onSendToKitchen: () => void;
    onStartCloseBill: () => void;
    onConfirmCloseBill: () => void;
};

export function PosOrderModal({
    isOpen,
    table,
    menus,
    menuItems,
    confirmation,
    isBillPreview,
    onClose,
    onAddItem,
    onSendOrder,
    onSendToKitchen,
    onStartCloseBill,
    onConfirmCloseBill
}: PosOrderModalProps) {
    if (!isOpen || !table) {
        return null;
    }

    const groupedMenu = buildMenuGroups(menuItems, menus);
    const subtotal = table.orderLines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const hasMenuItems = groupedMenu.some((group) => group.items.length > 0);
    const sentLines = table.orderLines.filter((line) => line.orderItemId);
    const pendingLines = table.orderLines.filter((line) => !line.orderItemId);
    const groupedSentLines = groupOrderLines(sentLines);
    const groupedPendingLines = groupOrderLines(pendingLines);
    const hasPendingLines = pendingLines.length > 0;

    return (
        <div className="pos-order-modal-backdrop" role="presentation">
            <section className="pos-order-modal" role="dialog" aria-modal="true" aria-label={`Table ${table.table.number} order`}>
                <header className="pos-order-modal__header">
                    <div>
                        <span>{isBillPreview ? "Bill summary" : "Current order"}</span>
                        <h2>Table {table.table.number}</h2>
                        <p>{table.guests} guests | {formatSeatedTime(table.seatedMinutes)} seated</p>
                    </div>
                    <span className={`pos-order-status-pill pos-order-status-pill--${table.orderStatus}`}>
                        {formatOrderStatus(table.orderStatus)}
                    </span>
                    <button type="button" onClick={onClose} aria-label="Close order modal">
                        <X size={20} />
                    </button>
                </header>

                {confirmation && (
                    <div className="pos-modal-confirmation">
                        <CheckCircle2 size={18} />
                        {confirmation}
                    </div>
                )}

                <div className="pos-order-modal__body">
                    <section className="pos-order-list">
                        <h3>{isBillPreview ? "Bill items" : "Ordered items"}</h3>
                        {sentLines.length > 0 && (
                            <div className="pos-order-list__group">
                                <span>Ordered</span>
                                {groupedSentLines.map((line) => (
                                    <article key={line.key}>
                                        <div>
                                            <strong>{line.name}</strong>
                                            <small>Qty {line.quantity} x {money(line.price)}</small>
                                        </div>
                                        <span>{money(line.quantity * line.price)}</span>
                                    </article>
                                ))}
                            </div>
                        )}
                        {pendingLines.length > 0 && (
                            <div className="pos-order-list__group pos-order-list__group--pending">
                                <span>To send</span>
                                {groupedPendingLines.map((line) => (
                                    <article key={line.key}>
                                        <div>
                                            <strong>{line.name}</strong>
                                            <small>Qty {line.quantity} x {money(line.price)}</small>
                                        </div>
                                        <span>{money(line.quantity * line.price)}</span>
                                    </article>
                                ))}
                            </div>
                        )}
                        {table.orderLines.length === 0 && <p className="pos-panel__empty">No items yet.</p>}
                    </section>

                    {!isBillPreview && (
                        <section className="pos-modal-menu">
                            <h3>Add to order</h3>
                            {!hasMenuItems && <p className="pos-panel__empty">No menu items loaded for this restaurant.</p>}
                            {groupedMenu.filter((group) => group.items.length > 0).map((group) => (
                                <div key={group.category} className="pos-modal-menu__group">
                                    <h4>{group.category}</h4>
                                    <div className="pos-modal-menu__items">
                                        {group.items.map((item) => (
                                            <button key={`${group.category}-${item.id}`} type="button" onClick={() => onAddItem(item)}>
                                                <div className="pos-modal-menu__item-copy">
                                                    <span>{item.name}</span>
                                                    <small>{item.description?.trim() || "Ready to add to the order."}</small>
                                                </div>
                                                <div className="pos-modal-menu__item-meta">
                                                    <strong>{money(item.price)}</strong>
                                                    <b><Plus size={16} /></b>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}

                    {isBillPreview && (
                        <section className="pos-bill-summary">
                            <h3>Ready to close</h3>
                            <p>Total due</p>
                            <strong>{money(subtotal)}</strong>
                            <small>Confirming will clear this table, remove assignment, and mark it Available.</small>
                        </section>
                    )}
                </div>

                <footer className={isBillPreview ? "pos-order-modal__footer pos-order-modal__footer--bill-preview" : "pos-order-modal__footer pos-order-modal__footer--order"}>
                    <strong>Subtotal {money(subtotal)}</strong>
                    {!isBillPreview && (
                        <>
                            <button type="button" onClick={onSendToKitchen} disabled={!hasPendingLines}>
                                <Send size={18} />
                                Send to Kitchen
                            </button>
                            <button
                                type="button"
                                onClick={onSendOrder}
                                disabled={table.orderStatus !== "ready"}
                                title={table.orderStatus !== "ready" ? "Waiting for kitchen" : undefined}
                            >
                                <Send size={18} />
                                Deliver Order
                            </button>
                            <button type="button" onClick={onStartCloseBill}>
                                <CreditCard size={18} />
                                Close & Bill
                            </button>
                        </>
                    )}
                    {isBillPreview && (
                        <button type="button" onClick={onConfirmCloseBill}>
                            <CheckCircle2 size={18} />
                            Confirm Close
                        </button>
                    )}
                </footer>
            </section>
        </div>
    );
}

type PosToastStackProps = {
    isLoading: boolean;
    error: string | null;
    toast: string | null;
};

export function PosToastStack({ isLoading, error, toast }: PosToastStackProps) {
    return (
        <>
            {isLoading && <div className="pos-toast pos-toast--info">Loading POS floor...</div>}
            {error && <div className="pos-toast pos-toast--error">{error}</div>}
            {toast && <div className="pos-toast pos-toast--success">{toast}</div>}
        </>
    );
}

function PosEmptyTableState() {
    return (
        <div className="pos-empty-table-state">
            <span>Select a table</span>
        </div>
    );
}

function PosReservationPanel({ table }: { table: PosTableView }) {
    return (
        <section className="pos-reservation-panel">
            <div className="pos-reservation-panel__header">
                <span>Reservation</span>
            </div>

            {table.reservation ? (
                <div className="pos-reservation-card">
                    <strong>{table.reservation.guestName}</strong>
                    <span>{table.reservation.partySize} guests | {formatReservationTime(table.reservation.time)}</span>
                    <small>{table.reservation.notes || "No notes"}</small>
                </div>
            ) : (
                <p className="pos-panel__empty">No reservation for this table.</p>
            )}
        </section>
    );
}

function buildMenuGroups(menuItems: AdminMenuItem[], menus: AdminMenu[]) {
    const itemsByMenuId = menuItems.reduce<Map<number, AdminMenuItem[]>>((groups, item) => {
        const existing = groups.get(item.menuId) ?? [];
        existing.push(item);
        groups.set(item.menuId, existing);
        return groups;
    }, new Map());

    const groups = menus.map((menu) => ({
        category: menu.name.trim() || `Menu ${menu.id}`,
        items: itemsByMenuId.get(menu.id) ?? []
    }));

    const knownMenuIds = new Set(menus.map((menu) => menu.id));
    const uncategorizedItems = menuItems.filter((item) => !knownMenuIds.has(item.menuId));

    if (uncategorizedItems.length > 0) {
        groups.push({
            category: "Other menu items",
            items: uncategorizedItems
        });
    }

    return groups;
}

function groupOrderLines(lines: DraftLine[]) {
    return Array.from(lines.reduce<Map<string, DraftLine & { key: string }>>((groups, line) => {
        const key = `${line.menuItemId}:${line.name}:${line.price}`;
        const existing = groups.get(key);

        if (existing) {
            groups.set(key, {
                ...existing,
                quantity: existing.quantity + line.quantity
            });
        } else {
            groups.set(key, {
                ...line,
                key,
                quantity: line.quantity
            });
        }

        return groups;
    }, new Map()).values());
}

function formatNotificationType(type: PosNotification["type"]) {
    if (type === "assistance") {
        return "Assistance";
    }

    if (type === "bill") {
        return "Bill";
    }

    if (type === "orderDelivered") {
        return "Order delivered";
    }

    return "Table closed";
}

function formatStatus(status: PosTableServiceStatus) {
    const labels: Record<PosTableServiceStatus, string> = {
        available: "Available",
        occupied: "Occupied",
        needsWaiter: "Needs Waiter",
        billRequested: "Bill Requested",
        waiterOnTheWay: "Waiter on the way",
        billComing: "Bill coming",
        delivered: "Order Delivered",
        closed: "Closed"
    };

    return labels[status];
}

function formatOrderStatus(status: PosOrderStatus) {
    const labels: Record<PosOrderStatus, string> = {
        pending: "Pending",
        sentToKitchen: "Sent to Kitchen",
        ready: "Ready",
        completed: "Completed"
    };

    return labels[status];
}

function formatReservationTime(value: string) {
    if (!value) {
        return "TBD";
    }

    const [hours, minutes] = value.split(":").map(Number);
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);

    return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit"
    }).format(date);
}

function getReservationState(reservation: PosReservation | null) {
    if (!reservation?.time) {
        return null;
    }

    const [hours, minutes] = reservation.time.split(":").map(Number);
    const now = new Date();
    const reservationDate = new Date();
    reservationDate.setHours(hours || 0, minutes || 0, 0, 0);
    const minutesUntil = Math.round((reservationDate.getTime() - now.getTime()) / 60000);

    if (minutesUntil < 0) {
        return "late";
    }

    if (minutesUntil <= 60) {
        return "soon";
    }

    return "future";
}

function formatSeatedTime(minutes: number | null) {
    if (!minutes) {
        return "just now";
    }

    if (minutes < 60) {
        return `${minutes}m`;
    }

    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatNotificationTime(value: string) {
    return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit"
    }).format(new Date(value));
}
