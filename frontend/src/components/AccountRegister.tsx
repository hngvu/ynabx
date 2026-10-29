import React, { useState } from "react";
import type {
  Account,
  Category,
  EditableClearedStatus,
  Payee,
  SaveTransactionRequest,
  Transaction,
} from "../api/types";
import { formatMilliunits, parseInputToMilliunits } from "../utils/currency";
import { getTodayIso, formatDate } from "../utils/dates";
import { YnabIcon } from "./common/YnabIcon";

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
  onUpdateAccount: (
    accountId: string,
    updates: { name?: string; closed?: boolean },
  ) => Promise<void>;
  onDeleteAccount: (accountId: string) => Promise<void>;
}

export function AccountRegister({
  accountId,
  accounts,
  categories,
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
  onUpdateAccount,
  onDeleteAccount,
}: AccountRegisterProps): React.JSX.Element {
  const currentAccount =
    accountId !== null
      ? (accounts.find((a) => a.id === accountId) ?? null)
      : null;

  const balances = computeRegisterHeaderBalances(accounts, accountId);

  const [showAddRow, setShowAddRow] = useState(false);
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

  const effectiveSourceAccountId = accountId ?? draftAccountId;
  const categoryDisabled = isCategoryDisabledForDraft(
    accounts,
    effectiveSourceAccountId,
    draftTransferAccountId,
  );

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
      setDraftMemo("");
      setDraftOutflow("");
      setDraftInflow("");
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
                className="ynab-checkbox ynab-checkbox-button"
                role="checkbox"
                aria-checked="false"
                aria-label="Check all"
                type="button"
              >
                <YnabIcon
                  name="check"
                  size={13}
                  className="ynab-checkbox-button-square"
                />
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
              <div
                className="ynab-grid-add-container"
                style={{
                  backgroundColor: "var(--backgroundSecondary)",
                  borderBottom: "2px solid var(--actionPrimary)",
                }}
              >
                <div className="ynab-grid-body-row is-editing">
                <div className="ynab-grid-cell ynab-grid-cell-checkbox">&nbsp;</div>
                <div className="ynab-grid-cell ynab-grid-cell-notification">&nbsp;</div>
                <div className="ynab-grid-cell ynab-grid-cell-flag">&nbsp;</div>

                {accountId === null && (
                  <div className="ynab-grid-cell ynab-grid-cell-accountName">
                    <select
                      aria-label="Transaction Account"
                      value={draftAccountId}
                      onChange={(e) => setDraftAccountId(e.target.value)}
                      className="form-select"
                      style={{ height: "28px", fontSize: "0.82rem", width: "100%" }}
                    >
                      {accounts
                        .filter((a) => !a.closed)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="ynab-grid-cell ynab-grid-cell-date">
                  <input
                    type="date"
                    value={draftDate}
                    onChange={(e) => setDraftDate(e.target.value)}
                    className="ember-text-field"
                    style={{ height: "28px", fontSize: "0.82rem", width: "100%" }}
                  />
                </div>

                <div className="ynab-grid-cell ynab-grid-cell-payeeName">
                  <input
                    list="register-payee-options"
                    type="text"
                    placeholder="Payee"
                    value={
                      draftTransferAccountId
                        ? `Transfer : ${accountNameById.get(draftTransferAccountId) ?? ""}`
                        : draftPayeeChoice
                    }
                    onChange={(e) => handlePayeeInputChange(e.target.value)}
                    className="ember-text-field"
                    style={{ height: "28px", fontSize: "0.82rem", width: "100%" }}
                  />
                  <datalist id="register-payee-options">
                    {accounts
                      .filter((a) => !a.closed && a.id !== effectiveSourceAccountId)
                      .map((a) => (
                        <option key={a.id} value={`Transfer : ${a.name}`}>
                          Transfer : {a.name}
                        </option>
                      ))}
                    {payees
                      .filter((p) => !p.transfer_account_id)
                      .map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                  </datalist>
                </div>

                <div className="ynab-grid-cell ynab-grid-cell-subCategoryName">
                  <select
                    aria-label="Category"
                    disabled={categoryDisabled}
                    value={draftCategoryId}
                    onChange={(e) => setDraftCategoryId(e.target.value)}
                    className="form-select"
                    style={{
                      height: "28px",
                      fontSize: "0.82rem",
                      width: "100%",
                      backgroundColor: categoryDisabled
                        ? "var(--backgroundTertiary)"
                        : "var(--backgroundPrimary)",
                    }}
                  >
                    <option value="">
                      {categoryDisabled
                        ? "Category not needed"
                        : "Select Category..."}
                    </option>
                    {!categoryDisabled &&
                      categories
                        .filter((c) => !c.hidden)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                  </select>
                </div>

                <div className="ynab-grid-cell ynab-grid-cell-memo">
                  <input
                    type="text"
                    placeholder="Memo"
                    value={draftMemo}
                    onChange={(e) => setDraftMemo(e.target.value)}
                    className="ember-text-field"
                    style={{ height: "28px", fontSize: "0.82rem", width: "100%" }}
                  />
                </div>

                <div className="ynab-grid-cell ynab-grid-cell-outflow">
                  <input
                    type="text"
                    placeholder="0.00"
                    value={draftOutflow}
                    onChange={(e) => {
                      setDraftOutflow(e.target.value);
                      if (e.target.value) setDraftInflow("");
                    }}
                    className="ember-text-field tabular-nums"
                    style={{ height: "28px", fontSize: "0.82rem", width: "100%", textAlign: "right" }}
                  />
                </div>

                <div className="ynab-grid-cell ynab-grid-cell-inflow">
                  <input
                    type="text"
                    placeholder="0.00"
                    value={draftInflow}
                    onChange={(e) => {
                      setDraftInflow(e.target.value);
                      if (e.target.value) setDraftOutflow("");
                    }}
                    className="ember-text-field tabular-nums"
                    style={{ height: "28px", fontSize: "0.82rem", width: "100%", textAlign: "right" }}
                  />
                </div>

                <div className="ynab-grid-cell ynab-grid-cell-cleared" style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    type="button"
                    className={`ynab-cleared ${draftCleared === "CLEARED" ? "is-cleared" : ""}`}
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
                      size={14}
                    />
                  </button>
                </div>

                  <div className="ynab-grid-cell ynab-grid-cell-actions">&nbsp;</div>
                </div>

                <div className="ynab-grid-add-actions-bar">
                  <button
                    type="button"
                    className="button button-cancel"
                    onClick={() => setShowAddRow(false)}
                    style={{ height: "28px", padding: "0 10px", fontSize: "0.78rem" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => void handleSaveNewTransaction(false)}
                    style={{ height: "28px", padding: "0 12px", fontSize: "0.78rem" }}
                  >
                    Save
                  </button>
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

                return (
                  <div
                    key={tx.id}
                    className={`ynab-grid-body-row ynab-grid-body-parent ${
                      isLocked ? "is-reconciled" : ""
                    }`}
                  >
                    <div className="ynab-grid-cell ynab-grid-cell-checkbox">
                      <button
                        className="ynab-checkbox ynab-checkbox-button"
                        role="checkbox"
                        aria-checked="false"
                        aria-label="This transaction"
                        type="button"
                      >
                        <YnabIcon
                          name="check"
                          size={13}
                          className="ynab-checkbox-button-square"
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
    </div>
  );
}
