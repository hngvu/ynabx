import React, { useState, useRef, useMemo, useEffect } from "react";
import type {
  Account,
  Category,
  CategoryGroup,
  CategoryMonthAllocation,
  EditableClearedStatus,
  Payee,
  SaveTransactionRequest,
  Transaction,
} from "../api/types";
import { formatMilliunits, parseInputToMilliunits } from "../utils/currency";
import { getTodayIso, formatDate } from "../utils/dates";
import { YnabIcon } from "./common/YnabIcon";
import { TransactionDatePickerPopover } from "./modals/TransactionDatePickerPopover";
import { PayeeDropdownPopover } from "./modals/PayeeDropdownPopover";
import { CategoryDropdownPopover } from "./modals/CategoryDropdownPopover";

export interface RegisterHeaderBalances {
  cleared: number;
  uncleared: number;
  working: number;
}

/**
 * Computes Cleared, Uncleared, and Working balances from the loaded `accounts` list.
 * In `All Accounts` mode (`accountId === null`), sums across all accounts rather than
 * summing the paginated transaction slice.
 */
export function computeRegisterHeaderBalances(
  accounts: Account[],
  accountId: string | null,
): RegisterHeaderBalances {
  const targetAccounts =
    accountId !== null
      ? accounts.filter((a) => a.id === accountId)
      : accounts;

  return targetAccounts.reduce<RegisterHeaderBalances>(
    (acc, item) => ({
      cleared: acc.cleared + item.cleared_balance_milliunits,
      uncleared: acc.uncleared + item.uncleared_balance_milliunits,
      working: acc.working + item.balance_milliunits,
    }),
    { cleared: 0, uncleared: 0, working: 0 },
  );
}

/**
 * Determines whether the Category field must be disabled (and sent as `null`) per OpenAPI rules:
 * - Off-budget source account -> category_id MUST be null.
 * - On-budget -> On-budget transfer -> category_id MUST be null.
 */
export function isCategoryDisabledForDraft(
  accounts: Account[],
  sourceAccountId: string,
  transferAccountId: string | null,
): boolean {
  const source = accounts.find((a) => a.id === sourceAccountId);
  if (!source || !source.on_budget) {
    return true;
  }
  if (transferAccountId) {
    const target = accounts.find((a) => a.id === transferAccountId);
    if (target?.on_budget) {
      return true;
    }
  }
  return false;
}

export interface TransactionDraftInput {
  accounts: Account[];
  accountId: string;
  date: string;
  payeeInput: string;
  transferAccountId: string | null;
  categoryId: string | null;
  memo: string;
  outflowInput: string;
  inflowInput: string;
  cleared: EditableClearedStatus;
}

/**
 * Builds a validated `SaveTransactionRequest` using absolute milliunit parsing (never relative).
 */
export function buildSaveTransactionPayload(
  draft: TransactionDraftInput,
): SaveTransactionRequest {
  const outflowMilli = Math.abs(parseInputToMilliunits(draft.outflowInput));
  const inflowMilli = Math.abs(parseInputToMilliunits(draft.inflowInput));
  const amountMilliunits = inflowMilli > 0 ? inflowMilli : -outflowMilli;

  const categoryDisabled = isCategoryDisabledForDraft(
    draft.accounts,
    draft.accountId,
    draft.transferAccountId,
  );

  const isTransfer = Boolean(draft.transferAccountId);

  return {
    account_id: draft.accountId,
    category_id: categoryDisabled ? null : draft.categoryId || null,
    payee_id: null,
    payee_name: isTransfer ? null : draft.payeeInput.trim() || null,
    date: draft.date,
    amount_milliunits: amountMilliunits,
    memo: draft.memo.trim() || null,
    cleared: draft.cleared,
    approved: true,
    transfer_account_id: draft.transferAccountId || null,
  };
}

export interface AccountRegisterProps {
  accountId: string | null;
  accounts: Account[];
  categories: Category[];
  categoryGroups?: CategoryGroup[];
  monthlyBudgets?: CategoryMonthAllocation[];
  payees: Payee[];
  transactions: Transaction[];
  nextCursor: string | null;
  loading: boolean;
  onLoadMore: () => void;
  onCreateTransaction: (req: SaveTransactionRequest) => Promise<void>;
  onUpdateTransaction: (
    txId: string,
    req: SaveTransactionRequest,
    previousDateIso: string,
  ) => Promise<void>;
  onDeleteTransaction: (txId: string, dateIso: string) => Promise<void>;
  onUnreconcileTransaction: (txId: string, dateIso: string) => Promise<void>;
  onOpenReconcile: (
    account: Account,
    anchorPosition?: { top: number; right: number; left?: number; bottom?: number },
  ) => void;
  onOpenAddCategory?: (groupId?: string) => void;
  onUpdateAccount: (
    accountId: string,
    updates: { name?: string; closed?: boolean },
  ) => Promise<void>;
  onDeleteAccount: (accountId: string) => Promise<void>;
  initialShowAddRow?: boolean;
}

export function AccountRegister({
  accountId,
  accounts,
  categories,
  categoryGroups,
  monthlyBudgets,
  payees,
  transactions,
  nextCursor,
  loading,
  onLoadMore,
  onCreateTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onUnreconcileTransaction,
  onOpenReconcile,
  onOpenAddCategory,
  onUpdateAccount,
  onDeleteAccount,
  initialShowAddRow = false,
}: AccountRegisterProps): React.JSX.Element {
  const currentAccount =
    accountId !== null
      ? (accounts.find((a) => a.id === accountId) ?? null)
      : null;

  const balances = computeRegisterHeaderBalances(accounts, accountId);

  const [showAddRow, setShowAddRow] = useState(initialShowAddRow);
  const [searchQuery, setSearchQuery] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const defaultSourceAccountId =
    accountId ?? accounts.find((a) => !a.closed)?.id ?? "";

  const [draftAccountId, setDraftAccountId] = useState<string>(
    defaultSourceAccountId,
  );
  const [draftDate, setDraftDate] = useState<string>(() => getTodayIso());
  const [draftPayeeChoice, setDraftPayeeChoice] = useState<string>("");
  const [draftTransferAccountId, setDraftTransferAccountId] = useState<
    string | null
  >(null);
  const [draftCategoryId, setDraftCategoryId] = useState<string>("");
  const [draftMemo, setDraftMemo] = useState<string>("");
  const [draftOutflow, setDraftOutflow] = useState<string>("");
  const [draftInflow, setDraftInflow] = useState<string>("");
  const [draftCleared, setDraftCleared] =
    useState<EditableClearedStatus>("UNCLEARED");

  const [activePopover, setActivePopover] = useState<
    "date" | "payee" | "category" | null
  >(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    bottom: number;
  } | null>(null);
  const [draftCategorySearch, setDraftCategorySearch] = useState<string>("");

  const dateCellRef = useRef<HTMLDivElement>(null);
  const payeeCellRef = useRef<HTMLDivElement>(null);
  const categoryCellRef = useRef<HTMLDivElement>(null);

  const effectiveSourceAccountId = accountId ?? draftAccountId;
  const categoryDisabled = isCategoryDisabledForDraft(
    accounts,
    effectiveSourceAccountId,
    draftTransferAccountId,
  );

  const openDatePicker = () => {
    if (dateCellRef.current) {
      const rect = dateCellRef.current.getBoundingClientRect();
      setPopoverAnchor({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
      });
      setActivePopover("date");
    }
  };

  const openPayeeDropdown = () => {
    if (payeeCellRef.current) {
      const rect = payeeCellRef.current.getBoundingClientRect();
      setPopoverAnchor({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
      });
      setActivePopover("payee");
    }
  };

  const openCategoryDropdown = () => {
    if (categoryDisabled) return;
    if (categoryCellRef.current) {
      const rect = categoryCellRef.current.getBoundingClientRect();
      setPopoverAnchor({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
      });
      setActivePopover("category");
    }
  };

  const accountNameById = new Map<string, string>(
    accounts.map((a) => [a.id, a.name]),
  );
  const categoryNameById = new Map<string, string>(
    categories.map((c) => [c.id, c.name]),
  );

  const filteredTransactions = transactions.filter((tx) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const payeeText = (tx.payee_name ?? "").toLowerCase();
    const memoText = (tx.memo ?? "").toLowerCase();
    const catText = (
      tx.category_id ? (categoryNameById.get(tx.category_id) ?? "") : ""
    ).toLowerCase();
    return (
      payeeText.includes(q) || memoText.includes(q) || catText.includes(q)
    );
  });

  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [lastSelectedTxId, setLastSelectedTxId] = useState<string | null>(null);
  const [activeActionBarPopover, setActiveActionBarPopover] = useState<"categorize" | "flag" | "more" | null>(null);
  const [actionBarCategorySearch, setActionBarCategorySearch] = useState("");
  const actionBarInnerRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(selectedTxIds), [selectedTxIds]);

  const allSelectableTxIds = useMemo(
    () => filteredTransactions.map((tx) => tx.id),
    [filteredTransactions],
  );

  const isAllSelected =
    allSelectableTxIds.length > 0 &&
    allSelectableTxIds.every((id) => selectedSet.has(id));

  const isPartialSelected =
    !isAllSelected &&
    allSelectableTxIds.some((id) => selectedSet.has(id));

  useEffect(() => {
    setSelectedTxIds([]);
    setLastSelectedTxId(null);
    setActiveActionBarPopover(null);
  }, [accountId]);

  useEffect(() => {
    if (!activeActionBarPopover) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        actionBarInnerRef.current &&
        !actionBarInnerRef.current.contains(e.target as Node)
      ) {
        setActiveActionBarPopover(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeActionBarPopover]);

  const handleToggleAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAllSelected) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(allSelectableTxIds);
    }
  };

  const handleToggleTransaction = (txId: string, shiftKey: boolean) => {
    if (shiftKey && lastSelectedTxId) {
      const fromIdx = allSelectableTxIds.indexOf(lastSelectedTxId);
      const toIdx = allSelectableTxIds.indexOf(txId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
        const rangeIds = allSelectableTxIds.slice(start, end + 1);
        setSelectedTxIds((prev) => Array.from(new Set([...prev, ...rangeIds])));
        setLastSelectedTxId(txId);
        return;
      }
    }
    setLastSelectedTxId(txId);
    setSelectedTxIds((prev) =>
      prev.includes(txId) ? prev.filter((id) => id !== txId) : [...prev, txId],
    );
  };

  const handleRowClick = (e: React.MouseEvent, txId: string) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("a") ||
      target.closest(".modal") ||
      target.closest(".ynab-grid-cell-actions")
    ) {
      return;
    }

    if (target.closest(".ynab-grid-cell-checkbox")) {
      handleToggleTransaction(txId, e.shiftKey);
      return;
    }

    if (e.shiftKey && lastSelectedTxId) {
      const fromIdx = allSelectableTxIds.indexOf(lastSelectedTxId);
      const toIdx = allSelectableTxIds.indexOf(txId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
        const rangeIds = allSelectableTxIds.slice(start, end + 1);
        setSelectedTxIds((prev) => Array.from(new Set([...prev, ...rangeIds])));
        setLastSelectedTxId(txId);
        return;
      }
    }

    setLastSelectedTxId(txId);

    if (e.ctrlKey || e.metaKey) {
      setSelectedTxIds((prev) =>
        prev.includes(txId) ? prev.filter((id) => id !== txId) : [...prev, txId],
      );
    } else {
      setSelectedTxIds((prev) =>
        prev.length === 1 && prev[0] === txId ? [] : [txId],
      );
    }
  };

  const handleDeleteSelectedTransactions = async () => {
    if (selectedTxIds.length === 0) return;
    const toDelete = filteredTransactions.filter(
      (tx) => selectedSet.has(tx.id) && tx.cleared !== "RECONCILED",
    );
    for (const tx of toDelete) {
      await onDeleteTransaction(tx.id, tx.date);
    }
    setSelectedTxIds([]);
  };

  const handleSetClearedForSelected = async (nextCleared: EditableClearedStatus) => {
    setActiveActionBarPopover(null);
    const targets = filteredTransactions.filter(
      (tx) => selectedSet.has(tx.id) && tx.cleared !== "RECONCILED" && tx.cleared !== nextCleared,
    );
    for (const tx of targets) {
      await onUpdateTransaction(
        tx.id,
        {
          account_id: tx.account_id,
          category_id: tx.category_id,
          payee_id: tx.payee_id,
          payee_name: tx.payee_name,
          date: tx.date,
          amount_milliunits: tx.amount_milliunits,
          memo: tx.memo,
          cleared: nextCleared,
          approved: tx.approved,
          transfer_account_id: tx.transfer_account_id,
        },
        tx.date,
      );
    }
  };

  const handleBatchCategorize = async (catId: string | null) => {
    setActiveActionBarPopover(null);
    const targets = filteredTransactions.filter(
      (tx) => selectedSet.has(tx.id) && tx.cleared !== "RECONCILED",
    );
    for (const tx of targets) {
      await onUpdateTransaction(
        tx.id,
        {
          account_id: tx.account_id,
          category_id: catId,
          payee_id: tx.payee_id,
          payee_name: tx.payee_name,
          date: tx.date,
          amount_milliunits: tx.amount_milliunits,
          memo: tx.memo,
          cleared: tx.cleared as EditableClearedStatus,
          approved: tx.approved,
          transfer_account_id: tx.transfer_account_id,
        },
        tx.date,
      );
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT")
      ) {
        return;
      }

      if (e.key === "Escape") {
        if (activeActionBarPopover) {
          setActiveActionBarPopover(null);
        } else if (selectedTxIds.length > 0) {
          setSelectedTxIds([]);
          setLastSelectedTxId(null);
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedTxIds.length > 0) {
          e.preventDefault();
          void handleDeleteSelectedTransactions();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        setSelectedTxIds(allSelectableTxIds);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTxIds, filteredTransactions]);

  const handleSaveNewTransaction = async (keepOpen: boolean) => {
    setFormError(null);
    try {
      const payload = buildSaveTransactionPayload({
        accounts,
        accountId: effectiveSourceAccountId,
        date: draftDate,
        payeeInput: draftPayeeChoice,
        transferAccountId: draftTransferAccountId,
        categoryId: draftCategoryId || null,
        memo: draftMemo,
        outflowInput: draftOutflow,
        inflowInput: draftInflow,
        cleared: draftCleared,
      });

      await onCreateTransaction(payload);
      setDraftPayeeChoice("");
      setDraftTransferAccountId(null);
      setDraftCategoryId("");
      setDraftCategorySearch("");
      setDraftMemo("");
      setDraftOutflow("");
      setDraftInflow("");
      setActivePopover(null);
      if (!keepOpen) {
        setShowAddRow(false);
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save transaction",
      );
    }
  };

  const handlePayeeInputChange = (val: string) => {
    setDraftPayeeChoice(val);
    const match = accounts.find(
      (a) =>
        !a.closed &&
        `Transfer : ${a.name}`.toLowerCase() === val.trim().toLowerCase(),
    );
    if (match) {
      setDraftTransferAccountId(match.id);
    } else {
      setDraftTransferAccountId(null);
    }
  };

  const handleToggleCleared = async (tx: Transaction) => {
    if (tx.cleared === "RECONCILED") return;
    const nextCleared: EditableClearedStatus =
      tx.cleared === "CLEARED" ? "UNCLEARED" : "CLEARED";

    await onUpdateTransaction(
      tx.id,
      {
        account_id: tx.account_id,
        category_id: tx.category_id,
        payee_id: tx.payee_id,
        payee_name: tx.payee_name,
        date: tx.date,
        amount_milliunits: tx.amount_milliunits,
        memo: tx.memo,
        cleared: nextCleared,
        approved: tx.approved,
        transfer_account_id: tx.transfer_account_id,
      },
      tx.date,
    );
  };

  return (
    <div
      className="register-flex-columns"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        backgroundColor: "var(--backgroundPrimary)",
      }}
    >
      {/* Official YNAB Account Register Header */}
      <header className="accounts-header">
        <div className="accounts-header-top">
          <div className="accounts-header-total user-data">
            <span
              className="js-accounts-header-account-name"
              title={currentAccount ? currentAccount.name : "All Accounts"}
            >
              {currentAccount ? currentAccount.name : "All Accounts"}
            </span>
          </div>

          <div className="accounts-header-actions">
            {currentAccount && (
              <div className="reconcile-button-and-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  className="button button-primary accounts-header-reconcile"
                  type="button"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onOpenReconcile(currentAccount, {
                      top: rect.bottom + 6,
                      right: rect.right,
                      left: rect.left,
                      bottom: rect.bottom,
                    });
                  }}
                >
                  Reconcile
                </button>

                {currentAccount.balance_milliunits === 0 && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() =>
                      void onUpdateAccount(currentAccount.id, {
                        closed: !currentAccount.closed,
                      })
                    }
                  >
                    {currentAccount.closed ? "Reopen" : "Close Account"}
                  </button>
                )}

                {transactions.length === 0 && (
                  <button
                    type="button"
                    className="button button-cancel"
                    onClick={() => void onDeleteAccount(currentAccount.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <hr className="standard" />

        {/* Balance Math Row */}
        <div className="accounts-header-balances">
          <div
            tabIndex={0}
            className="accounts-header-balances-amount accounts-header-balances-cleared"
          >
            <span className="user-data">
              <span
                className={`user-data currency ${
                  balances.cleared < 0 ? "negative" : "positive"
                }`}
              >
                <bdi>{formatMilliunits(balances.cleared)}</bdi>
              </span>
            </span>
            <div className="accounts-header-label">
              <YnabIcon name="cleared_circle_fill" size={12} />
              Cleared Balance
            </div>
          </div>

          <i>+</i>

          <div
            tabIndex={0}
            className="accounts-header-balances-amount accounts-header-balances-uncleared"
          >
            <span className="user-data">
              <span
                className={`user-data currency ${
                  balances.uncleared < 0 ? "negative" : "positive"
                }`}
              >
                <bdi>{formatMilliunits(balances.uncleared)}</bdi>
              </span>
            </span>
            <div className="accounts-header-label">
              <YnabIcon name="cleared_circle" size={12} />
              Uncleared Balance
            </div>
          </div>

          <i>=</i>

          <div
            tabIndex={0}
            className="accounts-header-balances-amount accounts-header-balances-working"
          >
            <span className="user-data">
              <span
                className={`user-data currency ${
                  balances.working < 0 ? "negative" : "positive"
                }`}
              >
                <bdi>{formatMilliunits(balances.working)}</bdi>
              </span>
            </span>
            <div className="accounts-header-label">Working Balance</div>
          </div>

          <div className="accounts-header-balances-right"></div>
        </div>
      </header>

      {/* Official YNAB Accounts Toolbar */}
      <div className="accounts-toolbar">
        <div className="accounts-toolbar-left">
          <button
            className="ghost-button primary type-body add-transaction"
            type="button"
            onClick={() => {
              setShowAddRow((prev) => !prev);
              setDraftAccountId(
                accountId ?? accounts.find((a) => !a.closed)?.id ?? "",
              );
            }}
          >
            <YnabIcon name="plus_circle_fill" size={16} />
            Add Transaction
          </button>

          <button
            className="ghost-button primary type-body accounts-toolbar-file-import-transactions js-accounts-toolbar-file-import-transactions"
            type="button"
          >
            <YnabIcon name="document_with_arrow_up" size={16} />
            File Import
          </button>

          <hr />

          <span className="undo-redo-container js-undo-redo-container">
            <button
              disabled
              className="ghost-button primary type-body undo-button"
              type="button"
            >
              <YnabIcon name="undo" size={12} />
              Undo
            </button>
            <button
              disabled
              className="ghost-button primary type-body redo-button"
              type="button"
            >
              <YnabIcon name="redo" size={12} />
              Redo
            </button>
          </span>
        </div>

        <div className="accounts-toolbar-right">
          <div className="transaction-search js-transaction-search">
            <div className="transaction-search-inner">
              <div className="transaction-search-icon">
                <YnabIcon name="search" size={12} />
              </div>
              <input
                className="ember-text-field ember-view transaction-search-input"
                placeholder={`Search ${
                  currentAccount ? currentAccount.name : "All Accounts"
                }`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                type="text"
              />
            </div>
          </div>
        </div>
      </div>

      {formError && (
        <div
          role="alert"
          className="auth-error"
          style={{ margin: "0.4rem 1.5rem", padding: "0.45rem 0.75rem" }}
        >
          {formError}
        </div>
      )}

      {/* Official YNAB Grid */}
      <div
        className="ynab-grid register-table-wrapper"
        style={{
          flex: 1,
          overflow: "auto",
          minHeight: 0,
          minWidth: 0,
          backgroundColor: "var(--backgroundPrimary)",
        }}
      >
        <div
          className={`ynab-grid-table ${
            accountId === null ? "register-grid-all" : "register-grid-single"
          }`}
        >
          {/* Grid Header */}
          <div className="ynab-grid-header">
          <div className="ynab-grid-header-row">
            <div
              className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-checkbox"
              data-column="checkbox"
            >
              <button
                className={`ynab-checkbox ynab-checkbox-button ${
                  isAllSelected ? "is-checked" : isPartialSelected ? "is-partial" : ""
                }`}
                role="checkbox"
                aria-checked={
                  isAllSelected
                    ? "true"
                    : isPartialSelected
                      ? "mixed"
                      : "false"
                }
                aria-label="Check all"
                type="button"
                onClick={handleToggleAll}
              >
                {isPartialSelected ? (
                  <svg
                    className="ynab-new-icon ynab-checkbox-button-square is-partial"
                    width="13"
                    height="13"
                    viewBox="0 0 13 13"
                  >
                    <rect
                      x="2.5"
                      y="5.5"
                      width="8"
                      height="2"
                      rx="1"
                      fill="currentColor"
                    />
                  </svg>
                ) : (
                  <YnabIcon
                    name="check"
                    size={13}
                    className={`ynab-checkbox-button-square ${
                      isAllSelected ? "is-checked" : ""
                    }`}
                  />
                )}
              </button>
            </div>
            <div
              className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-notification"
              data-column="notification"
            >
              <YnabIcon name="info_circle_fill" size={14} />
            </div>
            <div
              className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-flag"
              data-column="flag"
            >
              <div className="ynab-grid-header-column-sort-area">
                <span className="icon-wrapper">
                  <YnabIcon
                    name="flag_fill"
                    size={14}
                    className="ynab-flag-header"
                  />
                </span>
              </div>
            </div>
            {accountId === null && (
              <div
                className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-accountName"
                data-column="accountName"
              >
                <div className="ynab-grid-header-column-sort-area">
                  <span className="label">ACCOUNT</span>
                </div>
              </div>
            )}
            <div
              className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-date"
              data-column="date"
            >
              <div className="ynab-grid-header-column-sort-area">
                <span className="label">DATE</span>
              </div>
            </div>
            <div
              className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-payeeName"
              data-column="payeeName"
            >
              <div className="ynab-grid-header-column-sort-area">
                <span className="label">PAYEE</span>
              </div>
            </div>
            <div
              className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-subCategoryName"
              data-column="subCategoryName"
            >
              <div className="ynab-grid-header-column-sort-area">
                <span className="label">CATEGORY</span>
              </div>
            </div>
            <div
              className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-memo"
              data-column="memo"
            >
              <div className="ynab-grid-header-column-sort-area">
                <span className="label">MEMO</span>
              </div>
            </div>
            <div
              className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-outflow"
              data-column="outflow"
            >
              <div className="ynab-grid-header-column-sort-area">
                <span className="label">OUTFLOW</span>
              </div>
            </div>
            <div
              className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-inflow"
              data-column="inflow"
            >
              <div className="ynab-grid-header-column-sort-area">
                <span className="label">INFLOW</span>
              </div>
            </div>
            <div
              className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-cleared"
              data-column="cleared"
            >
              <div className="ynab-grid-header-column-sort-area">
                <YnabIcon name="cleared_circle_fill" size={14} />
              </div>
            </div>
            <div
              className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-actions"
              data-column="actions"
            >
              <span className="label"></span>
            </div>
          </div>
        </div>

          {/* Grid Body */}
          <div className="ynab-grid-body">
            {/* Inline Add Transaction Row */}
            {showAddRow && (
              <div className="ynab-grid-add-rows">
                <div className="ynab-grid-body-row is-editing is-checked is-adding">
                  <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-checkbox">
                    <button
                      className="ynab-checkbox ynab-checkbox-button is-checked"
                      role="checkbox"
                      aria-checked="true"
                      aria-label="This transaction"
                      type="button"
                    >
                      <svg
                        className="ynab-new-icon ynab-checkbox-button-square is-checked"
                        width="13"
                        height="13"
                      >
                        <use href="#icon_sprite_check" />
                      </svg>
                    </button>
                  </div>

                  <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-notification" />

                  <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-flag">
                    <button
                      aria-label="Flag"
                      className="ynab-flag-pill ynab-flag-pill-none ynab-flag-icon-only"
                      type="button"
                    >
                      <span className="flag-pill-icon-container">
                        <YnabIcon
                          name="flag"
                          size={14}
                          className="flag-pill-icon-none"
                        />
                      </span>
                    </button>
                  </div>

                  {accountId === null && (
                    <div
                      className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-accountName user-data"
                      style={{ position: "relative" }}
                    >
                      <select
                        aria-label="Transaction Account"
                        value={draftAccountId}
                        onChange={(e) => setDraftAccountId(e.target.value)}
                        className="accounts-text-field dropdown-text-field ember-text-field"
                        style={{
                          height: "28px",
                          fontSize: "0.82rem",
                          width: "100%",
                          paddingRight: "1.5rem",
                        }}
                      >
                        {accounts
                          .filter((a) => !a.closed)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                      </select>
                      <svg
                        className="ynab-new-icon accounts-text-field-dropdown-icon"
                        width="8"
                        height="8"
                      >
                        <use href="#icon_sprite_caret_down" />
                      </svg>
                    </div>
                  )}

                  <div
                    ref={dateCellRef}
                    className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-date user-data"
                    style={{ position: "relative" }}
                    onClick={openDatePicker}
                  >
                    <input
                      aria-label="Transaction Date"
                      className="ember-text-field ember-view accounts-text-field dropdown-text-field ember-text-field"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="date"
                      type="text"
                      value={draftDate}
                      onChange={(e) => setDraftDate(e.target.value)}
                      onFocus={openDatePicker}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleSaveNewTransaction(e.shiftKey);
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setActivePopover(null);
                          setShowAddRow(false);
                        }
                      }}
                      style={{ height: "28px", fontSize: "0.82rem", width: "100%" }}
                    />
                    <svg
                      className="ynab-new-icon accounts-text-field-dropdown-icon"
                      width="8"
                      height="8"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDatePicker();
                      }}
                    >
                      <use href="#icon_sprite_caret_down" />
                    </svg>
                  </div>

                  <div
                    ref={payeeCellRef}
                    className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-payeeName user-data"
                    style={{ position: "relative" }}
                    onClick={openPayeeDropdown}
                  >
                    <input
                      aria-label="Payee"
                      className="accounts-text-field dropdown-text-field ember-text-field"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="payee"
                      type="text"
                      value={
                        draftTransferAccountId
                          ? `Transfer : ${accountNameById.get(draftTransferAccountId) ?? ""}`
                          : draftPayeeChoice
                      }
                      onChange={(e) => {
                        handlePayeeInputChange(e.target.value);
                        openPayeeDropdown();
                      }}
                      onFocus={openPayeeDropdown}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleSaveNewTransaction(e.shiftKey);
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setActivePopover(null);
                          setShowAddRow(false);
                        }
                      }}
                      style={{ height: "28px", fontSize: "0.82rem", width: "100%" }}
                    />
                    <svg
                      className="ynab-new-icon accounts-text-field-dropdown-icon"
                      width="8"
                      height="8"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPayeeDropdown();
                      }}
                    >
                      <use href="#icon_sprite_caret_down" />
                    </svg>
                  </div>

                  <div
                    ref={categoryCellRef}
                    className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-subCategoryName user-data"
                    style={{ position: "relative" }}
                    onClick={categoryDisabled ? undefined : openCategoryDropdown}
                  >
                    <input
                      aria-label="Category"
                      className="accounts-text-field dropdown-text-field ember-text-field"
                      autoComplete="off"
                      spellCheck={false}
                      disabled={categoryDisabled}
                      placeholder={categoryDisabled ? "Category not needed" : "category"}
                      type="text"
                      value={
                        categoryDisabled
                          ? "Category not needed"
                          : (categoryNameById.get(draftCategoryId) ?? draftCategorySearch)
                      }
                      onChange={(e) => {
                        setDraftCategorySearch(e.target.value);
                        openCategoryDropdown();
                      }}
                      onFocus={categoryDisabled ? undefined : openCategoryDropdown}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleSaveNewTransaction(e.shiftKey);
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setActivePopover(null);
                          setShowAddRow(false);
                        }
                      }}
                      style={{
                        height: "28px",
                        fontSize: "0.82rem",
                        width: "100%",
                        backgroundColor: categoryDisabled
                          ? "var(--backgroundTertiary)"
                          : "var(--backgroundPrimary)",
                        cursor: categoryDisabled ? "not-allowed" : "text",
                      }}
                    />
                    {!categoryDisabled && (
                      <svg
                        className="ynab-new-icon accounts-text-field-dropdown-icon"
                        width="8"
                        height="8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCategoryDropdown();
                        }}
                      >
                        <use href="#icon_sprite_caret_down" />
                      </svg>
                    )}
                  </div>

                  <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-memo user-data">
                    <input
                      type="text"
                      placeholder="memo"
                      value={draftMemo}
                      onChange={(e) => setDraftMemo(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleSaveNewTransaction(e.shiftKey);
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setActivePopover(null);
                          setShowAddRow(false);
                        }
                      }}
                      className="ember-text-field ember-view accounts-text-field ember-text-field"
                      style={{ height: "28px", fontSize: "0.82rem", width: "100%" }}
                    />
                  </div>

                  <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-outflow user-data">
                    <div className="ynab-new-currency-input is-editing">
                      <div className="input-wrapper">
                        <input
                          type="text"
                          placeholder="outflow"
                          value={draftOutflow}
                          onChange={(e) => {
                            setDraftOutflow(e.target.value);
                            if (e.target.value) setDraftInflow("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void handleSaveNewTransaction(e.shiftKey);
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              setActivePopover(null);
                              setShowAddRow(false);
                            }
                          }}
                          className="ember-text-field ember-view tabular-nums"
                          style={{ height: "28px", fontSize: "0.82rem", width: "100%", textAlign: "right" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-inflow user-data">
                    <div className="ynab-new-currency-input is-editing">
                      <div className="input-wrapper">
                        <input
                          type="text"
                          placeholder="inflow"
                          value={draftInflow}
                          onChange={(e) => {
                            setDraftInflow(e.target.value);
                            if (e.target.value) setDraftOutflow("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void handleSaveNewTransaction(e.shiftKey);
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              setActivePopover(null);
                              setShowAddRow(false);
                            }
                          }}
                          className="ember-text-field ember-view tabular-nums"
                          style={{ height: "28px", fontSize: "0.82rem", width: "100%", textAlign: "right" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-cleared"
                    data-register-area="Cleared"
                    style={{ display: "flex", justifyContent: "center" }}
                  >
                    <button
                      type="button"
                      className={`ynab-cleared ${draftCleared === "CLEARED" ? "is-cleared" : "is-uncleared"}`}
                      aria-label={`This transaction is ${draftCleared === "CLEARED" ? "cleared" : "not cleared"}`}
                      onClick={() =>
                        setDraftCleared((prev) =>
                          prev === "CLEARED" ? "UNCLEARED" : "CLEARED",
                        )
                      }
                    >
                      <YnabIcon
                        name={
                          draftCleared === "CLEARED"
                            ? "cleared_circle_fill"
                            : "cleared_circle"
                        }
                        size={12}
                        className={
                          draftCleared === "CLEARED"
                            ? "is-cleared-icon"
                            : "is-uncleared-icon"
                        }
                      />
                    </button>
                  </div>

                  <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-actions">&nbsp;</div>
                </div>

                <div className="ynab-grid-actions is-add-row">
                  <div className="buttons-container">
                    <div className="ynab-grid-actions-buttons">
                      <button
                        type="button"
                        className="button button-cancel"
                        onClick={() => {
                          setShowAddRow(false);
                          setActivePopover(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => void handleSaveNewTransaction(true)}
                      >
                        Save and add another
                      </button>
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => void handleSaveNewTransaction(false)}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Existing Transactions List */}
            {filteredTransactions.length === 0 ? (
              <div
                style={{
                  padding: "3rem 1rem",
                  textAlign: "center",
                  color: "var(--labelSecondary)",
                  fontSize: "0.9rem",
                }}
              >
                No transactions found.
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isOutflow = tx.amount_milliunits < 0;
                const absAmount = Math.abs(tx.amount_milliunits);
                const isLocked = tx.cleared === "RECONCILED";

                const isSelected = selectedSet.has(tx.id);

                return (
                  <div
                    key={tx.id}
                    onClick={(e) => handleRowClick(e, tx.id)}
                    className={`ynab-grid-body-row ynab-grid-body-parent ${
                      isSelected ? "is-checked" : ""
                    } ${isLocked ? "is-reconciled" : ""}`}
                    style={{ cursor: "pointer" }}
                  >
                    <div
                      className="ynab-grid-cell ynab-grid-cell-checkbox"
                      style={{ cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTransaction(tx.id, e.shiftKey);
                      }}
                    >
                      <button
                        className={`ynab-checkbox ynab-checkbox-button ${
                          isSelected ? "is-checked" : ""
                        }`}
                        role="checkbox"
                        aria-checked={isSelected ? "true" : "false"}
                        aria-label="This transaction"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTransaction(tx.id, e.shiftKey);
                        }}
                      >
                        <YnabIcon
                          name="check"
                          size={13}
                          className={`ynab-checkbox-button-square ${
                            isSelected ? "is-checked" : ""
                          }`}
                        />
                      </button>
                    </div>

                    <div className="ynab-grid-cell ynab-grid-cell-notification">
                      <YnabIcon name="info_circle_fill" size={14} />
                    </div>

                    <div className="ynab-grid-cell ynab-grid-cell-flag">
                      <button
                        aria-label="Flag"
                        className="ynab-flag-pill ynab-flag-pill-none ynab-flag-icon-only"
                        type="button"
                      >
                        <YnabIcon name="flag" size={14} />
                      </button>
                    </div>

                    {accountId === null && (
                      <div className="ynab-grid-cell ynab-grid-cell-accountName user-data">
                        <span>{accountNameById.get(tx.account_id) ?? "Unknown"}</span>
                      </div>
                    )}

                    <div className="ynab-grid-cell ynab-grid-cell-date user-data">
                      <span className="date-string">{formatDate(tx.date)}</span>
                    </div>

                    <div className="ynab-grid-cell ynab-grid-cell-payeeName user-data">
                      <div className="ynab-grid-cell-inner" style={{ width: "100%", overflow: "hidden" }}>
                        <span className="ynab-grid-cell-inner-payee-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {tx.transfer_account_id
                            ? `Transfer : ${
                                accountNameById.get(tx.transfer_account_id) ??
                                "Account"
                              }`
                            : tx.payee_name || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="ynab-grid-cell ynab-grid-cell-subCategoryName user-data">
                      {tx.category_id ? (
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {categoryNameById.get(tx.category_id) ?? "Unknown"}
                        </span>
                      ) : (
                        <span style={{ color: "var(--labelTertiary)" }}>—</span>
                      )}
                    </div>

                    <div className="ynab-grid-cell ynab-grid-cell-memo user-data">
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.memo || "—"}
                      </span>
                    </div>

                    <div className="ynab-grid-cell ynab-grid-cell-outflow user-data">
                      <span className="tabular-nums" style={{ whiteSpace: "nowrap" }}>
                        {isOutflow ? formatMilliunits(absAmount) : ""}
                      </span>
                    </div>

                    <div className="ynab-grid-cell ynab-grid-cell-inflow user-data">
                      <span className="tabular-nums" style={{ whiteSpace: "nowrap" }}>
                        {!isOutflow ? formatMilliunits(absAmount) : ""}
                      </span>
                    </div>

                    <div className="ynab-grid-cell ynab-grid-cell-cleared">
                      {isLocked ? (
                        <span
                          title="Reconciled (Locked)"
                          className="is-reconciled-icon"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--accentPositive)",
                          }}
                        >
                          <YnabIcon name="lock" size={14} />
                        </span>
                      ) : (
                        <button
                          className={`ynab-cleared ${
                            tx.cleared === "CLEARED" ? "is-cleared" : ""
                          }`}
                          type="button"
                          onClick={() => void handleToggleCleared(tx)}
                          aria-label={`This transaction is ${
                            tx.cleared === "CLEARED" ? "cleared" : "uncleared"
                          }`}
                        >
                          <YnabIcon
                            name={
                              tx.cleared === "CLEARED"
                                ? "cleared_circle_fill"
                                : "cleared_circle"
                            }
                            size={14}
                          />
                        </button>
                      )}
                    </div>

                    <div className="ynab-grid-cell ynab-grid-cell-actions">
                      {isLocked ? (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() =>
                            void onUnreconcileTransaction(tx.id, tx.date)
                          }
                          style={{ fontSize: "0.75rem", padding: "2px 6px", color: "var(--actionPrimary)" }}
                        >
                          Unlock
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() =>
                            void onDeleteTransaction(tx.id, tx.date)
                          }
                          style={{
                            color: "var(--accentNegative)",
                            fontSize: "0.78rem",
                            padding: "2px 6px",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Load More Pagination */}
          {nextCursor && (
            <div style={{ padding: "1rem", textAlign: "center", borderTop: "1px solid var(--separatorSubdued)" }}>
              <button
                type="button"
                className="button button-secondary"
                disabled={loading}
                onClick={onLoadMore}
              >
                {loading ? "Loading..." : "Load More Transactions"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Popovers for Date, Payee, and Category in Add Transaction */}
      <TransactionDatePickerPopover
        isOpen={activePopover === "date"}
        selectedDate={draftDate}
        anchorPosition={popoverAnchor}
        onSelectDate={(newDate) => {
          setDraftDate(newDate);
          setActivePopover(null);
        }}
        onClose={() => setActivePopover(null)}
      />

      <PayeeDropdownPopover
        isOpen={activePopover === "payee"}
        currentPayee={draftPayeeChoice}
        transferAccountId={draftTransferAccountId}
        accounts={accounts}
        currentAccountId={effectiveSourceAccountId}
        payees={payees}
        searchQuery={draftPayeeChoice}
        anchorPosition={popoverAnchor}
        onSelectPayee={(payeeName, transferId) => {
          setDraftPayeeChoice(payeeName);
          setDraftTransferAccountId(transferId);
          setActivePopover(null);
        }}
        onClose={() => setActivePopover(null)}
      />

      <CategoryDropdownPopover
        isOpen={activePopover === "category" && !categoryDisabled}
        selectedCategoryId={draftCategoryId}
        categories={categories}
        categoryGroups={categoryGroups}
        monthlyBudgets={monthlyBudgets}
        searchQuery={draftCategorySearch}
        anchorPosition={popoverAnchor}
        onSelectCategory={(catId) => {
          setDraftCategoryId(catId ?? "");
          setDraftCategorySearch("");
          setActivePopover(null);
        }}
        onOpenAddCategory={onOpenAddCategory}
        onClose={() => {
          setActivePopover(null);
          setDraftCategorySearch("");
        }}
      />

      {/* Floating Register Action Bar (scraped YNAB register-action-bar) */}
      {selectedTxIds.length > 0 && (
        <div className="register-action-bar-container show">
          <div ref={actionBarInnerRef} className="register-action-bar-inner show">
            {/* 1. Close / Selected count button */}
            <button
              className="close-action-bar-icon"
              type="button"
              aria-label="Deselect all"
              title="Deselect all (Esc)"
              onClick={() => {
                setSelectedTxIds([]);
                setLastSelectedTxId(null);
                setActiveActionBarPopover(null);
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
                <path d="M1.4 0L0 1.4L4.6 6L0 10.6L1.4 12L6 7.4L10.6 12L12 10.6L7.4 6L12 1.4L10.6 0L6 4.6L1.4 0Z" />
              </svg>
              <span>{selectedTxIds.length} {selectedTxIds.length === 1 ? "Transaction" : "Transactions"}</span>
            </button>

            <hr />

            {/* 2. Categorize Button */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="action-bar-category-btn"
                onClick={() =>
                  setActiveActionBarPopover((prev) => (prev === "categorize" ? null : "categorize"))
                }
              >
                <YnabIcon name="checkmark_inbox" size={14} />
                Categorize
              </button>

              {activeActionBarPopover === "categorize" && (
                <div
                  className="modal-popup modal-account-register-action-bar modal-account-edit-subcategories"
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 8px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 10001,
                    backgroundColor: "var(--backgroundPrimary, #fff)",
                    color: "var(--labelPrimary, #191818)",
                    border: "1px solid var(--separatorStandard, #dbd7cc)",
                    borderRadius: "8px",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                    padding: "6px",
                    minWidth: "220px",
                    maxHeight: "300px",
                    overflowY: "auto",
                  }}
                >
                  <div style={{ padding: "4px 8px 6px", borderBottom: "1px solid var(--separatorStandard, #dbd7cc)" }}>
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={actionBarCategorySearch}
                      onChange={(e) => setActionBarCategorySearch(e.target.value)}
                      autoFocus
                      style={{
                        width: "100%",
                        height: "26px",
                        padding: "2px 6px",
                        fontSize: "0.8rem",
                        border: "1px solid var(--separatorStandard, #dbd7cc)",
                        borderRadius: "4px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div style={{ maxHeight: "200px", overflowY: "auto", padding: "4px 0" }}>
                    {categories
                      .filter((c) => !c.hidden && !c.is_credit_card_payment)
                      .filter((c) =>
                        actionBarCategorySearch
                          ? c.name.toLowerCase().includes(actionBarCategorySearch.toLowerCase())
                          : true,
                      )
                      .map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          className="button-list"
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            padding: "6px 10px",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "0.82rem",
                            color: "var(--labelPrimary, #191818)",
                            borderRadius: "4px",
                          }}
                          onClick={() => void handleBatchCategorize(cat.id)}
                        >
                          {cat.name}
                        </button>
                      ))}
                    <button
                      type="button"
                      className="button-list"
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "6px 10px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        color: "var(--labelSecondary, #6e7a88)",
                        borderTop: "1px solid var(--separatorStandard, #dbd7cc)",
                        marginTop: "4px",
                      }}
                      onClick={() => void handleBatchCategorize(null)}
                    >
                      Clear Category (Uncategorized)
                    </button>
                  </div>
                </div>
              )}
            </div>

            <hr />

            {/* 3. Flag Button */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="action-bar-flag-btn"
                onClick={() =>
                  setActiveActionBarPopover((prev) => (prev === "flag" ? null : "flag"))
                }
              >
                <YnabIcon name="flag" size={14} />
                Flag
              </button>

              {activeActionBarPopover === "flag" && (
                <div
                  className="modal-popup modal-account-register-action-bar"
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 8px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 10001,
                    backgroundColor: "var(--backgroundPrimary, #fff)",
                    color: "var(--labelPrimary, #191818)",
                    border: "1px solid var(--separatorStandard, #dbd7cc)",
                    borderRadius: "8px",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                    padding: "6px 0",
                    minWidth: "160px",
                  }}
                >
                  <ul className="flags-menu" style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {[
                      { name: "Red", color: "#e85c5c" },
                      { name: "Orange", color: "#f2994a" },
                      { name: "Yellow", color: "#f2c94c" },
                      { name: "Green", color: "#27ae60" },
                      { name: "Blue", color: "#2d9cdb" },
                      { name: "Purple", color: "#9b51e0" },
                    ].map((f) => (
                      <li key={f.name}>
                        <button
                          type="button"
                          className="button-list edit-flags"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            width: "100%",
                            padding: "6px 12px",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "0.82rem",
                            color: "var(--labelPrimary, #191818)",
                            textAlign: "left",
                          }}
                          onClick={() => {
                            setActiveActionBarPopover(null);
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              width: "12px",
                              height: "12px",
                              borderRadius: "50%",
                              backgroundColor: f.color,
                            }}
                          />
                          <span>{f.name}</span>
                        </button>
                      </li>
                    ))}
                    <li style={{ borderTop: "1px solid var(--separatorStandard, #dbd7cc)", marginTop: "4px", paddingTop: "4px" }}>
                      <button
                        type="button"
                        className="button-list edit-flags"
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "6px 12px",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.82rem",
                          color: "var(--labelSecondary, #6e7a88)",
                          textAlign: "left",
                        }}
                        onClick={() => setActiveActionBarPopover(null)}
                      >
                        Clear Flag
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <hr />

            {/* 4. More Button */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="action-bar-more-btn"
                onClick={() =>
                  setActiveActionBarPopover((prev) => (prev === "more" ? null : "more"))
                }
              >
                <YnabIcon name="more_horizontal" size={14} />
                More
              </button>

              {activeActionBarPopover === "more" && (
                <div
                  className="modal-popup modal-account-register-action-bar"
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 8px)",
                    right: 0,
                    zIndex: 10001,
                    backgroundColor: "var(--backgroundPrimary, #fff)",
                    color: "var(--labelPrimary, #191818)",
                    border: "1px solid var(--separatorStandard, #dbd7cc)",
                    borderRadius: "8px",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                    padding: "4px 0",
                    minWidth: "170px",
                  }}
                >
                  <button
                    type="button"
                    className="button-list"
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 14px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.82rem",
                      color: "var(--labelPrimary, #191818)",
                    }}
                    onClick={() => {
                      setActiveActionBarPopover(null);
                      void handleSetClearedForSelected("CLEARED");
                    }}
                  >
                    Mark as Cleared
                  </button>
                  <button
                    type="button"
                    className="button-list"
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 14px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.82rem",
                      color: "var(--labelPrimary, #191818)",
                    }}
                    onClick={() => {
                      setActiveActionBarPopover(null);
                      void handleSetClearedForSelected("UNCLEARED");
                    }}
                  >
                    Mark as Uncleared
                  </button>
                  <hr
                    style={{
                      margin: "4px 0",
                      border: "none",
                      borderTop: "1px solid var(--separatorStandard, #dbd7cc)",
                    }}
                  />
                  <button
                    type="button"
                    className="button-list"
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 14px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.82rem",
                      color: "var(--accentNegative, #ea4335)",
                    }}
                    onClick={() => {
                      setActiveActionBarPopover(null);
                      void handleDeleteSelectedTransactions();
                    }}
                  >
                    Delete ({selectedTxIds.length})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
