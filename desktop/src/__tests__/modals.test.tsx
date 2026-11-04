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
import { AddCategoryGroupPopover } from "../components/modals/AddCategoryGroupPopover";
import { AddCategoryPopover } from "../components/modals/AddCategoryPopover";
import { EditCategoryGroupPopover } from "../components/modals/EditCategoryGroupPopover";
import {
  AddAccountModal,
  ACCOUNT_TYPE_GROUPS,
} from "../components/modals/AddAccountModal";
import { TransactionDatePickerPopover } from "../components/modals/TransactionDatePickerPopover";
import { PayeeDropdownPopover } from "../components/modals/PayeeDropdownPopover";
import { CategoryDropdownPopover } from "../components/modals/CategoryDropdownPopover";
import type { Account, Category, Payee, PlanMonthSummary } from "../api/types";

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
    expect(categoryMenuHtml).toContain("modal-budget-edit-category");
    expect(categoryMenuHtml).toContain("modal-arrow");
  });

  it("renders AddCategoryGroupPopover, AddCategoryPopover, and EditCategoryGroupPopover matching scraped templates", () => {
    // 1. Add Category Group Popover
    const addGroupHtml = renderToStaticMarkup(
      <AddCategoryGroupPopover
        isOpen={true}
        anchorPosition={{ top: 180, left: 225, width: 120, height: 30 }}
        onClose={() => undefined}
        onCreateGroup={async () => undefined}
      />,
    );
    expect(addGroupHtml).toContain("modal-add-master-category");
    expect(addGroupHtml).toContain("New Category Group");
    expect(addGroupHtml).toContain("Cancel");
    expect(addGroupHtml).toContain("OK");
    expect(addGroupHtml).toContain("modal-arrow");

    // 2. Add Category Popover
    const addCatHtml = renderToStaticMarkup(
      <AddCategoryPopover
        isOpen={true}
        groupId="grp-1"
        anchorPosition={{ top: 300, left: 250, width: 24, height: 24 }}
        onClose={() => undefined}
        onCreateCategory={async () => undefined}
      />,
    );
    expect(addCatHtml).toContain("modal-add-sub-category");
    expect(addCatHtml).toContain("New Category");
    expect(addCatHtml).toContain("Cancel");
    expect(addCatHtml).toContain("OK");
    expect(addCatHtml).toContain("modal-arrow");

    // 3. Edit Category Group Popover
    const editGroupHtml = renderToStaticMarkup(
      <EditCategoryGroupPopover
        isOpen={true}
        group={{
          id: "grp-1",
          plan_id: "plan-1",
          name: "Immediate Obligations",
          hidden: false,
          is_system: false,
          sort_order: 1,
          categories: [],
        }}
        anchorPosition={{ top: 200, left: 150, width: 160, height: 24 }}
        onClose={() => undefined}
        onSaveName={async () => undefined}
        onDeleteGroup={() => undefined}
        onToggleHide={async () => undefined}
      />,
    );
    expect(editGroupHtml).toContain("modal-budget-edit-category");
    expect(editGroupHtml).toContain("Immediate Obligations");
    expect(editGroupHtml).toContain("Hide");
    expect(editGroupHtml).toContain("Delete");
    expect(editGroupHtml).toContain("Cancel");
    expect(editGroupHtml).toContain("OK");
    expect(editGroupHtml).toContain("modal-arrow");
  });

  it("AddAccountModal renders unlinked account form skipping bank linking and defines scraped account types", () => {
    const addAccountHtml = renderToStaticMarkup(
      <AddAccountModal onClose={() => undefined} onCreate={async () => undefined} />,
    );

    // Bỏ qua phần link ngân hàng: không hiển thị tìm kiếm ngân hàng / Chase / Popular options
    expect(addAccountHtml).not.toContain("Search for your bank");
    expect(addAccountHtml).not.toContain("Popular Options");
    expect(addAccountHtml).not.toContain("Add an Unlinked Account");

    // Hiển thị trực tiếp form Add Unlinked Account
    expect(addAccountHtml).toContain("Add Unlinked Account");
    expect(addAccountHtml).toContain("Give it a nickname");
    expect(addAccountHtml).toContain("What type of account are you adding?");
    expect(addAccountHtml).toContain("What is your current account balance?");
    expect(addAccountHtml).toContain("account-type-select-button");
    expect(addAccountHtml).toContain("Next");

    // Scraped account groups validation
    expect(ACCOUNT_TYPE_GROUPS).toHaveLength(4);
    const [cashGroup, creditGroup, loansGroup, trackingGroup] = ACCOUNT_TYPE_GROUPS;

    expect(cashGroup?.title).toBe("Cash Accounts");
    expect(cashGroup?.items.map((i) => i.label)).toEqual(["Checking", "Savings", "Cash"]);

    expect(creditGroup?.title).toBe("Credit Accounts");
    expect(creditGroup?.items.map((i) => i.label)).toEqual(["Credit Card", "Line of Credit"]);

    expect(loansGroup?.title).toBe("Mortgages and Loans");
    expect(loansGroup?.items.map((i) => i.label)).toEqual([
      "Mortgage",
      "Auto Loan",
      "Student Loan",
      "Personal Loan",
      "Medical Debt",
      "Other Debt",
    ]);

    expect(trackingGroup?.title).toBe("Tracking Accounts");
    expect(trackingGroup?.items.map((i) => i.label)).toEqual([
      "Asset (e.g. Investment)",
      "Liability",
    ]);
  });

  it("TransactionDatePickerPopover renders calendar header, weekdays, day cells, and repeat options", () => {
    const html = renderToStaticMarkup(
      <TransactionDatePickerPopover
        isOpen={true}
        selectedDate="2026-10-30"
        onSelectDate={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("modal-account-calendar");
    expect(html).toContain("accounts-calendar-selected-date");
    expect(html).toContain("Oct 2026");
    expect(html).toContain("accounts-calendar-weekdays");
    expect(html).toContain("Su");
    expect(html).toContain("Mo");
    expect(html).toContain("accounts-calendar-grid");
    expect(html).toContain("accounts-calendar-day-selected");
    expect(html).toContain("30");
    expect(html).toContain("Repeat:");
    expect(html).toContain("Never");
    expect(html).toContain("Every other week");
    expect(html).toContain("modal-arrow");
  });

  it("PayeeDropdownPopover renders payments/transfers, saved payees, and manage payees button", () => {
    const testAccounts: Account[] = [
      {
        id: "acc-1",
        plan_id: "plan-1",
        name: "Ally Savings",
        type: "SAVINGS",
        on_budget: true,
        closed: false,
        balance_milliunits: 1000000,
        cleared_balance_milliunits: 1000000,
        uncleared_balance_milliunits: 0,
        transfer_payee_id: "p-tr-1",
        sort_order: 1,
      },
      {
        id: "acc-2",
        plan_id: "plan-1",
        name: "Main Checking",
        type: "CHECKING",
        on_budget: true,
        closed: false,
        balance_milliunits: 2000000,
        cleared_balance_milliunits: 2000000,
        uncleared_balance_milliunits: 0,
        transfer_payee_id: "p-tr-2",
        sort_order: 2,
      },
    ];

    const testPayees: Payee[] = [
      { id: "p-1", plan_id: "plan-1", name: "Target", transfer_account_id: null },
      { id: "p-2", plan_id: "plan-1", name: "Trader Joe's", transfer_account_id: null },
    ];

    const html = renderToStaticMarkup(
      <PayeeDropdownPopover
        isOpen={true}
        currentPayee="Target"
        transferAccountId={null}
        accounts={testAccounts}
        currentAccountId="acc-2"
        payees={testPayees}
        searchQuery=""
        onSelectPayee={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("modal-account-payees");
    expect(html).toContain("Payments and Transfers");
    expect(html).toContain("To/From Ally Savings");
    expect(html).not.toContain("To/From Main Checking"); // excluded current account
    expect(html).toContain("Saved Payees");
    expect(html).toContain("Target");
    expect(html).toContain("Trader Joe&#x27;s");
    expect(html).toContain("Manage Payees");
    expect(html).toContain("modal-arrow");
  });

  it("CategoryDropdownPopover renders category sections, balances, new category button, and actions", () => {
    const testCategories: Category[] = [
      {
        id: "cat-rta",
        plan_id: "plan-1",
        group_id: "grp-sys",
        name: "Ready to Assign",
        is_inflow_category: true,
        is_credit_card_payment: false,
        hidden: false,
        sort_order: 0,
      },
      {
        id: "cat-rent",
        plan_id: "plan-1",
        group_id: "grp-bills",
        name: "Rent",
        is_inflow_category: false,
        is_credit_card_payment: false,
        hidden: false,
        sort_order: 1,
      },
    ];

    const testGroups = [
      { id: "grp-bills", plan_id: "plan-1", name: "Bills", is_system: false, hidden: false, sort_order: 1 },
    ];

    const testAllocations = [
      {
        category_id: "cat-rent",
        group_id: "grp-bills",
        name: "Rent",
        assigned_milliunits: 1400000,
        activity_milliunits: -1400000,
        available_milliunits: -50000,
        is_credit_card_payment: false,
        hidden: false,
        sort_order: 1,
      },
    ];

    const html = renderToStaticMarkup(
      <CategoryDropdownPopover
        isOpen={true}
        selectedCategoryId="cat-rent"
        categories={testCategories}
        categoryGroups={testGroups}
        monthlyBudgets={testAllocations}
        searchQuery=""
        onSelectCategory={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("modal-account-categories");
    expect(html).toContain("New Category");
    expect(html).toContain("Inflow");
    expect(html).toContain("Ready to Assign");
    expect(html).toContain("Bills");
    expect(html).toContain("Rent");
    expect(html).toContain("Payment/Transfer");
    expect(html).toContain("Split");
    expect(html).toContain("modal-arrow");
  });
});
