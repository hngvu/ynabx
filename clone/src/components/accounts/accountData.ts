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

export const INITIAL_TRANSACTIONS: TransactionItem[] = [
  {
    entityId: 'tx-sb-checking',
    accountId: 'acc-chase-checking',
    accountName: 'Chase Checking',
    date: '2026-10-01',
    payeeName: 'Starting Balance',
    subCategoryId: 'inflow-ready-to-assign',
    subCategoryName: 'Inflow: Ready to Assign',
    memo: 'Opening balance',
    amount: 6655870,
    cleared: 'reconciled',
  },
  {
    entityId: 'tx-sb-savings',
    accountId: 'acc-ally-savings',
    accountName: 'Ally Savings',
    date: '2026-10-01',
    payeeName: 'Starting Balance',
    subCategoryId: 'inflow-ready-to-assign',
    subCategoryName: 'Inflow: Ready to Assign',
    memo: 'Opening balance',
    amount: 7100000,
    cleared: 'reconciled',
  },
  {
    entityId: 'tx-sb-wallet',
    accountId: 'acc-wallet-cash',
    accountName: 'Wallet Cash',
    date: '2026-10-01',
    payeeName: 'Starting Balance',
    subCategoryId: 'inflow-ready-to-assign',
    subCategoryName: 'Inflow: Ready to Assign',
    memo: 'Opening balance',
    amount: 51370,
    cleared: 'reconciled',
  },
  {
    entityId: 'tx-sb-visa',
    accountId: 'acc-visa-rewards',
    accountName: 'Visa Rewards',
    date: '2026-10-01',
    payeeName: 'Starting Balance',
    subCategoryId: 'inflow-ready-to-assign',
    subCategoryName: 'Inflow: Ready to Assign',
    memo: 'Opening balance',
    amount: -32480,
    cleared: 'reconciled',
  },
  {
    entityId: 'tx-sb-vanguard',
    accountId: 'acc-vanguard-brokerage',
    accountName: 'Vanguard Brokerage',
    date: '2026-10-01',
    payeeName: 'Starting Balance',
    subCategoryId: 'category-not-needed',
    subCategoryName: 'Category not needed',
    memo: 'Opening balance',
    amount: 11200000,
    cleared: 'reconciled',
  },
  {
    entityId: 'tx-1',
    accountId: 'acc-chase-checking',
    accountName: 'Chase Checking',
    date: '2026-11-01',
    payeeName: 'Landlord Properties',
    subCategoryId: 'cat-rent',
    subCategoryName: 'Rent',
    memo: 'November Apartment Rent',
    amount: -1200000,
    cleared: 'reconciled',
  },
  {
    entityId: 'tx-2',
    accountId: 'acc-chase-checking',
    accountName: 'Chase Checking',
    date: '2026-11-03',
    payeeName: 'Electric Co',
    subCategoryId: 'cat-electric',
    subCategoryName: 'Electric',
    memo: 'Power bill Oct-Nov',
    amount: -95000,
    cleared: 'cleared',
    isRepeating: true,
  },
  {
    entityId: 'tx-3',
    accountId: 'acc-chase-checking',
    accountName: 'Chase Checking',
    date: '2026-11-04',
    payeeName: 'Target Supercenter',
    subCategoryId: 'split',
    subCategoryName: 'Split (Multiple Categories)...',
    memo: 'Supplies & Groceries',
    amount: -85000,
    cleared: 'cleared',
    isSplit: true,
    isCollapsed: false,
    subTransactions: [
      {
        entityId: 'sub-tx-3-1',
        parentTransactionId: 'tx-3',
        subCategoryId: 'cat-groceries',
        subCategoryName: 'Groceries',
        memo: 'Snacks and pantry items',
        amount: -55000,
      },
      {
        entityId: 'sub-tx-3-2',
        parentTransactionId: 'tx-3',
        subCategoryId: 'cat-household',
        subCategoryName: 'Household Supplies',
        memo: 'Cleaning supplies',
        amount: -30000,
      },
    ],
  },
  {
    entityId: 'tx-4',
    accountId: 'acc-chase-checking',
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
    accountId: 'acc-visa-rewards',
    accountName: 'Visa Rewards',
    date: '2026-11-07',
    payeeName: 'Whole Foods Market',
    subCategoryId: 'cat-groceries',
    subCategoryName: 'Groceries',
    memo: 'Weekly grocery run',
    amount: -145000,
    cleared: 'cleared',
  },
  {
    entityId: 'tx-6',
    accountId: 'acc-visa-rewards',
    accountName: 'Visa Rewards',
    date: '2026-11-09',
    payeeName: 'Shell Gas Station',
    subCategoryId: 'cat-gas',
    subCategoryName: 'Gas',
    memo: 'Fuel up',
    amount: -110000,
    cleared: 'uncleared',
  },
  {
    entityId: 'tx-7',
    accountId: 'acc-chase-checking',
    accountName: 'Chase Checking',
    date: '2026-11-10',
    payeeName: 'Transfer : Visa Rewards',
    subCategoryId: 'category-not-needed',
    subCategoryName: 'Category not needed',
    memo: 'Monthly CC Payment',
    amount: -260000,
    cleared: 'cleared',
    transferAccountId: 'acc-visa-rewards',
  },
  {
    entityId: 'tx-7-visa',
    accountId: 'acc-visa-rewards',
    accountName: 'Visa Rewards',
    date: '2026-11-10',
    payeeName: 'Transfer : Chase Checking',
    subCategoryId: 'category-not-needed',
    subCategoryName: 'Category not needed',
    memo: 'Monthly CC Payment',
    amount: 260000,
    cleared: 'cleared',
    transferAccountId: 'acc-chase-checking',
  },
];
