import { describe, it, expect } from "vitest";
import {
  applyOptimisticAllocation,
  invalidateMonthsFrom,
  invalidateAllMonths,
  shouldAcceptMonthFetchResponse,
  needsMonthRefetch,
  filterCategories,
  computeQuickBudgetAssign,
} from "../state/budgetReducer";
import type { PlanMonthSummary } from "../api/types";

const sampleSummaryOct: PlanMonthSummary = {
  month: "2026-10-01",
  ready_to_assign_milliunits: 1000000, // $1,000.00
  total_assigned_milliunits: 500000, // $500.00
  total_activity_milliunits: -120000, // -$120.00
  total_available_milliunits: 380000, // $380.00
  categories: [
    {
      category_id: "cat-groceries",
      group_id: "grp-1",
      name: "Groceries",
      note: "Weekly market",
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
    {
      category_id: "cat-hidden",
      group_id: "grp-1",
      name: "Old Subscription",
      note: null,
      assigned_milliunits: 0,
      activity_milliunits: 0,
      available_milliunits: 0,
      is_credit_card_payment: false,
      hidden: true,
      sort_order: 3,
    },
  ],
};

describe("Budget State Reducer & Cache Invalidation Invariants (F2)", () => {
  it("conserves zero-based budget sum on optimistic allocation update", () => {
    const beforeConservation =
      sampleSummaryOct.ready_to_assign_milliunits +
      sampleSummaryOct.total_assigned_milliunits;

    const updated = applyOptimisticAllocation(sampleSummaryOct, [
      { category_id: "cat-groceries", assigned_milliunits: 650000 }, // +$150.00
      { category_id: "cat-dining", assigned_milliunits: 45000 }, // +$45.00
    ]);

    const afterConservation =
      updated.ready_to_assign_milliunits + updated.total_assigned_milliunits;

    expect(afterConservation).toBe(beforeConservation);
    expect(updated.ready_to_assign_milliunits).toBe(805000); // $1000 - $195 = $805
    expect(updated.total_assigned_milliunits).toBe(695000);
    expect(updated.total_available_milliunits).toBe(575000);

    const groceries = updated.categories.find(
      (c) => c.category_id === "cat-groceries",
    );
    const dining = updated.categories.find(
      (c) => c.category_id === "cat-dining",
    );
    expect(groceries?.available_milliunits).toBe(530000);
    expect(dining?.available_milliunits).toBe(0);
  });

  it("invalidates subsequent months (> M) on allocation update and (>= M) on ledger mutation", () => {
    const cache: Record<string, PlanMonthSummary> = {
      "2026-09-01": { ...sampleSummaryOct, month: "2026-09-01" },
      "2026-10-01": sampleSummaryOct,
      "2026-11-01": { ...sampleSummaryOct, month: "2026-11-01" },
      "2026-12-01": { ...sampleSummaryOct, month: "2026-12-01" },
    };

    // Exclusive (> M): after setting authoritative summary for M
    const afterAlloc = invalidateMonthsFrom(cache, "2026-10-01", false);
    expect(Object.keys(afterAlloc)).toEqual(["2026-09-01", "2026-10-01"]);

    // Inclusive (>= M): after transaction or reconciliation in M
    const afterTx = invalidateMonthsFrom(cache, "2026-10-01", true);
    expect(Object.keys(afterTx)).toEqual(["2026-09-01"]);

    // All months: after POST/PATCH/DELETE category or category-group
    expect(invalidateAllMonths()).toEqual({});
  });

  it("rejects stale GET responses via cacheEpoch and signals automatic re-fetch when cache is missing", () => {
    let cacheEpoch = 0;
    const reqEpochBeforeMutation = cacheEpoch;

    // Mutation starts -> increment epoch
    cacheEpoch += 1;
    expect(
      shouldAcceptMonthFetchResponse(reqEpochBeforeMutation, cacheEpoch),
    ).toBe(false);

    // GET launched during mutation
    const reqEpochDuringMutation = cacheEpoch;

    // Mutation finishes -> increment epoch again & invalidate cache
    cacheEpoch += 1;
    const cacheAfterMutation: Record<string, PlanMonthSummary> = {};

    expect(
      shouldAcceptMonthFetchResponse(reqEpochDuringMutation, cacheEpoch),
    ).toBe(false);

    // Since currentMonth is missing from cache and in-flight request had old epoch, needsMonthRefetch is true
    expect(
      needsMonthRefetch(
        cacheAfterMutation,
        "2026-10-01",
        reqEpochDuringMutation,
        cacheEpoch,
      ),
    ).toBe(true);

    // Once a new GET is in flight with current cacheEpoch, don't duplicate fetch
    expect(
      needsMonthRefetch(
        cacheAfterMutation,
        "2026-10-01",
        cacheEpoch,
        cacheEpoch,
      ),
    ).toBe(false);
  });

  it("filters categories by pill mode, search query, and hidden visibility", () => {
    const visibleAll = filterCategories(sampleSummaryOct.categories, {
      mode: "ALL",
      search: "",
      includeHidden: false,
    });
    expect(visibleAll.map((c) => c.category_id)).toEqual([
      "cat-groceries",
      "cat-dining",
    ]);

    const overspent = filterCategories(sampleSummaryOct.categories, {
      mode: "OVERSPENT",
      search: "",
      includeHidden: false,
    });
    expect(overspent.map((c) => c.category_id)).toEqual(["cat-dining"]);

    const available = filterCategories(sampleSummaryOct.categories, {
      mode: "AVAILABLE",
      search: "",
      includeHidden: false,
    });
    expect(available.map((c) => c.category_id)).toEqual(["cat-groceries"]);

    const searched = filterCategories(sampleSummaryOct.categories, {
      mode: "ALL",
      search: "groc",
      includeHidden: false,
    });
    expect(searched.map((c) => c.category_id)).toEqual(["cat-groceries"]);
  });

  it("computes Quick Budget actions (cover overspending, reset assigned, assign RTA)", () => {
    const dining = sampleSummaryOct.categories[1]!;
    expect(
      computeQuickBudgetAssign(dining, "COVER_OVERSPENDING", 1000000),
    ).toBe(45000);
    expect(
      computeQuickBudgetAssign(
        sampleSummaryOct.categories[0]!,
        "RESET_ASSIGNED",
        1000000,
      ),
    ).toBe(0);
    expect(
      computeQuickBudgetAssign(
        sampleSummaryOct.categories[0]!,
        "ASSIGN_RTA",
        1000000,
      ),
    ).toBe(1500000);
  });
});
