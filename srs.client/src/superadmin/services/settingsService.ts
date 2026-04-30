import type { FeatureFlag, SettingsState } from "@/superadmin/types";

const settingsStorageKey = "smart-restaurant-superadmin-settings";

const defaultSettings: SettingsState = {
    general: {
        platformName: "Smart Restaurant System",
        contactEmail: "support@smartrestaurant.local",
        logoUrl: "https://placehold.co/160x48?text=SRS"
    },
    featureFlags: [
        { id: "multi-tenant-orders", name: "Multi-tenant Orders", enabled: true, scope: "Global" },
        { id: "advanced-reports", name: "Advanced Reports", enabled: true, scope: "Pro" },
        { id: "ai-alerting", name: "AI Alerting", enabled: false, scope: "Enterprise" }
    ],
    emailTemplates: [
        {
            id: "welcome",
            name: "Welcome Email",
            subject: "Welcome to Smart Restaurant System",
            preview: "Hi there, your restaurant workspace is ready."
        },
        {
            id: "password-reset",
            name: "Password Reset",
            subject: "Reset your password",
            preview: "Use the secure link below to reset your password."
        }
    ],
    security: {
        passwordPolicy: "At least 8 characters, one uppercase, one lowercase, one number, and one symbol.",
        mfaRequired: false,
        sessionTimeoutMinutes: 30
    },
    integrations: [
        { id: "stripe", name: "Stripe", connected: false, detail: "Not connected yet." },
        { id: "sendgrid", name: "SendGrid", connected: false, detail: "Not connected yet." },
        { id: "s3", name: "Amazon S3", connected: false, detail: "Not connected yet." }
    ]
};

function hasWindow() {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readSettings(): SettingsState {
    if (!hasWindow()) {
        return structuredClone(defaultSettings);
    }

    const raw = window.localStorage.getItem(settingsStorageKey);
    if (!raw) {
        return structuredClone(defaultSettings);
    }

    try {
        return JSON.parse(raw) as SettingsState;
    } catch {
        return structuredClone(defaultSettings);
    }
}

function writeSettings(settings: SettingsState) {
    if (!hasWindow()) {
        return;
    }

    window.localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
}

export async function getSettingsState(): Promise<SettingsState> {
    return readSettings();
}

export async function saveGeneralSettings(payload: SettingsState["general"]) {
    const next = readSettings();
    next.general = payload;
    writeSettings(next);
    return payload;
}

export async function updateFeatureFlag(flag: FeatureFlag) {
    const next = readSettings();
    next.featureFlags = next.featureFlags.map(current => current.id === flag.id ? flag : current);
    writeSettings(next);
    return flag;
}

export async function saveSecuritySettings(payload: SettingsState["security"]) {
    const next = readSettings();
    next.security = payload;
    writeSettings(next);
    return payload;
}
