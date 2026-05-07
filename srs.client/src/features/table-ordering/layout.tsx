import type { FormEvent } from "react";
import {
    Bell,
    ChevronDown,
    Filter,
    Languages,
    Lock,
    Moon,
    ReceiptText,
    Search,
    ShoppingCart,
    Sun,
    Utensils
} from "lucide-react";
import { getBrandLogo, type BrandTheme } from "@/lib/branding/brandLogo";
import type { MenuItem } from "@/features/table-ordering/types";
import { currency, getItemInitials } from "@/features/table-ordering/utils";

type LoginScreenProps = {
    loginError: string;
    onPinChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onTableChange: (value: string) => void;
    pin: string;
    tableNumber: string;
    theme: BrandTheme;
    toast: string;
};

export function LoginScreen({ loginError, onPinChange, onSubmit, onTableChange, pin, tableNumber, theme, toast }: LoginScreenProps) {
    return (
        <main className="table-login-shell">
            <section className="table-login-panel" aria-label="Open table session">
                <div className="table-login-panel__brand">
                    <img src={getBrandLogo(theme)} alt="Smart Restaurant System" />
                    <span>Tablet POS</span>
                </div>
                <div className="table-login-panel__copy">
                    <p>Staff Session</p>
                    <h1>Open Table</h1>
                    <span>Enter the table number and table PIN to start the ordering session.</span>
                </div>
                <form className="table-login-form" onSubmit={onSubmit}>
                    <label>
                        Table Number
                        <input inputMode="numeric" min="1" onChange={(event) => onTableChange(event.target.value)} placeholder="1" type="number" value={tableNumber} />
                    </label>
                    <label>
                        Table PIN
                        <input inputMode="numeric" onChange={(event) => onPinChange(event.target.value)} type="password" value={pin} />
                    </label>
                    {loginError && <p className="table-login-form__error">{loginError}</p>}
                    <button className="pos-primary-button" type="submit">
                        <Lock size={18} />
                        Open Table
                    </button>
                </form>
            </section>
            {toast && <Toast message={toast} />}
        </main>
    );
}

type SidebarProps = {
    activeCategory: string;
    categories: string[];
    onCategoryChange: (category: string) => void;
    onLogoTap: () => void;
    onPoweredTap: () => void;
    theme: BrandTheme;
};

export function Sidebar({ activeCategory, categories, onCategoryChange, onLogoTap, onPoweredTap, theme }: SidebarProps) {
    return (
        <aside className="pos-sidebar" aria-label="Menu categories">
            <div className="pos-sidebar__logo">
                <button className="pos-powered pos-powered--sidebar" data-staff-gesture-target="powered" onClick={onPoweredTap} type="button">
                    Powered by SRS
                </button>
                <button aria-label="Restaurant logo" className="pos-logo-button" data-staff-gesture-target="logo" onClick={onLogoTap} type="button">
                    <img src={getBrandLogo(theme)} alt="Smart Restaurant System" />
                </button>
            </div>
            <nav className="pos-category-list">
                {categories.map((category) => (
                    <button className={category === activeCategory ? "is-active" : ""} key={category} onClick={() => onCategoryChange(category)} type="button">
                        {category}
                    </button>
                ))}
            </nav>
        </aside>
    );
}

type TopBarProps = {
    cartCount: number;
    cartTotal: number;
    isLogoutVisible: boolean;
    onAssistance: () => void;
    onBill: () => void;
    onCart: () => void;
    onFilter: () => void;
    onLock: () => void;
    onThemeToggle: () => void;
    table: string;
    theme: BrandTheme;
};

export function TopBar({ cartCount, cartTotal, isLogoutVisible, onAssistance, onBill, onCart, onFilter, onLock, onThemeToggle, table, theme }: TopBarProps) {
    return (
        <header className="pos-topbar">
            <div className="pos-table-pill">
                <Utensils size={18} />
                Table {table}
            </div>
            <div className="pos-topbar__actions">
                <button className="pos-action-button pos-action-button--assist" onClick={onAssistance} type="button">
                    <Bell size={18} />
                    Request Assistance
                </button>
                <button className="pos-action-button pos-action-button--bill" onClick={onBill} type="button">
                    <ReceiptText size={18} />
                    Request Bill
                </button>
                <button type="button">
                    <Languages size={18} />
                    EN
                    <ChevronDown size={16} />
                </button>
                <button className="pos-theme-button" onClick={onThemeToggle} type="button">
                    {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                    {theme === "dark" ? "Light" : "Dark"}
                </button>
                <button className="pos-filter-button" onClick={onFilter} type="button">
                    <Filter size={18} />
                    Dietary Filters
                </button>
                <button className="pos-cart-top-button" onClick={onCart} type="button">
                    <ShoppingCart size={20} />
                    View Cart
                    <span>{cartCount}</span>
                    <strong>{currency.format(cartTotal)}</strong>
                </button>
                {isLogoutVisible && (
                    <button className="pos-lock-button" onClick={onLock} type="button">
                        <Lock size={20} />
                        Lock / Log Out
                    </button>
                )}
            </div>
        </header>
    );
}

type MenuGridProps = {
    activeCategory: string;
    isLoading: boolean;
    items: MenuItem[];
    onItemClick: (item: MenuItem) => void;
};

export function MenuGrid({ activeCategory, isLoading, items, onItemClick }: MenuGridProps) {
    return (
        <>
            <section className="pos-menu-heading">
                <div>
                    <p>{activeCategory}</p>
                    <h1>{isLoading ? "Loading menu" : "Tap an item to add it to the cart"}</h1>
                </div>
                <div className="pos-result-count">{items.length} items</div>
            </section>
            <section className="pos-menu-grid" key={activeCategory}>
                {isLoading && <div className="pos-empty-state">Loading live menu data...</div>}
                {!isLoading && items.length === 0 && (
                    <div className="pos-empty-state">
                        <strong>No menu items found.</strong>
                        <span>Add menus and items in the admin dashboard, then reopen this table screen.</span>
                    </div>
                )}
                {!isLoading && items.map((item) => <MenuCard item={item} key={item.id} onClick={() => onItemClick(item)} />)}
            </section>
        </>
    );
}

function MenuCard({ item, onClick }: { item: MenuItem; onClick: () => void }) {
    return (
        <button className="pos-menu-card" onClick={onClick} type="button">
            <div className="pos-menu-card__image">
                <span>{getItemInitials(item.name)}</span>
            </div>
            <div className="pos-menu-card__body">
                <div className="pos-menu-card__title-row">
                    <h2>{item.name}</h2>
                    <strong>{currency.format(item.price)}</strong>
                </div>
                <p>{item.description}</p>
                <div className="pos-marker-row">
                    <span>{item.category}</span>
                    {item.cookingTime > 0 && <span>{item.cookingTime} min</span>}
                </div>
            </div>
        </button>
    );
}

type BottomBarProps = {
    cartCount: number;
    onSearchChange: (value: string) => void;
    orderedCount: number;
    searchTerm: string;
    table: string;
};

export function BottomBar({ cartCount, onSearchChange, orderedCount, searchTerm, table }: BottomBarProps) {
    return (
        <footer className="pos-bottom-bar">
            <div className="pos-bottom-bar__left">
                <div className="pos-search">
                    <Search size={18} />
                    <input onChange={(event) => onSearchChange(event.target.value)} placeholder="Search menu" value={searchTerm} />
                </div>
                <span>Session active</span>
            </div>
            <div className="pos-bottom-bar__right">
                <strong>Table {table}</strong>
                <span>{cartCount} in cart / {orderedCount} ordered</span>
            </div>
        </footer>
    );
}

export function Toast({ message }: { message: string }) {
    return <div className="pos-toast">{message}</div>;
}
