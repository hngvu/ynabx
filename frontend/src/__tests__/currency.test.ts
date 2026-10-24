import { describe, it, expect } from "vitest";
import { formatMilliunits, parseInputToMilliunits } from "../App";

describe("Currency Milliunit Formatting & Parsing Invariants", () => {
  it("formats positive milliunits correctly", () => {
    expect(formatMilliunits(1000)).toBe("$1.00");
    expect(formatMilliunits(12340)).toBe("$12.34");
    expect(formatMilliunits(1540250)).toBe("$1,540.25");
  });

  it("formats negative milliunits correctly", () => {
    expect(formatMilliunits(-50000)).toBe("-$50.00");
    expect(formatMilliunits(-250)).toBe("-$0.25");
  });

  it("parses string inputs to integer milliunits without float drift", () => {
    expect(parseInputToMilliunits("12.34")).toBe(12340);
    expect(parseInputToMilliunits("$1,540.25")).toBe(1540250);
    expect(parseInputToMilliunits("-50")).toBe(-50000);
    expect(parseInputToMilliunits("")).toBe(0);
  });
});
