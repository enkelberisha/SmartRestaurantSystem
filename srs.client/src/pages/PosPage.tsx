import { useState } from "react";
import { Button } from "@/components/Button";
import { authorizedApiFetch } from "@/lib/auth/authService";

type PosWaiterSession = {
    staffId: number;
    fullName: string;
    restaurantId: number;
    tenantId: string;
    sessionId: number;
    openedAt: string;
};

async function loginWaiter(credentialValue: string): Promise<PosWaiterSession> {
    const response = await authorizedApiFetch("/api/pos/waiter-login", {
        method: "POST",
        body: JSON.stringify({ credentialValue })
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({ message: "Waiter login failed." }));
        throw new Error(payload.message ?? "Waiter login failed.");
    }

    return response.json() as Promise<PosWaiterSession>;
}

export function PosPage() {
    const [credentialValue, setCredentialValue] = useState("");
    const [session, setSession] = useState<PosWaiterSession | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        try {
            setIsSubmitting(true);
            setError(null);
            const nextSession = await loginWaiter(credentialValue);
            setSession(nextSession);
            setCredentialValue("");
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Waiter login failed.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="role-shell">
            <section className="role-card" style={{ maxWidth: 540 }}>
                <p className="role-card__eyebrow">POS Device</p>
                <h1>Waiter Login</h1>
                <p>Scan the waiter card or enter the waiter PIN to unlock this POS session.</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <label className="field">
                        <span className="field__label">Waiter Card / PIN / ID</span>
                        <input
                            className="field__input"
                            value={credentialValue}
                            onChange={event => setCredentialValue(event.target.value)}
                            required
                        />
                    </label>
                    <Button type="submit" isLoading={isSubmitting} fullWidth>
                        Login Waiter
                    </Button>
                </form>

                {error && <div className="feedback feedback--error">{error}</div>}

                {session && (
                    <div className="feedback feedback--success" style={{ marginTop: 16 }}>
                        Logged in as {session.fullName} (session #{session.sessionId})
                    </div>
                )}
            </section>
        </main>
    );
}
