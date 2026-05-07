import { useMemo, useState } from "react";
import type { FormEvent } from "react";
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
    defaultTablePin,
    enterFullscreen,
    exitFullscreen,
    lineCount,
    lineTotal,
    mergeLines
} from "@/features/table-ordering/utils";
import { useTheme } from "@/hooks/useTheme";

const dietaryFilters = ["Vegetarian", "Spicy", "Shellfish", "Gluten", "Chef Picks"];

export function TableOrderingPage() {
    const [isSessionOpen, setIsSessionOpen] = useState(false);
    const [tableNumber, setTableNumber] = useState("1");
    const [activeTable, setActiveTable] = useState("1");
    const [pin, setPin] = useState("");
    const [loginError, setLoginError] = useState("");
    const [toast, setToast] = useState("");

    const [activeCategory, setActiveCategory] = useState("All Items");
    const [searchTerm, setSearchTerm] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const { isLoading, items } = useTableMenu(isSessionOpen);

    const [cart, setCart] = useState<Record<number, CartLine>>({});
    const [orderedItems, setOrderedItems] = useState<Record<number, CartLine>>({});
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [selectedQuantity, setSelectedQuantity] = useState(1);
    const [showCartModal, setShowCartModal] = useState(false);
    const [paymentStep, setPaymentStep] = useState<PaymentStep>(null);

    const [lockPin, setLockPin] = useState("");
    const [showLockModal, setShowLockModal] = useState(false);

    const { theme, toggleTheme } = useTheme();
    const security = useSessionSecurity(isSessionOpen, showToast);

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
            return categoryMatch && searchMatch;
        });
    }, [activeCategory, items, searchTerm]);

    function showToast(message: string) {
        setToast(message);
        window.setTimeout(() => setToast(""), 2200);
    }

    function openTable(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (pin !== defaultTablePin) {
            setLoginError("Incorrect table PIN.");
            return;
        }

        setLoginError("");
        setActiveTable(tableNumber);
        setIsSessionOpen(true);
        setPin("");
        void enterFullscreen();
        showToast(`Table ${tableNumber} session opened`);
    }

    function addSelectedItemToCart() {
        if (!selectedItem) {
            return;
        }

        setCart((current) => addLine(current, selectedItem, selectedQuantity));
        showToast(`${selectedQuantity}x ${selectedItem.name} added to Table ${activeTable}`);
        setSelectedItem(null);
        setSelectedQuantity(1);
    }

    function submitCartOrder() {
        if (cartLines.length === 0) {
            showToast("Your cart is empty.");
            return;
        }

        setOrderedItems((current) => mergeLines(current, cartLines));
        setCart({});
        setShowCartModal(false);
        showToast("Order sent to the kitchen.");
    }

    function requestBill() {
        if (orderedLines.length === 0) {
            showToast("Order items first, then request the bill.");
            setShowCartModal(true);
            return;
        }

        setPaymentStep("choice");
    }

    function completeCardPayment() {
        setPaymentStep(null);
        setOrderedItems({});
        showToast("Card payment approved. Thank you.");
    }

    function confirmLock(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (lockPin !== defaultTablePin) {
            showToast("Incorrect PIN. Session remains open.");
            return;
        }

        setIsSessionOpen(false);
        setShowLockModal(false);
        setLockPin("");
        setCart({});
        setOrderedItems({});
        security.resetUnlock();
        void exitFullscreen();
        showToast(`Table ${activeTable} locked`);
    }

    if (!isSessionOpen) {
        return (
            <LoginScreen
                loginError={loginError}
                onPinChange={setPin}
                onSubmit={openTable}
                onTableChange={setTableNumber}
                pin={pin}
                tableNumber={tableNumber}
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
                    onAssistance={() => showToast("Assistance requested. A staff member is on the way.")}
                    onBill={requestBill}
                    onCart={() => setShowCartModal(true)}
                    onFilter={() => setShowFilters((value) => !value)}
                    onLock={() => setShowLockModal(true)}
                    onThemeToggle={toggleTheme}
                    table={activeTable}
                    theme={theme}
                />
                {showFilters && <FilterStrip />}
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
                    onClose={() => setSelectedItem(null)}
                    onQuantityChange={setSelectedQuantity}
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
                lines={orderedLines}
                onCardPayment={completeCardPayment}
                onCardSelect={() => setPaymentStep("card")}
                onCash={() => {
                    setPaymentStep(null);
                    showToast("Cash payment requested. A waiter is on the way.");
                }}
                onClose={() => setPaymentStep(null)}
                step={paymentStep}
                table={activeTable}
            />
            {showLockModal && (
                <LockModal
                    lockPin={lockPin}
                    onClose={() => setShowLockModal(false)}
                    onPinChange={setLockPin}
                    onSubmit={confirmLock}
                    table={activeTable}
                />
            )}
            {toast && <Toast message={toast} />}
        </main>
    );
}

function FilterStrip() {
    return (
        <div className="pos-filter-strip">
            {dietaryFilters.map((filter) => (
                <span key={filter}>{filter}</span>
            ))}
        </div>
    );
}
