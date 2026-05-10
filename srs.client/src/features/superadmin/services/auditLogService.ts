import type { AuditLog } from "@/features/superadmin/types";
import { authorizedApiFetch } from "@/lib/auth/authService";

export async function getAuditLogs(): Promise<AuditLog[]> {
    const response = await authorizedApiFetch("/api/audit-logs");

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to load audit logs.");
    }

    return (await response.json()) as AuditLog[];
}
