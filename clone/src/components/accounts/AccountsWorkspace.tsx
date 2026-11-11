import React, { useState, useMemo, useEffect, useRef } from 'react';
import './accounts.css';
import { AccountItem } from '../sidebar/NavAccountRow';
import { MasterCategoryGroup } from '../budget/budgetData';
import { INITIAL_TRANSACTIONS, TransactionItem } from './accountData';
import { AccountsHeader } from './AccountsHeader';
import { AccountsToolbar } from './AccountsToolbar';
import { RegisterGridHeader } from './RegisterGridHeader';
import { RegisterGridRow } from './RegisterGridRow';
import { RegisterGridEditRow } from './RegisterGridEditRow';
import { RegisterActionBar } from './RegisterActionBar';
import { FlagPickerPopover } from './FlagPickerPopover';
import { ActionBarCategorizePopover } from './ActionBarCategorizePopover';
import { ViewOptionsPopover, ViewFilterOptions } from './ViewOptionsPopover';

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
  const [transactions, setTransactions] = useState<TransactionItem[]>(INITIAL_TRANSACTIONS);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [isAddingTransaction, setIsAddingTransaction] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  
  // View options popover state
  const [viewFilters, setViewFilters] = useState<ViewFilterOptions>(DEFAULT_VIEW_FILTERS);
  const [viewOptionsState, setViewOptionsState] = useState<{
    isOpen: boolean;
    triggerRect: DOMRect | null;
  }>({ isOpen: false, triggerRect: null });

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

  // Minimum widths (px) for resizable columns
  const COLUMN_MIN_WIDTHS: Record<string, number> = {
    accountName: 80,
    date: 85,
    payeeName: 100,
    subCategoryName: 100,
    memo: 80,
    outflow: 75,
    inflow: 75,
  };

  // Custom column widths (px)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizeStateRef = useRef<{
    column: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleStartResize = (column: string, startX: number, startWidth: number) => {
    resizeStateRef.current = { column, startX, startWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStateRef.current) return;
      const { column, startX, startWidth } = resizeStateRef.current;
      const minW = COLUMN_MIN_WIDTHS[column] ?? 60;
      const deltaX = e.pageX - startX;
      const newWidth = Math.max(minW, startWidth + deltaX);
      setColumnWidths((prev) => ({ ...prev, [column]: newWidth }));
    };

    const handleMouseUp = () => {
      if (resizeStateRef.current) {
        resizeStateRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

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

  // Filter transactions by account, search text, and view filters
  const visibleTransactions = useMemo(() => {
    return transactions.filter((t) => {
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
  }, [transactions, selectedAccountId, searchText, viewFilters]);

  // Compute Cleared, Uncleared, Working balances
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

  const handleSaveAdd = (tx: TransactionItem) => {
    setTransactions((prev) => [tx, ...prev]);
    setIsAddingTransaction(false);
  };

  const handleSaveEdit = (tx: TransactionItem) => {
    setTransactions((prev) => prev.map((t) => (t.entityId === tx.entityId ? tx : t)));
    setEditingTxId(null);
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
        onEditAccount={() => selectedAccount && onOpenEditAccount?.(selectedAccount)}
        onReconcile={() => {}}
      />

      <AccountsToolbar
        onAddTransaction={handleStartAdd}
        searchText={searchText}
        onSearchChange={setSearchText}
        accounts={accounts}
        categoryGroups={categoryGroups}
        payees={uniquePayees}
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
      {Object.keys(columnWidths).length > 0 && (
        <style>
          {Object.entries(columnWidths)
            .map(
              ([col, width]) => `
              .ynab-grid-cell-${col} {
                width: ${width}px !important;
                min-width: ${width}px !important;
                max-width: ${width}px !important;
                box-sizing: border-box !important;
              }
            `
            )
            .join('\n')}
        </style>
      )}

      {/* Grid container */}
      <div className="ynab-grid-container" style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
        <div className="ynab-grid">
          <RegisterGridHeader
            areAllChecked={areAllChecked}
            isPartiallyChecked={isPartiallyChecked}
            onToggleAll={handleToggleAll}
            showAccountColumn={showAccountColumn}
            onStartResize={handleStartResize}
          />

          <div className="ynab-grid-body">
            {/* Adding row inline */}
            {isAddingTransaction && (
              <RegisterGridEditRow
                transaction={newDraftTx}
                showAccountColumn={showAccountColumn}
                accounts={accounts}
                categoryGroups={categoryGroups}
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
                  accounts={accounts}
                  categoryGroups={categoryGroups}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingTxId(null)}
                />
              ) : (
                <RegisterGridRow
                  key={tx.entityId}
                  transaction={tx}
                  showAccountColumn={showAccountColumn}
                  isSelected={selectedTxIds.has(tx.entityId)}
                  onSelect={() => handleToggleSelect(tx.entityId)}
                  onDoubleClick={() => setEditingTxId(tx.entityId)}
                  onToggleCleared={() => handleToggleCleared(tx.entityId)}
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

      {/* View Options Popover */}
      <ViewOptionsPopover
        isOpen={viewOptionsState.isOpen}
        triggerRect={viewOptionsState.triggerRect}
        filters={viewFilters}
        canViewRunningBalance={!!selectedAccountId}
        onApply={(updatedFilters) => {
          setViewFilters(updatedFilters);
          setViewOptionsState({ isOpen: false, triggerRect: null });
        }}
        onCancel={() => setViewOptionsState({ isOpen: false, triggerRect: null })}
      />
    </div>
  );
}

export default AccountsWorkspace;