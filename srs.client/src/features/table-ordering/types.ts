export type MenuItem = {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    cookingTime: number;
};

export type CartLine = {
    item: MenuItem;
    quantity: number;
};

export type PaymentStep = "choice" | "card" | null;

export type StaffGesture = {
    count: number;
    step: "logo" | "powered" | "unlocked";
};
