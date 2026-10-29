import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Account, PlanSummary, CreatePlanRequest, UpdatePlanRequest } from "../api/types";
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

  const renderAccountRow = (acc: Account) => {
    const isSelected =
      activeView.type === "account" && activeView.accountId === acc.id;
    const isNegative = acc.balance_milliunits < 0;

    return (
      <a
        key={acc.id}
        className={`nav-account-row ${isSelected ? "is-selected" : ""}`}
        style={{
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          textDecoration: "none",
        }}
        onClick={(e) => {
          e.preventDefault();
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
      </a>
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
                onClick={() => setPlanMenuOpen(false)}
              >
                <div
                  ref={popoverCardRef}
                  className="modal modal-popup ynab-new-settings-menu-popup"
                  style={{
                    position: "fixed",
                    top: `${popoverPos.top}px`,
                    left: `${popoverPos.left}px`,
                    width: "16.5rem",
                    height: "auto",
                    minHeight: "unset",
                    zIndex: 10002,
                    opacity: 1,
                    pointerEvents: "auto",
                    backgroundColor: "var(--backgroundPrimaryElevated, #ffffff)",
                    borderRadius: "8px",
                    boxShadow: "0 12px 36px rgba(0,0,0,0.22)",
                    border: "1px solid var(--separatorStandard, #d2d8de)",
                    padding: "0.4rem 0",
                    color: "var(--labelPrimary, #191818)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ul className="modal-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    <li
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--labelSecondary)",
                        padding: "0.35rem 1rem",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                      }}
                    >
                      Open Plan
                    </li>
                    {plans.map((p) => {
                      const isCurrent = p.id === activePlan?.id;
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            className={`button-list ${isCurrent ? "is-selected" : ""}`}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "0.45rem 1rem",
                              border: "none",
                              background: isCurrent
                                ? "var(--alphaSPBlurple50020, rgba(84,91,254,0.15))"
                                : "transparent",
                              cursor: "pointer",
                              fontWeight: isCurrent ? 700 : 500,
                              color: "var(--labelPrimary)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                            onClick={() => {
                              onSelectPlan(p.id);
                              setPlanMenuOpen(false);
                            }}
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {isCurrent && (
                                <svg className="ynab-new-icon" width="12" height="12" style={{ color: "var(--actionPrimary, #545bfe)" }}>
                                  <use href="#icon_sprite_check"></use>
                                </svg>
                              )}
                              {p.name}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--labelSecondary)" }}>
                              {p.currency_code}
                            </span>
                          </button>
                        </li>
                      );
                    })}

                    <li style={{ borderTop: "1px solid var(--separatorStandard, #d2d8de)", margin: "0.35rem 0" }}></li>

                    <li>
                      <button
                        type="button"
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "0.45rem 1rem",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          color: "var(--actionPrimary, #545bfe)",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                        onClick={() => {
                          setPlanMenuOpen(false);
                          setNewPlanName("");
                          setNewPlanCurrency("USD");
                          setNewCurrencyPlacement("BEFORE");
                          setNewNumberFormat("123,456.78");
                          setNewDateFormat("30/12/2026");
                          setShowNewPlanModal(true);
                        }}
                      >
                        <svg className="ynab-new-icon" width="14" height="14">
                          <use href="#icon_sprite_plus_circle_fill"></use>
                        </svg>
                        New Plan
                      </button>
                    </li>

                    {activePlan && (
                      <li>
                        <button
                          type="button"
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "0.45rem 1rem",
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            color: "var(--labelPrimary)",
                            fontWeight: 500,
                            fontSize: "0.85rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                          onClick={() => {
                            setPlanMenuOpen(false);
                            setEditPlanName(activePlan.name);
                            setEditPlanCurrency(activePlan.currency_code);
                            setShowSettingsModal(true);
                          }}
                        >
                          <svg className="ynab-new-icon" width="14" height="14">
                            <use href="#icon_sprite_pencil"></use>
                          </svg>
                          Plan Settings
                        </button>
                      </li>
                    )}

                    {activePlan && plans.length > 1 && (
                      <li>
                        <button
                          type="button"
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "0.45rem 1rem",
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            color: "var(--labelNegative, #bf2e3b)",
                            fontWeight: 500,
                            fontSize: "0.85rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                          onClick={() => {
                            setPlanMenuOpen(false);
                            setShowDeleteModal(true);
                          }}
                        >
                          <svg className="ynab-new-icon" width="14" height="14">
                            <use href="#icon_sprite_trash"></use>
                          </svg>
                          Delete Plan
                        </button>
                      </li>
                    )}

                    <li style={{ borderTop: "1px solid var(--separatorStandard, #d2d8de)", margin: "0.35rem 0" }}></li>

                    {/* Theme Toggle */}
                    <li>
                      <button
                        type="button"
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "0.45rem 1rem",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          color: "var(--labelPrimary)",
                          fontSize: "0.85rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                        onClick={onToggleTheme}
                      >
                        <span>Theme: {theme === "theme-light" ? "Light" : "Dark"}</span>
                        <svg className="ynab-new-icon" width="14" height="14">
                          <use href={theme === "theme-light" ? "#icon_sprite_sun" : "#icon_sprite_moon"}></use>
                        </svg>
                      </button>
                    </li>

                    <li style={{ borderTop: "1px solid var(--separatorStandard, #d2d8de)", margin: "0.35rem 0" }}></li>

                    {/* Logout */}
                    <li>
                      <button
                        type="button"
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "0.45rem 1rem",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          color: "var(--labelNegative, #bf2e3b)",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                        onClick={() => {
                          setPlanMenuOpen(false);
                          onLogout();
                        }}
                      >
                        <svg className="ynab-new-icon" width="14" height="14">
                          <use href="#icon_sprite_sign_out"></use>
                        </svg>
                        Log Out
                      </button>
                    </li>
                  </ul>
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
                  className="modal modal-generic modal-budget-settings modal-manage-budgets"
                  style={{
                    width: "32.5rem",
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
                    }}
                  >
                    <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--labelPrimary, #191818)", textAlign: "left" }}>
                      New Plan
                    </h2>
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => setShowNewPlanModal(false)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--actionPrimary, #545bfe)",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
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
                  className="modal modal-generic modal-budget-settings modal-manage-budgets"
                  style={{
                    width: "32.5rem",
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
                    }}
                  >
                    <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--labelPrimary, #191818)", textAlign: "left" }}>
                      Plan Settings
                    </h2>
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => setShowSettingsModal(false)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--actionPrimary, #545bfe)",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
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

            {/* Main Nav Items */}
            <ul className="nav-main">
              <li className={`navlink navlink-budget ${activeView.type === "budget" ? "active" : ""}`}>
                <a
                  className="ember-view"
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectView({ type: "budget" });
                  }}
                >
                  <svg className="ynab-new-icon" width="20" height="20">
                    <use href="#icon_sprite_cash_in_envelope"></use>
                  </svg>
                  <div className="navlink-label">Plan</div>
                </a>
              </li>
              <li className={`navlink navlink-reports ${activeView.type === "reflect" ? "active" : ""}`}>
                <a
                  className="ember-view"
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectView({ type: "reflect" });
                  }}
                >
                  <svg className="ynab-new-icon" width="20" height="20">
                    <use href="#icon_sprite_bar_chart"></use>
                  </svg>
                  <div className="navlink-label">Reflect</div>
                </a>
              </li>
              <li className={`navlink navlink-accounts ${activeView.type === "all-accounts" ? "active" : ""}`}>
                <a
                  className="ember-view"
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectView({ type: "all-accounts" });
                  }}
                >
                  <svg className="ynab-new-icon" width="20" height="20">
                    <use href="#icon_sprite_bank"></use>
                  </svg>
                  <div className="navlink-label">All Accounts</div>
                </a>
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
