const fs = require('fs');

// 1. Update SpendingTrendsView.tsx
let st = fs.readFileSync('clone/src/components/reflect/SpendingTrendsView.tsx', 'utf8');
st = st.replace(
  /export interface SpendingTrendsProps \{[\s\S]*?isEmpty\?: boolean;\s*\}/,
  `export interface SpendingTrendsProps {
  data?: typeof SPENDING_TRENDS_DATA;
  isEmpty?: boolean;
  timeframeLabel?: string;
  onPrevTimeframe?: () => void;
  onNextTimeframe?: () => void;
  onOpenTimeframe?: () => void;
  onOpenCategories?: () => void;
  onOpenAccounts?: () => void;
  onExport?: () => void;
  onMonthClick?: (month: string) => void;
}`
);
st = st.replace(
  /export const SpendingTrendsView: React\.FC<SpendingTrendsProps> = \(\{[\s\S]*?isEmpty = false\s*\}\) => \{/,
  `export const SpendingTrendsView: React.FC<SpendingTrendsProps> = ({
  data = SPENDING_TRENDS_DATA,
  isEmpty = false,
  timeframeLabel,
  onPrevTimeframe,
  onNextTimeframe,
  onOpenTimeframe,
  onOpenCategories,
  onOpenAccounts,
  onExport,
  onMonthClick,
}) => {`
);
st = st.replace(
  '<ReflectPageHeader pageTitle="Spending Trends" />',
  '<ReflectPageHeader pageTitle="Spending Trends" onExport={onExport} />'
);
st = st.replace(
  '<ReflectFilterControls />',
  '<ReflectFilterControls timeframeLabel={timeframeLabel} onPrevTimeframe={onPrevTimeframe} onNextTimeframe={onNextTimeframe} onOpenTimeframe={onOpenTimeframe} onOpenCategories={onOpenCategories} onOpenAccounts={onOpenAccounts} />'
);
st = st.replace(
  'onClick={() => setSelectedMonth(isSelected ? null : m.month)}',
  'onClick={() => { setSelectedMonth(isSelected ? null : m.month); if (onMonthClick) onMonthClick(m.month); }}'
);
fs.writeFileSync('clone/src/components/reflect/SpendingTrendsView.tsx', st, 'utf8');
console.log('SpendingTrendsView.tsx updated.');

// 2. Update NetWorthView.tsx
let nw = fs.readFileSync('clone/src/components/reflect/NetWorthView.tsx', 'utf8');
nw = nw.replace(
  /export interface NetWorthProps \{[\s\S]*?isEmpty\?: boolean;\s*\}/,
  `export interface NetWorthProps {
  data?: typeof NET_WORTH_DATA;
  isEmpty?: boolean;
  timeframeLabel?: string;
  accountsLabel?: string;
  accountsPill?: string;
  onPrevTimeframe?: () => void;
  onNextTimeframe?: () => void;
  onOpenTimeframe?: () => void;
  onOpenAccounts?: () => void;
  onShareProgress?: () => void;
  onExport?: () => void;
  onMonthClick?: (month: string) => void;
}`
);
nw = nw.replace(
  /export const NetWorthView: React\.FC<NetWorthProps> = \(\{[\s\S]*?isEmpty = false\s*\}\) => \{/,
  `export const NetWorthView: React.FC<NetWorthProps> = ({
  data = NET_WORTH_DATA,
  isEmpty = false,
  timeframeLabel,
  accountsLabel,
  accountsPill,
  onPrevTimeframe,
  onNextTimeframe,
  onOpenTimeframe,
  onOpenAccounts,
  onShareProgress,
  onExport,
  onMonthClick,
}) => {`
);
nw = nw.replace(
  'onShareProgress={() => {}}',
  'onShareProgress={onShareProgress}'
);
nw = nw.replace(
  '<ReflectFilterControls showCategories={false} />',
  '<ReflectFilterControls showCategories={false} timeframeLabel={timeframeLabel} accountsLabel={accountsLabel} accountsPill={accountsPill} onPrevTimeframe={onPrevTimeframe} onNextTimeframe={onNextTimeframe} onOpenTimeframe={onOpenTimeframe} onOpenAccounts={onOpenAccounts} />'
);
nw = nw.replace(
  '<ReflectPageHeader\n        pageTitle="Net Worth"\n        onShareProgress={onShareProgress}\n      />',
  '<ReflectPageHeader\n        pageTitle="Net Worth"\n        onShareProgress={onShareProgress}\n        onExport={onExport}\n      />'
);
nw = nw.replace(
  'onClick={() => setSelectedMonth(isSelected ? null : row.month)}',
  'onClick={() => { setSelectedMonth(isSelected ? null : row.month); if (onMonthClick) onMonthClick(row.month); }}'
);
fs.writeFileSync('clone/src/components/reflect/NetWorthView.tsx', nw, 'utf8');
console.log('NetWorthView.tsx updated.');

// 3. Update IncomeExpenseView.tsx
let ie = fs.readFileSync('clone/src/components/reflect/IncomeExpenseView.tsx', 'utf8');
ie = ie.replace(
  /export interface IncomeExpenseProps \{[\s\S]*?data\?: typeof INCOME_EXPENSE_DATA;\s*\}/,
  `export interface IncomeExpenseProps {
  data?: typeof INCOME_EXPENSE_DATA;
  timeframeLabel?: string;
  categoriesLabel?: string;
  accountsLabel?: string;
  categoriesPill?: string;
  accountsPill?: string;
  onPrevTimeframe?: () => void;
  onNextTimeframe?: () => void;
  onOpenTimeframe?: () => void;
  onOpenCategories?: () => void;
  onOpenAccounts?: () => void;
  onExport?: () => void;
  onOpenInspectModal?: (categoryName: string, month: string, amount: string) => void;
}`
);
ie = ie.replace(
  /export const IncomeExpenseView: React\.FC<IncomeExpenseProps> = \(\{[\s\S]*?data = INCOME_EXPENSE_DATA\s*\}\) => \{/,
  `export const IncomeExpenseView: React.FC<IncomeExpenseProps> = ({
  data = INCOME_EXPENSE_DATA,
  timeframeLabel,
  categoriesLabel,
  accountsLabel,
  categoriesPill,
  accountsPill,
  onPrevTimeframe,
  onNextTimeframe,
  onOpenTimeframe,
  onOpenCategories,
  onOpenAccounts,
  onExport,
  onOpenInspectModal,
}) => {`
);
ie = ie.replace(
  '<ReflectPageHeader pageTitle="Income v Expense" />',
  '<ReflectPageHeader pageTitle="Income v Expense" onExport={onExport} />'
);
ie = ie.replace(
  '<ReflectFilterControls />',
  '<ReflectFilterControls timeframeLabel={timeframeLabel} categoriesLabel={categoriesLabel} accountsLabel={accountsLabel} categoriesPill={categoriesPill} accountsPill={accountsPill} onPrevTimeframe={onPrevTimeframe} onNextTimeframe={onNextTimeframe} onOpenTimeframe={onOpenTimeframe} onOpenCategories={onOpenCategories} onOpenAccounts={onOpenAccounts} />'
);
fs.writeFileSync('clone/src/components/reflect/IncomeExpenseView.tsx', ie, 'utf8');
console.log('IncomeExpenseView.tsx updated.');

// 4. Update AgeOfMoneyView.tsx
let aom = fs.readFileSync('clone/src/components/reflect/AgeOfMoneyView.tsx', 'utf8');
aom = aom.replace(
  /export interface AgeOfMoneyProps \{[\s\S]*?isEmpty\?: boolean;\s*\}/,
  `export interface AgeOfMoneyProps {
  data?: typeof AGE_OF_MONEY_DATA;
  isEmpty?: boolean;
  onExport?: () => void;
}`
);
aom = aom.replace(
  /export const AgeOfMoneyView: React\.FC<AgeOfMoneyProps> = \(\{[\s\S]*?isEmpty = false\s*\}\) => \{/,
  `export const AgeOfMoneyView: React.FC<AgeOfMoneyProps> = ({
  data = AGE_OF_MONEY_DATA,
  isEmpty = false,
  onExport,
}) => {`
);
aom = aom.replace(
  '<ReflectPageHeader\n        pageTitle="Age of Money"\n        hideActionButtons={true}\n      />',
  '<ReflectPageHeader\n        pageTitle="Age of Money"\n        hideActionButtons={false}\n        onExport={onExport}\n      />'
);
// Make 6 Months / 1 Year / 2 Years dynamically slice points
aom = aom.replace(
  'const points = data.points;',
  'const rawPoints = data.points;\n  const points = selectedMonths === 6 ? rawPoints.slice(-6) : selectedMonths === 12 ? rawPoints.slice(-12) : rawPoints.slice(-24);'
);
// Also update chart update dependency to [isEmpty, points, selectedMonths]
aom = aom.replace(
  '}, [isEmpty, points]);',
  '}, [isEmpty, points, selectedMonths]);'
);
fs.writeFileSync('clone/src/components/reflect/AgeOfMoneyView.tsx', aom, 'utf8');
console.log('AgeOfMoneyView.tsx updated.');
