import React, { useState } from "react";
import { YnabIcon } from "./YnabIcon.tsx";

interface BudgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudgetName: string;
  onSaveBudgetName: (name: string) => void;
}

export const BudgetSettingsModal: React.FC<BudgetSettingsModalProps> = ({
  isOpen,
  onClose,
  currentBudgetName,
  onSaveBudgetName,
}) => {
  const [budgetName, setBudgetName] = useState(currentBudgetName);
  const [currency, setCurrency] = useState("USD");
  const [currencyPlacement, setCurrencyPlacement] = useState("before");
  const [numberFormat, setNumberFormat] = useState("123,456.78");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetName.trim()) return;
    onSaveBudgetName(budgetName.trim());
    onClose();
  };

  return (
    <div
      className="ynab-u modal-overlay modal-budget-settings"
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
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "480px",
          backgroundColor: "var(--backgroundPrimaryElevated)",
          borderRadius: "0.5rem",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4)",
          border: "1px solid var(--separatorSubdued)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid var(--separatorSubdued)" }}>
          <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--labelPrimary)" }}>
            Plan Settings
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

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: "1.25rem" }}>
            <div className="fieldset" style={{ marginBottom: "1rem" }}>
              <label htmlFor="budget-name" style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "var(--labelPrimary)", fontSize: "0.9rem" }}>
                Plan Name
              </label>
              <input
                id="budget-name"
                type="text"
                className="modal-budget-settings-name user-data"
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
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
            </div>

            <div className="modal-budget-settings-currency-fields" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label htmlFor="modal-settings-currency" style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "var(--labelPrimary)", fontSize: "0.9rem" }}>
                  Currency
                </label>
                <select
                  id="modal-settings-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{
                    width: "100%",
                    height: "2.25rem",
                    padding: "0.4rem 0.6rem",
                    borderRadius: "0.25rem",
                    border: "1px solid var(--inputBorder)",
                    backgroundColor: "var(--inputBackground)",
                    color: "var(--labelPrimary)",
                  }}
                >
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="GBP">British Pound (£)</option>
                  <option value="VND">Vietnamese Dong (₫)</option>
                </select>
              </div>

              <div>
                <label htmlFor="modal-settings-currency-placement" style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "var(--labelPrimary)", fontSize: "0.9rem" }}>
                  Symbol Placement
                </label>
                <select
                  id="modal-settings-currency-placement"
                  value={currencyPlacement}
                  onChange={(e) => setCurrencyPlacement(e.target.value)}
                  style={{
                    width: "100%",
                    height: "2.25rem",
                    padding: "0.4rem 0.6rem",
                    borderRadius: "0.25rem",
                    border: "1px solid var(--inputBorder)",
                    backgroundColor: "var(--inputBackground)",
                    color: "var(--labelPrimary)",
                  }}
                >
                  <option value="before">Before amount ($123)</option>
                  <option value="after">After amount (123$)</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label htmlFor="modal-settings-currency-format" style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "var(--labelPrimary)", fontSize: "0.9rem" }}>
                  Number Format
                </label>
                <select
                  id="modal-settings-currency-format"
                  value={numberFormat}
                  onChange={(e) => setNumberFormat(e.target.value)}
                  style={{
                    width: "100%",
                    height: "2.25rem",
                    padding: "0.4rem 0.6rem",
                    borderRadius: "0.25rem",
                    border: "1px solid var(--inputBorder)",
                    backgroundColor: "var(--inputBackground)",
                    color: "var(--labelPrimary)",
                  }}
                >
                  <option value="123,456.78">123,456.78</option>
                  <option value="123.456,78">123.456,78</option>
                  <option value="123 456,78">123 456,78</option>
                </select>
              </div>

              <div>
                <label htmlFor="modal-settings-date-format" style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700, color: "var(--labelPrimary)", fontSize: "0.9rem" }}>
                  Date Format
                </label>
                <select
                  id="modal-settings-date-format"
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  style={{
                    width: "100%",
                    height: "2.25rem",
                    padding: "0.4rem 0.6rem",
                    borderRadius: "0.25rem",
                    border: "1px solid var(--inputBorder)",
                    backgroundColor: "var(--inputBackground)",
                    color: "var(--labelPrimary)",
                  }}
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderTop: "1px solid var(--separatorSubdued)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5rem",
            }}
          >
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
              className="button button-primary"
              disabled={!budgetName.trim()}
              style={{
                height: "2.25rem",
                padding: "0 1.25rem",
                borderRadius: "0.25rem",
                border: "none",
                backgroundColor: "var(--actionPrimary)",
                color: "var(--labelDarkBackgroundPrimary)",
                fontWeight: 700,
                cursor: !budgetName.trim() ? "not-allowed" : "pointer",
              }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
