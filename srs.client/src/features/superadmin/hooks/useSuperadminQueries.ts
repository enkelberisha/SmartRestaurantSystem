import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppRole } from "@/lib/auth/roles";
import {
    getUsers,
    createUser,
    deleteUser,
    updateUserRole
} from "@/features/superadmin/services/userService";
import { getRoles, saveRoleDefinition } from "@/features/superadmin/services/roleService";
import {
    createTenant,
    deleteTenant,
    getTenantMembers,
    getTenants,
    updateTenant
} from "@/features/superadmin/services/tenantService";
import { exportAnalyticsCsv, getAnalyticsSummary } from "@/features/superadmin/services/analyticsService";
import { getAuditLogs } from "@/features/superadmin/services/auditLogService";
import { getDashboardOverview } from "@/features/superadmin/services/dashboardService";
import { getModerationItems, updateModerationStatus } from "@/features/superadmin/services/moderationService";
import { getMonitoringSummary } from "@/features/superadmin/services/monitoringService";
import { getSystemRestaurants } from "@/features/superadmin/services/monitoringService";
import {
    getSettingsState,
    saveGeneralSettings,
    saveSecuritySettings,
    updateFeatureFlag
} from "@/features/superadmin/services/settingsService";
import type { FeatureFlag, RoleDefinition } from "@/features/superadmin/types";

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

export function useMonitoringQuery() {
    return useQuery({ queryKey: ["sa", "monitoring"], queryFn: getMonitoringSummary });
}

export function useSystemRestaurantsQuery() {
    return useQuery({ queryKey: ["sa", "system-restaurants"], queryFn: getSystemRestaurants });
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
        queryFn: async () => [],
        enabled: Boolean(tenantId)
    });
}

export function useCreateUserMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createUser,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["sa", "users"] });
            await queryClient.invalidateQueries({ queryKey: ["sa", "dashboard"] });
            await queryClient.invalidateQueries({ queryKey: ["sa", "monitoring"] });
        }
    });
}

export function useUpdateUserMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, role, tenantId, restaurantId }: { userId: number; role: AppRole; tenantId: string | null; restaurantId?: number | null }) =>
            updateUserRole(userId, role, tenantId, restaurantId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["sa", "users"] });
            await queryClient.invalidateQueries({ queryKey: ["sa", "dashboard"] });
            await queryClient.invalidateQueries({ queryKey: ["sa", "monitoring"] });
            await queryClient.invalidateQueries({ queryKey: ["sa", "system-restaurants"] });
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
            await queryClient.invalidateQueries({ queryKey: ["sa", "monitoring"] });
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
            await queryClient.invalidateQueries({ queryKey: ["sa", "monitoring"] });
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
            await queryClient.invalidateQueries({ queryKey: ["sa", "monitoring"] });
        }
    });
}

export function useDeleteTenantMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteTenant,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["sa", "tenants"] });
            await queryClient.invalidateQueries({ queryKey: ["sa", "monitoring"] });
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
