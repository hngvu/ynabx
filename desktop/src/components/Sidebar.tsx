import React, { useState } from "react";
import { YnabIcon } from "./YnabIcon.tsx";
import { SettingsMenuModal } from "./SettingsMenuModal.tsx";
import { AddAccountModal } from "./AddAccountModal.tsx";
import { EditAccountModal } from "./EditAccountModal.tsx";
import { BudgetSettingsModal } from "./BudgetSettingsModal.tsx";
import { ThemeSwitcherModal } from "./ThemeSwitcherModal.tsx";

export interface AccountItem {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit" | "cash" | "tracking";
  balance: number; // in milliunits (1000 = $1.00)
}

interface SidebarProps {
  currentMonth: string;
  budgetName?: string;
  email?: string;
  accounts?: AccountItem[];
  activeRoute?: string;
  onNavigate?: (route: string) => void;
  onAddAccount?: (account: { name: string; type: AccountItem["type"]; balance: number }) => void;
  onUpdateAccount?: (accountId: string, newName: string, newBalance: number) => void;
  onDeleteAccount?: (accountId: string) => void;
  onUpdateBudgetName?: (name: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  budgetName = "My Plan",
  email = "USD ($)",
  accounts = [],
  activeRoute = "budget",
  onNavigate,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onUpdateBudgetName,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCashCollapsed, setIsCashCollapsed] = useState(false);
  const [isCreditCollapsed, setIsCreditCollapsed] = useState(false);
  const [isTrackingCollapsed, setIsTrackingCollapsed] = useState(false);

  // Modal States
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);
  const [isBudgetSettingsOpen, setIsBudgetSettingsOpen] = useState(false);
  const [isThemeSwitcherOpen, setIsThemeSwitcherOpen] = useState(false);

  const formatCurrency = (milliunits: number) => {
    const dollars = milliunits / 1000;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(dollars);
  };

  const cashAccounts = accounts.filter(
    (a) => a.type === "checking" || a.type === "savings" || a.type === "cash"
  );
  const creditAccounts = accounts.filter((a) => a.type === "credit");
  const trackingAccounts = accounts.filter((a) => a.type === "tracking");

  const cashTotal = cashAccounts.reduce((sum, a) => sum + a.balance, 0);
  const creditTotal = creditAccounts.reduce((sum, a) => sum + a.balance, 0);
  const trackingTotal = trackingAccounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <>
      <nav
        className={`ynab-u sidebar logged-in ${isCollapsed ? "sidebar-resized-collapsed" : ""}`}
        style={{
          width: isCollapsed ? "4.5rem" : "260px",
          flexShrink: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s ease",
        }}
        role="navigation"
        aria-label="Main Navigation"
      >
        <div className="sidebar-left" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div className="sidebar-contents" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div className="sidebar-nav" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              {/* 1. Plan / Budget Selector Header */}
              {!isCollapsed ? (
                <button
                  className="sidebar-nav-menu sidebar-nav-menu-budget js-sidebar-nav-menu user-data"
                  type="button"
                  onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
                >
                  <YnabIcon name="ynab_logo" width={24} height={24} className="sidebar-nav-ynab" />
                  <span className="sidebar-nav-budget-email">
                    <span className="sidebar-nav-budget-email-budget">{budgetName}</span>
                    <span className="sidebar-nav-budget-email-email button-truncate">{email}</span>
                  </span>
                  <YnabIcon name="caret_down" width={12} height={12} className="sidebar-nav-arrow" />
                </button>
              ) : (
                <div style={{ padding: "0.5rem 0", display: "flex", justifyContent: "center" }}>
                  <button
                    type="button"
                    className="js-sidebar-nav-menu"
                    onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                    title={budgetName}
                  >
                    <YnabIcon name="ynab_logo" width={24} height={24} />
                  </button>
                </div>
              )}

              {/* 2. Top Navigation Links */}
              <ul className="nav-main" tabIndex={-1}>
                <li className={`navlink navlink-budget ${activeRoute === "budget" ? "active" : ""}`}>
                  <a
                    href="#/budget"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate?.("budget");
                    }}
                    title="Plan"
                  >
                    <YnabIcon name="cash_in_envelope" width={20} height={20} />
                    {!isCollapsed && <span className="navlink-label">Plan</span>}
                  </a>
                </li>
                <li className={`navlink navlink-reports ${activeRoute === "reflect" ? "active" : ""}`}>
                  <a
                    href="#/reflect"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate?.("reflect");
                    }}
                    title="Reflect"
                  >
                    <YnabIcon name="bar_chart" width={20} height={20} />
                    {!isCollapsed && <span className="navlink-label">Reflect</span>}
                  </a>
                </li>
                <li className={`navlink navlink-accounts ${activeRoute === "accounts" ? "active" : ""}`}>
                  <a
                    href="#/accounts"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate?.("accounts");
                    }}
                    title="All Accounts"
                  >
                    <YnabIcon name="bank" width={20} height={20} />
                    {!isCollapsed && <span className="navlink-label">All Accounts</span>}
                  </a>
                </li>
              </ul>

              {/* 3. Account List or Empty State */}
              {!isCollapsed && (
                <div className="nav-accounts" style={{ flex: 1, overflowY: "auto" }}>
                  {/* CASH ACCOUNTS */}
                  {cashAccounts.length > 0 && (
                    <div className="nav-account cash">
                      <div
                        className="nav-account-block"
                        onClick={() => setIsCashCollapsed(!isCashCollapsed)}
                      >
                        <button
                          className="nav-account-name nav-account-name-button user-data"
                          type="button"
                        >
                          <YnabIcon
                            name={isCashCollapsed ? "chevron_right" : "chevron_down"}
                            width={10}
                            height={10}
                          />
                          <div>Cash</div>
                        </button>
                        <div className="nav-account-value nav-account-block-value user-data">
                          <span className="currency">{formatCurrency(cashTotal)}</span>
                        </div>
                      </div>

                      {!isCashCollapsed &&
                        cashAccounts.map((acc) => (
                          <div
                            key={acc.id}
                            className={`nav-account-row ${activeRoute === `account/${acc.id}` ? "is-selected" : ""}`}
                            onClick={() => onNavigate?.(`account/${acc.id}`)}
                          >
                            <div
                              className="nav-account-icons nav-account-icons-left"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAccount(acc);
                              }}
                              title="Edit Account"
                            >
                              <YnabIcon name="circle_fill" width={8} height={8} className="dot" />
                              <YnabIcon name="pencil" width={12} height={12} className="edit" />
                            </div>
                            <div className="nav-account-name user-data" title={acc.name}>
                              {acc.name}
                            </div>
                            <div className="nav-account-value user-data">
                              <span
                                className={`currency ${
                                  acc.balance < 0 ? "negative" : acc.balance > 0 ? "positive" : "zero"
                                }`}
                              >
                                {formatCurrency(acc.balance)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* CREDIT CARDS */}
                  {creditAccounts.length > 0 && (
                    <div className="nav-account credit">
                      <div
                        className="nav-account-block"
                        onClick={() => setIsCreditCollapsed(!isCreditCollapsed)}
                      >
                        <button
                          className="nav-account-name nav-account-name-button user-data"
                          type="button"
                        >
                          <YnabIcon
                            name={isCreditCollapsed ? "chevron_right" : "chevron_down"}
                            width={10}
                            height={10}
                          />
                          <div>Credit Cards</div>
                        </button>
                        <div className="nav-account-value nav-account-block-value user-data">
                          <span className="currency">{formatCurrency(creditTotal)}</span>
                        </div>
                      </div>

                      {!isCreditCollapsed &&
                        creditAccounts.map((acc) => (
                          <div
                            key={acc.id}
                            className={`nav-account-row ${activeRoute === `account/${acc.id}` ? "is-selected" : ""}`}
                            onClick={() => onNavigate?.(`account/${acc.id}`)}
                          >
                            <div
                              className="nav-account-icons nav-account-icons-left"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAccount(acc);
                              }}
                              title="Edit Account"
                            >
                              <YnabIcon name="circle_fill" width={8} height={8} className="dot" />
                              <YnabIcon name="pencil" width={12} height={12} className="edit" />
                            </div>
                            <div className="nav-account-name user-data" title={acc.name}>
                              {acc.name}
                            </div>
                            <div className="nav-account-value user-data">
                              <span
                                className={`currency ${
                                  acc.balance < 0 ? "negative" : acc.balance > 0 ? "positive" : "zero"
                                }`}
                              >
                                {formatCurrency(acc.balance)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* TRACKING ACCOUNTS */}
                  {trackingAccounts.length > 0 && (
                    <div className="nav-account tracking">
                      <div
                        className="nav-account-block"
                        onClick={() => setIsTrackingCollapsed(!isTrackingCollapsed)}
                      >
                        <button
                          className="nav-account-name nav-account-name-button user-data"
                          type="button"
                        >
                          <YnabIcon
                            name={isTrackingCollapsed ? "chevron_right" : "chevron_down"}
                            width={10}
                            height={10}
                          />
                          <div>Tracking</div>
                        </button>
                        <div className="nav-account-value nav-account-block-value user-data">
                          <span className="currency">{formatCurrency(trackingTotal)}</span>
                        </div>
                      </div>

                      {!isTrackingCollapsed &&
                        trackingAccounts.map((acc) => (
                          <div
                            key={acc.id}
                            className={`nav-account-row ${activeRoute === `account/${acc.id}` ? "is-selected" : ""}`}
                            onClick={() => onNavigate?.(`account/${acc.id}`)}
                          >
                            <div
                              className="nav-account-icons nav-account-icons-left"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAccount(acc);
                              }}
                              title="Edit Account"
                            >
                              <YnabIcon name="circle_fill" width={8} height={8} className="dot" />
                              <YnabIcon name="pencil" width={12} height={12} className="edit" />
                            </div>
                            <div className="nav-account-name user-data" title={acc.name}>
                              {acc.name}
                            </div>
                            <div className="nav-account-value user-data">
                              <span
                                className={`currency ${
                                  acc.balance < 0 ? "negative" : acc.balance > 0 ? "positive" : "zero"
                                }`}
                              >
                                {formatCurrency(acc.balance)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {accounts.length === 0 && (
                    <div className="nav-accounts-empty-state">
                      <h5>No Accounts</h5>
                      <p>
                        You can't plan without adding accounts to YNAB first. How about adding one now?
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Add Account Button */}
              {!isCollapsed && (
                <div className="nav-add-accounts" style={{ padding: "0.75rem", borderTop: "1px solid var(--separatorSubdued)" }}>
                  <button
                    className="button button-sidebar nav-add-account"
                    type="button"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => setIsAddAccountOpen(true)}
                  >
                    <YnabIcon name="plus_circle_fill" width={16} height={16} />
                    <span>Add Account</span>
                  </button>
                </div>
              )}

              {/* 5. Bottom Collapse / Expand Toggle */}
              <div
                className="sidebar-bottom"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isCollapsed ? "center" : "flex-end",
                  padding: "0.5rem 0.75rem",
                  borderTop: "1px solid var(--separatorSubdued)",
                }}
              >
                <button
                  type="button"
                  className={isCollapsed ? "sidebar-expand" : "sidebar-collapse"}
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--sidebarLabelPrimary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0.25rem",
                  }}
                >
                  <YnabIcon name={isCollapsed ? "chevron_right" : "chevron_left"} width={16} height={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Popovers & Modals */}
      <SettingsMenuModal
        isOpen={isSettingsMenuOpen}
        onClose={() => setIsSettingsMenuOpen(false)}
        budgetName={budgetName}
        onOpenBudgetSettings={() => setIsBudgetSettingsOpen(true)}
        onOpenManagePayees={() => onNavigate?.("payees")}
        onOpenThemeSwitcher={() => setIsThemeSwitcherOpen(true)}
        onNewBudget={() => setIsBudgetSettingsOpen(true)}
        onExportBudget={() => {
          alert("Exporting budget data to CSV...");
        }}
      />

      <AddAccountModal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        onAddAccount={(acc) => {
          onAddAccount?.(acc);
        }}
      />

      <EditAccountModal
        isOpen={Boolean(editingAccount)}
        account={editingAccount}
        onClose={() => setEditingAccount(null)}
        onSaveAccount={(id, name, balance) => {
          onUpdateAccount?.(id, name, balance);
        }}
        onDeleteAccount={(id) => {
          onDeleteAccount?.(id);
        }}
      />

      <BudgetSettingsModal
        isOpen={isBudgetSettingsOpen}
        currentBudgetName={budgetName}
        onClose={() => setIsBudgetSettingsOpen(false)}
        onSaveBudgetName={(name) => {
          onUpdateBudgetName?.(name);
        }}
      />

      <ThemeSwitcherModal
        isOpen={isThemeSwitcherOpen}
        onClose={() => setIsThemeSwitcherOpen(false)}
        onSelectTheme={(theme) => {
          if (theme === "light") {
            document.documentElement.classList.add("theme-light");
            document.documentElement.classList.remove("theme-dark");
          } else {
            document.documentElement.classList.add("theme-dark");
            document.documentElement.classList.remove("theme-light");
          }
        }}
      />
    </>
  );
};
