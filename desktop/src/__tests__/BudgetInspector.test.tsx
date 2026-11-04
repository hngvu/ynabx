import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BudgetInspector } from "../components/BudgetInspector";
import type { CategoryMonthAllocation, PlanMonthSummary } from "../api/types";
import { saveCategoryTarget } from "../utils/targetUtils";

describe("BudgetInspector Component", () => {
  const sampleSummary: PlanMonthSummary = {
    month: "2026-10-01",
    ready_to_assign_milliunits: 100000,
    total_assigned_milliunits: 500000,
    total_activity_milliunits: -150000,
    total_available_milliunits: 350000,
    categories: [],
  };

  const sampleCategory: CategoryMonthAllocation = {
    category_id: "cat-1",
    group_id: "grp-1",
    name: "Groceries",
    hidden: false,
    is_credit_card_payment: false,
    sort_order: 1,
    assigned_milliunits: 200000,
    activity_milliunits: -50000,
    available_milliunits: 150000,
    note: "Weekly grocery budget",
  };

  it("renders month summary when no category is selected", () => {
    const onQuickAssign = vi.fn();
    const onSaveCategoryNote = vi.fn();

    const html = renderToStaticMarkup(
      <BudgetInspector
        month="2026-10-01"
        monthSummary={sampleSummary}
        selectedCategory={null}
        onQuickAssign={onQuickAssign}
        onSaveCategoryNote={onSaveCategoryNote}
      />,
    );

    expect(html).toContain("budget-inspector");
    expect(html).toContain("budget-inspector-resizer");
    expect(html).toContain("Oct 2026 Summary");
    expect(html).toContain("$500.00"); // total assigned
    expect(html).toContain("-$150.00"); // total activity
    expect(html).toContain("$350.00"); // total available
    expect(html).toContain("Cost to Be Me");
    expect(html).toContain("Auto-Assign");
    expect(html).toContain("Assigned in Future Months");
  });

  it("renders category details and Quick Budget options when category is selected", () => {
    const onQuickAssign = vi.fn();
    const onSaveCategoryNote = vi.fn();

    const html = renderToStaticMarkup(
      <BudgetInspector
        month="2026-10-01"
        monthSummary={sampleSummary}
        selectedCategory={sampleCategory}
        onQuickAssign={onQuickAssign}
        onSaveCategoryNote={onSaveCategoryNote}
      />,
    );

    expect(html).toContain("Groceries");
    expect(html).toContain("inspector-category-edit");
    expect(html).toContain("$200.00"); // assigned
    expect(html).toContain("-$50.00"); // activity
    expect(html).toContain("$150.00"); // available
    expect(html).toContain("Cash Left Over From Last Month");
    expect(html).toContain("Auto-Assign");
    expect(html).toContain("Weekly grocery budget");
    expect(html).toContain("Reset Assigned to $0.00");
  });

  it("renders overspent alert banner when category available is negative", () => {
    const overspentCat: CategoryMonthAllocation = {
      ...sampleCategory,
      category_id: "cat-dining",
      name: "Dining Out",
      available_milliunits: -45000,
      activity_milliunits: -145000,
      assigned_milliunits: 100000,
    };

    const html = renderToStaticMarkup(
      <BudgetInspector
        month="2026-10-01"
        monthSummary={sampleSummary}
        selectedCategory={overspentCat}
        onQuickAssign={vi.fn()}
        onSaveCategoryNote={vi.fn()}
      />,
    );

    expect(html).toContain("impact-message negative");
    expect(html).toContain("You&#x27;ve overspent this category by");
    expect(html).toContain("$45.00");
    expect(html).toContain("Cover Overspending");
  });

  it("renders target breakdown and donut container when target is set", () => {
    saveCategoryTarget("test-plan", "cat-target", {
      amount_milliunits: 300000,
      cadence: "MONTHLY",
      target_type: "REFILL_UP_TO",
    });

    const targetedCat: CategoryMonthAllocation = {
      ...sampleCategory,
      category_id: "cat-target",
      name: "Target Category",
      available_milliunits: 300000,
      assigned_milliunits: 300000,
    };

    const html = renderToStaticMarkup(
      <BudgetInspector
        planId="test-plan"
        month="2026-10-01"
        monthSummary={sampleSummary}
        selectedCategory={targetedCat}
        onQuickAssign={vi.fn()}
        onSaveCategoryNote={vi.fn()}
      />,
    );

    expect(html).toContain("target-inspector");
    expect(html).toContain("donut-container");
    expect(html).toContain("Refill Up to $300.00 Each Month");
    expect(html).toContain("You&#x27;ve met your target!");
    expect(html).toContain("Snooze target for this month");
  });

  it("renders multi-category inspector when multiple categories are selected", () => {
    const cat2: CategoryMonthAllocation = {
      ...sampleCategory,
      category_id: "cat-2",
      name: "Rent",
      assigned_milliunits: 500000,
      activity_milliunits: 0,
      available_milliunits: 500000,
    };

    const html = renderToStaticMarkup(
      <BudgetInspector
        month="2026-10-01"
        monthSummary={sampleSummary}
        selectedCategory={null}
        selectedCategories={[sampleCategory, cat2]}
        onDeselectAll={vi.fn()}
        onQuickAssign={vi.fn()}
        onSaveCategoryNote={vi.fn()}
      />,
    );

    expect(html).toContain("budget-inspector-multiple");
    expect(html).toContain("2 Categories Selected");
    expect(html).toContain("$650.00"); // 150000 + 500000 = 650000 = $650.00 available
    expect(html).toContain("$700.00"); // 200000 + 500000 = 700000 = $700.00 assigned
    expect(html).toContain("Deselect All");
    expect(html).toContain("Auto-Assign");
  });
});
