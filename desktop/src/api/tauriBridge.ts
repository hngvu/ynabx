import { invoke } from '@tauri-apps/api/core';
import {
  PlanSummary,
  Account as ApiAccount,
  PlanMonthSummary,
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
      isClosed: a.closed,
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
        budgetedLastMonth: c.budgeted_last_month ?? 0,
        spentLastMonth: c.spent_last_month ?? 0,
        averageBudgeted: c.average_budgeted ?? 0,
        averageSpent: c.average_spent ?? 0,
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
  monthOrBudgetId: string,
  quickBudgetTypeOrMonth: string,
  categoryIdsOrType?: string[] | string,
  maybeModeOrCategoryIds?: string[] | string
) {
  let budgetId = DEFAULT_BUDGET_ID;
  let month = '2026-11-01';
  let quickBudgetType = 'Underfunded';
  let categoryIds: string[] | undefined;

  if (monthOrBudgetId.includes('-') && monthOrBudgetId.length === 10) {
    month = monthOrBudgetId;
    quickBudgetType = quickBudgetTypeOrMonth;
    if (Array.isArray(categoryIdsOrType)) {
      categoryIds = categoryIdsOrType;
    }
  } else {
    budgetId = monthOrBudgetId;
    month = quickBudgetTypeOrMonth;
    if (Array.isArray(categoryIdsOrType)) {
      categoryIds = categoryIdsOrType;
      quickBudgetType = typeof maybeModeOrCategoryIds === 'string' ? maybeModeOrCategoryIds : 'Underfunded';
    } else if (typeof categoryIdsOrType === 'string') {
      quickBudgetType = categoryIdsOrType;
      if (Array.isArray(maybeModeOrCategoryIds)) {
        categoryIds = maybeModeOrCategoryIds;
      }
    }
  }

  if (isTauri) {
    return await invoke<PlanMonthSummary>('apply_quick_budget', {
      payload: {
        budget_id: budgetId,
        month,
        quick_budget_type: quickBudgetType,
        category_ids: categoryIds,
      },
    });
  }
  return null;
}

export interface TransactionDto {
  id: string;
  budget_id: string;
  account_id: string;
  account_name?: string | null;
  accountName?: string | null;
  payee_id: string | null;
  payee_name: string | null;
  category_id: string | null;
  category_name: string | null;
  date: string;
  amount_milliunits: number;
  memo: string | null;
  cleared: string;
  approved?: boolean;
  flag: string | null;
  transfer_account_id: string | null;
  transfer_transaction_id: string | null;
}

export function mapTransactionDto(dto: TransactionDto): TransactionItem {
  return {
    entityId: dto.id,
    accountId: dto.account_id,
    accountName: dto.account_name ?? dto.accountName ?? '',
    date: dto.date,
    payeeId: dto.payee_id || undefined,
    payeeName: dto.payee_name || (dto.transfer_account_id ? 'Transfer' : 'Uncategorized'),
    subCategoryId: dto.category_id || undefined,
    subCategoryName: dto.category_name || (dto.transfer_account_id ? 'Category not needed' : 'Uncategorized'),
    memo: dto.memo || '',
    amount: dto.amount_milliunits,
    cleared: dto.cleared.toLowerCase() as any,
    flag: dto.flag || null,
    transferAccountId: dto.transfer_account_id || undefined,
  };
}

export async function getTransactions(accountId?: string): Promise<TransactionItem[]> {
  if (isTauri) {
    const raw = await invoke<TransactionDto[]>('get_transactions', { accountId });
    return raw.map(mapTransactionDto);
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

export async function reconcileAccount(
  accountIdOrPayload:
    | string
    | {
        account_id: string;
        target_balance_milliunits: number;
        create_adjustment?: boolean;
      },
  targetBalanceMilliunits?: number
): Promise<any> {
  const payload =
    typeof accountIdOrPayload === 'string'
      ? {
          account_id: accountIdOrPayload,
          target_balance_milliunits: targetBalanceMilliunits ?? 0,
          create_adjustment: true,
        }
      : accountIdOrPayload;

  if (isTauri) {
    return await invoke('reconcile_account', {
      payload: {
        create_adjustment: true,
        ...payload,
        budget_id: DEFAULT_BUDGET_ID,
      },
    });
  }
  return null;
}

export async function bulkUpdateTransactions(
  transactionIds: string[],
  action: 'clear' | 'unclear' | 'flag' | 'move_account' | 'categorize',
  payload?: any
): Promise<void> {
  let normalizedPayload: any = null;
  if (action === 'flag') {
    normalizedPayload = typeof payload === 'object' && payload !== null && 'flag' in payload
      ? payload
      : { flag: payload ?? null };
  } else if (action === 'move_account') {
    normalizedPayload = typeof payload === 'object' && payload !== null && 'account_id' in payload
      ? payload
      : { account_id: payload };
  } else if (action === 'categorize') {
    normalizedPayload = typeof payload === 'object' && payload !== null && 'category_id' in payload
      ? payload
      : { category_id: payload };
  } else if (payload !== undefined) {
    normalizedPayload = payload;
  }

  if (isTauri) {
    await invoke('bulk_update_transactions', {
      transaction_ids: transactionIds,
      action,
      payload: normalizedPayload,
    });
  }
}

export async function reorderAccounts(orderedIds: string[]): Promise<void> {
  if (isTauri) {
    await invoke('reorder_accounts', {
      ordered_ids: orderedIds,
    });
  }
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

export async function closeAccount(accountId: string): Promise<void> {
  if (isTauri) {
    await invoke('close_account', {
      account_id: accountId,
    });
  }
}

export async function getPayees(budgetId = DEFAULT_BUDGET_ID): Promise<Array<{ id: string; name: string; internal_name?: string | null }>> {
  if (isTauri) {
    return await invoke('get_payees', { budget_id: budgetId });
  }
  return [];
}

export async function getCategoryGroups(): Promise<MasterCategoryGroup[]> {
  const now = new Date();
  const currentMonthIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const res = await getBudgetMonth(currentMonthIso);
  return res.categoryGroups;
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

export async function hideCategory(
  categoryId: string,
  isMaster = false,
  isHidden = true
): Promise<void> {
  if (isTauri) {
    await invoke('hide_category', {
      category_id: categoryId,
      is_master: isMaster,
      is_hidden: isHidden,
    });
  }
}

export async function reorderCategories(
  budgetIdOrGroupIds: string | string[] = DEFAULT_BUDGET_ID,
  orderedGroupIdsOrSubcats?: string[] | Record<string, string[]>,
  subcategoriesByGroup?: Record<string, string[]>
): Promise<void> {
  let budgetId = DEFAULT_BUDGET_ID;
  let orderedGroupIds: string[] = [];
  let subcatsByGroup: Record<string, string[]> = {};

  if (Array.isArray(budgetIdOrGroupIds)) {
    orderedGroupIds = budgetIdOrGroupIds;
    subcatsByGroup = (orderedGroupIdsOrSubcats as Record<string, string[]>) || {};
  } else {
    budgetId = budgetIdOrGroupIds || DEFAULT_BUDGET_ID;
    orderedGroupIds = (orderedGroupIdsOrSubcats as string[]) || [];
    subcatsByGroup = subcategoriesByGroup || {};
  }

  if (isTauri) {
    await invoke('reorder_categories', {
      budget_id: budgetId,
      ordered_group_ids: orderedGroupIds,
      subcategories_by_group: subcatsByGroup,
    });
  }
}

export async function updatePayee(payeeId: string, name: string): Promise<void> {
  if (isTauri) {
    await invoke('update_payee', {
      payee_id: payeeId,
      name,
    });
  }
}

export async function deletePayee(payeeId: string): Promise<void> {
  if (isTauri) {
    await invoke('delete_payee', {
      payee_id: payeeId,
    });
  }
}

export async function makeFreshStart(
  budgetIdOrNewName: string = DEFAULT_BUDGET_ID,
  newName?: string
): Promise<string> {
  let budgetId = DEFAULT_BUDGET_ID;
  let finalNewName = 'Fresh Start Budget';

  if (newName !== undefined) {
    budgetId = budgetIdOrNewName;
    finalNewName = newName;
  } else {
    finalNewName = budgetIdOrNewName;
  }

  if (isTauri) {
    return await invoke<string>('make_fresh_start', {
      budget_id: budgetId,
      new_name: finalNewName,
    });
  }
  return budgetId;
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
