import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRestaurantProvider } from "@/features/admin/context/AdminRestaurantContext";

const HomePage = lazy(() => import("@/pages/HomePage").then((module) => ({ default: module.HomePage })));
const LoginPage = lazy(() => import("@/pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("@/pages/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const PosPage = lazy(() => import("@/pages/PosPage").then((module) => ({ default: module.PosPage })));
const TableOrderingPage = lazy(() =>
    import("@/pages/TableOrderingPage").then((module) => ({ default: module.TableOrderingPage })),
);
const DevicePlaceholderPage = lazy(() =>
    import("@/pages/DevicePlaceholderPage").then((module) => ({ default: module.DevicePlaceholderPage })),
);
const KitchenDevicePage = lazy(() =>
    import("@/pages/KitchenDevicePage").then((module) => ({ default: module.KitchenDevicePage })),
);
const OwnerPage = lazy(() => import("@/pages/owner/OwnerPage").then((module) => ({ default: module.OwnerPage })));

const ManagerDashboardPage = lazy(() =>
    import("@/manager/pages/ManagerDashboardPage").then((module) => ({ default: module.ManagerDashboardPage })),
);
const ManagerKitchenPage = lazy(() =>
    import("@/manager/pages/ManagerKitchenPage").then((module) => ({ default: module.ManagerKitchenPage })),
);
const ManagerInventoryPage = lazy(() =>
    import("@/manager/pages/ManagerInventoryPage").then((module) => ({ default: module.ManagerInventoryPage })),
);
const ManagerAiInsightsPage = lazy(() =>
    import("@/manager/pages/ManagerAiInsightsPage").then((module) => ({ default: module.ManagerAiInsightsPage })),
);
const ManagerMenusPage = lazy(() =>
    import("@/manager/pages/ManagerMenusPage").then((module) => ({ default: module.ManagerMenusPage })),
);
const ManagerOrdersPage = lazy(() =>
    import("@/manager/pages/ManagerOrdersPage").then((module) => ({ default: module.ManagerOrdersPage })),
);
const ManagerTablesPage = lazy(() =>
    import("@/manager/pages/ManagerTablesPage").then((module) => ({ default: module.ManagerTablesPage })),
);

const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout").then((module) => ({ default: module.AdminLayout })));
const AdminDashboardPage = lazy(() =>
    import("@/pages/admin/AdminDashboardPage").then((module) => ({ default: module.AdminDashboardPage })),
);
const RestaurantDetailsPage = lazy(() =>
    import("@/pages/admin/RestaurantDetailsPage").then((module) => ({ default: module.RestaurantDetailsPage })),
);
const TablesPage = lazy(() => import("@/pages/admin/TablesPage").then((module) => ({ default: module.TablesPage })));
const MenuPage = lazy(() => import("@/pages/admin/MenuPage").then((module) => ({ default: module.MenuPage })));
const StaffPage = lazy(() => import("@/pages/admin/StaffPage").then((module) => ({ default: module.StaffPage })));

const SuperadminLayout = lazy(() =>
    import("@/pages/superadmin/SuperadminLayout").then((module) => ({ default: module.SuperadminLayout })),
);
const SuperadminDashboardPage = lazy(() =>
    import("@/pages/superadmin/SuperadminDashboardPage").then((module) => ({
        default: module.SuperadminDashboardPage,
    })),
);
const UsersRolesPage = lazy(() =>
    import("@/pages/superadmin/UsersRolesPage").then((module) => ({ default: module.UsersRolesPage })),
);
const TenantsPage = lazy(() =>
    import("@/pages/superadmin/TenantsPage").then((module) => ({ default: module.TenantsPage })),
);
const MonitoringPage = lazy(() =>
    import("@/pages/superadmin/MonitoringPage").then((module) => ({ default: module.MonitoringPage })),
);
const AnalyticsPage = lazy(() =>
    import("@/pages/superadmin/AnalyticsPage").then((module) => ({ default: module.AnalyticsPage })),
);
const AuditLogsPage = lazy(() =>
    import("@/pages/superadmin/AuditLogsPage").then((module) => ({ default: module.AuditLogsPage })),
);

function RouteFallback() {
    return (
        <main className="app-route-fallback" aria-live="polite">
            Loading workspace...
        </main>
    );
}

export default function App() {
    return (
        <Suspense fallback={<RouteFallback />}>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                <Route
                    path="/table"
                    element={
                        <ProtectedRoute allowedRoles={["TableDevice", "Manager", "Admin", "SuperAdmin"]}>
                            <TableOrderingPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/ordering"
                    element={
                        <ProtectedRoute allowedRoles={["TableDevice", "Manager", "Admin", "SuperAdmin"]}>
                            <TableOrderingPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/pos"
                    element={
                        <ProtectedRoute allowedRoles={["PosDevice"]}>
                            <PosPage />
                        </ProtectedRoute>
                    }
                />

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
                    path="/manager/ai-insights"
                    element={
                        <ProtectedRoute allowedRoles={["Manager"]}>
                            <ManagerAiInsightsPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin/*"
                    element={
                        <ProtectedRoute allowedRoles={["Owner", "Manager", "Admin"]}>
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
                    path="/host"
                    element={
                        <ProtectedRoute allowedRoles={["HostDevice", "Manager", "Admin", "SuperAdmin"]}>
                            <AdminRestaurantProvider>
                                <TablesPage />
                            </AdminRestaurantProvider>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/kitchen"
                    element={
                        <ProtectedRoute allowedRoles={["KitchenDevice", "Manager", "Admin", "SuperAdmin"]}>
                            <KitchenDevicePage />
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
                    <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
                    <Route path="dashboard" element={<SuperadminDashboardPage />} />
                    <Route path="users" element={<UsersRolesPage />} />
                    <Route path="tenants" element={<TenantsPage />} />
                    <Route path="monitoring" element={<MonitoringPage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="audit" element={<AuditLogsPage />} />
                    <Route path="*" element={<Navigate to="/superadmin/dashboard" replace />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}
