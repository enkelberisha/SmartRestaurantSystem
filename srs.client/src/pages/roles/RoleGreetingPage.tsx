type RoleGreetingPageProps = {
    role: "Owner" | "Manager" | "User" | "SuperAdmin" | "Admin";
};

export function RoleGreetingPage({ role }: RoleGreetingPageProps) {
    return (
        <main className="role-shell">
            <section className="role-card">
                <p className="role-card__eyebrow">Role Page</p>
                <h1>Hello {role}</h1>
            </section>
        </main>
    );
}
