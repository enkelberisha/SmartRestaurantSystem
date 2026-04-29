import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { OwnerPage } from "@/pages/roles/OwnerPage";
import { ManagerPage } from "@/pages/roles/ManagerPage";
import { UserPage } from "@/pages/roles/UserPage";
import { SuperAdminPage } from "@/pages/roles/SuperAdminPage";
import { AdminPage } from "@/pages/roles/AdminPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SuperadminLayout } from "@/superadmin/components/SuperadminLayout";
import { SuperadminDashboardPage } from "@/superadmin/pages/SuperadminDashboardPage";
import { UsersRolesPage } from "@/superadmin/pages/UsersRolesPage";
import { TenantsPage } from "@/superadmin/pages/TenantsPage";
import { AnalyticsPage } from "@/superadmin/pages/AnalyticsPage";
import { BillingPage } from "@/superadmin/pages/BillingPage";
import { ModerationPage } from "@/superadmin/pages/ModerationPage";
import { SettingsPage } from "@/superadmin/pages/SettingsPage";
import { AuditLogsPage } from "@/superadmin/pages/AuditLogsPage";

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
                path="/owner"
                element={
                    <ProtectedRoute allowedRoles={["Owner"]}>
                        <OwnerPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/manager"
                element={
                    <ProtectedRoute allowedRoles={["Manager"]}>
                        <ManagerPage/>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/user"
                element={
                    <ProtectedRoute allowedRoles={["User"]}>
                        <UserPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin"
                element={
                    <ProtectedRoute allowedRoles={["Admin"]}>
                        <AdminPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/superadmin/*"
                element={
                    <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                        <SuperadminLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<SuperAdminPage />} />
                <Route path="dashboard" element={<SuperadminDashboardPage />} />
                <Route path="users" element={<UsersRolesPage />} />
                <Route path="tenants" element={<TenantsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="moderation" element={<ModerationPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="audit" element={<AuditLogsPage />} />
                <Route path="*" element={<Navigate to="/superadmin/dashboard" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
