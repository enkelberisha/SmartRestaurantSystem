import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppRole } from "@/lib/auth/roles";
import {
    getUsers,
    createUser,
    deleteUser,
    updateUserRole
} from "@/superadmin/services/userService";
import { getRoles, saveRoleDefinition } from "@/superadmin/services/roleService";
import {
    createTenant,
    deleteTenant,
    getTenantMembers,
    getTenants,
    updateTenant
} from "@/superadmin/services/tenantService";
import { exportAnalyticsCsv, getAnalyticsSummary } from "@/superadmin/services/analyticsService";
import { getAuditLogs } from "@/superadmin/services/auditLogService";
import { getBillingOverview, getInvoicesForTenant, updateBillingPlan } from "@/superadmin/services/billingService";
import { getDashboardOverview } from "@/superadmin/services/dashboardService";
import { getModerationItems, updateModerationStatus } from "@/superadmin/services/moderationService";
import {
    getSettingsState,
    saveGeneralSettings,
    saveSecuritySettings,
    updateFeatureFlag
} from "@/superadmin/services/settingsService";
import type { FeatureFlag, PlanTier, RoleDefinition } from "@/superadmin/types";

export function useDashboardQuery() {
    return useQuery({ queryKey: ["sa", "dashboard"], queryFn: getDashboardOverview });
}

export function useUsersQuery() {
    return useQuery({ queryKey: ["sa", "users"], queryFn: getUsers });
}

export function useRolesQuery() {
    return useQuery({ queryKey: ["sa", "roles"], queryFn: getRoles });
}

export function useTenantsQuery() {
    return useQuery({ queryKey: ["sa", "tenants"], queryFn: getTenants });
}

export function useAnalyticsQuery(rangeLabel: string) {
    return useQuery({ queryKey: ["sa", "analytics", rangeLabel], queryFn: () => getAnalyticsSummary(rangeLabel) });
}

export function useBillingQuery() {
    return useQuery({ queryKey: ["sa", "billing"], queryFn: getBillingOverview });
}

export function useModerationQuery() {
    return useQuery({ queryKey: ["sa", "moderation"], queryFn: getModerationItems });
}

export function useSettingsQuery() {
    return useQuery({ queryKey: ["sa", "settings"], queryFn: getSettingsState });
}

export function useAuditLogsQuery() {
    return useQuery({ queryKey: ["sa", "audit"], queryFn: getAuditLogs });
}

export function useTenantMembersQuery(tenantId: string | null) {
    return useQuery({
        queryKey: ["sa", "tenant-members", tenantId],
        queryFn: () => getTenantMembers(tenantId ?? ""),
        enabled: Boolean(tenantId)
    });
}

export function useInvoicesQuery(tenantId: string | null) {
    return useQuery({
        queryKey: ["sa", "invoices", tenantId],
        queryFn: () => getInvoicesForTenant(tenantId ?? ""),
        enabled: Boolean(tenantId)
    });
}

export function useInviteUserMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createUser,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["sa", "users"] });
            await queryClient.invalidateQueries({ queryKey: ["sa", "dashboard"] });
        }
    });
}

export function useUpdateUserRoleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, role }: { userId: number; role: AppRole }) => updateUserRole(userId, role),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["sa", "users"] });
        }
    });
}

export function useDeleteUserMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteUser,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["sa", "users"] });
            await queryClient.invalidateQueries({ queryKey: ["sa", "dashboard"] });
        }
    });
}

export function useCreateTenantMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createTenant,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["sa", "tenants"] });
            await queryClient.invalidateQueries({ queryKey: ["sa", "dashboard"] });
        }
    });
}

export function useSaveRoleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (role: RoleDefinition) => saveRoleDefinition(role),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["sa", "roles"] });
        }
    });
}

export function useUpdateTenantMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ tenantId, name, isActive }: { tenantId: string; name: string; isActive: boolean }) =>
            updateTenant(tenantId, { name, isActive }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["sa", "tenants"] });
        }
    });
}

export function useDeleteTenantMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteTenant,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["sa", "tenants"] });
        }
    });
}

export function useChangeBillingPlanMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ tenantId, plan }: { tenantId: string; plan: PlanTier }) => updateBillingPlan(tenantId, plan),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["sa", "billing"] });
            await queryClient.invalidateQueries({ queryKey: ["sa", "tenants"] });
        }
    });
}

export function useUpdateModerationMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ ids, status }: { ids: string[]; status: "Pending" | "Reviewed" | "Escalated" }) =>
            updateModerationStatus(ids, status),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["sa", "moderation"] });
            await queryClient.invalidateQueries({ queryKey: ["sa", "dashboard"] });
        }
    });
}

export function useSaveGeneralSettingsMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: saveGeneralSettings,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["sa", "settings"] });
        }
    });
}

export function useUpdateFeatureFlagMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (flag: FeatureFlag) => updateFeatureFlag(flag),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["sa", "settings"] });
        }
    });
}

export function useSaveSecuritySettingsMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: saveSecuritySettings,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["sa", "settings"] });
        }
    });
}

export function useExportAnalyticsMutation() {
    return useMutation({
        mutationFn: exportAnalyticsCsv
    });
}
