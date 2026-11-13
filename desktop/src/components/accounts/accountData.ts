export interface SubTransactionItem {
  entityId: string;
  parentTransactionId: string;
  subCategoryId?: string;
  subCategoryName?: string;
  memo?: string;
  amount: number; // milliunits: negative for outflow, positive for inflow
}

export interface TransactionItem {
  entityId: string;
  accountId: string;
  accountName: string;
  date: string; // YYYY-MM-DD
  payeeId?: string;
  payeeName: string;
  subCategoryId?: string;
  subCategoryName: string;
  memo: string;
  amount: number; // milliunits: negative for outflow, positive for inflow
  cleared: 'cleared' | 'uncleared' | 'reconciled';
  flag?: string | null; // red, orange, yellow, green, blue, purple
  isChecked?: boolean;
  isEditing?: boolean;
  isSplit?: boolean;
  isCollapsed?: boolean;
  subTransactions?: SubTransactionItem[];
  isPending?: boolean;
  needsApproved?: boolean;
  isRepeating?: boolean;
  transferAccountId?: string;
}

export const INITIAL_TRANSACTIONS: TransactionItem[] = [];
