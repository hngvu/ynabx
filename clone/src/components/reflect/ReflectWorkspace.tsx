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
  computeNetWorthReportData,
  computeSpendingTrendsReportData,
  computeIncomeExpenseReportData,
} from './reflectDataEngine';
import { INITIAL_CATEGORY_GROUPS } from '../budget/budgetData';
import { TransactionItem } from '../accounts/accountData';
import { AccountItem } from '../sidebar/NavAccountRow';

const INITIAL_ACCOUNTS: AccountItem[] = [
  { entityId: 'acc-chase-checking', accountName: 'Chase Checking', accountType: 'checking', accountCalculation: { balance: 7515870, notificationCount: 0 } },
  { entityId: 'acc-ally-savings', accountName: 'Ally Savings', accountType: 'savings', accountCalculation: { balance: 7100000, notificationCount: 0 } },
  { entityId: 'acc-wallet-cash', accountName: 'Wallet Cash', accountType: 'cash', accountCalculation: { balance: 51370, notificationCount: 0 } },
  { entityId: 'acc-visa-rewards', accountName: 'Visa Rewards', accountType: 'creditCard', accountCalculation: { balance: -27480, notificationCount: 0 } },
  { entityId: 'acc-vanguard-brokerage', accountName: 'Vanguard Brokerage', accountType: 'otherAsset', accountCalculation: { balance: 11200000, notificationCount: 0 } },
  { entityId: 'acc-car-loan', accountName: 'Car Loan', accountType: 'autoLoan', accountCalculation: { balance: -6680000, notificationCount: 0 } },
];

export interface ReflectWorkspaceProps {
  accounts?: AccountItem[];
}

export const ReflectWorkspace: React.FC<ReflectWorkspaceProps> = ({ accounts: propAccounts }) => {
  const accounts = propAccounts && propAccounts.length > 0 ? propAccounts : INITIAL_ACCOUNTS;
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

  const totalAccountCount = accounts.length;
  const accountsPill =
    selectedAccountIds.size > 0 && selectedAccountIds.size < totalAccountCount
      ? `${selectedAccountIds.size} of ${totalAccountCount}`
      : undefined;

  const timeframeLabel = formatTimeframeLabel(timeframeState);
  const [aomMonths, setAomMonths] = useState<number>(6);

  // Filter transactions for current view (Spending Breakdown)
  const currentFilteredTransactions = useMemo(() => {
    return filterTransactionsByDateAndFilters(
      REFLECT_HISTORICAL_TRANSACTIONS,
      timeframeState,
      selectedCategoryIds,
      selectedAccountIds
    );
  }, [timeframeState, selectedCategoryIds, selectedAccountIds]);

  // Multi-month reports default to Latest 6 Months when single-month "thisMonth" is active
  const multiMonthTimeframe = useMemo<TimeframeState>(() => {
    if (timeframeState.preset === 'thisMonth') {
      return { preset: 'latest6Months', startYear: 2026, startMonth: 5, endYear: 2026, endMonth: 10 };
    }
    return timeframeState;
  }, [timeframeState]);
  const multiMonthLabel = formatTimeframeLabel(multiMonthTimeframe);

  const multiMonthFilteredTransactions = useMemo(() => {
    return filterTransactionsByDateAndFilters(
      REFLECT_HISTORICAL_TRANSACTIONS,
      multiMonthTimeframe,
      selectedCategoryIds,
      selectedAccountIds
    );
  }, [multiMonthTimeframe, selectedCategoryIds, selectedAccountIds]);

  const computedSpendingTrends = useMemo(
    () => computeSpendingTrendsReportData(multiMonthFilteredTransactions, INITIAL_CATEGORY_GROUPS, multiMonthTimeframe),
    [multiMonthFilteredTransactions, multiMonthTimeframe]
  );

  const computedNetWorth = useMemo(
    () =>
      computeNetWorthReportData(
        multiMonthFilteredTransactions,
        accounts.filter((a) => selectedAccountIds.size === 0 || selectedAccountIds.has(a.entityId)),
        multiMonthTimeframe
      ),
    [multiMonthFilteredTransactions, accounts, selectedAccountIds, multiMonthTimeframe]
  );

  const computedIncomeExpense = useMemo(
    () => computeIncomeExpenseReportData(multiMonthFilteredTransactions, INITIAL_CATEGORY_GROUPS, multiMonthTimeframe),
    [multiMonthFilteredTransactions, multiMonthTimeframe]
  );

  // Compute Spending Breakdown data from filtered transactions
  const computedSpendingBreakdown = useMemo(() => {
    // Separate outflows and positive inflows
    const outflows: TransactionItem[] = [];
    const inflows: TransactionItem[] = [];

    currentFilteredTransactions.forEach((tx) => {
      if (tx.transferAccountId || tx.entityId.startsWith('tx-sb-')) return;
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
      if (tx.transferAccountId) return;
      if (tx.isSplit && tx.subTransactions && tx.subTransactions.length > 0) {
        for (const sub of tx.subTransactions) {
          if (sub.amount < 0 && sub.subCategoryId && categoryMap[sub.subCategoryId]) {
            categoryMap[sub.subCategoryId].amount += Math.abs(sub.amount);
            categoryMap[sub.subCategoryId].count += 1;
          }
        }
        return;
      }
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

    const freqSource = selectedGroup ? displayList : catList;
    const mostFrequent =
      freqSource.length > 0
        ? [...freqSource].sort((a, b) => b.count - a.count)[0]
        : { name: 'None', count: 0 };
    const mostFrequentGroup =
      groupsList.length > 0
        ? [...groupsList].sort((a, b) => b.count - a.count)[0]
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
        count: mostFrequent?.count ? `${mostFrequent.count} ${mostFrequent.count === 1 ? 'transaction' : 'transactions'}` : undefined,
      },
      mostFrequentGroup: {
        name: mostFrequentGroup?.name || 'None',
        count: mostFrequentGroup?.count ? `${mostFrequentGroup.count} ${mostFrequentGroup.count === 1 ? 'transaction' : 'transactions'}` : undefined,
      },
      largestOutflow: {
        name: largestOutflow?.payeeName || 'None',
        amount: largestOutflow ? formatMilliunits(Math.abs(largestOutflow.amount)) : undefined,
      },
    };
  }, [currentFilteredTransactions, selectedGroup, timeframeState, timeframeLabel]);

  // Handler for category/slice/month click -> opens ActivityTransactionsModal
  const handleOpenTransactionsModal = (targetName: string) => {
    // Check if targetName is a month label like "Nov 2026"
    const monthMatch = /^([A-Za-z]{3})\s+(\d{4})$/.exec(targetName.trim());
    if (monthMatch) {
      const monthIdx = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(monthMatch[1]);
      if (monthIdx !== -1) {
        const ym = `${monthMatch[2]}-${String(monthIdx + 1).padStart(2, '0')}`;
        const monthTxs = REFLECT_HISTORICAL_TRANSACTIONS.filter(
          (tx) =>
            tx.date.startsWith(ym) &&
            tx.amount < 0 &&
            !tx.transferAccountId &&
            !tx.entityId.startsWith('tx-sb-') &&
            tx.subCategoryId !== 'inflow-ready-to-assign' &&
            (selectedAccountIds.size === 0 || selectedAccountIds.has(tx.accountId))
        );
        setTransactionsModalData({
          isOpen: true,
          title: `Spending in ${targetName}`,
          transactions: monthTxs,
        });
        return;
      }
    }

    const groupMatch = INITIAL_CATEGORY_GROUPS.find((g) => g.name === targetName);
    const groupCatIds = groupMatch ? new Set(groupMatch.categories.map((c) => c.entityId)) : null;

    const matchingTxs: TransactionItem[] = [];
    for (const tx of currentFilteredTransactions) {
      if (tx.transferAccountId || tx.entityId.startsWith('tx-sb-')) continue;
      if (tx.isSplit && tx.subTransactions) {
        for (const sub of tx.subTransactions) {
          const matches = groupCatIds
            ? Boolean(sub.subCategoryId && groupCatIds.has(sub.subCategoryId))
            : sub.subCategoryName === targetName;
          if (matches) {
            matchingTxs.push({
              ...tx,
              entityId: sub.entityId,
              subCategoryId: sub.subCategoryId,
              subCategoryName: sub.subCategoryName || '',
              memo: sub.memo || tx.memo,
              amount: sub.amount,
            });
          }
        }
      } else {
        const matches = groupCatIds
          ? Boolean(tx.subCategoryId && groupCatIds.has(tx.subCategoryId))
          : tx.subCategoryName === targetName;
        if (matches) {
          matchingTxs.push(tx);
        }
      }
    }
    setTransactionsModalData({
      isOpen: true,
      title: targetName,
      transactions: matchingTxs,
    });
  };

  // CSV Export handler
  const handleExportConfirm = () => {
    if (activeTab === 'spending-breakdown' || activeTab === 'spending-trends') {
      const sourceTxs = (activeTab === 'spending-trends' ? multiMonthFilteredTransactions : currentFilteredTransactions).filter(
        (tx) => !tx.transferAccountId && !tx.entityId.startsWith('tx-sb-') && tx.subCategoryId !== 'inflow-ready-to-assign'
      );
      const rows: (string | number)[][] = [
        ['Date', 'Payee', 'Category', 'Account', 'Amount', 'Memo'],
        ...sourceTxs.map((tx) => [
          tx.date,
          tx.payeeName || '',
          tx.subCategoryName || '',
          tx.accountName || '',
          (tx.amount / 1000).toFixed(2),
          tx.memo || '',
        ]),
      ];
      exportToCSV(`${activeTab}_${timeframeState.startYear}_${timeframeState.startMonth + 1}.csv`, rows);
    } else if (activeTab === 'net-worth') {
      const rows: (string | number)[][] = [
        ['Month', 'Debts', 'Assets', 'Net Worth', 'Change'],
        ...computedNetWorth.history.map((m) => [
          m.month,
          (m.debts / 1000).toFixed(2),
          (m.assets / 1000).toFixed(2),
          (m.netWorth / 1000).toFixed(2),
          (m.change / 1000).toFixed(2),
        ]),
      ];
      exportToCSV('net_worth_history.csv', rows);
    } else if (activeTab === 'age-of-money') {
      const slicedAom = REFLECT_AOM_FULL_HISTORY.slice(-aomMonths);
      const rows: (string | number)[][] = [
        ['Month', 'Age of Money (Days)'],
        ...slicedAom.map((m) => [m.date, m.age]),
      ];
      exportToCSV('age_of_money.csv', rows);
    } else if (activeTab === 'income-expense') {
      const rows: (string | number)[][] = [
        ['Category', ...computedIncomeExpense.columns],
        ...computedIncomeExpense.incomeGroups.flatMap((g) => [
          [g.name, ...g.totals],
          ...g.subcategories.map((s) => [`  ${s.name}`, ...s.amounts]),
        ]),
        ['Total Income', ...computedIncomeExpense.totalIncome],
        ...computedIncomeExpense.expenseGroups.flatMap((g) => [
          [g.name, ...g.totals],
          ...g.subcategories.map((s) => [`  ${s.name}`, ...s.amounts]),
        ]),
        ['Total Expenses', ...computedIncomeExpense.totalExpense],
        ['Net Income', ...computedIncomeExpense.netIncome],
      ];
      exportToCSV('income_v_expense.csv', rows);
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
        style={{ flex: 1, overflowY: 'auto', overflowX: isOnIncomeExpenseRoute ? 'auto' : 'hidden' }}
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
              timeframeLabel={multiMonthLabel}
              data={computedSpendingTrends}
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
              timeframeLabel={multiMonthLabel}
              accountsLabel={selectedAccountIds.size > 0 ? 'Selected Accounts' : 'All Accounts'}
              accountsPill={accountsPill}
              data={computedNetWorth}
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
              timeframeLabel={multiMonthLabel}
              categoriesPill={categoriesPill}
              accountsPill={accountsPill}
              data={computedIncomeExpense}
              onPrevTimeframe={handlePrevTimeframe}
              onNextTimeframe={handleNextTimeframe}
              onOpenTimeframe={() => setIsTimeframeModalOpen(true)}
              onOpenCategories={() => setIsCategoriesModalOpen(true)}
              onOpenAccounts={() => setIsAccountsModalOpen(true)}
              onExport={() => setIsExportModalOpen(true)}
            />
          )}

          {activeTab === 'age-of-money' && (
            <AgeOfMoneyView
              data={{
                currentAge: REFLECT_AOM_FULL_HISTORY[REFLECT_AOM_FULL_HISTORY.length - 1]?.age ?? 53,
                timeline: `${aomMonths} Months`,
                points: REFLECT_AOM_FULL_HISTORY,
              }}
              selectedMonths={aomMonths}
              onChangeMonths={setAomMonths}
              onExport={() => setIsExportModalOpen(true)}
            />
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
        accounts={accounts}
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
        totalNegativeActivity={computedSpendingBreakdown.formattedTotalSpending}
        totalPositiveActivity={computedSpendingBreakdown.formattedTotalPositiveInflows}
        totalSpending={formatMilliunits(
          computedSpendingBreakdown.totalSpending - computedSpendingBreakdown.totalPositiveInflows
        )}
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
        netWorthData={(() => {
          const firstNW = computedNetWorth.history[0]?.netWorth ?? 0;
          const pct = firstNW !== 0 ? Number(((computedNetWorth.change / Math.abs(firstNW)) * 100).toFixed(1)) : 0;
          return {
            currentNetWorth: computedNetWorth.currentNetWorth,
            totalAssets: computedNetWorth.totalAssets,
            totalDebts: computedNetWorth.totalDebts,
            change: computedNetWorth.change,
            percentage: pct,
            history: computedNetWorth.history,
          };
        })()}
      />
    </div>
  );
};
