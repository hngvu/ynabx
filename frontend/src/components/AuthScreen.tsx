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

  const handleFillDemo = () => {
    setEmail("vuhse182692@fpt.edu.vn");
    setPassword("password123");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#1c1f58", // Real YNAB deep navy sidebar brand color
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        fontFamily: "Figtree, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "26rem",
          backgroundColor: "#ffffff",
          color: "#1c1f58",
          borderRadius: "12px",
          padding: "2.25rem 2rem",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* YNAB Logo & App Header */}
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", width: "52px", height: "52px", borderRadius: "12px", backgroundColor: "#f1f1ff", marginBottom: "0.5rem" }}>
            <svg width="34" height="34" viewBox="0 0 24 24" style={{ color: "#545bfe" }}>
              <use href="#icon_sprite_ynab_logo"></use>
            </svg>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#1c1f58",
            }}
          >
            YNAB
          </h1>
          <h2
            style={{
              margin: "0.25rem 0 0 0",
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "#6e7a88",
            }}
          >
            {mode === "login" ? "Log In" : "Sign Up"}
          </h2>
        </div>

        {sessionExpiredMessage && (
          <div
            role="alert"
            style={{
              backgroundColor: "var(--pill-warning-bg, #fef5e6)",
              color: "var(--pill-warning-text, #8e5b00)",
              border: "1px solid var(--pill-warning-border, #fde0ad)",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              marginBottom: "1.25rem",
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            {sessionExpiredMessage}
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: "var(--pill-negative-bg, #fde8e8)",
              color: "var(--pill-negative-text, #bf2e3b)",
              border: "1px solid rgba(191, 46, 59, 0.2)",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              marginBottom: "1.25rem",
              textAlign: "center",
              fontWeight: 600,
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
                  marginBottom: "0.35rem",
                  color: "#223243",
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
                  height: "40px",
                  padding: "0 0.875rem",
                  borderRadius: "6px",
                  border: "1px solid #d2d8de",
                  backgroundColor: "#ffffff",
                  color: "#1c1f58",
                  fontSize: "0.9375rem",
                  boxSizing: "border-box",
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
                marginBottom: "0.35rem",
                color: "#223243",
              }}
            >
              Email Address
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
                height: "40px",
                padding: "0 0.875rem",
                borderRadius: "6px",
                border: "1px solid #d2d8de",
                backgroundColor: "#ffffff",
                color: "#1c1f58",
                fontSize: "0.9375rem",
                boxSizing: "border-box",
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
                marginBottom: "0.35rem",
                color: "#223243",
              }}
            >
              Password
            </label>
            <div
              style={{
                display: "flex",
                border: "1px solid #d2d8de",
                borderRadius: "6px",
                overflow: "hidden",
                height: "40px",
                boxSizing: "border-box",
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
                  height: "100%",
                  padding: "0 0.875rem",
                  border: "none",
                  outline: "none",
                  backgroundColor: "#ffffff",
                  color: "#1c1f58",
                  fontSize: "0.9375rem",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  border: "none",
                  borderLeft: "1px solid #edf1f5",
                  backgroundColor: "#f8fafc",
                  color: "#6e7a88",
                  padding: "0 0.875rem",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
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
            className="button button-primary"
            style={{
              width: "100%",
              height: "44px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#545bfe",
              color: "#ffffff",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
              transition: "background 0.15s ease",
            }}
          >
            {submitting
              ? "Please wait..."
              : mode === "login"
                ? "Log In"
                : "Sign Up"}
          </button>
        </form>

        {/* Demo Autofill Shortcut */}
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <button
            type="button"
            onClick={handleFillDemo}
            style={{
              background: "transparent",
              border: "1px dashed #acbdfb",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "0.75rem",
              color: "#545bfe",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Fill Demo Account (vuhse182692@fpt.edu.vn)
          </button>
        </div>

        <div
          style={{
            marginTop: "1.25rem",
            paddingTop: "1rem",
            borderTop: "1px solid #edf1f5",
            textAlign: "center",
            fontSize: "0.875rem",
            color: "#6e7a88",
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
                  color: "#545bfe",
                  fontWeight: 700,
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
                  color: "#545bfe",
                  fontWeight: 700,
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
