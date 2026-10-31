import { describe, expect, it } from "vitest";
import {
  calculateChartGeometry,
  calculateFifoAgeOfMoney,
  getAgeOfMoneySeries,
} from "../utils/ageOfMoney";
import type { Account, Transaction } from "../api/types";

describe("Age of Money domain & dynamic charting geometry", () => {
  it("calculateChartGeometry computes exact SVG paths and ticks for arbitrary datasets", () => {
    const sampleData = [
      { label: "Jul", subLabel: "2026", value: 22 },
      { label: "Aug", subLabel: "2026", value: 51 },
      { label: "Sep", subLabel: "2026", value: 70 },
      { label: "Oct", subLabel: "2026", value: 75 },
    ];

    const geom = calculateChartGeometry(sampleData, {
      width: 1003,
      height: 252.333,
      topPadding: 23.848,
    });

    expect(geom.points).toHaveLength(4);
    expect(geom.yMax).toBe(90); // 75 days -> rounds up to 90

    // Coordinates match line endpoints exactly
    expect(geom.points[0].x).toBeCloseTo(10, 0);
    expect(geom.points[3].x).toBeCloseTo(993, 0);

    // Points lie on the line
    expect(geom.linePathD).toMatch(/^M10/);
    expect(geom.linePathD).toContain("L993");

    // Area path closes at baseline
    expect(geom.areaPathD).toContain("252.333");
    expect(geom.areaPathD).toMatch(/Z$/);

    // Ticks
    expect(geom.yTicks[0].label).toBe("0 days");
    expect(geom.yTicks[1].label).toBe("90 days");
    expect(geom.xTicks).toHaveLength(4);
    expect(geom.xTicks[0].label).toBe("Jul");
    expect(geom.xTicks[3].label).toBe("Oct");
  });

  it("handles different data sizes and value scales dynamically (e.g. 6 months, high AOM)", () => {
    const largeData = [
      { label: "May", subLabel: "2026", value: 30 },
      { label: "Jun", subLabel: "2026", value: 65 },
      { label: "Jul", subLabel: "2026", value: 90 },
      { label: "Aug", subLabel: "2026", value: 110 },
      { label: "Sep", subLabel: "2026", value: 130 },
      { label: "Oct", subLabel: "2026", value: 145 },
    ];

    const geom = calculateChartGeometry(largeData);

    expect(geom.points).toHaveLength(6);
    expect(geom.yMax).toBe(180); // 145 days * 1.15 = 166.75 -> rounds up to 180
    expect(geom.yTicks[1].label).toBe("180 days");

    // All points are strictly ascending in x
    for (let i = 1; i < geom.points.length; i++) {
      expect(geom.points[i].x).toBeGreaterThan(geom.points[i - 1].x);
    }
  });

  it("handles single data point gracefully without dividing by zero", () => {
    const single = [{ label: "Oct", subLabel: "2026", value: 50 }];
    const geom = calculateChartGeometry(single);

    expect(geom.points).toHaveLength(1);
    expect(geom.points[0].x).toBe(501.5); // centered
    expect(geom.yMax).toBe(60);
  });

  it("calculateFifoAgeOfMoney calculates average age from cash inflows and outflows", () => {
    const sampleAccounts: Account[] = [
      {
        id: "acc-cash",
        plan_id: "p1",
        name: "Checking",
        type: "CHECKING",
        on_budget: true,
        closed: false,
        balance_milliunits: 1000000,
        cleared_balance_milliunits: 1000000,
        uncleared_balance_milliunits: 0,
        sort_order: 1,
      },
    ];

    const sampleTx: Transaction[] = [
      // Income on 2026-08-01: $1,000
      {
        id: "tx-1",
        plan_id: "p1",
        account_id: "acc-cash",
        date: "2026-08-01",
        amount_milliunits: 1000000,
        cleared: "CLEARED",
        approved: true,
      },
      // Spending on 2026-10-15 (75 days later): -$100
      {
        id: "tx-2",
        plan_id: "p1",
        account_id: "acc-cash",
        date: "2026-10-15",
        amount_milliunits: -100000,
        cleared: "CLEARED",
        approved: true,
      },
    ];

    const aom = calculateFifoAgeOfMoney(sampleTx, sampleAccounts, "2026-10-16");
    expect(aom).toBe(75); // 75 days!
  });

  it("getAgeOfMoneySeries produces monthly trend series", () => {
    const series = getAgeOfMoneySeries(
      [],
      [],
      "2026-10-01",
      300000,
      750000,
      4,
    );
    expect(series).toHaveLength(4);
    expect(series[3].label).toBe("Oct");
    expect(series[3].value).toBe(75);
    expect(series[0].label).toBe("Jul");
    expect(series[0].value).toBeLessThan(series[3].value);
  });
});
