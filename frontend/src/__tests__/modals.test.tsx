import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MoveMoneyModal,
  buildMoveMoneyAllocations,
} from "../components/modals/MoveMoneyModal";
import {
  ReconcileModal,
  buildReconcileRequest,
} from "../components/modals/ReconcileModal";
import {
  DeleteCategoryModal,
  validateDeleteReassign,
} from "../components/modals/DeleteCategoryModal";
import { MonthPickerPopover } from "../components/modals/MonthPickerPopover";
import { CategoryEditModal } from "../components/modals/CategoryEditModal";
import { CategoryMenuPopover } from "../components/modals/CategoryMenuPopover";
import type { Account, PlanMonthSummary } from "../api/types";

const sampleSummary: PlanMonthSummary = {
  month: "2026-10-01",
  ready_to_assign_milliunits: 100000,
  total_assigned_milliunits: 500000,
  total_activity_milliunits: -100000,
  total_available_milliunits: 400000,
  categories: [
    {
      category_id: "cat-1",
      group_id: "grp-1",
      name: "Rent",
      hidden: false,
      is_credit_card_payment: false,
      sort_order: 1,
      assigned_milliunits: 300000,
      activity_milliunits: -100000,
      available_milliunits: 200000,
    },
    {
      category_id: "cat-2",
      group_id: "grp-1",
      name: "Groceries",
      hidden: false,
      is_credit_card_payment: false,
      sort_order: 2,
      assigned_milliunits: 20000,
      activity_milliunits: 0,
      available_milliunits: 150000, // Includes 130000 rollover from prior month
    },
  ],
};

describe("Phase F4 Modals (Move Money, Reconcile, Delete/Reassign)", () => {
  it("buildMoveMoneyAllocations preserves zero-sum total assigned and supports negative assigned when moving rollover funds", () => {
    // Move $50.00 (50000) from Groceries (cat-2, assigned 20000, available 150000) to Rent (cat-1, assigned 300000)
    const updates = buildMoveMoneyAllocations(
      sampleSummary,
      "cat-2",
      "cat-1",
      50000,
    );

    expect(updates).toHaveLength(2);
    const sourceUpdate = updates.find((u) => u.category_id === "cat-2");
    const targetUpdate = updates.find((u) => u.category_id === "cat-1");

    expect(sourceUpdate?.assigned_milliunits).toBe(-30000);
    expect(targetUpdate?.assigned_milliunits).toBe(350000);

    // Conservation check: sum before (20000 + 300000 = 320000) === sum after (-30000 + 350000 = 320000)
    const sumBefore = 20000 + 300000;
    const sumAfter =
      (sourceUpdate?.assigned_milliunits ?? 0) +
      (targetUpdate?.assigned_milliunits ?? 0);
    expect(sumAfter).toBe(sumBefore);
  });

  it("buildMoveMoneyAllocations rejects non-positive amounts or identical source and target", () => {
    expect(() =>
      buildMoveMoneyAllocations(sampleSummary, "cat-1", "cat-2", 0),
    ).toThrow(/positive/i);
    expect(() =>
      buildMoveMoneyAllocations(sampleSummary, "cat-1", "cat-1", 10000),
    ).toThrow(/different/i);
  });

  it("buildReconcileRequest handles exact match and statement discrepancy with adjustment", () => {
    const exact = buildReconcileRequest(250000, "250.00", false);
    expect(exact).toEqual({
      statement_balance_milliunits: 250000,
      create_adjustment_transaction: false,
      discrepancy_milliunits: 0,
    });

    const discrepancyWithAdj = buildReconcileRequest(250000, "240.00", true);
    expect(discrepancyWithAdj).toEqual({
      statement_balance_milliunits: 240000,
      create_adjustment_transaction: true,
      discrepancy_milliunits: -10000,
    });

    expect(() => buildReconcileRequest(250000, "240.00", false)).toThrow(
      /adjustment/i,
    );
  });

  it("validateDeleteReassign enforces valid target category when reassignment is required", () => {
    expect(validateDeleteReassign(false, undefined, ["cat-1"])).toBeUndefined();
    expect(() => validateDeleteReassign(true, "", ["cat-1"])).toThrow(
      /reassign/i,
    );
    expect(() => validateDeleteReassign(true, "cat-1", ["cat-1"])).toThrow(
      /deleted/i,
    );
    expect(validateDeleteReassign(true, "cat-2", ["cat-1"])).toBe("cat-2");
  });

  it("renders MoveMoneyModal, ReconcileModal, and DeleteCategoryModal static markup", () => {
    const account: Account = {
      id: "acc-1",
      plan_id: "plan-1",
      name: "Checking",
      type: "CHECKING",
      on_budget: true,
      closed: false,
      balance_milliunits: 250000,
      cleared_balance_milliunits: 250000,
      uncleared_balance_milliunits: 0,
      sort_order: 1,
    };

    const moveHtml = renderToStaticMarkup(
      <MoveMoneyModal
        isOpen={true}
        summary={sampleSummary}
        initialSourceCategoryId="cat-2"
        currencySymbol="$"
        onClose={() => undefined}
        onMoveMoney={async () => undefined}
      />,
    );
    expect(moveHtml).toContain("Move Money");

    const reconcileHtml = renderToStaticMarkup(
      <ReconcileModal
        isOpen={true}
        account={account}
        currencySymbol="$"
        onClose={() => undefined}
        onReconcile={async () => undefined}
      />,
    );
    expect(reconcileHtml).toContain("Reconcile Account");

    const deleteHtml = renderToStaticMarkup(
      <DeleteCategoryModal
        isOpen={true}
        targetName="Groceries"
        deletedCategoryIds={["cat-2"]}
        needsReassign={true}
        availableCategories={[
          { id: "cat-1", name: "Rent", groupName: "Bills" },
        ]}
        onClose={() => undefined}
        onConfirmDelete={async () => undefined}
      />,
    );
    expect(deleteHtml).toContain("Delete");
    expect(deleteHtml).toContain("Rent");

    const monthPickerHtml = renderToStaticMarkup(
      <MonthPickerPopover
        isOpen={true}
        activeMonth="2026-10"
        onSelectMonth={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(monthPickerHtml).toContain("month-picker");
    expect(monthPickerHtml).toContain("2026");
    expect(monthPickerHtml).toContain("Oct");

    const editCategoryHtml = renderToStaticMarkup(
      <CategoryEditModal
        isOpen={true}
        category={sampleSummary.categories[0]}
        onClose={() => undefined}
        onSaveName={async () => undefined}
        onDeleteCategory={() => undefined}
      />,
    );
    expect(editCategoryHtml).toContain("Edit Category");
    expect(editCategoryHtml).toContain("Rent");

    const categoryMenuHtml = renderToStaticMarkup(
      <CategoryMenuPopover
        isOpen={true}
        category={sampleSummary.categories[0]}
        anchorPosition={{ top: 150, left: 100 }}
        onClose={() => undefined}
        onSaveName={async () => undefined}
        onDeleteCategory={() => undefined}
        onToggleHide={async () => undefined}
      />,
    );
    expect(categoryMenuHtml).toContain("Rent");
    expect(categoryMenuHtml).toContain("Hide");
    expect(categoryMenuHtml).toContain("Delete");
    expect(categoryMenuHtml).toContain("OK");
  });
});
