import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Account,
  CategoryGroupWithCategories,
  PlanMonthSummary,
  Transaction,
} from "../api/types";

export interface SpendingBreakdownItem {
  categoryId: string;
  categoryName: string;
  spentMilliunits: number;
  percentageBasisPoints: number; // integer 0..10000 (100.00%)
  groupId?: string;
  groupName?: string;
}

export interface SpendingGroupBreakdownItem {
  groupId: string;
  groupName: string;
  spentMilliunits: number;
  percentageBasisPoints: number; // integer 0..10000 (100.00%)
  categoryCount: number;
}

export interface MockReflectData {
  totalSpendingMilliunits: number;
  spendingItems: SpendingBreakdownItem[];
  spendingGroupItems: SpendingGroupBreakdownItem[];
  assetsMilliunits: number;
  debtsMilliunits: number;
  netWorthMilliunits: number;
}

export interface ComputeReflectOptions {
  categoryGroups?: CategoryGroupWithCategories[];
  selectedCategoryIds?: Set<string> | null;
  selectedAccountIds?: Set<string> | null;
  transactions?: Transaction[] | null;
}

export function computeMockReflectData(
  monthSummary: PlanMonthSummary | null,
  accounts: Account[],
  options?: ComputeReflectOptions,
): MockReflectData {
  const selectedCategoryIds = options?.selectedCategoryIds;
  const selectedAccountIds = options?.selectedAccountIds;
  const categoryGroups = options?.categoryGroups;
  const transactions = options?.transactions;

  // When all accounts or all categories are deselected
  if (selectedAccountIds && selectedAccountIds.size === 0) {
    return {
      totalSpendingMilliunits: 0,
      spendingItems: [],
      spendingGroupItems: [],
      assetsMilliunits: 0,
      debtsMilliunits: 0,
      netWorthMilliunits: 0,
    };
  }

  if (selectedCategoryIds && selectedCategoryIds.size === 0) {
    let assetsMilliunits = 0;
    let debtsMilliunits = 0;
    for (const acc of accounts) {
      if (acc.closed) continue;
      if (selectedAccountIds && !selectedAccountIds.has(acc.id)) continue;
      if (acc.balance_milliunits >= 0) {
        assetsMilliunits += acc.balance_milliunits;
      } else {
        debtsMilliunits += Math.abs(acc.balance_milliunits);
      }
    }
    return {
      totalSpendingMilliunits: 0,
      spendingItems: [],
      spendingGroupItems: [],
      assetsMilliunits,
      debtsMilliunits,
      netWorthMilliunits: assetsMilliunits - debtsMilliunits,
    };
  }

  // Build lookup maps for groups
  const groupNameById = new Map<string, string>();
  const categoryGroupIdMap = new Map<string, string>();
  const catNameMap = new Map<string, string>();

  if (categoryGroups) {
    for (const grp of categoryGroups) {
      groupNameById.set(grp.id, grp.name);
      for (const cat of grp.categories) {
        categoryGroupIdMap.set(cat.id, grp.id);
        catNameMap.set(cat.id, cat.name);
      }
    }
  }

  if (monthSummary) {
    for (const c of monthSummary.categories) {
      if (!catNameMap.has(c.category_id)) {
        catNameMap.set(c.category_id, c.name);
      }
      if (c.group_id && !categoryGroupIdMap.has(c.category_id)) {
        categoryGroupIdMap.set(c.category_id, c.group_id);
      }
    }
  }

  let rawSpendingItems: {
    categoryId: string;
    categoryName: string;
    groupId: string;
    groupName: string;
    spentMilliunits: number;
  }[] = [];

  // When transactions are available and account filtering is active, or multi-month transactions used
  if (
    transactions &&
    transactions.length > 0 &&
    selectedAccountIds !== null &&
    selectedAccountIds !== undefined
  ) {
    const spendingByCat = new Map<string, number>();

    for (const tx of transactions) {
      if (!tx.category_id) continue;
      if (selectedAccountIds && !selectedAccountIds.has(tx.account_id)) {
        continue;
      }
      if (selectedCategoryIds && !selectedCategoryIds.has(tx.category_id)) {
        continue;
      }

      if (tx.amount_milliunits < 0) {
        const cur = spendingByCat.get(tx.category_id) ?? 0;
        spendingByCat.set(tx.category_id, cur + Math.abs(tx.amount_milliunits));
      } else if (tx.amount_milliunits > 0) {
        const cur = spendingByCat.get(tx.category_id) ?? 0;
        spendingByCat.set(tx.category_id, Math.max(0, cur - tx.amount_milliunits));
      }
    }

    for (const [catId, spent] of spendingByCat.entries()) {
      if (spent <= 0) continue;
      const grpId = categoryGroupIdMap.get(catId) || "other";
      const grpName =
        groupNameById.get(grpId) || (grpId === "other" ? "Other" : grpId);
      rawSpendingItems.push({
        categoryId: catId,
        categoryName: catNameMap.get(catId) || "Category",
        groupId: grpId,
        groupName: grpName,
        spentMilliunits: spent,
      });
    }
  } else {
    // Standard calculation from monthSummary
    const outflowCategories = (monthSummary?.categories ?? []).filter((c) => {
      if (c.is_credit_card_payment) return false;
      if (c.activity_milliunits >= 0) return false;
      if (selectedCategoryIds && !selectedCategoryIds.has(c.category_id)) {
        return false;
      }
      return true;
    });

    rawSpendingItems = outflowCategories.map((c) => {
      const grpId =
        c.group_id || categoryGroupIdMap.get(c.category_id) || "other";
      const grpName =
        groupNameById.get(grpId) || (grpId === "other" ? "Other" : grpId);
      return {
        categoryId: c.category_id,
        categoryName: c.name,
        groupId: grpId,
        groupName: grpName,
        spentMilliunits: Math.abs(c.activity_milliunits),
      };
    });
  }

  rawSpendingItems.sort((a, b) => b.spentMilliunits - a.spentMilliunits);

  const totalSpendingMilliunits = rawSpendingItems.reduce(
    (sum, item) => sum + item.spentMilliunits,
    0,
  );

  const spendingItems: SpendingBreakdownItem[] = rawSpendingItems.map(
    (item) => ({
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      groupId: item.groupId,
      groupName: item.groupName,
      spentMilliunits: item.spentMilliunits,
      percentageBasisPoints:
        totalSpendingMilliunits > 0
          ? Math.round((item.spentMilliunits * 10000) / totalSpendingMilliunits)
          : 0,
    }),
  );

  // Group calculation
  const groupMap = new Map<
    string,
    { groupId: string; groupName: string; spentMilliunits: number; count: number }
  >();

  for (const item of rawSpendingItems) {
    const existing = groupMap.get(item.groupId);
    if (existing) {
      existing.spentMilliunits += item.spentMilliunits;
      existing.count += 1;
    } else {
      groupMap.set(item.groupId, {
        groupId: item.groupId,
        groupName: item.groupName,
        spentMilliunits: item.spentMilliunits,
        count: 1,
      });
    }
  }

  const rawGroupItems = Array.from(groupMap.values()).sort(
    (a, b) => b.spentMilliunits - a.spentMilliunits,
  );

  const spendingGroupItems: SpendingGroupBreakdownItem[] = rawGroupItems.map(
    (grp) => ({
      groupId: grp.groupId,
      groupName: grp.groupName,
      spentMilliunits: grp.spentMilliunits,
      categoryCount: grp.count,
      percentageBasisPoints:
        totalSpendingMilliunits > 0
          ? Math.round((grp.spentMilliunits * 10000) / totalSpendingMilliunits)
          : 0,
    }),
  );

  let assetsMilliunits = 0;
  let debtsMilliunits = 0;

  for (const acc of accounts) {
    if (acc.closed) continue;
    if (selectedAccountIds && !selectedAccountIds.has(acc.id)) continue;

    if (acc.balance_milliunits >= 0) {
      assetsMilliunits += acc.balance_milliunits;
    } else {
      debtsMilliunits += Math.abs(acc.balance_milliunits);
    }
  }

  return {
    totalSpendingMilliunits,
    spendingItems,
    spendingGroupItems,
    assetsMilliunits,
    debtsMilliunits,
    netWorthMilliunits: assetsMilliunits - debtsMilliunits,
  };
}

export function useMockReflect(
  monthSummary: PlanMonthSummary | null,
  accounts: Account[],
  options?: ComputeReflectOptions,
): MockReflectData {
  return useMemo(
    () => computeMockReflectData(monthSummary, accounts, options),
    [
      monthSummary,
      accounts,
      options?.categoryGroups,
      options?.selectedCategoryIds,
      options?.selectedAccountIds,
      options?.transactions,
    ],
  );
}

export type ThemeMode = "theme-light" | "theme-dark";

export function useTheme(): {
  theme: ThemeMode;
  toggleTheme: () => void;
} {
  const [theme, setTheme] = useState<ThemeMode>("theme-light");

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("theme-light", "theme-dark");
      document.documentElement.classList.add(theme);
      document.body.classList.remove("theme-light", "theme-dark");
      document.body.classList.add(theme);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "theme-light" ? "theme-dark" : "theme-light"));
  }, []);

  return { theme, toggleTheme };
}
