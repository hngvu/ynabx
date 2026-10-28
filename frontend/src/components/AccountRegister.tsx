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
import { getTodayIso } from "../utils/dates";

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
  onOpenReconcile: (account: Account) => void;
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

  const handleToggleCleared = async (tx: Transaction) => {
    if (tx.cleared === "RECONCILED") return;
    const nextCleared: EditableClearedStatus =
      tx.cleared === "CLEARED" ? "UNCLEARED" : "CLEARED";

    await onUpdateTransaction(
      tx.id,
      {
        account_id: tx.account_id,
        category_id: tx.category_id ?? null,
        payee_id: tx.transfer_account_id ? null : (tx.payee_id ?? null),
        payee_name: tx.transfer_account_id ? null : (tx.payee_name ?? null),
        date: tx.date,
        amount_milliunits: tx.amount_milliunits,
        memo: tx.memo ?? null,
        cleared: nextCleared,
        approved: tx.approved,
        transfer_account_id: tx.transfer_account_id ?? null,
      },
      tx.date,
    );
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        backgroundColor: "var(--bg-primary)",
      }}
    >
      {/* Account Register Header */}
      <header
        style={{
          padding: "1rem 1.25rem",
          borderBottom: "1px solid var(--separator)",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800 }}>
              {currentAccount ? currentAccount.name : "All Accounts"}
            </h1>
            {currentAccount && (
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  marginTop: "0.15rem",
                }}
              >
                {currentAccount.type} ·{" "}
                {currentAccount.on_budget ? "Budget Account" : "Tracking Account"}
              </div>
            )}
          </div>

          {/* Cleared + Uncleared = Working Balance Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              backgroundColor: "var(--bg-secondary)",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
            }}
          >
            <div style={{ textAlign: "right" }}>
              <div
                className="tabular-nums"
                style={{ fontWeight: 700, fontSize: "0.95rem" }}
              >
                {formatMilliunits(balances.cleared)}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                Cleared Balance
              </div>
            </div>
            <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>
              +
            </span>
            <div style={{ textAlign: "right" }}>
              <div
                className="tabular-nums"
                style={{ fontWeight: 700, fontSize: "0.95rem" }}
              >
                {formatMilliunits(balances.uncleared)}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                Uncleared Balance
              </div>
            </div>
            <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>
              =
            </span>
            <div style={{ textAlign: "right" }}>
              <div
                className="tabular-nums"
                style={{
                  fontWeight: 800,
                  fontSize: "1.05rem",
                  color:
                    balances.working < 0
                      ? "var(--text-negative)"
                      : "var(--text-positive)",
                }}
              >
                {formatMilliunits(balances.working)}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                Working Balance
              </div>
            </div>

            {currentAccount && (
              <div
                style={{
                  display: "flex",
                  gap: "0.4rem",
                  marginLeft: "0.5rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => onOpenReconcile(currentAccount)}
                  style={{
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "var(--action-primary)",
                    color: "#ffffff",
                    padding: "0.45rem 0.85rem",
                    fontSize: "0.825rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Reconcile
                </button>
                {currentAccount.balance_milliunits === 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      void onUpdateAccount(currentAccount.id, {
                        closed: !currentAccount.closed,
                      })
                    }
                    style={{
                      border: "1px solid var(--separator)",
                      borderRadius: "6px",
                      backgroundColor: "var(--bg-primary)",
                      color: "var(--text-secondary)",
                      padding: "0.4rem 0.65rem",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                  >
                    {currentAccount.closed ? "Reopen" : "Close Account"}
                  </button>
                )}
                {transactions.length === 0 && (
                  <button
                    type="button"
                    onClick={() => void onDeleteAccount(currentAccount.id)}
                    style={{
                      border: "none",
                      borderRadius: "6px",
                      backgroundColor: "var(--action-destructive-bg)",
                      color: "var(--action-destructive-text)",
                      padding: "0.4rem 0.65rem",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Toolbar */}
        <div
          style={{
            marginTop: "0.85rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setShowAddRow((prev) => !prev);
              setDraftAccountId(
                accountId ?? accounts.find((a) => !a.closed)?.id ?? "",
              );
            }}
            style={{
              border: "none",
              borderRadius: "6px",
              backgroundColor: "var(--action-secondary-bg)",
              color: "var(--action-secondary-text)",
              padding: "0.42rem 0.85rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Add Transaction
          </button>

          <input
            type="search"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              height: "32px",
              padding: "0 0.75rem",
              borderRadius: "6px",
              border: "1px solid var(--separator)",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.825rem",
              width: "220px",
            }}
          />
        </div>

        {formError && (
          <div
            role="alert"
            style={{
              marginTop: "0.5rem",
              padding: "0.45rem 0.75rem",
              borderRadius: "6px",
              backgroundColor: "var(--action-destructive-bg)",
              color: "var(--action-destructive-text)",
              fontSize: "0.8rem",
            }}
          >
            {formError}
          </div>
        )}
      </header>

      {/* Register Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <table
          className="register-table"
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderBottom: "1px solid var(--separator)",
                height: "36px",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
              }}
            >
              {accountId === null && (
                <th style={{ textAlign: "left", padding: "0 0.75rem" }}>
                  Account
                </th>
              )}
              <th style={{ textAlign: "left", padding: "0 0.75rem" }}>Date</th>
              <th style={{ textAlign: "left", padding: "0 0.75rem" }}>Payee</th>
              <th style={{ textAlign: "left", padding: "0 0.75rem" }}>
                Category
              </th>
              <th style={{ textAlign: "left", padding: "0 0.75rem" }}>Memo</th>
              <th style={{ textAlign: "right", padding: "0 0.75rem" }}>
                Outflow
              </th>
              <th style={{ textAlign: "right", padding: "0 0.75rem" }}>
                Inflow
              </th>
              <th style={{ textAlign: "center", padding: "0 0.75rem" }}>
                Cleared
              </th>
              <th style={{ textAlign: "right", padding: "0 0.75rem" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Inline New Transaction Entry Row */}
            {showAddRow && (
              <tr
                style={{
                  backgroundColor: "var(--bg-row-selected)",
                  borderBottom: "2px solid var(--action-primary)",
                }}
              >
                {accountId === null && (
                  <td style={{ padding: "0.4rem 0.5rem" }}>
                    <select
                      aria-label="Transaction Account"
                      value={draftAccountId}
                      onChange={(e) => setDraftAccountId(e.target.value)}
                      style={{
                        width: "100%",
                        height: "30px",
                        borderRadius: "4px",
                        border: "1px solid var(--separator)",
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
                  </td>
                )}
                <td style={{ padding: "0.4rem 0.5rem" }}>
                  <input
                    type="date"
                    value={draftDate}
                    onChange={(e) => setDraftDate(e.target.value)}
                    style={{
                      height: "30px",
                      borderRadius: "4px",
                      border: "1px solid var(--separator)",
                      padding: "0 0.35rem",
                    }}
                  />
                </td>
                <td style={{ padding: "0.4rem 0.5rem" }}>
                  <div style={{ display: "flex", gap: "0.3rem" }}>
                    <select
                      aria-label="Transfer or Saved Payee"
                      value={
                        draftTransferAccountId
                          ? `transfer:${draftTransferAccountId}`
                          : ""
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith("transfer:")) {
                          const targetAccId = val.replace("transfer:", "");
                          setDraftTransferAccountId(targetAccId);
                          setDraftPayeeChoice("");
                        } else {
                          setDraftTransferAccountId(null);
                          setDraftPayeeChoice(val);
                        }
                      }}
                      style={{
                        height: "30px",
                        borderRadius: "4px",
                        border: "1px solid var(--separator)",
                        maxWidth: "135px",
                      }}
                    >
                      <option value="">Payee / Transfer...</option>
                      <optgroup label="Transfer Between Accounts">
                        {accounts
                          .filter(
                            (a) =>
                              a.id !== effectiveSourceAccountId && !a.closed,
                          )
                          .map((a) => (
                            <option key={a.id} value={`transfer:${a.id}`}>
                              Transfer : {a.name}
                            </option>
                          ))}
                      </optgroup>
                      {payees.filter((p) => !p.transfer_account_id).length >
                        0 && (
                        <optgroup label="Saved Payees">
                          {payees
                            .filter((p) => !p.transfer_account_id)
                            .map((p) => (
                              <option key={p.id} value={p.name}>
                                {p.name}
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </select>
                    {!draftTransferAccountId && (
                      <input
                        type="text"
                        placeholder="Payee name"
                        value={draftPayeeChoice}
                        onChange={(e) => setDraftPayeeChoice(e.target.value)}
                        style={{
                          height: "30px",
                          borderRadius: "4px",
                          border: "1px solid var(--separator)",
                          padding: "0 0.4rem",
                          flex: 1,
                        }}
                      />
                    )}
                  </div>
                </td>
                <td style={{ padding: "0.4rem 0.5rem" }}>
                  <select
                    aria-label="Transaction Category"
                    disabled={categoryDisabled}
                    value={categoryDisabled ? "" : draftCategoryId}
                    onChange={(e) => setDraftCategoryId(e.target.value)}
                    style={{
                      width: "100%",
                      height: "30px",
                      borderRadius: "4px",
                      border: "1px solid var(--separator)",
                      opacity: categoryDisabled ? 0.55 : 1,
                    }}
                  >
                    <option value="">
                      {categoryDisabled
                        ? "Category not needed"
                        : "Select Category..."}
                    </option>
                    {categories
                      .filter((c) => !c.hidden && !c.is_credit_card_payment)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </td>
                <td style={{ padding: "0.4rem 0.5rem" }}>
                  <input
                    type="text"
                    placeholder="Memo"
                    value={draftMemo}
                    onChange={(e) => setDraftMemo(e.target.value)}
                    style={{
                      width: "100%",
                      height: "30px",
                      borderRadius: "4px",
                      border: "1px solid var(--separator)",
                      padding: "0 0.4rem",
                    }}
                  />
                </td>
                <td style={{ padding: "0.4rem 0.5rem" }}>
                  <input
                    type="text"
                    placeholder="0.00"
                    value={draftOutflow}
                    onChange={(e) => {
                      setDraftOutflow(e.target.value);
                      if (e.target.value) setDraftInflow("");
                    }}
                    style={{
                      width: "90px",
                      height: "30px",
                      textAlign: "right",
                      borderRadius: "4px",
                      border: "1px solid var(--separator)",
                      padding: "0 0.4rem",
                    }}
                  />
                </td>
                <td style={{ padding: "0.4rem 0.5rem" }}>
                  <input
                    type="text"
                    placeholder="0.00"
                    value={draftInflow}
                    onChange={(e) => {
                      setDraftInflow(e.target.value);
                      if (e.target.value) setDraftOutflow("");
                    }}
                    style={{
                      width: "90px",
                      height: "30px",
                      textAlign: "right",
                      borderRadius: "4px",
                      border: "1px solid var(--separator)",
                      padding: "0 0.4rem",
                    }}
                  />
                </td>
                <td style={{ textAlign: "center", padding: "0.4rem 0.5rem" }}>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftCleared((prev) =>
                        prev === "CLEARED" ? "UNCLEARED" : "CLEARED",
                      )
                    }
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      border: "none",
                      backgroundColor:
                        draftCleared === "CLEARED"
                          ? "var(--text-positive)"
                          : "var(--separator)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    C
                  </button>
                </td>
                <td style={{ textAlign: "right", padding: "0.4rem 0.5rem" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      gap: "0.3rem",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => void handleSaveNewTransaction(false)}
                      style={{
                        border: "none",
                        borderRadius: "4px",
                        backgroundColor: "var(--action-primary)",
                        color: "#fff",
                        padding: "0.3rem 0.55rem",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddRow(false)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "var(--text-muted)",
                        fontSize: "0.78rem",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Transaction Rows */}
            {filteredTransactions.map((tx) => {
              const isOutflow = tx.amount_milliunits < 0;
              const isReconciled = tx.cleared === "RECONCILED";
              const isCleared = tx.cleared === "CLEARED";

              const categoryLabel = tx.transfer_account_id
                ? "Transfer (No Category)"
                : tx.category_id
                  ? (categoryNameById.get(tx.category_id) ?? "Uncategorized")
                  : "Not Applicable";

              return (
                <tr
                  key={tx.id}
                  style={{
                    borderBottom: "1px solid var(--separator)",
                    height: "40px",
                    fontSize: "0.85rem",
                  }}
                >
                  {accountId === null && (
                    <td style={{ padding: "0 0.75rem", fontWeight: 600 }}>
                      {accountNameById.get(tx.account_id) ?? "Account"}
                    </td>
                  )}
                  <td
                    className="tabular-nums"
                    style={{ padding: "0 0.75rem", whiteSpace: "nowrap" }}
                  >
                    {tx.date}
                  </td>
                  <td style={{ padding: "0 0.75rem", fontWeight: 500 }}>
                    {tx.payee_name ??
                      (tx.transfer_account_id
                        ? `Transfer : ${accountNameById.get(tx.transfer_account_id) ?? ""}`
                        : "—")}
                  </td>
                  <td
                    style={{
                      padding: "0 0.75rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {categoryLabel}
                  </td>
                  <td
                    style={{
                      padding: "0 0.75rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    {tx.memo ?? ""}
                  </td>
                  <td
                    className="tabular-nums"
                    style={{ textAlign: "right", padding: "0 0.75rem" }}
                  >
                    {isOutflow
                      ? formatMilliunits(Math.abs(tx.amount_milliunits))
                      : ""}
                  </td>
                  <td
                    className="tabular-nums"
                    style={{
                      textAlign: "right",
                      padding: "0 0.75rem",
                      color: "var(--text-positive)",
                      fontWeight: !isOutflow ? 600 : 400,
                    }}
                  >
                    {!isOutflow ? formatMilliunits(tx.amount_milliunits) : ""}
                  </td>
                  <td style={{ textAlign: "center", padding: "0 0.75rem" }}>
                    {isReconciled ? (
                      <span title="Reconciled (Locked)">🔒</span>
                    ) : (
                      <button
                        type="button"
                        title={isCleared ? "Cleared" : "Uncleared"}
                        onClick={() => void handleToggleCleared(tx)}
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          border: "none",
                          backgroundColor: isCleared
                            ? "var(--text-positive)"
                            : "var(--separator)",
                          color: "#ffffff",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        C
                      </button>
                    )}
                  </td>
                  <td style={{ textAlign: "right", padding: "0 0.75rem" }}>
                    {isReconciled ? (
                      <button
                        type="button"
                        onClick={() =>
                          void onUnreconcileTransaction(tx.id, tx.date)
                        }
                        style={{
                          border: "none",
                          background: "var(--action-secondary-bg)",
                          color: "var(--action-secondary-text)",
                          borderRadius: "4px",
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                        }}
                      >
                        Unlock
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          void onDeleteTransaction(tx.id, tx.date)
                        }
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "var(--text-negative)",
                          fontSize: "0.78rem",
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredTransactions.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={accountId === null ? 9 : 8}
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "var(--text-muted)",
                  }}
                >
                  No transactions recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {nextCursor && (
          <div style={{ padding: "1rem", textAlign: "center" }}>
            <button
              type="button"
              disabled={loading}
              onClick={onLoadMore}
              style={{
                border: "none",
                borderRadius: "6px",
                backgroundColor: "var(--action-secondary-bg)",
                color: "var(--action-secondary-text)",
                padding: "0.5rem 1.25rem",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {loading ? "Loading..." : "Load More Transactions"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
