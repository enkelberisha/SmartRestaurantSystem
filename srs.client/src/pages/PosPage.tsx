import { useEffect, useMemo, useState } from "react";
import { getAdminRestaurantTables, updateTableServiceRequest, type AdminMenuItem, type AdminTable } from "@/lib/admin/adminService";
import { useUserContext } from "@/context/useUserContext";
import {
    PosFloorGrid,
    PosFloorToolbar,
    PosLoginPanel,
    PosOrderModal,
    PosToastStack,
    PosUnifiedTopBar,
    PosWaiterActionPanel
} from "@/features/pos/components";
import type { PosTableView } from "@/features/pos/components";
import { loadPosFloorData } from "@/features/pos/service";
import type {
    DraftLine,
    PosAssignedWaiter,
    PosFloorFilter,
    PosFloorStats,
    PosNotification,
    PosNotificationType,
    PosOrderStatus,
    PosReservation,
    PosTableServiceStatus,
    PosWaiterSession
} from "@/features/pos/types";

type TableRuntimeState = {
    serviceStatus: PosTableServiceStatus;
    guests: number;
    seatedAt: string | null;
    orderLines: DraftLine[];
    assignedWaiter: PosAssignedWaiter | null;
    orderStatus: PosOrderStatus;
    reservation: PosReservation | null;
    orderSentAt: string | null;
    billTotal: number | null;
    tableNote: string | null;
};

type DemoWaiter = {
    staffId: number;
    code: string;
    pin: string;
    fullName: string;
};

const demoWaiters: DemoWaiter[] = [
    { staffId: -101, code: "W001", pin: "1001", fullName: "Alex" },
    { staffId: -102, code: "W002", pin: "2002", fullName: "Sara" },
    { staffId: -103, code: "W003", pin: "3003", fullName: "James" }
];

const cleanRuntimeState: TableRuntimeState = {
    serviceStatus: "available",
    guests: 0,
    seatedAt: null,
    orderLines: [],
    assignedWaiter: null,
    orderStatus: "pending",
    reservation: null,
    orderSentAt: null,
    billTotal: null,
    tableNote: null
};

export function PosPage() {
    const { profile } = useUserContext();
    const [credentialValue, setCredentialValue] = useState("");
    const [session, setSession] = useState<PosWaiterSession | null>(null);
    const [tables, setTables] = useState<AdminTable[]>([]);
    const [menuItems, setMenuItems] = useState<AdminMenuItem[]>([]);
    const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
    const [floorFilter, setFloorFilter] = useState<PosFloorFilter>("all");
    const [runtimeByTableId, setRuntimeByTableId] = useState<Record<number, TableRuntimeState>>({});
    const [notifications, setNotifications] = useState<PosNotification[]>([]);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [billPreviewTableId, setBillPreviewTableId] = useState<number | null>(null);
    const [modalConfirmation, setModalConfirmation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const restaurantId = profile?.restaurantId ?? 0;

    useEffect(() => {
        if (!profile?.restaurantId) {
            setTables([]);
            setRuntimeByTableId({});
            setSelectedTableId(null);
            setIsLoading(false);
            return;
        }

        let isMounted = true;
        const activeRestaurantId = profile.restaurantId;

        async function load() {
            try {
                setIsLoading(true);
                setError(null);
                const nextData = await loadPosFloorData(activeRestaurantId);
                const floorTables = buildOverviewTables(nextData.tables, activeRestaurantId);

                if (!isMounted) {
                    return;
                }

                setTables(floorTables);
                setMenuItems(nextData.menuItems);
                setRuntimeByTableId(buildRuntimeByTable(floorTables));
                setNotifications(buildNotificationsFromTables(floorTables));
                setSelectedTableId(null);
            } catch (loadError) {
                if (isMounted) {
                    setTables([]);
                    setRuntimeByTableId({});
                    setSelectedTableId(null);
                    setError(loadError instanceof Error ? loadError.message : "Failed to load POS floor.");
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
    }, [profile?.restaurantId, restaurantId]);

    useEffect(() => {
        if (!profile?.restaurantId) {
            return;
        }

        const activeRestaurantId = profile.restaurantId;
        let isMounted = true;

        async function refreshTableRequests() {
            try {
                const latestTables = buildOverviewTables(await getAdminRestaurantTables(activeRestaurantId), activeRestaurantId);

                if (!isMounted) {
                    return;
                }

                setTables(latestTables);
                setRuntimeByTableId((current) => mergeRuntimeWithTableRequests(current, latestTables));
                setNotifications((current) => mergeNotificationsWithTableRequests(current, latestTables));
            } catch {
                // Keep the POS usable if a background refresh misses once.
            }
        }

        const refreshId = window.setInterval(() => {
            void refreshTableRequests();
        }, 5000);

        return () => {
            isMounted = false;
            window.clearInterval(refreshId);
        };
    }, [profile?.restaurantId]);

    const tableViews = useMemo(
        () => tables.map((table) => buildTableView(table, runtimeByTableId[table.id] ?? cleanRuntimeState)),
        [runtimeByTableId, tables]
    );

    const filteredTables = useMemo(() => {
        if (floorFilter === "all") {
            return tableViews;
        }

        if (floorFilter === "reserved") {
            return tableViews.filter((tableView) => tableView.reservation);
        }

        return tableViews.filter((tableView) => tableView.serviceStatus === floorFilter);
    }, [floorFilter, tableViews]);

    const selectedTable = useMemo(() => {
        if (selectedTableId === null) {
            return tableViews[0] ?? null;
        }

        return tableViews.find((tableView) => tableView.table.id === selectedTableId) ?? null;
    }, [selectedTableId, tableViews]);

    const floorStats = useMemo((): PosFloorStats => ({
        total: tableViews.length,
        occupied: tableViews.filter((tableView) => tableView.serviceStatus !== "available").length,
        available: tableViews.filter((tableView) => tableView.serviceStatus === "available").length,
        needsWaiter: tableViews.filter((tableView) => tableView.serviceStatus === "needsWaiter").length,
        billRequested: tableViews.filter((tableView) => tableView.serviceStatus === "billRequested").length
    }), [tableViews]);

    const unreadCount = notifications.filter((notification) => notification.status === "pending").length;

    useEffect(() => {
        if (!toast) {
            return;
        }

        const timeoutId = window.setTimeout(() => setToast(null), 4000);
        return () => window.clearTimeout(timeoutId);
    }, [toast]);

    function appendCredential(nextValue: string) {
        setCredentialValue((current) => `${current}${nextValue}`.slice(0, 12));
    }

    function handleKeypadPress(key: string) {
        if (key === "CLR") {
            setCredentialValue("");
            return;
        }

        if (key !== "GO") {
            appendCredential(key);
        }
    }

    function handleLogin(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const normalizedCredential = credentialValue.trim().toUpperCase();
        const waiter = demoWaiters.find((item) => item.code === normalizedCredential || item.pin === credentialValue.trim());

        if (!waiter) {
            setError("Use waiter W001 / PIN 1001, W002 / PIN 2002, or W003 / PIN 3003.");
            return;
        }

        setSession({
            staffId: waiter.staffId,
            fullName: waiter.fullName,
            restaurantId,
            tenantId: profile?.tenantId ?? "pos-demo",
            sessionId: Date.now(),
            openedAt: new Date().toISOString()
        });
        setCredentialValue("");
        setError(null);
        setToast(`${waiter.fullName} is active on this POS.`);
    }

    function handleSelectTable(tableId: number) {
        setSelectedTableId(tableId);
        setBillPreviewTableId(null);
        setModalConfirmation(null);
        setIsOrderModalOpen(true);
    }

    function updateTable(tableId: number, updater: (current: TableRuntimeState) => TableRuntimeState) {
        setRuntimeByTableId((current) => {
            const existing = current[tableId] ?? cleanRuntimeState;

            return {
                ...current,
                [tableId]: updater(existing)
            };
        });
    }

    function updateSelectedTable(updater: (current: TableRuntimeState) => TableRuntimeState) {
        if (!selectedTable) {
            return;
        }

        updateTable(selectedTable.table.id, updater);
    }

    function handleAssignToMe() {
        if (!selectedTable || !session) {
            return;
        }

        updateSelectedTable((current) => ({
            ...current,
            assignedWaiter: {
                staffId: session.staffId,
                fullName: session.fullName,
                initials: buildInitials(session.fullName)
            }
        }));
        setToast(`Table ${selectedTable.table.number} assigned to ${session.fullName}.`);
    }

    function fireNotification(type: PosNotificationType) {
        if (!selectedTable) {
            return;
        }

        const nextStatus: PosTableServiceStatus = type === "assistance" ? "needsWaiter" : "billRequested";
        const guests = selectedTable.guests || Math.min(selectedTable.table.capacity, 2);

        updateSelectedTable((current) => ({
            ...current,
            serviceStatus: nextStatus,
            guests,
            seatedAt: current.seatedAt ?? new Date().toISOString(),
            tableNote: type === "assistance" ? "Needs assistance" : "Bill requested"
        }));

        setNotifications((current) => [{
            id: Date.now(),
            tableId: selectedTable.table.id,
            tableNumber: selectedTable.table.number,
            type,
            timestamp: new Date().toISOString(),
            status: "pending",
            acceptedBy: null
        }, ...current]);
        if (selectedTable.table.id > 0) {
            void updateTableServiceRequest(selectedTable.table.id, {
                needsAssistance: type === "assistance" ? true : undefined,
                requestBill: type === "bill" ? true : undefined
            });
        }
        setToast(`Table ${selectedTable.table.number} ${type === "assistance" ? "needs assistance" : "requested the bill"}.`);
    }

    function handleAcceptNotification(notificationId: number) {
        if (!session) {
            return;
        }

        const notification = notifications.find((item) => item.id === notificationId);
        if (!notification || notification.status !== "pending") {
            return;
        }

        setNotifications((current) => current.map((item) => item.id === notificationId ? {
            ...item,
            status: "accepted",
            acceptedBy: session.fullName
        } : item));

        if (notification.tableId > 0) {
            void updateTableServiceRequest(notification.tableId, {
                needsAssistance: notification.type === "assistance" ? false : undefined,
                requestBill: notification.type === "bill" ? false : undefined
            });
        }

        updateTable(notification.tableId, (current) => ({
            ...current,
            serviceStatus: notification.type === "bill" ? "billComing" : "waiterOnTheWay",
            assignedWaiter: current.assignedWaiter ?? {
                staffId: session.staffId,
                fullName: session.fullName,
                initials: buildInitials(session.fullName)
            },
            tableNote: notification.type === "bill" ? "Bill coming" : "Waiter on the way"
        }));
    }

    function handleAddItem(item: AdminMenuItem) {
        if (!selectedTable) {
            return;
        }

        updateSelectedTable((current) => {
            const existingLine = current.orderLines.find((line) => line.menuItemId === item.id);
            const nextLines = existingLine
                ? current.orderLines.map((line) => line.menuItemId === item.id ? { ...line, quantity: line.quantity + 1 } : line)
                : [...current.orderLines, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];

            return {
                ...current,
                serviceStatus: current.serviceStatus === "available" ? "occupied" : current.serviceStatus,
                guests: current.guests || Math.min(selectedTable.table.capacity, 2),
                seatedAt: current.seatedAt ?? new Date().toISOString(),
                orderLines: nextLines,
                orderStatus: "pending",
                billTotal: null
            };
        });
        setBillPreviewTableId(null);
        setModalConfirmation(null);
    }

    function handleSendOrder() {
        if (!selectedTable || selectedTable.orderStatus !== "ready" || !session) {
            return;
        }

        updateSelectedTable((current) => ({
            ...current,
            serviceStatus: "delivered",
            guests: current.guests || Math.min(selectedTable.table.capacity, 2),
            seatedAt: current.seatedAt ?? new Date().toISOString(),
            orderStatus: "delivered",
            tableNote: "Order Delivered"
        }));
        setNotifications((current) => [{
            id: Date.now(),
            tableId: selectedTable.table.id,
            tableNumber: selectedTable.table.number,
            type: "orderDelivered",
            timestamp: new Date().toISOString(),
            status: "accepted",
            acceptedBy: session.fullName
        }, ...current]);
        setModalConfirmation("Order delivered");
        setToast(`Table ${selectedTable.table.number} order delivered by ${session.fullName}.`);
    }

    function handleSendToKitchen() {
        if (!selectedTable) {
            return;
        }

        updateSelectedTable((current) => ({
            ...current,
            serviceStatus: current.serviceStatus === "available" ? "occupied" : current.serviceStatus,
            guests: current.guests || Math.min(selectedTable.table.capacity, 2),
            seatedAt: current.seatedAt ?? new Date().toISOString(),
            orderStatus: "sentToKitchen",
            orderSentAt: new Date().toISOString(),
            tableNote: "Sent to kitchen"
        }));
        setModalConfirmation("Sent to kitchen");
        setToast(`Table ${selectedTable.table.number} order sent to kitchen.`);
    }

    function handleMarkOrderReady() {
        if (!selectedTable) {
            return;
        }

        updateSelectedTable((current) => ({
            ...current,
            serviceStatus: current.serviceStatus === "available" ? "occupied" : current.serviceStatus,
            orderStatus: "ready",
            tableNote: "Ready for delivery"
        }));
        setModalConfirmation("Kitchen marked this order ready");
        setToast(`Table ${selectedTable.table.number} is ready for delivery.`);
    }

    function handleStartCloseBill() {
        if (!selectedTable) {
            return;
        }

        const total = selectedTable.orderLines.reduce((sum, line) => sum + line.price * line.quantity, 0);
        updateSelectedTable((current) => ({ ...current, billTotal: total }));
        setBillPreviewTableId(selectedTable.table.id);
        setModalConfirmation(null);
        setIsOrderModalOpen(true);
    }

    function handleConfirmCloseBill() {
        if (!selectedTable) {
            return;
        }

        setNotifications((current) => [{
            id: Date.now(),
            tableId: selectedTable.table.id,
            tableNumber: selectedTable.table.number,
            type: "tableClosed",
            timestamp: new Date().toISOString(),
            status: "closed",
            acceptedBy: session?.fullName ?? null
        }, ...current.filter((notification) => notification.tableId !== selectedTable.table.id || notification.status === "accepted")]);

        if (selectedTable.table.id > 0) {
            void updateTableServiceRequest(selectedTable.table.id, {
                needsAssistance: false,
                requestBill: false
            });
        }

        updateSelectedTable(() => ({ ...cleanRuntimeState, tableNote: "Table closed" }));
        setBillPreviewTableId(null);
        setModalConfirmation("Table closed");
        setIsOrderModalOpen(false);
        setToast(`Table ${selectedTable.table.number} closed and reset.`);
    }

    function handleClearAcceptedNotifications() {
        setNotifications((current) => current.filter((notification) => notification.status === "pending"));
    }

    return (
        <main className="waiter-pos-shell">
            <section className="pos-surface">
                <PosUnifiedTopBar
                    stats={floorStats}
                    notifications={notifications}
                    unreadCount={unreadCount}
                    isNotificationOpen={isNotificationOpen}
                    isLoggedIn={Boolean(session)}
                    onToggleNotifications={() => setIsNotificationOpen((current) => !current)}
                    onAcceptNotification={handleAcceptNotification}
                    onClearAccepted={handleClearAcceptedNotifications}
                />

                <PosFloorToolbar activeFilter={floorFilter} onFilterChange={setFloorFilter} />

                <section className="pos-layout">
                    <PosFloorGrid
                        tables={filteredTables}
                        selectedTableId={selectedTable?.table.id ?? null}
                        onSelectTable={handleSelectTable}
                    />

                    <aside className="pos-sidepanel">
                        {!session && (
                            <PosLoginPanel
                                credentialValue={credentialValue}
                                onChangeCredential={setCredentialValue}
                                onKeypadPress={handleKeypadPress}
                                onSubmit={handleLogin}
                            />
                        )}

                        {session && (
                            <PosWaiterActionPanel
                                session={session}
                                table={selectedTable}
                                onChangeWaiter={() => setSession(null)}
                                onAssignToMe={handleAssignToMe}
                                onRequestAssistance={() => fireNotification("assistance")}
                                onRequestBill={() => fireNotification("bill")}
                                onViewOrder={() => {
                                    setBillPreviewTableId(null);
                                    setModalConfirmation(null);
                                    setIsOrderModalOpen(true);
                                }}
                                onAddToOrder={() => {
                                    setBillPreviewTableId(null);
                                    setModalConfirmation(null);
                                    setIsOrderModalOpen(true);
                                }}
                                onSendOrder={handleSendOrder}
                                onCloseBill={handleStartCloseBill}
                            />
                        )}
                    </aside>
                </section>

                <PosOrderModal
                    isOpen={isOrderModalOpen}
                    table={selectedTable}
                    menuItems={menuItems}
                    confirmation={modalConfirmation}
                    isBillPreview={billPreviewTableId === selectedTable?.table.id}
                    onClose={() => setIsOrderModalOpen(false)}
                    onAddItem={handleAddItem}
                    onSendOrder={handleSendOrder}
                    onSendToKitchen={handleSendToKitchen}
                    onMarkOrderReady={handleMarkOrderReady}
                    onStartCloseBill={handleStartCloseBill}
                    onConfirmCloseBill={handleConfirmCloseBill}
                />
                <PosToastStack isLoading={isLoading} error={error} toast={toast} />
            </section>
        </main>
    );
}

function buildOverviewTables(tables: AdminTable[], restaurantId: number) {
    return tables
        .filter((table) => table.restaurantId === restaurantId)
        .map((table) => ({
            ...table,
            needsAssistance: table.needsAssistance ?? false,
            requestBill: table.requestBill ?? false
        }))
        .sort((first, second) => first.number - second.number);
}

function getInitialRuntimeForTable(table: AdminTable): TableRuntimeState {
    const hasRequest = table.requestBill || table.needsAssistance;
    const isOccupied = table.status === "Occupied" || hasRequest;

    return {
        ...cleanRuntimeState,
        serviceStatus: table.requestBill ? "billRequested" : table.needsAssistance ? "needsWaiter" : table.status === "Occupied" ? "occupied" : "available",
        guests: isOccupied ? Math.min(table.capacity, 2) : 0,
        seatedAt: isOccupied ? new Date().toISOString() : null,
        orderLines: [],
        orderStatus: "pending",
        reservation: null,
        tableNote: table.requestBill ? "Bill requested" : table.needsAssistance ? "Needs assistance" : null
    };
}

function buildRuntimeByTable(tables: AdminTable[]) {
    return tables.reduce<Record<number, TableRuntimeState>>((state, table) => {
        state[table.id] = getInitialRuntimeForTable(table);
        return state;
    }, {});
}

function mergeRuntimeWithTableRequests(current: Record<number, TableRuntimeState>, tables: AdminTable[]) {
    return tables.reduce<Record<number, TableRuntimeState>>((state, table) => {
        const existing = current[table.id] ?? getInitialRuntimeForTable(table);
        const hasRequest = table.requestBill || table.needsAssistance;

        state[table.id] = {
            ...existing,
            serviceStatus: table.requestBill
                ? "billRequested"
                : table.needsAssistance
                    ? "needsWaiter"
                    : existing.serviceStatus === "needsWaiter" || existing.serviceStatus === "billRequested"
                        ? existing.orderLines.length > 0 ? "occupied" : "available"
                        : existing.serviceStatus,
            guests: hasRequest ? existing.guests || Math.min(table.capacity, 2) : existing.guests,
            seatedAt: hasRequest ? existing.seatedAt ?? new Date().toISOString() : existing.seatedAt,
            tableNote: table.requestBill ? "Bill requested" : table.needsAssistance ? "Needs assistance" : existing.tableNote
        };

        return state;
    }, {});
}

function buildNotificationsFromTables(tables: AdminTable[]): PosNotification[] {
    return tables.flatMap((table) => tableToPendingNotifications(table, Date.now()));
}

function mergeNotificationsWithTableRequests(current: PosNotification[], tables: AdminTable[]) {
    const requestKeys = new Set<string>();
    const pendingFromTables = tables.flatMap((table) => {
        const notifications = tableToPendingNotifications(table, Date.now());
        notifications.forEach((notification) => requestKeys.add(`${notification.tableId}:${notification.type}`));
        return notifications;
    });

    const existingKeys = new Set(current.map((notification) => `${notification.tableId}:${notification.type}`));
    const newNotifications = pendingFromTables.filter((notification) => !existingKeys.has(`${notification.tableId}:${notification.type}`));

    return [
        ...newNotifications,
        ...current.filter((notification) => notification.status !== "pending" || requestKeys.has(`${notification.tableId}:${notification.type}`))
    ];
}

function tableToPendingNotifications(table: AdminTable, seed: number): PosNotification[] {
    const notifications: PosNotification[] = [];

    if (table.needsAssistance) {
        notifications.push({
            id: seed + table.id * 10 + 1,
            tableId: table.id,
            tableNumber: table.number,
            type: "assistance",
            timestamp: new Date().toISOString(),
            status: "pending",
            acceptedBy: null
        });
    }

    if (table.requestBill) {
        notifications.push({
            id: seed + table.id * 10 + 2,
            tableId: table.id,
            tableNumber: table.number,
            type: "bill",
            timestamp: new Date().toISOString(),
            status: "pending",
            acceptedBy: null
        });
    }

    return notifications;
}

function buildTableView(table: AdminTable, runtime: TableRuntimeState): PosTableView {
    const seatedMinutes = runtime.seatedAt ? Math.max(1, Math.round((Date.now() - new Date(runtime.seatedAt).getTime()) / 60000)) : null;

    return {
        table,
        serviceStatus: runtime.serviceStatus,
        guests: runtime.guests,
        seatedMinutes,
        runtimeSeatedAt: runtime.seatedAt,
        orderLines: runtime.orderLines,
        assignedWaiter: runtime.assignedWaiter,
        orderStatus: runtime.orderStatus,
        reservation: runtime.reservation,
        orderSentAt: runtime.orderSentAt,
        billTotal: runtime.billTotal,
        tableNote: runtime.tableNote
    };
}

function buildInitials(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "W";
}
