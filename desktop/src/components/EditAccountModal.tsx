import React, { useState, useEffect } from "react";
import { YnabIcon } from "./YnabIcon.tsx";
import { AccountItem } from "./Sidebar.tsx";

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountItem | null;
  onSaveAccount: (accountId: string, newName: string, newBalance: number) => void;
  onDeleteAccount: (accountId: string) => void;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  isOpen,
  onClose,
  account,
  onSaveAccount,
  onDeleteAccount,
}) => {
  const [accountName, setAccountName] = useState("");
  const [balanceStr, setBalanceStr] = useState("0.00");

  useEffect(() => {
    if (account) {
      setAccountName(account.name);
      setBalanceStr((account.balance / 1000).toFixed(2));
    }
  }, [account]);

  if (!isOpen || !account) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) return;

    const parsedNumber = parseFloat(balanceStr.replace(/[^0-9.-]+/g, "")) || 0;
    const milliunits = Math.round(parsedNumber * 1000);

    onSaveAccount(account.id, accountName.trim(), milliunits);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${account.name}? This will remove all associated transactions.`)) {
      onDeleteAccount(account.id);
      onClose();
    }
  };

  return (
    <div
      className="ynab-u modal-overlay modal-popup account-modal"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10011,
        backgroundColor: "var(--scrimDefault)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "480px",
          backgroundColor: "var(--backgroundPrimaryElevated)",
          borderRadius: "0.5rem",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
          border: "1px solid var(--separatorSubdued)",
          overflow: "hidden",
        }}
      >
        {/* Dialog Header */}
        <div className="dialog-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid var(--separatorSubdued)" }}>
          <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--labelPrimary)" }}>
            Edit Account
          </h2>
          <button
            type="button"
            className="button-icon"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labelSecondary)", display: "flex", alignItems: "center" }}
          >
            <YnabIcon name="close" width={16} height={16} />
          </button>
        </div>

        {/* Dialog Body */}
        <form onSubmit={handleSubmit}>
          <div className="dialog-body" style={{ padding: "1.25rem" }}>
            <div className="fieldset edit-account-name" style={{ marginBottom: "1rem" }}>
              <dt className="section-header" style={{ fontWeight: 700, color: "var(--labelPrimary)", marginBottom: "0.4rem", fontSize: "0.9rem" }}>
                Account Nickname
              </dt>
              <dd className="user-data" style={{ margin: 0 }}>
                <input
                  type="text"
                  className="user-data"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    height: "2.25rem",
                    padding: "0.4rem 0.6rem",
                    borderRadius: "0.25rem",
                    border: "1px solid var(--inputBorder)",
                    backgroundColor: "var(--inputBackground)",
                    color: "var(--labelPrimary)",
                    fontSize: "0.95rem",
                  }}
                />
              </dd>
            </div>

            <div className="fieldset edit-working-balance" style={{ marginBottom: "1rem" }}>
              <dt className="section-header" style={{ fontWeight: 700, color: "var(--labelPrimary)", marginBottom: "0.4rem", fontSize: "0.9rem" }}>
                Working Balance
              </dt>
              <dd className="user-data" style={{ margin: 0 }}>
                <input
                  type="text"
                  className="user-data"
                  value={balanceStr}
                  onChange={(e) => setBalanceStr(e.target.value)}
                  style={{
                    width: "100%",
                    height: "2.25rem",
                    padding: "0.4rem 0.6rem",
                    borderRadius: "0.25rem",
                    border: "1px solid var(--inputBorder)",
                    backgroundColor: "var(--inputBackground)",
                    color: "var(--labelPrimary)",
                    fontSize: "0.95rem",
                  }}
                />
                <span className="info" style={{ display: "block", marginTop: "0.25rem", fontSize: "0.75rem", color: "var(--labelSecondary)" }}>
                  Type: <strong style={{ textTransform: "capitalize" }}>{account.type}</strong>
                </span>
              </dd>
            </div>
          </div>

          {/* Dialog Footer */}
          <div
            className="dialog-footer"
            style={{
              padding: "1rem 1.25rem",
              borderTop: "1px solid var(--separatorSubdued)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              className="button button-secondary destructive"
              onClick={handleDelete}
              style={{
                height: "2.25rem",
                padding: "0 1rem",
                borderRadius: "0.25rem",
                border: "1px solid var(--separatorSubdued)",
                backgroundColor: "transparent",
                color: "var(--labelNegative)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Delete Account
            </button>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="button button-cancel"
                onClick={onClose}
                style={{
                  height: "2.25rem",
                  padding: "0 1rem",
                  borderRadius: "0.25rem",
                  border: "1px solid var(--separatorSubdued)",
                  backgroundColor: "transparent",
                  color: "var(--labelPrimary)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button button-primary js-primary-action save-account-button"
                disabled={!accountName.trim()}
                style={{
                  height: "2.25rem",
                  padding: "0 1.25rem",
                  borderRadius: "0.25rem",
                  border: "none",
                  backgroundColor: "var(--actionPrimary)",
                  color: "var(--labelDarkBackgroundPrimary)",
                  fontWeight: 700,
                  cursor: !accountName.trim() ? "not-allowed" : "pointer",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
