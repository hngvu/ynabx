import type {
  AllocationUpdate,
  CategoryMonthAllocation,
  PlanMonthSummary,
} from "../api/types";

export type CategoryFilterMode = "ALL" | "OVERSPENT" | "AVAILABLE";

export interface CategoryFilterOptions {
  mode: CategoryFilterMode;
  search: string;
  includeHidden: boolean;
}

export type QuickBudgetAction =
  | "COVER_OVERSPENDING"
  | "RESET_ASSIGNED"
  | "RESET_AVAILABLE"
  | "ASSIGN_RTA";

/**
 * Applies optimistic category allocation updates to a PlanMonthSummary while preserving
 * the Zero-Based Budgeting Conservation Invariant:
 * ReadyToAssign + Sum(CategoryAssigned) == Constant
 */
export function applyOptimisticAllocation(
  summary: PlanMonthSummary,
  updates: AllocationUpdate[],
): PlanMonthSummary {
  const updateMap = new Map<string, number>();
  for (const item of updates) {
    updateMap.set(item.category_id, Math.trunc(item.assigned_milliunits));
  }

  let totalDeltaAssigned = 0;

  const nextCategories = summary.categories.map((cat) => {
    const nextAssigned = updateMap.get(cat.category_id);
    if (nextAssigned === undefined) {
      return cat;
    }
    const delta = nextAssigned - cat.assigned_milliunits;
    totalDeltaAssigned += delta;
    return {
      ...cat,
      assigned_milliunits: nextAssigned,
      available_milliunits: cat.available_milliunits + delta,
    };
  });

  return {
    ...summary,
    ready_to_assign_milliunits:
      summary.ready_to_assign_milliunits - totalDeltaAssigned,
    total_assigned_milliunits:
      summary.total_assigned_milliunits + totalDeltaAssigned,
    total_available_milliunits:
      summary.total_available_milliunits + totalDeltaAssigned,
    categories: nextCategories,
  };
}

/**
 * Removes cached month summaries starting from `fromMonth` (YYYY-MM-01).
 * - `inclusive = false`: keeps `fromMonth` and removes `K > fromMonth` (used after writing authoritative summary for `fromMonth`).
 * - `inclusive = true`: removes `K >= fromMonth` (used after transaction/reconcile mutations in `fromMonth`).
 */
export function invalidateMonthsFrom(
  cache: Record<string, PlanMonthSummary>,
  fromMonth: string,
  inclusive = true,
): Record<string, PlanMonthSummary> {
  const next: Record<string, PlanMonthSummary> = {};
  for (const [monthKey, summary] of Object.entries(cache)) {
    const shouldDrop = inclusive
      ? monthKey >= fromMonth
      : monthKey > fromMonth;
    if (!shouldDrop) {
      next[monthKey] = summary;
    }
  }
  return next;
}

/**
 * Clears all cached month summaries (used on POST/PATCH/DELETE category or category-group).
 */
export function invalidateAllMonths(): Record<string, PlanMonthSummary> {
  return {};
}

/**
 * Verifies whether an in-flight GET /months/{month} response is still valid for the current cacheEpoch.
 * Since cacheEpoch increments both at mutation start and mutation completion, any GET started
 * before or during a mutation is rejected.
 */
export function shouldAcceptMonthFetchResponse(
  requestEpoch: number,
  currentEpoch: number,
): boolean {
  return requestEpoch === currentEpoch;
}

/**
 * Determines whether the active month needs to be fetched (or re-fetched because a prior GET
 * was discarded due to cacheEpoch increment).
 */
export function needsMonthRefetch(
  cache: Record<string, PlanMonthSummary>,
  month: string,
  inFlightEpochForMonth: number | null,
  currentEpoch: number,
): boolean {
  if (cache[month] !== undefined) {
    return false;
  }
  if (inFlightEpochForMonth === currentEpoch) {
    return false;
  }
  return true;
}

/**
 * Client-side filtering of categories in a month summary.
 */
export function filterCategories(
  categories: CategoryMonthAllocation[],
  options: CategoryFilterOptions,
): CategoryMonthAllocation[] {
  const normalizedSearch = options.search.trim().toLowerCase();

  return categories.filter((cat) => {
    if (!options.includeHidden && cat.hidden) {
      return false;
    }
    if (options.mode === "OVERSPENT" && cat.available_milliunits >= 0) {
      return false;
    }
    if (options.mode === "AVAILABLE" && cat.available_milliunits <= 0) {
      return false;
    }
    if (
      normalizedSearch !== "" &&
      !cat.name.toLowerCase().includes(normalizedSearch)
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Computes the new absolute `assigned_milliunits` for a category given a Quick Budget action.
 */
export function computeQuickBudgetAssign(
  category: CategoryMonthAllocation,
  action: QuickBudgetAction,
  readyToAssignMilliunits: number,
): number {
  switch (action) {
    case "COVER_OVERSPENDING": {
      if (category.available_milliunits >= 0) {
        return category.assigned_milliunits;
      }
      return category.assigned_milliunits - category.available_milliunits;
    }
    case "RESET_ASSIGNED":
      return 0;
    case "RESET_AVAILABLE":
      return category.assigned_milliunits - category.available_milliunits;
    case "ASSIGN_RTA": {
      if (readyToAssignMilliunits <= 0) {
        return category.assigned_milliunits;
      }
      return category.assigned_milliunits + readyToAssignMilliunits;
    }
  }
}
