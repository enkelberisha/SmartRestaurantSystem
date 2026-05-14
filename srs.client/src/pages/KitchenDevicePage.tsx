import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ChefHat, Clock3, Lock, LogOut, Printer, RefreshCw, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUserContext } from "@/context/useUserContext";
import { useTheme } from "@/hooks/useTheme";
import { getBrandLogo } from "@/lib/branding/brandLogo";
import { supabase } from "@/lib/supabase/client";
import {
    emptyKitchenDeviceData,
    getKitchenDeviceData,
    updateKitchenOrderStatus,
    type KitchenDeviceData
} from "@/features/kitchen/kitchenDeviceService";

type KitchenColumnStatus = "Pending" | "InProgress" | "Ready";
type KitchenTicketTone = "normal" | "warning" | "late";
type ReadyCountdownTone = "normal" | "warning" | "critical";
type KitchenNoteTone = "note" | "allergy";
const readyAutoCompleteMs = 5 * 60 * 1000;
type KitchenOrderEntry = {
    order: {
        id: number;
        status: KitchenColumnStatus;
        createdAt: string;
        tableId: number;
    };
    table: {
        number?: number | string;
    } | null;
    items: Array<{
        id: number;
        quantity: number;
        menuName: string;
        notes?: string | null;
    }>;
    notes: Array<{
        id: number;
        menuName: string;
        text: string;
    }>;
    minutes: number;
    tone: KitchenTicketTone;
};

const kitchenColumns: Array<{ title: string; status: KitchenColumnStatus }> = [
    { title: "Pending", status: "Pending" },
    { title: "Preparing", status: "InProgress" },
    { title: "Ready", status: "Ready" }
];

const allergyKeywords = [
    "allergy",
    "allergic",
    "allergen",
    "peanut",
    "nuts",
    "nut",
    "cashew",
    "almond",
    "hazelnut",
    "walnut",
    "gluten",
    "wheat",
    "celiac",
    "dairy",
    "milk",
    "egg",
    "shellfish",
    "shrimp",
    "fish",
    "soy",
    "sesame",
    "lactose"
];

function statusLabel(status: KitchenColumnStatus) {
    return status === "InProgress" ? "Preparing" : status;
}

function columnAccent(status: KitchenColumnStatus) {
    if (status === "Pending") {
        return "queue";
    }

    if (status === "InProgress") {
        return "cook";
    }

    return "pass";
}

function isKitchenColumnStatus(status: string): status is KitchenColumnStatus {
    return status === "Pending" || status === "InProgress" || status === "Ready";
}

function waitingMinutes(createdAt: string) {
    const createdAtDate = parseServerDate(createdAt);
    if (!createdAtDate) {
        return 0;
    }

    return Math.max(0, Math.floor((Date.now() - createdAtDate.getTime()) / 60000));
}

function waitingTone(minutes: number): KitchenTicketTone {
    if (minutes >= 20) {
        return "late";
    }

    if (minutes >= 10) {
        return "warning";
    }

    return "normal";
}

function createdLabel(value: string) {
    const parsed = parseServerDate(value);
    if (!parsed) {
        return "Unknown";
    }

    const now = new Date();
    const isSameDay =
        parsed.getFullYear() === now.getFullYear() &&
        parsed.getMonth() === now.getMonth() &&
        parsed.getDate() === now.getDate();

    if (isSameDay) {
        return parsed.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });
    }

    return parsed.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}

function lastUpdatedLabel(value: number) {
    return new Date(value).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
}

function parseServerDate(value: string) {
    const normalizedValue = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
    const parsed = new Date(normalizedValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatWaitingDuration(minutes: number) {
    if (minutes >= 1440) {
        const days = Math.floor(minutes / 1440);
        const hours = Math.floor((minutes % 1440) / 60);
        return `${days}d ${hours}h`;
    }

    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }

    return `${minutes} min`;
}

function getNextKitchenStatus(status: KitchenColumnStatus): "InProgress" | "Ready" | null {
    if (status === "Pending") {
        return "InProgress";
    }

    if (status === "InProgress") {
        return "Ready";
    }

    return null;
}

function canMoveToStatus(currentStatus: KitchenColumnStatus, targetStatus: KitchenColumnStatus) {
    return getNextKitchenStatus(currentStatus) === targetStatus;
}

function noteTone(notes: string[]): KitchenNoteTone {
    const combined = notes.join(" ").toLowerCase();
    return allergyKeywords.some(keyword => combined.includes(keyword)) ? "allergy" : "note";
}

function formatCountdown(msRemaining: number) {
    const safeMs = Math.max(0, msRemaining);
    const totalSeconds = Math.ceil(safeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function readyCountdownTone(msRemaining: number): ReadyCountdownTone {
    if (msRemaining <= 30_000) {
        return "critical";
    }

    if (msRemaining <= 120_000) {
        return "warning";
    }

    return "normal";
}

export function KitchenDevicePage() {
    const { profile, isLoading: profileLoading, logout } = useUserContext();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const brandLogo = getBrandLogo(theme);
    const [data, setData] = useState<KitchenDeviceData>(emptyKitchenDeviceData);
    const [completedItemsByOrder, setCompletedItemsByOrder] = useState<Record<number, number[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [lockPassword, setLockPassword] = useState("");
    const [showLockModal, setShowLockModal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(Date.now());
    const [draggedOrderId, setDraggedOrderId] = useState<number | null>(null);
    const [dragTargetStatus, setDragTargetStatus] = useState<KitchenColumnStatus | null>(null);
    const [readyStartedAtByOrder, setReadyStartedAtByOrder] = useState<Record<number, number>>({});
    const [dismissedReadyOrderIds, setDismissedReadyOrderIds] = useState<number[]>([]);
    const [allergyPopupOrderIds, setAllergyPopupOrderIds] = useState<number[]>([]);
    const [allergyAlertedOrderIds, setAllergyAlertedOrderIds] = useState<number[]>([]);
    const [now, setNow] = useState<number>(Date.now());

    const restaurantId = profile?.restaurantId ?? null;
    const localPart = profile?.email.split("@")[0] ?? "kitchen";
    const avatar = localPart
        .split(/[^a-zA-Z0-9]/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() ?? "")
        .join("") || "KT";

    const tableById = useMemo(() => new Map(data.tables.map(table => [table.id, table])), [data.tables]);
    const menuItemById = useMemo(() => new Map(data.menuItems.map(item => [item.id, item])), [data.menuItems]);

    const activeOrders = useMemo<KitchenOrderEntry[]>(() => data.orders
        .filter(order => isKitchenColumnStatus(order.status) && !(order.status === "Ready" && dismissedReadyOrderIds.includes(order.id)))
        .sort((left, right) => {
            const leftTime = parseServerDate(left.createdAt)?.getTime() ?? 0;
            const rightTime = parseServerDate(right.createdAt)?.getTime() ?? 0;
            return leftTime - rightTime;
        })
        .map(order => {
            const items = data.orderItems
                .filter(item => item.orderId === order.id)
                .map(item => ({
                    ...item,
                    menuName: menuItemById.get(item.menuItemId)?.name ?? `Menu item #${item.menuItemId}`
                }));
            const notes = items
                .filter(item => item.notes?.trim())
                .map(item => ({
                    id: item.id,
                    menuName: item.menuName,
                    text: item.notes!.trim()
                }));
            const minutes = waitingMinutes(order.createdAt);

            return {
                order: {
                    ...order,
                    status: order.status as KitchenColumnStatus
                },
                table: tableById.get(order.tableId) ?? null,
                items,
                notes,
                minutes,
                tone: waitingTone(minutes)
            };
        }), [data.orderItems, data.orders, dismissedReadyOrderIds, menuItemById, tableById]);

    const activeCounts = useMemo(() => ({
        pending: activeOrders.filter(entry => entry.order.status === "Pending").length,
        preparing: activeOrders.filter(entry => entry.order.status === "InProgress").length,
        ready: activeOrders.filter(entry => entry.order.status === "Ready").length
    }), [activeOrders]);

    function isItemCompleted(orderId: number, itemId: number) {
        return completedItemsByOrder[orderId]?.includes(itemId) ?? false;
    }

    function isOrderChecklistComplete(orderId: number, itemIds: number[]) {
        if (itemIds.length === 0) {
            return true;
        }

        return itemIds.every(itemId => isItemCompleted(orderId, itemId));
    }

    async function loadKitchenBoard(showLoader: boolean) {
        if (!restaurantId) {
            setIsLoading(false);
            setData(emptyKitchenDeviceData);
            return;
        }

        try {
            if (showLoader) {
                setIsLoading(true);
            } else {
                setIsRefreshing(true);
            }

            setError(null);
            const result = await getKitchenDeviceData(restaurantId);
            setData(result);
            setLastUpdatedAt(Date.now());
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load kitchen orders.");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }

    async function handleStatusUpdate(orderId: number, nextStatus: "InProgress" | "Ready" | "Completed") {
        try {
            setUpdatingOrderId(orderId);
            setError(null);
            await updateKitchenOrderStatus(orderId, nextStatus);
            if (nextStatus === "Ready") {
                setReadyStartedAtByOrder(current => ({
                    ...current,
                    [orderId]: current[orderId] ?? Date.now()
                }));
            } else {
                setDismissedReadyOrderIds(current => current.filter(id => id !== orderId));
                setCompletedItemsByOrder(current => {
                    const next = { ...current };
                    delete next[orderId];
                    return next;
                });

                setReadyStartedAtByOrder(current => {
                    const next = { ...current };
                    delete next[orderId];
                    return next;
                });
            }
            await loadKitchenBoard(false);
        } catch (updateError) {
            setError(updateError instanceof Error ? updateError.message : "Could not update order status.");
        } finally {
            setUpdatingOrderId(null);
        }
    }

    function toggleOrderItemCompleted(orderId: number, itemId: number) {
        const currentCompleted = completedItemsByOrder[orderId] ?? [];
        const nextItems = currentCompleted.includes(itemId)
            ? currentCompleted.filter(id => id !== itemId)
            : [...currentCompleted, itemId];

        setCompletedItemsByOrder(current => ({
            ...current,
            [orderId]: nextItems
        }));
    }

    async function confirmLogout(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!profile?.email) {
            setError("Could not verify this kitchen account.");
            return;
        }

        setIsSigningOut(true);
        setError(null);

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password: lockPassword
            });

            if (signInError) {
                setError("Incorrect account password. Session remains open.");
                return;
            }

            setShowLockModal(false);
            setLockPassword("");
            await logout();
            navigate("/login", { replace: true });
        } finally {
            setIsSigningOut(false);
        }
    }

    async function moveOrderToStatus(entry: KitchenOrderEntry, nextStatus: KitchenColumnStatus, checklistCompleteOverride?: boolean) {
        if (!canMoveToStatus(entry.order.status, nextStatus)) {
            if (entry.order.status === "Ready") {
                setError("Ready orders cannot be moved to another section.");
            } else if (entry.order.status === "Pending") {
                setError("Pending orders can only move to Preparing.");
            } else {
                setError("Preparing orders can only move to Ready.");
            }
            return;
        }

        const allowedNextStatus = getNextKitchenStatus(entry.order.status);
        if (!allowedNextStatus) {
            setError("Ready orders cannot be moved to another section.");
            return;
        }

        if (updatingOrderId === entry.order.id) {
            return;
        }

        const isChecklistComplete = checklistCompleteOverride ?? isOrderChecklistComplete(entry.order.id, entry.items.map(item => item.id));
        if (nextStatus === "Ready" && !isChecklistComplete) {
            setError("Finish the checklist before moving an order to Ready.");
            return;
        }

        await handleStatusUpdate(entry.order.id, allowedNextStatus);
    }

    function handleDragStart(entry: KitchenOrderEntry) {
        setDraggedOrderId(entry.order.id);
        setError(null);
    }

    function handleDragEnd() {
        setDraggedOrderId(null);
        setDragTargetStatus(null);
    }

    async function handleDropOnColumn(targetStatus: KitchenColumnStatus) {
        if (draggedOrderId === null) {
            setDragTargetStatus(null);
            return;
        }

        const entry = activeOrders.find(orderEntry => orderEntry.order.id === draggedOrderId);
        setDragTargetStatus(null);
        setDraggedOrderId(null);

        if (!entry) {
            return;
        }

        await moveOrderToStatus(entry, targetStatus);
    }

    function handlePrintOrder(entry: KitchenOrderEntry) {
        const printWindow = window.open("", "_blank", "width=420,height=720");

        if (!printWindow) {
            setError("Could not open the print window. Please allow pop-ups for this page.");
            return;
        }

        const itemsMarkup = entry.items.length > 0
            ? entry.items.map(item => `
                <li>
                    <div class="receipt-line">
                        <strong>${item.quantity}x</strong>
                        <span>${item.menuName}</span>
                    </div>
                    ${item.notes?.trim() ? `<div class="receipt-note">Note: ${item.notes.trim()}</div>` : ""}
                </li>
            `).join("")
            : "<li>No order items found.</li>";

        const receiptMarkup = `
            <!doctype html>
            <html lang="en">
                <head>
                    <meta charset="utf-8" />
                    <title>Kitchen Receipt #${entry.order.id}</title>
                    <style>
                        body {
                            margin: 0;
                            padding: 24px;
                            background: #ffffff;
                            color: #11131c;
                            font-family: Arial, sans-serif;
                        }

                        .receipt {
                            max-width: 320px;
                            margin: 0 auto;
                            display: grid;
                            gap: 16px;
                        }

                        .receipt-header {
                            border-bottom: 2px dashed #cfd4e2;
                            padding-bottom: 12px;
                        }

                        h1, h2, p {
                            margin: 0;
                        }

                        h1 {
                            font-size: 22px;
                            margin-bottom: 6px;
                        }

                        .receipt-subtle {
                            color: #5f667a;
                            font-size: 13px;
                        }

                        .receipt-meta {
                            display: grid;
                            gap: 6px;
                            font-size: 14px;
                        }

                        ul {
                            list-style: none;
                            padding: 0;
                            margin: 0;
                            display: grid;
                            gap: 12px;
                        }

                        li {
                            padding-bottom: 12px;
                            border-bottom: 1px solid #e5e8f0;
                        }

                        .receipt-line {
                            display: flex;
                            gap: 10px;
                            align-items: baseline;
                        }

                        .receipt-note {
                            margin-top: 6px;
                            color: #5f667a;
                            font-size: 13px;
                        }

                        .receipt-footer {
                            border-top: 2px dashed #cfd4e2;
                            padding-top: 12px;
                            font-size: 13px;
                            color: #5f667a;
                        }
                    </style>
                </head>
                <body>
                    <main class="receipt">
                        <header class="receipt-header">
                            <p class="receipt-subtle">Kitchen Receipt</p>
                            <h1>Order #${entry.order.id}</h1>
                            <p class="receipt-subtle">Table ${entry.table?.number ?? entry.order.tableId}</p>
                        </header>

                        <section class="receipt-meta">
                            <p><strong>Status:</strong> ${statusLabel(entry.order.status)}</p>
                            <p><strong>Created:</strong> ${createdLabel(entry.order.createdAt)}</p>
                            <p><strong>Waiting:</strong> ${formatWaitingDuration(entry.minutes)}</p>
                        </section>

                        <section>
                            <h2>Items</h2>
                            <ul>${itemsMarkup}</ul>
                        </section>

                        <footer class="receipt-footer">
                            Printed from Kitchen Device
                        </footer>
                    </main>
                    <script>
                        window.onload = function () {
                            window.print();
                        };
                    </script>
                </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(receiptMarkup);
        printWindow.document.close();
    }

    function handleKeepReadyOrder(orderId: number) {
        setReadyStartedAtByOrder(current => ({
            ...current,
            [orderId]: Date.now()
        }));
    }

    function handleClearReadyOrder(orderId: number) {
        setDismissedReadyOrderIds(current => (current.includes(orderId) ? current : [...current, orderId]));
        setReadyStartedAtByOrder(current => {
            const next = { ...current };
            delete next[orderId];
            return next;
        });
    }

    function dismissAllergyPopup(orderId: number) {
        setAllergyPopupOrderIds(current => current.filter(id => id !== orderId));
    }

    useEffect(() => {
        void loadKitchenBoard(true);
    }, [restaurantId]);

    useEffect(() => {
        if (!restaurantId) {
            return;
        }

        const timer = window.setInterval(() => {
            void loadKitchenBoard(false);
        }, 5000);

        return () => window.clearInterval(timer);
    }, [restaurantId]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const activeOrderItemIds = new Map(activeOrders.map(entry => [entry.order.id, new Set(entry.items.map(item => item.id))]));

        setCompletedItemsByOrder(current => {
            const next: Record<number, number[]> = {};

            for (const [orderIdText, completedIds] of Object.entries(current)) {
                const orderId = Number(orderIdText);
                const validItemIds = activeOrderItemIds.get(orderId);

                if (!validItemIds) {
                    continue;
                }

                const remainingCompletedIds = completedIds.filter(itemId => validItemIds.has(itemId));
                next[orderId] = remainingCompletedIds;
            }

            return next;
        });
    }, [activeOrders]);

    useEffect(() => {
        setReadyStartedAtByOrder(current => {
            const next: Record<number, number> = {};

            for (const entry of activeOrders) {
                if (entry.order.status === "Ready") {
                    next[entry.order.id] = current[entry.order.id] ?? Date.now();
                }
            }

            return next;
        });

    }, [activeOrders, data.orders]);

    useEffect(() => {
        const allergyOrders = activeOrders.filter(entry => noteTone(entry.notes.map(note => note.text)) === "allergy");

        if (allergyOrders.length === 0) {
            return;
        }

        const newPopupOrderIds = allergyOrders
            .map(entry => entry.order.id)
            .filter(orderId => !allergyAlertedOrderIds.includes(orderId));

        if (newPopupOrderIds.length === 0) {
            return;
        }

        setAllergyPopupOrderIds(current => [...current, ...newPopupOrderIds.filter(orderId => !current.includes(orderId))]);
        setAllergyAlertedOrderIds(current => [...current, ...newPopupOrderIds.filter(orderId => !current.includes(orderId))]);
    }, [activeOrders, allergyAlertedOrderIds]);

    useEffect(() => {
        if (updatingOrderId !== null) {
            return;
        }

        const expiredReadyOrder = activeOrders.find(entry => {
            if (entry.order.status !== "Ready") {
                return false;
            }

            const readyStartedAt = readyStartedAtByOrder[entry.order.id];
            return readyStartedAt !== undefined && now - readyStartedAt >= readyAutoCompleteMs;
        });

        if (!expiredReadyOrder) {
            return;
        }

        setDismissedReadyOrderIds(current => current.includes(expiredReadyOrder.order.id)
            ? current
            : [...current, expiredReadyOrder.order.id]);
        setReadyStartedAtByOrder(current => {
            const next = { ...current };
            delete next[expiredReadyOrder.order.id];
            return next;
        });
    }, [activeOrders, now, readyStartedAtByOrder, updatingOrderId]);

    if (profileLoading || isLoading) {
        return (
            <main className="kitchen-device">
                <section className="kitchen-device__loading">
                    <ChefHat size={36} />
                    <p>Loading kitchen board...</p>
                </section>
            </main>
        );
    }

    if (!restaurantId) {
        return (
            <main className="kitchen-device">
                <section className="kitchen-device__loading">
                    <ChefHat size={36} />
                    <p>No restaurant is assigned to this device account.</p>
                </section>
            </main>
        );
    }

    return (
        <main className="kitchen-device">
            <section className="kitchen-device__header">
                <div className="kitchen-device__toolbar">
                    <div className="kitchen-device__brand">
                        <img className="brand-mark__image brand-mark__image--sidebar" src={brandLogo} alt="Smart Restaurant System" />
                    </div>
                    <div className="kitchen-device__summary" aria-label="Kitchen order summary">
                        <span className="kitchen-device__summary-pill">Pending {activeCounts.pending}</span>
                        <span className="kitchen-device__summary-pill">Preparing {activeCounts.preparing}</span>
                        <span className="kitchen-device__summary-pill">Ready {activeCounts.ready}</span>
                    </div>
                </div>
                <div className="kitchen-device__header-actions">
                    <p className="kitchen-device__refresh-note">
                        Auto-refresh every 5s. Last update {lastUpdatedLabel(lastUpdatedAt)}.
                    </p>
                    <div className="kitchen-device__toolbar-actions">
                        <ThemeToggle theme={theme} onToggle={toggleTheme} />
                        <Button variant="secondary" onClick={() => void loadKitchenBoard(false)}>
                            <RefreshCw size={16} />
                            {isRefreshing ? "Refreshing..." : "Refresh"}
                        </Button>
                        <button className="sa-avatar kitchen-device__account" disabled={isSigningOut} onClick={() => setShowLockModal(true)} type="button">
                            <span>{avatar}</span>
                            <div className="sa-avatar__meta">
                                <strong>{localPart}</strong>
                                <small>{isSigningOut ? "Signing out..." : "KitchenDevice"}</small>
                            </div>
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </section>

            {error && <p className="kitchen-device__error">{error}</p>}

            {allergyPopupOrderIds.length > 0 && (
                <section className="kitchen-device__popup-stack" aria-live="assertive" aria-label="Allergy note alerts">
                    {allergyPopupOrderIds.map(orderId => {
                        const entry = activeOrders.find(orderEntry => orderEntry.order.id === orderId);
                        if (!entry) {
                            return null;
                        }

                        const allergyNotes = entry.notes.filter(note => noteTone([note.text]) === "allergy");

                        return (
                            <article key={`countdown-popup-${orderId}`} className="kitchen-device__popup">
                                <div>
                                    <strong>Allergy alert on Order #{entry.order.id}</strong>
                                    <p>
                                        Table {entry.table?.number ?? entry.order.tableId}
                                        {allergyNotes.length > 0 ? `: ${allergyNotes[0].menuName} - ${allergyNotes[0].text}` : "."}
                                    </p>
                                </div>
                                <button type="button" onClick={() => dismissAllergyPopup(orderId)}>
                                    Dismiss
                                </button>
                            </article>
                        );
                    })}
                </section>
            )}

            <section className="kitchen-device__board">
                {kitchenColumns.map(column => {
                    const orders = activeOrders.filter(entry => entry.order.status === column.status);

                    return (
                        <article key={column.status} className={`kitchen-device__column kitchen-device__column--${columnAccent(column.status)}`}>
                            <header className="kitchen-device__column-header">
                                <div>
                                    <h2>{column.title}</h2>
                                    <p>{orders.length} orders</p>
                                </div>
                                <span className={`kitchen-device__column-count kitchen-device__column-count--${columnAccent(column.status)}`}>
                                    {orders.length}
                                </span>
                            </header>

                            <div
                                className={dragTargetStatus === column.status ? "kitchen-device__tickets kitchen-device__tickets--drop-target" : "kitchen-device__tickets"}
                                onDragOver={(event) => {
                                    const entry = draggedOrderId === null
                                        ? null
                                        : activeOrders.find(orderEntry => orderEntry.order.id === draggedOrderId);

                                    if (!entry || !canMoveToStatus(entry.order.status, column.status)) {
                                        return;
                                    }

                                    event.preventDefault();
                                    setDragTargetStatus(column.status);
                                }}
                                onDragEnter={(event) => {
                                    const entry = draggedOrderId === null
                                        ? null
                                        : activeOrders.find(orderEntry => orderEntry.order.id === draggedOrderId);

                                    if (!entry || !canMoveToStatus(entry.order.status, column.status)) {
                                        return;
                                    }

                                    event.preventDefault();
                                    setDragTargetStatus(column.status);
                                }}
                                onDragLeave={(event) => {
                                    const nextTarget = event.relatedTarget;
                                    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                                        setDragTargetStatus(current => current === column.status ? null : current);
                                    }
                                }}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    void handleDropOnColumn(column.status);
                                }}
                            >
                                {orders.map(entry => {
                                    const isChecklistComplete = isOrderChecklistComplete(entry.order.id, entry.items.map(item => item.id));
                                    const readyMsRemaining = entry.order.status === "Ready"
                                        ? readyAutoCompleteMs - (now - (readyStartedAtByOrder[entry.order.id] ?? now))
                                        : null;
                                    const readyCountdown = readyMsRemaining === null ? null : formatCountdown(readyMsRemaining);
                                    const readyTone = readyMsRemaining === null ? null : readyCountdownTone(readyMsRemaining);
                                    const highlightedNoteTone = entry.notes.length > 0 ? noteTone(entry.notes.map(note => note.text)) : null;

                                    return (
                                        <article
                                            key={entry.order.id}
                                            draggable={getNextKitchenStatus(entry.order.status) !== null}
                                            onDragStart={() => handleDragStart(entry)}
                                            onDragEnd={handleDragEnd}
                                            className={
                                                draggedOrderId === entry.order.id
                                                    ? `kitchen-ticket kitchen-ticket--${entry.tone} kitchen-ticket--dragging${readyTone ? ` kitchen-ticket--ready-${readyTone}` : ""}${highlightedNoteTone ? ` kitchen-ticket--${highlightedNoteTone}` : ""}`
                                                    : `kitchen-ticket kitchen-ticket--${entry.tone}${readyTone ? ` kitchen-ticket--ready-${readyTone}` : ""}${highlightedNoteTone ? ` kitchen-ticket--${highlightedNoteTone}` : ""}`
                                            }
                                        >
                                            {entry.notes.length > 0 && (
                                                <div className={highlightedNoteTone === "allergy" ? "kitchen-ticket__notice kitchen-ticket__notice--allergy" : "kitchen-ticket__notice kitchen-ticket__notice--note"}>
                                                    <strong>{highlightedNoteTone === "allergy" ? "Allergy Alert" : "Special Instructions"}</strong>
                                                    <ul>
                                                        {entry.notes.map(note => (
                                                            <li key={`notice-${note.id}`}>
                                                                <span>{note.menuName}:</span> {note.text}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            <div className="kitchen-ticket__top">
                                                <div>
                                                    <strong>Order #{entry.order.id}</strong>
                                                    <span>Table {entry.table?.number ?? entry.order.tableId}</span>
                                                </div>
                                                <span className={`kitchen-ticket__status kitchen-ticket__status--${entry.order.status.toLowerCase()}`}>
                                                    {statusLabel(entry.order.status as KitchenColumnStatus)}
                                                </span>
                                            </div>

                                            <div className="kitchen-ticket__meta">
                                                <span>Created: {createdLabel(entry.order.createdAt)}</span>
                                                <span>Status: {statusLabel(entry.order.status)}</span>
                                                <span className={`kitchen-ticket__wait kitchen-ticket__wait--${entry.tone}`}>
                                                    <Clock3 size={14} />
                                                    Waiting: {formatWaitingDuration(entry.minutes)}
                                                </span>
                                                {entry.order.status === "InProgress" && (
                                                    <span>{completedItemsByOrder[entry.order.id]?.length ?? 0}/{entry.items.length} done</span>
                                                )}
                                                {entry.order.status === "Ready" && readyCountdown && (
                                                    <span className={`kitchen-ticket__countdown kitchen-ticket__countdown--${readyTone}`}>
                                                        Auto clear in {readyCountdown}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="kitchen-ticket__section">
                                                <p>Items</p>
                                                <ul className="kitchen-ticket__items">
                                                    {entry.items.map(item => {
                                                        const isCompleted = isItemCompleted(entry.order.id, item.id);

                                                        return (
                                                            <li key={item.id} className={isCompleted ? "kitchen-ticket__item kitchen-ticket__item--done" : "kitchen-ticket__item"}>
                                                                {entry.order.status === "InProgress" ? (
                                                                    <label className="kitchen-ticket__item-check">
                                                                        <span className="kitchen-ticket__item-copy">
                                                                            <strong>{item.quantity}x</strong> {item.menuName}
                                                                        </span>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isCompleted}
                                                                            onChange={() => toggleOrderItemCompleted(entry.order.id, item.id)}
                                                                        />
                                                                    </label>
                                                                ) : (
                                                                    <span className="kitchen-ticket__item-copy">
                                                                        <strong>{item.quantity}x</strong> {item.menuName}
                                                                    </span>
                                                                )}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>

                                            {entry.items.length === 0 && (
                                                <div className="kitchen-ticket__section">
                                                    <p>Items</p>
                                                    <ul>
                                                        <li>No order items found.</li>
                                                    </ul>
                                                </div>
                                            )}

                                            {entry.order.status === "Pending" && (
                                                <Button
                                                    fullWidth
                                                    isLoading={updatingOrderId === entry.order.id}
                                                    onClick={() => void moveOrderToStatus(entry, "InProgress")}
                                                >
                                                    Start Preparing
                                                </Button>
                                            )}

                                            {entry.order.status === "InProgress" && (
                                                <Button
                                                    fullWidth
                                                    disabled={!isChecklistComplete}
                                                    isLoading={updatingOrderId === entry.order.id}
                                                    onClick={() => void moveOrderToStatus(entry, "Ready")}
                                                >
                                                    Mark as Ready
                                                </Button>
                                            )}

                                            {entry.order.status === "Ready" && (
                                                <div className="kitchen-ticket__ready-actions">
                                                    <button className="kitchen-ticket__keep" onClick={() => handleKeepReadyOrder(entry.order.id)} type="button">
                                                        Keep
                                                    </button>
                                                    <button className="kitchen-ticket__clear" onClick={() => handleClearReadyOrder(entry.order.id)} type="button">
                                                        Delete
                                                    </button>
                                                    <button className="kitchen-ticket__print" onClick={() => handlePrintOrder(entry)} type="button">
                                                        <Printer size={15} />
                                                        Print Receipt
                                                    </button>
                                                </div>
                                            )}
                                        </article>
                                    );
                                })}

                                {orders.length === 0 && <p className="kitchen-device__empty">No {statusLabel(column.status)} orders.</p>}
                            </div>
                        </article>
                    );
                })}
            </section>

            {showLockModal && (
                <div className="pos-modal-backdrop" role="presentation">
                    <form className="pos-modal pos-lock-modal" aria-modal="true" onSubmit={confirmLogout} role="dialog">
                        <button className="pos-modal__close" onClick={() => setShowLockModal(false)} type="button">
                            <X size={20} />
                        </button>
                        <p>Security Check</p>
                        <h2>Confirm Kitchen Logout</h2>
                        <label>
                            Kitchen account password
                            <input
                                autoFocus
                                autoComplete="current-password"
                                onChange={(event) => setLockPassword(event.target.value)}
                                type="password"
                                value={lockPassword}
                            />
                        </label>
                        <button className="pos-primary-button" disabled={isSigningOut} type="submit">
                            <Lock size={18} />
                            {isSigningOut ? "Signing Out..." : "Log Out Kitchen Device"}
                        </button>
                    </form>
                </div>
            )}
        </main>
    );
}
