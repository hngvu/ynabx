import { describe, expect, it } from "vitest";
import {
  computeCategoryVisualState,
  getWeeksInMonth,
  saveCategoryTarget,
  setTargetSnooze,
} from "../utils/targetUtils";
import { formatMilliunits } from "../utils/currency";

describe("targetUtils & YNAB Visual Progress Bar Specification", () => {
  const planId = "test-plan-1";
  const month = "2026-10";

  it("calculates correct number of weekly sections in a month", () => {
    // Oct 2026 has 31 days
    const weeks = getWeeksInMonth("2026-10", 0); // Sundays
    expect(weeks).toBeGreaterThanOrEqual(4);
    expect(weeks).toBeLessThanOrEqual(5);
  });

  it("renders 1-section green bar with striped spending segment when funded without target", () => {
    // $380 available, $120 spent -> total $500
    const state = computeCategoryVisualState({
      planId,
      categoryId: "cat-1",
      availableMilliunits: 380000,
      assignedMilliunits: 500000,
      activityMilliunits: -120000,
      month,
      formatCurrency: formatMilliunits,
    });

    expect(state.status).toBe("FUNDED");
    expect(state.colorFamily).toBe("green");
    expect(state.statusHighlight).toBe("Funded");
    expect(state.statusDetails).toBe(" Spent $120.00 of $500.00");
    expect(state.statusText).toBe("Funded. Spent $120.00 of $500.00");
    expect(state.availablePillClass).toContain("positive");
    expect(state.availableIcon).toBeUndefined();
    expect(state.sections).toHaveLength(1);
    expect(state.sections[0].spentRatio).toBeCloseTo(0.24, 2);
    expect(state.sections[0].availableRatio).toBeCloseTo(0.76, 2);
    expect(state.sections[0].segments).toEqual([
      { className: "is-fully-funded-spending", widthPercent: 24 },
      { className: "is-fully-funded", widthPercent: 76 },
    ]);
  });

  it("renders Fully Spent with 100% striped green bar when all funded money is spent", () => {
    const state = computeCategoryVisualState({
      planId,
      categoryId: "cat-fully-spent",
      availableMilliunits: 0,
      assignedMilliunits: 200000,
      activityMilliunits: -200000,
      month,
      formatCurrency: formatMilliunits,
    });

    expect(state.status).toBe("FUNDED");
    expect(state.colorFamily).toBe("green");
    expect(state.statusHighlight).toBe("Fully Spent");
    expect(state.statusDetails).toBe("");
    expect(state.statusText).toBe("Fully Spent");
    expect(state.availablePillClass).toContain("zero");
    expect(state.sections[0].segments).toEqual([
      { className: "is-fully-funded-spending", widthPercent: 100 },
    ]);
  });

  it("renders blank status text and empty bar when $0 assigned and $0 spent with no target", () => {
    const state = computeCategoryVisualState({
      planId,
      categoryId: "cat-empty",
      availableMilliunits: 0,
      assignedMilliunits: 0,
      activityMilliunits: 0,
      month,
      formatCurrency: formatMilliunits,
    });

    expect(state.status).toBe("UNFUNDED");
    expect(state.statusText).toBe("");
    expect(state.statusHighlight).toBe("");
    expect(state.sections[0].segments).toEqual([]);
  });

  it("renders red striped bar and negative pill for cash overspending", () => {
    const state = computeCategoryVisualState({
      planId,
      categoryId: "cat-overspent",
      availableMilliunits: -45000,
      assignedMilliunits: 0,
      activityMilliunits: -45000,
      month,
      formatCurrency: formatMilliunits,
    });

    expect(state.status).toBe("CASH_OVERSPENT");
    expect(state.colorFamily).toBe("red");
    expect(state.statusHighlight).toBe("Overspent");
    expect(state.statusDetails).toBe("");
    expect(state.statusText).toBe("Overspent");
    expect(state.availablePillClass).toContain("negative");
    expect(state.sections[0].spentRatio).toBe(1);
    expect(state.sections[0].segments).toEqual([
      { className: "is-overspent", widthPercent: 100 },
    ]);
  });

  it("renders yellow cautious pill with credit card icon for credit overspending", () => {
    const state = computeCategoryVisualState({
      planId,
      categoryId: "cat-cc",
      availableMilliunits: -50000,
      assignedMilliunits: 0,
      activityMilliunits: -50000,
      month,
      isCreditCardPayment: true,
      formatCurrency: formatMilliunits,
    });

    expect(state.status).toBe("CREDIT_OVERSPENT");
    expect(state.colorFamily).toBe("yellow");
    expect(state.statusHighlight).toBe("Overspent");
    expect(state.statusText).toBe("Overspent");
    expect(state.availablePillClass).toContain("cautious credit");
    expect(state.availableIcon).toBe("credit_card_exclamation_mark");
  });

  it("renders weekly target with multiple (4-5) sections", () => {
    saveCategoryTarget(planId, "cat-weekly", {
      amount_milliunits: 50000, // $50/week
      cadence: "WEEKLY",
      target_type: "REFILL_UP_TO",
      day_of_week: 0,
    });

    const state = computeCategoryVisualState({
      planId,
      categoryId: "cat-weekly",
      availableMilliunits: 100000,
      assignedMilliunits: 100000,
      activityMilliunits: 0,
      month,
      formatCurrency: formatMilliunits,
    });

    const expectedWeeks = getWeeksInMonth(month, 0);
    expect(state.sections).toHaveLength(expectedWeeks);
    expect(state.status).toBe("UNDERFUNDED");
    expect(state.colorFamily).toBe("yellow");
    expect(state.availableIcon).toBe("pie_chart");
    expect(state.statusText).toContain("more needed this month");
  });

  it("renders 2 sections for set-aside-another target with rollover", () => {
    saveCategoryTarget(planId, "cat-rollover", {
      amount_milliunits: 100000,
      cadence: "MONTHLY",
      target_type: "SET_ASIDE_ANOTHER",
    });

    // available 150000, assigned 100000, spent 0 -> rollover 50000 > 0
    const state = computeCategoryVisualState({
      planId,
      categoryId: "cat-rollover",
      availableMilliunits: 150000,
      assignedMilliunits: 100000,
      activityMilliunits: 0,
      month,
      formatCurrency: formatMilliunits,
    });

    expect(state.sections).toHaveLength(2);
    expect(state.status).toBe("FUNDED");
    expect(state.availableIcon).toBe("check_circle_fill");
    expect(state.sections[0].flexBasisPercent).toBeCloseTo(33.33, 1);
    expect(state.sections[1].flexBasisPercent).toBeCloseTo(66.67, 1);
  });

  it("renders snooze state with snooze icon and green pill", () => {
    saveCategoryTarget(planId, "cat-snoozed", {
      amount_milliunits: 200000,
      cadence: "MONTHLY",
      target_type: "REFILL_UP_TO",
    });
    setTargetSnooze(planId, "cat-snoozed", month, true);

    const state = computeCategoryVisualState({
      planId,
      categoryId: "cat-snoozed",
      availableMilliunits: 0,
      assignedMilliunits: 0,
      activityMilliunits: 0,
      month,
      formatCurrency: formatMilliunits,
    });

    expect(state.status).toBe("SNOOZED");
    expect(state.statusText).toBe("Snoozed");
    expect(state.availableIcon).toBe("snooze");
    expect(state.availablePillClass).toContain("positive");
  });
});
