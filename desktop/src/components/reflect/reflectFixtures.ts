/**
 * Fixture data and condition vectors for Reflect/Reports (all monetary values in milliunits)
 */

export interface MetricData {
  title: string;
  value: string;
  subtitle?: string;
}

export interface BarChartRowData {
  id: string;
  name: string;
  amount: number; // milliunits
  formattedAmount: string;
  percentage: number;
  color: string;
  isHidden?: boolean;
}

export interface ReflectStoryState {
  id: string;
  screen: 'spending-breakdown' | 'spending-trends' | 'net-worth' | 'income-expense' | 'age-of-money' | 'modals';
  title: string;
  description: string;
  conditions: Record<string, any>;
  data: any;
}

// Format integer milliunits (e.g. 1250000 -> "$1,250.00")
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

// 10 top colors defined in YNAB's CSS: --reportsSpendingBreakdownTop1..10
export const SPENDING_COLORS = [
  '#545bfe', // Top 1: SPBlurple500 (Tím xanh YNAB)
  '#93d53e', // Top 2: SPFirefly500 (Xanh lá mạ)
  '#f6c91d', // Top 3: SPDandelion500 (Vàng tươi)
  '#ce5e66', // Top 4: Mulberry / Đỏ san hô
  '#7583ff', // Top 5: SPBlurple400 (Tím nhạt)
  '#aee865', // Top 6: SPFirefly400 (Xanh chuối sáng)
  '#f8d655', // Top 7: SPDandelion400 (Vàng cam nhạt)
  '#e48585', // Top 8: Hồng đất nhạt
  '#a3acff', // Top 9: SPBlurple300 (Tím hoa cà)
  '#c2f680', // Top 10: SPFirefly300 (Xanh nõn chuối)
  '#d4d5ff', // Everything Else: SPBlurple200 (Xanh xám lavender)
];

export const POSITIVE_INFLOWS_FIXTURE = [
  { id: 'inflow-refund', name: 'Groceries', amount: 45000, formattedAmount: '$45.00', category: 'Groceries' },
  { id: 'inflow-rebate', name: 'Electric & Gas', amount: 25000, formattedAmount: '$25.00', category: 'Electric & Gas' }
];

export const DEFAULT_SPENDING_BREAKDOWN_DATA = {
  totalSpending: 2450500, // $2,450.50
  formattedTotalSpending: '$2,450.50',
  monthlyAverage: '$2,450.50',
  dailyAverage: '$81.68',
  mostFrequent: { name: 'Groceries', count: '14 transactions' },
  largestOutflow: { name: 'Rent / Mortgage', amount: '$1,200.00' },
  items: [
    { id: 'cat-rent', name: 'Rent / Mortgage', amount: 1200000, formattedAmount: '$1,200.00', percentage: 48.97, color: SPENDING_COLORS[0] },
    { id: 'cat-groceries', name: 'Groceries', amount: 550250, formattedAmount: '$550.25', percentage: 22.45, color: SPENDING_COLORS[1] },
    { id: 'cat-dining', name: 'Dining Out', amount: 240000, formattedAmount: '$240.00', percentage: 9.79, color: SPENDING_COLORS[2] },
    { id: 'cat-utilities', name: 'Electric & Gas', amount: 180500, formattedAmount: '$180.50', percentage: 7.37, color: SPENDING_COLORS[3] },
    { id: 'cat-internet', name: 'Internet / Phone', amount: 110000, formattedAmount: '$110.00', percentage: 4.49, color: SPENDING_COLORS[4] },
    { id: 'cat-transport', name: 'Gas / Fuel', amount: 95000, formattedAmount: '$95.00', percentage: 3.88, color: SPENDING_COLORS[5] },
    { id: 'cat-entertainment', name: 'Subscriptions', amount: 45750, formattedAmount: '$45.75', percentage: 1.87, color: SPENDING_COLORS[6] },
    { id: 'cat-coffee', name: 'Coffee Shops', amount: 29000, formattedAmount: '$29.00', percentage: 1.18, color: SPENDING_COLORS[7] }
  ],
  positiveInflows: [] as Array<{ id: string; name: string; amount: number; formattedAmount: string; category: string }>
};

export const SPENDING_BREAKDOWN_STORIES: ReflectStoryState[] = [
  {
    id: 'sb-01-default-categories',
    screen: 'spending-breakdown',
    title: 'Default Categories View',
    description: 'Standard 2-column view with donut chart, bar list, metrics and no items selected.',
    conditions: { activeTab: 'categories', singleColumn: false, selectedChartItem: null, hasPositiveInflows: false, isSyncingBackfill: false },
    data: DEFAULT_SPENDING_BREAKDOWN_DATA
  },
  {
    id: 'sb-02-groups-view',
    screen: 'spending-breakdown',
    title: 'Groups View',
    description: 'Segmented toggle set to Groups; metrics display Most Frequent Group.',
    conditions: { activeTab: 'groups', singleColumn: false, selectedChartItem: null, hasPositiveInflows: false, isSyncingBackfill: false },
    data: {
      ...DEFAULT_SPENDING_BREAKDOWN_DATA,
      mostFrequent: { name: 'Immediate Obligations', count: '18 transactions' },
      items: [
        { id: 'grp-immediate', name: 'Immediate Obligations', amount: 1490500, formattedAmount: '$1,490.50', percentage: 60.82, color: SPENDING_COLORS[0] },
        { id: 'grp-true', name: 'True Expenses', amount: 550250, formattedAmount: '$550.25', percentage: 22.45, color: SPENDING_COLORS[1] },
        { id: 'grp-quality', name: 'Quality of Life', amount: 409750, formattedAmount: '$409.75', percentage: 16.72, color: SPENDING_COLORS[2] }
      ]
    }
  },
  {
    id: 'sb-03-group-drilldown',
    screen: 'spending-breakdown',
    title: 'Group Drilldown (Breadcrumbs)',
    description: 'Drilled into a category group with breadcrumb bar (All Groups > Immediate Obligations).',
    conditions: { activeTab: 'groups', selectedGroup: 'Immediate Obligations', shouldShowBreadcrumbs: true, selectedChartItem: null },
    data: {
      ...DEFAULT_SPENDING_BREAKDOWN_DATA,
      groupName: 'Immediate Obligations',
      totalSpending: 1490500,
      formattedTotalSpending: '$1,490.50',
      positiveInflows: []
    }
  },
  {
    id: 'sb-04-slice-selected',
    screen: 'spending-breakdown',
    title: 'Selected Category Slice',
    description: 'A slice is clicked; toggle is hidden, other bar rows are dimmed with unselected-row, donut center shows details.',
    conditions: { activeTab: 'categories', selectedChartItem: 'cat-groceries' },
    data: {
      ...DEFAULT_SPENDING_BREAKDOWN_DATA,
      selectedItem: { id: 'cat-groceries', name: 'Groceries', amount: 550250, formattedAmount: '$550.25', percentage: 22.45 }
    }
  },
  {
    id: 'sb-05-slice-hovered',
    screen: 'spending-breakdown',
    title: 'Hovered Category Slice',
    description: 'Hovering a slice displays percentage in center label of Donut.',
    conditions: { activeTab: 'categories', hoveredItem: 'cat-rent' },
    data: {
      ...DEFAULT_SPENDING_BREAKDOWN_DATA,
      hoveredItem: { id: 'cat-rent', name: 'Rent / Mortgage', amount: 1200000, formattedAmount: '$1,200.00', percentage: 48.97 }
    }
  },
  {
    id: 'sb-06-everything-else',
    screen: 'spending-breakdown',
    title: 'Over 10 Categories (Everything Else + Gradient)',
    description: '13 categories so items 11+ collapse into Everything Else in Donut while showing full scrollable bar list + gradient.',
    conditions: { activeTab: 'categories', isShowingGradient: true },
    data: {
      ...DEFAULT_SPENDING_BREAKDOWN_DATA,
      items: [
        ...DEFAULT_SPENDING_BREAKDOWN_DATA.items,
        { id: 'cat-health', name: 'Health & Medical', amount: 25000, formattedAmount: '$25.00', percentage: 1.02, color: SPENDING_COLORS[8] },
        { id: 'cat-fitness', name: 'Gym Membership', amount: 20000, formattedAmount: '$20.00', percentage: 0.82, color: SPENDING_COLORS[9] },
        { id: 'cat-clothing', name: 'Clothing', amount: 15000, formattedAmount: '$15.00', percentage: 0.61, color: SPENDING_COLORS[10] },
        { id: 'cat-gifts', name: 'Gifts & Donations', amount: 12000, formattedAmount: '$12.00', percentage: 0.49, color: SPENDING_COLORS[10] },
        { id: 'cat-home', name: 'Home Maintenance', amount: 8000, formattedAmount: '$8.00', percentage: 0.33, color: SPENDING_COLORS[10] }
      ]
    }
  },
  {
    id: 'sb-07-positive-inflows-expanded',
    screen: 'spending-breakdown',
    title: 'Positive Inflows (Expanded + Inflow Warning)',
    description: 'Net inflows exist; donut has warning modal trigger and right column displays collapsible Positive Inflows card.',
    conditions: { activeTab: 'categories', hasPositiveInflows: true, shouldShowInflowWarning: true, isInflowsCollapsed: false },
    data: {
      ...DEFAULT_SPENDING_BREAKDOWN_DATA,
      positiveInflows: POSITIVE_INFLOWS_FIXTURE
    }
  },
  {
    id: 'sb-08-positive-inflows-collapsed',
    screen: 'spending-breakdown',
    title: 'Positive Inflows (Collapsed)',
    description: 'Positive Inflows card collapsed by user.',
    conditions: { activeTab: 'categories', hasPositiveInflows: true, isInflowsCollapsed: true },
    data: {
      ...DEFAULT_SPENDING_BREAKDOWN_DATA,
      positiveInflows: POSITIVE_INFLOWS_FIXTURE
    }
  },
  {
    id: 'sb-09-hidden-category-row',
    screen: 'spending-breakdown',
    title: 'Hidden Categories Row with Tooltip',
    description: 'Transactions exist in hidden categories; displays row with explanation tooltip.',
    conditions: { activeTab: 'categories', hasHiddenCategories: true },
    data: {
      ...DEFAULT_SPENDING_BREAKDOWN_DATA,
      items: [
        ...DEFAULT_SPENDING_BREAKDOWN_DATA.items.slice(0, 5),
        { id: 'hiddenCategories', name: 'Hidden Categories', amount: 80000, formattedAmount: '$80.00', percentage: 3.26, color: '#a0a0a0', isHidden: true }
      ]
    }
  },
  {
    id: 'sb-10-single-column',
    screen: 'spending-breakdown',
    title: 'Narrow Viewport (< 1004px)',
    description: 'Single-column mode where right bar chart stacks below donut chart.',
    conditions: { activeTab: 'categories', singleColumn: true },
    data: DEFAULT_SPENDING_BREAKDOWN_DATA
  },
  {
    id: 'sb-11-empty-no-transactions',
    screen: 'spending-breakdown',
    title: 'Empty State — No Transactions',
    description: 'No transactions recorded at all; donut is a grey circle and helper message appears.',
    conditions: { activeTab: 'categories', shouldShowEmptyStateMessage: true, hasNoRecordedTransactions: true },
    data: {
      totalSpending: 0,
      formattedTotalSpending: '$0.00',
      monthlyAverage: '$0.00',
      dailyAverage: '$0.00',
      mostFrequent: { name: 'n/a', count: '' },
      largestOutflow: { name: 'n/a', amount: '' },
      items: [],
      positiveInflows: []
    }
  },
  {
    id: 'sb-12-empty-filtered-out',
    screen: 'spending-breakdown',
    title: 'Empty State — Filtered Out',
    description: 'Transactions exist but filtered category/timeframe has zero spending.',
    conditions: { activeTab: 'categories', shouldShowEmptyStateMessage: false, hasNoRecordedTransactions: false, itemsEmpty: true },
    data: {
      totalSpending: 0,
      formattedTotalSpending: '$0.00',
      monthlyAverage: '$0.00',
      dailyAverage: '$0.00',
      mostFrequent: { name: 'n/a', count: '' },
      largestOutflow: { name: 'n/a', amount: '' },
      items: [],
      positiveInflows: []
    }
  },
  {
    id: 'sb-13-filter-pills',
    screen: 'spending-breakdown',
    title: 'Filter Controls with Selection Pills',
    description: 'Partial selection active for categories (3) and accounts (2).',
    conditions: { categoriesPill: '3', accountsPill: '2', disableRightArrow: true },
    data: DEFAULT_SPENDING_BREAKDOWN_DATA
  },
  {
    id: 'sb-14-syncing-backfill',
    screen: 'spending-breakdown',
    title: 'Syncing / Calculation State',
    description: 'Application is recalculating backfill; shows loading spinner and text.',
    conditions: { isSyncingBackfill: true },
    data: DEFAULT_SPENDING_BREAKDOWN_DATA
  },

  // Spending Trends
  {
    id: 'st-01-trends-populated',
    screen: 'spending-trends',
    title: 'Spending Trends — Populated',
    description: 'Stacked bar & average line chart with monthly spending comparison rows.',
    conditions: { isEmpty: false },
    data: null
  },
  {
    id: 'st-02-trends-empty',
    screen: 'spending-trends',
    title: 'Spending Trends — Empty State',
    description: 'Empty spending trends with "No spending to show yet" notification.',
    conditions: { isEmpty: true },
    data: null
  },

  // Net Worth
  {
    id: 'nw-01-net-worth-populated',
    screen: 'net-worth',
    title: 'Net Worth — Populated',
    description: 'Assets & debt bar charts, net worth line, and monthly change table.',
    conditions: { isEmpty: false },
    data: null
  },
  {
    id: 'nw-02-net-worth-empty',
    screen: 'net-worth',
    title: 'Net Worth — Empty State',
    description: 'Empty net worth summary and "No information to show" table state.',
    conditions: { isEmpty: true },
    data: null
  },

  // Income v Expense
  {
    id: 'ie-01-income-expense-populated',
    screen: 'income-expense',
    title: 'Income v Expense — Full Matrix',
    description: 'Collapsible matrix table with monthly totals, averages, and net income.',
    conditions: {},
    data: null
  },

  // Age of Money
  {
    id: 'aom-01-age-of-money-populated',
    screen: 'age-of-money',
    title: 'Age of Money — Populated',
    description: 'Timeline toggle, historical days curve, and educational card.',
    conditions: { isEmpty: false },
    data: null
  },
  {
    id: 'aom-02-age-of-money-empty',
    screen: 'age-of-money',
    title: 'Age of Money — Empty State (<10 txns)',
    description: 'Notice asking user to spend more money until 10 transactions reached.',
    conditions: { isEmpty: true },
    data: null
  }
];

export const SPENDING_TRENDS_DATA = {
  monthlyAverage: '$2,310.40',
  totalSpending: '$27,724.80',
  months: [
    { month: 'Jan 2024', total: 2150000, formattedTotal: '$2,150.00', diff: -160400, didDecrease: true, diffFormatted: '-$160.40' },
    { month: 'Feb 2024', total: 2420000, formattedTotal: '$2,420.00', diff: 109600, didIncrease: true, diffFormatted: '+$109.60' },
    { month: 'Mar 2024', total: 2280000, formattedTotal: '$2,280.00', diff: -30400, didDecrease: true, diffFormatted: '-$30.40' },
    { month: 'Apr 2024', total: 2510000, formattedTotal: '$2,510.00', diff: 199600, didIncrease: true, diffFormatted: '+$199.60' },
    { month: 'May 2024', total: 2190000, formattedTotal: '$2,190.00', diff: -120400, didDecrease: true, diffFormatted: '-$120.40' },
    { month: 'Jun 2024', total: 2300000, formattedTotal: '$2,300.00', diff: -10400, didDecrease: true, diffFormatted: '-$10.40' }
  ]
};

export const NET_WORTH_DATA = {
  currentNetWorth: 42500000, // $42,500.00
  formattedNetWorth: '$42,500.00',
  totalAssets: 54200000,
  formattedAssets: '$54,200.00',
  totalDebts: 11700000,
  formattedDebts: '-$11,700.00',
  change: 1850000,
  formattedChange: '+$1,850.00',
  didIncrease: true,
  history: [
    { month: 'Jan 2024', debts: 13500000, assets: 48000000, netWorth: 34500000, change: 1200000, increased: true },
    { month: 'Feb 2024', debts: 13000000, assets: 49500000, netWorth: 36500000, change: 2000000, increased: true },
    { month: 'Mar 2024', debts: 12800000, assets: 50200000, netWorth: 37400000, change: 900000, increased: true },
    { month: 'Apr 2024', debts: 12400000, assets: 51800000, netWorth: 39400000, change: 2000000, increased: true },
    { month: 'May 2024', debts: 12100000, assets: 52750000, netWorth: 40650000, change: 1250000, increased: true },
    { month: 'Jun 2024', debts: 11700000, assets: 54200000, netWorth: 42500000, change: 1850000, increased: true }
  ]
};

export const INCOME_EXPENSE_DATA = {
  columns: ['Jan 2024', 'Feb 2024', 'Mar 2024', 'Average', 'Total'],
  incomeGroups: [
    {
      name: 'Immediate Income',
      showChildRows: true,
      subcategories: [
        { name: 'Paycheck (Job)', amounts: ['$3,500.00', '$3,500.00', '$3,500.00', '$3,500.00', '$10,500.00'] },
        { name: 'Side Project / Freelance', amounts: ['$450.00', '$600.00', '$300.00', '$450.00', '$1,350.00'] }
      ],
      totals: ['$3,950.00', '$4,100.00', '$3,800.00', '$3,950.00', '$11,850.00']
    }
  ],
  totalIncome: ['$3,950.00', '$4,100.00', '$3,800.00', '$3,950.00', '$11,850.00'],
  expenseGroups: [
    {
      name: 'Immediate Obligations',
      showChildRows: true,
      subcategories: [
        { name: 'Rent / Mortgage', amounts: ['$1,200.00', '$1,200.00', '$1,200.00', '$1,200.00', '$3,600.00'] },
        { name: 'Groceries', amounts: ['$540.00', '$580.00', '$550.00', '$556.67', '$1,670.00'] },
        { name: 'Electric & Gas', amounts: ['$185.00', '$190.00', '$180.00', '$185.00', '$555.00'] }
      ],
      totals: ['$1,925.00', '$1,970.00', '$1,930.00', '$1,941.67', '$5,825.00']
    },
    {
      name: 'True Expenses',
      showChildRows: true,
      subcategories: [
        { name: 'Auto Maintenance', amounts: ['$50.00', '$150.00', '$0.00', '$66.67', '$200.00'] },
        { name: 'Medical', amounts: ['$45.00', '$45.00', '$45.00', '$45.00', '$135.00'] }
      ],
      totals: ['$95.00', '$195.00', '$45.00', '$111.67', '$335.00']
    }
  ],
  totalExpense: ['$2,020.00', '$2,165.00', '$1,975.00', '$2,053.33', '$6,160.00'],
  netIncome: ['$1,930.00', '$1,935.00', '$1,825.00', '$1,896.67', '$5,690.00']
};

export const AGE_OF_MONEY_DATA = {
  currentAge: 48,
  timeline: '6 Months',
  points: [
    { date: 'Jan 2024', age: 36 },
    { date: 'Feb 2024', age: 40 },
    { date: 'Mar 2024', age: 41 },
    { date: 'Apr 2024', age: 45 },
    { date: 'May 2024', age: 47 },
    { date: 'Jun 2024', age: 48 }
  ]
};
