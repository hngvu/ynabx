import { invoke } from '@tauri-apps/api/core';
import {
  PlanSummary,
  Account as ApiAccount,
  PlanMonthSummary,
  Transaction as ApiTransaction,
} from './types';
import { AccountItem } from '../components/sidebar/NavAccountRow';
import { MasterCategoryGroup, SubCategoryItem } from '../components/budget/budgetData';
import { TransactionItem } from '../components/accounts/accountData';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
export const DEFAULT_BUDGET_ID = '00000000-0000-0000-0000-000000000001';

export async function getPlanSummary(): Promise<PlanSummary> {
  if (isTauri) {
    return await invoke<PlanSummary>('get_plan_summary', {});
  }
  return {
    id: 'default',
    name: 'My Personal Budget',
    currency_code: 'USD',
    number_format: '1,234.56',
    currency_symbol_first: true,
    currency_display_symbol: true,
    date_format: 'MM/DD/YYYY',
  };
}

export async function getAccounts(): Promise<AccountItem[]> {
  if (isTauri) {
    const raw = await invoke<ApiAccount[]>('get_accounts', {});
    return raw.map((a) => ({
      entityId: a.id,
      accountName: a.name,
      accountType: a.type === 'creditCard' ? 'creditCard' : (a.type.toLowerCase() as any),
      isDirectImportLinked: false,
      directImportStatus: undefined,
      accountCalculation: {
        balance: a.balance_milliunits,
        notificationCount: 0,
      },
    }));
  }
  return [];
}

export async function createAccount(payload: {
  name: string;
  account_type: string;
  balance_milliunits: number;
  on_budget?: boolean;
  note?: string;
}): Promise<AccountItem> {
  if (isTauri) {
    const raw = await invoke<ApiAccount>('create_account', { payload });
    return {
      entityId: raw.id,
      accountName: raw.name,
      accountType: raw.type === 'creditCard' ? 'creditCard' : (raw.type.toLowerCase() as any),
      isDirectImportLinked: false,
      accountCalculation: {
        balance: raw.balance_milliunits,
        notificationCount: 0,
      },
    };
  }
  return {
    entityId: `acc-${Date.now()}`,
    accountName: payload.name,
    accountType: payload.account_type.toLowerCase() as any,
    isDirectImportLinked: false,
    accountCalculation: {
      balance: payload.balance_milliunits,
      notificationCount: 0,
    },
  };
}

export async function getBudgetMonth(targetMonth: string): Promise<{
  month: string;
  readyToAssign: number;
  totalAssigned: number;
  totalActivity: number;
  totalAvailable: number;
  fundedInFuture: number;
  categoryGroups: MasterCategoryGroup[];
}> {
  if (isTauri) {
    const res = await invoke<PlanMonthSummary>('get_budget_month', { targetMonth });
    const groups: MasterCategoryGroup[] = res.category_groups.map((g) => ({
      entityId: g.id,
      name: g.name,
      isDebtPaymentGroup: g.internal_name === 'MasterCategory/__DebtPayment__',
      isCollapsed: false,
      isHidden: g.hidden,
      categories: g.categories.map((c): SubCategoryItem => ({
        entityId: c.id,
        name: c.name,
        assigned: c.assigned_milliunits,
        activity: c.activity_milliunits,
        available: c.available_milliunits,
        isDebtPayment: c.is_credit_card_payment,
        isGoalSnoozed: c.is_snoozed,
        isHidden: c.hidden,
        note: c.note || undefined,
        target: c.goal_target_amount
          ? {
              targetAmount: c.goal_target_amount,
              targetType: (c.goal_type as any) || 'NEED',
            }
          : undefined,
      })),
    }));

    return {
      month: res.month,
      readyToAssign: res.ready_to_assign_milliunits,
      totalAssigned: res.total_assigned_milliunits,
      totalActivity: res.total_activity_milliunits,
      totalAvailable: res.total_available_milliunits,
      fundedInFuture: res.funded_in_future_milliunits,
      categoryGroups: groups,
    };
  }

  return {
    month: targetMonth,
    readyToAssign: 0,
    totalAssigned: 0,
    totalActivity: 0,
    totalAvailable: 0,
    fundedInFuture: 0,
    categoryGroups: [],
  };
}

export async function setCategoryAssigned(
  categoryId: string,
  month: string,
  assignedMilliunits: number
) {
  if (isTauri) {
    return await invoke<PlanMonthSummary>('set_category_assigned', {
      payload: {
        category_id: categoryId,
        month,
        assigned_milliunits: assignedMilliunits,
      },
    });
  }
  return null;
}

export async function applyQuickBudget(
  month: string,
  quickBudgetType: string,
  categoryIds?: string[]
) {
  if (isTauri) {
    return await invoke<PlanMonthSummary>('apply_quick_budget', {
      payload: {
        month,
        quick_budget_type: quickBudgetType,
        category_ids: categoryIds,
      },
    });
  }
  return null;
}

export async function getTransactions(accountId?: string): Promise<TransactionItem[]> {
  if (isTauri) {
    const raw = await invoke<ApiTransaction[]>('get_transactions', { accountId });
    return raw.map((t): TransactionItem => ({
      entityId: t.id,
      accountId: t.account_id,
      accountName: '',
      date: t.date,
      payeeId: t.payee_id || undefined,
      payeeName: t.payee_name || (t.transfer_account_id ? 'Transfer' : 'Uncategorized'),
      subCategoryId: t.category_id || undefined,
      subCategoryName: t.category_name || (t.transfer_account_id ? 'Category not needed' : 'Uncategorized'),
      memo: t.memo || '',
      amount: t.amount_milliunits,
      cleared: t.cleared.toLowerCase() as any,
      flag: t.flag || null,
      transferAccountId: t.transfer_account_id || undefined,
    }));
  }
  return [];
}

export async function saveTransaction(payload: {
  id?: string;
  account_id: string;
  payee_id?: string;
  category_id?: string;
  date: string;
  amount_milliunits: number;
  memo?: string;
  cleared?: string;
  approved?: boolean;
  flag?: string;
  transfer_account_id?: string;
}) {
  if (isTauri) {
    return await invoke<string>('save_transaction', {
      payload: {
        ...payload,
        budget_id: DEFAULT_BUDGET_ID,
      },
    });
  }
  return null;
}

export async function reconcileAccount(payload: {
  account_id: string;
  target_balance_milliunits: number;
  create_adjustment: boolean;
}) {
  if (isTauri) {
    return await invoke('reconcile_account', {
      payload: {
        ...payload,
        budget_id: DEFAULT_BUDGET_ID,
      },
    });
  }
  return null;
}

export async function deleteTransactions(ids: string[]) {
  if (isTauri) {
    return await invoke('delete_transactions', {
      payload: {
        ids,
        budget_id: DEFAULT_BUDGET_ID,
      },
    });
  }
  return null;
}

export async function toggleTransactionCleared(id: string, cleared: string) {
  if (isTauri) {
    return await invoke('toggle_transaction_cleared', {
      payload: {
        id,
        cleared,
        budget_id: DEFAULT_BUDGET_ID,
      },
    });
  }
  return null;
}

export async function updateAccount(id: string, name: string, note?: string) {
  if (isTauri) {
    return await invoke('update_account', {
      payload: {
        id,
        name,
        note,
        budget_id: DEFAULT_BUDGET_ID,
      },
    });
  }
  return null;
}

export async function deleteAccount(id: string) {
  if (isTauri) {
    return await invoke('delete_account', {
      payload: {
        id,
        budget_id: DEFAULT_BUDGET_ID,
      },
    });
  }
  return null;
}

export async function closeAccount(id: string) {
  if (isTauri) {
    return await invoke('close_account', {
      payload: {
        id,
        budget_id: DEFAULT_BUDGET_ID,
      },
    });
  }
  return null;
}

export async function createCategoryGroup(name: string): Promise<string | null> {
  if (isTauri) {
    return await invoke<string>('create_category_group', {
      payload: {
        name,
        budget_id: DEFAULT_BUDGET_ID,
      },
    });
  }
  return null;
}

export async function createSubcategory(masterId: string, name: string): Promise<string | null> {
  if (isTauri) {
    return await invoke<string>('create_subcategory', {
      payload: {
        master_id: masterId,
        name,
        budget_id: DEFAULT_BUDGET_ID,
      },
    });
  }
  return null;
}

export async function renameCategory(id: string, name: string, isMaster: boolean) {
  if (isTauri) {
    return await invoke('rename_category', {
      payload: {
        id,
        name,
        is_master: isMaster,
      },
    });
  }
  return null;
}

export async function deleteCategory(id: string, isMaster: boolean) {
  if (isTauri) {
    return await invoke('delete_category', {
      payload: {
        id,
        is_master: isMaster,
      },
    });
  }
  return null;
}

export async function updateCategoryNote(id: string, note: string) {
  if (isTauri) {
    return await invoke('update_category_note', {
      payload: {
        id,
        note,
      },
    });
  }
  return null;
}

export async function setCategoryGoal(payload: {
  category_id: string;
  target_amount: number;
  goal_type?: string;
  target_date?: string;
  cadence?: number;
}) {
  if (isTauri) {
    return await invoke('set_category_goal', {
      payload: {
        category_id: payload.category_id,
        goal_type: payload.goal_type || 'NEED',
        target_amount: payload.target_amount,
        target_date: payload.target_date,
        cadence: payload.cadence,
      },
    });
  }
  return null;
}

export async function updatePlanSettings(name: string) {
  if (isTauri) {
    return await invoke('update_plan_settings', {
      payload: {
        name,
        budget_id: DEFAULT_BUDGET_ID,
      },
    });
  }
  return null;
}
