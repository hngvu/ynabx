import React, { useState } from "react";
import type { Account, PlanSummary } from "../api/types";
import { formatMilliunits } from "../utils/currency";

export type ActiveView =
  | { type: "budget" }
  | { type: "reflect" }
  | { type: "all-accounts" }
  | { type: "account"; accountId: string };

export interface SidebarProps {
  plans: PlanSummary[];
  activePlan: PlanSummary | null;
  accounts: Account[];
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onSelectPlan: (planId: string) => void;
  onCreatePlan: (name: string, currencyCode: string) => Promise<void>;
  onOpenAddAccount: () => void;
  theme: "theme-light" | "theme-dark";
  onToggleTheme: () => void;
  onLogout: () => void;
  userEmail?: string;
}

export function Sidebar({
  plans,
  activePlan,
  accounts,
  activeView,
  onSelectView,
  onSelectPlan,
  onCreatePlan,
  onOpenAddAccount,
  theme,
  onToggleTheme,
  onLogout,
  userEmail,
}: SidebarProps): React.JSX.Element {
  const [planMenuOpen, setPlanMenuOpen] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanCurrency, setNewPlanCurrency] = useState("USD");

  const budgetAccounts = accounts.filter((a) => a.on_budget && !a.closed);
  const trackingAccounts = accounts.filter((a) => !a.on_budget && !a.closed);
  const closedAccounts = accounts.filter((a) => a.closed);

  const totalBudgetBalance = budgetAccounts.reduce(
    (sum, a) => sum + a.balance_milliunits,
    0,
  );
  const totalTrackingBalance = trackingAccounts.reduce(
    (sum, a) => sum + a.balance_milliunits,
    0,
  );

  const handleCreatePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;
    await onCreatePlan(newPlanName.trim(), newPlanCurrency);
    setNewPlanName("");
    setCreatingPlan(false);
    setPlanMenuOpen(false);
  };

  return (
    <aside
      style={{
        width: "260px",
        flexShrink: 0,
        backgroundColor: "var(--sidebar-bg)",
        color: "var(--sidebar-text)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        overflowY: "auto",
        userSelect: "none",
      }}
    >
      {/* Plan Switcher Header */}
      <div
        style={{
          padding: "0.875rem 1rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={() => setPlanMenuOpen((prev) => !prev)}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            color: "var(--sidebar-text)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.375rem 0.5rem",
            borderRadius: "6px",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
              {activePlan?.name ?? "Select a Plan"}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--sidebar-text-muted)",
              }}
            >
              {activePlan?.currency_code ?? "USD"} · {userEmail ?? ""}
            </div>
          </div>
          <span style={{ fontSize: "0.75rem" }}>▼</span>
        </button>

        {planMenuOpen && (
          <div
            style={{
              marginTop: "0.5rem",
              backgroundColor: "var(--sidebar-active-bg)",
              borderRadius: "8px",
              padding: "0.5rem",
              boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--sidebar-text-muted)",
                padding: "0.25rem 0.5rem",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Switch Plan
            </div>
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelectPlan(p.id);
                  setPlanMenuOpen(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background:
                    p.id === activePlan?.id
                      ? "var(--sidebar-selected-bg)"
                      : "transparent",
                  color: "var(--sidebar-text)",
                  padding: "0.4rem 0.5rem",
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                {p.name} ({p.currency_code})
              </button>
            ))}

            {!creatingPlan ? (
              <button
                type="button"
                onClick={() => setCreatingPlan(true)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  color: "#aee865",
                  padding: "0.4rem 0.5rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  marginTop: "0.25rem",
                }}
              >
                + New Plan
              </button>
            ) : (
              <form
                onSubmit={handleCreatePlanSubmit}
                style={{ padding: "0.5rem", display: "grid", gap: "0.4rem" }}
              >
                <input
                  type="text"
                  placeholder="Plan name"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  required
                  style={{
                    padding: "0.35rem 0.5rem",
                    borderRadius: "4px",
                    border: "1px solid var(--separator)",
                    fontSize: "0.85rem",
                  }}
                />
                <select
                  value={newPlanCurrency}
                  onChange={(e) => setNewPlanCurrency(e.target.value)}
                  style={{
                    padding: "0.35rem 0.5rem",
                    borderRadius: "4px",
                    border: "1px solid var(--separator)",
                    fontSize: "0.85rem",
                  }}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="VND">VND (₫)</option>
                </select>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      background: "var(--action-primary)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      padding: "0.35rem",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatingPlan(false)}
                    style={{
                      background: "transparent",
                      color: "var(--sidebar-text-muted)",
                      border: "none",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <hr
              style={{
                border: "none",
                borderTop: "1px solid rgba(255,255,255,0.12)",
                margin: "0.4rem 0",
              }}
            />
            <button
              type="button"
              onClick={onToggleTheme}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                color: "var(--sidebar-text)",
                padding: "0.4rem 0.5rem",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Theme: {theme === "theme-light" ? "Light" : "Dark"}
            </button>
            <button
              type="button"
              onClick={onLogout}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                color: "#faada5",
                padding: "0.4rem 0.5rem",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Log Out
            </button>
          </div>
        )}
      </div>

      {/* Main Navigation Links */}
      <nav style={{ padding: "0.5rem" }}>
        {(
          [
            { id: "budget", label: "Budget", view: { type: "budget" as const } },
            {
              id: "reflect",
              label: "Reflect",
              view: { type: "reflect" as const },
            },
            {
              id: "all-accounts",
              label: "All Accounts",
              view: { type: "all-accounts" as const },
            },
          ] as const
        ).map((item) => {
          const isSelected = activeView.type === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.view)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "0.65rem",
                padding: "0.55rem 0.75rem",
                border: "none",
                borderRadius: "6px",
                backgroundColor: isSelected
                  ? "var(--sidebar-selected-bg)"
                  : "transparent",
                color: "var(--sidebar-text)",
                fontSize: "0.925rem",
                fontWeight: isSelected ? 600 : 500,
                cursor: "pointer",
                textAlign: "left",
                marginBottom: "0.15rem",
              }}
            >
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Account Sections */}
      <div style={{ flex: 1, padding: "0.25rem 0.5rem" }}>
        {/* BUDGET ACCOUNTS */}
        <div style={{ marginTop: "0.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "0.35rem 0.5rem",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: "var(--sidebar-text-muted)",
              textTransform: "uppercase",
            }}
          >
            <span>Budget</span>
            <span className="tabular-nums">
              {formatMilliunits(totalBudgetBalance)}
            </span>
          </div>
          {budgetAccounts.map((acc) => {
            const isSelected =
              activeView.type === "account" && activeView.accountId === acc.id;
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() =>
                  onSelectView({ type: "account", accountId: acc.id })
                }
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.4rem 0.6rem",
                  border: "none",
                  borderRadius: "6px",
                  backgroundColor: isSelected
                    ? "var(--sidebar-selected-bg)"
                    : "transparent",
                  color: "var(--sidebar-text)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {acc.name}
                </span>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color:
                      acc.balance_milliunits < 0
                        ? "#bf2e3b"
                        : "var(--sidebar-text)",
                    backgroundColor:
                      acc.balance_milliunits < 0 ? "#ffffff" : "transparent",
                    padding:
                      acc.balance_milliunits < 0 ? "0.05rem 0.4rem" : "0",
                    borderRadius: "999px",
                  }}
                >
                  {formatMilliunits(acc.balance_milliunits)}
                </span>
              </button>
            );
          })}
        </div>

        {/* TRACKING ACCOUNTS */}
        {trackingAccounts.length > 0 && (
          <div style={{ marginTop: "0.85rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.35rem 0.5rem",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "var(--sidebar-text-muted)",
                textTransform: "uppercase",
              }}
            >
              <span>Tracking</span>
              <span className="tabular-nums">
                {formatMilliunits(totalTrackingBalance)}
              </span>
            </div>
            {trackingAccounts.map((acc) => {
              const isSelected =
                activeView.type === "account" &&
                activeView.accountId === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() =>
                    onSelectView({ type: "account", accountId: acc.id })
                  }
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.4rem 0.6rem",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: isSelected
                      ? "var(--sidebar-selected-bg)"
                      : "transparent",
                    color: "var(--sidebar-text)",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  <span>{acc.name}</span>
                  <span className="tabular-nums" style={{ fontSize: "0.8rem" }}>
                    {formatMilliunits(acc.balance_milliunits)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* CLOSED ACCOUNTS */}
        {closedAccounts.length > 0 && (
          <div style={{ marginTop: "0.85rem" }}>
            <div
              style={{
                padding: "0.35rem 0.5rem",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "var(--sidebar-text-muted)",
                textTransform: "uppercase",
              }}
            >
              Closed ({closedAccounts.length})
            </div>
            {closedAccounts.map((acc) => {
              const isSelected =
                activeView.type === "account" &&
                activeView.accountId === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() =>
                    onSelectView({ type: "account", accountId: acc.id })
                  }
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.35rem 0.6rem",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: isSelected
                      ? "var(--sidebar-selected-bg)"
                      : "transparent",
                    color: "var(--sidebar-text-muted)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  <span>{acc.name}</span>
                  <span className="tabular-nums">
                    {formatMilliunits(acc.balance_milliunits)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div style={{ padding: "0.75rem 0.5rem" }}>
          <button
            type="button"
            onClick={onOpenAddAccount}
            style={{
              width: "100%",
              padding: "0.45rem 0.75rem",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              color: "var(--sidebar-text)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Add Account
          </button>
        </div>
      </div>
    </aside>
  );
}
