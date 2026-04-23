import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { ApiResponse } from "@/features/auth/types";

export function AuthPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [data, setData] = useState<ApiResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const login = async () => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            setError(error.message);
            return;
        }

        setError(null);
        console.log("Logged in");
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            setError(error.message);
            return;
        }

        setData(null);
        setError(null);
        console.log("Logged out");
    };

    const callBackend = async () => {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            setError(sessionError.message);
            return;
        }

        const token = sessionData.session?.access_token;

        if (!token) {
            setError("Login first");
            return;
        }

        try {
            const res = await fetch("/api/secure", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const errorText = await res.text();
                setError(`API error: ${res.status}${errorText ? ` - ${errorText}` : ""}`);
                return;
            }

            const result: ApiResponse = await res.json();
            setData(result);
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown network error";
            setError(`Request failed: ${message}`);
        }
    };

    return (
        <div style={{ padding: 20 }}>
            <h1>Supabase Auth</h1>

            <input
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
            />
            <br />

            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
            />
            <br />

            <button onClick={login}>Login</button>
            <button onClick={logout}>Logout</button>
            <button onClick={callBackend}>Call API</button>

            {error && <p style={{ color: "red" }}>{error}</p>}

            {data && (
                <pre>{JSON.stringify(data, null, 2)}</pre>
            )}
        </div>
    );
}
