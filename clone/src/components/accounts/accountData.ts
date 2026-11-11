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
}

export const INITIAL_TRANSACTIONS: TransactionItem[] = [
  {
    entityId: 'tx-1',
    accountId: 'cash-checking',
    accountName: 'Chase Checking',
    date: '2026-11-01',
    payeeName: 'Landlord Properties',
    subCategoryId: 'bills-rent',
    subCategoryName: 'Bills: Rent',
    memo: 'November Apartment Rent',
    amount: -1200000,
    cleared: 'reconciled',
  },
  {
    entityId: 'tx-2',
    accountId: 'cash-checking',
    accountName: 'Chase Checking',
    date: '2026-11-03',
    payeeName: 'Electric Co',
    subCategoryId: 'bills-electric',
    subCategoryName: 'Bills: Electric',
    memo: 'Power bill Oct-Nov',
    amount: -95000,
    cleared: 'cleared',
  },
  {
    entityId: 'tx-3',
    accountId: 'cash-checking',
    accountName: 'Chase Checking',
    date: '2026-11-04',
    payeeName: 'City Water & Internet',
    subCategoryId: 'bills-internet',
    subCategoryName: 'Bills: Internet',
    memo: 'Fios Gigabit Fiber',
    amount: -65000,
    cleared: 'cleared',
  },
  {
    entityId: 'tx-4',
    accountId: 'cash-checking',
    accountName: 'Chase Checking',
    date: '2026-11-05',
    payeeName: 'Employer Payroll',
    subCategoryId: 'inflow-ready-to-assign',
    subCategoryName: 'Inflow: Ready to Assign',
    memo: 'Bi-weekly Direct Deposit',
    amount: 2500000,
    cleared: 'cleared',
  },
  {
    entityId: 'tx-5',
    accountId: 'credit-visa',
    accountName: 'Visa Rewards',
    date: '2026-11-07',
    payeeName: 'Whole Foods Market',
    subCategoryId: 'needs-groceries',
    subCategoryName: 'Needs: Groceries',
    memo: 'Weekly grocery run',
    amount: -150000,
    cleared: 'cleared',
  },
  {
    entityId: 'tx-6',
    accountId: 'credit-visa',
    accountName: 'Visa Rewards',
    date: '2026-11-09',
    payeeName: 'Shell Gas Station',
    subCategoryId: 'needs-gas',
    subCategoryName: 'Needs: Gas',
    memo: 'Fuel up',
    amount: -110000,
    cleared: 'uncleared',
  },
];
