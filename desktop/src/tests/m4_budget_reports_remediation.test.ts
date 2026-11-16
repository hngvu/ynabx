import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import {
  hideCategory,
  reorderCategories,
  applyQuickBudget,
  makeFreshStart,
  updatePayee,
  deletePayee,
  DEFAULT_BUDGET_ID,
} from '../api/tauriBridge';
import { filterCategoryMonthlyTransactions } from '../components/budget/BudgetWorkspace';
import { formatCurrency } from '../components/budget/categoryTargetStatus';
import {
  calculateNetWorthHistory,
  calculateAgeOfMoneyHistory,
} from '../components/reflect/reflectDataEngine';
import { evaluateFormula } from '../utils/calculator';
import { applyTheme } from '../components/modals/DisplayOptionsModal';
import { generateBudgetPlanCsvRows } from '../components/modals/ExportPlanModal';
import { TransactionItem } from '../components/accounts/accountData';
import { AccountItem } from '../components/sidebar/NavAccountRow';
import { MasterCategoryGroup } from '../components/budget/budgetData';

describe('Milestone 4: Budget Workspace, Modals, Quick Budget, & Reflect Reports Remediation', () => {
  beforeEach(() => {
    clearMocks();
  });

  afterEach(() => {
    clearMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Non-destructive Category Hide & Unhide IPC wiring
  // ---------------------------------------------------------------------------
  describe('Task 1: Category Hide & Unhide', () => {
    it('invokes "hide_category" with is_hidden: true when hiding a category', async () => {
      let capturedCmd = '';
      let capturedPayload: Record<string, unknown> = {};

      mockIPC((cmd, payload) => {
        capturedCmd = cmd;
        capturedPayload = (payload as Record<string, unknown>) || {};
        return { success: true };
      });

      await hideCategory('cat-dining-out', false, true);

      expect(capturedCmd).toBe('hide_category');
      expect(capturedPayload).toEqual({
        category_id: 'cat-dining-out',
        is_master: false,
        is_hidden: true,
      });
    });

    it('invokes "hide_category" with is_hidden: false when unhiding a master category group', async () => {
      let capturedCmd = '';
      let capturedPayload: Record<string, unknown> = {};

      mockIPC((cmd, payload) => {
        capturedCmd = cmd;
        capturedPayload = (payload as Record<string, unknown>) || {};
        return { success: true };
      });

      await hideCategory('grp-fitness', true, false);

      expect(capturedCmd).toBe('hide_category');
      expect(capturedPayload).toEqual({
        category_id: 'grp-fitness',
        is_master: true,
        is_hidden: false,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Quick Budget Inspector & Calculations
  // ---------------------------------------------------------------------------
  describe('Task 2: Quick Budget Metrics & IPC Wiring', () => {
    it('calculates historical totals across selected categories', () => {
      const selectedSubcats = [
        {
          id: 'cat-1',
          name: 'Groceries',
          assigned: 500000,
          activity: -450000,
          available: 50000,
          budgeted_last_month: 480000,
          spent_last_month: -470000,
          average_budgeted: 490000,
          average_spent: -460000,
        },
        {
          id: 'cat-2',
          name: 'Utilities',
          assigned: 200000,
          activity: -180000,
          available: 20000,
          budgeted_last_month: 190000,
          spent_last_month: -195000,
          average_budgeted: 195000,
          average_spent: -185000,
        },
      ];

      const totalBudgetedLastMonth = selectedSubcats.reduce(
        (sum, c) => sum + (c.budgeted_last_month || 0),
        0
      );
      const totalSpentLastMonth = selectedSubcats.reduce(
        (sum, c) => sum + Math.abs(c.spent_last_month || 0),
        0
      );
      const totalAverageBudgeted = selectedSubcats.reduce(
        (sum, c) => sum + (c.average_budgeted || 0),
        0
      );
      const totalAverageSpent = selectedSubcats.reduce(
        (sum, c) => sum + Math.abs(c.average_spent || 0),
        0
      );

      expect(totalBudgetedLastMonth).toBe(670000);
      expect(totalSpentLastMonth).toBe(665000);
      expect(totalAverageBudgeted).toBe(685000);
      expect(totalAverageSpent).toBe(645000);

      expect(formatCurrency(totalBudgetedLastMonth)).toBe('$670.00');
      expect(formatCurrency(totalSpentLastMonth)).toBe('$665.00');
      expect(formatCurrency(totalAverageBudgeted)).toBe('$685.00');
      expect(formatCurrency(totalAverageSpent)).toBe('$645.00');
    });

    it('invokes "apply_quick_budget" IPC with category IDs and selected option', async () => {
      let capturedCmd = '';
      let capturedPayload: Record<string, unknown> = {};

      mockIPC((cmd, payload) => {
        capturedCmd = cmd;
        capturedPayload = (payload as Record<string, unknown>) || {};
        return { success: true };
      });

      await applyQuickBudget(
        DEFAULT_BUDGET_ID,
        '2026-11-01',
        ['cat-1', 'cat-2'],
        'spent_last_month'
      );

      expect(capturedCmd).toBe('apply_quick_budget');
      const payloadData = (capturedPayload.payload || capturedPayload) as Record<string, unknown>;
      expect(payloadData).toEqual({
        budget_id: DEFAULT_BUDGET_ID,
        month: '2026-11-01',
        category_ids: ['cat-1', 'cat-2'],
        quick_budget_type: 'spent_last_month',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Category Activity Popover Transaction Filtering
  // ---------------------------------------------------------------------------
  describe('Task 3: Category Activity Filtering', () => {
    const mockTransactions: TransactionItem[] = [
      {
        entityId: 'tx-1',
        accountId: 'acc-checking',
        accountName: 'Checking',
        date: '2026-11-05',
        amount: -54200,
        payeeName: 'Trader Joe',
        subCategoryId: 'cat-groceries',
        subCategoryName: 'Groceries',
        memo: 'Weekly shopping',
        cleared: 'Cleared',
        approved: true,
      },
      {
        entityId: 'tx-2',
        accountId: 'acc-checking',
        accountName: 'Checking',
        date: '2026-11-12',
        amount: -32100,
        payeeName: 'Whole Foods',
        subCategoryId: 'cat-groceries',
        subCategoryName: 'Groceries',
        memo: 'Produce',
        cleared: 'Cleared',
        approved: true,
      },
      {
        entityId: 'tx-3',
        accountId: 'acc-checking',
        accountName: 'Checking',
        date: '2026-10-25', // Prior month
        amount: -60000,
        payeeName: 'Costco',
        subCategoryId: 'cat-groceries',
        subCategoryName: 'Groceries',
        cleared: 'Cleared',
        approved: true,
      },
      {
        entityId: 'tx-4',
        accountId: 'acc-checking',
        accountName: 'Checking',
        date: '2026-11-15',
        amount: -120000,
        payeeName: 'Electric Co',
        subCategoryId: 'cat-utilities', // Different category
        subCategoryName: 'Utilities',
        cleared: 'Cleared',
        approved: true,
      },
    ];

    it('filters transactions strictly by matching category ID and active month', () => {
      const result = filterCategoryMonthlyTransactions(
        mockTransactions,
        'cat-groceries',
        '2026-11-01'
      );

      expect(result).toHaveLength(2);
      expect(result.map((tx) => tx.id)).toEqual(['tx-1', 'tx-2']);
      expect(result[0].payeeName).toBe('Trader Joe');
      expect(result[0].amountMilliunits).toBe(-54200);
      expect(result[1].payeeName).toBe('Whole Foods');
      expect(result[1].amountMilliunits).toBe(-32100);
    });

    it('returns empty array when category ID or monthIso is missing', () => {
      expect(filterCategoryMonthlyTransactions(mockTransactions, undefined, '2026-11-01')).toEqual([]);
      expect(filterCategoryMonthlyTransactions(mockTransactions, 'cat-groceries', undefined)).toEqual([]);
    });

    it('returns empty array when no transactions match the category in that month', () => {
      const result = filterCategoryMonthlyTransactions(
        mockTransactions,
        'cat-nonexistent',
        '2026-11-01'
      );
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Category Reorder Persistence
  // ---------------------------------------------------------------------------
  describe('Task 4: Category Reorder Persistence', () => {
    it('invokes "reorder_categories" with polymorphic signatures', async () => {
      let capturedCmd = '';
      let capturedPayload: Record<string, unknown> = {};

      mockIPC((cmd, payload) => {
        capturedCmd = cmd;
        capturedPayload = (payload as Record<string, unknown>) || {};
        return { success: true };
      });

      const orderedGroups = ['grp-immediate', 'grp-true-expenses'];
      const subcatsByGroup = {
        'grp-immediate': ['cat-rent', 'cat-groceries'],
        'grp-true-expenses': ['cat-auto', 'cat-medical'],
      };

      // Signature 1: reorderCategories(orderedGroupIds, subcategoriesByGroup)
      await reorderCategories(orderedGroups, subcatsByGroup);

      expect(capturedCmd).toBe('reorder_categories');
      expect(capturedPayload.budget_id).toBe(DEFAULT_BUDGET_ID);
      expect(capturedPayload.ordered_group_ids).toEqual(orderedGroups);
      expect(capturedPayload.subcategories_by_group).toEqual(subcatsByGroup);

      // Signature 2: reorderCategories(budgetId, orderedGroupIds, subcategoriesByGroup)
      await reorderCategories('custom-budget-id', orderedGroups, subcatsByGroup);
      expect(capturedPayload.budget_id).toBe('custom-budget-id');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Reflect Live Net Worth & Age of Money (ADR-004) Calculations
  // ---------------------------------------------------------------------------
  describe('Task 5: Reflect Live Net Worth and Age of Money', () => {
    const mockAccounts: AccountItem[] = [
      {
        entityId: 'acc-checking',
        accountName: 'Checking',
        accountType: 'checking',
        accountCalculation: { balance: 5000000 }, // $5,000.00
      },
      {
        entityId: 'acc-savings',
        accountName: 'Savings',
        accountType: 'savings',
        accountCalculation: { balance: 15000000 }, // $15,000.00
      },
      {
        entityId: 'acc-credit-card',
        accountName: 'Credit Card',
        accountType: 'creditCard',
        accountCalculation: { balance: -2000000 }, // -$2,000.00
      },
    ];

    it('calculates Net Worth history with Assets, Debts, and Net Worth from live balances', () => {
      const history = calculateNetWorthHistory(mockAccounts, []);

      expect(history.length).toBeGreaterThan(0);
      const latest = history[history.length - 1];

      // Assets = Checking ($5,000) + Savings ($15,000) = $20,000 (20,000,000 milliunits)
      // Debts = Credit Card ($2,000) = 2,000,000 milliunits
      // Net Worth = Assets - Debts = 18,000,000 milliunits ($18,000.00)
      expect(latest.assets).toBe(20000000);
      expect(latest.debts).toBe(2000000);
      expect(latest.netWorth).toBe(18000000);
      expect(latest.dateKey).toBeDefined();
      expect(latest.month).toBeDefined();
    });

    it('calculates FIFO Age of Money according to ADR-004', () => {
      // Create 12 transactions: 2 income inflows followed by 10 spending outflows
      const transactions: TransactionItem[] = [
        {
          entityId: 'inflow-1',
          accountId: 'acc-checking',
          date: '2026-05-01',
          amount: 3000000, // +$3,000 inflow
          cleared: 'Cleared',
          approved: true,
        },
        {
          entityId: 'inflow-2',
          accountId: 'acc-checking',
          date: '2026-06-01',
          amount: 3000000, // +$3,000 inflow
          cleared: 'Cleared',
          approved: true,
        },
      ];

      // Add 10 spending transactions in June and July
      for (let i = 1; i <= 10; i++) {
        transactions.push({
          entityId: `outflow-${i}`,
          accountId: 'acc-checking',
          date: `2026-06-${String(i + 5).padStart(2, '0')}`,
          amount: -200000, // -$200 spending
          cleared: 'Cleared',
          approved: true,
        });
      }

      const aomHistory = calculateAgeOfMoneyHistory(transactions);
      expect(aomHistory.length).toBeGreaterThan(0);

      // Money spent on June 06 was earned on May 01 (approx 36 days old)
      const firstPoint = aomHistory[0];
      expect(firstPoint.age).toBeGreaterThan(0);
      expect(firstPoint.date).toBeDefined();
    });

    it('returns empty Age of Money history when fewer than 10 transactions exist (YNAB invariant)', () => {
      const fewTransactions: TransactionItem[] = [
        {
          entityId: 'inflow-1',
          accountId: 'acc-checking',
          date: '2026-05-01',
          amount: 3000000,
          cleared: 'Cleared',
          approved: true,
        },
        {
          entityId: 'outflow-1',
          accountId: 'acc-checking',
          date: '2026-05-10',
          amount: -50000,
          cleared: 'Cleared',
          approved: true,
        },
      ];

      const aomHistory = calculateAgeOfMoneyHistory(fewTransactions);
      expect(aomHistory).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Payee Management & Fresh Start IPC
  // ---------------------------------------------------------------------------
  describe('Task 6 & 7: Payee Management and Fresh Start Modals', () => {
    it('invokes "update_payee" IPC with payee ID and new name', async () => {
      let capturedCmd = '';
      let capturedPayload: Record<string, unknown> = {};

      mockIPC((cmd, payload) => {
        capturedCmd = cmd;
        capturedPayload = (payload as Record<string, unknown>) || {};
        return { success: true };
      });

      await updatePayee('payee-123', 'Updated Supermarket');

      expect(capturedCmd).toBe('update_payee');
      expect(capturedPayload).toEqual({
        payee_id: 'payee-123',
        name: 'Updated Supermarket',
      });
    });

    it('invokes "delete_payee" IPC with payee ID', async () => {
      let capturedCmd = '';
      let capturedPayload: Record<string, unknown> = {};

      mockIPC((cmd, payload) => {
        capturedCmd = cmd;
        capturedPayload = (payload as Record<string, unknown>) || {};
        return { success: true };
      });

      await deletePayee('payee-456');

      expect(capturedCmd).toBe('delete_payee');
      expect(capturedPayload).toEqual({
        payee_id: 'payee-456',
      });
    });

    it('invokes "make_fresh_start" IPC with budget ID and new name', async () => {
      let capturedCmd = '';
      let capturedPayload: Record<string, unknown> = {};

      mockIPC((cmd, payload) => {
        capturedCmd = cmd;
        capturedPayload = (payload as Record<string, unknown>) || {};
        return 'new-fresh-start-budget-id';
      });

      const result = await makeFreshStart(DEFAULT_BUDGET_ID, 'My 2026 Clean Slate');

      expect(capturedCmd).toBe('make_fresh_start');
      expect(capturedPayload).toEqual({
        budget_id: DEFAULT_BUDGET_ID,
        new_name: 'My 2026 Clean Slate',
      });
      expect(result).toBe('new-fresh-start-budget-id');
    });

    it('generates valid RFC 4180 CSV rows for budget plan export', () => {
      const mockGroups: MasterCategoryGroup[] = [
        {
          id: 'grp-immediate',
          name: 'Immediate Obligations',
          categories: [
            {
              id: 'cat-rent',
              name: 'Rent/Mortgage',
              assigned: 1500000,
              activity: -1500000,
              available: 0,
            },
            {
              id: 'cat-groceries',
              name: 'Groceries',
              assigned: 600000,
              activity: -450000,
              available: 150000,
            },
          ],
        },
      ];

      const csvRows = generateBudgetPlanCsvRows(mockGroups);

      expect(csvRows).toHaveLength(3);
      expect(csvRows[0]).toEqual(['Category Group', 'Category', 'Budgeted', 'Activity', 'Available']);
      expect(csvRows[1]).toEqual(['Immediate Obligations', 'Rent/Mortgage', '1500.00', '-1500.00', '0.00']);
      expect(csvRows[2]).toEqual(['Immediate Obligations', 'Groceries', '600.00', '-450.00', '150.00']);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Display Options & Theme Toggle
  // ---------------------------------------------------------------------------
  describe('Task 8: Display Options Theme Toggle & Persistence', () => {
    it('applies and removes "theme-dark" class on document.documentElement', () => {
      applyTheme('theme-dark');
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);

      applyTheme('default');
      expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Hide Amounts Masking
  // ---------------------------------------------------------------------------
  describe('Task 9: Hide Amounts Masking', () => {
    it('masks monetary figures when hideAmounts is true', () => {
      expect(formatCurrency(1234567, true)).toBe('••••••');
      expect(formatCurrency(0, true)).toBe('••••••');
      expect(formatCurrency(-50000, true)).toBe('••••••');
    });

    it('formats monetary figures normally when hideAmounts is false', () => {
      expect(formatCurrency(1234567, false)).toBe('$1,234.57');
      expect(formatCurrency(0, false)).toBe('$0.00');
      expect(formatCurrency(-50000, false)).toBe('$50.00');
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Calculator Division and Modulo by Zero Fix
  // ---------------------------------------------------------------------------
  describe('Task 10: Calculator Division-by-Zero Protection', () => {
    it('safely returns null on division by zero without string concatenation', () => {
      expect(evaluateFormula('10 / 0')).toBeNull();
      expect(evaluateFormula('0 / 0')).toBeNull();
      expect(evaluateFormula('100 / (5 - 5)')).toBeNull();
    });

    it('safely returns null on modulo by zero', () => {
      expect(evaluateFormula('10 % 0')).toBeNull();
    });

    it('accurately evaluates standard arithmetic expressions', () => {
      expect(evaluateFormula('10 + 5')).toBe(15);
      expect(evaluateFormula('100 - 35')).toBe(65);
      expect(evaluateFormula('12 * 4')).toBe(48);
      expect(evaluateFormula('100 / 4')).toBe(25);
      expect(evaluateFormula('10 % 3')).toBe(1);
    });
  });
});
