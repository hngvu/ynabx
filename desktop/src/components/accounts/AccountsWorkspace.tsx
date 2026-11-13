import React, { useState, useMemo, useEffect, useRef } from 'react';
import './accounts.css';
import { AccountItem } from '../sidebar/NavAccountRow';
import { MasterCategoryGroup } from '../budget/budgetData';
import { INITIAL_TRANSACTIONS, TransactionItem } from './accountData';
import { getTransactions, saveTransaction, reconcileAccount } from '../../api/tauriBridge';
import { AccountsHeader } from './AccountsHeader';
import { AccountsToolbar } from './AccountsToolbar';
import { RegisterGridHeader } from './RegisterGridHeader';
import { RegisterGridRow } from './RegisterGridRow';
import { RegisterGridEditRow } from './RegisterGridEditRow';
import { RegisterActionBar } from './RegisterActionBar';
import { FlagPickerPopover } from './FlagPickerPopover';
import { ActionBarCategorizePopover } from './ActionBarCategorizePopover';
import { ViewOptionsPopover, ViewFilterOptions } from './ViewOptionsPopover';
import { ReconcileWizardModal } from './ReconcileWizardModal';
import {
  KeyboardShortcut,
  keyboardShortcutsService,
  KBShortcutResult,
} from '../../services/keyboardShortcuts';

export interface AccountsWorkspaceProps {
  selectedAccountId?: string | null;
  accounts: AccountItem[];
  categoryGroups: MasterCategoryGroup[];
  onOpenEditAccount?: (account: AccountItem) => void;
}

const DEFAULT_VIEW_FILTERS: ViewFilterOptions = {
  selectedRange: 'alldates',
  fromMonth: 0,
  fromYear: 2026,
  toMonth: 11,
  toYear: 2026,
  showReconciled: true,
  showScheduled: true,
  showRunningBalance: false,
  showFlags: true,
  showImages: true,
};

export function AccountsWorkspace({
  selectedAccountId,
  accounts,
  categoryGroups,
  onOpenEditAccount,
}: AccountsWorkspaceProps) {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());

  // Load transactions from Tauri SQLite
  useEffect(() => {
    async function fetchTx() {
      try {
        const txs = await getTransactions(selectedAccountId || undefined);
        setTransactions(txs);
      } catch (err) {
        console.error('Failed to load transactions via Tauri:', err);
      }
    }
    fetchTx();
  }, [selectedAccountId]);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [isAddingTransaction, setIsAddingTransaction] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [reconcileWizardOpen, setReconcileWizardOpen] = useState(false);
  const [isAdjustmentMode, setIsAdjustmentMode] = useState(false);
  const [statementBalanceMilliunits, setStatementBalanceMilliunits] = useState(0);
  
  // View options popover state
  // Key for view options preferences in localStorage matching Ember: `view_menu_show_columns_key_<accountId>`
  const viewOptionsStorageKey = `view_menu_show_columns_key_${selectedAccountId || 'all_accounts'}`;

  const [viewFilters, setViewFilters] = useState<ViewFilterOptions>(() => {
    try {
      const stored = localStorage.getItem(viewOptionsStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_VIEW_FILTERS,
          showRunningBalance: parsed.balance ?? false,
          showFlags: parsed.flag ?? true,
          showImages: parsed.image ?? true,
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_VIEW_FILTERS;
  });

  const [viewOptionsState, setViewOptionsState] = useState<{
    isOpen: boolean;
    triggerRect: DOMRect | null;
  }>({ isOpen: false, triggerRect: null });

  // Update viewFilters when selected account changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(viewOptionsStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setViewFilters((prev) => ({
          ...prev,
          showRunningBalance: parsed.balance ?? false,
          showFlags: parsed.flag ?? true,
          showImages: parsed.image ?? true,
        }));
      }
    } catch {
      // ignore
    }
  }, [viewOptionsStorageKey]);

  // Flag picker state
  const [flagPickerState, setFlagPickerState] = useState<{
    isOpen: boolean;
    txId: string | null;
    isBulk?: boolean;
    triggerRect: DOMRect | null;
  }>({ isOpen: false, txId: null, triggerRect: null });

  // Bulk category picker state
  const [bulkCategoryPickerState, setBulkCategoryPickerState] = useState<{
    isOpen: boolean;
    triggerRect: DOMRect | null;
  }>({ isOpen: false, triggerRect: null });

  // Ember YNAB column sizing constants
  const AQ = 36; // Ember AQ min width limit (36px)
  const FIXED_COLUMNS = ['checkbox', 'notification', 'cleared'];

  // Sorting state matching Ember registerSortService: [{ property: 'date', sortAscending: false }]
  const sortFieldsStorageKey = `${selectedAccountId || 'all_accounts'}_sortFields`;
  const [sortFields, setSortFields] = useState<Array<{ property: string; sortAscending: boolean }>>(() => {
    try {
      const stored = localStorage.getItem(sortFieldsStorageKey);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [{ property: 'date', sortAscending: false }];
  });

  // Re-read sortFields when account changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(sortFieldsStorageKey);
      if (stored) {
        setSortFields(JSON.parse(stored));
      } else {
        setSortFields([{ property: 'date', sortAscending: false }]);
      }
    } catch {
      setSortFields([{ property: 'date', sortAscending: false }]);
    }
  }, [sortFieldsStorageKey]);

  const handleSortColumn = (column: string) => {
    if (column === 'checkbox' || column === 'notification') return;

    setSortFields((prev) => {
      const primary = prev[0];
      let newFields: Array<{ property: string; sortAscending: boolean }>;

      if (primary && primary.property === column) {
        // Toggle direction
        newFields = [{ property: column, sortAscending: !primary.sortAscending }, ...prev.slice(1)];
      } else {
        // Move to primary sort, default descending for date, ascending for text
        const existing = prev.find((s) => s.property === column);
        const remaining = prev.filter((s) => s.property !== column);
        const sortAscending = existing ? !existing.sortAscending : column === 'date' ? false : true;
        newFields = [{ property: column, sortAscending }, ...remaining];
      }

      try {
        localStorage.setItem(sortFieldsStorageKey, JSON.stringify(newFields));
      } catch {
        // ignore
      }
      return newFields;
    });
  };

  // Current active account save key for column sizes
  const saveColumnSizesKey = `register_column_size_${selectedAccountId || 'all_accounts'}`;

  // Stored column percentage widths matching Ember registerGridService
  const [columnPercentages, setColumnPercentages] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(saveColumnSizesKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Re-read column sizes when account selection changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(saveColumnSizesKey);
      setColumnPercentages(stored ? JSON.parse(stored) : {});
    } catch {
      setColumnPercentages({});
    }
  }, [saveColumnSizesKey]);

  // Ember YNAB Ghost Resize Handle state
  const [resizeIndicator, setResizeIndicator] = useState<{
    show: boolean;
    left: number;
    top: number;
    height: number;
  }>({ show: false, left: 0, top: 0, height: 0 });

  const emberResizeRef = useRef<{
    column: string;
    nextColumn: string;
    resizeStartOffset: number;
    minXResize: number;
    maxXResize: number;
  } | null>(null);

  // Ember register header onMouseDown handler
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isResizeHandle = target.classList?.contains('js-ynab-grid-resize-handle') ||
      target.getAttribute('class')?.includes('js-ynab-grid-resize-handle');
    if (!isResizeHandle) return;

    e.preventDefault();
    const cellEl = target.classList.contains('js-ynab-grid-header-cell')
      ? target
      : (target.closest('.js-ynab-grid-header-cell') as HTMLElement);
    if (!cellEl) return;

    // Find next visible column element matching Ember `n.next()`
    let nextCell = cellEl.nextElementSibling as HTMLElement | null;
    while (nextCell && (nextCell.offsetParent === null || window.getComputedStyle(nextCell).display === 'none')) {
      nextCell = nextCell.nextElementSibling as HTMLElement | null;
    }
    if (!nextCell) return;

    const colName = cellEl.getAttribute('data-column') || '';
    const nextColName = nextCell.getAttribute('data-column') || '';

    const cellRect = cellEl.getBoundingClientRect();
    const nextCellRect = nextCell.getBoundingClientRect();

    const minX = cellRect.left + AQ;
    const maxX = nextCellRect.right - AQ;

    emberResizeRef.current = {
      column: colName,
      nextColumn: nextColName,
      resizeStartOffset: target.getBoundingClientRect().left,
      minXResize: minX,
      maxXResize: maxX,
    };

    setResizeIndicator({
      show: true,
      left: Math.min(Math.max(e.pageX, minX), maxX),
      top: cellRect.top,
      height: cellRect.height,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!emberResizeRef.current) return;
      const { minXResize, maxXResize } = emberResizeRef.current;
      const clampedX = Math.min(Math.max(e.pageX, minXResize), maxXResize);
      setResizeIndicator((prev) => ({ ...prev, left: clampedX }));
    };

    const handleMouseUp = () => {
      if (!emberResizeRef.current) return;
      const { column, nextColumn, resizeStartOffset } = emberResizeRef.current;
      const currentIndicatorLeft = resizeIndicator.left;
      const deltaPx = currentIndicatorLeft - resizeStartOffset;

      // Calculate total width and percentage of visible columns matching Ember
      const headerCells = Array.from(
        document.querySelectorAll('.ynab-grid-header [data-column]')
      ) as HTMLElement[];
      const visibleCols: Record<string, number> = {};
      let totalWidth = 0;

      for (const el of headerCells) {
        if (el.offsetParent === null) continue;
        const col = el.getAttribute('data-column');
        if (col) {
          const w = el.getBoundingClientRect().width;
          visibleCols[col] = w;
          totalWidth += w;
        }
      }

      if (totalWidth > 0 && Math.abs(deltaPx) > 0.5) {
        const deltaPercent = (deltaPx / totalWidth) * 100;
        const currentColPct = (visibleCols[column] / totalWidth) * 100;
        const nextColPct = (visibleCols[nextColumn] / totalWidth) * 100;

        const newSizes: Record<string, number> = { ...columnPercentages };

        // Retain current percentages for all visible columns
        for (const col of Object.keys(visibleCols)) {
          if (!FIXED_COLUMNS.includes(col) && col !== 'subCategoryName') {
            newSizes[col] = (visibleCols[col] / totalWidth) * 100;
          }
        }

        newSizes[column] = currentColPct + deltaPercent;
        newSizes[nextColumn] = nextColPct - deltaPercent;

        setColumnPercentages(newSizes);
        try {
          localStorage.setItem(saveColumnSizesKey, JSON.stringify(newSizes));
        } catch {
          // ignore
        }
      }

      emberResizeRef.current = null;
      setResizeIndicator({ show: false, left: 0, top: 0, height: 0 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [saveColumnSizesKey, columnPercentages, resizeIndicator.left]);

  // Normalize IDs so 'acc-chase-checking' matches 'cash-checking'
  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return undefined;
    return accounts.find((a) => a.entityId === selectedAccountId);
  }, [selectedAccountId, accounts]);

  const showAccountColumn = !selectedAccountId;

  // Extract unique payees for search autocomplete
  const uniquePayees = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.payeeName?.trim()) set.add(t.payeeName.trim());
    });
    return Array.from(set);
  }, [transactions]);

  // Normalize matching logic between account IDs
  const isTxInAccount = (tx: TransactionItem, accId: string) => {
    if (tx.accountId === accId) return true;
    if (accId === 'acc-chase-checking' && tx.accountId === 'cash-checking') return true;
    if (accId === 'cash-checking' && tx.accountId === 'acc-chase-checking') return true;
    if (accId === 'acc-visa-rewards' && tx.accountId === 'credit-visa') return true;
    if (accId === 'credit-visa' && tx.accountId === 'acc-visa-rewards') return true;
    return false;
  };

  // Filter transactions by account, search text, and view filters, sorted by sortFields
  const visibleTransactions = useMemo(() => {
    const filtered = transactions.filter((t) => {
      // 1. Account filter
      if (selectedAccountId && !isTxInAccount(t, selectedAccountId)) {
        return false;
      }

      // 2. View Options: Reconciled filter
      if (!viewFilters.showReconciled && t.cleared === 'reconciled') {
        return false;
      }

      // 3. View Options: Date range filter
      if (viewFilters.selectedRange !== 'alldates') {
        const txDate = new Date(t.date);
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth();

        if (viewFilters.selectedRange === 'thismonth') {
          if (txDate.getFullYear() !== curYear || txDate.getMonth() !== curMonth) {
            return false;
          }
        } else if (viewFilters.selectedRange === 'lastmonth') {
          const lastMonthDate = new Date(curYear, curMonth - 1, 1);
          if (
            txDate.getFullYear() !== lastMonthDate.getFullYear() ||
            txDate.getMonth() !== lastMonthDate.getMonth()
          ) {
            return false;
          }
        } else if (viewFilters.selectedRange === 'latest3months') {
          const threeMonthsAgo = new Date(curYear, curMonth - 2, 1);
          if (txDate < threeMonthsAgo) {
            return false;
          }
        } else if (viewFilters.selectedRange === 'thisyear') {
          if (txDate.getFullYear() !== curYear) {
            return false;
          }
        } else if (viewFilters.selectedRange === 'lastyear') {
          if (txDate.getFullYear() !== curYear - 1) {
            return false;
          }
        } else if (viewFilters.selectedRange === 'custom') {
          const fromDate = new Date(viewFilters.fromYear, viewFilters.fromMonth, 1);
          const toDate = new Date(viewFilters.toYear, viewFilters.toMonth + 1, 0, 23, 59, 59);
          if (txDate < fromDate || txDate > toDate) {
            return false;
          }
        }
      }

      // 4. Search query parsing (supports "payee: text", "category: text", "memo: text", "outflow: 100", "inflow: 100", or generic string)
      if (searchText.trim()) {
        const raw = searchText.trim().toLowerCase();
        
        if (raw.startsWith('payee:')) {
          const val = raw.slice(6).trim();
          return t.payeeName.toLowerCase().includes(val);
        }
        if (raw.startsWith('category:')) {
          const val = raw.slice(9).trim();
          return t.subCategoryName.toLowerCase().includes(val);
        }
        if (raw.startsWith('memo:')) {
          const val = raw.slice(5).trim();
          return t.memo.toLowerCase().includes(val);
        }
        if (raw.startsWith('account:')) {
          const val = raw.slice(8).trim();
          return t.accountName.toLowerCase().includes(val);
        }
        if (raw.startsWith('outflow:')) {
          const num = parseFloat(raw.slice(8).replace(/[^0-9.]/g, ''));
          if (!isNaN(num)) {
            const milli = Math.round(num * 1000);
            return t.amount < 0 && Math.abs(t.amount) === milli;
          }
        }
        if (raw.startsWith('inflow:')) {
          const num = parseFloat(raw.slice(7).replace(/[^0-9.]/g, ''));
          if (!isNaN(num)) {
            const milli = Math.round(num * 1000);
            return t.amount > 0 && t.amount === milli;
          }
        }

        // Generic text search across all visible columns
        const matchPayee = t.payeeName.toLowerCase().includes(raw);
        const matchCategory = t.subCategoryName.toLowerCase().includes(raw);
        const matchMemo = t.memo.toLowerCase().includes(raw);
        const matchAccount = t.accountName.toLowerCase().includes(raw);
        return matchPayee || matchCategory || matchMemo || matchAccount;
      }

      return true;
    });

    // Apply sorting matching Ember registerSortService
    if (sortFields.length > 0) {
      filtered.sort((a, b) => {
        for (const { property, sortAscending } of sortFields) {
          let cmp = 0;
          if (property === 'date') {
            cmp = a.date.localeCompare(b.date);
          } else if (property === 'payeeName') {
            cmp = (a.payeeName || '').localeCompare(b.payeeName || '');
          } else if (property === 'subCategoryName') {
            cmp = (a.subCategoryName || '').localeCompare(b.subCategoryName || '');
          } else if (property === 'memo') {
            cmp = (a.memo || '').localeCompare(b.memo || '');
          } else if (property === 'outflow' || property === 'inflow') {
            cmp = a.amount - b.amount;
          } else if (property === 'cleared') {
            const getRank = (c: string) => (c === 'uncleared' ? 1 : c === 'cleared' ? 2 : 3);
            cmp = getRank(a.cleared) - getRank(b.cleared);
          } else if (property === 'flag') {
            cmp = (a.flag || '').localeCompare(b.flag || '');
          }

          if (cmp !== 0) {
            return sortAscending ? cmp : -cmp;
          }
        }

        // Tie-breaker: amount then entityId
        if (a.amount !== b.amount) return a.amount - b.amount;
        return a.entityId.localeCompare(b.entityId);
      });
    }

    return filtered;
  }, [transactions, selectedAccountId, searchText, viewFilters, sortFields]);

  // Compute running balance per visible transaction when in single account view
  const runningBalances = useMemo(() => {
    // In YNAB, running balance is computed chronologically (oldest to newest):
    // or by row index. Transactions are sorted by date.
    // Let's compute running balance cumulatively:
    const map = new Map<string, number>();
    let cumulative = 0;
    // Iterate from oldest to newest (or as in list)
    // In our mock transactions list, older transactions or order:
    // If we accumulate from bottom to top or top to bottom:
    // Standard ledger: balance = previous_balance + tx.amount
    // Let's sort copy by date ascending:
    const sorted = [...visibleTransactions].sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach((tx) => {
      cumulative += tx.amount;
      map.set(tx.entityId, cumulative);
    });
    return map;
  }, [visibleTransactions]);
  const { clearedBalance, unclearedBalance, workingBalance } = useMemo(() => {
    let cleared = 0;
    let uncleared = 0;
    const listToSum = selectedAccountId
      ? transactions.filter((t) => isTxInAccount(t, selectedAccountId))
      : transactions;

    listToSum.forEach((t) => {
      if (t.cleared === 'cleared' || t.cleared === 'reconciled') {
        cleared += t.amount;
      } else {
        uncleared += t.amount;
      }
    });

    return {
      clearedBalance: cleared,
      unclearedBalance: uncleared,
      workingBalance: cleared + uncleared,
    };
  }, [transactions, selectedAccountId]);

  // Compute selected total
  const selectedTotal = useMemo(() => {
    return visibleTransactions
      .filter((t) => selectedTxIds.has(t.entityId))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [visibleTransactions, selectedTxIds]);

  // Selection handlers
  const areAllChecked =
    visibleTransactions.length > 0 &&
    visibleTransactions.every((t) => selectedTxIds.has(t.entityId));
  const isPartiallyChecked =
    selectedTxIds.size > 0 && selectedTxIds.size < visibleTransactions.length;

  const handleToggleAll = () => {
    if (areAllChecked) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(visibleTransactions.map((t) => t.entityId)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleCleared = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.entityId === id) {
          const nextState =
            t.cleared === 'cleared'
              ? 'uncleared'
              : t.cleared === 'uncleared'
              ? 'cleared'
              : 'uncleared';
          return { ...t, cleared: nextState };
        }
        return t;
      })
    );
  };

  const handleSelectFlag = (txId: string, flagColor: string | null) => {
    setTransactions((prev) =>
      prev.map((t) => (t.entityId === txId ? { ...t, flag: flagColor || undefined } : t))
    );
  };

  // Add / Edit transaction
  const handleStartAdd = () => {
    setIsAddingTransaction(true);
    setEditingTxId(null);
  };

    const handleToggleCollapseSplit = (txId: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.entityId === txId ? { ...t, isCollapsed: !t.isCollapsed } : t))
    );
  };

  const handleFinishReconcile = (targetStatementMilliunits: number, createAdjustment: boolean) => {
    const discrepancy = targetStatementMilliunits - clearedBalance;
    setTransactions((prev) => {
      let updated: TransactionItem[] = prev.map((t) => {
        if ((!selectedAccountId || t.accountId === selectedAccountId) && t.cleared === 'cleared') {
          return { ...t, cleared: 'reconciled' as const };
        }
        return t;
      });

      if (createAdjustment && discrepancy !== 0) {
        const adjTx: TransactionItem = {
          entityId: 'tx-adj-' + Date.now(),
          accountId: selectedAccountId || accounts[0]?.entityId || '',
          accountName: selectedAccount?.accountName || accounts[0]?.accountName || '',
          date: new Date().toISOString().slice(0, 10),
          payeeName: 'Reconciliation Balance Adjustment',
          subCategoryId: 'inflow-ready-to-assign',
          subCategoryName: 'Inflow: Ready to Assign',
          memo: 'Entered automatically by YNAB',
          amount: discrepancy,
          cleared: 'reconciled' as const,
        };
        updated = [adjTx, ...updated];
      }
      return updated;
    });

    setIsAdjustmentMode(false);
  };

  const handleRecordPayment = () => {
    setIsAddingTransaction(true);
  };

  const handleSaveAdd = async (tx: TransactionItem) => {
    setTransactions((prev) => [tx, ...prev]);
    setIsAddingTransaction(false);

    try {
      await saveTransaction({
        account_id: tx.accountId,
        payee_id: tx.payeeId,
        category_id: tx.subCategoryId,
        date: tx.date,
        amount_milliunits: tx.amount,
        memo: tx.memo,
        cleared: tx.cleared,
        transfer_account_id: tx.transferAccountId,
      });
      // Refresh transactions
      const updated = await getTransactions(selectedAccountId || undefined);
      setTransactions(updated);
    } catch (err) {
      console.error('Failed to save transaction via Tauri:', err);
    }
  };

  const handleSaveEdit = async (tx: TransactionItem) => {
    setTransactions((prev) => prev.map((t) => (t.entityId === tx.entityId ? tx : t)));
    setEditingTxId(null);

    try {
      await saveTransaction({
        id: tx.entityId,
        account_id: tx.accountId,
        payee_id: tx.payeeId,
        category_id: tx.subCategoryId,
        date: tx.date,
        amount_milliunits: tx.amount,
        memo: tx.memo,
        cleared: tx.cleared,
        transfer_account_id: tx.transferAccountId,
      });
      const updated = await getTransactions(selectedAccountId || undefined);
      setTransactions(updated);
    } catch (err) {
      console.error('Failed to update transaction via Tauri:', err);
    }
  };

  // Action bar actions
  const handleBulkClear = () => {
    setTransactions((prev) =>
      prev.map((t) => (selectedTxIds.has(t.entityId) ? { ...t, cleared: 'cleared' } : t))
    );
    setSelectedTxIds(new Set());
  };

  const handleBulkUnclear = () => {
    setTransactions((prev) =>
      prev.map((t) => (selectedTxIds.has(t.entityId) ? { ...t, cleared: 'uncleared' } : t))
    );
    setSelectedTxIds(new Set());
  };

  const handleBulkSelectFlag = (flagColor: string | null) => {
    setTransactions((prev) =>
      prev.map((t) => (selectedTxIds.has(t.entityId) ? { ...t, flag: flagColor } : t))
    );
    setSelectedTxIds(new Set());
  };

  const handleBulkDelete = () => {
    setTransactions((prev) => prev.filter((t) => !selectedTxIds.has(t.entityId)));
    setSelectedTxIds(new Set());
  };

  // Keyboard Shortcuts for Accounts Workspace
  useEffect(() => {
    const target = {};

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.SelectAllTransactions,
      target,
      (e) => {
        if (!keyboardShortcutsService.isModalClosedAndNoInputEditing) return;
        e.preventDefault();
        e.stopOtherShortcuts();
        const allVisibleIds = visibleTransactions.map((t) => t.entityId);
        setSelectedTxIds(new Set(allVisibleIds));
        return KBShortcutResult.Success;
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.DeselectAllTransactions,
      target,
      (e) => {
        if (!keyboardShortcutsService.isModalClosedAndNoInputEditing) return;
        e.preventDefault();
        e.stopOtherShortcuts();
        setSelectedTxIds(new Set());
        return KBShortcutResult.Success;
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.AddNewTransaction,
      target,
      (e) => {
        if (!keyboardShortcutsService.isModalClosedAndNoInputEditing) return;
        e.preventDefault();
        e.stopOtherShortcuts();
        handleStartAdd();
        return KBShortcutResult.Success;
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.ToggleCleared,
      target,
      (e) => {
        if (!keyboardShortcutsService.isModalClosedAndNoInputEditing) return;
        e.preventDefault();
        e.stopOtherShortcuts();
        if (selectedTxIds.size > 0) {
          setTransactions((prev) =>
            prev.map((t) => {
              if (selectedTxIds.has(t.entityId)) {
                return {
                  ...t,
                  cleared: t.cleared === 'cleared' ? 'uncleared' : 'cleared',
                };
              }
              return t;
            })
          );
        }
        return KBShortcutResult.Success;
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.DeleteTransactions,
      target,
      (e) => {
        if (!keyboardShortcutsService.isModalClosedAndNoInputEditing) return;
        e.preventDefault();
        e.stopOtherShortcuts();
        if (selectedTxIds.size > 0) {
          handleBulkDelete();
        }
        return KBShortcutResult.Success;
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.Duplicate,
      target,
      (e) => {
        if (!keyboardShortcutsService.isModalClosedAndNoInputEditing) return;
        e.preventDefault();
        e.stopOtherShortcuts();
        if (selectedTxIds.size > 0) {
          const toDuplicate = transactions.filter((t) => selectedTxIds.has(t.entityId));
          const newCopies = toDuplicate.map((t) => ({
            ...t,
            entityId: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          }));
          setTransactions((prev) => [...newCopies, ...prev]);
          setSelectedTxIds(new Set());
        }
        return KBShortcutResult.Success;
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.ApproveAll,
      target,
      (e) => {
        if (!keyboardShortcutsService.isModalClosedAndNoInputEditing) return;
        e.preventDefault();
        e.stopOtherShortcuts();
        setTransactions((prev) =>
          prev.map((t) => ({ ...t, cleared: 'cleared' }))
        );
        setSelectedTxIds(new Set());
        return KBShortcutResult.Success;
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.Flag,
      target,
      (e) => {
        if (!keyboardShortcutsService.isModalClosedAndNoInputEditing) return;
        e.preventDefault();
        e.stopOtherShortcuts();
        if (selectedTxIds.size > 0) {
          setFlagPickerState({
            isOpen: true,
            txId: null,
            isBulk: true,
            triggerRect: new DOMRect(window.innerWidth / 2 - 100, window.innerHeight / 2 - 50, 200, 100),
          });
        }
        return KBShortcutResult.Success;
      }
    );

    keyboardShortcutsService.registerShortcut(
      KeyboardShortcut.StartEditingTransaction,
      target,
      (e) => {
        if (!keyboardShortcutsService.isModalClosedAndNoInputEditing) return;
        e.preventDefault();
        e.stopOtherShortcuts();
        if (selectedTxIds.size === 1) {
          const txId = Array.from(selectedTxIds)[0];
          setEditingTxId(txId);
        }
        return KBShortcutResult.Success;
      }
    );

    return () => {
      keyboardShortcutsService.removeAllShortcutsForTarget(target);
    };
  }, [visibleTransactions, selectedTxIds, transactions]);

  const newDraftTx: TransactionItem = {
    entityId: `tx-${Date.now()}`,
    accountId: selectedAccountId || accounts[0]?.entityId || '',
    accountName: selectedAccount?.accountName || accounts[0]?.accountName || '',
    date: new Date().toISOString().slice(0, 10),
    payeeName: '',
    subCategoryName: '',
    memo: '',
    amount: 0,
    cleared: 'cleared',
  };

  return (
    <div
      className="accounts-workspace"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <AccountsHeader
        selectedAccount={selectedAccount}
        clearedBalanceMilliunits={clearedBalance}
        unclearedBalanceMilliunits={unclearedBalance}
        workingBalanceMilliunits={workingBalance}
        selectedCount={selectedTxIds.size}
        selectedTotalMilliunits={selectedTotal}
        isAdjustmentMode={isAdjustmentMode}
        adjustmentStatementBalanceMilliunits={statementBalanceMilliunits}
        onEditAccount={() => selectedAccount && onOpenEditAccount?.(selectedAccount)}
        onReconcile={() => selectedAccount && setReconcileWizardOpen(true)}
        onCreateAdjustmentAndFinish={() => handleFinishReconcile(statementBalanceMilliunits, true)}
        onCancelAdjustmentMode={() => setIsAdjustmentMode(false)}
      />

      <AccountsToolbar
        onAddTransaction={handleStartAdd}
        searchText={searchText}
        onSearchChange={setSearchText}
        accounts={accounts}
        selectedAccount={selectedAccount}
        categoryGroups={categoryGroups}
        payees={uniquePayees}
        onRecordPayment={handleRecordPayment}
        placeholder={selectedAccount ? `Search ${selectedAccount.accountName}` : 'Search All Accounts'}
        isViewOptionsOpen={viewOptionsState.isOpen}
        onOpenViewOptions={(rect) =>
          setViewOptionsState((prev) => ({
            isOpen: !prev.isOpen,
            triggerRect: rect,
          }))
        }
      />

      {/* Dynamic Column Sizes stylesheet matching Ember registerGridService */}
      {Object.keys(columnPercentages).length > 0 && (
        <style>
          {Object.entries(columnPercentages)
            .filter(([col]) => !FIXED_COLUMNS.includes(col) && col !== 'subCategoryName')
            .map(
              ([col, pct]) => `
              .ynab-grid-cell-${col} {
                width: ${pct}% !important;
              }
            `
            )
            .join('\n')}
        </style>
      )}

      {/* Floating Ghost Resize Handle matching Ember YNAB */}
      {resizeIndicator.show && (
        <div
          className="ynab-grid-resize-handle is-resizing"
          style={{
            position: 'fixed',
            top: `${resizeIndicator.top}px`,
            left: `${resizeIndicator.left}px`,
            height: `${resizeIndicator.height}px`,
          }}
        >
          <div
            className="ynab-grid-resize-handle-line"
            style={{ marginTop: `${resizeIndicator.height}px` }}
          />
        </div>
      )}

      {/* Grid container */}
      <div className="ynab-grid-container" style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
        <div className="ynab-grid">
          <RegisterGridHeader
            areAllChecked={areAllChecked}
            isPartiallyChecked={isPartiallyChecked}
            onToggleAll={handleToggleAll}
            showAccountColumn={showAccountColumn}
            showRunningBalance={viewFilters.showRunningBalance && !!selectedAccountId}
            showFlags={viewFilters.showFlags}
            showImages={viewFilters.showImages}
            isResizing={resizeIndicator.show}
            sortFields={sortFields}
            onSort={handleSortColumn}
            onMouseDown={handleHeaderMouseDown}
          />

          <div className="ynab-grid-body">
            {/* Adding row inline */}
            {isAddingTransaction && (
              <RegisterGridEditRow
                transaction={newDraftTx}
                showAccountColumn={showAccountColumn}
                showRunningBalance={viewFilters.showRunningBalance && !!selectedAccountId}
                showFlags={viewFilters.showFlags}
                showImages={viewFilters.showImages}
                accounts={accounts}
                categoryGroups={categoryGroups}
                payees={uniquePayees}
                isAddRow={true}
                onSave={handleSaveAdd}
                onSaveAndAddAnother={(tx) => {
                  setTransactions((prev) => [tx, ...prev]);
                }}
                onCancel={() => setIsAddingTransaction(false)}
              />
            )}

            {visibleTransactions.map((tx) =>
              editingTxId === tx.entityId ? (
                <RegisterGridEditRow
                  key={tx.entityId}
                  transaction={tx}
                  showAccountColumn={showAccountColumn}
                  showRunningBalance={viewFilters.showRunningBalance && !!selectedAccountId}
                  showFlags={viewFilters.showFlags}
                  showImages={viewFilters.showImages}
                  accounts={accounts}
                  categoryGroups={categoryGroups}
                  payees={uniquePayees}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingTxId(null)}
                />
              ) : (
                <RegisterGridRow
                  key={tx.entityId}
                  transaction={tx}
                  showAccountColumn={showAccountColumn}
                  showRunningBalance={viewFilters.showRunningBalance && !!selectedAccountId}
                  showFlags={viewFilters.showFlags}
                  showImages={viewFilters.showImages}
                  runningBalanceMilliunits={runningBalances.get(tx.entityId) ?? 0}
                  isSelected={selectedTxIds.has(tx.entityId)}
                  onSelect={() => handleToggleSelect(tx.entityId)}
                  onDoubleClick={() => setEditingTxId(tx.entityId)}
                  onToggleCleared={() => handleToggleCleared(tx.entityId)}
                  onToggleCollapseSplit={() => handleToggleCollapseSplit(tx.entityId)}
                  onOpenFlagPicker={(txId, rect) =>
                    setFlagPickerState({ isOpen: true, txId, triggerRect: rect })
                  }
                />
              )
            )}

            {visibleTransactions.length === 0 && !isAddingTransaction && (
              <div
                className="ynab-grid-body-empty"
                style={{
                  padding: '3rem',
                  textAlign: 'center',
                  color: 'var(--labelSecondary)',
                }}
              >
                No transactions found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Bar when items selected */}
      <RegisterActionBar
        selectedCount={selectedTxIds.size}
        accounts={accounts}
        canClear={visibleTransactions.some(
          (t) => selectedTxIds.has(t.entityId) && t.cleared === 'uncleared'
        )}
        canUnclear={visibleTransactions.some(
          (t) => selectedTxIds.has(t.entityId) && t.cleared === 'cleared'
        )}
        onClear={handleBulkClear}
        onUnclear={handleBulkUnclear}
        onDelete={handleBulkDelete}
        onCategorize={(rect) => setBulkCategoryPickerState({ isOpen: true, triggerRect: rect })}
        onFlag={(rect) =>
          setFlagPickerState({ isOpen: true, txId: null, isBulk: true, triggerRect: rect })
        }
        onMoveToAccount={(targetAccount) => {
          setTransactions((prev) =>
            prev.map((t) =>
              selectedTxIds.has(t.entityId)
                ? { ...t, accountId: targetAccount.entityId, accountName: targetAccount.accountName }
                : t
            )
          );
          setSelectedTxIds(new Set());
        }}
        onDuplicate={() => {
          const toDuplicate = transactions.filter((t) => selectedTxIds.has(t.entityId));
          const newCopies = toDuplicate.map((t) => ({
            ...t,
            entityId: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          }));
          setTransactions((prev) => [...newCopies, ...prev]);
          setSelectedTxIds(new Set());
        }}
        onMakeRepeating={() => {
          // toggle or mark repeating
          setSelectedTxIds(new Set());
        }}
        onEditMemo={() => {
          const newMemo = window.prompt('Edit memo for selected transactions:');
          if (newMemo !== null) {
            setTransactions((prev) =>
              prev.map((t) =>
                selectedTxIds.has(t.entityId) ? { ...t, memo: newMemo } : t
              )
            );
          }
          setSelectedTxIds(new Set());
        }}
        onExport={() => {
          const selected = transactions.filter((t) => selectedTxIds.has(t.entityId));
          const csv = 'Date,Account,Payee,Category,Memo,Amount\n' +
            selected.map((t) => `${t.date},${t.accountName},${t.payeeName},${t.subCategoryName},${t.memo},${t.amount}`).join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `transactions-export-${Date.now()}.csv`;
          a.click();
          setSelectedTxIds(new Set());
        }}
        onUncheckAll={() => setSelectedTxIds(new Set())}
      />

      {/* Flag Color Picker Popover */}
      <FlagPickerPopover
        isOpen={flagPickerState.isOpen}
        triggerRect={flagPickerState.triggerRect}
        isBulk={flagPickerState.isBulk}
        hasActiveFlags={
          flagPickerState.isBulk
            ? visibleTransactions.some((t) => selectedTxIds.has(t.entityId) && !!t.flag)
            : false
        }
        currentFlag={
          flagPickerState.isBulk
            ? null
            : transactions.find((t) => t.entityId === flagPickerState.txId)?.flag ?? null
        }
        onClose={() =>
          setFlagPickerState({ isOpen: false, txId: null, isBulk: false, triggerRect: null })
        }
        onSelectFlag={(flagColor) => {
          if (flagPickerState.isBulk) {
            setTransactions((prev) =>
              prev.map((t) =>
                selectedTxIds.has(t.entityId) ? { ...t, flag: flagColor || undefined } : t
              )
            );
            setSelectedTxIds(new Set());
          } else if (flagPickerState.txId) {
            handleSelectFlag(flagPickerState.txId, flagColor);
          }
        }}
      />

      {/* Action Bar Cascading Category Picker Popover */}
      <ActionBarCategorizePopover
        isOpen={bulkCategoryPickerState.isOpen}
        triggerRect={bulkCategoryPickerState.triggerRect}
        categoryGroups={categoryGroups}
        onSelectCategory={(catId, fullCategoryName) => {
          setTransactions((prev) =>
            prev.map((t) =>
              selectedTxIds.has(t.entityId)
                ? { ...t, subCategoryId: catId, subCategoryName: fullCategoryName }
                : t
            )
          );
          setSelectedTxIds(new Set());
          setBulkCategoryPickerState({ isOpen: false, triggerRect: null });
        }}
        onClose={() => setBulkCategoryPickerState({ isOpen: false, triggerRect: null })}
      />

      {/* Reconcile Wizard Modal (components/modals/register/reconcile-steps.hbs) */}
      {reconcileWizardOpen && selectedAccount && (
        <ReconcileWizardModal
          isOpen={reconcileWizardOpen}
          selectedAccount={selectedAccount}
          clearedBalanceMilliunits={clearedBalance}
          onFinishReconcile={(targetVal, createAdj) => {
            handleFinishReconcile(targetVal, createAdj);
          }}
          onEnterAdjustmentMode={(targetVal) => {
            setStatementBalanceMilliunits(targetVal);
            setIsAdjustmentMode(true);
          }}
          onClose={() => setReconcileWizardOpen(false)}
        />
      )}

      {/* View Options Popover */}
      <ViewOptionsPopover
        isOpen={viewOptionsState.isOpen}
        triggerRect={viewOptionsState.triggerRect}
        filters={viewFilters}
        canViewRunningBalance={!!selectedAccountId}
        onApply={(updatedFilters) => {
          setViewFilters(updatedFilters);
          // Persist viewMenuShowColumns matching Ember registerGridService
          try {
            const columnsState = {
              balance: updatedFilters.showRunningBalance,
              flag: updatedFilters.showFlags,
              image: updatedFilters.showImages,
            };
            localStorage.setItem(viewOptionsStorageKey, JSON.stringify(columnsState));
          } catch {
            // ignore
          }
          setViewOptionsState({ isOpen: false, triggerRect: null });
        }}
        onCancel={() => setViewOptionsState({ isOpen: false, triggerRect: null })}
      />
    </div>
  );
}

export default AccountsWorkspace;