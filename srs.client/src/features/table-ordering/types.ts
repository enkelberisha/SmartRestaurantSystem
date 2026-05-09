export type MenuItem = {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    cookingTime: number;
    filters: string[];
};

export type CartLine = {
    key: string;
    item: MenuItem;
    notes: string;
    quantity: number;
};

export type PaymentStep = "choice" | "card" | null;

export type StaffGesture = {
    count: number;
    step: "logo" | "powered" | "unlocked";
};
