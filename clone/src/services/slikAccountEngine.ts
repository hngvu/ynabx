import { TransactionItem } from '../components/accounts/accountData';
import { AccountItem } from '../components/sidebar/NavAccountRow';

const FAVORITES_STORAGE_KEY = 'ynabx_account_favorites';
const RECONCILED_DATES_STORAGE_KEY = 'ynabx_account_reconciled_dates';

export interface ParsedImportRow {
  id: string;
  date: string;
  payeeName: string;
  memo: string;
  amount: number; // integer milliunits
  selected: boolean;
  isPotentialDuplicate: boolean;
}

export interface EditGuardResult {
  needsConfirm: boolean;
  reason: 'reconciled' | 'closed-account' | null;
  message: string;
}

export interface DeleteGuardResult {
  needsConfirm: boolean;
  hasReconciled: boolean;
  hasClosedAccount: boolean;
  reconciledCount: number;
}

/**
 * Undo/Redo snapshot stack for Accounts Register transactions.
 */
export class AccountUndoRedoStack {
  private undoStack: TransactionItem[][] = [];
  private redoStack: TransactionItem[][] = [];
  private maxEntries: number;

  constructor(maxEntries = 50) {
    this.maxEntries = maxEntries;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  push(snapshot: TransactionItem[]): void {
    this.undoStack.push(snapshot.map((t) => ({ ...t })));
    if (this.undoStack.length > this.maxEntries) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(current: TransactionItem[]): TransactionItem[] | null {
    const prev = this.undoStack.pop();
    if (!prev) return null;
    this.redoStack.push(current.map((t) => ({ ...t })));
    return prev;
  }

  redo(current: TransactionItem[]): TransactionItem[] | null {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(current.map((t) => ({ ...t })));
    return next;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

/**
 * Persists and retrieves starred/favorite account flags in localStorage.
 */
export function getAccountFavorites(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setAccountFavorite(accountId: string, isFavorite: boolean): Record<string, boolean> {
  const current = getAccountFavorites();
  const updated = { ...current, [accountId]: isFavorite };
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
  return updated;
}

/**
 * Persists and retrieves last reconciled ISO dates per account in localStorage.
 */
export function getLastReconciledDates(): Record<string, string> {
  try {
    const raw = localStorage.getItem(RECONCILED_DATES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setLastReconciledDate(accountId: string, isoDate: string): Record<string, string> {
  const current = getLastReconciledDates();
  const updated = { ...current, [accountId]: isoDate };
  try {
    localStorage.setItem(RECONCILED_DATES_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
  return updated;
}

/**
 * Resolves a transfer target account ID from `transferAccountId` or `Transfer : <AccountName>`.
 */
export function resolveTransferAccountId(
  tx: TransactionItem,
  accounts: AccountItem[]
): string | undefined {
  if (tx.transferAccountId) return tx.transferAccountId;
  if (tx.payeeName.startsWith('Transfer : ')) {
    const targetName = tx.payeeName.slice('Transfer : '.length).trim();
    const match = accounts.find((a) => a.accountName === targetName && a.entityId !== tx.accountId);
    return match?.entityId;
  }
  return undefined;
}

function getPairedTransferId(entityId: string): string {
  return entityId.endsWith('__pair') ? entityId.slice(0, -6) : `${entityId}__pair`;
}

/**
 * Maintains 2-way dual-side transfer transactions across accounts.
 * When a transaction is saved as a transfer to `targetAccountId`, creates or updates
 * the negated counter-transaction in the target account.
 */
export function syncTransferPair(
  transactions: TransactionItem[],
  savedTx: TransactionItem,
  accounts: AccountItem[]
): TransactionItem[] {
  const targetAccountId = resolveTransferAccountId(savedTx, accounts);
  const sourceAccount = accounts.find((a) => a.entityId === savedTx.accountId);
  const targetAccount = targetAccountId ? accounts.find((a) => a.entityId === targetAccountId) : undefined;
  const pairId = getPairedTransferId(savedTx.entityId);

  // Remove any stale pair first if transfer target was cleared or changed
  let next = transactions.filter((t) => t.entityId !== pairId);

  if (targetAccount && targetAccount.entityId !== savedTx.accountId) {
    const normalizedSaved: TransactionItem = {
      ...savedTx,
      transferAccountId: targetAccount.entityId,
      payeeName: `Transfer : ${targetAccount.accountName}`,
      subCategoryId: 'category-not-needed',
      subCategoryName: 'Category not needed',
    };
    next = next.map((t) => (t.entityId === savedTx.entityId ? normalizedSaved : t));

    const existingPair = transactions.find((t) => t.entityId === pairId);
    const counterTx: TransactionItem = {
      entityId: pairId,
      accountId: targetAccount.entityId,
      accountName: targetAccount.accountName,
      date: savedTx.date,
      payeeName: `Transfer : ${sourceAccount?.accountName || savedTx.accountName}`,
      subCategoryId: 'category-not-needed',
      subCategoryName: 'Category not needed',
      memo: savedTx.memo,
      amount: -Math.trunc(savedTx.amount),
      cleared: existingPair?.cleared ?? 'uncleared',
      flag: savedTx.flag ?? null,
      transferAccountId: savedTx.accountId,
    };
    next = [counterTx, ...next];
  }

  return next;
}

/**
 * Deletes transactions along with their paired transfer counter-transactions.
 */
export function deleteTransactionsWithTransfers(
  transactions: TransactionItem[],
  idsToDelete: Set<string>
): TransactionItem[] {
  const expanded = new Set<string>(idsToDelete);
  for (const id of idsToDelete) {
    expanded.add(getPairedTransferId(id));
  }
  return transactions.filter((t) => !expanded.has(t.entityId));
}

/**
 * Checks whether editing `originalTx` into `updatedTx` requires a Reconciled (LOCKED)
 * or Closed Account confirmation dialog (mirrors TransactionEditor.saveTransaction).
 */
export function checkTransactionEditGuard(
  originalTx: TransactionItem | undefined,
  updatedTx: TransactionItem,
  accounts: AccountItem[]
): EditGuardResult {
  if (!originalTx) {
    return { needsConfirm: false, reason: null, message: '' };
  }
  const changedSensitive =
    originalTx.amount !== updatedTx.amount ||
    originalTx.accountId !== updatedTx.accountId ||
    originalTx.payeeName !== updatedTx.payeeName;

  if (!changedSensitive) {
    return { needsConfirm: false, reason: null, message: '' };
  }

  if (originalTx.cleared === 'reconciled') {
    return {
      needsConfirm: true,
      reason: 'reconciled',
      message:
        'This transaction is reconciled. Editing its amount, account, or payee may affect your reconciled balance.',
    };
  }

  const account = accounts.find((a) => a.entityId === originalTx.accountId);
  if (account?.isClosed) {
    return {
      needsConfirm: true,
      reason: 'closed-account',
      message:
        'This transaction belongs to a closed account. Saving changes will modify a closed account balance.',
    };
  }

  return { needsConfirm: false, reason: null, message: '' };
}

/**
 * Checks whether deleting selected transactions affects reconciled or closed-account rows.
 */
export function checkTransactionDeleteGuard(
  ids: Set<string>,
  transactions: TransactionItem[],
  accounts: AccountItem[]
): DeleteGuardResult {
  let reconciledCount = 0;
  let hasClosedAccount = false;

  for (const tx of transactions) {
    if (!ids.has(tx.entityId)) continue;
    if (tx.cleared === 'reconciled') reconciledCount += 1;
    const acc = accounts.find((a) => a.entityId === tx.accountId);
    if (acc?.isClosed) hasClosedAccount = true;
  }

  return {
    needsConfirm: reconciledCount > 0 || hasClosedAccount,
    hasReconciled: reconciledCount > 0,
    hasClosedAccount,
    reconciledCount,
  };
}

/**
 * Scheduled / Pending / Approval / Cleared state transitions.
 */
export function approveTransactions(
  transactions: TransactionItem[],
  ids: Set<string>
): TransactionItem[] {
  return transactions.map((t) =>
    ids.has(t.entityId) ? { ...t, needsApproved: false } : t
  );
}

export function rejectTransactions(
  transactions: TransactionItem[],
  ids: Set<string>
): TransactionItem[] {
  return transactions.filter((t) => !(ids.has(t.entityId) && t.needsApproved));
}

export function enterNowTransactions(
  transactions: TransactionItem[],
  ids: Set<string>
): TransactionItem[] {
  const todayIso = new Date().toISOString().slice(0, 10);
  return transactions.map((t) =>
    ids.has(t.entityId) && (t.isPending || t.isRepeating)
      ? {
          ...t,
          isPending: false,
          needsApproved: true,
          cleared: 'uncleared',
          date: t.isPending ? t.date : todayIso,
        }
      : t
  );
}

export function toggleClearedTransactions(
  transactions: TransactionItem[],
  ids: Set<string>
): TransactionItem[] {
  return transactions.map((t) => {
    if (!ids.has(t.entityId) || t.cleared === 'reconciled' || t.isPending) return t;
    return {
      ...t,
      cleared: t.cleared === 'cleared' ? 'uncleared' : 'cleared',
    };
  });
}

export function makeRepeatingTransactions(
  transactions: TransactionItem[],
  ids: Set<string>
): TransactionItem[] {
  return transactions.map((t) =>
    ids.has(t.entityId) ? { ...t, isRepeating: !t.isRepeating } : t
  );
}

function normalizeDateString(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{8}/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }
  const slashParts = trimmed.split(/[/-]/);
  if (slashParts.length === 3) {
    const [p1, p2, p3] = slashParts;
    if (p3.length === 4) {
      return `${p3}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
    }
    if (p3.length === 2) {
      return `20${p3}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
    }
  }
  return new Date().toISOString().slice(0, 10);
}

function parseAmountToMilliunits(raw: string): number {
  const cleaned = raw.replace(/[$,\s]/g, '');
  const val = parseFloat(cleaned);
  return Number.isFinite(val) ? Math.round(val * 1000) : 0;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Parses CSV, OFX, QFX, or QIF bank export content into previewable import rows.
 */
export function parseImportFileContent(
  fileName: string,
  content: string,
  existingTransactions: TransactionItem[],
  targetAccountId?: string
): ParsedImportRow[] {
  const ext = fileName.toLowerCase().split('.').pop() || 'csv';
  const rawRows: Array<{ date: string; payeeName: string; memo: string; amount: number }> = [];

  if (ext === 'ofx' || ext === 'qfx') {
    const blocks = content.split(/<STMTTRN>/i).slice(1);
    for (const block of blocks) {
      const dt = block.match(/<DTPOSTED>([^<\r\n]+)/i)?.[1] ?? '';
      const amt = block.match(/<TRNAMT>([^<\r\n]+)/i)?.[1] ?? '0';
      const name = block.match(/<NAME>([^<\r\n]+)/i)?.[1] ?? '';
      const memo = block.match(/<MEMO>([^<\r\n]+)/i)?.[1] ?? '';
      rawRows.push({
        date: normalizeDateString(dt),
        payeeName: name.trim() || 'Imported Payee',
        memo: memo.trim(),
        amount: parseAmountToMilliunits(amt),
      });
    }
  } else if (ext === 'qif') {
    const records = content.split(/^\^/m);
    for (const rec of records) {
      const lines = rec.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;
      let date = '';
      let amount = 0;
      let payeeName = '';
      let memo = '';
      for (const line of lines) {
        const code = line[0];
        const val = line.slice(1).trim();
        if (code === 'D') date = normalizeDateString(val);
        else if (code === 'T' || code === 'U') amount = parseAmountToMilliunits(val);
        else if (code === 'P') payeeName = val;
        else if (code === 'M') memo = val;
      }
      if (date || payeeName || amount !== 0) {
        rawRows.push({
          date: date || new Date().toISOString().slice(0, 10),
          payeeName: payeeName || 'Imported Payee',
          memo,
          amount,
        });
      }
    }
  } else {
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
      const hasHeader = header.some((h) =>
        ['date', 'payee', 'amount', 'outflow', 'inflow', 'memo'].includes(h)
      );
      const startIdx = hasHeader ? 1 : 0;
      const dateIdx = hasHeader ? header.indexOf('date') : 0;
      const payeeIdx = hasHeader ? header.indexOf('payee') : 1;
      const memoIdx = hasHeader ? header.indexOf('memo') : 2;
      const outflowIdx = hasHeader ? header.indexOf('outflow') : -1;
      const inflowIdx = hasHeader ? header.indexOf('inflow') : -1;
      const amountIdx = hasHeader ? header.indexOf('amount') : 3;

      for (let i = startIdx; i < lines.length; i++) {
        const cols = splitCsvLine(lines[i]);
        if (cols.length < 2) continue;
        let amount = 0;
        if (outflowIdx >= 0 || inflowIdx >= 0) {
          const outMilli = outflowIdx >= 0 ? Math.abs(parseAmountToMilliunits(cols[outflowIdx] || '')) : 0;
          const inMilli = inflowIdx >= 0 ? Math.abs(parseAmountToMilliunits(cols[inflowIdx] || '')) : 0;
          amount = inMilli - outMilli;
        } else if (amountIdx >= 0) {
          amount = parseAmountToMilliunits(cols[amountIdx] || '0');
        }
        rawRows.push({
          date: normalizeDateString(cols[dateIdx >= 0 ? dateIdx : 0] || ''),
          payeeName: (cols[payeeIdx >= 0 ? payeeIdx : 1] || '').trim() || 'Imported Payee',
          memo: (cols[memoIdx >= 0 ? memoIdx : 2] || '').trim(),
          amount,
        });
      }
    }
  }

  return rawRows.map((row, idx) => {
    const isPotentialDuplicate = existingTransactions.some(
      (t) =>
        (!targetAccountId || t.accountId === targetAccountId) &&
        t.date === row.date &&
        t.amount === row.amount
    );
    return {
      id: `imp-${Date.now()}-${idx}`,
      ...row,
      selected: !isPotentialDuplicate,
      isPotentialDuplicate,
    };
  });
}

export function buildImportedTransactions(
  rows: ParsedImportRow[],
  targetAccount: AccountItem
): TransactionItem[] {
  return rows
    .filter((r) => r.selected)
    .map((r) => ({
      entityId: `tx-imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      accountId: targetAccount.entityId,
      accountName: targetAccount.accountName,
      date: r.date,
      payeeName: r.payeeName,
      subCategoryId: 'needs-category',
      subCategoryName: 'This needs a category',
      memo: r.memo,
      amount: r.amount,
      cleared: 'uncleared',
      needsApproved: true,
    }));
}
