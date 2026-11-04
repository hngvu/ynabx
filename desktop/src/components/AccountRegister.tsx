import React, { useState, useRef, useMemo, useEffect } from "react";
import type {
  Account,
  Category,
  CategoryGroup,
  CategoryMonthAllocation,
  EditableClearedStatus,
  FlagColor,
  Payee,
  SaveTransactionRequest,
  Transaction,
} from "../api/types";
import { formatMilliunits, parseInputToMilliunits } from "../utils/currency";
import { getTodayIso, formatDate } from "../utils/dates";
import {
  FLAG_OPTIONS,
  getStoredFlags,
  setStoredTransactionFlag,
  setStoredBatchTransactionFlags,
} from "../utils/flagUtils";
import { YnabIcon } from "./common/YnabIcon";
import { TransactionDatePickerPopover } from "./modals/TransactionDatePickerPopover";
import { PayeeDropdownPopover } from "./modals/PayeeDropdownPopover";
import { CategoryDropdownPopover } from "./modals/CategoryDropdownPopover";
import { ViewOptionsModal, type ViewOptionsState } from "./modals/ViewOptionsModal";
import { TransactionSearchBar, type SearchFilter } from "./common/TransactionSearchBar";

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
  initialSelectedTxIds?: string[];
  initialEditingTxId?: string | null;
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
  initialSelectedTxIds = [],
  initialEditingTxId = null,
}: AccountRegisterProps): React.JSX.Element {
  const currentAccount =
    accountId !== null
      ? (accounts.find((a) => a.id === accountId) ?? null)
      : null;

  const balances = computeRegisterHeaderBalances(accounts, accountId);

  const [showAddRow, setShowAddRow] = useState(initialShowAddRow);
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

  const initialEditingTx = useMemo(() => {
    if (!initialEditingTxId) return null;
    return transactions.find((t) => t.id === initialEditingTxId) ?? null;
  }, [initialEditingTxId, transactions]);

  const [editingTxId, setEditingTxId] = useState<string | null>(
    initialEditingTx ? initialEditingTx.id : null,
  );
  const [editDate, setEditDate] = useState<string>(
    initialEditingTx?.date ?? "",
  );
  const [editAccountId, setEditAccountId] = useState<string>(
    initialEditingTx?.account_id ?? "",
  );
  const [editPayeeChoice, setEditPayeeChoice] = useState<string>(
    initialEditingTx?.payee_name ?? "",
  );
  const [editTransferAccountId, setEditTransferAccountId] = useState<
    string | null
  >(initialEditingTx?.transfer_account_id ?? null);
  const [editCategoryId, setEditCategoryId] = useState<string>(
    initialEditingTx?.category_id ?? "",
  );
  const [editCategorySearch, setEditCategorySearch] = useState<string>("");
  const [editMemo, setEditMemo] = useState<string>(
    initialEditingTx?.memo ?? "",
  );
  const [editOutflow, setEditOutflow] = useState<string>(() => {
    if (!initialEditingTx) return "";
    return initialEditingTx.amount_milliunits < 0
      ? formatMilliunits(Math.abs(initialEditingTx.amount_milliunits), {
          displaySymbol: false,
        })
      : "";
  });
  const [editInflow, setEditInflow] = useState<string>(() => {
    if (!initialEditingTx) return "";
    return initialEditingTx.amount_milliunits > 0
      ? formatMilliunits(initialEditingTx.amount_milliunits, {
          displaySymbol: false,
        })
      : "";
  });
  const [editCleared, setEditCleared] = useState<EditableClearedStatus>(
    (initialEditingTx?.cleared as EditableClearedStatus) ?? "UNCLEARED",
  );

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

  const editEffectiveSourceAccountId = accountId ?? editAccountId;
  const editCategoryDisabled = isCategoryDisabledForDraft(
    accounts,
    editEffectiveSourceAccountId,
    editTransferAccountId,
  );

  const openDatePicker = (elem?: Element | null) => {
    const target = elem ?? dateCellRef.current;
    if (target) {
      const rect = target.getBoundingClientRect();
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

  const openPayeeDropdown = (elem?: Element | null) => {
    const target = elem ?? payeeCellRef.current;
    if (target) {
      const rect = target.getBoundingClientRect();
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

  const openCategoryDropdown = (elem?: Element | null) => {
    const isEditing = Boolean(editingTxId);
    if (isEditing ? editCategoryDisabled : categoryDisabled) return;
    const target = elem ?? categoryCellRef.current;
    if (target) {
      const rect = target.getBoundingClientRect();
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

  const [viewOptions, setViewOptions] = useState<ViewOptionsState>({
    datePreset: "alldates",
    fromMonth: 0,
    fromYear: 2025,
    toMonth: 11,
    toYear: 2036,
    showReconciled: true,
    showFlags: true,
  });
  const [isViewOptionsOpen, setIsViewOptionsOpen] = useState(false);
  const [viewOptionsAnchor, setViewOptionsAnchor] = useState<{
    top: number;
    right: number;
    bottom: number;
    left: number;
    width?: number;
    height?: number;
  } | null>(null);
  const viewOptionsBtnRef = useRef<HTMLButtonElement>(null);

  const [activeSearchFilter, setActiveSearchFilter] = useState<SearchFilter | null>(null);

  const accountNameById = new Map<string, string>(
    accounts.map((a) => [a.id, a.name]),
  );
  const categoryNameById = new Map<string, string>(
    categories.map((c) => [c.id, c.name]),
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Reconciled filter
      if (!viewOptions.showReconciled && tx.cleared === "RECONCILED") {
        return false;
      }

      // 2. Date Range filter
      if (viewOptions.datePreset !== "alldates") {
        const txDate = new Date(tx.date);
        const fromDate = new Date(viewOptions.fromYear, viewOptions.fromMonth, 1);
        const toDate = new Date(viewOptions.toYear, viewOptions.toMonth + 1, 0, 23, 59, 59);
        if (txDate < fromDate || txDate > toDate) {
          return false;
        }
      }

      // 3. Search Filter
      if (activeSearchFilter) {
        const q = activeSearchFilter.query.trim().toLowerCase();
        if (q) {
          if (activeSearchFilter.type === "payee") {
            const payee = (tx.payee_name ?? "").toLowerCase();
            return payee.includes(q);
          }
          if (activeSearchFilter.type === "category") {
            const cat = (tx.category_id ? (categoryNameById.get(tx.category_id) ?? "") : "").toLowerCase();
            return cat.includes(q);
          }
          if (activeSearchFilter.type === "memo") {
            const memo = (tx.memo ?? "").toLowerCase();
            return memo.includes(q);
          }
          // type === 'any'
          const payeeText = (tx.payee_name ?? "").toLowerCase();
          const memoText = (tx.memo ?? "").toLowerCase();
          const catText = (
            tx.category_id ? (categoryNameById.get(tx.category_id) ?? "") : ""
          ).toLowerCase();
          return payeeText.includes(q) || memoText.includes(q) || catText.includes(q);
        }
      }

      return true;
    });
  }, [transactions, viewOptions, activeSearchFilter, categoryNameById]);

  const unapprovedTransactions = useMemo(() => {
    return filteredTransactions.filter(
      (tx) => !tx.approved || (!tx.category_id && !tx.transfer_account_id),
    );
  }, [filteredTransactions]);

  const hasNotifications = unapprovedTransactions.length > 0;

  const effectivePlanId = useMemo(
    () => transactions[0]?.plan_id || accounts[0]?.plan_id || "default",
    [transactions, accounts],
  );

  const [flags, setFlags] = useState<Record<string, FlagColor>>(() =>
    getStoredFlags(effectivePlanId),
  );

  useEffect(() => {
    setFlags(getStoredFlags(effectivePlanId));
  }, [effectivePlanId]);

  const [rowFlagPopover, setRowFlagPopover] = useState<{
    txId: string;
    top: number;
    left: number;
  } | null>(null);

  const [rowCategoryPopover, setRowCategoryPopover] = useState<{
    tx: Transaction;
    anchor: { top: number; bottom?: number; left: number; width?: number; height?: number };
  } | null>(null);
  const [rowCategorySearch, setRowCategorySearch] = useState<string>("");

  const [selectedTxIds, setSelectedTxIds] = useState<string[]>(initialSelectedTxIds);
  const [lastSelectedTxId, setLastSelectedTxId] = useState<string | null>(null);
  const [activeActionBarPopover, setActiveActionBarPopover] = useState<"categorize" | "flag" | "more" | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<{ id: string; bottom: number } | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const [popoverPos, setPopoverPos] = useState<{
    bottom: number;
    left: number;
    arrowLeft: number;
  } | null>(null);

  const actionBarInnerRef = useRef<HTMLDivElement>(null);
  const categorizeBtnRef = useRef<HTMLButtonElement>(null);
  const flagBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const selectedSet = useMemo(() => new Set(selectedTxIds), [selectedTxIds]);

  const hasSelectedUnapproved = useMemo(() => {
    return filteredTransactions.some(
      (tx) => selectedSet.has(tx.id) && !tx.approved,
    );
  }, [filteredTransactions, selectedSet]);

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
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    if (!activeActionBarPopover) {
      setPopoverPos(null);
      setHoveredGroup(null);
      return;
    }

    const updatePos = () => {
      const anchor =
        activeActionBarPopover === "categorize"
          ? categorizeBtnRef.current
          : activeActionBarPopover === "flag"
          ? flagBtnRef.current
          : activeActionBarPopover === "more"
          ? moreBtnRef.current
          : null;

      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const modalWidth = activeActionBarPopover === "flag" ? 272 : 232;
      const left = Math.max(
        12,
        Math.min(
          window.innerWidth - modalWidth - 12,
          rect.left + rect.width / 2 - modalWidth / 2,
        ),
      );
      const bottom = window.innerHeight - rect.top + 12;
      const arrowLeft = rect.left + rect.width / 2 - left;

      setPopoverPos({ bottom, left, arrowLeft });
    };

    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
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
    if (editingTxId && editingTxId !== txId) {
      setEditingTxId(null);
      setActivePopover(null);
      setEditCategorySearch("");
    }

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

  const startEditingTransaction = (tx: Transaction) => {
    if (tx.cleared === "RECONCILED") return;
    setShowAddRow(false);
    setRowCategoryPopover(null);
    setRowFlagPopover(null);
    setEditingTxId(tx.id);
    setEditDate(tx.date);
    setEditAccountId(tx.account_id);
    setEditPayeeChoice(tx.payee_name || "");
    setEditTransferAccountId(tx.transfer_account_id ?? null);
    setEditCategoryId(tx.category_id || "");
    setEditCategorySearch("");
    setEditMemo(tx.memo || "");
    const milli = tx.amount_milliunits;
    if (milli < 0) {
      setEditOutflow(
        formatMilliunits(Math.abs(milli), { displaySymbol: false }),
      );
      setEditInflow("");
    } else if (milli > 0) {
      setEditOutflow("");
      setEditInflow(
        formatMilliunits(milli, { displaySymbol: false }),
      );
    } else {
      setEditOutflow("");
      setEditInflow("");
    }
    setEditCleared((tx.cleared as EditableClearedStatus) || "UNCLEARED");
    setSelectedTxIds([tx.id]);
  };

  useEffect(() => {
    if (initialEditingTxId) {
      const tx = transactions.find((t) => t.id === initialEditingTxId);
      if (tx && tx.cleared !== "RECONCILED") {
        startEditingTransaction(tx);
      }
    }
  }, [initialEditingTxId]);

  const handleCancelEditTransaction = () => {
    setEditingTxId(null);
    setActivePopover(null);
    setEditCategorySearch("");
  };

  const handleSaveEditTransaction = async () => {
    if (!editingTxId) return;
    const originalTx = transactions.find((t) => t.id === editingTxId);
    if (!originalTx) return;

    setFormError(null);
    try {
      const payload = buildSaveTransactionPayload({
        accounts,
        accountId: editEffectiveSourceAccountId,
        date: editDate,
        payeeInput: editPayeeChoice,
        transferAccountId: editTransferAccountId,
        categoryId: editCategoryId || null,
        memo: editMemo,
        outflowInput: editOutflow,
        inflowInput: editInflow,
        cleared: editCleared,
      });

      await onUpdateTransaction(originalTx.id, payload, originalTx.date);
      setEditingTxId(null);
      setActivePopover(null);
      setEditCategorySearch("");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to update transaction",
      );
    }
  };

  const handleEditPayeeInputChange = (val: string) => {
    setEditPayeeChoice(val);
    const match = accounts.find(
      (a) =>
        !a.closed &&
        `Transfer : ${a.name}`.toLowerCase() === val.trim().toLowerCase(),
    );
    if (match) {
      setEditTransferAccountId(match.id);
    } else {
      setEditTransferAccountId(null);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSaveEditTransaction();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (activePopover) {
        setActivePopover(null);
      } else {
        handleCancelEditTransaction();
      }
    }
  };

  const handleRowDoubleClick = (e: React.MouseEvent, tx: Transaction) => {
    if (tx.cleared === "RECONCILED") return;
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("a") ||
      target.closest(".ynab-grid-cell-checkbox")
    ) {
      return;
    }
    startEditingTransaction(tx);
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

  const handleDuplicateSelected = async () => {
    setActiveActionBarPopover(null);
    const targets = filteredTransactions.filter((tx) => selectedSet.has(tx.id));
    for (const tx of targets) {
      await onCreateTransaction({
        account_id: tx.account_id,
        category_id: tx.category_id,
        payee_id: tx.payee_id,
        payee_name: tx.payee_name,
        date: tx.date,
        amount_milliunits: tx.amount_milliunits,
        memo: tx.memo,
        cleared: "UNCLEARED",
        approved: true,
        transfer_account_id: tx.transfer_account_id,
      });
    }
  };

  const nonInflowCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          !c.hidden &&
          !c.is_credit_card_payment &&
          !c.is_inflow_category &&
          !c.name.toLowerCase().includes("ready to assign"),
      ),
    [categories],
  );

  const displayCategoryGroups = useMemo(() => {
    if (categoryGroups && categoryGroups.length > 0) {
      return categoryGroups
        .filter((g) => !g.hidden)
        .map((g) => ({
          id: g.id,
          name: g.name,
          categories: nonInflowCategories.filter((c) => c.group_id === g.id),
        }))
        .filter((g) => g.categories.length > 0);
    }
    const map = new Map<string, Category[]>();
    for (const c of nonInflowCategories) {
      const list = map.get(c.group_id) ?? [];
      list.push(c);
      map.set(c.group_id, list);
    }
    return Array.from(map.entries()).map(([gid, cats]) => ({
      id: gid,
      name: cats[0]?.name ?? "Categories",
      categories: cats,
    }));
  }, [categoryGroups, nonInflowCategories]);

  const rtaCategory = useMemo(
    () =>
      categories.find(
        (c) =>
          c.is_inflow_category ||
          c.name.toLowerCase().includes("ready to assign"),
      ),
    [categories],
  );

  const activeCategories = useMemo(() => {
    if (!hoveredGroup) return [];
    if (hoveredGroup.id === "__inflow__") {
      const inflowCat = rtaCategory || categories.find((c) => c.is_inflow_category);
      return inflowCat ? [inflowCat] : [];
    }
    const grp = displayCategoryGroups.find((g) => g.id === hoveredGroup.id);
    return grp ? grp.categories : [];
  }, [hoveredGroup, rtaCategory, categories, displayCategoryGroups]);

  const handleBatchCategorize = async (catId: string | null) => {
    setActiveActionBarPopover(null);
    setHoveredGroup(null);
    const targets = filteredTransactions.filter(
      (tx) =>
        selectedSet.has(tx.id) &&
        tx.cleared !== "RECONCILED" &&
        !tx.transfer_account_id,
    );
    for (const tx of targets) {
      try {
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
      } catch {
        // Continue with subsequent targets
      }
    }
  };

  const handleBatchFlag = (color: FlagColor | null) => {
    const updated = setStoredBatchTransactionFlags(effectivePlanId, selectedTxIds, color);
    setFlags(updated);
    setActiveActionBarPopover(null);
  };

  const handleSetRowFlag = (txId: string, color: FlagColor | null) => {
    const updated = setStoredTransactionFlag(effectivePlanId, txId, color);
    setFlags(updated);
    setRowFlagPopover(null);
  };

  const handleRowSelectCategory = async (newCatId: string | null) => {
    if (!rowCategoryPopover) return;
    const tx = rowCategoryPopover.tx;
    setRowCategoryPopover(null);
    setRowCategorySearch("");
    try {
      await onUpdateTransaction(
        tx.id,
        {
          account_id: tx.account_id,
          category_id: newCatId,
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
    } catch {
      // Handled
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
        if (editingTxId) {
          setEditingTxId(null);
          setActivePopover(null);
          setEditCategorySearch("");
        } else if (showAddRow) {
          setShowAddRow(false);
          setActivePopover(null);
        } else if (activeActionBarPopover) {
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
  }, [selectedTxIds, filteredTransactions, editingTxId, showAddRow, activeActionBarPopover]);

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

  const handleApproveTransaction = async (tx: Transaction) => {
    if (tx.approved) return;
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
        cleared: tx.cleared === "RECONCILED" ? undefined : tx.cleared,
        approved: true,
        transfer_account_id: tx.transfer_account_id,
      },
      tx.date,
    );
  };

  const handleApproveSelected = async () => {
    setActiveActionBarPopover(null);
    const targets = filteredTransactions.filter(
      (tx) => selectedSet.has(tx.id) && !tx.approved,
    );
    for (const tx of targets) {
      await handleApproveTransaction(tx);
    }
  };

  const customGridTemplate = useMemo(() => {
    const cols: string[] = ["32px"]; // checkbox
    if (hasNotifications) cols.push("24px");
    if (viewOptions.showFlags) cols.push("28px");
    if (accountId === null) cols.push("minmax(105px, 1.2fr)"); // accountName
    cols.push("115px"); // date
    cols.push(accountId === null ? "minmax(130px, 1.5fr)" : "minmax(140px, 1.6fr)"); // payee
    cols.push(accountId === null ? "minmax(150px, 1.8fr)" : "minmax(160px, 1.9fr)"); // category
    cols.push(accountId === null ? "minmax(110px, 1.2fr)" : "minmax(120px, 1.3fr)"); // memo
    cols.push("minmax(115px, 1.1fr)"); // outflow
    cols.push("minmax(115px, 1.1fr)"); // inflow
    cols.push("36px"); // cleared
    cols.push("50px"); // actions
    return cols.join(" ");
  }, [hasNotifications, viewOptions.showFlags, accountId]);

  return (
    <div
      className={`register-flex-columns ${hasNotifications ? "has-notification" : ""}`}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        backgroundColor: "var(--backgroundPrimary)",
      }}
    >
      {hasNotifications && (
        <div className="accounts-notification">
          <div
            className="accounts-notification-item accounts-notification-item-approval-or-category"
            onClick={() => {
              const unapprovedIds = unapprovedTransactions.map((tx) => tx.id);
              setSelectedTxIds(unapprovedIds);
            }}
          >
            <YnabIcon name="info_circle_fill" size={16} />
            <span>
              {unapprovedTransactions.length} new{" "}
              {unapprovedTransactions.length === 1
                ? "transaction"
                : "transactions"}{" "}
              to approve or categorize.
            </span>
            <button
              type="button"
              className="button button-primary"
              onClick={(e) => {
                e.stopPropagation();
                const unapprovedIds = unapprovedTransactions.map((tx) => tx.id);
                setSelectedTxIds(unapprovedIds);
              }}
            >
              View
            </button>
          </div>
        </div>
      )}
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
              setEditingTxId(null);
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
          <button
            ref={viewOptionsBtnRef}
            className={`ghost-button primary is-dropdown type-body accounts-toolbar-view-options ${
              isViewOptionsOpen ? "is-active" : ""
            }`}
            type="button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setViewOptionsAnchor({
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              });
              setIsViewOptionsOpen((prev) => !prev);
            }}
          >
            View
            <YnabIcon name="caret_down" size={8} />
          </button>

          <TransactionSearchBar
            accountName={currentAccount ? currentAccount.name : "All Accounts"}
            activeFilter={activeSearchFilter}
            onFilterChange={setActiveSearchFilter}
            categories={categories}
            payees={payees}
          />
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
          style={{ "--grid-template-register": customGridTemplate } as React.CSSProperties}
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
            {hasNotifications && (
              <div
                className="ynab-grid-header-cell js-ynab-grid-header-cell ynab-grid-cell-notification"
                data-column="notification"
              >
                <div className="ynab-grid-header-column-sort-area">
                  <span className="icon-wrapper">
                    <YnabIcon name="info_circle_fill" size={14} />
                  </span>
                </div>
              </div>
            )}
            {viewOptions.showFlags && (
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
            )}
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

                  {hasNotifications && (
                    <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-notification" />
                  )}

                  {viewOptions.showFlags && (
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
                  )}

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
                          appearance: "none",
                          WebkitAppearance: "none",
                          MozAppearance: "none",
                          cursor: "pointer",
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
                    onClick={() => openDatePicker()}
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
                      onFocus={() => openDatePicker()}
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
                    onClick={() => openPayeeDropdown()}
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
                      onFocus={() => openPayeeDropdown()}
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
                    onClick={categoryDisabled ? undefined : () => openCategoryDropdown()}
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
                      onFocus={categoryDisabled ? undefined : () => openCategoryDropdown()}
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

                if (editingTxId === tx.id) {
                  return (
                    <React.Fragment key={tx.id}>
                      <div
                        className="ynab-grid-body-row is-editing is-checked"
                        style={{ cursor: "default" }}
                      >
                        <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-checkbox">
                          <button
                            className="ynab-checkbox ynab-checkbox-button is-checked"
                            role="checkbox"
                            aria-checked="true"
                            aria-label="This transaction"
                            type="button"
                          >
                            <YnabIcon
                              name="check"
                              size={13}
                              className="ynab-checkbox-button-square is-checked"
                            />
                          </button>
                        </div>

                        {hasNotifications && (
                          <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-notification" />
                        )}

                        {viewOptions.showFlags && (
                          <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-flag">
                            {(() => {
                              const flagColor =
                                flags[tx.id] || (tx.flag_color as FlagColor) || null;
                              return (
                                <button
                                  aria-label={flagColor ? `Flag ${flagColor}` : "Flag"}
                                  className={`ynab-flag-pill ${
                                    flagColor
                                      ? `ynab-flag-pill-${flagColor.toLowerCase()}`
                                      : "ynab-flag-pill-none"
                                  } ynab-flag-icon-only`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setRowFlagPopover({
                                      txId: tx.id,
                                      top: rect.bottom + 6,
                                      left: Math.max(16, rect.left - 10),
                                    });
                                  }}
                                >
                                  <span className="flag-pill-icon-container">
                                    <YnabIcon
                                      name={flagColor ? "flag_fill" : "flag"}
                                      size={14}
                                      className={
                                        flagColor
                                          ? `flag-pill-icon-${flagColor.toLowerCase()}`
                                          : "flag-pill-icon-none"
                                      }
                                    />
                                  </span>
                                </button>
                              );
                            })()}
                          </div>
                        )}

                        {accountId === null && (
                          <div
                            className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-accountName user-data"
                            style={{ position: "relative" }}
                          >
                            <select
                              aria-label="Transaction Account"
                              value={editAccountId}
                              onChange={(e) => setEditAccountId(e.target.value)}
                              className="accounts-text-field dropdown-text-field ember-text-field"
                              style={{
                                height: "28px",
                                fontSize: "0.82rem",
                                width: "100%",
                                paddingRight: "1.5rem",
                                appearance: "none",
                                WebkitAppearance: "none",
                                MozAppearance: "none",
                                cursor: "pointer",
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
                          className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-date user-data"
                          style={{ position: "relative" }}
                          onClick={(e) => openDatePicker(e.currentTarget)}
                        >
                          <input
                            aria-label="Date"
                            className="ember-text-field ember-view accounts-text-field dropdown-text-field"
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="date"
                            type="text"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            onFocus={(e) =>
                              openDatePicker(e.currentTarget.closest(".ynab-grid-cell"))
                            }
                            onKeyDown={handleEditKeyDown}
                            style={{ height: "28px", fontSize: "0.82rem", width: "100%" }}
                          />
                          <svg
                            className="ynab-new-icon accounts-text-field-dropdown-icon"
                            width="8"
                            height="8"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDatePicker(e.currentTarget.closest(".ynab-grid-cell"));
                            }}
                          >
                            <use href="#icon_sprite_caret_down" />
                          </svg>
                        </div>

                        <div
                          className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-payeeName user-data"
                          style={{ position: "relative" }}
                          onClick={(e) => openPayeeDropdown(e.currentTarget)}
                        >
                          <input
                            aria-label="Payee"
                            className="accounts-text-field dropdown-text-field ember-text-field"
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="payee"
                            type="text"
                            value={
                              editTransferAccountId
                                ? `Transfer : ${accountNameById.get(editTransferAccountId) ?? ""}`
                                : editPayeeChoice
                            }
                            onChange={(e) => {
                              handleEditPayeeInputChange(e.target.value);
                              openPayeeDropdown(e.currentTarget.closest(".ynab-grid-cell"));
                            }}
                            onFocus={(e) =>
                              openPayeeDropdown(e.currentTarget.closest(".ynab-grid-cell"))
                            }
                            onKeyDown={handleEditKeyDown}
                            style={{ height: "28px", fontSize: "0.82rem", width: "100%" }}
                          />
                          <svg
                            className="ynab-new-icon accounts-text-field-dropdown-icon"
                            width="8"
                            height="8"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPayeeDropdown(e.currentTarget.closest(".ynab-grid-cell"));
                            }}
                          >
                            <use href="#icon_sprite_caret_down" />
                          </svg>
                        </div>

                        <div
                          className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-subCategoryName user-data"
                          style={{ position: "relative" }}
                          onClick={(e) =>
                            editCategoryDisabled
                              ? undefined
                              : openCategoryDropdown(e.currentTarget)
                          }
                        >
                          <input
                            aria-label="Category"
                            className="accounts-text-field dropdown-text-field ember-text-field"
                            autoComplete="off"
                            spellCheck={false}
                            disabled={editCategoryDisabled}
                            placeholder={
                              editCategoryDisabled ? "Category not needed" : "category"
                            }
                            type="text"
                            value={
                              editCategoryDisabled
                                ? "Category not needed"
                                : (categoryNameById.get(editCategoryId) ?? editCategorySearch)
                            }
                            onChange={(e) => {
                              setEditCategorySearch(e.target.value);
                              openCategoryDropdown(e.currentTarget.closest(".ynab-grid-cell"));
                            }}
                            onFocus={(e) =>
                              editCategoryDisabled
                                ? undefined
                                : openCategoryDropdown(e.currentTarget.closest(".ynab-grid-cell"))
                            }
                            onKeyDown={handleEditKeyDown}
                            style={{
                              height: "28px",
                              fontSize: "0.82rem",
                              width: "100%",
                              backgroundColor: editCategoryDisabled
                                ? "var(--backgroundTertiary)"
                                : "var(--backgroundPrimary)",
                              cursor: editCategoryDisabled ? "not-allowed" : "text",
                            }}
                          />
                          {!editCategoryDisabled && (
                            <svg
                              className="ynab-new-icon accounts-text-field-dropdown-icon"
                              width="8"
                              height="8"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCategoryDropdown(e.currentTarget.closest(".ynab-grid-cell"));
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
                            value={editMemo}
                            onChange={(e) => setEditMemo(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            className="ember-text-field ember-view accounts-text-field"
                            style={{ height: "28px", fontSize: "0.82rem", width: "100%" }}
                          />
                        </div>

                        <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-outflow user-data">
                          <div className="ynab-new-currency-input is-editing">
                            <div className="input-wrapper">
                              <input
                                type="text"
                                placeholder="outflow"
                                value={editOutflow}
                                onChange={(e) => {
                                  setEditOutflow(e.target.value);
                                  if (e.target.value) setEditInflow("");
                                }}
                                onKeyDown={handleEditKeyDown}
                                className="ember-text-field ember-view tabular-nums"
                                style={{
                                  height: "28px",
                                  fontSize: "0.82rem",
                                  width: "100%",
                                  textAlign: "right",
                                }}
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
                                value={editInflow}
                                onChange={(e) => {
                                  setEditInflow(e.target.value);
                                  if (e.target.value) setEditOutflow("");
                                }}
                                onKeyDown={handleEditKeyDown}
                                className="ember-text-field ember-view tabular-nums"
                                style={{
                                  height: "28px",
                                  fontSize: "0.82rem",
                                  width: "100%",
                                  textAlign: "right",
                                }}
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
                            className={`ynab-cleared ${
                              editCleared === "CLEARED" ? "is-cleared" : "is-uncleared"
                            }`}
                            aria-label={`This transaction is ${
                              editCleared === "CLEARED" ? "cleared" : "not cleared"
                            }`}
                            onClick={() =>
                              setEditCleared((prev) =>
                                prev === "CLEARED" ? "UNCLEARED" : "CLEARED",
                              )
                            }
                          >
                            <YnabIcon
                              name={
                                editCleared === "CLEARED"
                                  ? "cleared_circle_fill"
                                  : "cleared_circle"
                              }
                              size={12}
                              className={
                                editCleared === "CLEARED"
                                  ? "is-cleared-icon"
                                  : "is-uncleared-icon"
                              }
                            />
                          </button>
                        </div>

                        <div className="ynab-grid-cell js-ynab-grid-cell ynab-grid-cell-actions">&nbsp;</div>
                      </div>

                      <div className="ynab-grid-actions">
                        <div className="buttons-container">
                          <div className="ynab-grid-actions-buttons">
                            <button
                              type="button"
                              className="button button-cancel"
                              onClick={handleCancelEditTransaction}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="button button-primary"
                              onClick={() => void handleSaveEditTransaction()}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                }

                return (
                  <div
                    key={tx.id}
                    onClick={(e) => handleRowClick(e, tx.id)}
                    onDoubleClick={(e) => handleRowDoubleClick(e, tx)}
                    className={`ynab-grid-body-row ynab-grid-body-parent ${
                      isSelected ? "is-checked" : ""
                    } ${isLocked ? "is-reconciled" : ""} ${
                      !tx.approved ? "needs-approved" : ""
                    }`}
                    style={{ cursor: isLocked ? "default" : "pointer" }}
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

                    {hasNotifications && (
                      <div className="ynab-grid-cell ynab-grid-cell-notification">
                        {!tx.approved ? (
                          <button
                            className="transaction-notification"
                            aria-label="This transaction needs approval"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleApproveTransaction(tx);
                            }}
                          >
                            <YnabIcon
                              name="info_circle_fill"
                              size={14}
                              className="transaction-notification-info"
                            />
                          </button>
                        ) : !tx.category_id && !tx.transfer_account_id ? (
                          <button
                            className="transaction-notification"
                            aria-label="This transaction needs a category"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setRowCategoryPopover({
                                tx,
                                anchor: { top: rect.bottom + 6, left: rect.left },
                              });
                            }}
                          >
                            <YnabIcon
                              name="info_circle_fill"
                              size={14}
                              className="transaction-notification-warning"
                            />
                          </button>
                        ) : null}
                      </div>
                    )}

                    {viewOptions.showFlags && (
                      <div className="ynab-grid-cell ynab-grid-cell-flag">
                        {(() => {
                          const flagColor = flags[tx.id] || (tx.flag_color as FlagColor) || null;
                          return (
                            <button
                              aria-label={flagColor ? `Flag ${flagColor}` : "Flag"}
                              className={`ynab-flag-pill ${
                                flagColor
                                  ? `ynab-flag-pill-${flagColor.toLowerCase()}`
                                  : "ynab-flag-pill-none"
                              } ynab-flag-icon-only`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setRowFlagPopover({
                                  txId: tx.id,
                                  top: rect.bottom + 6,
                                  left: Math.max(16, rect.left - 10),
                                });
                              }}
                            >
                              <span className="flag-pill-icon-container">
                                <YnabIcon
                                  name={flagColor ? "flag_fill" : "flag"}
                                  size={14}
                                  className={
                                    flagColor
                                      ? `flag-pill-icon-${flagColor.toLowerCase()}`
                                      : "flag-pill-icon-none"
                                  }
                                />
                              </span>
                            </button>
                          );
                        })()}
                      </div>
                    )}

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

                    <div
                      className={`ynab-grid-cell ynab-grid-cell-subCategoryName user-data ${
                        !tx.transfer_account_id ? "is-interactive" : ""
                      }`}
                      title={
                        tx.transfer_account_id
                          ? "Category not needed for transfers"
                          : "Click to change category"
                      }
                      onClick={
                        tx.transfer_account_id
                          ? undefined
                          : (e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setRowCategoryPopover({
                                tx,
                                anchor: {
                                  top: rect.top,
                                  bottom: rect.bottom,
                                  left: rect.left,
                                  width: rect.width,
                                  height: rect.height,
                                },
                              });
                              setRowCategorySearch("");
                            }
                      }
                    >
                      {tx.category_id ? (
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {categoryNameById.get(tx.category_id) ?? "Unknown"}
                        </span>
                      ) : tx.transfer_account_id ? (
                        <span style={{ color: "var(--labelTertiary)" }}>Category not needed</span>
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
                          }}
                        >
                          <YnabIcon name="lock" size={14} className="is-reconciled-icon" />
                        </span>
                      ) : (
                        <button
                          className={`ynab-cleared ${
                            tx.cleared === "CLEARED" ? "is-cleared" : "is-uncleared"
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
                            className={
                              tx.cleared === "CLEARED"
                                ? "is-cleared-icon"
                                : "is-uncleared-icon"
                            }
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

      {/* Popovers for Date, Payee, and Category in Add/Edit Transaction */}
      <TransactionDatePickerPopover
        isOpen={activePopover === "date"}
        selectedDate={editingTxId ? editDate : draftDate}
        anchorPosition={popoverAnchor}
        onSelectDate={(newDate) => {
          if (editingTxId) {
            setEditDate(newDate);
          } else {
            setDraftDate(newDate);
          }
          setActivePopover(null);
        }}
        onClose={() => setActivePopover(null)}
      />

      <PayeeDropdownPopover
        isOpen={activePopover === "payee"}
        currentPayee={editingTxId ? editPayeeChoice : draftPayeeChoice}
        transferAccountId={editingTxId ? editTransferAccountId : draftTransferAccountId}
        accounts={accounts}
        currentAccountId={editingTxId ? editEffectiveSourceAccountId : effectiveSourceAccountId}
        payees={payees}
        searchQuery={editingTxId ? editPayeeChoice : draftPayeeChoice}
        anchorPosition={popoverAnchor}
        onSelectPayee={(payeeName, transferId) => {
          if (editingTxId) {
            setEditPayeeChoice(payeeName);
            setEditTransferAccountId(transferId);
          } else {
            setDraftPayeeChoice(payeeName);
            setDraftTransferAccountId(transferId);
          }
          setActivePopover(null);
        }}
        onClose={() => setActivePopover(null)}
      />

      <CategoryDropdownPopover
        isOpen={
          activePopover === "category" &&
          !(editingTxId ? editCategoryDisabled : categoryDisabled)
        }
        selectedCategoryId={editingTxId ? editCategoryId : draftCategoryId}
        categories={categories}
        categoryGroups={categoryGroups}
        monthlyBudgets={monthlyBudgets}
        searchQuery={editingTxId ? editCategorySearch : draftCategorySearch}
        anchorPosition={popoverAnchor}
        onSelectCategory={(catId) => {
          if (editingTxId) {
            setEditCategoryId(catId ?? "");
            setEditCategorySearch("");
          } else {
            setDraftCategoryId(catId ?? "");
            setDraftCategorySearch("");
          }
          setActivePopover(null);
        }}
        onOpenAddCategory={onOpenAddCategory}
        onClose={() => {
          setActivePopover(null);
          if (editingTxId) {
            setEditCategorySearch("");
          } else {
            setDraftCategorySearch("");
          }
        }}
      />

      {/* Floating Register Action Bar (authentic scraped YNAB register-action-bar) */}
      {selectedTxIds.length > 0 && (
        <div className="register-action-bar-container show">
          <div ref={actionBarInnerRef} className="register-action-bar-inner show">
            {/* 1. Uncheck / Selected count button */}
            <button
              className="ghost-button contrast type-body action-bar-button action-bar-uncheck-button"
              type="button"
              aria-label="Close"
              title="Deselect all (Esc)"
              onClick={() => {
                setSelectedTxIds([]);
                setLastSelectedTxId(null);
                setActiveActionBarPopover(null);
              }}
            >
              <YnabIcon name="close" size={8} />
              {selectedTxIds.length}{" "}
              {selectedTxIds.length === 1 ? "Transaction" : "Transactions"}
            </button>

            <hr />

            {/* 2. Categorize Button */}
            <button
              ref={categorizeBtnRef}
              type="button"
              className={`ghost-button contrast type-body action-bar-button js-action-bar-categories-menu-button tooltip-relative-container ${
                activeActionBarPopover === "categorize" ? "active" : ""
              }`}
              onClick={() => {
                setActiveActionBarPopover((prev) =>
                  prev === "categorize" ? null : "categorize",
                );
                setHoveredGroup(null);
              }}
            >
              <YnabIcon name="checkmark_inbox" size={12} />
              Categorize
            </button>

            {hasSelectedUnapproved && (
              <button
                type="button"
                className="ghost-button contrast type-body action-bar-button"
                onClick={() => void handleApproveSelected()}
              >
                <YnabIcon name="check" size={12} />
                Approve
              </button>
            )}

            {/* 3. Flag Button */}
            <button
              ref={flagBtnRef}
              type="button"
              className={`ghost-button contrast type-body action-bar-button js-action-bar-flags-menu-button tooltip-relative-container ${
                activeActionBarPopover === "flag" ? "active" : ""
              }`}
              onClick={() => {
                setActiveActionBarPopover((prev) =>
                  prev === "flag" ? null : "flag",
                );
              }}
            >
              <YnabIcon name="flag_fill" size={12} />
              Flag
            </button>

            <hr />

            {/* 4. More Button */}
            <button
              ref={moreBtnRef}
              type="button"
              className={`ghost-button contrast type-body action-bar-button js-action-bar-more-menu-button ${
                activeActionBarPopover === "more" ? "active" : ""
              }`}
              onClick={() => {
                setActiveActionBarPopover((prev) =>
                  prev === "more" ? null : "more",
                );
              }}
            >
              <YnabIcon name="more_horizontal" size={12} />
              More
            </button>
          </div>
        </div>
      )}

      {/* Popovers anchored to Action Bar buttons */}
      {selectedTxIds.length > 0 && activeActionBarPopover && popoverPos && (
        <div
          className={`modal-overlay active ynab-u modal-popup ${
            activeActionBarPopover === "flag"
              ? "modal-account-flags"
              : "modal-account-register-action-bar"
          }`}
          onClick={() => {
            setActiveActionBarPopover(null);
            setHoveredGroup(null);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              bottom: `${popoverPos.bottom}px`,
              left: `${popoverPos.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => {
              if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
            }}
            onMouseLeave={() => {
              closeTimeoutRef.current = window.setTimeout(() => {
                setHoveredGroup(null);
              }, 250);
            }}
          >
            {/* Categorize Popover */}
            {activeActionBarPopover === "categorize" && (
              <ul
                role="menu"
                className="modal-list action-bar-menu"
                style={{ maxHeight: "calc(-130px + 100vh)" }}
              >
                {/* Inflow */}
                <li
                  role="presentation"
                  data-list="subcategories-menu-Category/__ImmediateIncome__"
                  onMouseEnter={(e) => {
                    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredGroup({
                      id: "__inflow__",
                      bottom: window.innerHeight - rect.bottom,
                    });
                  }}
                >
                  <button
                    role="menuitem"
                    className={`button-list ${
                      hoveredGroup?.id === "__inflow__" ? "is-active" : ""
                    }`}
                    type="button"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredGroup((prev) =>
                        prev?.id === "__inflow__"
                          ? null
                          : { id: "__inflow__", bottom: window.innerHeight - rect.bottom },
                      );
                    }}
                  >
                    Inflow
                    <YnabIcon
                      name="chevron_right"
                      size={12}
                      className="menu-disclosure"
                    />
                  </button>
                </li>

                {/* Category Groups */}
                {displayCategoryGroups.map((g) => (
                  <li
                    key={g.id}
                    role="presentation"
                    data-list={`subcategories-menu-${g.id}`}
                    onMouseEnter={(e) => {
                      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredGroup({
                        id: g.id,
                        bottom: window.innerHeight - rect.bottom,
                      });
                    }}
                  >
                    <button
                      role="menuitem"
                      className={`button-list ${
                        hoveredGroup?.id === g.id ? "is-active" : ""
                      }`}
                      type="button"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredGroup((prev) =>
                          prev?.id === g.id
                            ? null
                            : { id: g.id, bottom: window.innerHeight - rect.bottom },
                        );
                      }}
                    >
                      {g.name}
                      <YnabIcon
                        name="chevron_right"
                        size={12}
                        className="menu-disclosure"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Flag Popover */}
            {activeActionBarPopover === "flag" && (
              <ul className="flags-list">
                {FLAG_OPTIONS.map((f) => (
                  <li key={f.name}>
                    <button
                      aria-label={f.name}
                      className="ynab-flag-pill"
                      type="button"
                      onClick={() => {
                        handleBatchFlag(f.color);
                      }}
                    >
                      <span className="flag-pill-icon-container">
                        <YnabIcon
                          name="flag_fill"
                          size={16}
                          className={`flag-pill-icon-${f.name.toLowerCase()}`}
                        />
                      </span>
                      <span className="label">{f.name}</span>
                    </button>
                    <div className="shortcut-keys">
                      <div className="shortcut-key">{f.key}</div>
                    </div>
                  </li>
                ))}
                <hr />
                <li>
                  <button
                    className="button edit-flags"
                    type="button"
                    onClick={() => handleBatchFlag(null)}
                  >
                    Clear Flag
                  </button>
                </li>
              </ul>
            )}

            {/* More Popover */}
            {activeActionBarPopover === "more" && (
              <ul
                role="menu"
                className="modal-list"
                style={{ maxHeight: "calc(-130px + 100vh)" }}
              >
                {hasSelectedUnapproved && (
                  <>
                    <li>
                      <button
                        className="button-list"
                        type="button"
                        onClick={() => void handleApproveSelected()}
                      >
                        <YnabIcon name="check" size={16} />
                        Approve
                      </button>
                    </li>
                    <li>
                      <hr />
                    </li>
                  </>
                )}
                <li>
                  <button
                    className="button-list"
                    type="button"
                    onClick={() => void handleDuplicateSelected()}
                  >
                    <YnabIcon name="document_on_document_fill" size={16} />
                    Duplicate
                    <div className="shortcut-keys float-right">
                      <div className="shortcut-key">shift</div>
                      <div className="shortcut-key">D</div>
                    </div>
                  </button>
                </li>
                <li>
                  <hr />
                </li>
                <li>
                  <button
                    className="button-list"
                    type="button"
                    onClick={() =>
                      void handleSetClearedForSelected("CLEARED")
                    }
                  >
                    <YnabIcon name="cleared_circle_fill" size={16} />
                    Mark as Cleared
                  </button>
                </li>
                <li>
                  <button
                    className="button-list"
                    type="button"
                    onClick={() =>
                      void handleSetClearedForSelected("UNCLEARED")
                    }
                  >
                    <YnabIcon name="cleared_circle" size={16} />
                    Mark as Uncleared
                  </button>
                </li>
                <li>
                  <hr />
                </li>
                <li>
                  <button
                    className="button-list modal-account-edit-transaction-delete"
                    type="button"
                    onClick={() =>
                      void handleDeleteSelectedTransactions()
                    }
                  >
                    <YnabIcon name="trash_can" size={16} />
                    Delete
                    <div className="shortcut-keys float-right">
                      <div className="shortcut-key">delete</div>
                    </div>
                  </button>
                </li>
              </ul>
            )}

            {/* Modal Arrow pointing down to the anchor button */}
            <svg
              className="modal-arrow"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                top: "100%",
                left: `${popoverPos.arrowLeft}px`,
                transform: "translateX(-50%)",
                height: "0.9375rem",
                width: "1.875rem",
              }}
            >
              <path
                d="M 0 100 L 50 0 L 100 100 L 0 100 Z"
                transform="rotate(180 50 50)"
                fill="var(--backgroundPrimaryElevated, #ffffff)"
              />
            </svg>
          </div>

          {/* Separate Subcategories Modal */}
          {activeActionBarPopover === "categorize" && hoveredGroup && activeCategories.length > 0 && (
            <div
              className="modal modal-account-edit-subcategories"
              role="dialog"
              aria-modal="true"
              style={{
                position: "fixed",
                bottom: `${Math.max(12, Math.min(window.innerHeight - 100, hoveredGroup.bottom - 4))}px`,
                left: `${
                  popoverPos.left + 232 + 232 + 12 <= window.innerWidth
                    ? popoverPos.left + 230
                    : popoverPos.left - 230
                }px`,
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => {
                if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
              }}
              onMouseLeave={() => {
                closeTimeoutRef.current = window.setTimeout(() => {
                  setHoveredGroup(null);
                }, 400);
              }}
            >
              <ul
                role="menu"
                className="modal-list"
                style={{ maxHeight: "calc(-130px + 100vh)", margin: 0, padding: "0.25rem" }}
              >
                {activeCategories.map((cat, idx) => (
                  <li key={cat.id ?? `cat-${idx}`} role="presentation">
                    <button
                      role="menuitem"
                      className="button-list"
                      type="button"
                      onClick={() => {
                        void handleBatchCategorize(cat.id);
                        setActiveActionBarPopover(null);
                        setHoveredGroup(null);
                      }}
                    >
                      {cat.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Row Flag Popover */}
      {rowFlagPopover && (
        <div
          className="modal-overlay active ynab-u modal-popup modal-account-flags"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10006,
            backgroundColor: "transparent",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
          }}
          onClick={() => setRowFlagPopover(null)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              top: `${rowFlagPopover.top}px`,
              left: `${rowFlagPopover.left}px`,
              minWidth: "272px",
              zIndex: 10007,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ul className="flags-list">
              {FLAG_OPTIONS.map((f) => (
                <li key={f.name}>
                  <button
                    aria-label={f.name}
                    className="ynab-flag-pill"
                    type="button"
                    onClick={() => {
                      handleSetRowFlag(rowFlagPopover.txId, f.color);
                    }}
                  >
                    <span className="flag-pill-icon-container">
                      <YnabIcon
                        name="flag_fill"
                        size={16}
                        className={`flag-pill-icon-${f.name.toLowerCase()}`}
                      />
                    </span>
                    <span className="label">{f.name}</span>
                  </button>
                  <div className="shortcut-keys">
                    <div className="shortcut-key">{f.key}</div>
                  </div>
                </li>
              ))}
              <hr />
              <li>
                <button
                  className="button edit-flags"
                  type="button"
                  onClick={() => {
                    handleSetRowFlag(rowFlagPopover.txId, null);
                  }}
                >
                  Clear Flag
                </button>
              </li>
            </ul>
            <svg
              className="modal-arrow"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                bottom: "100%",
                left: "20px",
                height: "0.9375rem",
                width: "1.875rem",
              }}
            >
              <path
                d="M 0 100 L 50 0 L 100 100 L 0 100 Z"
                fill="var(--backgroundPrimaryElevated, #ffffff)"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Row Category Popover */}
      {rowCategoryPopover && (
        <CategoryDropdownPopover
          isOpen={true}
          anchorPosition={rowCategoryPopover.anchor}
          categories={categories}
          categoryGroups={categoryGroups}
          monthlyBudgets={monthlyBudgets}
          selectedCategoryId={rowCategoryPopover.tx.category_id ?? null}
          searchQuery={rowCategorySearch}
          onSelectCategory={(newCatId) => {
            void handleRowSelectCategory(newCatId);
          }}
          onOpenAddCategory={onOpenAddCategory}
          onClose={() => {
            setRowCategoryPopover(null);
            setRowCategorySearch("");
          }}
        />
      )}

      {/* View Options Modal */}
      <ViewOptionsModal
        isOpen={isViewOptionsOpen}
        anchorPosition={viewOptionsAnchor}
        currentOptions={viewOptions}
        onApply={(opts) => setViewOptions(opts)}
        onClose={() => setIsViewOptionsOpen(false)}
      />
    </div>
  );
}
