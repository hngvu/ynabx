import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { computeMockReflectData } from "../hooks/useUiOnlyFeatures";
import { ReflectView } from "../components/ReflectView";
import { formatMilliunits, parseInputToMilliunits } from "../App";
import type { Account, PlanMonthSummary } from "../api/types";

const sampleSummary: PlanMonthSummary = {
  month: "2026-10-01",
  ready_to_assign_milliunits: 50000,
  total_assigned_milliunits: 400000,
  total_activity_milliunits: -250000,
  total_available_milliunits: 150000,
  categories: [
    {
      category_id: "cat-1",
      group_id: "grp-1",
      name: "Rent",
      hidden: false,
      is_credit_card_payment: false,
      sort_order: 1,
      assigned_milliunits: 300000,
      activity_milliunits: -200000,
      available_milliunits: 100000,
    },
    {
      category_id: "cat-2",
      group_id: "grp-1",
      name: "Groceries",
      hidden: false,
      is_credit_card_payment: false,
      sort_order: 2,
      assigned_milliunits: 100000,
      activity_milliunits: -50000,
      available_milliunits: 50000,
    },
  ],
};

const sampleAccounts: Account[] = [
  {
    id: "acc-1",
    plan_id: "plan-1",
    name: "Checking",
    type: "CHECKING",
    on_budget: true,
    closed: false,
    balance_milliunits: 500000,
    cleared_balance_milliunits: 500000,
    uncleared_balance_milliunits: 0,
    sort_order: 1,
  },
  {
    id: "acc-2",
    plan_id: "plan-1",
    name: "Visa Card",
    type: "CREDIT_CARD",
    on_budget: true,
    closed: false,
    balance_milliunits: -120000,
    cleared_balance_milliunits: -120000,
    uncleared_balance_milliunits: 0,
    sort_order: 2,
  },
];

describe("Phase F5 UI-Only Reflect & App integration", () => {
  it("computeMockReflectData computes spending breakdown and net worth from milliunits", () => {
    const reflect = computeMockReflectData(sampleSummary, sampleAccounts);

    expect(reflect.totalSpendingMilliunits).toBe(250000);
    expect(reflect.spendingItems).toHaveLength(2);
    expect(reflect.spendingItems[0]?.categoryName).toBe("Rent");
    expect(reflect.spendingItems[0]?.spentMilliunits).toBe(200000);

    expect(reflect.assetsMilliunits).toBe(500000);
    expect(reflect.debtsMilliunits).toBe(120000);
    expect(reflect.netWorthMilliunits).toBe(380000);
  });

  it("ReflectView renders Spending Breakdown and Net Worth sections", () => {
    const html = renderToStaticMarkup(
      <ReflectView monthSummary={sampleSummary} accounts={sampleAccounts} />,
    );
    expect(html).toContain("Spending Breakdown");
    expect(html).toContain("Net Worth");
    expect(html).toContain("Rent");
    expect(html).toContain("$380.00");
  });

  it("App.tsx re-exports formatMilliunits and parseInputToMilliunits", () => {
    expect(formatMilliunits(12340)).toBe("$12.34");
    expect(parseInputToMilliunits("12.34")).toBe(12340);
  });
});
