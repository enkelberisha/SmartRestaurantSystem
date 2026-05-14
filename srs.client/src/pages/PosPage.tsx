import { useCallback, useEffect, useMemo, useState } from "react";
import { updateTableServiceRequest, type AdminMenu, type AdminMenuItem, type AdminOrder, type AdminStaff, type AdminTable } from "@/lib/admin/adminService";
import { useUserContext } from "@/context/useUserContext";
import { verifyCurrentPassword } from "@/lib/auth/authService";
import {
    PosFloorGrid,
    PosFloorToolbar,
    PosLoginPanel,
    PosLogoutPrompt,
    PosOrderModal,
    PosToastStack,
    PosUnifiedTopBar,
    PosWaiterActionPanel
} from "@/features/pos/components";
import type { PosTableView } from "@/features/pos/components";
import {
    completePosOrder,
    completePosPayment,
    createPosOrder,
    createPosOrderItem,
    createPosPayment,
    loadPosFloorData,
    loginWaiter,
    updatePosOrderStatus
} from "@/features/pos/service";
import type {
    DraftLine,
    PosAssignedWaiter,
    PosFloorFilter,
    PosOrderItem,
    PosFloorStats,
    PosNotification,
    PosOrderStatus,
    PosReservation,
    PosTableServiceStatus,
    PosWaiterSession
} from "@/features/pos/types";

type TableRuntimeState = {
    activeOrderId: number | null;
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

const cleanRuntimeState: TableRuntimeState = {
    activeOrderId: null,
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
    const { profile, logout } = useUserContext();
    const [credentialValue, setCredentialValue] = useState("");
    const [session, setSession] = useState<PosWaiterSession | null>(null);
    const [tables, setTables] = useState<AdminTable[]>([]);
    const [staff, setStaff] = useState<AdminStaff[]>([]);
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [menus, setMenus] = useState<AdminMenu[]>([]);
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
    const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [staffError, setStaffError] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [isLogoutPromptOpen, setIsLogoutPromptOpen] = useState(false);
    const [logoutPassword, setLogoutPassword] = useState("");
    const [logoutError, setLogoutError] = useState<string | null>(null);
    const [isLoggingOutApp, setIsLoggingOutApp] = useState(false);

    const loadFloorData = useCallback(async () => {
        if (!profile?.restaurantId) {
            setTables([]);
            setStaff([]);
            setOrders([]);
            setMenus([]);
            setMenuItems([]);
            setRuntimeByTableId({});
            setNotifications([]);
            setSelectedTableId(null);
            setIsLoading(false);
            return;
        }

        const activeRestaurantId = profile.restaurantId;

        try {
            setIsLoading(true);
            setError(null);
            setStaffError(null);
            const nextData = await loadPosFloorData(activeRestaurantId);
            const floorTables = buildOverviewTables(nextData.tables, activeRestaurantId);

            setTables(floorTables);
            setStaff(nextData.staff.filter((member) => member.isActive));
            setOrders(nextData.orders);
            setMenus(nextData.menus);
            setMenuItems(nextData.menuItems);
            setRuntimeByTableId(buildRuntimeByTable(floorTables, nextData.orders, nextData.orderItems, nextData.menuItems));
            setNotifications(buildNotificationsFromTables(floorTables));
            setSelectedTableId(null);
        } catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : "Failed to load POS floor.";
            setTables([]);
            setStaff([]);
            setOrders([]);
            setMenus([]);
            setMenuItems([]);
            setRuntimeByTableId({});
            setNotifications([]);
            setSelectedTableId(null);
            setError(message);
            setStaffError(message);
        } finally {
            setIsLoading(false);
        }
    }, [profile?.restaurantId]);

    useEffect(() => {
        let isMounted = true;

        void loadFloorData().finally(() => {
            if (!isMounted) {
                return;
            }
        });

        return () => {
            isMounted = false;
        };
    }, [loadFloorData]);

    useEffect(() => {
        if (!profile?.restaurantId) {
            return;
        }

        const activeRestaurantId = profile.restaurantId;
        let isMounted = true;

        async function refreshTableRequests() {
            try {
                const nextData = await loadPosFloorData(activeRestaurantId);
                const latestTables = buildOverviewTables(nextData.tables, activeRestaurantId);

                if (!isMounted) {
                    return;
                }

                setTables(latestTables);
                setOrders(nextData.orders);
                setMenus(nextData.menus);
                setRuntimeByTableId((current) => mergeRuntimeWithBackend(current, latestTables, nextData.orders, nextData.orderItems, nextData.menuItems));
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
            return null;
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

    async function authenticateCredential(credential: string) {
        const trimmedCredential = credential.trim();

        if (!trimmedCredential) {
            setError("Enter a staff PIN or scan a staff card.");
            return null;
        }

        if (staff.length === 0) {
            setStaffError("Staff list is unavailable. Retry loading staff before logging in.");
            return null;
        }

        try {
            setIsSubmittingLogin(true);
            setError(null);
            const nextSession = await loginWaiter(trimmedCredential);
            setSession(nextSession);
            setCredentialValue("");
            setToast(`${nextSession.fullName} is active on this POS.`);
            return nextSession;
        } catch (loginError) {
            setError(loginError instanceof Error ? loginError.message : "Waiter login failed.");
            return null;
        } finally {
            setIsSubmittingLogin(false);
        }
    }

    async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await authenticateCredential(credentialValue);
    }

    async function handleTapCredential(credential: string) {
        return authenticateCredential(credential);
    }

    function handleChangeWaiter() {
        if (session) {
            setToast(`${session.fullName} signed out from waiter control.`);
        }

        setSession(null);
        setCredentialValue("");
    }

    function handleTopBarLogout() {
        if (session) {
            handleChangeWaiter();
            return;
        }

        setIsNotificationOpen(false);
        setLogoutPassword("");
        setLogoutError(null);
        setIsLogoutPromptOpen(true);
    }

    async function handleConfirmAppLogout(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!profile?.email) {
            setLogoutError("We could not verify the current account.");
            return;
        }

        if (!logoutPassword.trim()) {
            setLogoutError("Password is required.");
            return;
        }

        try {
            setIsLoggingOutApp(true);
            setLogoutError(null);
            await verifyCurrentPassword(profile.email, logoutPassword);
            setIsLogoutPromptOpen(false);
            setLogoutPassword("");
            setCredentialValue("");
            await logout();
        } catch (logoutPromptError) {
            setLogoutError(logoutPromptError instanceof Error ? logoutPromptError.message : "Password verification failed.");
        } finally {
            setIsLoggingOutApp(false);
        }
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

    function handleResolveAssistance() {
        if (!selectedTable || !session || selectedTable.serviceStatus !== "needsWaiter") {
            return;
        }

        setNotifications((current) => current.map((notification) =>
            notification.tableId === selectedTable.table.id &&
            notification.type === "assistance" &&
            notification.status === "pending"
                ? { ...notification, status: "accepted", acceptedBy: session.fullName }
                : notification
        ));

        if (selectedTable.table.id > 0) {
            void updateTableServiceRequest(selectedTable.table.id, { needsAssistance: false });
        }

        updateSelectedTable((current) => ({
            ...current,
            serviceStatus: current.guests > 0 || current.orderLines.length > 0 ? "occupied" : "available",
            assignedWaiter: current.assignedWaiter ?? {
                staffId: session.staffId,
                fullName: session.fullName,
                initials: buildInitials(session.fullName)
            },
            tableNote: "Assistance resolved"
        }));
        setToast(`Assistance resolved for Table ${selectedTable.table.number}.`);
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
            const existingPendingIndex = current.orderLines.findIndex((line) =>
                !line.orderItemId && line.menuItemId === item.id && line.price === item.price
            );
            const nextLines = existingPendingIndex >= 0
                ? current.orderLines.map((line, index) => index === existingPendingIndex
                    ? { ...line, quantity: line.quantity + 1 }
                    : line)
                : [
                    ...current.orderLines,
                    {
                        clientId: `${Date.now()}-${item.id}-${current.orderLines.length}`,
                        menuItemId: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: 1
                    }
                ];

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
            orderStatus: "completed",
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

    async function persistSelectedOrder() {
        if (!selectedTable) {
            return null;
        }

        const runtime = runtimeByTableId[selectedTable.table.id] ?? cleanRuntimeState;

        if (runtime.orderLines.length === 0) {
            return null;
        }

        let activeOrderId = runtime.activeOrderId;

        if (!activeOrderId) {
            const createdOrder = await createPosOrder(selectedTable.table.id);
            activeOrderId = createdOrder.id;
        }

        for (const line of runtime.orderLines) {
            if (!line.orderItemId) {
                await createPosOrderItem(activeOrderId, line.menuItemId, line.quantity);
            }
        }

        await updatePosOrderStatus(activeOrderId, "InProgress");

        return {
            orderId: activeOrderId,
            total: runtime.orderLines.reduce((sum, line) => sum + line.price * line.quantity, 0)
        };
    }

    async function handleSendToKitchen() {
        if (!selectedTable || !profile?.restaurantId) {
            return;
        }

        const runtime = runtimeByTableId[selectedTable.table.id] ?? cleanRuntimeState;

        if (runtime.orderLines.length === 0) {
            setError("Add at least one item before sending the order to kitchen.");
            return;
        }

        try {
            await persistSelectedOrder();

            const nextData = await loadPosFloorData(profile.restaurantId);
            const latestTables = buildOverviewTables(nextData.tables, profile.restaurantId);

            setTables(latestTables);
            setStaff(nextData.staff.filter((member) => member.isActive));
            setOrders(nextData.orders);
            setMenus(nextData.menus);
            setMenuItems(nextData.menuItems);
            setRuntimeByTableId((current) => {
                const merged = mergeRuntimeWithBackend(current, latestTables, nextData.orders, nextData.orderItems, nextData.menuItems);
                const refreshedTable = merged[selectedTable.table.id];

                if (refreshedTable) {
                    merged[selectedTable.table.id] = {
                        ...refreshedTable,
                        orderLines: refreshedTable.orderLines.filter((line) => Boolean(line.orderItemId))
                    };
                }

                return merged;
            });
            setNotifications((current) => mergeNotificationsWithTableRequests(current, latestTables));
            setModalConfirmation("Sent to kitchen");
            setToast(`Table ${selectedTable.table.number} order sent to kitchen.`);
            setError(null);
        } catch (sendError) {
            setError(sendError instanceof Error ? sendError.message : "Failed to send order to kitchen.");
        }
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

    async function handleConfirmCloseBill() {
        if (!selectedTable) {
            return;
        }

        try {
            const persistedOrder = await persistSelectedOrder();
            const openOrders = orders
                .filter((order) =>
                    order.tableId === selectedTable.table.id &&
                    order.status !== "Completed" &&
                    order.status !== "Cancelled"
                )
                .map((order) => ({
                    id: order.id,
                    total: order.total
                }));
            const payableOrders = persistedOrder
                ? [{ id: persistedOrder.orderId, total: persistedOrder.total || openOrders.find((order) => order.id === persistedOrder.orderId)?.total || 0 }]
                : openOrders;

            if (payableOrders.length === 0 || payableOrders.every((order) => order.total <= 0)) {
                throw new Error("No payable order found for this table.");
            }

            for (const order of payableOrders) {
                const payment = await createPosPayment(order.id, order.total, "Cash");
                await completePosPayment(payment.id);
                await completePosOrder(order.id);
            }
        } catch (closeError) {
            setError(closeError instanceof Error ? closeError.message : "Failed to save bill payment.");
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
        setOrders((current) => current.map((order) =>
            order.tableId === selectedTable.table.id && order.status !== "Completed" && order.status !== "Cancelled"
                ? { ...order, status: "Completed" }
                : order
        ));
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
                    waiterName={session ? session.fullName.split(/\s+/)[0] ?? session.fullName : null}
                    waiterInitials={session ? buildInitials(session.fullName) : null}
                    onLogoutApp={handleTopBarLogout}
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
                                isLoading={isLoading}
                                isSubmitting={isSubmittingLogin}
                                staff={staff}
                                staffError={staffError}
                                onChangeCredential={setCredentialValue}
                                onKeypadPress={handleKeypadPress}
                                onSubmit={handleLogin}
                                onRetryStaff={loadFloorData}
                                onTapCredential={handleTapCredential}
                            />
                        )}

                        {session && (
                            <PosWaiterActionPanel
                                table={selectedTable}
                                onAssignToMe={handleAssignToMe}
                                onResolveAssistance={handleResolveAssistance}
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
                    menus={menus}
                    menuItems={menuItems}
                    confirmation={modalConfirmation}
                    isBillPreview={billPreviewTableId === selectedTable?.table.id}
                    onClose={() => setIsOrderModalOpen(false)}
                    onAddItem={handleAddItem}
                    onSendOrder={handleSendOrder}
                    onSendToKitchen={handleSendToKitchen}
                    onStartCloseBill={handleStartCloseBill}
                    onConfirmCloseBill={handleConfirmCloseBill}
                />
                <PosLogoutPrompt
                    isOpen={isLogoutPromptOpen}
                    password={logoutPassword}
                    error={logoutError}
                    isSubmitting={isLoggingOutApp}
                    onChangePassword={setLogoutPassword}
                    onCancel={() => {
                        if (isLoggingOutApp) {
                            return;
                        }

                        setIsLogoutPromptOpen(false);
                        setLogoutPassword("");
                        setLogoutError(null);
                    }}
                    onConfirm={handleConfirmAppLogout}
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

function buildRuntimeByTable(
    tables: AdminTable[],
    orders: AdminOrder[],
    orderItems: PosOrderItem[],
    menuItems: AdminMenuItem[]
) {
    return tables.reduce<Record<number, TableRuntimeState>>((state, table) => {
        state[table.id] = buildTableRuntime(table, cleanRuntimeState, orders, orderItems, menuItems);
        return state;
    }, {});
}

function mergeRuntimeWithBackend(
    current: Record<number, TableRuntimeState>,
    tables: AdminTable[],
    orders: AdminOrder[],
    orderItems: PosOrderItem[],
    menuItems: AdminMenuItem[]
) {
    return tables.reduce<Record<number, TableRuntimeState>>((state, table) => {
        const existing = current[table.id] ?? cleanRuntimeState;
        state[table.id] = buildTableRuntime(table, existing, orders, orderItems, menuItems);

        return state;
    }, {});
}

function buildTableRuntime(
    table: AdminTable,
    existing: TableRuntimeState,
    orders: AdminOrder[],
    orderItems: PosOrderItem[],
    menuItems: AdminMenuItem[]
): TableRuntimeState {
    const initial = getInitialRuntimeForTable(table);
    const activeOrders = orders
        .filter((order) => order.tableId === table.id && order.status !== "Completed" && order.status !== "Cancelled")
        .sort((left, right) => right.id - left.id);
    const activeOrder = activeOrders[0] ?? null;
    const menuItemsById = new Map(menuItems.map((item) => [item.id, item]));
    const backendLines = activeOrder
        ? orderItems
            .filter((item) => item.orderId === activeOrder.id)
            .map((item) => ({
                orderItemId: item.id,
                menuItemId: item.menuItemId,
                name: menuItemsById.get(item.menuItemId)?.name ?? `Item #${item.menuItemId}`,
                price: item.price,
                quantity: item.quantity
            }))
        : [];
    const pendingLines = existing.orderLines.filter((line) => !line.orderItemId);
    const runtimeLines = backendLines.length > 0 ? [...backendLines, ...pendingLines] : existing.orderLines;
    const mappedOrderStatus = pendingLines.length > 0
        ? "pending"
        : activeOrder
            ? mapBackendOrderStatus(activeOrder.status)
            : existing.orderStatus;
    const hasOrder = runtimeLines.length > 0 || activeOrder !== null;
    const serviceStatus = table.requestBill
        ? "billRequested"
        : table.needsAssistance
            ? "needsWaiter"
            : hasOrder
                ? existing.serviceStatus === "delivered" && mappedOrderStatus === "completed"
                    ? "delivered"
                    : "occupied"
                : initial.serviceStatus;

    return {
        ...initial,
        activeOrderId: activeOrder?.id ?? existing.activeOrderId,
        serviceStatus,
        guests: hasOrder ? existing.guests || Math.min(table.capacity, 2) : initial.guests,
        seatedAt: hasOrder ? existing.seatedAt ?? activeOrder?.createdAt ?? new Date().toISOString() : initial.seatedAt,
        orderLines: runtimeLines,
        assignedWaiter: existing.assignedWaiter,
        orderStatus: mappedOrderStatus,
        reservation: existing.reservation,
        orderSentAt: mappedOrderStatus === "sentToKitchen" || mappedOrderStatus === "ready" || mappedOrderStatus === "completed"
            ? existing.orderSentAt ?? activeOrder?.createdAt ?? null
            : existing.orderSentAt,
        billTotal: existing.billTotal,
        tableNote: table.requestBill
            ? "Bill requested"
            : table.needsAssistance
                ? "Needs assistance"
                : existing.serviceStatus === "delivered" && mappedOrderStatus === "completed"
                    ? "Order Delivered"
                    : existing.tableNote
    };
}

function mapBackendOrderStatus(status: string): PosOrderStatus {
    if (status === "InProgress") {
        return "sentToKitchen";
    }

    if (status === "Ready") {
        return "ready";
    }

    if (status === "Completed") {
        return "completed";
    }

    return "pending";
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
