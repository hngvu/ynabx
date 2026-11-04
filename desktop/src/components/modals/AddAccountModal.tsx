import React, { useEffect, useState } from "react";
import type { AccountType, CreateAccountRequest } from "../../api/types";
import { parseInputToMilliunits } from "../../utils/currency";

export interface AddAccountModalProps {
  onClose: () => void;
  onCreate: (req: CreateAccountRequest) => Promise<void>;
}

export interface AccountTypeOption {
  label: string;
  dataAccountType: string;
  type: AccountType;
  onBudget: boolean;
  isDebt?: boolean;
}

export interface AccountTypeGroup {
  title: string;
  description: string;
  items: AccountTypeOption[];
}

export const ACCOUNT_TYPE_GROUPS: AccountTypeGroup[] = [
  {
    title: "Cash Accounts",
    description: "A cash account holds funds you already own and can spend immediately.",
    items: [
      { label: "Checking", dataAccountType: "Checking", type: "CHECKING", onBudget: true },
      { label: "Savings", dataAccountType: "Savings", type: "SAVINGS", onBudget: true },
      { label: "Cash", dataAccountType: "Cash", type: "CASH", onBudget: true },
    ],
  },
  {
    title: "Credit Accounts",
    description: "A credit account lets you spend borrowed money that you'll need to repay later, often with interest.",
    items: [
      { label: "Credit Card", dataAccountType: "CreditCard", type: "CREDIT_CARD", onBudget: true, isDebt: true },
      { label: "Line of Credit", dataAccountType: "LineOfCredit", type: "CREDIT_CARD", onBudget: true, isDebt: true },
    ],
  },
  {
    title: "Mortgages and Loans",
    description: "Accounts that have an outstanding balance you're currently paying off, and aren't spending from.",
    items: [
      { label: "Mortgage", dataAccountType: "Mortgage", type: "CREDIT_CARD", onBudget: false, isDebt: true },
      { label: "Auto Loan", dataAccountType: "AutoLoan", type: "CREDIT_CARD", onBudget: false, isDebt: true },
      { label: "Student Loan", dataAccountType: "StudentLoan", type: "CREDIT_CARD", onBudget: false, isDebt: true },
      { label: "Personal Loan", dataAccountType: "PersonalLoan", type: "CREDIT_CARD", onBudget: false, isDebt: true },
      { label: "Medical Debt", dataAccountType: "MedicalDebt", type: "CREDIT_CARD", onBudget: false, isDebt: true },
      { label: "Other Debt", dataAccountType: "OtherDebt", type: "CREDIT_CARD", onBudget: false, isDebt: true },
    ],
  },
  {
    title: "Tracking Accounts",
    description: "Accounts that hold money you don't plan to spend soon, such as investments or loans.",
    items: [
      { label: "Asset (e.g. Investment)", dataAccountType: "OtherAsset", type: "SAVINGS", onBudget: false },
      { label: "Liability", dataAccountType: "OtherLiability", type: "CREDIT_CARD", onBudget: false, isDebt: true },
    ],
  },
];

export function AddAccountModal({
  onClose,
  onCreate,
}: AddAccountModalProps): React.JSX.Element {
  const [view, setView] = useState<"form" | "select_type">("form");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("CHECKING");
  const [selectedTypeLabel, setSelectedTypeLabel] = useState("Checking");
  const [onBudget, setOnBudget] = useState(true);
  const [isDebt, setIsDebt] = useState(false);
  const [balanceInput, setBalanceInput] = useState("0.00");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view === "select_type") {
          setView("form");
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      let initialMilli = parseInputToMilliunits(balanceInput);
      if (isDebt && initialMilli > 0 && !balanceInput.trim().startsWith("+")) {
        initialMilli = -initialMilli;
      }
      await onCreate({
        name: name.trim(),
        type,
        on_budget: onBudget,
        initial_balance_milliunits: initialMilli,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectAccountType = (option: AccountTypeOption) => {
    setSelectedTypeLabel(option.label);
    setType(option.type);
    setOnBudget(option.onBudget);
    setIsDebt(option.isDebt ?? false);
    setView("form");
  };

  return (
    <div
      className="modal-overlay active ynab-u modal-generic self-centered account-widget-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal">
        <div className="account-widget" tabIndex={0}>
          <div className="account-widget-screen account-widget-step account-widget-add-unlinked-account account-widget-step-with-help-box">
            {view === "select_type" ? (
              <>
                <div className="account-widget-header">
                  <button
                    aria-label="Back"
                    title="Back"
                    type="button"
                    onClick={() => setView("form")}
                  >
                    <svg className="ynab-new-icon icon-back" width="24" height="24">
                      <use href="#icon_sprite_chevron_left"></use>
                    </svg>
                  </button>
                  <div className="account-widget-header-title">
                    <h1 className="account-widget-header-title-single">Select Account Type</h1>
                  </div>
                  <button
                    aria-label="Close"
                    title="Close"
                    type="button"
                    onClick={onClose}
                  >
                    <svg className="ynab-new-icon icon-close" width="24" height="24">
                      <use href="#icon_sprite_close"></use>
                    </svg>
                  </button>
                </div>

                <div className="account-widget-body user-data">
                  <div className="account-type-select">
                    {ACCOUNT_TYPE_GROUPS.map((group) => (
                      <div key={group.title} className="account-type-select-group">
                        <h3>{group.title}</h3>
                        <p>{group.description}</p>
                        {group.items.map((item) => (
                          <button
                            key={item.label}
                            className="account-widget-list-button"
                            data-account-type={item.dataAccountType}
                            type="button"
                            onClick={() => handleSelectAccountType(item)}
                          >
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="account-widget-header">
                  <button
                    aria-label="Back"
                    title="Back"
                    type="button"
                    onClick={onClose}
                  >
                    <svg className="ynab-new-icon icon-back" width="24" height="24">
                      <use href="#icon_sprite_chevron_left"></use>
                    </svg>
                  </button>
                  <div className="account-widget-header-title">
                    <h1 className="account-widget-header-title-single">Add Unlinked Account</h1>
                  </div>
                  <button
                    aria-label="Close"
                    title="Close"
                    type="button"
                    onClick={onClose}
                  >
                    <svg className="ynab-new-icon icon-close" width="24" height="24">
                      <use href="#icon_sprite_close"></use>
                    </svg>
                  </button>
                </div>

                <form
                  onSubmit={handleSubmit}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    minHeight: 0,
                  }}
                >
                  <div className="account-widget-body user-data">
                    <p>
                      <span className="header-strong" style={{ fontWeight: 700 }}>Let's go!</span>{" "}
                      And don't worry—if you change your mind, you can link your account at any time.
                    </p>

                    {error && (
                      <div className="error text-error" style={{ marginBottom: "1rem" }}>
                        {error}
                      </div>
                    )}

                    <div className="y-form-field">
                      <label htmlFor="acc-nickname">Give it a nickname</label>
                      <input
                        id="acc-nickname"
                        className="ember-text-field ember-view y-input name-input user-data"
                        autoComplete="nope"
                        autoCorrect="off"
                        spellCheck="false"
                        autoCapitalize="words"
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Checking"
                        type="text"
                      />
                    </div>

                    <div className="y-form-field">
                      <label>What type of account are you adding?</label>
                      <button
                        className="account-type-select-button"
                        type="button"
                        onClick={() => setView("select_type")}
                      >
                        <span>{selectedTypeLabel || "Select account type..."}</span>
                        <svg className="ynab-new-icon" width="16" height="16">
                          <use href="#icon_sprite_caret_right"></use>
                        </svg>
                      </button>
                    </div>

                    <div className="y-form-field currency-input-group">
                      <label htmlFor="acc-balance">What is your current account balance?</label>
                      <input
                        id="acc-balance"
                        className="ember-text-field ember-view y-input balance-input user-data"
                        autoComplete="nope"
                        autoCorrect="off"
                        spellCheck="false"
                        autoCapitalize="off"
                        inputMode="decimal"
                        value={balanceInput}
                        onChange={(e) => setBalanceInput(e.target.value)}
                        type="text"
                      />
                    </div>
                  </div>

                  <div className="account-widget-footer">
                    <button
                      disabled={submitting || !name.trim() || !selectedTypeLabel}
                      className="ynab-button primary is-large"
                      type="submit"
                    >
                      {submitting ? "Saving..." : "Next"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
