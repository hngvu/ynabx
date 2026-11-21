import { MasterCategoryGroup, SubCategoryItem } from '../components/budget/budgetData';

export type MonthKey = string; // YYYY-MM

export interface MonthlyLedgerSnapshot {
  monthKey: MonthKey;
  groups: MasterCategoryGroup[];
  readyToAssign: number;
  note: string;
}

export function formatMonthKey(date: Date): MonthKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function parseMonthKey(key: MonthKey): Date {
  const [yStr, mStr] = key.split('-');
  return new Date(Number(yStr), Number(mStr) - 1, 1);
}

export function addMonthsToKey(key: MonthKey, delta: number): MonthKey {
  const d = parseMonthKey(key);
  return formatMonthKey(new Date(d.getFullYear(), d.getMonth() + delta, 1));
}

export type RtaStateKey =
  | 'ftueZero'
  | 'ftueAccountsAdded'
  | 'ftueAssign'
  | 'ftueOverdraft'
  | 'overdraft'
  | 'overassigned'
  | 'readyToAssign'
  | 'allMoneyAssigned';

export interface RtaState {
  key: RtaStateKey;
  label: string;
  icon?: string;
  action?: 'openAddAccountModal' | 'openOverdraftArticle' | 'openAutoAssign';
  buttonLabel: string | null;
  buttonClass: string;
  buttonHidden?: boolean;
}

export function computeCashAvailable(groups: MasterCategoryGroup[]): number {
  let total = 0;
  for (const grp of groups) {
    if (grp.isHidden) continue;
    for (const cat of grp.categories) {
      if (cat.isHidden) continue;
      // Cash available excludes credit card debt overspending
      if (!cat.isDebtPayment) {
        total += cat.available ?? 0;
      } else {
        total += Math.max(0, cat.available ?? 0);
      }
    }
  }
  return total;
}

export function computeToBeBudgetedState(params: {
  leftToBudget: number;
  cashAvailable: number;
  isFtueOnboardingShown?: boolean;
  isOnFtueAssignOrLater?: boolean;
}): RtaState {
  const {
    leftToBudget,
    cashAvailable,
    isFtueOnboardingShown = false,
    isOnFtueAssignOrLater = true,
  } = params;

  const isAllMoneyAssigned = leftToBudget === 0;
  const isNegative = leftToBudget < 0;
  const isNotYetReadyToAssign = isFtueOnboardingShown && !isOnFtueAssignOrLater;
  const isOverdraft = isNegative && Math.abs(leftToBudget) > cashAvailable;

  if (isOverdraft) {
    if (isFtueOnboardingShown) {
      return {
        key: 'ftueOverdraft',
        label: 'Overdraft',
        icon: 'exclamation_mark_circle_fill',
        buttonLabel: null,
        buttonClass: 'to-be-budgeted-icon',
      };
    }
    return {
      key: 'overdraft',
      label: 'Overdraft',
      action: 'openOverdraftArticle',
      buttonLabel: 'Next Steps',
      buttonClass: 'to-be-budgeted-button',
    };
  }

  if (isNegative) {
    return {
      key: 'overassigned',
      label: 'You assigned more than you have',
      action: 'openAutoAssign',
      buttonLabel: 'Fix This',
      buttonClass: 'to-be-budgeted-button',
    };
  }

  if (isAllMoneyAssigned) {
    if (isNotYetReadyToAssign) {
      return {
        key: 'ftueZero',
        label: 'Not Yet Ready to Assign',
        action: 'openAddAccountModal',
        buttonLabel: 'Add Account',
        buttonClass: 'to-be-budgeted-button',
      };
    }
    return {
      key: 'allMoneyAssigned',
      label: 'All Money Assigned',
      icon: 'check_circle_fill',
      buttonLabel: null,
      buttonClass: 'to-be-budgeted-icon',
    };
  }

  if (isFtueOnboardingShown) {
    if (isNotYetReadyToAssign) {
      return {
        key: 'ftueAccountsAdded',
        label: 'Ready to Assign',
        icon: 'check_circle_fill',
        buttonLabel: null,
        buttonClass: 'to-be-budgeted-icon',
      };
    }
    return {
      key: 'ftueAssign',
      label: 'Ready to Assign',
      buttonLabel: null,
      buttonClass: '',
      buttonHidden: true,
    };
  }

  return {
    key: 'readyToAssign',
    label: 'Ready to Assign',
    icon: 'caret_down',
    action: 'openAutoAssign',
    buttonLabel: 'Assign',
    buttonClass: 'to-be-budgeted-button',
  };
}

/**
 * Compute next month's initial category balances & RTA using zero-based rollover rules:
 * - Positive Available in month M rolls over into month M+1 Available.
 * - Cash overspending (negative Available on non-CC category) resets to 0 in M+1 and deducts from M+1 RTA.
 * - Credit overspending (negative Available on CC category) resets to 0 without deducting from RTA.
 */
export function computeMonthRollover(params: {
  prevGroups: MasterCategoryGroup[];
  prevReadyToAssign: number;
  existingNextGroups?: MasterCategoryGroup[];
}): {
  groups: MasterCategoryGroup[];
  readyToAssign: number;
  cashOverspendingDeduction: number;
} {
  const { prevGroups, prevReadyToAssign, existingNextGroups } = params;
  let cashOverspendingDeduction = 0;

  const existingById = new Map<string, SubCategoryItem>();
  if (existingNextGroups) {
    for (const g of existingNextGroups) {
      for (const c of g.categories) {
        existingById.set(c.entityId, c);
      }
    }
  }

  let totalAssignedInNext = 0;
  const groups: MasterCategoryGroup[] = prevGroups.map((grp) => ({
    ...grp,
    categories: grp.categories.map((prevCat) => {
      const prevAvail = prevCat.available ?? 0;
      let rolledOver = 0;
      if (prevAvail > 0) {
        rolledOver = prevAvail;
      } else if (prevAvail < 0 && !prevCat.isDebtPayment) {
        cashOverspendingDeduction += Math.abs(prevAvail);
      }

      const existingNext = existingById.get(prevCat.entityId);
      const nextAssigned = existingNext?.assigned ?? 0;
      const nextActivity = existingNext?.activity ?? 0;
      totalAssignedInNext += nextAssigned;

      return {
        ...prevCat,
        assigned: nextAssigned,
        activity: nextActivity,
        available: rolledOver + nextAssigned + nextActivity,
        isGoalSnoozed: existingNext?.isGoalSnoozed ?? false,
      };
    }),
  }));

  const readyToAssign = prevReadyToAssign - cashOverspendingDeduction - totalAssignedInNext;
  return { groups, readyToAssign, cashOverspendingDeduction };
}

/**
 * Automatic Credit Card Payment Category movement:
 * When spending on a budgeted category using a credit card, the funded portion of the spending
 * moves from the spent category's Available into the Credit Card Payment category's Available.
 */
export function applyCreditCardSpendingMovement(
  groups: MasterCategoryGroup[],
  spentCategoryId: string,
  ccPaymentCategoryId: string,
  spendingMilliunits: number
): MasterCategoryGroup[] {
  const spendAbs = Math.abs(Math.min(0, spendingMilliunits));
  let fundedMovement = 0;

  const afterSpend = groups.map((grp) => ({
    ...grp,
    categories: grp.categories.map((cat) => {
      if (cat.entityId !== spentCategoryId) return cat;
      const prevAvail = cat.available ?? 0;
      fundedMovement = Math.min(spendAbs, Math.max(0, prevAvail));
      return {
        ...cat,
        activity: (cat.activity ?? 0) + spendingMilliunits,
        available: prevAvail + spendingMilliunits,
      };
    }),
  }));

  if (fundedMovement === 0) return afterSpend;

  return afterSpend.map((grp) => ({
    ...grp,
    categories: grp.categories.map((cat) => {
      if (cat.entityId !== ccPaymentCategoryId) return cat;
      return {
        ...cat,
        activity: (cat.activity ?? 0) + fundedMovement,
        available: (cat.available ?? 0) + fundedMovement,
      };
    }),
  }));
}

export type QuickBudgetMethod =
  | 'underfunded'
  | 'assignedLastMonth'
  | 'spentLastMonth'
  | 'averageAssigned'
  | 'averageSpent'
  | 'resetAvailable'
  | 'resetAssigned';

export interface QuickBudgetOption {
  type: QuickBudgetMethod;
  name: string;
  title: string;
  displayValue: number;
}

export interface MoneyMoveRecord {
  id: string;
  timestamp: string;
  monthKey: MonthKey;
  fromCategoryId: string | null;
  fromCategoryName: string;
  toCategoryId: string | null;
  toCategoryName: string;
  amount: number;
}

export function computeQuickBudgetOptions(params: {
  categories: SubCategoryItem[];
  leftToBudget: number;
  hasExplicitSelection: boolean;
  prevMonthGroups?: MasterCategoryGroup[];
  historicalMonthGroups?: MasterCategoryGroup[][];
}): QuickBudgetOption[] {
  const {
    categories,
    leftToBudget,
    hasExplicitSelection,
    prevMonthGroups,
    historicalMonthGroups,
  } = params;

  const prevById = new Map<string, SubCategoryItem>();
  if (prevMonthGroups) {
    for (const g of prevMonthGroups) {
      for (const c of g.categories) prevById.set(c.entityId, c);
    }
  }

  let underfundedTotal = 0;
  let assignedLastMonthTotal = 0;
  let spentLastMonthTotal = 0;
  let averageAssignedTotal = 0;
  let averageSpentTotal = 0;

  for (const cat of categories) {
    if (cat.isGoalSnoozed) continue;
    const targetAmt = cat.target?.targetAmount ?? 0;
    const needed = cat.target
      ? cat.target.targetType === 'TB'
        ? Math.max(0, targetAmt - (cat.available ?? 0))
        : Math.max(0, targetAmt - (cat.assigned ?? 0))
      : 0;
    underfundedTotal += needed;

    const prevCat = prevById.get(cat.entityId);
    assignedLastMonthTotal += prevCat ? prevCat.assigned : cat.assigned ?? 0;
    spentLastMonthTotal += Math.abs(Math.min(0, prevCat ? prevCat.activity : cat.activity ?? 0));

    if (historicalMonthGroups && historicalMonthGroups.length > 0) {
      let sumAssigned = 0;
      let sumSpent = 0;
      for (const monthGrps of historicalMonthGroups) {
        const match = monthGrps.flatMap((g) => g.categories).find((c) => c.entityId === cat.entityId);
        if (match) {
          sumAssigned += match.assigned ?? 0;
          sumSpent += Math.abs(Math.min(0, match.activity ?? 0));
        }
      }
      averageAssignedTotal += Math.round(sumAssigned / historicalMonthGroups.length);
      averageSpentTotal += Math.round(sumSpent / historicalMonthGroups.length);
    } else {
      averageAssignedTotal += cat.assigned ?? 0;
      averageSpentTotal += Math.abs(Math.min(0, cat.activity ?? 0));
    }
  }

  if (!hasExplicitSelection && leftToBudget >= 0) {
    underfundedTotal = Math.min(underfundedTotal, leftToBudget);
  }

  return [
    {
      type: 'underfunded',
      name: 'Underfunded',
      title: 'Assign enough to fund all underfunded targets',
      displayValue: underfundedTotal,
    },
    {
      type: 'assignedLastMonth',
      name: 'Assigned Last Month',
      title: 'Assign the same amount as last month',
      displayValue: assignedLastMonthTotal,
    },
    {
      type: 'spentLastMonth',
      name: 'Spent Last Month',
      title: 'Assign the amount spent last month',
      displayValue: spentLastMonthTotal,
    },
    {
      type: 'averageAssigned',
      name: 'Average Assigned',
      title: 'Feeling average? Fund your categories with your historical average assigned.',
      displayValue: averageAssignedTotal,
    },
    {
      type: 'averageSpent',
      name: 'Average Spent',
      title: 'Assign your historical average spent.',
      displayValue: averageSpentTotal,
    },
    {
      type: 'resetAvailable',
      name: 'Reset Available Amounts',
      title: 'Set available amounts to $0.00, moving funds back to Ready to Assign.',
      displayValue: 0,
    },
    {
      type: 'resetAssigned',
      name: 'Reset Assigned Amounts',
      title: 'Reset all assigned amounts for this month to $0.00.',
      displayValue: 0,
    },
  ];
}

export function applyQuickBudgetMethod(params: {
  groups: MasterCategoryGroup[];
  targetCategoryIds: string[] | null;
  method: QuickBudgetMethod;
  readyToAssign: number;
  monthKey: MonthKey;
  prevMonthGroups?: MasterCategoryGroup[];
}): {
  groups: MasterCategoryGroup[];
  readyToAssign: number;
  moves: MoneyMoveRecord[];
} {
  const { groups, targetCategoryIds, method, readyToAssign, monthKey, prevMonthGroups } = params;
  const targetSet = targetCategoryIds && targetCategoryIds.length > 0 ? new Set(targetCategoryIds) : null;

  const prevById = new Map<string, SubCategoryItem>();
  if (prevMonthGroups) {
    for (const g of prevMonthGroups) {
      for (const c of g.categories) prevById.set(c.entityId, c);
    }
  }

  let rta = readyToAssign;
  const moves: MoneyMoveRecord[] = [];
  const now = new Date().toISOString();

  const updatedGroups = groups.map((grp) => ({
    ...grp,
    categories: grp.categories.map((cat) => {
      if (cat.isHidden) return cat;
      if (targetSet && !targetSet.has(cat.entityId)) return cat;

      const curAssigned = cat.assigned ?? 0;
      const curAvailable = cat.available ?? 0;
      let nextAssigned = curAssigned;

      if (method === 'underfunded') {
        if (!cat.target || cat.isGoalSnoozed) return cat;
        const targetAmt = cat.target.targetAmount ?? 0;
        const needed =
          cat.target.targetType === 'TB'
            ? Math.max(0, targetAmt - curAvailable)
            : Math.max(0, targetAmt - curAssigned);
        if (needed <= 0) return cat;
        const toAssign = targetSet ? needed : Math.min(needed, Math.max(0, rta));
        if (toAssign <= 0) return cat;
        nextAssigned = curAssigned + toAssign;
      } else if (method === 'assignedLastMonth') {
        const prevCat = prevById.get(cat.entityId);
        nextAssigned = prevCat ? prevCat.assigned : curAssigned;
      } else if (method === 'spentLastMonth' || method === 'averageSpent') {
        const prevCat = prevById.get(cat.entityId);
        nextAssigned = Math.abs(Math.min(0, prevCat ? prevCat.activity : cat.activity ?? 0));
      } else if (method === 'averageAssigned') {
        const prevCat = prevById.get(cat.entityId);
        nextAssigned = prevCat ? prevCat.assigned : curAssigned;
      } else if (method === 'resetAssigned') {
        nextAssigned = 0;
      } else if (method === 'resetAvailable') {
        nextAssigned = curAssigned - curAvailable;
      }

      const delta = nextAssigned - curAssigned;
      if (delta === 0) return cat;

      rta -= delta;
      moves.push({
        id: `move-${Date.now()}-${cat.entityId}`,
        timestamp: now,
        monthKey,
        fromCategoryId: delta > 0 ? null : cat.entityId,
        fromCategoryName: delta > 0 ? 'Ready to Assign' : cat.name,
        toCategoryId: delta > 0 ? cat.entityId : null,
        toCategoryName: delta > 0 ? cat.name : 'Ready to Assign',
        amount: Math.abs(delta),
      });

      return {
        ...cat,
        assigned: nextAssigned,
        available: curAvailable + delta,
      };
    }),
  }));

  return { groups: updatedGroups, readyToAssign: rta, moves };
}

export type CreditCardPaymentState =
  | 'CreditOverspending'
  | 'FullyOrOverFunded'
  | 'FullyPaid'
  | 'Underfunded'
  | 'UnfundedPaymentMade'
  | 'UncategorizedTransactions';

export interface CreditCardDetails {
  paymentState: CreditCardPaymentState;
  availableForPayment: number;
  accountBalance: number;
  underfundedAmount: number;
  overspentAmount: number;
  isMultiPartUnderfunded: boolean;
}

export function computeCreditCardDetails(
  ccCategory: SubCategoryItem,
  allGroups: MasterCategoryGroup[],
  ccAccountBalance = -27480
): CreditCardDetails {
  const availableForPayment = ccCategory.available ?? 0;
  const debtNeeded = Math.abs(Math.min(0, ccAccountBalance));
  const overspentCategories = allGroups
    .flatMap((g) => g.categories)
    .filter((c) => !c.isDebtPayment && (c.available ?? 0) < 0);
  const overspentAmount = overspentCategories.reduce((sum, c) => sum + Math.abs(c.available ?? 0), 0);

  if (availableForPayment < 0) {
    return {
      paymentState: 'UnfundedPaymentMade',
      availableForPayment,
      accountBalance: ccAccountBalance,
      underfundedAmount: Math.abs(availableForPayment) + debtNeeded,
      overspentAmount,
      isMultiPartUnderfunded: overspentAmount > 0,
    };
  }

  if (overspentAmount > 0) {
    return {
      paymentState: 'CreditOverspending',
      availableForPayment,
      accountBalance: ccAccountBalance,
      underfundedAmount: Math.max(0, debtNeeded - availableForPayment),
      overspentAmount,
      isMultiPartUnderfunded: debtNeeded - availableForPayment > overspentAmount,
    };
  }

  if (debtNeeded === 0) {
    return {
      paymentState: 'FullyPaid',
      availableForPayment,
      accountBalance: ccAccountBalance,
      underfundedAmount: 0,
      overspentAmount: 0,
      isMultiPartUnderfunded: false,
    };
  }

  if (availableForPayment >= debtNeeded) {
    return {
      paymentState: 'FullyOrOverFunded',
      availableForPayment,
      accountBalance: ccAccountBalance,
      underfundedAmount: 0,
      overspentAmount: 0,
      isMultiPartUnderfunded: false,
    };
  }

  return {
    paymentState: 'Underfunded',
    availableForPayment,
    accountBalance: ccAccountBalance,
    underfundedAmount: debtNeeded - availableForPayment,
    overspentAmount: 0,
    isMultiPartUnderfunded: false,
  };
}
