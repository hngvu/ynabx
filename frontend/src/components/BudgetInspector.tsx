import React, { useEffect, useState } from "react";
import type {
  CategoryMonthAllocation,
  PlanMonthSummary,
} from "../api/types";
import {
  computeQuickBudgetAssign,
  type QuickBudgetAction,
} from "../state/budgetReducer";
import { formatMilliunits } from "../utils/currency";
import { formatMonthLabel } from "../utils/dates";

export interface BudgetInspectorProps {
  month: string;
  monthSummary: PlanMonthSummary | null;
  selectedCategory: CategoryMonthAllocation | null;
  onQuickAssign: (
    categoryId: string,
    newAssignedMilliunits: number,
  ) => Promise<void>;
  onSaveCategoryNote: (
    categoryId: string,
    note: string | null,
  ) => Promise<void>;
}

export function BudgetInspector({
  month,
  monthSummary,
  selectedCategory,
  onQuickAssign,
  onSaveCategoryNote,
}: BudgetInspectorProps): React.JSX.Element {
  const [noteDraft, setNoteDraft] = useState<string>(
    selectedCategory?.note ?? "",
  );
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    setNoteDraft(selectedCategory?.note ?? "");
  }, [selectedCategory?.category_id, selectedCategory?.note]);

  const rta = monthSummary?.ready_to_assign_milliunits ?? 0;
  const monthLabel = formatMonthLabel(month);

  const totalAssigned = monthSummary?.total_assigned_milliunits ?? 0;
  const totalActivity = monthSummary?.total_activity_milliunits ?? 0;
  const totalAvailable = monthSummary?.total_available_milliunits ?? 0;
  const leftOverFromPrior = Math.max(
    0,
    totalAvailable - totalAssigned - totalActivity,
  );

  const handleQuickAction = async (action: QuickBudgetAction) => {
    if (!selectedCategory) return;
    const targetAssigned = computeQuickBudgetAssign(
      selectedCategory,
      action,
      rta,
    );
    await onQuickAssign(selectedCategory.category_id, targetAssigned);
  };

  const handleSaveNote = async () => {
    if (!selectedCategory) return;
    setSavingNote(true);
    try {
      await onSaveCategoryNote(
        selectedCategory.category_id,
        noteDraft.trim() || null,
      );
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <aside className="budget-inspector" style={{ width: "320px", flexShrink: 0 }}>
      <div className="budget-inspector-resizer">
        <div className="budget-inspector-resizer-indicator"></div>
      </div>
      <div className="budget-inspector-content">
        <div className="budget-breakdown">
          {!selectedCategory ? (
            <>
              {/* Card 1: Month's Summary */}
              <section className="card">
                <button
                  className="card-roll-up"
                  aria-expanded="true"
                  type="button"
                >
                  <h2>
                    {monthLabel} Summary
                    <svg
                      className="ynab-new-icon card-chevron"
                      width="12"
                      height="12"
                    >
                      <use href="#icon_sprite_chevron_down"></use>
                    </svg>
                  </h2>
                </button>
                <div className="card-body">
                  <div className="ynab-breakdown">
                    <div className="ynab-breakdown-leftover-prev-month">
                      <div>Left Over from Last Month</div>
                      <div className="user-data">
                        <span className="user-data currency tabular-nums positive">
                          <bdi>$</bdi>
                          {(leftOverFromPrior / 1000).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="ynab-breakdown-assigned-in-month">
                      <div>Assigned in {monthLabel.split(" ")[0]}</div>
                      <div className="user-data">
                        <span
                          className="user-data currency tabular-nums zero"
                          title={formatMilliunits(totalAssigned)}
                        >
                          <bdi>$</bdi>
                          {(totalAssigned / 1000).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="ynab-breakdown-activity">
                      <div>Activity</div>
                      <div className="user-data">
                        <span
                          className={`user-data currency tabular-nums ${
                            totalActivity < 0 ? "negative" : "zero"
                          }`}
                          title={formatMilliunits(totalActivity)}
                        >
                          {totalActivity < 0 ? "−" : ""}
                          <bdi>$</bdi>
                          {(Math.abs(totalActivity) / 1000).toLocaleString(
                            "en-US",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="ynab-breakdown-available">
                      <div>
                        <span className="ynab-breakdown-available-heading">
                          Available
                        </span>
                      </div>
                      <div className="user-data">
                        <span
                          className={`user-data currency tabular-nums ${
                            totalAvailable < 0 ? "negative" : "positive"
                          }`}
                          title={formatMilliunits(totalAvailable)}
                        >
                          <bdi>$</bdi>
                          {(totalAvailable / 1000).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="cost-to-be-me-summary">
                    <div>
                      <div className="cost-to-be-me-separator"></div>
                      <div className="title">Cost to Be Me</div>
                      <div className="label">
                        <span className="description">
                          {monthLabel.split(" ")[0]}’s Targets
                        </span>
                        <span className="amount">$4,380.23</span>
                      </div>
                    </div>
                    <div>
                      <button
                        className="ynab-button secondary income-button"
                        type="button"
                      >
                        Enter your expected income
                      </button>
                      <div className="next-month-section">
                        <span className="description">
                          Next month&apos;s targets could increase your total to
                          $4,825.50
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Card 2: Auto-Assign Accordion */}
              <section className="card budget-breakdown-auto-assign">
                <button
                  className="card-roll-up"
                  aria-expanded="true"
                  type="button"
                >
                  <h2>
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_lightning"></use>
                    </svg>
                    Auto-Assign
                  </h2>
                </button>
                <div className="card-body">
                  <div style={{ display: "grid", gap: "0.4rem" }}>
                    {[
                      { label: "Underfunded", amount: 3615860 },
                      { label: "Assigned Last Month", amount: 4747000 },
                      { label: "Spent Last Month", amount: 2495750 },
                      { label: "Average Assigned", amount: 7860340 },
                      { label: "Average Spent", amount: 2608210 },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className="ghost-button"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                          padding: "0.45rem 0.6rem",
                          fontSize: "0.84rem",
                          cursor: "pointer",
                          color: "var(--actionPrimary)",
                        }}
                      >
                        <span>{item.label}</span>
                        <span className="tabular-nums" style={{ fontWeight: 600 }}>
                          {formatMilliunits(item.amount)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </>
          ) : (
            /* Selected Category Inspector */
            <>
              {/* Category Header */}
              <div className="budget-inspector-category-header" style={{ marginBottom: "0.75rem", padding: "0.25rem 0" }}>
                <div className="budget-inspector-category" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div className="inspector-category-name user-data" style={{ flex: 1, minWidth: 0 }}>
                    <div className="user-entered-text" style={{ minWidth: 0, overflow: "hidden" }}>
                      <h1
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: 700,
                          margin: 0,
                          lineHeight: 1.3,
                          color: "var(--labelPrimary, #191818)",
                          whiteSpace: "normal",
                          wordBreak: "normal",
                          overflowWrap: "break-word",
                        }}
                      >
                        {selectedCategory.name}
                      </h1>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 1: Available Balance */}
              <section className="card budget-breakdown-available-balance">
                <button
                  className="card-roll-up"
                  aria-expanded="true"
                  type="button"
                >
                  <h2 style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <span>Available Balance</span>
                    <button
                      className={`ynab-new-budget-available-number js-budget-available-number user-data ${
                        selectedCategory.available_milliunits === 0
                          ? "zero pill-zero"
                          : selectedCategory.available_milliunits > 0
                            ? "positive pill-positive"
                            : selectedCategory.is_credit_card_payment
                              ? "cautious pill-warning"
                              : "negative pill-negative"
                      }`}
                      aria-disabled="true"
                      type="button"
                      style={{ margin: 0 }}
                    >
                      <bdi>{formatMilliunits(selectedCategory.available_milliunits)}</bdi>
                    </button>
                  </h2>
                </button>
                <div className="card-body">
                  <div className="ynab-breakdown">
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0" }}>
                      <span style={{ color: "var(--labelSecondary, #6e7a88)", fontSize: "0.85rem" }}>
                        Cash Left Over From Last Month
                      </span>
                      <span className="user-data currency tabular-nums zero" style={{ fontSize: "0.85rem" }}>
                        <bdi>$0.00</bdi>
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0" }}>
                      <span style={{ color: "var(--labelSecondary, #6e7a88)", fontSize: "0.85rem" }}>
                        Assigned This Month
                      </span>
                      <span className="user-data currency tabular-nums" style={{ fontSize: "0.85rem" }}>
                        <bdi>{formatMilliunits(selectedCategory.assigned_milliunits)}</bdi>
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0" }}>
                      <span style={{ color: "var(--labelSecondary, #6e7a88)", fontSize: "0.85rem" }}>
                        Activity
                      </span>
                      <span
                        className={`user-data currency tabular-nums ${
                          selectedCategory.activity_milliunits < 0 ? "negative" : "zero"
                        }`}
                        style={{ fontSize: "0.85rem" }}
                      >
                        <bdi>{formatMilliunits(selectedCategory.activity_milliunits)}</bdi>
                      </span>
                    </div>
                  </div>

                  {selectedCategory.available_milliunits < 0 && (
                    <div
                      className="impact-message negative"
                      style={{
                        marginTop: "0.6rem",
                        padding: "0.5rem 0.75rem",
                        backgroundColor: "var(--categoryBalanceNegativeBackground, #faada5)",
                        color: "#191818",
                        borderRadius: "6px",
                        fontSize: "0.8rem",
                        lineHeight: 1.35,
                      }}
                    >
                      You&apos;ve overspent this category by{" "}
                      <strong>
                        <bdi>{formatMilliunits(Math.abs(selectedCategory.available_milliunits))}</bdi>
                      </strong>
                      . Cover this overspending!
                    </div>
                  )}
                </div>
              </section>

              {/* Card 2: Auto-Assign */}
              <section className="card budget-breakdown-auto-assign">
                <button className="card-roll-up" aria-expanded="true" type="button">
                  <h2>
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_lightning"></use>
                    </svg>
                    Auto-Assign
                  </h2>
                </button>
                <div className="card-body">
                  <div className="inspector-quick-budget">
                    <div className="option-groups" style={{ display: "grid", gap: "2px" }}>
                      {selectedCategory.available_milliunits < 0 && (
                        <button
                          type="button"
                          className="budget-inspector-button"
                          onClick={() => void handleQuickAction("COVER_OVERSPENDING")}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                            padding: "0.45rem 0.6rem",
                            background: "transparent",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                          }}
                        >
                          <span style={{ fontWeight: 500, color: "var(--labelPrimary)" }}>Cover Overspending</span>
                          <strong className="user-data negative">
                            <bdi>{formatMilliunits(Math.abs(selectedCategory.available_milliunits))}</bdi>
                          </strong>
                        </button>
                      )}

                      {rta > 0 && (
                        <button
                          type="button"
                          className="budget-inspector-button"
                          onClick={() => void handleQuickAction("ASSIGN_RTA")}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                            padding: "0.45rem 0.6rem",
                            background: "transparent",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                          }}
                        >
                          <span style={{ fontWeight: 500, color: "var(--labelPrimary)" }}>Assign Ready to Assign</span>
                          <strong className="user-data positive">
                            <bdi>{formatMilliunits(rta)}</bdi>
                          </strong>
                        </button>
                      )}

                      <button
                        type="button"
                        className="budget-inspector-button"
                        onClick={() => void handleQuickAction("RESET_ASSIGNED")}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                          padding: "0.45rem 0.6rem",
                          background: "transparent",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span style={{ fontWeight: 500, color: "var(--labelPrimary)" }}>Reset Assigned to $0.00</span>
                        <strong className="user-data zero">
                          <bdi>$0.00</bdi>
                        </strong>
                      </button>

                      <button
                        type="button"
                        className="budget-inspector-button"
                        onClick={() => void handleQuickAction("RESET_AVAILABLE")}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                          padding: "0.45rem 0.6rem",
                          background: "transparent",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span style={{ fontWeight: 500, color: "var(--labelPrimary)" }}>Reset Available to $0.00</span>
                        <strong className="user-data zero">
                          <bdi>$0.00</bdi>
                        </strong>
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Card 3: Target Card */}
              <section className="card target-inspector-card">
                <button className="card-roll-up" aria-expanded="true" type="button">
                  <h2>
                    Target
                    <svg className="ynab-new-icon card-chevron" width="12" height="12">
                      <use href="#icon_sprite_chevron_down"></use>
                    </svg>
                  </h2>
                </button>
                <div className="card-body">
                  <div className="target-inspector" style={{ padding: "0.25rem 0" }}>
                    <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--labelPrimary)" }}>
                      Need money for {selectedCategory.name}?
                    </div>
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "var(--labelSecondary)", lineHeight: 1.35 }}>
                      When you set up a funding target, YNAB will calculate exactly how much to assign each month to stay on track.
                    </p>
                  </div>
                </div>
              </section>

              {/* Card 4: Category Note */}
              <section className="card">
                <div className="inspector-notes" style={{ padding: "0.85rem" }}>
                  <h2
                    style={{
                      margin: "0 0 0.5rem 0",
                      fontSize: "0.78rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontWeight: 700,
                      color: "var(--labelSecondary)",
                    }}
                  >
                    Notes
                  </h2>
                  <textarea
                    aria-label="Category note"
                    placeholder="Enter a note for this category..."
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    onBlur={() => void handleSaveNote()}
                    className="form-textarea"
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      border: "1px solid var(--separatorStandard, #d2d8de)",
                      fontSize: "0.85rem",
                      backgroundColor: "var(--inputBackground, #ffffff)",
                      color: "var(--labelPrimary, #191818)",
                      resize: "vertical",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.4rem" }}>
                    <button
                      type="button"
                      className="button button-primary"
                      disabled={savingNote}
                      onClick={() => void handleSaveNote()}
                      style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
                    >
                      {savingNote ? "Saving..." : "Save Note"}
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
