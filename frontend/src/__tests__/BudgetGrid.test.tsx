import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import {
  BudgetWorkspace,
  resolveAssignedCellCommit,
} from "../components/BudgetWorkspace";
import { BudgetInspector } from "../components/BudgetInspector";
import type {
  CategoryGroupWithCategories,
  PlanMonthSummary,
} from "../api/types";

const groups: CategoryGroupWithCategories[] = [
  {
    id: "grp-1",
    plan_id: "plan-1",
    name: "Frequent Spending",
    is_system: false,
    hidden: false,
    sort_order: 1,
    categories: [
      {
        id: "cat-groceries",
        plan_id: "plan-1",
        group_id: "grp-1",
        name: "Groceries",
        note: "Fresh produce",
        is_inflow_category: false,
        is_credit_card_payment: false,
        hidden: false,
        sort_order: 1,
      },
      {
        id: "cat-dining",
        plan_id: "plan-1",
        group_id: "grp-1",
        name: "Dining Out",
        note: null,
        is_inflow_category: false,
        is_credit_card_payment: false,
        hidden: false,
        sort_order: 2,
      },
    ],
  },
];

const monthSummary: PlanMonthSummary = {
  month: "2026-10-01",
  ready_to_assign_milliunits: 1540250,
  total_assigned_milliunits: 500000,
  total_activity_milliunits: -165000,
  total_available_milliunits: 335000,
  categories: [
    {
      category_id: "cat-groceries",
      group_id: "grp-1",
      name: "Groceries",
      note: "Fresh produce",
      assigned_milliunits: 500000,
      activity_milliunits: -120000,
      available_milliunits: 380000,
      is_credit_card_payment: false,
      hidden: false,
      sort_order: 1,
    },
    {
      category_id: "cat-dining",
      group_id: "grp-1",
      name: "Dining Out",
      note: null,
      assigned_milliunits: 0,
      activity_milliunits: -45000,
      available_milliunits: -45000,
      is_credit_card_payment: false,
      hidden: false,
      sort_order: 2,
    },
  ],
};

describe("BudgetWorkspace & BudgetInspector Rendering and Calculator Commits (F2)", () => {
  it("renders Ready to Assign banner, category groups, and Available pills (positive & negative)", () => {
    const html = renderToStaticMarkup(
      <BudgetWorkspace
        month="2026-10-01"
        monthSummary={monthSummary}
        categoryGroups={groups}
        selectedCategoryId="cat-groceries"
        onSelectCategory={vi.fn()}
        onChangeMonth={vi.fn()}
        onAssignCategory={vi.fn()}
        onCreateGroup={vi.fn()}
        onUpdateGroup={vi.fn()}
        onDeleteGroupRequest={vi.fn()}
        onCreateCategory={vi.fn()}
        onUpdateCategory={vi.fn()}
        onDeleteCategoryRequest={vi.fn()}
        onOpenMoveMoney={vi.fn()}
      />,
    );

    expect(html).toContain("Oct 2026");
    expect(html).toContain("$1,540.25");
    expect(html).toContain("Ready to Assign");
    expect(html).toContain("Frequent Spending");
    expect(html).toContain("Groceries");
    expect(html).toContain("$380.00");
    expect(html).toContain("-$45.00");
    expect(html).toContain("pill-positive");
    expect(html).toContain("pill-negative");
  });

  it("evaluates inline math and relative +/- expressions when committing an Assigned cell edit", () => {
    expect(resolveAssignedCellCommit("500 + 125.50", 500000)).toBe(625500);
    expect(resolveAssignedCellCommit("+50", 500000)).toBe(550000);
    expect(resolveAssignedCellCommit("-100", 500000)).toBe(400000);
    expect(resolveAssignedCellCommit("", 500000)).toBe(0);
  });

  it("renders BudgetInspector with month summary, Quick Budget buttons, and Category Note editor", () => {
    const selectedCategory = monthSummary.categories[0]!;
    const html = renderToStaticMarkup(
      <BudgetInspector
        month="2026-10-01"
        monthSummary={monthSummary}
        selectedCategory={selectedCategory}
        onQuickAssign={vi.fn()}
        onSaveCategoryNote={vi.fn()}
      />,
    );

    expect(html).toContain("Groceries");
    expect(html).toContain("Fresh produce");
    expect(html).toContain("Reset Assigned to $0.00");
  });

  it("renders Overspent filter button only when overspent categories exist", () => {
    // With monthSummary (has cat-dining with -45000): should show Overspent filter button
    const htmlWithOverspent = renderToStaticMarkup(
      <BudgetWorkspace
        month="2026-10-01"
        monthSummary={monthSummary}
        categoryGroups={groups}
        selectedCategoryId={null}
        onSelectCategory={vi.fn()}
        onChangeMonth={vi.fn()}
        onAssignCategory={vi.fn()}
        onCreateGroup={vi.fn()}
        onUpdateGroup={vi.fn()}
        onDeleteGroupRequest={vi.fn()}
        onCreateCategory={vi.fn()}
        onUpdateCategory={vi.fn()}
        onDeleteCategoryRequest={vi.fn()}
        onOpenMoveMoney={vi.fn()}
      />,
    );
    expect(htmlWithOverspent).toContain("view-button-overspent");
    expect(htmlWithOverspent).toContain("1 Overspent");

    // With all-funded categories (no overspending): should NOT show Overspent filter button
    const fundedSummary: PlanMonthSummary = {
      ...monthSummary,
      categories: monthSummary.categories.map((c) => ({
        ...c,
        available_milliunits: Math.max(0, c.available_milliunits),
      })),
    };
    const htmlWithoutOverspent = renderToStaticMarkup(
      <BudgetWorkspace
        month="2026-10-01"
        monthSummary={fundedSummary}
        categoryGroups={groups}
        selectedCategoryId={null}
        onSelectCategory={vi.fn()}
        onChangeMonth={vi.fn()}
        onAssignCategory={vi.fn()}
        onCreateGroup={vi.fn()}
        onUpdateGroup={vi.fn()}
        onDeleteGroupRequest={vi.fn()}
        onCreateCategory={vi.fn()}
        onUpdateCategory={vi.fn()}
        onDeleteCategoryRequest={vi.fn()}
        onOpenMoveMoney={vi.fn()}
      />,
    );
    expect(htmlWithoutOverspent).not.toContain("view-button-overspent");
    expect(htmlWithoutOverspent).not.toContain("Overspent");
  });

  it("renders realistic progress bar status and width based on actual category state", () => {
    const html = renderToStaticMarkup(
      <BudgetWorkspace
        month="2026-10-01"
        monthSummary={monthSummary}
        categoryGroups={groups}
        selectedCategoryId={null}
        onSelectCategory={vi.fn()}
        onChangeMonth={vi.fn()}
        onAssignCategory={vi.fn()}
        onCreateGroup={vi.fn()}
        onUpdateGroup={vi.fn()}
        onDeleteGroupRequest={vi.fn()}
        onCreateCategory={vi.fn()}
        onUpdateCategory={vi.fn()}
        onDeleteCategoryRequest={vi.fn()}
        onOpenMoveMoney={vi.fn()}
      />,
    );

    // Always renders progress bar container
    expect(html).toContain("ynab-new-budget-bar-v2");
    // Overspent category: cat-dining (-45000)
    expect(html).toContain("Overspent by $45.00");
    // Partially spent category: cat-groceries (spent 120000 of 500000)
    expect(html).toContain("Spent $120.00 of $500.00");
    // Does NOT render fake "$0.00 needed"
    expect(html).not.toContain("$0.00 needed");

    // Unfunded category (0 available, 0 activity) renders progress bar track and "Unfunded" label
    const unfundedSummary: PlanMonthSummary = {
      ...monthSummary,
      categories: [
        {
          category_id: "cat-unfunded",
          group_id: "grp-1",
          name: "Vacation",
          note: null,
          assigned_milliunits: 0,
          activity_milliunits: 0,
          available_milliunits: 0,
          is_credit_card_payment: false,
          hidden: false,
          sort_order: 1,
        },
      ],
    };
    const htmlUnfunded = renderToStaticMarkup(
      <BudgetWorkspace
        month="2026-10-01"
        monthSummary={unfundedSummary}
        categoryGroups={groups}
        selectedCategoryId={null}
        onSelectCategory={vi.fn()}
        onChangeMonth={vi.fn()}
        onAssignCategory={vi.fn()}
        onCreateGroup={vi.fn()}
        onUpdateGroup={vi.fn()}
        onDeleteGroupRequest={vi.fn()}
        onCreateCategory={vi.fn()}
        onUpdateCategory={vi.fn()}
        onDeleteCategoryRequest={vi.fn()}
        onOpenMoveMoney={vi.fn()}
      />,
    );
    expect(htmlUnfunded).toContain("ynab-new-budget-bar-v2");
    expect(htmlUnfunded).toContain("Unfunded");
    expect(htmlUnfunded).toContain("width:0%");
    expect(htmlUnfunded).toContain("is-unfunded");
  });
});