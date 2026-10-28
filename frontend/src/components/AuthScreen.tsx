import React, { useState } from "react";

export interface AuthScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  sessionExpiredMessage?: string | null;
}

export function AuthScreen({
  onLogin,
  onRegister,
  sessionExpiredMessage,
}: AuthScreenProps): React.JSX.Element {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await onLogin(email.trim(), password);
      } else {
        await onRegister(
          email.trim(),
          password,
          displayName.trim() || undefined,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--sidebar-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "26rem",
          backgroundColor: "var(--bg-primary)",
          color: "var(--text-primary)",
          borderRadius: "12px",
          borderBottom: "6px solid #d4d5ff",
          padding: "2rem",
          boxShadow: "0 16px 36px rgba(0, 0, 0, 0.28)",
        }}
      >
        <h2
          style={{
            margin: "0 0 1.25rem 0",
            fontSize: "1.625rem",
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {mode === "login" ? "Log In" : "Sign Up"}
        </h2>

        {sessionExpiredMessage && (
          <div
            role="alert"
            style={{
              backgroundColor: "var(--pill-warning-bg)",
              color: "var(--pill-warning-text)",
              padding: "0.75rem",
              borderRadius: "6px",
              fontSize: "0.875rem",
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            {sessionExpiredMessage}
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: "var(--action-destructive-bg)",
              color: "var(--action-destructive-text)",
              padding: "0.75rem",
              borderRadius: "6px",
              fontSize: "0.875rem",
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <div style={{ marginBottom: "1rem" }}>
              <label
                htmlFor="auth-display-name"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  marginBottom: "0.25rem",
                }}
              >
                Display Name
              </label>
              <input
                id="auth-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Nguyen"
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--separator)",
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="auth-email"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 600,
                marginBottom: "0.25rem",
              }}
            >
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: "100%",
                height: "38px",
                padding: "0 0.75rem",
                borderRadius: "6px",
                border: "1px solid var(--separator)",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label
              htmlFor="auth-password"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 600,
                marginBottom: "0.25rem",
              }}
            >
              Password
            </label>
            <div
              style={{
                display: "flex",
                border: "1px solid var(--separator)",
                borderRadius: "6px",
                overflow: "hidden",
              }}
            >
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                style={{
                  flex: 1,
                  height: "38px",
                  padding: "0 0.75rem",
                  border: "none",
                  outline: "none",
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  border: "none",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-secondary)",
                  padding: "0 0.75rem",
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              height: "42px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "var(--action-primary)",
              color: "#ffffff",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.65 : 1,
            }}
          >
            {submitting
              ? "Please wait..."
              : mode === "login"
                ? "Log In"
                : "Create Account"}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.25rem",
            textAlign: "center",
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
          }}
        >
          {mode === "login" ? (
            <>
              Need an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--action-secondary-text)",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--action-secondary-text)",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Log In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
