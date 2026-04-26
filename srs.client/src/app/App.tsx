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
                path="/superadmin"
                element={
                    <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                        <SuperAdminPage />
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
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
