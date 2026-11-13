/**
 * Data engine & filter calculations for Reflect / Reports module (100% milliunits)
 */
import { INITIAL_TRANSACTIONS, TransactionItem } from '../accounts/accountData';
import { INITIAL_CATEGORY_GROUPS, MasterCategoryGroup } from '../budget/budgetData';

export type TimeframePreset =
  | 'thisMonth'
  | 'latest3Months'
  | 'latest6Months'
  | 'latest12Months'
  | 'thisYear'
  | 'lastYear'
  | 'allDates'
  | 'custom';

export interface TimeframeState {
  preset: TimeframePreset;
  startYear: number;
  startMonth: number; // 0-indexed (0 = Jan, 11 = Dec)
  endYear: number;
  endMonth: number; // 0-indexed
}

export interface SpendingItem {
  id: string;
  name: string;
  amount: number; // positive milliunits for display
  rawAmount: number; // milliunits from transactions (negative for outflow)
  percentage: number;
  color: string;
  entityIds: string[];
  isHidden?: boolean;
  isPositiveInflow?: boolean;
}

export interface SpendingGroupItem {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
  entityIds: string[];
  categories: SpendingItem[];
}

export interface NetWorthMonthPoint {
  month: string; // "Jan 2024"
  dateKey: string; // "2024-01-01"
  debts: number; // positive milliunits
  assets: number; // positive milliunits
  netWorth: number; // signed milliunits (assets - debts)
  change: number; // signed change from previous month
  increased: boolean;
}

// 10 top colors defined in YNAB's CSS: --reportsSpendingBreakdownTop1..10
export const SPENDING_COLORS = [
  '#545bfe', // Top 1: SPBlurple500
  '#93d53e', // Top 2: SPFirefly500
  '#f6c91d', // Top 3: SPDandelion500
  '#ce5e66', // Top 4: Mulberry
  '#7583ff', // Top 5: SPBlurple400
  '#aee865', // Top 6: SPFirefly400
  '#f8d655', // Top 7: SPDandelion400
  '#e48585', // Top 8: Pink/Salmon
  '#a3acff', // Top 9: SPBlurple300
  '#c2f680', // Top 10: SPFirefly300
  '#d4d5ff', // Everything Else: SPBlurple200
];

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function formatMilliunits(milliunits: number, showSign = false): string {
  const isNegative = milliunits < 0;
  const abs = Math.abs(milliunits) / 1000;
  const formatted = abs.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  if (isNegative) return `-$${formatted.slice(1)}`;
  if (showSign && milliunits > 0) return `+$${formatted.slice(1)}`;
  return formatted;
}

// Initial full multi-month transaction history fixture
export const REFLECT_HISTORICAL_TRANSACTIONS: TransactionItem[] = [
  ...INITIAL_TRANSACTIONS,
  // October 2026
  {
    entityId: 'tx-oct-1',
    accountId: 'cash-checking',
    accountName: 'Chase Checking',
    date: '2026-10-01',
    payeeName: 'Landlord Properties',
    subCategoryId: 'cat-rent',
    subCategoryName: 'Rent',
    memo: 'October Rent',
    amount: -1200000,
    cleared: 'reconciled'
  },
  {
    entityId: 'tx-oct-2',
    accountId: 'cash-checking',
    accountName: 'Chase Checking',
    date: '2026-10-05',
    payeeName: 'Electric Co',
    subCategoryId: 'cat-electric',
    subCategoryName: 'Electric',
    memo: 'Power bill Sep-Oct',
    amount: -92000,
    cleared: 'reconciled'
  },
  {
    entityId: 'tx-oct-3',
    accountId: 'cash-checking',
    accountName: 'Chase Checking',
    date: '2026-10-10',
    payeeName: 'Whole Foods Market',
    subCategoryId: 'cat-groceries',
    subCategoryName: 'Groceries',
    memo: 'Grocery shopping',
    amount: -320000,
    cleared: 'reconciled'
  },
  {
    entityId: 'tx-oct-4',
    accountId: 'credit-visa',
    accountName: 'Visa Rewards',
    date: '2026-10-15',
    payeeName: 'Target Return',
    subCategoryId: 'cat-groceries',
    subCategoryName: 'Groceries',
    memo: 'Store return refund',
    amount: 45000, // Positive inflow to spending category
    cleared: 'reconciled'
  },
  {
    entityId: 'tx-oct-5',
    accountId: 'cash-checking',
    accountName: 'Chase Checking',
    date: '2026-10-18',
    payeeName: 'City Water & Internet',
    subCategoryId: 'cat-internet',
    subCategoryName: 'Internet',
    memo: 'Monthly internet',
    amount: -65000,
    cleared: 'reconciled'
  },
  {
    entityId: 'tx-oct-6',
    accountId: 'credit-visa',
    accountName: 'Visa Rewards',
    date: '2026-10-22',
    payeeName: 'Shell Gas Station',
    subCategoryId: 'cat-gas',
    subCategoryName: 'Gas',
    memo: 'Fuel',
    amount: -85000,
    cleared: 'reconciled'
  },
  // September 2026
  {
    entityId: 'tx-sep-1',
    accountId: 'cash-checking',
    accountName: 'Chase Checking',
    date: '2026-09-01',
    payeeName: 'Landlord Properties',
    subCategoryId: 'cat-rent',
    subCategoryName: 'Rent',
    memo: 'September Rent',
    amount: -1200000,
    cleared: 'reconciled'
  },
  {
    entityId: 'tx-sep-2',
    accountId: 'credit-visa',
    accountName: 'Visa Rewards',
    date: '2026-09-12',
    payeeName: 'Whole Foods Market',
    subCategoryId: 'cat-groceries',
    subCategoryName: 'Groceries',
    memo: 'Food and pantry',
    amount: -410000,
    cleared: 'reconciled'
  },
  {
    entityId: 'tx-sep-3',
    accountId: 'cash-checking',
    accountName: 'Chase Checking',
    date: '2026-09-15',
    payeeName: 'Utility Rebate Dept',
    subCategoryId: 'cat-electric',
    subCategoryName: 'Electric',
    memo: 'Energy efficiency rebate',
    amount: 25000, // Positive inflow
    cleared: 'reconciled'
  },
  {
    entityId: 'tx-sep-4',
    accountId: 'cash-checking',
    accountName: 'Chase Checking',
    date: '2026-09-20',
    payeeName: 'Shell Gas Station',
    subCategoryId: 'cat-gas',
    subCategoryName: 'Gas',
    memo: 'Gas',
    amount: -90000,
    cleared: 'reconciled'
  },
  // August 2026
  {
    entityId: 'tx-aug-1',
    accountId: 'cash-checking',
    accountName: 'Chase Checking',
    date: '2026-08-01',
    payeeName: 'Landlord Properties',
    subCategoryId: 'cat-rent',
    subCategoryName: 'Rent',
    memo: 'August Rent',
    amount: -1200000,
    cleared: 'reconciled'
  },
  {
    entityId: 'tx-aug-2',
    accountId: 'credit-visa',
    accountName: 'Visa Rewards',
    date: '2026-08-14',
    payeeName: 'Whole Foods Market',
    subCategoryId: 'cat-groceries',
    subCategoryName: 'Groceries',
    memo: 'Groceries',
    amount: -390000,
    cleared: 'reconciled'
  },
  {
    entityId: 'tx-aug-3',
    accountId: 'cash-checking',
    accountName: 'Chase Checking',
    date: '2026-08-28',
    payeeName: 'Electric Co',
    subCategoryId: 'cat-electric',
    subCategoryName: 'Electric',
    memo: 'Summer AC electric bill',
    amount: -145000,
    cleared: 'reconciled'
  }
];

// Rich 24-month Net Worth History fixture (supports negative net worth turning positive)
export const REFLECT_NET_WORTH_FULL_HISTORY: NetWorthMonthPoint[] = [
  { month: 'Jan 2025', dateKey: '2025-01-01', debts: 24500000, assets: 12000000, netWorth: -12500000, change: 1500000, increased: true },
  { month: 'Feb 2025', dateKey: '2025-02-01', debts: 23200000, assets: 13500000, netWorth: -9700000, change: 2800000, increased: true },
  { month: 'Mar 2025', dateKey: '2025-03-01', debts: 22000000, assets: 15000000, netWorth: -7000000, change: 2700000, increased: true },
  { month: 'Apr 2025', dateKey: '2025-04-01', debts: 20500000, assets: 17200000, netWorth: -3300000, change: 3700000, increased: true },
  { month: 'May 2025', dateKey: '2025-05-01', debts: 19100000, assets: 19800000, netWorth: 700000, change: 4000000, increased: true },
  { month: 'Jun 2025', dateKey: '2025-06-01', debts: 18000000, assets: 22500000, netWorth: 4500000, change: 3800000, increased: true },
  { month: 'Jul 2025', dateKey: '2025-07-01', debts: 17200000, assets: 25100000, netWorth: 7900000, change: 3400000, increased: true },
  { month: 'Aug 2025', dateKey: '2025-08-01', debts: 16500000, assets: 28000000, netWorth: 11500000, change: 3600000, increased: true },
  { month: 'Sep 2025', dateKey: '2025-09-01', debts: 15800000, assets: 31000000, netWorth: 15200000, change: 3700000, increased: true },
  { month: 'Oct 2025', dateKey: '2025-10-01', debts: 15000000, assets: 34200000, netWorth: 19200000, change: 4000000, increased: true },
  { month: 'Nov 2025', dateKey: '2025-11-01', debts: 14400000, assets: 37500000, netWorth: 23100000, change: 3900000, increased: true },
  { month: 'Dec 2025', dateKey: '2025-12-01', debts: 13900000, assets: 41000000, netWorth: 27100000, change: 4000000, increased: true },
  { month: 'Jan 2026', dateKey: '2026-01-01', debts: 13500000, assets: 48000000, netWorth: 34500000, change: 7400000, increased: true },
  { month: 'Feb 2026', dateKey: '2026-02-01', debts: 13000000, assets: 49500000, netWorth: 36500000, change: 2000000, increased: true },
  { month: 'Mar 2026', dateKey: '2026-03-01', debts: 12800000, assets: 50200000, netWorth: 37400000, change: 900000, increased: true },
  { month: 'Apr 2026', dateKey: '2026-04-01', debts: 12400000, assets: 51800000, netWorth: 39400000, change: 2000000, increased: true },
  { month: 'May 2026', dateKey: '2026-05-01', debts: 12100000, assets: 52750000, netWorth: 40650000, change: 1250000, increased: true },
  { month: 'Jun 2026', dateKey: '2026-06-01', debts: 11700000, assets: 54200000, netWorth: 42500000, change: 1850000, increased: true },
  { month: 'Jul 2026', dateKey: '2026-07-01', debts: 11300000, assets: 55600000, netWorth: 44300000, change: 1800000, increased: true },
  { month: 'Aug 2026', dateKey: '2026-08-01', debts: 10900000, assets: 56900000, netWorth: 46000000, change: 1700000, increased: true },
  { month: 'Sep 2026', dateKey: '2026-09-01', debts: 10400000, assets: 58200000, netWorth: 47800000, change: 1800000, increased: true },
  { month: 'Oct 2026', dateKey: '2026-10-01', debts: 9800000, assets: 59500000, netWorth: 49700000, change: 1900000, increased: true },
  { month: 'Nov 2026', dateKey: '2026-11-01', debts: 9200000, assets: 61000000, netWorth: 51800000, change: 2100000, increased: true }
];

// Rich 24-month Age of Money History fixture
export const REFLECT_AOM_FULL_HISTORY = [
  { date: 'Dec 2024', age: 28 },
  { date: 'Jan 2025', age: 31 },
  { date: 'Feb 2025', age: 33 },
  { date: 'Mar 2025', age: 34 },
  { date: 'Apr 2025', age: 36 },
  { date: 'May 2025', age: 38 },
  { date: 'Jun 2025', age: 39 },
  { date: 'Jul 2025', age: 41 },
  { date: 'Aug 2025', age: 42 },
  { date: 'Sep 2025', age: 43 },
  { date: 'Oct 2025', age: 44 },
  { date: 'Nov 2025', age: 45 },
  { date: 'Dec 2025', age: 46 },
  { date: 'Jan 2026', age: 46 },
  { date: 'Feb 2026', age: 47 },
  { date: 'Mar 2026', age: 47 },
  { date: 'Apr 2026', age: 48 },
  { date: 'May 2026', age: 48 },
  { date: 'Jun 2026', age: 49 },
  { date: 'Jul 2026', age: 49 },
  { date: 'Aug 2026', age: 50 },
  { date: 'Sep 2026', age: 51 },
  { date: 'Oct 2026', age: 52 },
  { date: 'Nov 2026', age: 53 }
];


export function calculateTimeframeDates(
  preset: TimeframePreset,
  baseYear = 2026,
  baseMonth = 10
): { startYear: number; startMonth: number; endYear: number; endMonth: number } {
  let startYear = baseYear;
  let startMonth = baseMonth;
  const endYear = baseYear;
  const endMonth = baseMonth;

  switch (preset) {
    case 'thisMonth':
      startYear = baseYear;
      startMonth = baseMonth;
      break;
    case 'latest3Months':
      startMonth = baseMonth - 2;
      if (startMonth < 0) {
        startMonth += 12;
        startYear -= 1;
      }
      break;
    case 'latest6Months':
      startMonth = baseMonth - 5;
      if (startMonth < 0) {
        startMonth += 12;
        startYear -= 1;
      }
      break;
    case 'latest12Months':
      startMonth = baseMonth - 11;
      if (startMonth < 0) {
        startMonth += 12;
        startYear -= 1;
      }
      break;
    case 'thisYear':
      startYear = baseYear;
      startMonth = 0;
      break;
    case 'lastYear':
      return { startYear: baseYear - 1, startMonth: 0, endYear: baseYear - 1, endMonth: 11 };
    case 'allDates':
      return { startYear: 2024, startMonth: 0, endYear: baseYear, endMonth: baseMonth };
  }
  return { startYear, startMonth, endYear, endMonth };
}

export function formatTimeframeLabel(state: TimeframeState): string {
  const { startYear, startMonth, endYear, endMonth } = state;
  const startStr = `${MONTH_NAMES[startMonth]} ${startYear}`;
  const endStr = `${MONTH_NAMES[endMonth]} ${endYear}`;
  if (startYear === endYear && startMonth === endMonth) {
    return startStr;
  }
  return `${startStr} - ${endStr}`;
}

export function filterTransactionsByDateAndFilters(
  transactions: TransactionItem[],
  timeframe: TimeframeState,
  selectedCategoryIds: Set<string>,
  selectedAccountIds: Set<string>
): TransactionItem[] {
  const startKey = `${timeframe.startYear}-${String(timeframe.startMonth + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(timeframe.endYear, timeframe.endMonth + 1, 0).getDate();
  const endKey = `${timeframe.endYear}-${String(timeframe.endMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return transactions.filter(tx => {
    if (tx.date < startKey || tx.date > endKey) return false;
    if (selectedAccountIds.size > 0 && !selectedAccountIds.has(tx.accountId)) return false;
    if (selectedCategoryIds.size > 0 && tx.subCategoryId && !selectedCategoryIds.has(tx.subCategoryId)) return false;
    return true;
  });
}

export function exportToCSV(filename: string, rows: (string | number)[][]) {
  const csvContent = rows
    .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
