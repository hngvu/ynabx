import { useState, type FormEvent } from "react";
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
  onClose,
  onReconcile,
}: ReconcileModalProps) {
  const initialBalanceStr = account
    ? (account.cleared_balance_milliunits / 1000).toFixed(2)
    : "0.00";

  const [statementInput, setStatementInput] = useState(initialBalanceStr);
  const [createAdjustment, setCreateAdjustment] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (e: FormEvent) => {
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

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="modal-title">Reconcile Account: {account.name}</h3>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="modal-body">
            {error && <div className="auth-error">{error}</div>}

            <div className="inspector-stat-row">
              <span>Current Cleared Balance</span>
              <strong>
                {formatMilliunits(account.cleared_balance_milliunits, {
                  currencySymbol,
                })}
              </strong>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reconcile-statement">
                Bank Statement Balance
              </label>
              <input
                id="reconcile-statement"
                className="form-input"
                type="text"
                value={statementInput}
                onChange={(e) => setStatementInput(e.target.value)}
                required
              />
            </div>

            {previewDiscrepancy !== 0 && (
              <div className="inspector-card">
                <div className="inspector-stat-row">
                  <span>Discrepancy</span>
                  <strong className="amount-negative">
                    {formatMilliunits(previewDiscrepancy, { currencySymbol })}
                  </strong>
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.82rem",
                    marginTop: "0.5rem",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={createAdjustment}
                    onChange={(e) => setCreateAdjustment(e.target.checked)}
                  />
                  Create reconciliation adjustment transaction automatically
                </label>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Reconciling..." : "Finish Reconciliation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
