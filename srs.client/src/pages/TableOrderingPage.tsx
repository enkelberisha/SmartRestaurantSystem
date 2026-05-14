import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
    BottomBar,
    CartModal,
    ItemModal,
    LockModal,
    LoginScreen,
    MenuGrid,
    PaymentModal,
    Sidebar,
    Toast,
    TopBar
} from "@/features/table-ordering/components";
import type { CartLine, MenuItem, PaymentStep } from "@/features/table-ordering/types";
import { useSessionSecurity } from "@/features/table-ordering/useSessionSecurity";
import { useTableMenu } from "@/features/table-ordering/useTableMenu";
import {
    addLine,
    cartLines as toCartLines,
    enterFullscreen,
    exitFullscreen,
    lineCount,
    lineTotal
} from "@/features/table-ordering/utils";
import { useTheme } from "@/hooks/useTheme";
import { getAdminRestaurants, getAdminRestaurantTables, type AdminRestaurant, type AdminTable } from "@/lib/admin/adminService";
import { updateTableServiceRequest } from "@/lib/admin/adminService";
import {
    closeTableSession,
    completeTableSessionOrder,
    completeTableSessionPayment,
    createTableSession,
    createTableSessionOrder,
    createTableSessionPayment,
    getTableSessionOrders,
    type TableSession,
    type TableSessionOrder
} from "@/features/table-ordering/tableSessionService";
import { supabase } from "@/lib/supabase/client";
import { useUserContext } from "@/context/useUserContext";
import type { MenuItemFilter } from "@/lib/admin/adminService";

export function TableOrderingPage() {
    const [activeSession, setActiveSession] = useState<TableSession | null>(null);
    const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
    const [tables, setTables] = useState<AdminTable[]>([]);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
    const [selectedTableId, setSelectedTableId] = useState("");
    const [isSetupLoading, setIsSetupLoading] = useState(true);
    const [isOpeningSession, setIsOpeningSession] = useState(false);
    const [loginError, setLoginError] = useState("");
    const [toast, setToast] = useState("");

    const [activeCategory, setActiveCategory] = useState("All Items");
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const { filters, isLoading, items } = useTableMenu(Boolean(activeSession), activeSession?.restaurantId ?? null, searchTerm, activeFilters);

    const [cart, setCart] = useState<Record<string, CartLine>>({});
    const [orderedItems, setOrderedItems] = useState<Record<string, CartLine>>({});
    const [submittedOrders, setSubmittedOrders] = useState<Array<{ id: number; total: number }>>([]);
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [selectedQuantity, setSelectedQuantity] = useState(1);
    const [selectedNotes, setSelectedNotes] = useState("");
    const [showCartModal, setShowCartModal] = useState(false);
    const [paymentStep, setPaymentStep] = useState<PaymentStep>(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    const [lockPassword, setLockPassword] = useState("");
    const [showLockModal, setShowLockModal] = useState(false);

    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const { logout, profile } = useUserContext();
    const security = useSessionSecurity(Boolean(activeSession), showToast);
    const activeTable = activeSession?.tableNumber.toString() ?? "";

    const cartLines = useMemo(() => toCartLines(cart), [cart]);
    const orderedLines = useMemo(() => toCartLines(orderedItems), [orderedItems]);
    const cartCount = lineCount(cartLines);
    const cartTotal = lineTotal(cartLines);
    const orderedCount = lineCount(orderedLines);
    const orderedTotal = lineTotal(orderedLines);

    const categories = useMemo(() => ["All Items", ...new Set(items.map((item) => item.category).filter(Boolean))], [items]);
    const visibleItems = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();

        return items.filter((item) => {
            const categoryMatch = activeCategory === "All Items" || item.category === activeCategory;
            const searchMatch = !search || item.name.toLowerCase().includes(search) || item.description.toLowerCase().includes(search);
            const filterMatch = activeFilters.length === 0 || activeFilters.every(filter => item.filters.includes(filter));
            return categoryMatch && searchMatch && filterMatch;
        });
    }, [activeCategory, activeFilters, items, searchTerm]);

    function toggleFilter(slug: string) {
        setActiveFilters(current =>
            current.includes(slug)
                ? current.filter(filter => filter !== slug)
                : [...current, slug]
        );
    }

    useEffect(() => {
        let isMounted = true;

        async function loadSetup() {
            try {
                setIsSetupLoading(true);
                const loadedRestaurants = await getAdminRestaurants();
                if (!isMounted) {
                    return;
                }

                setRestaurants(loadedRestaurants);
                const firstRestaurantId = loadedRestaurants[0]?.id ?? null;
                setSelectedRestaurantId(firstRestaurantId);
            } catch (error) {
                if (isMounted) {
                    setLoginError(error instanceof Error ? error.message : "Could not load restaurant setup.");
                }
            } finally {
                if (isMounted) {
                    setIsSetupLoading(false);
                }
            }
        }

        void loadSetup();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (selectedRestaurantId === null || activeSession) {
            return;
        }

        let isMounted = true;

        async function loadTables() {
            try {
                setIsSetupLoading(true);
                const loadedTables = await getAdminRestaurantTables(selectedRestaurantId!);

                if (isMounted) {
                    setTables(loadedTables);
                    setSelectedTableId(loadedTables[0]?.id.toString() ?? "");
                }
            } catch (error) {
                if (isMounted) {
                    setTables([]);
                    setSelectedTableId("");
                    setLoginError(error instanceof Error ? error.message : "Could not load tables.");
                }
            } finally {
                if (isMounted) {
                    setIsSetupLoading(false);
                }
            }
        }

        void loadTables();

        return () => {
            isMounted = false;
        };
    }, [activeSession, selectedRestaurantId]);

    useEffect(() => {
        if (!activeSession) {
            return;
        }

        let isMounted = true;

        async function refreshSessionOrders() {
            try {
                const orders = await getTableSessionOrders(activeSession!.id);

                if (!isMounted) {
                    return;
                }

                const nextState = buildSessionOrderState(orders, items);
                setOrderedItems(nextState.orderedItems);
                setSubmittedOrders(nextState.submittedOrders);
            } catch {
                // Keep the tablet usable if a background order refresh misses once.
            }
        }

        void refreshSessionOrders();
        const refreshId = window.setInterval(() => {
            void refreshSessionOrders();
        }, 5000);

        return () => {
            isMounted = false;
            window.clearInterval(refreshId);
        };
    }, [activeSession, items]);

    function showToast(message: string) {
        setToast(message);
        window.setTimeout(() => setToast(""), 2200);
    }

    async function openTable(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const tableId = Number(selectedTableId);

        if (!tableId) {
            setLoginError("Choose a table before opening the iPad session.");
            return;
        }

        try {
            setIsOpeningSession(true);
            setLoginError("");
            const session = await createTableSession(tableId);
            setActiveSession(session);
            setCart({});
            setOrderedItems({});
            setSubmittedOrders([]);
            void enterFullscreen();
            showToast(`Table ${session.tableNumber} session opened`);
        } catch (error) {
            setLoginError(error instanceof Error ? error.message : "Could not open table session.");
        } finally {
            setIsOpeningSession(false);
        }
    }

    function addSelectedItemToCart() {
        if (!selectedItem) {
            return;
        }

        setCart((current) => addLine(current, selectedItem, selectedQuantity, selectedNotes));
        showToast(`${selectedQuantity}x ${selectedItem.name} added to Table ${activeTable}`);
        setSelectedItem(null);
        setSelectedQuantity(1);
        setSelectedNotes("");
    }

    async function submitCartOrder() {
        if (cartLines.length === 0) {
            showToast("Your cart is empty.");
            return;
        }

        if (!activeSession) {
            showToast("Open a table session first.");
            return;
        }

        try {
            const order = await createTableSessionOrder(activeSession.id, cartLines);
            const orders = await getTableSessionOrders(activeSession.id);
            const nextState = buildSessionOrderState(orders, items);

            setOrderedItems(nextState.orderedItems);
            setSubmittedOrders(nextState.submittedOrders);
            setCart({});
            setShowCartModal(false);
            showToast(`Order #${order.id} sent to the kitchen.`);
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Could not send order.");
        }
    }

    async function requestAssistance() {
        if (!activeSession) {
            showToast("Open a table session first.");
            return;
        }

        try {
            await updateTableServiceRequest(activeSession.tableId, { needsAssistance: true });
            showToast("Assistance requested. A staff member is on the way.");
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Could not request assistance.");
        }
    }

    async function requestBill() {
        if (orderedLines.length === 0) {
            showToast("Order items first, then request the bill.");
            setShowCartModal(true);
            return;
        }

        if (!activeSession) {
            showToast("Open a table session first.");
            return;
        }

        try {
            await updateTableServiceRequest(activeSession.tableId, { requestBill: true });
            setPaymentStep("choice");
            showToast("Bill requested. A waiter will come over.");
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Could not request bill.");
        }
    }

    async function completeCardPayment() {
        if (!activeSession) {
            showToast("Open a table session first.");
            return;
        }

        if (submittedOrders.length === 0) {
            showToast("No submitted orders are ready for payment.");
            return;
        }

        try {
            setIsProcessingPayment(true);

            for (const order of submittedOrders) {
                const payment = await createTableSessionPayment(order.id, order.total, "Card");
                await completeTableSessionPayment(payment.id);
                await completeTableSessionOrder(order.id);
            }

            await updateTableServiceRequest(activeSession.tableId, { requestBill: false });
            setPaymentStep(null);
            setOrderedItems({});
            setSubmittedOrders([]);
            showToast("Card payment approved and saved. Thank you.");
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Could not save payment.");
        } finally {
            setIsProcessingPayment(false);
        }
    }

    async function confirmLock(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!profile?.email) {
            showToast("Could not verify this table account.");
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({
            email: profile.email,
            password: lockPassword
        });

        if (error) {
            showToast("Incorrect account password. Session remains open.");
            return;
        }

        const closedTable = activeTable;
        if (activeSession) {
            try {
                await updateTableServiceRequest(activeSession.tableId, { needsAssistance: false, requestBill: false });
                await closeTableSession(activeSession.id);
            } catch {
                showToast("Session closed locally, but the backend close failed.");
            }
        }

        setActiveSession(null);
        setShowLockModal(false);
        setLockPassword("");
        setCart({});
        setOrderedItems({});
        setSubmittedOrders([]);
        security.resetUnlock();
        void exitFullscreen();
        await logout();
        navigate("/login", { replace: true });
        showToast(`Table ${closedTable} logged out`);
    }

    async function logoutFromOpenTable() {
        await logout();
        navigate("/login", { replace: true });
    }

    function selectRestaurant(restaurantId: number) {
        setSelectedRestaurantId(restaurantId);
        setTables([]);
        setSelectedTableId("");
        setLoginError("");
    }

    if (!activeSession) {
        return (
            <LoginScreen
                isLoading={isSetupLoading || isOpeningSession}
                loginError={loginError}
                onLogout={logoutFromOpenTable}
                onRestaurantChange={selectRestaurant}
                onSubmit={openTable}
                onTableChange={setSelectedTableId}
                restaurants={restaurants}
                selectedRestaurantId={selectedRestaurantId}
                selectedTableId={selectedTableId}
                tables={tables}
                theme={theme}
                toast={toast}
            />
        );
    }

    return (
        <main className="pos-shell" onPointerDownCapture={security.handlePointerDown}>
            <Sidebar
                activeCategory={activeCategory}
                categories={categories}
                onCategoryChange={setActiveCategory}
                onLogoTap={security.handleLogoTap}
                onPoweredTap={security.handlePoweredTap}
                theme={theme}
            />
            <section className="pos-workspace">
                <TopBar
                    cartCount={cartCount}
                    cartTotal={cartTotal}
                    isLogoutVisible={security.isLogoutVisible}
                    onAssistance={requestAssistance}
                    onBill={requestBill}
                    onCart={() => setShowCartModal(true)}
                    onFilter={() => setShowFilters((value) => !value)}
                    onLock={() => setShowLockModal(true)}
                    onThemeToggle={toggleTheme}
                    table={activeTable}
                    theme={theme}
                />
                {showFilters && (
                    <FilterStrip
                        activeFilters={activeFilters}
                        filters={filters}
                        onToggle={toggleFilter}
                    />
                )}
                <MenuGrid activeCategory={activeCategory} isLoading={isLoading} items={visibleItems} onItemClick={setSelectedItem} />
            </section>
            <BottomBar
                cartCount={cartCount}
                onSearchChange={setSearchTerm}
                orderedCount={orderedCount}
                searchTerm={searchTerm}
                table={activeTable}
            />

            {selectedItem && (
                <ItemModal
                    item={selectedItem}
                    onAdd={addSelectedItemToCart}
                    onClose={() => {
                        setSelectedItem(null);
                        setSelectedNotes("");
                    }}
                    onNotesChange={setSelectedNotes}
                    onQuantityChange={setSelectedQuantity}
                    notes={selectedNotes}
                    quantity={selectedQuantity}
                />
            )}
            {showCartModal && (
                <CartModal
                    cartLines={cartLines}
                    cartTotal={cartTotal}
                    onClose={() => setShowCartModal(false)}
                    onOrder={submitCartOrder}
                    orderedLines={orderedLines}
                    table={activeTable}
                />
            )}
            <PaymentModal
                amount={orderedTotal}
                isProcessing={isProcessingPayment}
                lines={orderedLines}
                onCardPayment={completeCardPayment}
                onCardSelect={() => setPaymentStep("card")}
                onCash={() => {
                    if (activeSession) {
                        void updateTableServiceRequest(activeSession.tableId, { requestBill: true });
                    }
                    setPaymentStep(null);
                    showToast("Cash payment requested. A waiter is on the way.");
                }}
                onClose={() => setPaymentStep(null)}
                step={paymentStep}
                table={activeTable}
            />
            {showLockModal && (
                <LockModal
                    lockPin={lockPassword}
                    onClose={() => setShowLockModal(false)}
                    onPinChange={setLockPassword}
                    onSubmit={confirmLock}
                    table={activeTable}
                />
            )}
            {toast && <Toast message={toast} />}
        </main>
    );
}

function buildSessionOrderState(orders: TableSessionOrder[], menuItems: MenuItem[]) {
    const menuItemsById = new Map(menuItems.map((item) => [item.id, item]));
    const orderedItems: Record<string, CartLine> = {};

    for (const order of orders) {
        for (const line of order.lines) {
            const menuItem = menuItemsById.get(line.menuItemId) ?? {
                id: line.menuItemId,
                name: line.name,
                description: "",
                price: line.price,
                category: "Ordered",
                imageUrl: null,
                cookingTime: 0,
                filters: []
            };
            const key = `${order.id}:${line.id}`;

            orderedItems[key] = {
                key,
                item: {
                    ...menuItem,
                    name: line.name,
                    price: line.price
                },
                notes: line.notes ?? "",
                quantity: line.quantity
            };
        }
    }

    return {
        orderedItems,
        submittedOrders: orders.map((order) => ({ id: order.id, total: order.total }))
    };
}

function FilterStrip({
    activeFilters,
    filters,
    onToggle
}: {
    activeFilters: string[];
    filters: MenuItemFilter[];
    onToggle: (slug: string) => void;
}) {
    return (
        <div className="pos-filter-strip">
            {filters.length > 0 ? (
                filters.map((filter) => {
                    const isActive = activeFilters.includes(filter.slug);

                    return (
                        <button
                            key={filter.slug}
                            type="button"
                            className={isActive ? "pos-filter-chip pos-filter-chip--active" : "pos-filter-chip"}
                            aria-pressed={isActive}
                            onClick={() => onToggle(filter.slug)}
                        >
                            {filter.name}
                        </button>
                    );
                })
            ) : (
                <span>No filters available</span>
            )}
        </div>
    );
}
