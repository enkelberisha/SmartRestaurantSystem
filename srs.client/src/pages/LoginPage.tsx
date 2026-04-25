import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { FormContainer } from "@/components/FormContainer";
import { Input } from "@/components/Input";
import { SocialButton } from "@/components/SocialButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase/client";

const rememberedEmailKey = "srs-remembered-email";

export function LoginPage() {
    const { theme, toggleTheme } = useTheme();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const storedEmail = window.localStorage.getItem(rememberedEmailKey);
        if (storedEmail) {
            setEmail(storedEmail);
        }
    }, []);

    const validate = () => {
        const nextErrors: { email?: string; password?: string } = {};
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email.trim()) {
            nextErrors.email = "Email is required.";
        } else if (!emailPattern.test(email)) {
            nextErrors.email = "Enter a valid email address.";
        }

        if (!password.trim()) {
            nextErrors.password = "Password is required.";
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFeedback(null);

        if (!validate()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                setFeedback({ type: "error", message: error.message });
                return;
            }

            if (rememberMe) {
                window.localStorage.setItem(rememberedEmailKey, email);
            } else {
                window.localStorage.removeItem(rememberedEmailKey);
            }

            setFeedback({
                type: "success",
                message: "Welcome back. Your restaurant workspace is ready."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForgotPassword = async () => {
        setFeedback(null);

        if (!email.trim()) {
            setErrors(currentErrors => ({
                ...currentErrors,
                email: "Enter your email first so we can send a reset link."
            }));
            return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email);

        if (error) {
            setFeedback({ type: "error", message: error.message });
            return;
        }

        setFeedback({
            type: "success",
            message: "Password reset instructions have been sent to your email."
        });
    };

    return (
        <FormContainer
            eyebrow="Sign in"
            title="Serve every table with confidence"
            subtitle="Manage reservations, orders, and staff access from a single modern dashboard."
            aside={
                <>
                    <Link to="/" className="auth-back-link">
                        <Button variant="ghost" className="auth-back-button" aria-label="Back to home">
                            ←
                        </Button>
                    </Link>
                    <ThemeToggle theme={theme} onToggle={toggleTheme} />
                </>
            }
            footer={
                <p>
                    New here? <Link to="/register">Create an account</Link>
                </p>
            }
        >
            <form className="auth-form auth-form--animated" onSubmit={handleSubmit} noValidate>
                <Input
                    id="login-email"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    placeholder="manager@smartrestaurant.com"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    error={errors.email}
                />

                <Input
                    id="login-password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    error={errors.password}
                    action={
                        <button
                            type="button"
                            className="field__toggle"
                            onClick={() => setShowPassword(currentValue => !currentValue)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? "◉" : "◌"}
                        </button>
                    }
                />

                <div className="auth-form__options">
                    <label className="checkbox">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={event => setRememberMe(event.target.checked)}
                        />
                        <span>Remember me</span>
                    </label>

                    <button type="button" className="text-link" onClick={handleForgotPassword}>
                        Forgot Password?
                    </button>
                </div>

                {feedback && (
                    <div
                        className={`feedback feedback--${feedback.type}`}
                        role={feedback.type === "error" ? "alert" : "status"}
                    >
                        {feedback.message}
                    </div>
                )}

                <Button type="submit" fullWidth isLoading={isSubmitting}>
                    Login
                </Button>

                <div className="auth-divider">
                    <span>or continue with</span>
                </div>

                <div className="social-grid" aria-label="Social login buttons">
                    <SocialButton provider="Google" aria-label="Continue with Google" />
                    <SocialButton provider="Facebook" aria-label="Continue with Facebook" />
                </div>
            </form>
        </FormContainer>
    );
}
