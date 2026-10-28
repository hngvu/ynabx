import React, { useState } from "react";
import type { AccountType, CreateAccountRequest } from "../../api/types";
import { parseInputToMilliunits } from "../../utils/currency";

export interface AddAccountModalProps {
  onClose: () => void;
  onCreate: (req: CreateAccountRequest) => Promise<void>;
}

export function AddAccountModal({
  onClose,
  onCreate,
}: AddAccountModalProps): React.JSX.Element {
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

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "var(--bg-primary)",
          borderRadius: "12px",
          padding: "1.5rem",
          boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
        }}
      >
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.2rem" }}>
          Add Account
        </h3>

        {error && (
          <div
            role="alert"
            style={{
              padding: "0.6rem",
              borderRadius: "6px",
              backgroundColor: "var(--action-destructive-bg)",
              color: "var(--action-destructive-text)",
              fontSize: "0.825rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "grid", gap: "0.85rem" }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.825rem",
                fontWeight: 600,
                marginBottom: "0.25rem",
              }}
            >
              Account Nickname
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Checking"
              style={{
                width: "100%",
                height: "36px",
                padding: "0 0.65rem",
                borderRadius: "6px",
                border: "1px solid var(--separator)",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.825rem",
                fontWeight: 600,
                marginBottom: "0.25rem",
              }}
            >
              Account Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              style={{
                width: "100%",
                height: "36px",
                padding: "0 0.5rem",
                borderRadius: "6px",
                border: "1px solid var(--separator)",
              }}
            >
              <option value="CHECKING">Checking</option>
              <option value="SAVINGS">Savings</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="CASH">Cash</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.825rem",
                fontWeight: 600,
                marginBottom: "0.25rem",
              }}
            >
              Current Balance (use negative for credit card debt)
            </label>
            <input
              type="text"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              style={{
                width: "100%",
                height: "36px",
                padding: "0 0.65rem",
                borderRadius: "6px",
                border: "1px solid var(--separator)",
              }}
            />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={onBudget}
              onChange={(e) => setOnBudget(e.target.checked)}
            />
            On-Budget Account (included in Ready to Assign)
          </label>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5rem",
              marginTop: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "none",
                background: "var(--bg-tertiary)",
                color: "var(--text-primary)",
                padding: "0.45rem 0.9rem",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                border: "none",
                background: "var(--action-primary)",
                color: "#fff",
                padding: "0.45rem 1rem",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {submitting ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
