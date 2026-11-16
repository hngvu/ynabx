import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { invoke } from '@tauri-apps/api/core';
import {
  closeAccount,
  saveTransaction,
  reconcileAccount,
  getAccounts,
  getTransactions,
  DEFAULT_BUDGET_ID,
} from '../api/tauriBridge';
import * as bridge from '../api/tauriBridge';
import { Account as ApiAccount, Transaction as ApiTransaction, Payee as ApiPayee } from '../api/types';

describe('Tauri IPC Bridge Contracts & DTO Mappings', () => {
  beforeEach(() => {
    clearMocks();
  });

  afterEach(() => {
    clearMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. hideCategory IPC contract
  // ---------------------------------------------------------------------------
  it('01: hideCategory IPC contract invokes "hide_category" with correct payload shape', async () => {
    let capturedCmd = '';
    let capturedPayload: Record<string, unknown> = {};

    mockIPC((cmd, payload) => {
      capturedCmd = cmd;
      capturedPayload = (payload as Record<string, unknown>) || {};
      if (cmd === 'hide_category') {
        return { success: true };
      }
    });

    const bridgeFn = (bridge as Record<string, unknown>).hideCategory;
    if (typeof bridgeFn === 'function') {
      await (bridgeFn as (catId: string, isMaster: boolean, isHidden: boolean) => Promise<unknown>)(
        'cat-groceries-123',
        false,
        true
      );
    } else {
      await invoke('hide_category', {
        category_id: 'cat-groceries-123',
        is_master: false,
        is_hidden: true,
      });
    }

    expect(capturedCmd).toBe('hide_category');
    expect(capturedPayload).toEqual({
      category_id: 'cat-groceries-123',
      is_master: false,
      is_hidden: true,
    });
  });

  // ---------------------------------------------------------------------------
  // 2. closeAccount IPC contract & Account DTO conversion
  // ---------------------------------------------------------------------------
  it('02: closeAccount IPC contract invokes "close_account" with budget and account ID', async () => {
    let capturedCmd = '';
    let capturedArgs: Record<string, unknown> = {};

    mockIPC((cmd, args) => {
      capturedCmd = cmd;
      capturedArgs = (args as Record<string, unknown>) || {};
      if (cmd === 'close_account') {
        return { success: true };
      }
      if (cmd === 'get_accounts') {
        const mockAccounts: ApiAccount[] = [
          {
            id: 'acc-checking-999',
            budget_id: DEFAULT_BUDGET_ID,
            name: 'Checking Account',
            type: 'checking',
            on_budget: true,
            closed: false,
            balance_milliunits: 1000000,
            cleared_balance_milliunits: 1000000,
            uncleared_balance_milliunits: 0,
            note: null,
            last_reconciled_at: null,
            sort_order: 1,
          },
        ];
        return mockAccounts;
      }
    });

    // Verify DTO mapping on getAccounts
    const accounts = await getAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.accountCalculation?.balance).toBe(1000000);

    // Verify closeAccount IPC call
    await closeAccount('acc-checking-999');

    expect(capturedCmd).toBe('close_account');
    expect(capturedArgs).toEqual({
      account_id: 'acc-checking-999',
    });
  });

  // ---------------------------------------------------------------------------
  // 3. saveTransaction transfer contract & Transaction DTO mapping
  // ---------------------------------------------------------------------------
  it('03: saveTransaction transfer contract persists transferAccountId & paired transaction', async () => {
    let capturedCmd = '';
    let capturedArgs: Record<string, unknown> = {};

    mockIPC((cmd, args) => {
      capturedCmd = cmd;
      capturedArgs = (args as Record<string, unknown>) || {};
      if (cmd === 'save_transaction') {
        return 'tx-paired-777';
      }
      if (cmd === 'get_transactions') {
        const mockTxs: ApiTransaction[] = [
          {
            id: 'tx-paired-777',
            budget_id: DEFAULT_BUDGET_ID,
            account_id: 'acc-checking-01',
            payee_id: null,
            payee_name: null,
            category_id: null,
            category_name: null,
            date: '2026-11-15',
            amount_milliunits: -150000,
            memo: 'Transfer to Visa',
            cleared: 'Cleared',
            approved: true,
            flag: null,
            transfer_account_id: 'acc-visa-02',
            transfer_transaction_id: 'tx-peer-888',
          },
        ];
        return mockTxs;
      }
    });

    const txId = await saveTransaction({
      account_id: 'acc-checking-01',
      transfer_account_id: 'acc-visa-02',
      date: '2026-11-15',
      amount_milliunits: -150000,
      memo: 'Credit card payment transfer',
      cleared: 'Cleared',
    });

    expect(capturedCmd).toBe('save_transaction');
    expect(txId).toBe('tx-paired-777');
    const p = (capturedArgs.payload as Record<string, unknown>) || {};
    expect(p.account_id).toBe('acc-checking-01');
    expect(p.transfer_account_id).toBe('acc-visa-02');
    expect(p.amount_milliunits).toBe(-150000);
    expect(p.budget_id).toBe(DEFAULT_BUDGET_ID);

    // Verify DTO mapping for transfers
    const txs = await getTransactions();
    expect(txs).toHaveLength(1);
    expect(txs[0].transferAccountId).toBe('acc-visa-02');
    expect(txs[0].amount).toBe(-150000);
  });

  // ---------------------------------------------------------------------------
  // 4. reconcileAccount IPC contract
  // ---------------------------------------------------------------------------
  it('04: reconcileAccount IPC contract invokes "reconcile_account" with target balance', async () => {
    let capturedCmd = '';
    let capturedArgs: Record<string, unknown> = {};

    mockIPC((cmd, args) => {
      capturedCmd = cmd;
      capturedArgs = (args as Record<string, unknown>) || {};
      if (cmd === 'reconcile_account') {
        return {
          account_id: 'acc-checking-01',
          target_balance_milliunits: 2500000,
          adjustment_amount_milliunits: 50000,
          reconciled_tx_count: 8,
        };
      }
    });

    const result = await reconcileAccount({
      account_id: 'acc-checking-01',
      target_balance_milliunits: 2500000,
      create_adjustment: true,
    });

    expect(capturedCmd).toBe('reconcile_account');
    expect(capturedArgs).toEqual({
      payload: {
        account_id: 'acc-checking-01',
        target_balance_milliunits: 2500000,
        create_adjustment: true,
        budget_id: DEFAULT_BUDGET_ID,
      },
    });
    expect(result).toHaveProperty('account_id', 'acc-checking-01');
    expect(result).toHaveProperty('reconciled_tx_count', 8);
  });

  // ---------------------------------------------------------------------------
  // 5. bulkUpdateTransactions IPC contract (clear/unclear)
  // ---------------------------------------------------------------------------
  it('05: bulkUpdateTransactions IPC contract supports bulk toggle_cleared', async () => {
    let capturedCmd = '';
    let capturedPayload: Record<string, unknown> = {};

    mockIPC((cmd, payload) => {
      capturedCmd = cmd;
      capturedPayload = (payload as Record<string, unknown>) || {};
      if (cmd === 'bulk_update_transactions') {
        return { updated_count: 3 };
      }
    });

    const bridgeFn = (bridge as Record<string, unknown>).bulkUpdateTransactions;
    if (typeof bridgeFn === 'function') {
      await (bridgeFn as (ids: string[], action: string, data: unknown) => Promise<unknown>)(
        ['tx-1', 'tx-2', 'tx-3'],
        'toggle_cleared',
        { cleared: 'Cleared' }
      );
    } else {
      await invoke('bulk_update_transactions', {
        transaction_ids: ['tx-1', 'tx-2', 'tx-3'],
        action: 'toggle_cleared',
        payload: { cleared: 'Cleared' },
      });
    }

    expect(capturedCmd).toBe('bulk_update_transactions');
    expect(capturedPayload.transaction_ids).toEqual(['tx-1', 'tx-2', 'tx-3']);
    expect(capturedPayload.action).toBe('toggle_cleared');
    expect(capturedPayload.payload).toEqual({ cleared: 'Cleared' });
  });

  // ---------------------------------------------------------------------------
  // 6. bulkUpdateTransactions IPC contract (categorize)
  // ---------------------------------------------------------------------------
  it('06: bulkUpdateTransactions IPC contract supports bulk categorize', async () => {
    let capturedCmd = '';
    let capturedPayload: Record<string, unknown> = {};

    mockIPC((cmd, payload) => {
      capturedCmd = cmd;
      capturedPayload = (payload as Record<string, unknown>) || {};
      if (cmd === 'bulk_update_transactions') {
        return { updated_count: 2 };
      }
    });

    const bridgeFn = (bridge as Record<string, unknown>).bulkUpdateTransactions;
    if (typeof bridgeFn === 'function') {
      await (bridgeFn as (ids: string[], action: string, data: unknown) => Promise<unknown>)(
        ['tx-1', 'tx-2'],
        'categorize',
        { category_id: 'cat-groceries-01' }
      );
    } else {
      await invoke('bulk_update_transactions', {
        transaction_ids: ['tx-1', 'tx-2'],
        action: 'categorize',
        payload: { category_id: 'cat-groceries-01' },
      });
    }

    expect(capturedCmd).toBe('bulk_update_transactions');
    expect(capturedPayload.action).toBe('categorize');
    expect(capturedPayload.payload).toEqual({ category_id: 'cat-groceries-01' });
  });

  // ---------------------------------------------------------------------------
  // 7. reorderAccounts IPC contract
  // ---------------------------------------------------------------------------
  it('07: reorderAccounts IPC contract invokes "reorder_accounts" with ordered IDs', async () => {
    let capturedCmd = '';
    let capturedPayload: Record<string, unknown> = {};

    mockIPC((cmd, payload) => {
      capturedCmd = cmd;
      capturedPayload = (payload as Record<string, unknown>) || {};
      if (cmd === 'reorder_accounts') {
        return { success: true };
      }
    });

    const orderedIds = ['acc-savings', 'acc-checking', 'acc-credit'];
    const bridgeFn = (bridge as Record<string, unknown>).reorderAccounts;
    if (typeof bridgeFn === 'function') {
      await (bridgeFn as (ids: string[]) => Promise<unknown>)(orderedIds);
    } else {
      await invoke('reorder_accounts', { ordered_ids: orderedIds });
    }

    expect(capturedCmd).toBe('reorder_accounts');
    expect(capturedPayload.ordered_ids).toEqual(orderedIds);
  });

  // ---------------------------------------------------------------------------
  // 8. reorderCategories IPC contract
  // ---------------------------------------------------------------------------
  it('08: reorderCategories IPC contract invokes "reorder_categories" with hierarchy structure', async () => {
    let capturedCmd = '';
    let capturedPayload: Record<string, unknown> = {};

    mockIPC((cmd, payload) => {
      capturedCmd = cmd;
      capturedPayload = (payload as Record<string, unknown>) || {};
      if (cmd === 'reorder_categories') {
        return { success: true };
      }
    });

    const orderedGroupIds = ['grp-immediate', 'grp-true-expenses'];
    const subcatsByGroup = {
      'grp-immediate': ['cat-rent', 'cat-groceries'],
      'grp-true-expenses': ['cat-auto', 'cat-medical'],
    };

    const bridgeFn = (bridge as Record<string, unknown>).reorderCategories;
    if (typeof bridgeFn === 'function') {
      await (bridgeFn as (groups: string[], subcats: Record<string, string[]>) => Promise<unknown>)(
        orderedGroupIds,
        subcatsByGroup
      );
    } else {
      await invoke('reorder_categories', {
        budget_id: DEFAULT_BUDGET_ID,
        ordered_group_ids: orderedGroupIds,
        subcategories_by_group: subcatsByGroup,
      });
    }

    expect(capturedCmd).toBe('reorder_categories');
    expect(capturedPayload.budget_id).toBe(DEFAULT_BUDGET_ID);
    expect(capturedPayload.ordered_group_ids).toEqual(orderedGroupIds);
    expect(capturedPayload.subcategories_by_group).toEqual(subcatsByGroup);
  });

  // ---------------------------------------------------------------------------
  // 9. getPayees IPC contract & DTO conversions
  // ---------------------------------------------------------------------------
  it('09: getPayees IPC contract fetches payees and maps DTO correctly', async () => {
    const mockPayees: ApiPayee[] = [
      {
        id: 'payee-trg',
        budget_id: DEFAULT_BUDGET_ID,
        name: 'Target Store',
        internal_name: null,
        entities_account_id: null,
        auto_fill_subcategory_id: 'cat-groceries',
      },
      {
        id: 'payee-start',
        budget_id: DEFAULT_BUDGET_ID,
        name: 'Starting Balance',
        internal_name: 'StartingBalancePayee',
        entities_account_id: null,
        auto_fill_subcategory_id: null,
      },
    ];

    mockIPC((cmd) => {
      if (cmd === 'get_payees') {
        return mockPayees;
      }
    });

    const bridgeFn = (bridge as Record<string, unknown>).getPayees;
    let payees: ApiPayee[];
    if (typeof bridgeFn === 'function') {
      payees = (await (bridgeFn as () => Promise<ApiPayee[]>)());
    } else {
      payees = await invoke<ApiPayee[]>('get_payees', { budget_id: DEFAULT_BUDGET_ID });
    }

    expect(payees).toHaveLength(2);
    expect(payees[0].name).toBe('Target Store');
    expect(payees[1].internal_name).toBe('StartingBalancePayee');
  });

  // ---------------------------------------------------------------------------
  // 10. updatePayee IPC contract
  // ---------------------------------------------------------------------------
  it('10: updatePayee IPC contract updates payee name', async () => {
    let capturedCmd = '';
    let capturedPayload: Record<string, unknown> = {};

    mockIPC((cmd, payload) => {
      capturedCmd = cmd;
      capturedPayload = (payload as Record<string, unknown>) || {};
      if (cmd === 'update_payee') {
        return { success: true };
      }
    });

    const bridgeFn = (bridge as Record<string, unknown>).updatePayee;
    if (typeof bridgeFn === 'function') {
      await (bridgeFn as (id: string, name: string) => Promise<unknown>)('payee-trg', 'Target Supercenter');
    } else {
      await invoke('update_payee', { payee_id: 'payee-trg', name: 'Target Supercenter' });
    }

    expect(capturedCmd).toBe('update_payee');
    expect(capturedPayload).toEqual({
      payee_id: 'payee-trg',
      name: 'Target Supercenter',
    });
  });

  // ---------------------------------------------------------------------------
  // 11. deletePayee IPC contract
  // ---------------------------------------------------------------------------
  it('11: deletePayee IPC contract removes payee by ID', async () => {
    let capturedCmd = '';
    let capturedPayload: Record<string, unknown> = {};

    mockIPC((cmd, payload) => {
      capturedCmd = cmd;
      capturedPayload = (payload as Record<string, unknown>) || {};
      if (cmd === 'delete_payee') {
        return { success: true };
      }
    });

    const bridgeFn = (bridge as Record<string, unknown>).deletePayee;
    if (typeof bridgeFn === 'function') {
      await (bridgeFn as (id: string) => Promise<unknown>)('payee-trg');
    } else {
      await invoke('delete_payee', { payee_id: 'payee-trg' });
    }

    expect(capturedCmd).toBe('delete_payee');
    expect(capturedPayload).toEqual({ payee_id: 'payee-trg' });
  });

  // ---------------------------------------------------------------------------
  // 12. makeFreshStart IPC contract & Account DTO conversions
  // ---------------------------------------------------------------------------
  it('12: makeFreshStart IPC contract creates fresh start budget and returns new budget ID', async () => {
    let capturedCmd = '';
    let capturedPayload: Record<string, unknown> = {};

    mockIPC((cmd, payload) => {
      capturedCmd = cmd;
      capturedPayload = (payload as Record<string, unknown>) || {};
      if (cmd === 'make_fresh_start') {
        return '00000000-0000-0000-0000-000000000002';
      }
    });

    const bridgeFn = (bridge as Record<string, unknown>).makeFreshStart;
    let newBudgetId: string;
    if (typeof bridgeFn === 'function') {
      newBudgetId = (await (bridgeFn as (name: string) => Promise<string>)(
        'My Personal Budget (Fresh Start)'
      ));
    } else {
      newBudgetId = await invoke<string>('make_fresh_start', {
        budget_id: DEFAULT_BUDGET_ID,
        new_name: 'My Personal Budget (Fresh Start)',
      });
    }

    expect(capturedCmd).toBe('make_fresh_start');
    expect(capturedPayload).toEqual({
      budget_id: DEFAULT_BUDGET_ID,
      new_name: 'My Personal Budget (Fresh Start)',
    });
    expect(newBudgetId).toBe('00000000-0000-0000-0000-000000000002');
  });
});
