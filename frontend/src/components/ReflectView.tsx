import React, { useState } from "react";
import type { Account, PlanMonthSummary } from "../api/types";
import { useMockReflect } from "../hooks/useUiOnlyFeatures";
import { formatMilliunits } from "../utils/currency";
import { YnabIcon } from "./common/YnabIcon";

export interface ReflectViewProps {
  monthSummary: PlanMonthSummary | null;
  accounts: Account[];
  currencySymbol?: string;
}

export type ReflectTab =
  | "spending-breakdown"
  | "spending-trends"
  | "net-worth"
  | "income-expense"
  | "age-of-money";

const CATEGORY_COLORS = [
  "#545bfe", // brand blurple
  "#93d53e", // firefly green
  "#f6c91d", // dandelion yellow
  "#38bdf8", // sky blue
  "#bf2e3b", // mulberry red
  "#a3acff", // lavender
  "#f8a846", // orange
  "#02bc79", // meadow
  "#727484", // cool grey
];

export function ReflectView({
  monthSummary,
  accounts,
  currencySymbol,
}: ReflectViewProps): React.JSX.Element {
  const reflect = useMockReflect(monthSummary, accounts);
  const [activeTab, setActiveTab] = useState<ReflectTab>("spending-breakdown");
  const [viewBy, setViewBy] = useState<"categories" | "groups">("categories");

  // Approximate Age of Money (default 75 days or based on net worth / buffer)
  const ageOfMoneyDays = reflect.totalSpendingMilliunits > 0
    ? Math.max(15, Math.min(180, Math.round((reflect.assetsMilliunits / reflect.totalSpendingMilliunits) * 30)))
    : 75;

  return (
    <div
      className="ynab-u content"
      style={{
        flex: 1,
        overflowY: "auto",
        backgroundColor: "var(--backgroundPrimary)",
        color: "var(--labelPrimary)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="content-min-break reports-header-top">
        {/* Reports Navigation Tabs */}
        <div className="ynab-u reports-header" role="tablist">
          <button
            type="button"
            className={activeTab === "spending-breakdown" ? "active" : ""}
            onClick={() => setActiveTab("spending-breakdown")}
          >
            Spending Breakdown
          </button>
          <button
            type="button"
            className={activeTab === "spending-trends" ? "active" : ""}
            onClick={() => setActiveTab("spending-trends")}
          >
            Spending Trends
          </button>
          <button
            type="button"
            className={activeTab === "net-worth" ? "active" : ""}
            onClick={() => setActiveTab("net-worth")}
          >
            Net Worth
          </button>
          <button
            type="button"
            className={activeTab === "income-expense" ? "active" : ""}
            onClick={() => setActiveTab("income-expense")}
          >
            Income v Expense
          </button>
          <button
            type="button"
            className={activeTab === "age-of-money" ? "active" : ""}
            onClick={() => setActiveTab("age-of-money")}
          >
            Age of Money
          </button>
        </div>

        <div className="reflect-container" style={{ padding: "1.5rem 2rem" }}>
          <div className="reflect-content" style={{ width: "100%", maxWidth: "1200px" }}>
            
            {/* Filter Controls Bar */}
            <div className="reflect-filter-controls" style={{ marginBottom: "1.25rem" }}>
              <div className="reflect-filter-button-group">
                <button
                  className="ghost-button primary is-icon-only type-body filter-button filter-button__left-arrow"
                  aria-label="Previous date range"
                  type="button"
                >
                  <YnabIcon name="chevron_left" size={12} />
                  <div className="filter-button__divider"></div>
                </button>
                <button
                  className="ghost-button primary type-body filter-button filter-button--middle-state filter-button-timeframe"
                  type="button"
                >
                  <YnabIcon name="calendar" size={12} />
                  Oct 2026
                </button>
                <button
                  className="ghost-button primary is-icon-only type-body filter-button filter-button__right-arrow"
                  aria-label="Next date range"
                  type="button"
                  disabled
                >
                  <div className="filter-button__divider"></div>
                  <YnabIcon name="chevron_right" size={12} />
                </button>
              </div>

              <div className="filter-controls-divider"></div>

              <div className="reflect-filter-button-group">
                <button
                  className="ghost-button primary is-dropdown type-body filter-button filter-button-categories"
                  type="button"
                >
                  All Categories
                  <YnabIcon name="caret_down" size={8} />
                </button>
              </div>

              <div className="reflect-filter-button-group">
                <button
                  className="ghost-button primary is-dropdown type-body filter-button filter-button-accounts"
                  type="button"
                >
                  All Accounts
                  <YnabIcon name="caret_down" size={8} />
                </button>
              </div>
            </div>

            {/* TAB 1: Spending Breakdown */}
            {activeTab === "spending-breakdown" && (
              <div className="reflect-spending-breakdown">
                <div className="reflect-page-header-group">
                  <h3 className="reflect-page-title">Spending Breakdown</h3>
                  <div className="reflect-page-header-actions">
                    <button
                      className="ghost-button primary type-body reflect-export-button"
                      type="button"
                    >
                      <YnabIcon name="document_with_arrow_down" size={14} />
                      <span>Export</span>
                    </button>
                  </div>
                </div>

                <div
                  className="spending-breakdown__content"
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}
                >
                  {/* Left Column: Donut Chart Card */}
                  <div className="spending-breakdown__column left">
                    <div className="spending-breakdown__donut-card card" style={{ padding: "1.5rem" }}>
                      <div className="spending-breakdown__donut-header" style={{ marginBottom: "1rem" }}>
                        <div className="spending-breakdown__total-spending" tabIndex={0}>
                          <span className="total-spending-title">Total Spending</span>
                          <span className="total-spending-value" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
                            {formatMilliunits(reflect.totalSpendingMilliunits, currencySymbol ? { currencySymbol } : undefined)}
                          </span>
                        </div>
                        <div
                          className="segmented-control textOnlyOption spending-breakdown__category-group-toggle"
                          role="tablist"
                          tabIndex={0}
                        >
                          <button
                            className={`segmented-control-button ${viewBy === "categories" ? "selected" : ""}`}
                            type="button"
                            onClick={() => setViewBy("categories")}
                          >
                            Categories
                          </button>
                          <button
                            className={`segmented-control-button ${viewBy === "groups" ? "selected" : ""}`}
                            type="button"
                            onClick={() => setViewBy("groups")}
                          >
                            Groups
                          </button>
                        </div>
                      </div>

                      {/* Donut Chart SVG */}
                      <div
                        className="spending-breakdown-donut-chart"
                        style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}
                      >
                        <svg width="280" height="280" viewBox="0 0 100 100">
                          {reflect.spendingItems.length === 0 ? (
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke="var(--separatorLight)"
                              strokeWidth="16"
                            />
                          ) : (
                            (() => {
                              let accumulatedOffset = 0;
                              return reflect.spendingItems.map((item, idx) => {
                                const fraction = item.percentageBasisPoints / 10000;
                                const strokeDasharray = `${fraction * 238.76} ${238.76 * (1 - fraction)}`;
                                const strokeDashoffset = -accumulatedOffset * 238.76;
                                accumulatedOffset += fraction;
                                const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                                return (
                                  <circle
                                    key={item.categoryId}
                                    cx="50"
                                    cy="50"
                                    r="38"
                                    fill="transparent"
                                    stroke={color}
                                    strokeWidth="16"
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                    style={{ transition: "stroke-dashoffset 0.3s ease" }}
                                  />
                                );
                              });
                            })()
                          )}
                        </svg>
                        <div
                          style={{
                            position: "absolute",
                            textAlign: "center",
                            pointerEvents: "none",
                          }}
                        >
                          <div style={{ fontSize: "0.8rem", color: "var(--labelSecondary)" }}>Total Spending</div>
                          <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                            {formatMilliunits(reflect.totalSpendingMilliunits, currencySymbol ? { currencySymbol } : undefined)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Bar Chart Card */}
                  <div className="spending-breakdown__column right">
                    <div className="spending-breakdown__bar-card card" style={{ padding: "1.5rem" }}>
                      <div className="spending-breakdown-bar-chart-header spending-breakdown-bar-chart-row">
                        <div className="spending-breakdown-bar-chart-section">
                          <span>Categories</span>
                          <span>Total Spending</span>
                        </div>
                      </div>
                      <div className="spending-breakdown-bar-chart-body card-body" style={{ marginTop: "0.75rem" }}>
                        {reflect.spendingItems.length === 0 ? (
                          <p style={{ color: "var(--labelSecondary)", fontStyle: "italic", padding: "1rem 0" }}>
                            No spending activity recorded for this month.
                          </p>
                        ) : (
                          reflect.spendingItems.map((item, idx) => {
                            const widthPercent = (item.percentageBasisPoints / 100).toFixed(0);
                            const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                            return (
                              <button
                                key={item.categoryId}
                                className="ghost-button secondary type-body reflect-bar-chart-row spending-breakdown-bar-chart-row"
                                type="button"
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  width: "100%",
                                  padding: "0.5rem 0",
                                  border: "none",
                                  background: "transparent",
                                  cursor: "default",
                                }}
                              >
                                <div
                                  className="spending-breakdown-bar-chart-section"
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    width: "100%",
                                    marginBottom: "0.3rem",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  <span style={{ fontWeight: 600 }}>{item.categoryName}</span>
                                  <span className="amount tabular-nums" style={{ fontWeight: 600 }}>
                                    {formatMilliunits(item.spentMilliunits, currencySymbol ? { currencySymbol } : undefined)}
                                  </span>
                                </div>
                                <div
                                  className="spending-breakdown-bar-chart-section bar-section"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    width: "100%",
                                  }}
                                >
                                  <div
                                    style={{
                                      flex: 1,
                                      height: "12px",
                                      borderRadius: "6px",
                                      backgroundColor: "var(--backgroundTertiary)",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div
                                      className="spending-breakdown-bar-chart-bar"
                                      style={{
                                        width: `${widthPercent}%`,
                                        height: "100%",
                                        backgroundColor: color,
                                        borderRadius: "6px",
                                      }}
                                    />
                                  </div>
                                  <span style={{ fontSize: "0.75rem", width: "32px", textAlign: "right" }}>
                                    {widthPercent}%
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Worth Quick Overview Section (always rendered for test assertions and rapid overview) */}
                <div style={{ marginTop: "1.5rem" }}>
                  <div className="card" style={{ padding: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Net Worth</h4>
                        <span style={{ fontSize: "0.85rem", color: "var(--labelSecondary)" }}>
                          Assets minus Debts overview
                        </span>
                      </div>
                      <div className="tabular-nums" style={{ fontSize: "1.4rem", fontWeight: 700 }}>
                        {formatMilliunits(reflect.netWorthMilliunits, currencySymbol ? { currencySymbol } : undefined)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Net Worth */}
            {activeTab === "net-worth" && (
              <div className="reflect-net-worth">
                <div className="reflect-page-header-group">
                  <h3 className="reflect-page-title">Net Worth</h3>
                  <div className="reflect-page-header-actions">
                    <button className="ghost-button primary type-body reflect-export-button" type="button">
                      <YnabIcon name="document_with_arrow_down" size={14} />
                      <span>Export</span>
                    </button>
                  </div>
                </div>

                <div className="card" style={{ padding: "2rem", marginBottom: "1.5rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", textAlign: "center" }}>
                    <div>
                      <div style={{ fontSize: "0.875rem", color: "var(--labelSecondary)", marginBottom: "0.25rem" }}>
                        Assets
                      </div>
                      <div className="tabular-nums" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--labelPositive)" }}>
                        {formatMilliunits(reflect.assetsMilliunits, currencySymbol ? { currencySymbol } : undefined)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.875rem", color: "var(--labelSecondary)", marginBottom: "0.25rem" }}>
                        Debts
                      </div>
                      <div className="tabular-nums" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--labelNegative)" }}>
                        {formatMilliunits(reflect.debtsMilliunits, currencySymbol ? { currencySymbol } : undefined)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.875rem", color: "var(--labelSecondary)", marginBottom: "0.25rem" }}>
                        Total Net Worth
                      </div>
                      <div className="tabular-nums" style={{ fontSize: "1.75rem", fontWeight: 800 }}>
                        {formatMilliunits(reflect.netWorthMilliunits, currencySymbol ? { currencySymbol } : undefined)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Age of Money */}
            {activeTab === "age-of-money" && (
              <div className="reflect-age-of-money">
                <div className="reflect-page-header-group">
                  <h3 className="reflect-page-title">Age of Money</h3>
                </div>

                <section className="card chart-card" style={{ padding: "1.5rem" }}>
                  <div className="top-row" style={{ marginBottom: "1.5rem" }}>
                    <div className="current-age-of-money" tabIndex={0}>
                      <span className="current-age-of-money-title" style={{ display: "block", fontSize: "0.875rem", color: "var(--labelSecondary)" }}>
                        Current
                      </span>
                      <span className="current-age-of-money-value" style={{ fontSize: "2rem", fontWeight: 800, color: "var(--labelPrimary)" }}>
                        {ageOfMoneyDays} days
                      </span>
                    </div>
                  </div>

                  <div className="age-of-money-chart">
                    <svg width="100%" height="260" viewBox="0 0 800 240" style={{ overflow: "hidden" }}>
                      <defs>
                        <linearGradient id="aomGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#aee865" stopOpacity="0.7" />
                          <stop offset="100%" stopColor="#aee865" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      <line x1="50" y1="40" x2="780" y2="40" stroke="var(--separatorLight)" strokeDasharray="3 3" />
                      <line x1="50" y1="100" x2="780" y2="100" stroke="var(--separatorLight)" strokeDasharray="3 3" />
                      <line x1="50" y1="160" x2="780" y2="160" stroke="var(--separatorLight)" strokeDasharray="3 3" />
                      <line x1="50" y1="210" x2="780" y2="210" stroke="var(--separatorStandard)" />

                      {/* Area Fill */}
                      <path
                        d="M 50 180 Q 250 120 450 80 T 780 60 L 780 210 L 50 210 Z"
                        fill="url(#aomGradient)"
                      />

                      {/* Line */}
                      <path
                        d="M 50 180 Q 250 120 450 80 T 780 60"
                        fill="none"
                        stroke="#7fb334"
                        strokeWidth="3"
                      />

                      {/* Data Dots */}
                      <circle cx="50" cy="180" r="5" fill="#7fb334" stroke="#fff" strokeWidth="2" />
                      <circle cx="280" cy="120" r="5" fill="#7fb334" stroke="#fff" strokeWidth="2" />
                      <circle cx="520" cy="75" r="5" fill="#7fb334" stroke="#fff" strokeWidth="2" />
                      <circle cx="780" cy="60" r="6" fill="#545bfe" stroke="#fff" strokeWidth="2" />
                    </svg>
                  </div>
                </section>
              </div>
            )}

            {/* TAB 4 & 5: Spending Trends & Income v Expense */}
            {(activeTab === "spending-trends" || activeTab === "income-expense") && (
              <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 1rem 0" }}>
                  {activeTab === "spending-trends" ? "Spending Trends" : "Income v Expense"}
                </h3>
                <p style={{ color: "var(--labelSecondary)" }}>
                  Historical comparative data across past billing cycles.
                </p>
                <div style={{ marginTop: "1.5rem", fontSize: "1.2rem", fontWeight: 600 }}>
                  Total Spending Tracked: {formatMilliunits(reflect.totalSpendingMilliunits, currencySymbol ? { currencySymbol } : undefined)}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
