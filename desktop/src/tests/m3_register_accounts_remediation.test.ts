import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockIPC } from '@tauri-apps/api/mocks';
import {
  bulkUpdateTransactions,
  reorderAccounts,
  closeAccount,
  reconcileAccount,
  mapTransactionDto,
  TransactionDto,
  getAccounts,
  getCategoryGroups,
  DEFAULT_BUDGET_ID,
} from '../api/tauriBridge';
import { ApiAccount } from '../api/types';
import { isCreditCardAccount } from '../components/accounts/AccountsHeader';
import { calculateBalanceAdjustmentDelta } from '../components/modals/EditAccountModal';
import {
  enrichTransactionsWithAccountNames,
  exportTransactionsToCsv,
} from '../components/accounts/AccountsWorkspace';
import { applyPayeeSelection } from '../components/accounts/RegisterGridEditRow';
import { TransactionItem, AccountItem } from '../sidebar/NavAccountRow';

describe('Milestone 3: Register, Accounts, Transfers & Reconciliation Remediation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. tauriBridge IPC mappings and contracts
  // ---------------------------------------------------------------------------
  describe('tauriBridge IPC contracts', () => {
    it('bulkUpdateTransactions invokes "bulk_update_transactions" with clear action', async () => {
      let capturedCmd = '';
      let capturedArgs: Record<string, unknown> = {};

      mockIPC((cmd, args) => {
        capturedCmd = cmd;
        capturedArgs = (args as Record<string, unknown>) || {};
        return null;
      });

      await bulkUpdateTransactions(['tx-1', 'tx-2'], 'clear');

      expect(capturedCmd).toBe('bulk_update_transactions');
      expect(capturedArgs).toEqual({
        transaction_ids: ['tx-1', 'tx-2'],
        action: 'clear',
        payload: null,
      });
    });

    it('bulkUpdateTransactions invokes "bulk_update_transactions" with unclear action', async () => {
      let capturedCmd = '';
      let capturedArgs: Record<string, unknown> = {};

      mockIPC((cmd, args) => {
        capturedCmd = cmd;
        capturedArgs = (args as Record<string, unknown>) || {};
        return null;
      });

      await bulkUpdateTransactions(['tx-3'], 'unclear');

      expect(capturedCmd).toBe('bulk_update_transactions');
      expect(capturedArgs).toEqual({
        transaction_ids: ['tx-3'],
        action: 'unclear',
        payload: null,
      });
    });

    it('bulkUpdateTransactions normalizes flag payload into object format { flag: string }', async () => {
      let capturedCmd = '';
      let capturedArgs: Record<string, unknown> = {};

      mockIPC((cmd, args) => {
        capturedCmd = cmd;
        capturedArgs = (args as Record<string, unknown>) || {};
        return null;
      });

      await bulkUpdateTransactions(['tx-1', 'tx-4'], 'flag', 'green');

      expect(capturedCmd).toBe('bulk_update_transactions');
      expect(capturedArgs).toEqual({
        transaction_ids: ['tx-1', 'tx-4'],
        action: 'flag',
        payload: { flag: 'green' },
      });

      // Also verifies object payload passes through unchanged
      await bulkUpdateTransactions(['tx-5'], 'flag', { flag: 'blue' });
      expect(capturedArgs).toEqual({
        transaction_ids: ['tx-5'],
        action: 'flag',
        payload: { flag: 'blue' },
      });
    });

    it('bulkUpdateTransactions normalizes move_account payload into object format { account_id: string }', async () => {
      let capturedCmd = '';
      let capturedArgs: Record<string, unknown> = {};

      mockIPC((cmd, args) => {
        capturedCmd = cmd;
        capturedArgs = (args as Record<string, unknown>) || {};
        return null;
      });

      await bulkUpdateTransactions(['tx-1'], 'move_account', 'acc-destination');

      expect(capturedCmd).toBe('bulk_update_transactions');
      expect(capturedArgs).toEqual({
        transaction_ids: ['tx-1'],
        action: 'move_account',
        payload: { account_id: 'acc-destination' },
      });

      // Also verifies object payload passes through unchanged
      await bulkUpdateTransactions(['tx-2'], 'move_account', { account_id: 'acc-destination' });
      expect(capturedArgs).toEqual({
        transaction_ids: ['tx-2'],
        action: 'move_account',
        payload: { account_id: 'acc-destination' },
      });
    });

    it('bulkUpdateTransactions normalizes categorize payload into object format { category_id: string }', async () => {
      let capturedCmd = '';
      let capturedArgs: Record<string, unknown> = {};

      mockIPC((cmd, args) => {
        capturedCmd = cmd;
        capturedArgs = (args as Record<string, unknown>) || {};
        return null;
      });

      await bulkUpdateTransactions(['tx-1', 'tx-2'], 'categorize', 'cat-groceries');

      expect(capturedCmd).toBe('bulk_update_transactions');
      expect(capturedArgs).toEqual({
        transaction_ids: ['tx-1', 'tx-2'],
        action: 'categorize',
        payload: { category_id: 'cat-groceries' },
      });

      // Also verifies object payload passes through unchanged
      await bulkUpdateTransactions(['tx-3'], 'categorize', { category_id: 'cat-groceries' });
      expect(capturedArgs).toEqual({
        transaction_ids: ['tx-3'],
        action: 'categorize',
        payload: { category_id: 'cat-groceries' },
      });
    });

    it('reorderAccounts invokes "reorder_accounts" with ordered_ids', async () => {
      let capturedCmd = '';
      let capturedArgs: Record<string, unknown> = {};

      mockIPC((cmd, args) => {
        capturedCmd = cmd;
        capturedArgs = (args as Record<string, unknown>) || {};
        return null;
      });

      const ordered = ['acc-checking', 'acc-savings', 'acc-credit'];
      await reorderAccounts(ordered);

      expect(capturedCmd).toBe('reorder_accounts');
      expect(capturedArgs).toEqual({
        ordered_ids: ordered,
      });
    });

    it('closeAccount invokes "close_account" with account_id', async () => {
      let capturedCmd = '';
      let capturedArgs: Record<string, unknown> = {};

      mockIPC((cmd, args) => {
        capturedCmd = cmd;
        capturedArgs = (args as Record<string, unknown>) || {};
        return null;
      });

      await closeAccount('acc-retire-01');

      expect(capturedCmd).toBe('close_account');
      expect(capturedArgs).toEqual({
        account_id: 'acc-retire-01',
      });
    });

    it('reconcileAccount accepts accountId and targetBalanceMilliunits signature', async () => {
      let capturedCmd = '';
      let capturedArgs: Record<string, unknown> = {};

      mockIPC((cmd, args) => {
        capturedCmd = cmd;
        capturedArgs = (args as Record<string, unknown>) || {};
        return { account_id: 'acc-01', target_balance_milliunits: 1250000 };
      });

      await reconcileAccount('acc-01', 1250000);

      expect(capturedCmd).toBe('reconcile_account');
      expect(capturedArgs).toEqual({
        payload: {
          account_id: 'acc-01',
          target_balance_milliunits: 1250000,
          create_adjustment: true,
          budget_id: DEFAULT_BUDGET_ID,
        },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 2. TransactionDto & mapTransactionDto (Account Name in Register)
  // ---------------------------------------------------------------------------
  describe('TransactionDto & mapTransactionDto mapping', () => {
    it('maps account_name correctly into accountName property', () => {
      const dto: TransactionDto = {
        id: 'tx-100',
        budget_id: DEFAULT_BUDGET_ID,
        account_id: 'acc-checking',
        account_name: 'Checking Account',
        date: '2026-11-16',
        amount_milliunits: -54000,
        memo: 'Groceries',
        cleared: 'Cleared',
        flag: 'blue',
        payee_id: 'payee-trader-joes',
        payee_name: "Trader Joe's",
        category_id: 'cat-groceries',
        category_name: 'Groceries',
        transfer_account_id: null,
        transfer_transaction_id: null,
      };

      const mapped = mapTransactionDto(dto);
      expect(mapped.accountName).toBe('Checking Account');
      expect(mapped.accountId).toBe('acc-checking');
      expect(mapped.amount).toBe(-54000);
      expect(mapped.cleared).toBe('cleared');
      expect(mapped.flag).toBe('blue');
      expect(mapped.payeeName).toBe("Trader Joe's");
      expect(mapped.subCategoryName).toBe('Groceries');
    });

    it('falls back to accountName camelCase if account_name is missing', () => {
      const dto: TransactionDto = {
        id: 'tx-101',
        budget_id: DEFAULT_BUDGET_ID,
        account_id: 'acc-savings',
        accountName: 'High Yield Savings',
        date: '2026-11-16',
        amount_milliunits: 100000,
        memo: 'Interest',
        cleared: 'Reconciled',
        flag: null,
        payee_id: null,
        payee_name: null,
        category_id: null,
        category_name: null,
        transfer_account_id: null,
        transfer_transaction_id: null,
      };

      const mapped = mapTransactionDto(dto);
      expect(mapped.accountName).toBe('High Yield Savings');
      expect(mapped.cleared).toBe('reconciled');
    });

    it('defaults accountName to empty string when neither is provided', () => {
      const dto: TransactionDto = {
        id: 'tx-102',
        budget_id: DEFAULT_BUDGET_ID,
        account_id: 'acc-cash',
        date: '2026-11-16',
        amount_milliunits: -5000,
        memo: '',
        cleared: 'Uncleared',
        flag: null,
        payee_id: null,
        payee_name: null,
        category_id: null,
        category_name: null,
        transfer_account_id: null,
        transfer_transaction_id: null,
      };

      const mapped = mapTransactionDto(dto);
      expect(mapped.accountName).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. getAccounts closed status mapping
  // ---------------------------------------------------------------------------
  describe('getAccounts closed status mapping', () => {
    it('correctly maps isClosed boolean from backend closed field', async () => {
      mockIPC((cmd) => {
        if (cmd === 'get_accounts') {
          return [
            {
              id: 'acc-open-1',
              budget_id: DEFAULT_BUDGET_ID,
              name: 'Active Checking',
              type: 'checking',
              on_budget: true,
              closed: false,
              balance_milliunits: 200000,
              cleared_balance_milliunits: 200000,
              uncleared_balance_milliunits: 0,
              note: null,
              last_reconciled_at: null,
              sort_order: 1000,
            },
            {
              id: 'acc-closed-1',
              budget_id: DEFAULT_BUDGET_ID,
              name: 'Old Card',
              type: 'creditCard',
              on_budget: true,
              closed: true,
              balance_milliunits: 0,
              cleared_balance_milliunits: 0,
              uncleared_balance_milliunits: 0,
              note: null,
              last_reconciled_at: null,
              sort_order: 2000,
            },
          ] as ApiAccount[];
        }
      });

      const accounts = await getAccounts();
      expect(accounts).toHaveLength(2);
      expect(accounts[0].isClosed).toBe(false);
      expect(accounts[1].isClosed).toBe(true);
      expect(accounts[1].accountType).toBe('creditCard');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Credit Card Case-Insensitive Matching (imported from AccountsHeader)
  // ---------------------------------------------------------------------------
  describe('Credit Card UI Integration matching logic', () => {
    it('matches "creditcard", "credit", "lineofcredit" regardless of casing via imported isCreditCardAccount', () => {
      expect(isCreditCardAccount('creditCard')).toBe(true);
      expect(isCreditCardAccount('CreditCard')).toBe(true);
      expect(isCreditCardAccount('creditcard')).toBe(true);
      expect(isCreditCardAccount('CREDITCARD')).toBe(true);
      expect(isCreditCardAccount('lineOfCredit')).toBe(true);
      expect(isCreditCardAccount('LineOfCredit')).toBe(true);
      expect(isCreditCardAccount('lineofcredit')).toBe(true);
      expect(isCreditCardAccount('credit')).toBe(true);
      expect(isCreditCardAccount('CREDIT')).toBe(true);

      expect(isCreditCardAccount('checking')).toBe(false);
      expect(isCreditCardAccount('savings')).toBe(false);
      expect(isCreditCardAccount('cash')).toBe(false);
      expect(isCreditCardAccount('otherAsset')).toBe(false);
      expect(isCreditCardAccount(undefined)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Edit Account Balance Adjustment delta calculation (imported from EditAccountModal)
  // ---------------------------------------------------------------------------
  describe('Edit Account Balance Adjustment delta calculation', () => {
    it('computes positive delta for balance increase without commas', () => {
      // Current: $1,000.00 (1,000,000 milliunits), Input: "1500.00" -> Delta: +$500.00 (+500,000 milliunits)
      const res = calculateBalanceAdjustmentDelta(1000000, '1500.00');
      expect(res.balanceMilliunits).toBe(1500000);
      expect(res.delta).toBe(500000);
    });

    it('computes positive delta for balance with commas correctly (e.g. "1,250.00")', () => {
      // Current: $1,000.00 (1,000,000 milliunits), Input: "1,250.00" -> Balance: 1,250,000, Delta: +250,000 milliunits
      const res = calculateBalanceAdjustmentDelta(1000000, '1,250.00');
      expect(res.balanceMilliunits).toBe(1250000);
      expect(res.delta).toBe(250000);
    });

    it('handles currency symbol prefix (e.g. "$1,500.50")', () => {
      const res = calculateBalanceAdjustmentDelta(1000000, '$1,500.50');
      expect(res.balanceMilliunits).toBe(1500500);
      expect(res.delta).toBe(500500);
    });

    it('computes negative delta for balance decrease', () => {
      // Current: $1,000.00 (1,000,000 milliunits), Input: "750.50" -> Delta: -$249.50 (-249,500 milliunits)
      const res = calculateBalanceAdjustmentDelta(1000000, '750.50');
      expect(res.balanceMilliunits).toBe(750500);
      expect(res.delta).toBe(-249500);
    });

    it('computes 0 delta when balance is unchanged', () => {
      const res = calculateBalanceAdjustmentDelta(1000000, '1000.00');
      expect(res.balanceMilliunits).toBe(1000000);
      expect(res.delta).toBe(0);
    });

    it('handles negative balance input (e.g. "-250.00")', () => {
      const res = calculateBalanceAdjustmentDelta(0, '-250.00');
      expect(res.balanceMilliunits).toBe(-250000);
      expect(res.delta).toBe(-250000);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. CSV Export Escaping and Formatting (imported from AccountsWorkspace)
  // ---------------------------------------------------------------------------
  describe('CSV Export escaping and formatting', () => {
    it('formats CSV headers and properly escapes quotes and commas via exportTransactionsToCsv', () => {
      const sampleTransactions: TransactionItem[] = [
        {
          entityId: 'tx-1',
          accountId: 'acc-1',
          accountName: 'Checking',
          date: '2026-11-16',
          payeeName: "Trader Joe's, Inc.",
          subCategoryId: 'cat-1',
          subCategoryName: 'Groceries, Household',
          memo: 'Dinner "party" supplies, snacks',
          amount: -54000,
          cleared: 'cleared',
        },
        {
          entityId: 'tx-2',
          accountId: 'acc-2',
          accountName: 'Savings',
          date: '2026-11-17',
          payeeName: 'Bank Interest',
          subCategoryId: 'cat-2',
          subCategoryName: 'Income',
          memo: 'Monthly interest',
          amount: 2500,
          cleared: 'reconciled',
        },
      ];

      const csv = exportTransactionsToCsv(sampleTransactions);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('Date,Account,Payee,Category,Memo,Amount');
      expect(lines[1]).toBe(
        '"2026-11-16","Checking","Trader Joe\'s, Inc.","Groceries, Household","Dinner ""party"" supplies, snacks","-54000"'
      );
      expect(lines[2]).toBe(
        '"2026-11-17","Savings","Bank Interest","Income","Monthly interest","2500"'
      );
    });

    it('handles empty and zero amount fields gracefully in CSV export', () => {
      const sampleTransactions: TransactionItem[] = [
        {
          entityId: 'tx-empty',
          accountId: 'acc-1',
          accountName: '',
          date: '2026-11-16',
          payeeName: '',
          subCategoryId: '',
          subCategoryName: '',
          memo: '',
          amount: 0,
          cleared: 'uncleared',
        },
      ];

      const csv = exportTransactionsToCsv(sampleTransactions);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[1]).toBe('"2026-11-16","","","","","0"');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Category Groups Initialization on Startup
  // ---------------------------------------------------------------------------
  describe('Category Groups Initialization on Startup', () => {
    it('getCategoryGroups fetches budget groups from get_budget_month', async () => {
      mockIPC((cmd) => {
        if (cmd === 'get_budget_month') {
          return {
            month: '2026-11-01',
            ready_to_assign_milliunits: 500000,
            total_assigned_milliunits: 300000,
            total_activity_milliunits: -50000,
            total_available_milliunits: 250000,
            funded_in_future_milliunits: 0,
            category_groups: [
              {
                id: 'grp-immediate',
                budget_id: DEFAULT_BUDGET_ID,
                name: 'Immediate Obligations',
                is_system: false,
                internal_name: null,
                hidden: false,
                sort_order: 1000,
                categories: [
                  {
                    id: 'cat-rent',
                    budget_id: DEFAULT_BUDGET_ID,
                    group_id: 'grp-immediate',
                    name: 'Rent',
                    note: null,
                    type: 'DFT',
                    internal_name: null,
                    is_credit_card_payment: false,
                    credit_card_account_id: null,
                    hidden: false,
                    sort_order: 1000,
                    assigned_milliunits: 200000,
                    activity_milliunits: 0,
                    available_milliunits: 200000,
                    cash_overspent_milliunits: 0,
                    credit_overspent_milliunits: 0,
                    goal_type: null,
                    goal_target_amount: null,
                    goal_under_funded: null,
                    goal_percentage_complete: null,
                    is_snoozed: false,
                  },
                ],
              },
            ],
          };
        }
      });

      const groups = await getCategoryGroups();
      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe('Immediate Obligations');
      expect(groups[0].categories).toHaveLength(1);
      expect(groups[0].categories[0].name).toBe('Rent');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Transfer Target Account Synchronization (imported from RegisterGridEditRow)
  // ---------------------------------------------------------------------------
  describe('Transfer Target Account Synchronization logic', () => {
    it('sets transferAccountId and marks category-not-needed when transfer payee selected via applyPayeeSelection', () => {
      const initial = {
        payeeName: '',
        subCategoryId: 'cat-groceries',
        subCategoryName: 'Groceries',
      };

      const updated = applyPayeeSelection(
        initial,
        'Transfer : Savings Account',
        'acc-savings-01'
      );

      expect(updated.payeeName).toBe('Transfer : Savings Account');
      expect(updated.transferAccountId).toBe('acc-savings-01');
      expect(updated.subCategoryId).toBe('category-not-needed');
      expect(updated.subCategoryName).toBe('Category not needed');
      expect(updated.isSplit).toBe(false);
    });

    it('clears transferAccountId when non-transfer payee selected via applyPayeeSelection', () => {
      const initial = {
        payeeName: 'Transfer : Savings Account',
        transferAccountId: 'acc-savings-01',
        subCategoryId: 'category-not-needed',
        subCategoryName: 'Category not needed',
      };

      const updated = applyPayeeSelection(initial, 'Whole Foods', undefined);

      expect(updated.payeeName).toBe('Whole Foods');
      expect(updated.transferAccountId).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Account Name in Register (All Accounts View) (imported from AccountsWorkspace)
  // ---------------------------------------------------------------------------
  describe('Account Name in Register (All Accounts View)', () => {
    it('enriches transactions lacking accountName from accounts list using enrichTransactionsWithAccountNames', () => {
      const accountsList: AccountItem[] = [
        {
          entityId: 'acc-1',
          accountName: 'Checking',
          accountType: 'checking',
          isClosed: false,
          accountCalculation: { balance: 100000, clearedBalance: 100000, unclearedBalance: 0 },
        },
        {
          entityId: 'acc-2',
          accountName: 'Credit Card',
          accountType: 'creditCard',
          isClosed: false,
          accountCalculation: { balance: -50000, clearedBalance: -50000, unclearedBalance: 0 },
        },
      ];

      const rawTransactions: TransactionItem[] = [
        {
          entityId: 'tx-1',
          accountId: 'acc-1',
          accountName: '',
          date: '2026-11-16',
          amount: 100,
          cleared: 'cleared',
          payeeName: '',
          subCategoryName: '',
          memo: '',
        },
        {
          entityId: 'tx-2',
          accountId: 'acc-2',
          accountName: 'Credit Card',
          date: '2026-11-16',
          amount: -200,
          cleared: 'uncleared',
          payeeName: '',
          subCategoryName: '',
          memo: '',
        },
      ];

      const enriched = enrichTransactionsWithAccountNames(rawTransactions, accountsList);

      expect(enriched[0].accountName).toBe('Checking');
      expect(enriched[1].accountName).toBe('Credit Card');
    });
  });
});
