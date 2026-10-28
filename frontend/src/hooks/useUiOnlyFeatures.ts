import { useCallback, useEffect, useMemo, useState } from "react";
import type { Account, PlanMonthSummary } from "../api/types";

export interface SpendingBreakdownItem {
  categoryId: string;
  categoryName: string;
  spentMilliunits: number;
  percentageBasisPoints: number; // integer 0..10000 (100.00%)
}

export interface MockReflectData {
  totalSpendingMilliunits: number;
  spendingItems: SpendingBreakdownItem[];
  assetsMilliunits: number;
  debtsMilliunits: number;
  netWorthMilliunits: number;
}

export function computeMockReflectData(
  monthSummary: PlanMonthSummary | null,
  accounts: Account[],
): MockReflectData {
  const outflowCategories =
    monthSummary?.categories
      .filter((c) => !c.is_credit_card_payment && c.activity_milliunits < 0)
      .map((c) => ({
        categoryId: c.category_id,
        categoryName: c.name,
        spentMilliunits: Math.abs(c.activity_milliunits),
      }))
      .sort((a, b) => b.spentMilliunits - a.spentMilliunits) ?? [];

  const totalSpendingMilliunits = outflowCategories.reduce(
    (sum, item) => sum + item.spentMilliunits,
    0,
  );

  const spendingItems: SpendingBreakdownItem[] = outflowCategories.map(
    (item) => ({
      ...item,
      percentageBasisPoints:
        totalSpendingMilliunits > 0
          ? Math.round((item.spentMilliunits * 10000) / totalSpendingMilliunits)
          : 0,
    }),
  );

  let assetsMilliunits = 0;
  let debtsMilliunits = 0;

  for (const acc of accounts) {
    if (acc.closed) continue;
    if (acc.balance_milliunits >= 0) {
      assetsMilliunits += acc.balance_milliunits;
    } else {
      debtsMilliunits += Math.abs(acc.balance_milliunits);
    }
  }

  return {
    totalSpendingMilliunits,
    spendingItems,
    assetsMilliunits,
    debtsMilliunits,
    netWorthMilliunits: assetsMilliunits - debtsMilliunits,
  };
}

export function useMockReflect(
  monthSummary: PlanMonthSummary | null,
  accounts: Account[],
): MockReflectData {
  return useMemo(
    () => computeMockReflectData(monthSummary, accounts),
    [monthSummary, accounts],
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
