import React, { useState } from "react";

import {
    auth,
    provider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile
} from "../../firebase-config";

function getAuthErrorMessage(error) {
    const messages = {
        "auth/invalid-credential":
            "The email or password is incorrect.",

        "auth/email-already-in-use":
            "An account with this email already exists.",

        "auth/weak-password":
            "Password must be at least 6 characters.",

        "auth/invalid-email":
            "Please enter a valid email address.",

        "auth/popup-closed-by-user":
            "The sign-in window was closed."
    };

    return (
        messages[error.code] ||
        "Unable to sign in. Please try again."
    );
}

export default function AuthPanel({ onClose }) {
    const [isRegistering, setIsRegistering] = useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [authError, setAuthError] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();

        setAuthError("");
        setMessage("");
        setBusy(true);

        try {
            if (isRegistering) {
                const result =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );

                if (name.trim()) {
                    await updateProfile(result.user, {
                        displayName: name.trim()
                    });
                }
            } else {
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );
            }

            onClose();

        } catch (error) {
            console.error(error);
            setAuthError(getAuthErrorMessage(error));

        } finally {
            setBusy(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setAuthError("");
        setMessage("");
        setBusy(true);

        try {
            await signInWithPopup(auth, provider);
            onClose();

        } catch (error) {
            console.error(error);
            setAuthError(getAuthErrorMessage(error));

        } finally {
            setBusy(false);
        }
    };

    const handleResetPassword = async () => {
        if (!email.trim()) {
            setAuthError("Enter your email address first.");
            return;
        }

        setAuthError("");
        setMessage("");

        try {
            await sendPasswordResetEmail(
                auth,
                email.trim()
            );

            setMessage("Password reset email sent.");

        } catch (error) {
            console.error(error);
            setAuthError(getAuthErrorMessage(error));
        }
    };

    return (
        <section
            className="auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
        >
            <button
                className="modal-close"
                type="button"
                onClick={onClose}
                aria-label="Close sign in"
            >
                ×
            </button>

            <div className="auth-panel">

                <h2 id="auth-title">
                    {isRegistering
                        ? "Create your account"
                        : "Welcome back"}
                </h2>

                <p>
                    {isRegistering
                        ? "Create an account to save your scores."
                        : "Sign in to save your leaderboard scores."}
                </p>

                <form
                    className="auth-form"
                    onSubmit={handleSubmit}
                >

                    {isRegistering && (
                        <input
                            aria-label="Name"
                            type="text"
                            placeholder="Name"
                            value={name}
                            onChange={(event) =>
                                setName(event.target.value)
                            }
                        />
                    )}

                    <input
                        aria-label="Email"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(event) =>
                            setEmail(event.target.value)
                        }
                        required
                    />

                    <input
                        aria-label="Password"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(event) =>
                            setPassword(event.target.value)
                        }
                        minLength="6"
                        required
                    />

                    <button
                        className="primary-button"
                        type="submit"
                        disabled={busy}
                    >
                        {busy
                            ? "Please wait..."
                            : isRegistering
                                ? "Create Account"
                                : "Sign In"}
                    </button>

                </form>

                <button
                    className="google-button"
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={busy}
                >
                    Continue with Google
                </button>

                {!isRegistering && (
                    <button
                        className="text-button"
                        type="button"
                        onClick={handleResetPassword}
                    >
                        Forgot password?
                    </button>
                )}

                <button
                    className="text-button"
                    type="button"
                    onClick={() => {
                        setIsRegistering(!isRegistering);
                        setAuthError("");
                        setMessage("");
                    }}
                >
                    {isRegistering
                        ? "Already have an account? Sign in"
                        : "New here? Create an account"}
                </button>

                {authError && (
                    <p className="error" role="alert">
                        {authError}
                    </p>
                )}

                {message && (
                    <p className="success-msg" role="status">
                        {message}
                    </p>
                )}

            </div>
        </section>
    );
}