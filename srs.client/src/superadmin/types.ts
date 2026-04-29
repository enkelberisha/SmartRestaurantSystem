import type { AppRole } from "@/lib/auth/roles";

export type UserStatus = "Active";
export type PlanTier = "Free" | "Pro" | "Enterprise";
export type TenantStatus = "Active" | "Inactive";
export type BillingStatus = "Paid" | "Past Due" | "Canceled";
export type ModerationStatus = "Pending" | "Reviewed" | "Escalated";
export type ContentType = "Post" | "Comment" | "File";

export type SuperadminUser = {
    id: number;
    supabaseUserId: string;
    email: string;
    role: AppRole;
    tenantId: string | null;
    tenantName: string | null;
    name: string;
    status: UserStatus;
    createdAt: string;
    lastLogin?: string;
};

export type RoleDefinition = {
    id: string;
    name: string;
    description: string;
    permissions: string[];
};

export type Tenant = {
    id: string;
    name: string;
    isActive: boolean;
    usersCount: number;
    createdDate: string;
    plan?: PlanTier;
    status?: BillingStatus | TenantStatus;
    billingStatus?: BillingStatus;
    configOverrides?: string[];
};

export type TenantMember = {
    id: number;
    supabaseUserId: string;
    email: string;
    role: AppRole;
    createdAt: string;
};

export type ActivityItem = {
    id: string;
    title: string;
    detail: string;
    timestamp: string;
    tone: "info" | "success" | "warning";
};

export type ChartPoint = {
    label: string;
    value: number;
    secondaryValue?: number;
};

export type DashboardSummary = {
    totalUsers: number;
    activeTenants: number;
    mrr: number;
    pendingModeration: number;
    recentActivity: ActivityItem[];
    userGrowth: ChartPoint[];
    revenueTrend: ChartPoint[];
};

export type AnalyticsSummary = {
    signupSeries: ChartPoint[];
    activeUsersSeries: ChartPoint[];
    tenantGrowthSeries: ChartPoint[];
    featureUsage: Array<{ label: string; value: number }>;
    dateRangeLabel: string;
};

export type BillingRecord = {
    tenantId: string;
    tenantName: string;
    plan: PlanTier;
    mrr: number;
    status: BillingStatus;
    nextBillingDate: string;
};

export type Invoice = {
    id: string;
    tenantId: string;
    amount: number;
    issuedDate: string;
    status: BillingStatus;
};

export type ModerationItem = {
    id: string;
    type: ContentType;
    author: string;
    tenant: string;
    flaggedReason: string;
    date: string;
    status: ModerationStatus;
};

export type FeatureFlag = {
    id: string;
    name: string;
    enabled: boolean;
    scope: "Global" | PlanTier;
};

export type EmailTemplate = {
    id: string;
    name: string;
    subject: string;
    preview: string;
};

export type IntegrationStatus = {
    id: string;
    name: string;
    connected: boolean;
    detail: string;
};

export type SettingsState = {
    general: {
        platformName: string;
        contactEmail: string;
        logoUrl: string;
    };
    featureFlags: FeatureFlag[];
    emailTemplates: EmailTemplate[];
    security: {
        passwordPolicy: string;
        mfaRequired: boolean;
        sessionTimeoutMinutes: number;
    };
    integrations: IntegrationStatus[];
};

export type AuditLog = {
    id: string;
    actor: string;
    action: string;
    target: string;
    timestamp: string;
    ip: string;
    detail: string;
};
