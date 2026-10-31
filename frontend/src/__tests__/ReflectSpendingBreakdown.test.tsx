import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { computeMockReflectData } from "../hooks/useUiOnlyFeatures";
import { ReflectView } from "../components/ReflectView";
import type {
  Account,
  CategoryGroupWithCategories,
  PlanMonthSummary,
  Transaction,
} from "../api/types";

const mockCategoryGroups: CategoryGroupWithCategories[] = [
  {
    id: "grp-fixed",
    plan_id: "plan-1",
    name: "Immediate Obligations",
    sort_order: 1,
    is_system: false,
    hidden: false,
    categories: [
      {
        id: "cat-rent",
        plan_id: "plan-1",
        group_id: "grp-fixed",
        name: "Rent",
        hidden: false,
        is_credit_card_payment: false,
        is_inflow_category: false,
        sort_order: 1,
        note: null,
      },
      {
        id: "cat-electric",
        plan_id: "plan-1",
        group_id: "grp-fixed",
        name: "Electric",
        hidden: false,
        is_credit_card_payment: false,
        is_inflow_category: false,
        sort_order: 2,
        note: null,
      },
    ],
  },
  {
    id: "grp-flex",
    plan_id: "plan-1",
    name: "True Expenses",
    sort_order: 2,
    is_system: false,
    hidden: false,
    categories: [
      {
        id: "cat-groceries",
        plan_id: "plan-1",
        group_id: "grp-flex",
        name: "Groceries",
        hidden: false,
        is_credit_card_payment: false,
        is_inflow_category: false,
        sort_order: 1,
        note: null,
      },
      {
        id: "cat-dining",
        plan_id: "plan-1",
        group_id: "grp-flex",
        name: "Dining Out",
        hidden: false,
        is_credit_card_payment: false,
        is_inflow_category: false,
        sort_order: 2,
        note: null,
      },
    ],
  },
];

const mockMonthSummary: PlanMonthSummary = {
  month: "2026-10-01",
  ready_to_assign_milliunits: 100000,
  total_assigned_milliunits: 600000,
  total_activity_milliunits: -450000,
  total_available_milliunits: 250000,
  categories: [
    {
      category_id: "cat-rent",
      group_id: "grp-fixed",
      name: "Rent",
      hidden: false,
      is_credit_card_payment: false,
      sort_order: 1,
      assigned_milliunits: 300000,
      activity_milliunits: -200000,
      available_milliunits: 100000,
    },
    {
      category_id: "cat-electric",
      group_id: "grp-fixed",
      name: "Electric",
      hidden: false,
      is_credit_card_payment: false,
      sort_order: 2,
      assigned_milliunits: 100000,
      activity_milliunits: -50000,
      available_milliunits: 50000,
    },
    {
      category_id: "cat-groceries",
      group_id: "grp-flex",
      name: "Groceries",
      hidden: false,
      is_credit_card_payment: false,
      sort_order: 3,
      assigned_milliunits: 150000,
      activity_milliunits: -150000,
      available_milliunits: 0,
    },
    {
      category_id: "cat-dining",
      group_id: "grp-flex",
      name: "Dining Out",
      hidden: false,
      is_credit_card_payment: false,
      sort_order: 4,
      assigned_milliunits: 50000,
      activity_milliunits: -50000,
      available_milliunits: 0,
    },
  ],
};

const mockAccounts: Account[] = [
  {
    id: "acc-checking",
    plan_id: "plan-1",
    name: "Checking",
    type: "CHECKING",
    on_budget: true,
    closed: false,
    balance_milliunits: 1000000, // $1,000.00
    cleared_balance_milliunits: 1000000,
    uncleared_balance_milliunits: 0,
    sort_order: 1,
  },
  {
    id: "acc-credit",
    plan_id: "plan-1",
    name: "Credit Card",
    type: "CREDIT_CARD",
    on_budget: true,
    closed: false,
    balance_milliunits: -250000, // -$250.00
    cleared_balance_milliunits: -250000,
    uncleared_balance_milliunits: 0,
    sort_order: 2,
  },
  {
    id: "acc-savings",
    plan_id: "plan-1",
    name: "Savings",
    type: "SAVINGS",
    on_budget: true,
    closed: false,
    balance_milliunits: 5000000, // $5,000.00
    cleared_balance_milliunits: 5000000,
    uncleared_balance_milliunits: 0,
    sort_order: 3,
  },
];

describe("Reflect Spending Breakdown Grouping and Filters", () => {
  it("groups spending by category group correctly", () => {
    const reflect = computeMockReflectData(mockMonthSummary, mockAccounts, {
      categoryGroups: mockCategoryGroups,
    });

    expect(reflect.totalSpendingMilliunits).toBe(450000); // 200k + 50k + 150k + 50k
    expect(reflect.spendingItems).toHaveLength(4);

    // Group items
    expect(reflect.spendingGroupItems).toHaveLength(2);

    const fixedGroup = reflect.spendingGroupItems.find(
      (g) => g.groupId === "grp-fixed",
    );
    expect(fixedGroup).toBeDefined();
    expect(fixedGroup?.groupName).toBe("Immediate Obligations");
    expect(fixedGroup?.spentMilliunits).toBe(250000); // Rent 200k + Electric 50k
    expect(fixedGroup?.categoryCount).toBe(2);
    // 250,000 / 450,000 = 55.56% -> 5556 basis points
    expect(fixedGroup?.percentageBasisPoints).toBe(5556);

    const flexGroup = reflect.spendingGroupItems.find(
      (g) => g.groupId === "grp-flex",
    );
    expect(flexGroup).toBeDefined();
    expect(flexGroup?.groupName).toBe("True Expenses");
    expect(flexGroup?.spentMilliunits).toBe(200000); // Groceries 150k + Dining 50k
    expect(flexGroup?.categoryCount).toBe(2);
    // 200,000 / 450,000 = 44.44% -> 4444 basis points
    expect(flexGroup?.percentageBasisPoints).toBe(4444);

    // Sum of group basis points
    expect(
      (fixedGroup?.percentageBasisPoints ?? 0) +
        (flexGroup?.percentageBasisPoints ?? 0),
    ).toBe(10000);
  });

  it("filters spending by selected categories", () => {
    // Only select "cat-rent" and "cat-groceries"
    const selected = new Set(["cat-rent", "cat-groceries"]);
    const reflect = computeMockReflectData(mockMonthSummary, mockAccounts, {
      categoryGroups: mockCategoryGroups,
      selectedCategoryIds: selected,
    });

    expect(reflect.totalSpendingMilliunits).toBe(350000); // Rent 200k + Groceries 150k
    expect(reflect.spendingItems).toHaveLength(2);
    expect(reflect.spendingItems.map((c) => c.categoryId)).toEqual([
      "cat-rent",
      "cat-groceries",
    ]);

    // Groups reflect filtered categories
    const fixedGroup = reflect.spendingGroupItems.find(
      (g) => g.groupId === "grp-fixed",
    );
    expect(fixedGroup?.spentMilliunits).toBe(200000); // Only rent
    expect(fixedGroup?.categoryCount).toBe(1);

    const flexGroup = reflect.spendingGroupItems.find(
      (g) => g.groupId === "grp-flex",
    );
    expect(flexGroup?.spentMilliunits).toBe(150000); // Only groceries
    expect(flexGroup?.categoryCount).toBe(1);
  });

  it("filters assets, debts, and net worth by selected accounts", () => {
    // Select all accounts
    const all = computeMockReflectData(mockMonthSummary, mockAccounts);
    expect(all.assetsMilliunits).toBe(6000000); // Checking 1M + Savings 5M
    expect(all.debtsMilliunits).toBe(250000); // Credit Card 250k
    expect(all.netWorthMilliunits).toBe(5750000); // 6M - 250k

    // Filter to only Checking account
    const checkingOnly = computeMockReflectData(
      mockMonthSummary,
      mockAccounts,
      {
        selectedAccountIds: new Set(["acc-checking"]),
      },
    );
    expect(checkingOnly.assetsMilliunits).toBe(1000000);
    expect(checkingOnly.debtsMilliunits).toBe(0);
    expect(checkingOnly.netWorthMilliunits).toBe(1000000);

    // Filter to Checking and Credit Card (exclude Savings)
    const checkingAndCredit = computeMockReflectData(
      mockMonthSummary,
      mockAccounts,
      {
        selectedAccountIds: new Set(["acc-checking", "acc-credit"]),
      },
    );
    expect(checkingAndCredit.assetsMilliunits).toBe(1000000);
    expect(checkingAndCredit.debtsMilliunits).toBe(250000);
    expect(checkingAndCredit.netWorthMilliunits).toBe(750000);
  });

  it("filters spending by account when transactions are provided", () => {
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        plan_id: "plan-1",
        account_id: "acc-checking",
        category_id: "cat-rent",
        payee_id: null,
        date: "2026-10-05",
        amount_milliunits: -200000,
        memo: null,
        cleared: "CLEARED",
        approved: true,
        transfer_account_id: null,
        transfer_transaction_id: null,
      },
      {
        id: "tx-2",
        plan_id: "plan-1",
        account_id: "acc-credit",
        category_id: "cat-dining",
        payee_id: null,
        date: "2026-10-10",
        amount_milliunits: -50000,
        memo: null,
        cleared: "CLEARED",
        approved: true,
        transfer_account_id: null,
        transfer_transaction_id: null,
      },
    ];

    // Filter to only Credit Card account
    const creditOnly = computeMockReflectData(
      mockMonthSummary,
      mockAccounts,
      {
        categoryGroups: mockCategoryGroups,
        selectedAccountIds: new Set(["acc-credit"]),
        transactions,
      },
    );

    expect(creditOnly.totalSpendingMilliunits).toBe(50000);
    expect(creditOnly.spendingItems).toHaveLength(1);
    expect(creditOnly.spendingItems[0]?.categoryName).toBe("Dining Out");
    expect(creditOnly.spendingItems[0]?.spentMilliunits).toBe(50000);
  });

  it("renders ReflectView with filter buttons and category group toggle options", () => {
    const html = renderToStaticMarkup(
      <ReflectView
        monthSummary={mockMonthSummary}
        accounts={mockAccounts}
        categoryGroups={mockCategoryGroups}
        currentMonth="2026-10-01"
      />,
    );

    // Filter bar elements
    expect(html).toContain("filter-button-timeframe");
    expect(html).toContain("Oct 2026");
    expect(html).toContain("filter-button-categories");
    expect(html).toContain("All Categories");
    expect(html).toContain("filter-button-accounts");
    expect(html).toContain("All Accounts");

    // Toggle segmented controls
    expect(html).toContain("Categories");
    expect(html).toContain("Groups");
    expect(html).toContain("spending-breakdown__category-group-toggle");

    // Content cards
    expect(html).toContain("Total Spending");
    expect(html).toContain("$450.00");
    expect(html).toContain("Rent");
    expect(html).toContain("Groceries");

    // Scraped metrics card
    expect(html).toContain("spending-breakdown__metrics");
    expect(html).toContain("Average Monthly Spending");
    expect(html).toContain("Average Daily Spending");
    expect(html).toContain("Most Frequent Category");
    expect(html).toContain("Largest Outflow");

    // Scraped donut and bar chart elements
    expect(html).toContain("spending-breakdown-donut-chart__title");
    expect(html).toContain("spending-breakdown-donut-chart__bb");
    expect(html).toContain("spending-breakdown-bar-chart-header");
    expect(html).toContain("spending-breakdown-bar-chart-body");
  });

  it("renders spending breakdown metrics correctly with transaction data", () => {
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        plan_id: "plan-1",
        account_id: "acc-checking",
        category_id: "cat-rent",
        payee_id: null,
        date: "2026-10-01",
        amount_milliunits: -200000,
        memo: "Greenway Apartments",
        cleared: "CLEARED",
        approved: true,
        transfer_account_id: null,
        transfer_transaction_id: null,
      },
      {
        id: "tx-2",
        plan_id: "plan-1",
        account_id: "acc-checking",
        category_id: "cat-groceries",
        payee_id: null,
        date: "2026-10-04",
        amount_milliunits: -50000,
        memo: "Farmers Market",
        cleared: "CLEARED",
        approved: true,
        transfer_account_id: null,
        transfer_transaction_id: null,
      },
      {
        id: "tx-3",
        plan_id: "plan-1",
        account_id: "acc-checking",
        category_id: "cat-groceries",
        payee_id: null,
        date: "2026-10-11",
        amount_milliunits: -40000,
        memo: "Farmers Market",
        cleared: "CLEARED",
        approved: true,
        transfer_account_id: null,
        transfer_transaction_id: null,
      },
    ];

    const html = renderToStaticMarkup(
      <ReflectView
        monthSummary={mockMonthSummary}
        accounts={mockAccounts}
        categoryGroups={mockCategoryGroups}
        currentMonth="2026-10-01"
        transactions={transactions}
      />,
    );

    // Greenway Apartments as largest outflow
    expect(html).toContain("Greenway Apartments");
    expect(html).toContain("$200.00");

    // Groceries has 2 transactions (most frequent)
    expect(html).toContain("Groceries");
    expect(html).toContain("2 transactions");
  });

  it("renders a full 360-degree donut ring when a single category has 100% spending", () => {
    // Single category month summary (only rent)
    const singleCategorySummary: PlanMonthSummary = {
      month: "2026-10-01",
      ready_to_assign_milliunits: 0,
      total_assigned_milliunits: 200000,
      total_activity_milliunits: -200000,
      total_available_milliunits: 0,
      categories: [
        {
          category_id: "cat-rent",
          group_id: "grp-fixed",
          name: "Rent",
          hidden: false,
          is_credit_card_payment: false,
          sort_order: 1,
          assigned_milliunits: 200000,
          activity_milliunits: -200000,
          available_milliunits: 0,
        },
      ],
    };

    const html = renderToStaticMarkup(
      <ReflectView
        monthSummary={singleCategorySummary}
        accounts={mockAccounts}
        categoryGroups={mockCategoryGroups}
        currentMonth="2026-10-01"
      />,
    );

    // Donut ring SVG path must contain dual 180-degree arcs (no degenerate collapse)
    expect(html).toContain("d=\"M 0 -186.675 A 186.675 186.675 0 1 1 0 186.675 A 186.675 186.675 0 1 1 0 -186.675");
    expect(html).toContain("bb-chart-arcs");
    expect(html).toContain("Rent");
    expect(html).toContain("100%");
  });
});
