import sys

with open('frontend/src/components/Sidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
import_str = """import { ManagePayeesModal } from "./modals/ManagePayeesModal";
import { EditFlagsModal } from "./modals/EditFlagsModal";
import { DisplayOptionsModal } from "./modals/DisplayOptionsModal";
import { FreshStartModal } from "./modals/FreshStartModal";
import { AccountSettingsModal } from "./modals/AccountSettingsModal";
import { BankConnectionsModal } from "./modals/BankConnectionsModal";
import { KeyboardShortcutsModal } from "./modals/KeyboardShortcutsModal";
"""

if 'ManagePayeesModal' not in content:
    content = content.replace('import { formatMilliunits } from "../utils/currency";', 'import { formatMilliunits } from "../utils/currency";\n' + import_str)

# 2. State definitions
state_str = """  const [openPlanSubmenu, setOpenPlanSubmenu] = useState(false);
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
"""

if 'openPlanSubmenu' not in content:
    target = '  const [showDeleteModal, setShowDeleteModal] = useState(false);'
    content = content.replace(target, target + '\n\n' + state_str)

# 3. Replace the popover popup
old_popup_start = '{/* Plan Switcher Menu Popover */}'
old_popup_end = '{/* Modal: New Plan */}'

start_idx = content.find(old_popup_start)
end_idx = content.find(old_popup_end)

if start_idx == -1 or end_idx == -1:
    print(f"Error: indices not found {start_idx}, {end_idx}")
    sys.exit(1)

new_popup = """{/* Plan Switcher Menu Popover */}
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
                        {plans.map((p) => {
                          const isCurrent = p.id === activePlan?.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              className={`menu-item js-menu-item recent-budgets-budget-open ${isCurrent ? "is-selected" : ""}`}
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
                              <span style={{ fontSize: "0.75rem", color: "var(--labelSecondary)", marginRight: isCurrent ? "4px" : "0" }}>
                                {p.currency_code}
                              </span>
                              {isCurrent && (
                                <svg className="ynab-new-icon" width="12" height="12" style={{ color: "var(--actionPrimary, #545bfe)" }}>
                                  <use href="#icon_sprite_check"></use>
                                </svg>
                              )}
                            </button>
                          );
                        })}
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

            """

content = content[:start_idx] + new_popup + content[end_idx:]

# 4. Add the modals at the end of the modals section
modals_str = """
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
"""

main_nav_target = '{/* Main Nav Items */}'
if 'ManagePayeesModal' not in content[content.find(main_nav_target)-2000:content.find(main_nav_target)]:
    content = content.replace(main_nav_target, modals_str + '\n            ' + main_nav_target)

# 5. Connect Bank Connections button in sidebar bottom to open BankConnectionsModal
conn_btn_target = '<button\n                className="ynab-button contrast button-sidebar nav-bank-connections"\n                type="button"\n              >'
if conn_btn_target in content:
    content = content.replace(conn_btn_target, '<button\n                className="ynab-button contrast button-sidebar nav-bank-connections"\n                type="button"\n                onClick={() => setShowBankConnections(true)}\n              >')

with open('frontend/src/components/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Sidebar.tsx updated completely!")
