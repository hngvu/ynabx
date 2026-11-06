import React, { useState } from "react";
import { YnabIcon } from "./YnabIcon.tsx";
import { AccountItem } from "./Sidebar.tsx";

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAccount: (account: {
    name: string;
    type: "checking" | "savings" | "credit" | "cash" | "tracking";
    balance: number;
  }) => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onAddAccount,
}) => {
  const [step, setStep] = useState<"choose_flow" | "select_type" | "details">("choose_flow");
  const [accountType, setAccountType] = useState<AccountItem["type"]>("checking");
  const [accountName, setAccountName] = useState("");
  const [balanceStr, setBalanceStr] = useState("0.00");

  if (!isOpen) return null;

  const handleResetAndClose = () => {
    setStep("choose_flow");
    setAccountName("");
    setBalanceStr("0.00");
    onClose();
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) return;

    // parse balanceStr to milliunits (e.g. 100.50 -> 100500)
    const parsedNumber = parseFloat(balanceStr.replace(/[^0-9.-]+/g, "")) || 0;
    const milliunits = Math.round(parsedNumber * 1000);

    onAddAccount({
      name: accountName.trim(),
      type: accountType,
      balance: milliunits,
    });

    handleResetAndClose();
  };

  return (
    <div
      className="ynab-u modal-overlay account-widget-modal self-centered"
      onClick={handleResetAndClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10012,
        backgroundColor: "var(--scrimDefault)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "380px",
          height: "600px",
          backgroundColor: "var(--backgroundPrimaryElevated)",
          borderRadius: "0.75rem",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div className="account-widget" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Header */}
          <div className="account-widget-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", borderBottom: "1px solid var(--separatorSubdued)" }}>
            {step !== "choose_flow" ? (
              <button
                type="button"
                className="button-icon"
                onClick={() => {
                  if (step === "details") setStep("select_type");
                  else if (step === "select_type") setStep("choose_flow");
                }}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <YnabIcon name="chevron_left" width={16} height={16} />
              </button>
            ) : (
              <div style={{ width: 16 }} />
            )}

            <div className="account-widget-header-title" style={{ textAlign: "center", flex: 1 }}>
              <h2 className="account-widget-header-title-single" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--labelPrimary)" }}>
                {step === "choose_flow" && "Add Account"}
                {step === "select_type" && "Select Account Type"}
                {step === "details" && "Add Unlinked Account"}
              </h2>
            </div>

            <button
              type="button"
              className="button-icon"
              onClick={handleResetAndClose}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <YnabIcon name="close" width={16} height={16} />
            </button>
          </div>

          {/* STEP 1: CHOOSE FLOW (Linked vs Unlinked) */}
          {step === "choose_flow" && (
            <div className="account-widget-body" style={{ flex: 1, padding: "1.5rem 1rem", overflowY: "auto" }}>
              <div
                className="account-widget-link-card"
                onClick={() => setStep("select_type")}
                style={{ cursor: "pointer" }}
              >
                <div className="account-widget-link-card-icon">
                  <YnabIcon name="bank" width={28} height={28} />
                  <YnabIcon name="chevron_right" width={14} height={14} />
                </div>
                <div className="account-widget-link-card-label" style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                  Linked Account
                </div>
                <div className="account-widget-link-card-description" style={{ fontSize: "0.85rem", opacity: 0.85 }}>
                  Connect your bank to import cleared transactions automatically.
                </div>
              </div>

              <div
                className="account-widget-link-card"
                onClick={() => setStep("select_type")}
                style={{
                  cursor: "pointer",
                  backgroundColor: "var(--backgroundSecondaryElevated)",
                  border: "1px solid var(--separatorSubdued)",
                }}
              >
                <div className="account-widget-link-card-icon">
                  <YnabIcon name="pencil" width={24} height={24} />
                  <YnabIcon name="chevron_right" width={14} height={14} />
                </div>
                <div className="account-widget-link-card-label" style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--labelPrimary)" }}>
                  Unlinked Account
                </div>
                <div className="account-widget-link-card-description" style={{ fontSize: "0.85rem", opacity: 0.85, color: "var(--labelSecondary)" }}>
                  Track transactions and balances yourself manually.
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SELECT ACCOUNT TYPE */}
          {step === "select_type" && (
            <div className="account-widget-body" style={{ flex: 1, padding: "1rem", overflowY: "auto" }}>
              <div className="account-type-select">
                {/* Cash Accounts */}
                <div className="account-type-select-group" style={{ marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: "0.9rem", color: "var(--labelSecondary)", marginBottom: "0.5rem" }}>CASH ACCOUNTS</h3>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      setAccountType("checking");
                      setStep("details");
                    }}
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                      display: "flex",
                      alignItems: "center",
                      padding: "0.75rem 1rem",
                      marginBottom: "0.5rem",
                      textAlign: "left",
                      borderRadius: "0.5rem",
                      border: "1px solid var(--separatorSubdued)",
                      backgroundColor: "var(--backgroundSecondaryElevated)",
                      color: "var(--labelPrimary)",
                    }}
                  >
                    <span>Checking</span>
                    <YnabIcon name="chevron_right" width={14} height={14} />
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      setAccountType("savings");
                      setStep("details");
                    }}
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                      display: "flex",
                      alignItems: "center",
                      padding: "0.75rem 1rem",
                      marginBottom: "0.5rem",
                      textAlign: "left",
                      borderRadius: "0.5rem",
                      border: "1px solid var(--separatorSubdued)",
                      backgroundColor: "var(--backgroundSecondaryElevated)",
                      color: "var(--labelPrimary)",
                    }}
                  >
                    <span>Savings</span>
                    <YnabIcon name="chevron_right" width={14} height={14} />
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      setAccountType("cash");
                      setStep("details");
                    }}
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                      display: "flex",
                      alignItems: "center",
                      padding: "0.75rem 1rem",
                      textAlign: "left",
                      borderRadius: "0.5rem",
                      border: "1px solid var(--separatorSubdued)",
                      backgroundColor: "var(--backgroundSecondaryElevated)",
                      color: "var(--labelPrimary)",
                    }}
                  >
                    <span>Cash</span>
                    <YnabIcon name="chevron_right" width={14} height={14} />
                  </button>
                </div>

                {/* Credit Accounts */}
                <div className="account-type-select-group" style={{ marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: "0.9rem", color: "var(--labelSecondary)", marginBottom: "0.5rem" }}>CREDIT ACCOUNTS</h3>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      setAccountType("credit");
                      setStep("details");
                    }}
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                      display: "flex",
                      alignItems: "center",
                      padding: "0.75rem 1rem",
                      textAlign: "left",
                      borderRadius: "0.5rem",
                      border: "1px solid var(--separatorSubdued)",
                      backgroundColor: "var(--backgroundSecondaryElevated)",
                      color: "var(--labelPrimary)",
                    }}
                  >
                    <span>Credit Card</span>
                    <YnabIcon name="chevron_right" width={14} height={14} />
                  </button>
                </div>

                {/* Tracking Accounts */}
                <div className="account-type-select-group">
                  <h3 style={{ fontSize: "0.9rem", color: "var(--labelSecondary)", marginBottom: "0.5rem" }}>TRACKING (OFF-BUDGET)</h3>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      setAccountType("tracking");
                      setStep("details");
                    }}
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                      display: "flex",
                      alignItems: "center",
                      padding: "0.75rem 1rem",
                      textAlign: "left",
                      borderRadius: "0.5rem",
                      border: "1px solid var(--separatorSubdued)",
                      backgroundColor: "var(--backgroundSecondaryElevated)",
                      color: "var(--labelPrimary)",
                    }}
                  >
                    <span>Asset / Investment</span>
                    <YnabIcon name="chevron_right" width={14} height={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DETAILS (Name & Starting Balance) */}
          {step === "details" && (
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div className="account-widget-body" style={{ flex: 1, padding: "1.5rem 1rem", overflowY: "auto" }}>
                <div className="fieldset" style={{ marginBottom: "1.25rem" }}>
                  <label htmlFor="account-nickname" style={{ display: "block", marginBottom: "0.35rem", fontWeight: 700, color: "var(--labelPrimary)", fontSize: "0.9rem" }}>
                    Give it a nickname
                  </label>
                  <input
                    id="account-nickname"
                    type="text"
                    className="user-data"
                    placeholder="e.g. Primary Checking"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    autoFocus
                    required
                    style={{
                      width: "100%",
                      height: "2.5rem",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid var(--inputBorder)",
                      backgroundColor: "var(--inputBackground)",
                      color: "var(--labelPrimary)",
                      fontSize: "1rem",
                    }}
                  />
                </div>

                <div className="fieldset" style={{ marginBottom: "1.25rem" }}>
                  <label htmlFor="starting-balance" style={{ display: "block", marginBottom: "0.35rem", fontWeight: 700, color: "var(--labelPrimary)", fontSize: "0.9rem" }}>
                    What is your current balance?
                  </label>
                  <input
                    id="starting-balance"
                    type="text"
                    className="user-data"
                    value={balanceStr}
                    onChange={(e) => setBalanceStr(e.target.value)}
                    style={{
                      width: "100%",
                      height: "2.5rem",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid var(--inputBorder)",
                      backgroundColor: "var(--inputBackground)",
                      color: "var(--labelPrimary)",
                      fontSize: "1rem",
                    }}
                  />
                  <div style={{ fontSize: "0.75rem", color: "var(--labelSecondary)", marginTop: "0.25rem" }}>
                    {accountType === "credit" ? "Enter a positive number if you owe money on this card." : "Enter today's working balance."}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                className="account-widget-footer"
                style={{
                  borderTop: "1px solid var(--separatorSubdued)",
                  padding: "1rem",
                  display: "flex",
                  gap: "0.75rem",
                }}
              >
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setStep("select_type")}
                  style={{
                    flex: 1,
                    height: "2.5rem",
                    borderRadius: "0.375rem",
                    border: "1px solid var(--separatorSubdued)",
                    backgroundColor: "transparent",
                    color: "var(--labelPrimary)",
                    fontWeight: 600,
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={!accountName.trim()}
                  style={{
                    flex: 2,
                    height: "2.5rem",
                    borderRadius: "0.375rem",
                    backgroundColor: "var(--actionPrimary)",
                    color: "var(--labelDarkBackgroundPrimary)",
                    border: "none",
                    fontWeight: 700,
                    cursor: !accountName.trim() ? "not-allowed" : "pointer",
                    opacity: !accountName.trim() ? 0.6 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
