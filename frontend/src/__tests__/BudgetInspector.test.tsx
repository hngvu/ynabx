import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BudgetInspector } from "../components/BudgetInspector";
import type { CategoryMonthAllocation, PlanMonthSummary } from "../api/types";

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

    expect(html).toContain("Oct 2026 Summary");
    expect(html).toContain("$500.00"); // total assigned
    expect(html).toContain("-$150.00"); // total activity
    expect(html).toContain("$350.00"); // total available
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
    expect(html).toContain("$200.00"); // assigned
    expect(html).toContain("-$50.00"); // activity
    expect(html).toContain("$150.00"); // available
    expect(html).toContain("Auto-Assign");
    expect(html).toContain("Weekly grocery budget");
  });
});
