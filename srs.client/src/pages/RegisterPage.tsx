import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { FormContainer } from "@/components/FormContainer";
import { Input } from "@/components/Input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase/client";

type RegisterErrors = {
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
};

export function RegisterPage() {
    const { theme, toggleTheme } = useTheme();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<RegisterErrors>({});
    const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validate = () => {
        const nextErrors: RegisterErrors = {};
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

        if (!fullName.trim()) {
            nextErrors.fullName = "Full name is required.";
        }

        if (!email.trim()) {
            nextErrors.email = "Email is required.";
        } else if (!emailPattern.test(email)) {
            nextErrors.email = "Enter a valid email address.";
        }

        if (!password.trim()) {
            nextErrors.password = "Password is required.";
        } else if (!passwordPattern.test(password)) {
            nextErrors.password =
                "Use at least 8 characters with one uppercase letter, one lowercase letter, one number, and one symbol.";
        }

        if (!confirmPassword.trim()) {
            nextErrors.confirmPassword = "Please confirm your password.";
        } else if (confirmPassword !== password) {
            nextErrors.confirmPassword = "Passwords do not match.";
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
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (error) {
                setFeedback({ type: "error", message: error.message });
                return;
            }

            setFeedback({
                type: "success",
                message: "Account created. Check your inbox to confirm your email. Your app profile will be created when you first sign in."
            });

            setFullName("");
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setErrors({});
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <FormContainer
            eyebrow="Create account"
            title="Launch your restaurant team hub"
            subtitle="Set up secure access for managers, staff, and service teams with a polished onboarding flow."
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
                    Already have an account? <Link to="/login">Back to login</Link>
                </p>
            }
        >
            <form className="auth-form auth-form--animated" onSubmit={handleSubmit} noValidate>
                <Input
                    id="register-name"
                    label="Full Name"
                    type="text"
                    autoComplete="name"
                    placeholder="Jamie Rivera"
                    value={fullName}
                    onChange={event => setFullName(event.target.value)}
                    error={errors.fullName}
                />

                <Input
                    id="register-email"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    placeholder="team@smartrestaurant.com"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    error={errors.email}
                />

                <div className="form-grid">
                    <Input
                        id="register-password"
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Create a secure password"
                        value={password}
                        onChange={event => setPassword(event.target.value)}
                        error={errors.password}
                        hint="At least 8 characters, including uppercase, lowercase, number, and symbol"
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

                    <Input
                        id="register-confirm-password"
                        label="Confirm Password"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Repeat your password"
                        value={confirmPassword}
                        onChange={event => setConfirmPassword(event.target.value)}
                        error={errors.confirmPassword}
                        action={
                            <button
                                type="button"
                                className="field__toggle"
                                onClick={() => setShowConfirmPassword(currentValue => !currentValue)}
                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                                {showConfirmPassword ? "◉" : "◌"}
                            </button>
                        }
                    />
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
                    Register
                </Button>
            </form>
        </FormContainer>
    );
}
