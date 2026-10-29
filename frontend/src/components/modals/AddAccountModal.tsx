import React, { useState } from "react";
import type { AccountType, CreateAccountRequest } from "../../api/types";
import { parseInputToMilliunits } from "../../utils/currency";
import { YnabIcon } from "../common/YnabIcon";

export interface AddAccountModalProps {
  onClose: () => void;
  onCreate: (req: CreateAccountRequest) => Promise<void>;
}

export function AddAccountModal({
  onClose,
  onCreate,
}: AddAccountModalProps): React.JSX.Element {
  const [view, setView] = useState<"search" | "unlinked">("search");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("CHECKING");
  const [onBudget, setOnBudget] = useState(true);
  const [balanceInput, setBalanceInput] = useState("0.00");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const initialMilli = parseInputToMilliunits(balanceInput);
      await onCreate({
        name: name.trim(),
        type,
        on_budget: onBudget,
        initial_balance_milliunits: initialMilli,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBankClick = (bankName: string) => {
    setName(bankName);
    setView("unlinked");
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.45)",
          backdropFilter: "blur(2px)",
          zIndex: 10001,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="add-account-modal-card"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10002,
          width: "100%",
          maxWidth: "440px",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 16px 48px rgba(0,0,0,0.25)",
          border: "1px solid var(--separator-light)",
          overflow: "hidden",
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          style={{
            padding: "1.1rem 1.4rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--separator-light)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Add Accounts
          </h3>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            aria-label="Close"
            style={{ padding: "4px" }}
          >
            <YnabIcon name="close" size={16} />
          </button>
        </div>

        {view === "search" ? (
          <div style={{ padding: "1.25rem 1.4rem" }}>
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "0.35rem",
                }}
              >
                Search for your bank
              </label>
              <input
                type="text"
                placeholder="e.g. Chase, Bank of America, Wells Fargo"
                className="form-input"
                style={{
                  width: "100%",
                  height: "36px",
                  padding: "0 0.75rem",
                  fontSize: "0.9rem",
                  borderRadius: "6px",
                  border: "1.5px solid var(--action-primary)",
                  outline: "none",
                }}
              />
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                Search by institution name or web address (URL)
              </div>
            </div>

            <div style={{ marginBottom: "1.1rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.6rem" }}>
                Popular Options
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {[
                  { name: "Chase", color: "#1170cf" },
                  { name: "Capital One", color: "#004977" },
                  { name: "American Express", color: "#006fcf" },
                  { name: "Bank of America", color: "#e31837" },
                  { name: "Citi", color: "#003b70" },
                  { name: "Discover", color: "#f47321" },
                  { name: "Wells Fargo", color: "#d71e28" },
                  { name: "Ally", color: "#431c5d" },
                  { name: "USAA", color: "#1a3c61" },
                  { name: "Apple Card", color: "#333333" },
                ].map((b) => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => handleBankClick(b.name)}
                    style={{
                      backgroundColor: b.color,
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "0.6rem",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "opacity 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ textAlign: "center", position: "relative", margin: "1.25rem 0" }}>
              <div style={{ borderTop: "1px solid var(--separator-light)" }} />
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  backgroundColor: "#ffffff",
                  padding: "0 0.5rem",
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                }}
              >
                or
              </span>
            </div>

            <button
              type="button"
              onClick={() => setView("unlinked")}
              style={{
                width: "100%",
                padding: "0.65rem",
                borderRadius: "6px",
                backgroundColor: "#f2f3fe",
                border: "1px solid #d4d7fd",
                color: "var(--action-primary)",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              Add an Unlinked Account
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: "1.25rem 1.4rem" }}>
            {error && <div className="auth-error" style={{ marginBottom: "1rem" }}>{error}</div>}

            <div style={{ marginBottom: "0.85rem" }}>
              <button
                type="button"
                onClick={() => setView("search")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--action-primary)",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  marginBottom: "0.5rem",
                }}
              >
                ← Back to search
              </button>
            </div>

            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label className="form-label" htmlFor="acc-name">
                Account Nickname
              </label>
              <input
                id="acc-name"
                type="text"
                required
                placeholder="e.g. Chase Checking"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label className="form-label" htmlFor="acc-type">
                Account Type
              </label>
              <select
                id="acc-type"
                value={type}
                onChange={(e) => {
                  const nextType = e.target.value as AccountType;
                  setType(nextType);
                  if (nextType === "CREDIT_CARD") {
                    setOnBudget(true);
                  }
                }}
                className="form-select"
              >
                <option value="CHECKING">Checking</option>
                <option value="SAVINGS">Savings</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: "1.25rem" }}>
              <label className="form-label" htmlFor="acc-balance">
                Current Working Balance
              </label>
              <input
                id="acc-balance"
                type="text"
                required
                placeholder="0.00"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                className="form-input"
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setView("search")}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || !name.trim()}
              >
                {submitting ? "Creating..." : "Save Account"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
