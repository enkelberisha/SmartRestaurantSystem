import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { OwnerPage } from "@/pages/roles/OwnerPage";
import { ManagerDashboardPage } from "@/manager/pages/ManagerDashboardPage";
import { ManagerKitchenPage } from "@/manager/pages/ManagerKitchenPage";
import { ManagerInventoryPage } from "@/manager/pages/ManagerInventoryPage";
import { ManagerMenusPage } from "@/manager/pages/ManagerMenusPage";
import { ManagerOrdersPage } from "@/manager/pages/ManagerOrdersPage";
import { ManagerTablesPage } from "@/manager/pages/ManagerTablesPage";
import { UserPage } from "@/pages/roles/UserPage";
import { SuperAdminPage } from "@/pages/roles/SuperAdminPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/admin/AdminLayout";
import { AdminRestaurantProvider } from "@/admin/context/AdminRestaurantContext";
import { AdminDashboardPage } from "@/admin/AdminDashboardPage";
import { RestaurantDetailsPage } from "@/admin/RestaurantDetailsPage";
import { TablesPage } from "@/admin/TablesPage";
import { MenuPage } from "@/admin/MenuPage";
import { StaffPage } from "@/admin/StaffPage";
import { SuperadminLayout } from "@/superadmin/components/SuperadminLayout";
import { SuperadminDashboardPage } from "@/superadmin/pages/SuperadminDashboardPage";
import { UsersRolesPage } from "@/superadmin/pages/UsersRolesPage";
import { TenantsPage } from "@/superadmin/pages/TenantsPage";
import { MonitoringPage } from "@/superadmin/pages/MonitoringPage";
import { AnalyticsPage } from "@/superadmin/pages/AnalyticsPage";
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
                        <ManagerDashboardPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/manager/orders"
                element={
                    <ProtectedRoute allowedRoles={["Manager"]}>
                        <ManagerOrdersPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/manager/tables"
                element={
                    <ProtectedRoute allowedRoles={["Manager"]}>
                        <ManagerTablesPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/manager/kitchen"
                element={
                    <ProtectedRoute allowedRoles={["Manager"]}>
                        <ManagerKitchenPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/manager/menus"
                element={
                    <ProtectedRoute allowedRoles={["Manager"]}>
                        <ManagerMenusPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/manager/inventory"
                element={
                    <ProtectedRoute allowedRoles={["Manager"]}>
                        <ManagerInventoryPage />
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
                path="/admin/*"
                element={
                    <ProtectedRoute allowedRoles={["Admin"]}>
                        <AdminRestaurantProvider>
                            <AdminLayout />
                        </AdminRestaurantProvider>
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="restaurant" element={<RestaurantDetailsPage />} />
                <Route path="tables" element={<TablesPage />} />
                <Route path="menu" element={<MenuPage />} />
                <Route path="staff" element={<StaffPage />} />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
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
                <Route path="monitoring" element={<MonitoringPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="moderation" element={<ModerationPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="audit" element={<AuditLogsPage />} />
                <Route path="*" element={<Navigate to="/superadmin/dashboard" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
