import type { FeatureFlag, SettingsState } from "@/superadmin/types";

const defaultSettings: SettingsState = {
    general: {
        platformName: "",
        contactEmail: "",
        logoUrl: ""
    },
    featureFlags: [],
    emailTemplates: [],
    security: {
        passwordPolicy: "",
        mfaRequired: false,
        sessionTimeoutMinutes: 30
    },
    integrations: []
};

export async function getSettingsState(): Promise<SettingsState> {
    return structuredClone(defaultSettings);
}

export async function saveGeneralSettings(payload: SettingsState["general"]) {
    defaultSettings.general = payload;
    return payload;
}

export async function updateFeatureFlag(flag: FeatureFlag) {
    return flag;
}

export async function saveSecuritySettings(payload: SettingsState["security"]) {
    defaultSettings.security = payload;
    return payload;
}
