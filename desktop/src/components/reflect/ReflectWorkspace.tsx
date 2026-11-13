import React, { useState, useMemo } from 'react';
import { ReflectNavigationHeader } from './ReflectNavigationHeader';
import { SpendingBreakdownView } from './SpendingBreakdownView';
import { SpendingTrendsView } from './SpendingTrendsView';
import { NetWorthView } from './NetWorthView';
import { IncomeExpenseView } from './IncomeExpenseView';
import { AgeOfMoneyView } from './AgeOfMoneyView';
import { InflowWarningModal } from './modals/InflowWarningModal';
import { TimeframeDropdownModal } from './modals/TimeframeDropdownModal';
import { FilterItemsModal } from './modals/FilterItemsModal';
import { ActivityTransactionsModal } from './modals/ActivityTransactionsModal';
import { ExportReportsModal } from './modals/ExportReportsModal';
import { ChartImageExporterModal } from './modals/ChartImageExporterModal';

import {
  TimeframeState,
  TimeframePreset,
  calculateTimeframeDates,
  formatTimeframeLabel,
  formatMilliunits,
  filterTransactionsByDateAndFilters,
  exportToCSV,
  REFLECT_HISTORICAL_TRANSACTIONS,
  REFLECT_NET_WORTH_FULL_HISTORY,
  REFLECT_AOM_FULL_HISTORY,
  SPENDING_COLORS,
  SpendingItem,
  SpendingGroupItem,
  NetWorthMonthPoint,
} from './reflectDataEngine';
import { INITIAL_CATEGORY_GROUPS } from '../budget/budgetData';
import { TransactionItem } from '../accounts/accountData';
import { AccountItem } from '../sidebar/NavAccountRow';
import { getAccounts } from '../../api/tauriBridge';

// Initial list of user accounts
const INITIAL_ACCOUNTS: AccountItem[] = [];

export const ReflectWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'spending-breakdown' | 'spending-trends' | 'net-worth' | 'income-expense' | 'age-of-money'
  >('spending-breakdown');

  // Timeframe state (Default: Nov 2026 - thisMonth)
  const [timeframeState, setTimeframeState] = useState<TimeframeState>({
    preset: 'thisMonth',
    startYear: 2026,
    startMonth: 10, // November
    endYear: 2026,
    endMonth: 10,
  });

  // Filters state
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());

  // Spending Breakdown drill-down state
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Modals state
  const [isTimeframeModalOpen, setIsTimeframeModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [isInflowModalOpen, setIsInflowModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [transactionsModalData, setTransactionsModalData] = useState<{
    isOpen: boolean;
    title: string;
    transactions: TransactionItem[];
  }>({
    isOpen: false,
    title: '',
    transactions: [],
  });

  // Timeframe navigation
  const handlePrevTimeframe = () => {
    setTimeframeState((prev) => {
      let { startYear, startMonth, endYear, endMonth } = prev;
      const monthDiff = (endYear - startYear) * 12 + (endMonth - startMonth);
      startMonth -= 1;
      if (startMonth < 0) {
        startMonth = 11;
        startYear -= 1;
      }
      endMonth -= 1;
      if (endMonth < 0) {
        endMonth = 11;
        endYear -= 1;
      }
      return {
        preset: 'custom',
        startYear,
        startMonth,
        endYear,
        endMonth,
      };
    });
  };

  const handleNextTimeframe = () => {
    // Current upper bound is Nov 2026
    if (timeframeState.endYear >= 2026 && timeframeState.endMonth >= 10) return;

    setTimeframeState((prev) => {
      let { startYear, startMonth, endYear, endMonth } = prev;
      startMonth += 1;
      if (startMonth > 11) {
        startMonth = 0;
        startYear += 1;
      }
      endMonth += 1;
      if (endMonth > 11) {
        endMonth = 0;
        endYear += 1;
      }
      return {
        preset: 'custom',
        startYear,
        startMonth,
        endYear,
        endMonth,
      };
    });
  };

  const isLatestMonth = timeframeState.endYear >= 2026 && timeframeState.endMonth >= 10;
  const isOldestMonth = timeframeState.startYear <= 2024 && timeframeState.startMonth <= 0;

  const handleSelectPreset = (preset: TimeframePreset) => {
    const dates = calculateTimeframeDates(preset, 2026, 10);
    setTimeframeState({
      preset,
      ...dates,
    });
  };

  const handleApplyCustomTimeframe = (
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number
  ) => {
    setTimeframeState({
      preset: 'custom',
      startYear,
      startMonth,
      endYear,
      endMonth,
    });
  };

  // Filter labels and badge pills
  const totalCategoryCount = INITIAL_CATEGORY_GROUPS.reduce(
    (sum, g) => sum + g.categories.length,
    0
  );
  const categoriesPill =
    selectedCategoryIds.size > 0 && selectedCategoryIds.size < totalCategoryCount
      ? `${selectedCategoryIds.size} of ${totalCategoryCount}`
      : undefined;

  const totalAccountCount = INITIAL_ACCOUNTS.length;
  const accountsPill =
    selectedAccountIds.size > 0 && selectedAccountIds.size < totalAccountCount
      ? `${selectedAccountIds.size} of ${totalAccountCount}`
      : undefined;

  const timeframeLabel = formatTimeframeLabel(timeframeState);

  // Filter transactions for current view
  const currentFilteredTransactions = useMemo(() => {
    return filterTransactionsByDateAndFilters(
      REFLECT_HISTORICAL_TRANSACTIONS,
      timeframeState,
      selectedCategoryIds,
      selectedAccountIds
    );
  }, [timeframeState, selectedCategoryIds, selectedAccountIds]);

  // Compute Spending Breakdown data from filtered transactions
  const computedSpendingBreakdown = useMemo(() => {
    // Separate outflows and positive inflows
    const outflows: TransactionItem[] = [];
    const inflows: TransactionItem[] = [];

    currentFilteredTransactions.forEach((tx) => {
      if (tx.subCategoryId) {
        // Exclude RTA from spending breakdown categories/inflows
        if (tx.subCategoryId === 'inflow-ready-to-assign' || tx.subCategoryName?.includes('Ready to Assign')) {
          return;
        }
        if (tx.amount < 0) {
          outflows.push(tx);
        } else if (tx.amount > 0) {
          inflows.push(tx);
        }
      }
    });

    // Group outflows by category
    const categoryMap: Record<
      string,
      { id: string; name: string; amount: number; count: number; groupName: string }
    > = {};

    INITIAL_CATEGORY_GROUPS.forEach((grp) => {
      grp.categories.forEach((cat) => {
        categoryMap[cat.entityId] = {
          id: cat.entityId,
          name: cat.name,
          amount: 0,
          count: 0,
          groupName: grp.name,
        };
      });
    });

    outflows.forEach((tx) => {
      if (tx.subCategoryId && categoryMap[tx.subCategoryId]) {
        categoryMap[tx.subCategoryId].amount += Math.abs(tx.amount);
        categoryMap[tx.subCategoryId].count += 1;
      }
    });

    // Total Spending
    let totalSpending = 0;
    const catList = Object.values(categoryMap).filter((c) => c.amount > 0);

    // If drill-down selectedGroup is active, filter only that group
    const displayList = selectedGroup
      ? catList.filter((c) => c.groupName === selectedGroup)
      : catList;

    displayList.forEach((c) => {
      totalSpending += c.amount;
    });

    // Sort descending
    displayList.sort((a, b) => b.amount - a.amount);

    const items: (SpendingItem & { formattedAmount: string; formattedPercentage: string })[] = displayList.map((c, idx) => {
      const pct = totalSpending > 0 ? (c.amount / totalSpending) * 100 : 0;
      return {
        id: c.id,
        name: c.name,
        amount: c.amount,
        rawAmount: -c.amount,
        percentage: pct,
        formattedAmount: formatMilliunits(c.amount),
        formattedPercentage: `${Math.round(pct)}%`,
        color: SPENDING_COLORS[idx % SPENDING_COLORS.length],
        entityIds: [c.id],
      };
    });

    // Group aggregates
    const groupTotals: Record<string, { id: string; name: string; amount: number; count: number }> = {};
    catList.forEach((c) => {
      if (!groupTotals[c.groupName]) {
        groupTotals[c.groupName] = { id: c.groupName, name: c.groupName, amount: 0, count: 0 };
      }
      groupTotals[c.groupName].amount += c.amount;
      groupTotals[c.groupName].count += c.count;
    });

    const groupsList = Object.values(groupTotals).sort((a, b) => b.amount - a.amount);
    const groupItems: (SpendingGroupItem & { formattedAmount: string; formattedPercentage: string })[] = groupsList.map((g, idx) => {
      const pct = totalSpending > 0 ? (g.amount / totalSpending) * 100 : 0;
      return {
        id: g.id,
        name: g.name,
        amount: g.amount,
        percentage: pct,
        formattedAmount: formatMilliunits(g.amount),
        formattedPercentage: `${Math.round(pct)}%`,
        color: SPENDING_COLORS[idx % SPENDING_COLORS.length],
        entityIds: [g.id],
        categories: [],
      };
    });

    // Inflow items
    let totalInflowAmount = 0;
    const positiveInflows = inflows.map((tx) => {
      totalInflowAmount += tx.amount;
      return {
        id: tx.entityId,
        name: tx.subCategoryName || tx.payeeName || 'Inflow',
        category: tx.subCategoryName || 'Inflow',
        amount: tx.amount,
        formattedAmount: formatMilliunits(tx.amount),
      };
    });

    // Metrics
    const monthsCount =
      (timeframeState.endYear - timeframeState.startYear) * 12 +
      (timeframeState.endMonth - timeframeState.startMonth) +
      1;
    const avgMonthly = totalSpending / (monthsCount || 1);
    const avgDaily = totalSpending / (monthsCount * 30 || 1);

    const mostFrequent =
      catList.length > 0
        ? [...catList].sort((a, b) => b.count - a.count)[0]
        : { name: 'None', count: 0 };
    const largestOutflow =
      outflows.length > 0
        ? [...outflows].sort((a, b) => a.amount - b.amount)[0]
        : null;

    return {
      totalSpending,
      formattedTotalSpending: formatMilliunits(totalSpending),
      totalPositiveInflows: totalInflowAmount,
      formattedTotalPositiveInflows: formatMilliunits(totalInflowAmount, true),
      items: selectedGroup ? items : (items.length > 0 ? items : []),
      groupItems,
      positiveInflows,
      timeframeLabel,
      groupName: selectedGroup,
      monthlyAverage: formatMilliunits(avgMonthly),
      dailyAverage: formatMilliunits(avgDaily),
      mostFrequent: {
        name: mostFrequent?.name || 'None',
        count: mostFrequent?.count ? `${mostFrequent.count} transactions` : undefined,
      },
      largestOutflow: {
        name: largestOutflow?.payeeName || 'None',
        amount: largestOutflow ? formatMilliunits(Math.abs(largestOutflow.amount)) : undefined,
      },
    };
  }, [currentFilteredTransactions, selectedGroup, timeframeState, timeframeLabel]);

  // Handler for category/slice click -> opens ActivityTransactionsModal
  const handleOpenTransactionsModal = (categoryName: string) => {
    const matchingTxs = currentFilteredTransactions.filter(
      (tx) => tx.subCategoryName === categoryName
    );
    setTransactionsModalData({
      isOpen: true,
      title: categoryName,
      transactions: matchingTxs,
    });
  };

  // CSV Export handler
  const handleExportConfirm = () => {
    if (activeTab === 'spending-breakdown') {
      const rows: (string | number)[][] = [
        ['Date', 'Payee', 'Category', 'Account', 'Amount', 'Memo'],
        ...currentFilteredTransactions.map((tx) => [
          tx.date,
          tx.payeeName || '',
          tx.subCategoryName || '',
          tx.accountName || '',
          (tx.amount / 1000).toFixed(2),
          tx.memo || '',
        ]),
      ];
      exportToCSV(`spending_breakdown_${timeframeState.startYear}_${timeframeState.startMonth + 1}.csv`, rows);
    } else if (activeTab === 'net-worth') {
      const rows: (string | number)[][] = [
        ['Month', 'Debts', 'Assets', 'Net Worth', 'Change'],
        ...REFLECT_NET_WORTH_FULL_HISTORY.map((m) => [
          m.month,
          (m.debts / 1000).toFixed(2),
          (m.assets / 1000).toFixed(2),
          (m.netWorth / 1000).toFixed(2),
          (m.change / 1000).toFixed(2),
        ]),
      ];
      exportToCSV('net_worth_history.csv', rows);
    } else if (activeTab === 'age-of-money') {
      const rows: (string | number)[][] = [
        ['Month', 'Age of Money (Days)'],
        ...REFLECT_AOM_FULL_HISTORY.map((m) => [m.date, m.age]),
      ];
      exportToCSV('age_of_money.csv', rows);
    } else {
      const rows: (string | number)[][] = [
        ['Date', 'Payee', 'Category', 'Account', 'Amount'],
        ...currentFilteredTransactions.map((tx) => [
          tx.date,
          tx.payeeName || '',
          tx.subCategoryName || '',
          tx.accountName || '',
          (tx.amount / 1000).toFixed(2),
        ]),
      ];
      exportToCSV(`${activeTab}_report.csv`, rows);
    }
  };

  const isOnIncomeExpenseRoute = activeTab === 'income-expense';

  return (
    <div
      className={`reports-header-top ${!isOnIncomeExpenseRoute ? 'content-min-break' : ''}`}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <ReflectNavigationHeader activeTab={activeTab} onTabChange={setActiveTab} />

      <div
        className={`reflect-container ${isOnIncomeExpenseRoute ? 'reflect-income-expense-container' : ''}`}
        style={{ flex: 1, overflow: 'auto' }}
      >
        <div className="reflect-content">
          {activeTab === 'spending-breakdown' && (
            <SpendingBreakdownView
              data={computedSpendingBreakdown}
              conditions={{
                shouldShowBreadcrumbs: Boolean(selectedGroup),
                categoriesPill,
                accountsPill,
                disableLeftArrow: isOldestMonth,
                disableRightArrow: isLatestMonth,
                shouldShowInflowWarning: computedSpendingBreakdown.positiveInflows.length > 0,
              }}
              onSelectGroup={(grp) => setSelectedGroup(grp)}
              onClearGroup={() => setSelectedGroup(null)}
              onOpenTransactionsModal={handleOpenTransactionsModal}
              onPrevTimeframe={handlePrevTimeframe}
              onNextTimeframe={handleNextTimeframe}
              onOpenTimeframe={() => setIsTimeframeModalOpen(true)}
              onOpenCategories={() => setIsCategoriesModalOpen(true)}
              onOpenAccounts={() => setIsAccountsModalOpen(true)}
              onOpenInflowModal={() => setIsInflowModalOpen(true)}
              onExport={() => setIsExportModalOpen(true)}
            />
          )}

          {activeTab === 'spending-trends' && (
            <SpendingTrendsView
              timeframeLabel={timeframeLabel}
              onPrevTimeframe={handlePrevTimeframe}
              onNextTimeframe={handleNextTimeframe}
              onOpenTimeframe={() => setIsTimeframeModalOpen(true)}
              onOpenCategories={() => setIsCategoriesModalOpen(true)}
              onOpenAccounts={() => setIsAccountsModalOpen(true)}
              onExport={() => setIsExportModalOpen(true)}
              onMonthClick={(m) => handleOpenTransactionsModal(m)}
            />
          )}

          {activeTab === 'net-worth' && (
            <NetWorthView
              timeframeLabel={timeframeLabel}
              accountsLabel={selectedAccountIds.size > 0 ? 'Selected Accounts' : 'All Accounts'}
              accountsPill={accountsPill}
              onPrevTimeframe={handlePrevTimeframe}
              onNextTimeframe={handleNextTimeframe}
              onOpenTimeframe={() => setIsTimeframeModalOpen(true)}
              onOpenAccounts={() => setIsAccountsModalOpen(true)}
              onShareProgress={() => setIsShareModalOpen(true)}
              onExport={() => setIsExportModalOpen(true)}
            />
          )}

          {activeTab === 'income-expense' && (
            <IncomeExpenseView
              timeframeLabel={timeframeLabel}
              categoriesPill={categoriesPill}
              accountsPill={accountsPill}
              onPrevTimeframe={handlePrevTimeframe}
              onNextTimeframe={handleNextTimeframe}
              onOpenTimeframe={() => setIsTimeframeModalOpen(true)}
              onOpenCategories={() => setIsCategoriesModalOpen(true)}
              onOpenAccounts={() => setIsAccountsModalOpen(true)}
              onExport={() => setIsExportModalOpen(true)}
            />
          )}

          {activeTab === 'age-of-money' && (
            <AgeOfMoneyView onExport={() => setIsExportModalOpen(true)} />
          )}
        </div>
      </div>

      {/* Modals */}
      <TimeframeDropdownModal
        isOpen={isTimeframeModalOpen}
        onClose={() => setIsTimeframeModalOpen(false)}
        timeframeState={timeframeState}
        onSelectPreset={handleSelectPreset}
        onApplyCustom={handleApplyCustomTimeframe}
      />

      <FilterItemsModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        type="categories"
        categoryGroups={INITIAL_CATEGORY_GROUPS}
        selectedIds={selectedCategoryIds}
        onApply={(ids) => setSelectedCategoryIds(ids)}
      />

      <FilterItemsModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
        type="accounts"
        accounts={INITIAL_ACCOUNTS}
        selectedIds={selectedAccountIds}
        onApply={(ids) => setSelectedAccountIds(ids)}
      />

      <ActivityTransactionsModal
        isOpen={transactionsModalData.isOpen}
        onClose={() => setTransactionsModalData((prev) => ({ ...prev, isOpen: false }))}
        title={transactionsModalData.title}
        transactions={transactionsModalData.transactions}
      />

      <InflowWarningModal
        isOpen={isInflowModalOpen}
        onClose={() => setIsInflowModalOpen(false)}
      />

      <ExportReportsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        reportName={
          activeTab === 'spending-breakdown'
            ? 'Spending Breakdown'
            : activeTab === 'spending-trends'
            ? 'Spending Trends'
            : activeTab === 'net-worth'
            ? 'Net Worth'
            : activeTab === 'income-expense'
            ? 'Income v Expense'
            : 'Age of Money'
        }
        onExportConfirm={handleExportConfirm}
      />

      <ChartImageExporterModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        netWorthData={{
          currentNetWorth: 51800000,
          totalAssets: 61000000,
          totalDebts: 9200000,
          change: 2100000,
          percentage: 4.2,
          history: REFLECT_NET_WORTH_FULL_HISTORY,
        }}
      />
    </div>
  );
};
