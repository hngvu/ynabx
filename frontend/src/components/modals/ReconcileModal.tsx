import { useState, useEffect, type FormEvent } from "react";
import type { Account, ReconcileAccountRequest } from "../../api/types";
import {
  formatMilliunits,
  parseInputToMilliunits,
} from "../../utils/currency";

export interface ReconcileComputation extends ReconcileAccountRequest {
  discrepancy_milliunits: number;
}

export function buildReconcileRequest(
  clearedBalanceMilliunits: number,
  statementBalanceInput: string,
  createAdjustment: boolean,
): ReconcileComputation {
  const statementMilliunits = parseInputToMilliunits(statementBalanceInput);
  const discrepancy = statementMilliunits - clearedBalanceMilliunits;

  if (discrepancy !== 0 && !createAdjustment) {
    throw new Error(
      "Statement balance differs from cleared balance. Enable automatic adjustment transaction or clear missing transactions first.",
    );
  }

  return {
    statement_balance_milliunits: statementMilliunits,
    create_adjustment_transaction: discrepancy !== 0 ? createAdjustment : false,
    discrepancy_milliunits: discrepancy,
  };
}

export interface ReconcileModalProps {
  isOpen: boolean;
  account: Account | null;
  currencySymbol?: string;
  anchorPosition?: {
    top: number;
    right?: number;
    left?: number;
    bottom?: number;
  } | null;
  onClose: () => void;
  onReconcile: (
    accountId: string,
    payload: ReconcileAccountRequest,
  ) => Promise<void>;
}

export function ReconcileModal({
  isOpen,
  account,
  currencySymbol = "$",
  anchorPosition,
  onClose,
  onReconcile,
}: ReconcileModalProps) {
  const initialBalanceStr = account
    ? (account.cleared_balance_milliunits / 1000).toFixed(2)
    : "0.00";

  const [step, setStep] = useState<"prompt" | "enter_balance">("prompt");
  const [statementInput, setStatementInput] = useState(initialBalanceStr);
  const [createAdjustment, setCreateAdjustment] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setStatementInput((account.cleared_balance_milliunits / 1000).toFixed(2));
      setStep("prompt");
      setError(null);
    }
  }, [account?.id, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !account) {
    return null;
  }

  let previewDiscrepancy = 0;
  try {
    const parsed = parseInputToMilliunits(statementInput);
    previewDiscrepancy = parsed - account.cleared_balance_milliunits;
  } catch {
    previewDiscrepancy = 0;
  }

  const handlePromptYes = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onReconcile(account.id, {
        statement_balance_milliunits: account.cleared_balance_milliunits,
        create_adjustment_transaction: false,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reconcile account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitStatement = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const computed = buildReconcileRequest(
        account.cleared_balance_milliunits,
        statementInput,
        createAdjustment,
      );
      setSubmitting(true);
      await onReconcile(account.id, {
        statement_balance_milliunits: computed.statement_balance_milliunits,
        create_adjustment_transaction: computed.create_adjustment_transaction,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reconcile account",
      );
    } finally {
      setSubmitting(false);
    }
  };

  let popoverStyle: React.CSSProperties;
  if (anchorPosition) {
    const isNearBottom =
      typeof window !== "undefined" &&
      anchorPosition.top > window.innerHeight - 260;
    const computedTop = isNearBottom
      ? Math.max(10, anchorPosition.top - 230)
      : (anchorPosition.bottom ?? anchorPosition.top + 6);

    const rightOffset =
      anchorPosition.right !== undefined && typeof window !== "undefined"
        ? Math.max(16, window.innerWidth - anchorPosition.right)
        : 16;

    popoverStyle = {
      position: "fixed",
      top: `${computedTop}px`,
      right: `${rightOffset}px`,
      zIndex: 10006,
    };
  } else {
    popoverStyle = {
      position: "fixed",
      top: "70px",
      right: "24px",
      zIndex: 10006,
    };
  }

  return (
    <div
      className={`modal-overlay active modal-account-reconcile ${anchorPosition ? "popover-anchor-overlay" : ""}`}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10005,
        backgroundColor: anchorPosition ? "transparent" : "rgba(0,0,0,0.25)",
        pointerEvents: "auto",
        display: anchorPosition ? "block" : "flex",
      }}
    >
      <div
        className="modal modal-popup"
        style={{
          ...popoverStyle,
          backgroundColor: "#ffffff",
          borderRadius: "10px",
          boxShadow: "0 10px 32px rgba(0,0,0,0.2)",
          border: "1px solid var(--separatorStandard, #d2d8de)",
          padding: "1.15rem",
          color: "var(--text-primary)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ display: "none" }}>Reconcile Account</div>

        {error && (
          <div
            className="auth-error"
            style={{ marginBottom: "0.75rem", fontSize: "0.8rem", padding: "0.4rem 0.6rem" }}
          >
            {error}
          </div>
        )}

        {step === "prompt" ? (
          <div className="modal-account-reconcile-current">
            <div className="modal-account-reconcile-cleared-balance">
              <div className="modal-account-reconcile-cleared-balance-label">
                Is your current balance
              </div>
              <div className="modal-account-reconcile-cleared-balance-amount user-data currency">
                {formatMilliunits(account.cleared_balance_milliunits, { currencySymbol })}?
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <a
                href="#help"
                onClick={(e) => e.preventDefault()}
                style={{ fontSize: "0.82rem", color: "var(--actionPrimary)", textDecoration: "none" }}
              >
                How do I find my account balance?
              </a>
            </div>

            <div className="modal-account-reconcile-full-width-buttons" style={{ display: "flex", gap: "0.6rem" }}>
              <button
                type="button"
                className="button button-cancel"
                onClick={() => setStep("enter_balance")}
                disabled={submitting}
                style={{ flex: 1 }}
              >
                No
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={handlePromptYes}
                disabled={submitting}
                style={{ flex: 1 }}
              >
                {submitting ? "..." : "Yes"}
              </button>
            </div>
          </div>
        ) : (
          <form className="modal-account-reconcile-enter-balance" onSubmit={(e) => void handleSubmitStatement(e)}>
            <div style={{ marginBottom: "0.85rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  marginBottom: "0.45rem",
                }}
              >
                Current balance at your bank
              </label>
              <input
                type="text"
                value={statementInput}
                onChange={(e) => setStatementInput(e.target.value)}
                autoFocus
                required
                className="ember-text-field"
                style={{
                  width: "100%",
                  height: "36px",
                  padding: "0 0.65rem",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  borderRadius: "6px",
                }}
              />
            </div>

            <div style={{ marginBottom: "0.85rem" }}>
              <a
                href="#help"
                onClick={(e) => e.preventDefault()}
                style={{ fontSize: "0.82rem", color: "var(--actionPrimary)", textDecoration: "none" }}
              >
                How do I find my account balance?
              </a>
            </div>

            {previewDiscrepancy !== 0 && (
              <div
                className="modal-account-reconcile-difference"
                style={{
                  backgroundColor: "#fef5e6",
                  border: "1px solid #fde0ad",
                  borderRadius: "6px",
                  padding: "0.6rem 0.75rem",
                  marginBottom: "0.85rem",
                  fontSize: "0.82rem",
                  color: "#8e5b00",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <span>Discrepancy:</span>
                  <strong>{formatMilliunits(previewDiscrepancy, { currencySymbol })}</strong>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.78rem" }}>
                  <input
                    type="checkbox"
                    checked={createAdjustment}
                    onChange={(e) => setCreateAdjustment(e.target.checked)}
                  />
                  <span>Create adjustment transaction</span>
                </label>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                type="button"
                className="button button-cancel"
                onClick={() => setStep("prompt")}
              >
                Back
              </button>
              <button
                type="submit"
                className="button button-primary"
                disabled={submitting}
              >
                {submitting ? "..." : "Next"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
