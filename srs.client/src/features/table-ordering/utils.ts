import type { AdminMenu, AdminMenuItem } from "@/lib/admin/adminService";
import type { CartLine, MenuItem } from "@/features/table-ordering/types";

export const defaultTablePin = "1234";

export const currency = new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency"
});

export function cartLines(cart: Record<number, CartLine>) {
    return Object.values(cart);
}

export function lineCount(lines: CartLine[]) {
    return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function lineTotal(lines: CartLine[]) {
    return lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
}

function normalizeNotes(notes: string) {
    return notes.trim().replace(/\s+/g, " ");
}

export function cartLineKey(itemId: number, notes: string) {
    const normalizedNotes = normalizeNotes(notes).toLowerCase();
    return `${itemId}:${normalizedNotes}`;
}

export function addLine(cart: Record<string, CartLine>, item: MenuItem, quantity: number, notes = "") {
    const normalizedNotes = normalizeNotes(notes);
    const key = cartLineKey(item.id, normalizedNotes);

    return {
        ...cart,
        [key]: {
            key,
            item,
            notes: normalizedNotes,
            quantity: (cart[key]?.quantity ?? 0) + quantity
        }
    };
}

export function mergeLines(current: Record<string, CartLine>, lines: CartLine[]) {
    return lines.reduce((next, line) => addLine(next, line.item, line.quantity, line.notes), { ...current });
}

export function getItemInitials(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

export function mapMenuItems(items: AdminMenuItem[], menus: AdminMenu[]): MenuItem[] {
    const menusById = new Map(menus.map((menu) => [menu.id, menu.name]));

    return items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "No description added yet.",
        price: item.price,
        category: menusById.get(item.menuId) ?? "Unassigned",
        cookingTime: item.cookingTime,
        filters: item.filters ?? []
    }));
}

export async function enterFullscreen() {
    if (document.fullscreenElement || !document.documentElement.requestFullscreen) {
        return;
    }

    try {
        await document.documentElement.requestFullscreen();
    } catch {
        // Fullscreen requires a trusted user gesture.
    }
}

export async function exitFullscreen() {
    if (!document.fullscreenElement || !document.exitFullscreen) {
        return;
    }

    try {
        await document.exitFullscreen();
    } catch {
        // Ignore browser-level fullscreen exit failures.
    }
}
