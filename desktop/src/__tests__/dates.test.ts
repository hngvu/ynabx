import { describe, it, expect } from "vitest";
import {
  getCurrentMonthIso,
  addMonths,
  formatMonthLabel,
  getMonthIsoFromDate,
  formatDate,
  setDefaultDateFormat,
} from "../utils/dates";

describe("Date & Month Utilities (Local Time & Year Boundaries)", () => {
  it("computes getCurrentMonthIso using local date components instead of UTC", () => {
    // 2026-10-01 00:15 local time (in UTC+7 this would be 2026-09-30T17:15:00Z)
    const localStartOfMonth = new Date(2026, 9, 1, 0, 15, 0);
    expect(getCurrentMonthIso(localStartOfMonth)).toBe("2026-10-01");

    // 2026-12-31 23:55 local time
    const localEndOfYear = new Date(2026, 11, 31, 23, 55, 0);
    expect(getCurrentMonthIso(localEndOfYear)).toBe("2026-12-01");
  });

  it("adds and subtracts months accurately across year boundaries", () => {
    expect(addMonths("2026-12-01", 1)).toBe("2027-01-01");
    expect(addMonths("2027-01-01", -1)).toBe("2026-12-01");
    expect(addMonths("2026-10-01", 5)).toBe("2027-03-01");
    expect(addMonths("2026-02-01", -3)).toBe("2025-11-01");
  });

  it("formats month labels and extracts month ISO from transaction dates", () => {
    expect(formatMonthLabel("2026-10-01")).toBe("Oct 2026");
    expect(formatMonthLabel("2027-01-01")).toBe("Jan 2027");
    expect(getMonthIsoFromDate("2026-10-28")).toBe("2026-10-01");
  });

  it("formats dates according to selected date format pattern", () => {
    expect(formatDate("2026-10-29", "30/12/2026")).toBe("29/10/2026");
    expect(formatDate("2026-10-29", "12/30/2026")).toBe("10/29/2026");
    expect(formatDate("2026-10-29", "2026/12/30")).toBe("2026/10/29");
    expect(formatDate("2026-10-29", "2026-12-30")).toBe("2026-10-29");
    expect(formatDate("2026-10-29", "30.12.2026")).toBe("29.10.2026");
    expect(formatDate("2026-10-29", "30-12-2026")).toBe("29-10-2026");

    setDefaultDateFormat("30/12/2026");
    expect(formatDate("2026-10-29")).toBe("29/10/2026");
    setDefaultDateFormat("YYYY-MM-DD");
  });
});