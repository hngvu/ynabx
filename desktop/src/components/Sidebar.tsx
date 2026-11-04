import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import type { Account, PlanSummary, CreatePlanRequest, UpdatePlanRequest } from "../api/types";
import { formatMilliunits } from "../utils/currency";
import { ManagePayeesModal } from "./modals/ManagePayeesModal";
import { EditFlagsModal } from "./modals/EditFlagsModal";
import { DisplayOptionsModal } from "./modals/DisplayOptionsModal";
import { FreshStartModal } from "./modals/FreshStartModal";
import { AccountSettingsModal } from "./modals/AccountSettingsModal";
import { BankConnectionsModal } from "./modals/BankConnectionsModal";
import { KeyboardShortcutsModal } from "./modals/KeyboardShortcutsModal";


export type ActiveView =
  | { type: "budget" }
  | { type: "reflect" }
  | { type: "all-accounts" }
  | { type: "account"; accountId: string }
  | { type: "guide" };

export interface SidebarProps {
  plans: PlanSummary[];
  activePlan: PlanSummary | null;
  accounts: Account[];
  activeView: ActiveView;
  currentMonth: string;
  onSelectView: (view: ActiveView) => void;
  onSelectPlan: (planId: string) => void;
  onCreatePlan: (reqOrName: CreatePlanRequest | string, currencyCode?: string) => Promise<void>;
  onUpdatePlan?: (planId: string, updatesOrName: UpdatePlanRequest | string, currencyCode?: string) => Promise<void>;
  onDeletePlan?: (planId: string) => Promise<void>;
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
  currentMonth,
  onSelectView,
  onSelectPlan,
  onCreatePlan,
  onUpdatePlan,
  onDeletePlan,
  onOpenAddAccount,
  theme,
  onToggleTheme,
  onLogout,
  userEmail,
}: SidebarProps): React.JSX.Element {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [planMenuOpen, setPlanMenuOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  // Modals for Plan Operations
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanCurrency, setNewPlanCurrency] = useState("USD");
  const [newCurrencyPlacement, setNewCurrencyPlacement] = useState("BEFORE");
  const [newNumberFormat, setNewNumberFormat] = useState("123,456.78");
  const [newDateFormat, setNewDateFormat] = useState("30/12/2026");

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editPlanName, setEditPlanName] = useState(activePlan?.name ?? "");
  const [editPlanCurrency, setEditPlanCurrency] = useState(activePlan?.currency_code ?? "USD");
  const [editCurrencyPlacement, setEditCurrencyPlacement] = useState("BEFORE");
  const [editNumberFormat, setEditNumberFormat] = useState("123,456.78");
  const [editDateFormat, setEditDateFormat] = useState("30/12/2026");

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [openPlanSubmenu, setOpenPlanSubmenu] = useState(false);
  const [showManagePayees, setShowManagePayees] = useState(false);
  const [showEditFlags, setShowEditFlags] = useState(false);
  const [showDisplayOptions, setShowDisplayOptions] = useState(false);
  const [showFreshStart, setShowFreshStart] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showBankConnections, setShowBankConnections] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [hideAmounts, setHideAmounts] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ynab_hide_amounts") === "true";
    }
    return false;
  });

  const handleToggleHideAmounts = () => {
    setHideAmounts((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("ynab_hide_amounts", String(next));
        if (next) {
          document.body.classList.add("hide-amounts");
        } else {
          document.body.classList.remove("hide-amounts");
        }
      }
      return next;
    });
  };

  const handleExportPlan = () => {
    if (!activePlan) return;
    const exportData = {
      plan: activePlan,
      accounts,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activePlan.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_Export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFreshStartConfirm = async () => {
    if (!activePlan) return;
    await onCreatePlan(`${activePlan.name} (Fresh Start)`, activePlan.currency_code);
  };


  const [cashCollapsed, setCashCollapsed] = useState(false);
  const [creditCollapsed, setCreditCollapsed] = useState(false);
  const [trackingCollapsed, setTrackingCollapsed] = useState(false);

  const budgetButtonRef = useRef<HTMLButtonElement>(null);
  const popoverCardRef = useRef<HTMLDivElement>(null);

  const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: "$",
    EUR: "€",
    VND: "₫",
    GBP: "£",
    CAD: "C$",
    AUD: "A$",
    JPY: "¥",
  };

  useEffect(() => {
    if (activePlan) {
      setEditPlanName(activePlan.name);
      setEditPlanCurrency(activePlan.currency_code);

      let placement =
        activePlan.currency_display_symbol === false
          ? "NONE"
          : activePlan.currency_symbol_first === false
          ? "AFTER"
          : "BEFORE";
      let numFormat =
        activePlan.number_format === "#,##0.00"
          ? "123,456.78"
          : activePlan.number_format || "123,456.78";
      let dtFormat =
        activePlan.date_format === "YYYY-MM-DD"
          ? "2026-12-30"
          : activePlan.date_format || "30/12/2026";

      try {
        const saved = localStorage.getItem(`ynabx_plan_format_${activePlan.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.currencyPlacement) placement = parsed.currencyPlacement;
          if (parsed.numberFormat) numFormat = parsed.numberFormat;
          if (parsed.dateFormat) dtFormat = parsed.dateFormat;
        }
      } catch {
        // Ignore storage error
      }

      setEditCurrencyPlacement(placement);
      setEditNumberFormat(numFormat);
      setEditDateFormat(dtFormat);
    }
  }, [activePlan]);

  // Group accounts exactly like real YNAB
  const cashAccounts = accounts.filter(
    (a) => a.on_budget && a.type !== "CREDIT_CARD" && !a.closed,
  );
  const creditAccounts = accounts.filter(
    (a) => a.on_budget && a.type === "CREDIT_CARD" && !a.closed,
  );
  const trackingAccounts = accounts.filter((a) => !a.on_budget && !a.closed);

  const totalCashBalance = cashAccounts.reduce(
    (sum, a) => sum + a.balance_milliunits,
    0,
  );
  const totalCreditBalance = creditAccounts.reduce(
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
    await onCreatePlan({
      name: newPlanName.trim(),
      currency_code: newPlanCurrency,
      number_format: newNumberFormat,
      currency_symbol_first: newCurrencyPlacement === "BEFORE",
      currency_display_symbol: newCurrencyPlacement !== "NONE",
      date_format: newDateFormat,
    });
    setNewPlanName("");
    setShowNewPlanModal(false);
  };

  const handleUpdatePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlan || !editPlanName.trim()) return;
    try {
      localStorage.setItem(
        `ynabx_plan_format_${activePlan.id}`,
        JSON.stringify({
          currencyPlacement: editCurrencyPlacement,
          numberFormat: editNumberFormat,
          dateFormat: editDateFormat,
        }),
      );
    } catch {
      // Ignore storage error
    }
    if (onUpdatePlan) {
      await onUpdatePlan(activePlan.id, {
        name: editPlanName.trim(),
        currency_code: editPlanCurrency,
        number_format: editNumberFormat,
        currency_symbol_first: editCurrencyPlacement === "BEFORE",
        currency_display_symbol: editCurrencyPlacement !== "NONE",
        date_format: editDateFormat,
      });
    }
    setShowSettingsModal(false);
  };

  const handleDeleteActivePlan = async () => {
    if (!activePlan || plans.length <= 1) return;
    if (onDeletePlan) {
      await onDeletePlan(activePlan.id);
    }
    setShowDeleteModal(false);
  };

  const planIdSegment = activePlan ? activePlan.id : "default";
  const ymSegment = (currentMonth || "").slice(0, 7).replace("-", ""); // e.g. 202610
  const budgetPath = `/${planIdSegment}/budget/${ymSegment || "202610"}`;
  const reportsPath = `/${planIdSegment}/reports`;
  const accountsPath = `/${planIdSegment}/accounts`;

  const renderAccountRow = (acc: Account) => {
    const isSelected =
      activeView.type === "account" && activeView.accountId === acc.id;
    const isNegative = acc.balance_milliunits < 0;
    const accountPath = `/${planIdSegment}/accounts/${acc.id}`;

    return (
      <Link
        key={acc.id}
        to={accountPath}
        className={`nav-account-row ${isSelected ? "is-selected" : ""}`}
        style={{
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          textDecoration: "none",
        }}
        onClick={() => {
          onSelectView({ type: "account", accountId: acc.id });
        }}
      >
        <div className="nav-account-icons nav-account-icons-left js-nav-account-icons-left">
          <svg className="ynab-new-icon edit" width="12" height="12">
            <use href="#icon_sprite_pencil"></use>
          </svg>
        </div>
        <div className="nav-account-name user-data" title={acc.name}>
          {acc.name}
        </div>
        <div className="nav-account-value user-data">
          <span
            className={`user-data currency tabular-nums ${
              isNegative ? "negative" : "positive"
            }`}
          >
            <bdi>{formatMilliunits(acc.balance_milliunits)}</bdi>
          </span>
        </div>
      </Link>
    );
  };

  return (
    <nav
      className={`ynab-u sidebar logged-in ${isCollapsed ? "is-collapsed" : ""}`}
      style={{
        width: isCollapsed ? "52px" : "260px",
        flexShrink: 0,
        height: "100vh",
        transition: "width 0.2s cubic-bezier(0.2, 0, 0, 1)",
      }}
      role="navigation"
    >
      <div className="sidebar-left">
        <div className="sidebar-contents">
          <div className="sidebar-nav">
            {/* Budget Switcher Header */}
            <button
              ref={budgetButtonRef}
              className="sidebar-nav-menu sidebar-nav-menu-budget js-sidebar-nav-menu user-data"
              type="button"
              style={{
                position: "relative",
                zIndex: planMenuOpen ? 10003 : 10,
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (planMenuOpen) {
                  setPlanMenuOpen(false);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setPopoverPos({
                    top: rect.bottom + 4,
                    left: Math.max(10, rect.left),
                  });
                  setPlanMenuOpen(true);
                }
              }}
              title={activePlan?.name ?? "Budget Plans"}
            >
              <svg className="ynab-new-icon sidebar-nav-ynab" width="24" height="24">
                <use href="#icon_sprite_ynab_logo"></use>
                <title>{activePlan?.name ?? "test"}</title>
              </svg>
              <div className="sidebar-nav-budget-email">
                <span className="sidebar-nav-budget-email-budget">
                  {activePlan?.name ?? "test"}
                </span>
                <span className="sidebar-nav-budget-email-email button-truncate">
                  {userEmail || "vuhse182692@fpt.edu.vn"}
                </span>
              </div>
              <svg className="ynab-new-icon sidebar-nav-arrow" width="12" height="12">
                <use href="#icon_sprite_caret_down"></use>
              </svg>
            </button>

            {/* Plan Switcher Menu Popover */}
            {planMenuOpen && popoverPos && typeof document !== "undefined" && createPortal(
              <div
                className="modal-overlay active ynab-new-settings-menu popover-anchor-overlay"
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 10001,
                  backgroundColor: "transparent",
                  display: "block",
                  pointerEvents: "auto",
                }}
                onClick={() => {
                  setPlanMenuOpen(false);
                  setOpenPlanSubmenu(false);
                }}
              >
                <div
                  ref={popoverCardRef}
                  className="menu js-menu ynab-new-settings-menu"
                  role="menu"
                  style={{
                    position: "fixed",
                    top: `${popoverPos.top}px`,
                    left: `${popoverPos.left}px`,
                    width: "17rem",
                    zIndex: 10006,
                    maxHeight: "calc(100vh - 70px)",
                    overflowY: "auto",
                    overflowX: "visible",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* New Plan */}
                  <button
                    className="menu-item js-menu-item modal-select-budget-create"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setPlanMenuOpen(false);
                      setOpenPlanSubmenu(false);
                      setNewPlanName("");
                      setNewPlanCurrency("USD");
                      setNewCurrencyPlacement("BEFORE");
                      setNewNumberFormat("123,456.78");
                      setNewDateFormat("30/12/2026");
                      setShowNewPlanModal(true);
                    }}
                  >
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_plus_circle_fill"></use>
                    </svg>
                    <span>New Plan</span>
                  </button>

                  {/* Open Plan with Submenu */}
                  <div
                    style={{ position: "relative" }}
                    onMouseEnter={() => setOpenPlanSubmenu(true)}
                    onMouseLeave={() => setOpenPlanSubmenu(false)}
                  >
                    <button
                      className="menu-item js-menu-item modal-select-budget-open has-submenu"
                      role="menuitem"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenPlanSubmenu((prev) => !prev);
                      }}
                    >
                      <svg className="ynab-new-icon" width="16" height="16">
                        <use href="#icon_sprite_folder"></use>
                      </svg>
                      <span style={{ flex: 1, textAlign: "left" }}>Open Plan</span>
                      <svg className="ynab-new-icon menu-item-disclosure" width="12" height="12">
                        <use href="#icon_sprite_chevron_right"></use>
                      </svg>
                    </button>

                    {openPlanSubmenu && (
                      <div
                        className="menu js-menu settings-menu-recent-budgets"
                        role="menu"
                        style={{
                          position: "fixed",
                          top: `${popoverPos.top + 38}px`,
                          left: `${popoverPos.left + 266}px`,
                          minWidth: "15rem",
                          maxHeight: "340px",
                          overflowY: "auto",
                          zIndex: 10008,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="menu-heading">Recent Plans</div>
                        {(() => {
                          const otherPlans = plans.filter((p) => p.id !== activePlan?.id);
                          if (otherPlans.length === 0) {
                            return (
                              <div style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem", color: "var(--labelSecondary)", fontStyle: "italic" }}>
                                No other plans
                              </div>
                            );
                          }
                          return otherPlans.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="menu-item js-menu-item recent-budgets-budget-open"
                              onClick={() => {
                                onSelectPlan(p.id);
                                setPlanMenuOpen(false);
                                setOpenPlanSubmenu(false);
                              }}
                            >
                              <svg className="ynab-new-icon" width="16" height="16">
                                <use href="#icon_sprite_document"></use>
                              </svg>
                              <span style={{ flex: 1, textAlign: "left" }}>{p.name}</span>
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="menu-separator" role="separator"></div>
                  <div className="menu-heading">Current Plan</div>

                  {/* Plan Settings */}
                  <button
                    className="menu-item js-menu-item modal-select-budget-settings"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setPlanMenuOpen(false);
                      setOpenPlanSubmenu(false);
                      if (activePlan) {
                        setEditPlanName(activePlan.name);
                        setEditPlanCurrency(activePlan.currency_code);
                      }
                      setShowSettingsModal(true);
                    }}
                  >
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_wrench"></use>
                    </svg>
                    <span>Plan Settings</span>
                  </button>

                  {/* Manage Payees */}
                  <button
                    className="menu-item js-menu-item modal-select-budget-manage-payees"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setPlanMenuOpen(false);
                      setOpenPlanSubmenu(false);
                      setShowManagePayees(true);
                    }}
                  >
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_arrows_circle_fill"></use>
                    </svg>
                    <span>Manage Payees</span>
                  </button>

                  {/* Edit Flags */}
                  <button
                    className="menu-item js-menu-item modal-select-budget-flag-names"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setPlanMenuOpen(false);
                      setOpenPlanSubmenu(false);
                      setShowEditFlags(true);
                    }}
                  >
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_flag_fill"></use>
                    </svg>
                    <span>Edit Flags</span>
                  </button>

                  {/* Display Options */}
                  <button
                    className="menu-item js-menu-item modal-select-theme-switcher"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setPlanMenuOpen(false);
                      setOpenPlanSubmenu(false);
                      setShowDisplayOptions(true);
                    }}
                  >
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_paint_roller"></use>
                    </svg>
                    <span>Display Options</span>
                  </button>

                  {/* Export Plan */}
                  <button
                    className="menu-item js-menu-item modal-select-budget-export"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setPlanMenuOpen(false);
                      setOpenPlanSubmenu(false);
                      handleExportPlan();
                    }}
                  >
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_document_with_arrow_down"></use>
                    </svg>
                    <span>Export Plan</span>
                  </button>

                  {/* Make a Fresh Start */}
                  <button
                    className="menu-item js-menu-item modal-select-budget-fresh-start"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setPlanMenuOpen(false);
                      setOpenPlanSubmenu(false);
                      setShowFreshStart(true);
                    }}
                  >
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_leaf"></use>
                    </svg>
                    <span>Make a Fresh Start</span>
                  </button>

                  <div className="menu-separator" role="separator"></div>
                  <div className="menu-heading">Share YNAB</div>

                  {/* Gift YNAB */}
                  <button
                    className="menu-item js-menu-item modal-select-gift-ynab"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setPlanMenuOpen(false);
                      setOpenPlanSubmenu(false);
                      window.open("https://www.ynab.com/gift-ynab", "_blank");
                    }}
                  >
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_gift"></use>
                    </svg>
                    <span>Gift YNAB</span>
                  </button>

                  {/* Hide Amounts */}
                  <button
                    className="menu-item js-menu-item modal-select-hide-amounts"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setPlanMenuOpen(false);
                      setOpenPlanSubmenu(false);
                      handleToggleHideAmounts();
                    }}
                  >
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_eye_slash"></use>
                    </svg>
                    <span>{hideAmounts ? "Show Amounts" : "Hide Amounts"}</span>
                  </button>

                  {/* YNAB Together */}
                  <button
                    className="menu-item js-menu-item modal-select-family"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setPlanMenuOpen(false);
                      setOpenPlanSubmenu(false);
                      window.open("https://www.ynab.com/together", "_blank");
                    }}
                  >
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_together"></use>
                    </svg>
                    <span>YNAB Together</span>
                  </button>

                  <div className="menu-separator" role="separator"></div>
                  <div className="menu-heading">Account</div>

                  {/* Account Settings */}
                  <button
                    className="menu-item js-menu-item modal-select-budget-my-account"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setPlanMenuOpen(false);
                      setOpenPlanSubmenu(false);
                      setShowAccountSettings(true);
                    }}
                  >
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_user"></use>
                    </svg>
                    <span>Account Settings</span>
                  </button>

                  {/* Manage Bank Connections */}
                  <button
                    className="menu-item js-menu-item modal-select-budget-manage-connections"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setPlanMenuOpen(false);
                      setOpenPlanSubmenu(false);
                      setShowBankConnections(true);
                    }}
                  >
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_bank"></use>
                    </svg>
                    <span>Manage Bank Connections</span>
                  </button>

                  {/* Join a Workshop */}
                  <button
                    className="menu-item js-menu-item modal-select-budget-workshops"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setPlanMenuOpen(false);
                      setOpenPlanSubmenu(false);
                      window.open("https://www.ynab.com/free-workshops", "_blank");
                    }}
                  >
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_graduation_hat"></use>
                    </svg>
                    <span>Join a Workshop</span>
                  </button>

                  {/* Keyboard Shortcuts */}
                  <button
                    className="menu-item js-menu-item modal-select-budget-keyboard-shortcuts"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setPlanMenuOpen(false);
                      setOpenPlanSubmenu(false);
                      setShowKeyboardShortcuts(true);
                    }}
                  >
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_keyboard"></use>
                    </svg>
                    <span>Keyboard Shortcuts</span>
                  </button>

                  <div className="menu-separator" role="separator"></div>

                  {/* Log Out */}
                  <button
                    className="menu-item js-menu-item"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setPlanMenuOpen(false);
                      setOpenPlanSubmenu(false);
                      onLogout();
                    }}
                  >
                    <svg className="ynab-new-icon" width="16" height="16">
                      <use href="#icon_sprite_logout"></use>
                    </svg>
                    <span>Log Out</span>
                  </button>
                </div>
              </div>,
              document.body
            )}

            {/* Modal: New Plan */}
            {showNewPlanModal && typeof document !== "undefined" && createPortal(
              <div
                className="modal-overlay active"
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 20000,
                  backgroundColor: "rgba(0,0,0,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => setShowNewPlanModal(false)}
              >
                <div
                  className="modal modal-budget-settings modal-manage-budgets"
                  style={{
                    width: "38.5rem",
                    maxWidth: "94vw",
                    padding: 0,
                    backgroundColor: "var(--backgroundPrimaryElevated, #ffffff)",
                    borderRadius: "10px",
                    boxShadow: "0 18px 54px rgba(0,0,0,0.3)",
                    border: "1px solid var(--separatorStandard, #d2d8de)",
                    color: "var(--labelPrimary, #191818)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="modal-header"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "1.15rem 1.5rem",
                      borderBottom: "1px solid var(--separatorSubdued, #e5e5e5)",
                      margin: 0,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--labelPrimary, #191818)", textAlign: "left", flex: 1 }}>
                      New Plan
                    </h2>
                    <button
                      type="button"
                      className="modal-close-button"
                      aria-label="Close"
                      onClick={() => setShowNewPlanModal(false)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--actionPrimary, #545bfe)",
                        padding: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginLeft: "auto",
                        flexShrink: 0,
                        borderRadius: "4px",
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M2.5 2.5L13.5 13.5M13.5 2.5L2.5 13.5" />
                      </svg>
                    </button>
                  </div>
                  <form onSubmit={handleCreatePlanSubmit} style={{ padding: "1.35rem 1.5rem 1.5rem", display: "grid", gap: "1.1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, color: "var(--labelPrimary, #191818)", marginBottom: "0.4rem" }}>
                        Plan Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Personal Plan"
                        value={newPlanName}
                        onChange={(e) => setNewPlanName(e.target.value)}
                        className="form-input modal-budget-settings-name"
                        style={{
                          width: "100%",
                          height: "40px",
                          padding: "0 0.8rem",
                          fontSize: "0.95rem",
                          borderRadius: "6px",
                          border: "1px solid var(--inputBorder, #d2d8de)",
                          backgroundColor: "var(--inputBackground, #ffffff)",
                          color: "var(--labelPrimary, #191818)",
                          margin: 0,
                        }}
                        autoFocus
                        required
                      />
                    </div>
                    <div className="modal-budget-settings-currency-fields" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, color: "var(--labelPrimary, #191818)", marginBottom: "0.4rem" }}>
                          Currency
                        </label>
                        <select
                          value={newPlanCurrency}
                          onChange={(e) => setNewPlanCurrency(e.target.value)}
                          className="form-select"
                          style={{
                            width: "100%",
                            height: "40px",
                            padding: "0 0.75rem",
                            fontSize: "0.95rem",
                            borderRadius: "6px",
                            border: "1px solid var(--inputBorder, #d2d8de)",
                            backgroundColor: "var(--inputBackground, #ffffff)",
                            color: "var(--labelPrimary, #191818)",
                            margin: 0,
                          }}
                        >
                          <option value="USD">US Dollar–USD</option>
                          <option value="EUR">Euro–EUR</option>
                          <option value="VND">Vietnamese Dong–VND</option>
                          <option value="GBP">British Pound–GBP</option>
                          <option value="CAD">Canadian Dollar–CAD</option>
                          <option value="AUD">Australian Dollar–AUD</option>
                          <option value="JPY">Japanese Yen–JPY</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, color: "var(--labelPrimary, #191818)", marginBottom: "0.4rem" }}>
                          Currency Placement
                        </label>
                        <select
                          value={newCurrencyPlacement}
                          onChange={(e) => setNewCurrencyPlacement(e.target.value)}
                          className="form-select"
                          style={{
                            width: "100%",
                            height: "40px",
                            padding: "0 0.75rem",
                            fontSize: "0.95rem",
                            borderRadius: "6px",
                            border: "1px solid var(--inputBorder, #d2d8de)",
                            backgroundColor: "var(--inputBackground, #ffffff)",
                            color: "var(--labelPrimary, #191818)",
                            margin: 0,
                          }}
                        >
                          <option value="BEFORE">{`Before amount (${CURRENCY_SYMBOLS[newPlanCurrency] ?? "$"}${newNumberFormat})`}</option>
                          <option value="AFTER">{`After amount (${newNumberFormat}${CURRENCY_SYMBOLS[newPlanCurrency] ?? "$"})`}</option>
                          <option value="NONE">{`Don't show (${newNumberFormat})`}</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, color: "var(--labelPrimary, #191818)", marginBottom: "0.4rem" }}>
                        Number Format
                      </label>
                      <select
                        value={newNumberFormat}
                        onChange={(e) => setNewNumberFormat(e.target.value)}
                        className="form-select"
                        style={{
                          width: "100%",
                          height: "40px",
                          padding: "0 0.75rem",
                          fontSize: "0.95rem",
                          borderRadius: "6px",
                          border: "1px solid var(--inputBorder, #d2d8de)",
                          backgroundColor: "var(--inputBackground, #ffffff)",
                          color: "var(--labelPrimary, #191818)",
                          margin: 0,
                        }}
                      >
                        <option value="123,456.78">123,456.78</option>
                        <option value="123.456,78">123.456,78</option>
                        <option value="123,456">123,456</option>
                        <option value="123 456.78">123 456.78</option>
                        <option value="123'456.78">123&apos;456.78</option>
                        <option value="123.456">123.456</option>
                        <option value="123 456,78">123 456,78</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, color: "var(--labelPrimary, #191818)", marginBottom: "0.4rem" }}>
                        Date Format
                      </label>
                      <select
                        value={newDateFormat}
                        onChange={(e) => setNewDateFormat(e.target.value)}
                        className="form-select"
                        style={{
                          width: "100%",
                          height: "40px",
                          padding: "0 0.75rem",
                          fontSize: "0.95rem",
                          borderRadius: "6px",
                          border: "1px solid var(--inputBorder, #d2d8de)",
                          backgroundColor: "var(--inputBackground, #ffffff)",
                          color: "var(--labelPrimary, #191818)",
                          margin: 0,
                        }}
                      >
                        <option value="30/12/2026">30/12/2026</option>
                        <option value="12/30/2026">12/30/2026</option>
                        <option value="2026/12/30">2026/12/30</option>
                        <option value="2026-12-30">2026-12-30</option>
                        <option value="30.12.2026">30.12.2026</option>
                        <option value="30-12-2026">30-12-2026</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.6rem" }}>
                      <button
                        type="button"
                        className="button button-cancel"
                        onClick={() => setShowNewPlanModal(false)}
                        style={{
                          padding: "0 1.25rem",
                          height: "40px",
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          borderRadius: "8px",
                          backgroundColor: "var(--buttonSecondaryBackground, #f0f1ff)",
                          color: "var(--actionPrimary, #545bfe)",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="button button-primary"
                        style={{
                          padding: "0 1.35rem",
                          height: "40px",
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          borderRadius: "8px",
                          backgroundColor: "var(--actionPrimary, #545bfe)",
                          color: "#ffffff",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Create Plan
                      </button>
                    </div>
                  </form>
                </div>
              </div>,
              document.body
            )}

            {/* Modal: Plan Settings */}
            {showSettingsModal && activePlan && typeof document !== "undefined" && createPortal(
              <div
                className="modal-overlay active"
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 20000,
                  backgroundColor: "rgba(0,0,0,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => setShowSettingsModal(false)}
              >
                <div
                  className="modal modal-budget-settings modal-manage-budgets"
                  style={{
                    width: "38.5rem",
                    maxWidth: "94vw",
                    padding: 0,
                    backgroundColor: "var(--backgroundPrimaryElevated, #ffffff)",
                    borderRadius: "10px",
                    boxShadow: "0 18px 54px rgba(0,0,0,0.3)",
                    border: "1px solid var(--separatorStandard, #d2d8de)",
                    color: "var(--labelPrimary, #191818)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="modal-header"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "1.15rem 1.5rem",
                      borderBottom: "1px solid var(--separatorSubdued, #e5e5e5)",
                      margin: 0,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--labelPrimary, #191818)", textAlign: "left", flex: 1 }}>
                      Plan Settings
                    </h2>
                    <button
                      type="button"
                      className="modal-close-button"
                      aria-label="Close"
                      onClick={() => setShowSettingsModal(false)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--actionPrimary, #545bfe)",
                        padding: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginLeft: "auto",
                        flexShrink: 0,
                        borderRadius: "4px",
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M2.5 2.5L13.5 13.5M13.5 2.5L2.5 13.5" />
                      </svg>
                    </button>
                  </div>
                  <form onSubmit={handleUpdatePlanSubmit} style={{ padding: "1.35rem 1.5rem 1.5rem", display: "grid", gap: "1.1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, color: "var(--labelPrimary, #191818)", marginBottom: "0.4rem" }}>
                        Plan Name
                      </label>
                      <input
                        type="text"
                        placeholder="Plan name"
                        value={editPlanName}
                        onChange={(e) => setEditPlanName(e.target.value)}
                        className="form-input modal-budget-settings-name"
                        style={{
                          width: "100%",
                          height: "40px",
                          padding: "0 0.8rem",
                          fontSize: "0.95rem",
                          borderRadius: "6px",
                          border: "1px solid var(--inputBorder, #d2d8de)",
                          backgroundColor: "var(--inputBackground, #ffffff)",
                          color: "var(--labelPrimary, #191818)",
                          margin: 0,
                        }}
                        autoFocus
                        required
                      />
                    </div>
                    <div className="modal-budget-settings-currency-fields" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, color: "var(--labelPrimary, #191818)", marginBottom: "0.4rem" }}>
                          Currency
                        </label>
                        <select
                          value={editPlanCurrency}
                          onChange={(e) => setEditPlanCurrency(e.target.value)}
                          className="form-select"
                          style={{
                            width: "100%",
                            height: "40px",
                            padding: "0 0.75rem",
                            fontSize: "0.95rem",
                            borderRadius: "6px",
                            border: "1px solid var(--inputBorder, #d2d8de)",
                            backgroundColor: "var(--inputBackground, #ffffff)",
                            color: "var(--labelPrimary, #191818)",
                            margin: 0,
                          }}
                        >
                          <option value="USD">US Dollar–USD</option>
                          <option value="EUR">Euro–EUR</option>
                          <option value="VND">Vietnamese Dong–VND</option>
                          <option value="GBP">British Pound–GBP</option>
                          <option value="CAD">Canadian Dollar–CAD</option>
                          <option value="AUD">Australian Dollar–AUD</option>
                          <option value="JPY">Japanese Yen–JPY</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, color: "var(--labelPrimary, #191818)", marginBottom: "0.4rem" }}>
                          Currency Placement
                        </label>
                        <select
                          value={editCurrencyPlacement}
                          onChange={(e) => setEditCurrencyPlacement(e.target.value)}
                          className="form-select"
                          style={{
                            width: "100%",
                            height: "40px",
                            padding: "0 0.75rem",
                            fontSize: "0.95rem",
                            borderRadius: "6px",
                            border: "1px solid var(--inputBorder, #d2d8de)",
                            backgroundColor: "var(--inputBackground, #ffffff)",
                            color: "var(--labelPrimary, #191818)",
                            margin: 0,
                          }}
                        >
                          <option value="BEFORE">{`Before amount (${CURRENCY_SYMBOLS[editPlanCurrency] ?? "$"}${editNumberFormat})`}</option>
                          <option value="AFTER">{`After amount (${editNumberFormat}${CURRENCY_SYMBOLS[editPlanCurrency] ?? "$"})`}</option>
                          <option value="NONE">{`Don't show (${editNumberFormat})`}</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, color: "var(--labelPrimary, #191818)", marginBottom: "0.4rem" }}>
                        Number Format
                      </label>
                      <select
                        value={editNumberFormat}
                        onChange={(e) => setEditNumberFormat(e.target.value)}
                        className="form-select"
                        style={{
                          width: "100%",
                          height: "40px",
                          padding: "0 0.75rem",
                          fontSize: "0.95rem",
                          borderRadius: "6px",
                          border: "1px solid var(--inputBorder, #d2d8de)",
                          backgroundColor: "var(--inputBackground, #ffffff)",
                          color: "var(--labelPrimary, #191818)",
                          margin: 0,
                        }}
                      >
                        <option value="123,456.78">123,456.78</option>
                        <option value="123.456,78">123.456,78</option>
                        <option value="123,456">123,456</option>
                        <option value="123 456.78">123 456.78</option>
                        <option value="123'456.78">123&apos;456.78</option>
                        <option value="123.456">123.456</option>
                        <option value="123 456,78">123 456,78</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, color: "var(--labelPrimary, #191818)", marginBottom: "0.4rem" }}>
                        Date Format
                      </label>
                      <select
                        value={editDateFormat}
                        onChange={(e) => setEditDateFormat(e.target.value)}
                        className="form-select"
                        style={{
                          width: "100%",
                          height: "40px",
                          padding: "0 0.75rem",
                          fontSize: "0.95rem",
                          borderRadius: "6px",
                          border: "1px solid var(--inputBorder, #d2d8de)",
                          backgroundColor: "var(--inputBackground, #ffffff)",
                          color: "var(--labelPrimary, #191818)",
                          margin: 0,
                        }}
                      >
                        <option value="30/12/2026">30/12/2026</option>
                        <option value="12/30/2026">12/30/2026</option>
                        <option value="2026/12/30">2026/12/30</option>
                        <option value="2026-12-30">2026-12-30</option>
                        <option value="30.12.2026">30.12.2026</option>
                        <option value="30-12-2026">30-12-2026</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.6rem" }}>
                      <button
                        type="button"
                        className="button button-cancel"
                        onClick={() => setShowSettingsModal(false)}
                        style={{
                          padding: "0 1.25rem",
                          height: "40px",
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          borderRadius: "8px",
                          backgroundColor: "var(--buttonSecondaryBackground, #f0f1ff)",
                          color: "var(--actionPrimary, #545bfe)",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="button button-primary"
                        style={{
                          padding: "0 1.35rem",
                          height: "40px",
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          borderRadius: "8px",
                          backgroundColor: "var(--actionPrimary, #545bfe)",
                          color: "#ffffff",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Apply Settings
                      </button>
                    </div>
                  </form>
                </div>
              </div>,
              document.body
            )}

            {/* Modal: Delete Plan Confirmation */}
            {showDeleteModal && activePlan && typeof document !== "undefined" && createPortal(
              <div
                className="modal-overlay active"
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 20000,
                  backgroundColor: "rgba(0,0,0,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => setShowDeleteModal(false)}
              >
                <div
                  className="modal modal-generic modal-manage-budgets"
                  style={{
                    width: "24rem",
                    padding: "1.5rem",
                    backgroundColor: "var(--backgroundPrimaryElevated, #ffffff)",
                    borderRadius: "10px",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
                    border: "1px solid var(--separatorStandard, #d2d8de)",
                    color: "var(--labelPrimary, #191818)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="modal-header" style={{ marginBottom: "0.8rem" }}>
                    <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--labelNegative, #bf2e3b)", textAlign: "left" }}>
                      Delete Plan
                    </h2>
                  </div>
                  <p style={{ fontSize: "0.88rem", color: "var(--labelSecondary)", lineHeight: 1.45, marginBottom: "1.25rem" }}>
                    Are you sure you want to delete plan <strong>{activePlan.name}</strong>? This action cannot be undone.
                  </p>
                  <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="button button-cancel"
                      onClick={() => setShowDeleteModal(false)}
                      style={{
                        padding: "0 1.25rem",
                        height: "40px",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        borderRadius: "8px",
                        backgroundColor: "var(--buttonSecondaryBackground, #f0f1ff)",
                        color: "var(--actionPrimary, #545bfe)",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="button button-red"
                      onClick={handleDeleteActivePlan}
                      style={{
                        padding: "0 1.35rem",
                        height: "40px",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        borderRadius: "8px",
                        backgroundColor: "var(--labelNegative, #bf2e3b)",
                        color: "#ffffff",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Delete Plan
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}

            
            {/* Modal: Manage Payees */}
            <ManagePayeesModal
              isOpen={showManagePayees}
              planId={activePlan?.id || ""}
              onClose={() => setShowManagePayees(false)}
            />

            {/* Modal: Edit Flags */}
            <EditFlagsModal
              isOpen={showEditFlags}
              planId={activePlan?.id || ""}
              onClose={() => setShowEditFlags(false)}
            />

            {/* Modal: Display Options */}
            <DisplayOptionsModal
              isOpen={showDisplayOptions}
              theme={theme}
              onToggleTheme={onToggleTheme}
              hideAmounts={hideAmounts}
              onToggleHideAmounts={handleToggleHideAmounts}
              onClose={() => setShowDisplayOptions(false)}
            />

            {/* Modal: Make a Fresh Start */}
            <FreshStartModal
              isOpen={showFreshStart}
              planName={activePlan?.name || "My Plan"}
              onConfirm={handleFreshStartConfirm}
              onClose={() => setShowFreshStart(false)}
            />

            {/* Modal: Account Settings */}
            <AccountSettingsModal
              isOpen={showAccountSettings}
              userEmail={userEmail}
              activePlan={activePlan}
              totalPlansCount={plans.length}
              onLogout={onLogout}
              onClose={() => setShowAccountSettings(false)}
            />

            {/* Modal: Bank Connections */}
            <BankConnectionsModal
              isOpen={showBankConnections}
              accounts={accounts}
              onClose={() => setShowBankConnections(false)}
            />

            {/* Modal: Keyboard Shortcuts */}
            <KeyboardShortcutsModal
              isOpen={showKeyboardShortcuts}
              onClose={() => setShowKeyboardShortcuts(false)}
            />

            {/* Main Nav Items */}
            <ul className="nav-main">
              <li className={`navlink navlink-budget ${activeView.type === "budget" ? "active" : ""}`}>
                <Link
                  to={budgetPath}
                  className="ember-view"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    textDecoration: "none",
                    color: "inherit",
                    cursor: "pointer",
                  }}
                  onClick={() => onSelectView({ type: "budget" })}
                >
                  <svg className="ynab-new-icon" width="20" height="20">
                    <use href="#icon_sprite_cash_in_envelope"></use>
                  </svg>
                  <div className="navlink-label">Plan</div>
                </Link>
              </li>
              <li className={`navlink navlink-reports ${activeView.type === "reflect" ? "active" : ""}`}>
                <Link
                  to={reportsPath}
                  className="ember-view"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    textDecoration: "none",
                    color: "inherit",
                    cursor: "pointer",
                  }}
                  onClick={() => onSelectView({ type: "reflect" })}
                >
                  <svg className="ynab-new-icon" width="20" height="20">
                    <use href="#icon_sprite_bar_chart"></use>
                  </svg>
                  <div className="navlink-label">Reflect</div>
                </Link>
              </li>
              <li className={`navlink navlink-accounts ${activeView.type === "all-accounts" ? "active" : ""}`}>
                <Link
                  to={accountsPath}
                  className="ember-view"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    textDecoration: "none",
                    color: "inherit",
                    cursor: "pointer",
                  }}
                  onClick={() => onSelectView({ type: "all-accounts" })}
                >
                  <svg className="ynab-new-icon" width="20" height="20">
                    <use href="#icon_sprite_bank"></use>
                  </svg>
                  <div className="navlink-label">All Accounts</div>
                </Link>
              </li>
            </ul>

            {/* Accounts Groups */}
            <div className="nav-accounts">
              {/* CASH ACCOUNTS */}
              {cashAccounts.length > 0 && (
                <div className="nav-account cash">
                  <div className="nav-account-block">
                    <button
                      className="nav-account-name nav-account-name-button user-data"
                      aria-label="collapse CASH"
                      type="button"
                      onClick={() => setCashCollapsed(!cashCollapsed)}
                    >
                      <svg className="ynab-new-icon" width="8" height="8">
                        <use
                          href={
                            cashCollapsed
                              ? "#icon_sprite_chevron_right"
                              : "#icon_sprite_chevron_down"
                          }
                        ></use>
                      </svg>
                      <div>CASH</div>
                    </button>
                    <div className="nav-account-value nav-account-block-value user-data">
                      <span
                        className={`user-data currency tabular-nums ${
                          totalCashBalance < 0 ? "negative" : "positive"
                        }`}
                      >
                        <bdi>{formatMilliunits(totalCashBalance)}</bdi>
                      </span>
                    </div>
                  </div>
                  {!cashCollapsed && cashAccounts.map(renderAccountRow)}
                </div>
              )}

              {/* CREDIT ACCOUNTS */}
              {creditAccounts.length > 0 && (
                <div className="nav-account credit">
                  <div className="nav-account-block">
                    <button
                      className="nav-account-name nav-account-name-button user-data"
                      aria-label="collapse CREDIT"
                      type="button"
                      onClick={() => setCreditCollapsed(!creditCollapsed)}
                    >
                      <svg className="ynab-new-icon" width="8" height="8">
                        <use
                          href={
                            creditCollapsed
                              ? "#icon_sprite_chevron_right"
                              : "#icon_sprite_chevron_down"
                          }
                        ></use>
                      </svg>
                      <div>CREDIT</div>
                    </button>
                    <div className="nav-account-value nav-account-block-value user-data">
                      <span
                        className={`user-data currency tabular-nums ${
                          totalCreditBalance < 0 ? "negative" : "positive"
                        }`}
                      >
                        <bdi>{formatMilliunits(totalCreditBalance)}</bdi>
                      </span>
                    </div>
                  </div>
                  {!creditCollapsed && creditAccounts.map(renderAccountRow)}
                </div>
              )}

              {/* TRACKING ACCOUNTS */}
              {trackingAccounts.length > 0 && (
                <div className="nav-account offBudget">
                  <div className="nav-account-block">
                    <button
                      className="nav-account-name nav-account-name-button user-data"
                      aria-label="collapse TRACKING"
                      type="button"
                      onClick={() => setTrackingCollapsed(!trackingCollapsed)}
                    >
                      <svg className="ynab-new-icon" width="8" height="8">
                        <use
                          href={
                            trackingCollapsed
                              ? "#icon_sprite_chevron_right"
                              : "#icon_sprite_chevron_down"
                          }
                        ></use>
                      </svg>
                      <div>TRACKING</div>
                    </button>
                    <div className="nav-account-value nav-account-block-value user-data">
                      <span
                        className={`user-data currency tabular-nums ${
                          totalTrackingBalance < 0 ? "negative" : "positive"
                        }`}
                      >
                        <bdi>{formatMilliunits(totalTrackingBalance)}</bdi>
                      </span>
                    </div>
                  </div>
                  {!trackingCollapsed && trackingAccounts.map(renderAccountRow)}
                </div>
              )}
            </div>

            {/* Add Account & Connections */}
            <div className="nav-add-accounts">
              <button
                className="ynab-button contrast button-sidebar nav-add-account"
                type="button"
                onClick={onOpenAddAccount}
              >
                <svg className="ynab-new-icon" width="12" height="12">
                  <use href="#icon_sprite_plus_circle_fill"></use>
                </svg>
                Add Account
              </button>

              <button
                className="ynab-button contrast button-sidebar nav-bank-connections"
                type="button"
                onClick={() => setShowBankConnections(true)}
              >
                <svg className="ynab-new-icon" width="12" height="12">
                  <use href="#icon_sprite_bank"></use>
                </svg>
                <span className="nav-bank-connections-label-full">
                  Bank Connections
                </span>
                <span className="nav-bank-connections-label-short">
                  Connections
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Bottom Collapse Toggle */}
        <div className="sidebar-bottom">
          <button
            className="sidebar-collapse"
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <svg className="ynab-new-icon" width="24" height="24" style={{ transform: isCollapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }}>
              <use href="#icon_sprite_sidebar_close"></use>
            </svg>
          </button>
        </div>
      </div>
      <div className="sidebar-resizer">
        <div className="sidebar-resizer-indicator"></div>
      </div>
    </nav>
  );
}
