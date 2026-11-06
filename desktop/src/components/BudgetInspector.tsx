import React from "react";
import { YnabIcon } from "./YnabIcon.tsx";

interface BudgetInspectorProps {
  selectedSubcategoryName?: string;
  selectedSubcategoryAssigned?: number;
  selectedSubcategoryActivity?: number;
  selectedSubcategoryAvailable?: number;
  readyToAssign?: number;
  currentMonth?: string;
  totalAssigned?: number;
  totalActivity?: number;
  onAutoAssign?: (mode: "underfunded" | "reset" | "zero") => void;
}

export const BudgetInspector: React.FC<BudgetInspectorProps> = ({
  selectedSubcategoryName,
  selectedSubcategoryAssigned = 0,
  selectedSubcategoryActivity = 0,
  selectedSubcategoryAvailable = 0,
  currentMonth = "Nov 2026",
  totalAssigned = 0,
  totalActivity = 0,
  onAutoAssign,
}) => {
  const formatCurrency = (milliunits: number) => {
    const dollars = milliunits / 1000;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(dollars);
  };

  return (
    <aside className="budget-inspector" style={{ width: "320px", flexShrink: 0, borderLeft: "1px solid var(--separatorStandard)", backgroundColor: "var(--backgroundPrimary)", overflowY: "auto", padding: "1.25rem 1rem" }}>
      {selectedSubcategoryName ? (
        /* Single Category Inspector */
        <div className="budget-inspector-content">
          <div className="budget-inspector-category-header" style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem", color: "var(--labelHeading)" }}>
              {selectedSubcategoryName}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                className={`ynab-new-budget-available-number ${
                  selectedSubcategoryAvailable > 0
                    ? "positive"
                    : selectedSubcategoryAvailable < 0
                    ? "negative"
                    : "zero"
                }`}
                style={{ fontSize: "1.1rem", padding: "0.25rem 0.75rem" }}
              >
                <span className="currency">{formatCurrency(selectedSubcategoryAvailable)}</span>
              </div>
              <span style={{ fontSize: "0.85rem", color: "var(--labelSecondary)" }}>Available</span>
            </div>
          </div>

          {/* Quick Budget / Auto-Assign */}
          <div className="card" style={{ padding: "1rem", borderRadius: "0.5rem", backgroundColor: "var(--backgroundTableRow)", marginBottom: "1rem", border: "1px solid var(--separatorStandard)" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05rem", color: "var(--labelSecondary)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <YnabIcon name="lightning" width={14} height={14} />
              Auto-Assign
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <button
                type="button"
                className="budget-inspector-button"
                onClick={() => onAutoAssign?.("underfunded")}
              >
                <span>Underfunded</span>
                <strong>$0.00</strong>
              </button>
              <button
                type="button"
                className="budget-inspector-button"
                onClick={() => onAutoAssign?.("reset")}
              >
                <span>Reset Assigned</span>
                <strong>$0.00</strong>
              </button>
              <button
                type="button"
                className="budget-inspector-button"
                onClick={() => onAutoAssign?.("zero")}
              >
                <span>Set Available to $0.00</span>
                <strong>$0.00</strong>
              </button>
            </div>
          </div>

          {/* Category Activity Breakdown */}
          <div className="card" style={{ padding: "1rem", borderRadius: "0.5rem", backgroundColor: "var(--backgroundTableRow)", border: "1px solid var(--separatorStandard)" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05rem", color: "var(--labelSecondary)", marginBottom: "0.75rem" }}>
              Month Breakdown
            </h3>
            <div className="ynab-breakdown">
              <div>
                <div>Cash Left Over</div>
                <div className="user-data"><span className="currency">$0.00</span></div>
              </div>
              <div>
                <div>Assigned This Month</div>
                <div className="user-data"><span className="currency">{formatCurrency(selectedSubcategoryAssigned)}</span></div>
              </div>
              <div>
                <div>Activity</div>
                <div className="user-data"><span className="currency">{formatCurrency(selectedSubcategoryActivity)}</span></div>
              </div>
              <div style={{ borderTop: "1px solid var(--separatorStandard)", paddingTop: "0.5rem", marginTop: "0.5rem", fontWeight: 700 }}>
                <div>Available</div>
                <div className="user-data"><span className="currency">{formatCurrency(selectedSubcategoryAvailable)}</span></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Overall Month Inspector (No Category Selected) */
        <div className="budget-inspector-content">
          <div style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem", color: "var(--labelHeading)" }}>
              {currentMonth} Summary
            </h2>
          </div>

          {/* Quick Budget Entire Month */}
          <div className="card" style={{ padding: "1rem", borderRadius: "0.5rem", backgroundColor: "var(--backgroundTableRow)", marginBottom: "1rem", border: "1px solid var(--separatorStandard)" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05rem", color: "var(--labelSecondary)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <YnabIcon name="lightning" width={14} height={14} />
              Auto-Assign All
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <button
                type="button"
                className="budget-inspector-button"
                onClick={() => onAutoAssign?.("underfunded")}
              >
                <span>Underfunded</span>
                <strong>$0.00</strong>
              </button>
              <button
                type="button"
                className="budget-inspector-button"
                onClick={() => onAutoAssign?.("reset")}
              >
                <span>Reset Assigned Amounts</span>
                <strong>$0.00</strong>
              </button>
            </div>
          </div>

          {/* Monthly Totals Breakdown */}
          <div className="card" style={{ padding: "1rem", borderRadius: "0.5rem", backgroundColor: "var(--backgroundTableRow)", border: "1px solid var(--separatorStandard)" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05rem", color: "var(--labelSecondary)", marginBottom: "0.75rem" }}>
              Total Plan Overview
            </h3>
            <div className="ynab-breakdown">
              <div>
                <div>Total Assigned</div>
                <div className="user-data"><span className="currency">{formatCurrency(totalAssigned)}</span></div>
              </div>
              <div>
                <div>Total Activity</div>
                <div className="user-data"><span className="currency">{formatCurrency(totalActivity)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
