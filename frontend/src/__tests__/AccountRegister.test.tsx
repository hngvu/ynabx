import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import {
  AccountRegister,
  buildSaveTransactionPayload,
  computeRegisterHeaderBalances,
  isCategoryDisabledForDraft,
} from "../components/AccountRegister";
import type { Account, Category, Payee, Transaction } from "../api/types";

const accounts: Account[] = [
  {
    id: "acc-checking",
    plan_id: "plan-1",
    name: "Main Checking",
    type: "CHECKING",
    on_budget: true,
    closed: false,
    balance_milliunits: 4500000,
    cleared_balance_milliunits: 4000000,
    uncleared_balance_milliunits: 500000,
    transfer_payee_id: "payee-tr-checking",
    sort_order: 1,
  },
  {
    id: "acc-cc",
    plan_id: "plan-1",
    name: "Chase Visa",
    type: "CREDIT_CARD",
    on_budget: true,
    closed: false,
    balance_milliunits: -350000,
    cleared_balance_milliunits: -300000,
    uncleared_balance_milliunits: -50000,
    transfer_payee_id: "payee-tr-cc",
    sort_order: 2,
  },
  {
    id: "acc-tracking",
    plan_id: "plan-1",
    name: "Brokerage Tracking",
    type: "SAVINGS",
    on_budget: false,
    closed: false,
    balance_milliunits: 10000000,
    cleared_balance_milliunits: 10000000,
    uncleared_balance_milliunits: 0,
    transfer_payee_id: "payee-tr-tracking",
    sort_order: 3,
  },
];

const categories: Category[] = [
  {
    id: "cat-rta",
    plan_id: "plan-1",
    group_id: "grp-sys",
    name: "Inflow: Ready to Assign",
    is_inflow_category: true,
    is_credit_card_payment: false,
    hidden: false,
    sort_order: 0,
  },
  {
    id: "cat-groceries",
    plan_id: "plan-1",
    group_id: "grp-1",
    name: "Groceries",
    is_inflow_category: false,
    is_credit_card_payment: false,
    hidden: false,
    sort_order: 1,
  },
];

const payees: Payee[] = [
  {
    id: "payee-1",
    plan_id: "plan-1",
    name: "Trader Joe's",
    transfer_account_id: null,
  },
  {
    id: "payee-tr-cc",
    plan_id: "plan-1",
    name: "Transfer : Chase Visa",
    transfer_account_id: "acc-cc",
  },
];

const transactions: Transaction[] = [
  {
    id: "tx-1",
    plan_id: "plan-1",
    account_id: "acc-checking",
    category_id: "cat-groceries",
    payee_id: "payee-1",
    payee_name: "Trader Joe's",
    date: "2026-10-24",
    amount_milliunits: -45500,
    memo: "Weekly groceries",
    cleared: "CLEARED",
    approved: true,
    transfer_account_id: null,
    transfer_transaction_id: null,
  },
  {
    id: "tx-2",
    plan_id: "plan-1",
    account_id: "acc-checking",
    category_id: "cat-rta",
    payee_id: null,
    payee_name: "Employer Inc",
    date: "2026-10-20",
    amount_milliunits: 2500000,
    memo: "Paycheck",
    cleared: "RECONCILED",
    approved: true,
    transfer_account_id: null,
    transfer_transaction_id: null,
  },
];

describe("AccountRegister Component & Domain Rules (F3)", () => {
  it("computes header balances for single account vs All Accounts (from accounts list, not transaction page)", () => {
    const single = computeRegisterHeaderBalances(accounts, "acc-checking");
    expect(single).toEqual({
      cleared: 4000000,
      uncleared: 500000,
      working: 4500000,
    });

    const all = computeRegisterHeaderBalances(accounts, null);
    expect(all).toEqual({
      cleared: 13700000, // 4,000 + (-300) + 10,000 = 13,700
      uncleared: 450000, // 500 + (-50) + 0 = 450
      working: 14150000, // 4,500 + (-350) + 10,000 = 14,150
    });
  });

  it("disables category selection for On-Budget -> On-Budget transfers and Tracking accounts", () => {
    // Regular on-budget transaction -> category enabled
    expect(
      isCategoryDisabledForDraft(accounts, "acc-checking", null),
    ).toBe(false);

    // On-budget -> On-budget transfer (e.g. Checking -> Credit Card payment) -> category disabled
    expect(
      isCategoryDisabledForDraft(accounts, "acc-checking", "acc-cc"),
    ).toBe(true);

    // On-budget -> Off-budget transfer (money leaves budget) -> category REQUIRED (enabled)
    expect(
      isCategoryDisabledForDraft(accounts, "acc-checking", "acc-tracking"),
    ).toBe(false);

    // Off-budget source account -> category always disabled
    expect(
      isCategoryDisabledForDraft(accounts, "acc-tracking", null),
    ).toBe(true);
  });

  it("builds SaveTransactionRequest payload with absolute milliunit parsing and transfer rules", () => {
    const regularOutflow = buildSaveTransactionPayload({
      accounts,
      accountId: "acc-checking",
      date: "2026-10-25",
      payeeInput: "Costco",
      transferAccountId: null,
      categoryId: "cat-groceries",
      memo: "Bulk supplies",
      outflowInput: "100 + 25.50",
      inflowInput: "",
      cleared: "UNCLEARED",
    });

    expect(regularOutflow).toEqual({
      account_id: "acc-checking",
      category_id: "cat-groceries",
      payee_id: null,
      payee_name: "Costco",
      date: "2026-10-25",
      amount_milliunits: -125500,
      memo: "Bulk supplies",
      cleared: "UNCLEARED",
      approved: true,
      transfer_account_id: null,
    });

    const onBudgetTransfer = buildSaveTransactionPayload({
      accounts,
      accountId: "acc-checking",
      date: "2026-10-26",
      payeeInput: "",
      transferAccountId: "acc-cc",
      categoryId: "cat-groceries", // Should be stripped to null automatically
      memo: "CC payment",
      outflowInput: "300",
      inflowInput: "",
      cleared: "CLEARED",
    });

    expect(onBudgetTransfer.transfer_account_id).toBe("acc-cc");
    expect(onBudgetTransfer.category_id).toBeNull();
    expect(onBudgetTransfer.payee_id).toBeNull();
    expect(onBudgetTransfer.payee_name).toBeNull();
    expect(onBudgetTransfer.amount_milliunits).toBe(-300000);
  });

  it("renders single account view with Reconcile button and All Accounts view with Account column & Load More", () => {
    const singleHtml = renderToStaticMarkup(
      <AccountRegister
        accountId="acc-checking"
        accounts={accounts}
        categories={categories}
        payees={payees}
        transactions={transactions}
        nextCursor={null}
        loading={false}
        onLoadMore={vi.fn()}
        onCreateTransaction={vi.fn()}
        onUpdateTransaction={vi.fn()}
        onDeleteTransaction={vi.fn()}
        onUnreconcileTransaction={vi.fn()}
        onOpenReconcile={vi.fn()}
        onUpdateAccount={vi.fn()}
        onDeleteAccount={vi.fn()}
      />,
    );

    expect(singleHtml).toContain("Main Checking");
    expect(singleHtml).toContain("Reconcile");
    expect(singleHtml).toContain("Trader Joe&#x27;s");
    expect(singleHtml).toContain("$45.50");
    expect(singleHtml).toContain("Unlock");

    const allHtml = renderToStaticMarkup(
      <AccountRegister
        accountId={null}
        accounts={accounts}
        categories={categories}
        payees={payees}
        transactions={transactions}
        nextCursor="cursor-page-2"
        loading={false}
        onLoadMore={vi.fn()}
        onCreateTransaction={vi.fn()}
        onUpdateTransaction={vi.fn()}
        onDeleteTransaction={vi.fn()}
        onUnreconcileTransaction={vi.fn()}
        onOpenReconcile={vi.fn()}
        onUpdateAccount={vi.fn()}
        onDeleteAccount={vi.fn()}
      />,
    );

    expect(allHtml).toContain("All Accounts");
    expect(allHtml).toContain("$14,150.00"); // Working balance from accounts list
    expect(allHtml).toContain("Load More Transactions");
  });
});
