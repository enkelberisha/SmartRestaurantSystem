import { RoleGreetingPage } from "@/pages/roles/RoleGreetingPage";

export function UsersPlaceholderPage({ role }: { role: "Manager" | "User" }) {
    return <RoleGreetingPage role={role} />;
}
