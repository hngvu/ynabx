import { describe, it, expect } from "vitest";
import { formatMilliunits, parseInputToMilliunits, setDefaultFormatOptions } from "../utils/currency";

describe("Currency Milliunit Formatting & Parsing Invariants", () => {
  it("formats positive milliunits correctly", () => {
    expect(formatMilliunits(0)).toBe("$0.00");
    expect(formatMilliunits(1000)).toBe("$1.00");
    expect(formatMilliunits(12340)).toBe("$12.34");
    expect(formatMilliunits(1540250)).toBe("$1,540.25");
  });

  it("formats negative milliunits correctly", () => {
    expect(formatMilliunits(-50000)).toBe("-$50.00");
    expect(formatMilliunits(-250)).toBe("-$0.25");
  });

  it("parses standard string inputs to integer milliunits without float drift", () => {
    expect(parseInputToMilliunits("12.34")).toBe(12340);
    expect(parseInputToMilliunits("$1,540.25")).toBe(1540250);
    expect(parseInputToMilliunits("-50")).toBe(-50000);
    expect(parseInputToMilliunits("+50")).toBe(50000);
  });

  it("returns 0 for empty or whitespace inputs with or without currentMilliunits", () => {
    expect(parseInputToMilliunits("")).toBe(0);
    expect(parseInputToMilliunits("   ")).toBe(0);
    expect(parseInputToMilliunits("", 100000)).toBe(0);
    expect(parseInputToMilliunits("   ", 100000)).toBe(0);
  });

  it("handles exact decimal rounding without IEEE-754 float drift", () => {
    expect(parseInputToMilliunits("1.005")).toBe(1005);
    expect(parseInputToMilliunits("-1.005")).toBe(-1005);
    expect(parseInputToMilliunits("1.0055")).toBe(1006);
    expect(parseInputToMilliunits("0.1 + 0.2")).toBe(300);
  });

  it("evaluates multiplication and division using scaled BigInt and half-away-from-zero rounding", () => {
    expect(parseInputToMilliunits("50 * 2")).toBe(100000);
    expect(parseInputToMilliunits("500 / 3")).toBe(166667);
    expect(parseInputToMilliunits("-10 / 3")).toBe(-3333);
    expect(parseInputToMilliunits("10 / 3")).toBe(3333);
  });

  it("respects operator precedence (* and / before + and -) and parentheses", () => {
    expect(parseInputToMilliunits("2 + 3 * 4")).toBe(14000);
    expect(parseInputToMilliunits("(2 + 3) * 4")).toBe(20000);
    expect(parseInputToMilliunits("100 + 25.50 * 2")).toBe(151000);
  });

  it("tokenizes unsigned numbers and treats + and - as unary/binary operators cleanly", () => {
    expect(parseInputToMilliunits("10-5")).toBe(5000);
    expect(parseInputToMilliunits("5 - -3")).toBe(8000);
    expect(parseInputToMilliunits("-(2+3)")).toBe(-5000);
    expect(parseInputToMilliunits("+(10 - 2)")).toBe(8000);
  });

  it("applies relative +/- only when currentMilliunits is provided and input starts with + or -", () => {
    expect(parseInputToMilliunits("+50", 100000)).toBe(150000);
    expect(parseInputToMilliunits("-20", 100000)).toBe(80000);
    expect(parseInputToMilliunits("+25.50 * 2", 100000)).toBe(151000);
    expect(parseInputToMilliunits("50", 100000)).toBe(50000);
    expect(parseInputToMilliunits("50 + 10", 100000)).toBe(60000);
  });

  it("throws clear errors on division by zero, invalid syntax, or unsafe integer overflow", () => {
    expect(() => parseInputToMilliunits("10 / 0")).toThrow(/zero/i);
    expect(() => parseInputToMilliunits("10 + * 2")).toThrow();
    expect(() => parseInputToMilliunits("abc")).toThrow();
    expect(() => parseInputToMilliunits("(10 + 5")).toThrow();
    expect(() => parseInputToMilliunits("99999999999999")).toThrow(/safe integer/i);
  });

  it("formats currency with custom placement, currency symbol, and number formats", () => {
    // VND after without decimals
    setDefaultFormatOptions({
      currencyCode: "VND",
      currencySymbol: "₫",
      symbolFirst: false,
      displaySymbol: true,
      numberFormat: "123,456",
    });
    expect(formatMilliunits(50000000)).toBe("50,000 ₫");
    expect(formatMilliunits(-50000000)).toBe("-50,000 ₫");

    // EUR with European number format 123.456,78 and symbol first
    setDefaultFormatOptions({
      currencyCode: "EUR",
      currencySymbol: "€",
      symbolFirst: true,
      displaySymbol: true,
      numberFormat: "123.456,78",
    });
    expect(formatMilliunits(1540250)).toBe("€1.540,25");
    expect(formatMilliunits(-1540250)).toBe("-€1.540,25");

    // Don't show symbol
    setDefaultFormatOptions({
      displaySymbol: false,
      numberFormat: "123,456.78",
    });
    expect(formatMilliunits(1540250)).toBe("1,540.25");

    // Reset back to standard USD
    setDefaultFormatOptions({
      currencyCode: "USD",
      currencySymbol: "$",
      symbolFirst: true,
      displaySymbol: true,
      numberFormat: "123,456.78",
    });
    expect(formatMilliunits(1540250)).toBe("$1,540.25");
  });
});