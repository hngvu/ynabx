import { describe, it, expect } from 'vitest';
import { evaluateFormula, calculateAssignedExpression } from '../utils/calculator';

describe('F12: Inline Currency Calculator Math Engine', () => {
  // ---------------------------------------------------------------------------
  // Tier 1: Feature Coverage (Equivalence Classes & Primary Path)
  // ---------------------------------------------------------------------------

  it('T1-01: Basic addition and subtraction ("50 + 25", "100 - 30")', () => {
    expect(evaluateFormula('50 + 25')).toBe(75);
    expect(evaluateFormula('100 - 30')).toBe(70);
    expect(evaluateFormula('10 + 20 + 30')).toBe(60);
  });

  it('T1-02: Multiplication and division ("20 * 4", "100 / 4")', () => {
    expect(evaluateFormula('20 * 4')).toBe(80);
    expect(evaluateFormula('100 / 4')).toBe(25);
    expect(evaluateFormula('15 * 3 / 5')).toBe(9);
  });

  it('T1-03: Operator precedence ("10 + 5 * 2" = 20)', () => {
    // Multiplication (*, /) must precede addition (+, -)
    expect(evaluateFormula('10 + 5 * 2')).toBe(20);
    expect(evaluateFormula('20 - 4 / 2')).toBe(18);
    expect(evaluateFormula('2 + 3 * 4 - 6 / 2')).toBe(11);
  });

  it('T1-04: Floating point / decimal expressions ("12.50 + 7.50" = 20)', () => {
    expect(evaluateFormula('12.50 + 7.50')).toBe(20);
    expect(evaluateFormula('10.25 * 2')).toBe(20.5);
    expect(evaluateFormula('100.50 - 50.25')).toBe(50.25);
  });

  it('T1-05: Leading operator on current value ("+ 25" on 100 = 125, "- 20" on 100 = 80)', () => {
    expect(calculateAssignedExpression('+ 25', 100)).toBe(125);
    expect(calculateAssignedExpression('+25', 100)).toBe(125);
    expect(calculateAssignedExpression('- 20', 100)).toBe(80);
    expect(calculateAssignedExpression('-20', 100)).toBe(80);
    expect(calculateAssignedExpression('* 2', 50)).toBe(100);
  });

  // ---------------------------------------------------------------------------
  // Tier 2: Boundary & Corner Cases
  // ---------------------------------------------------------------------------

  it('T2-01: Division by zero does not return concatenated string (safe handling)', () => {
    const result = evaluateFormula('10 / 0');
    // Invariant: Division by zero must NEVER return "100" from `${l}${r}` string concatenation!
    expect(result).not.toBe(100);
    // Safe handling: should return null or non-finite representation
    expect(result === null || !Number.isFinite(result)).toBe(true);
  });

  it('T2-02: Zero divided by zero is handled safely without invalid numeric string', () => {
    const result = evaluateFormula('0 / 0');
    // Indeterminate division must not produce valid zero from "00" concatenation
    expect(result === null || Number.isNaN(result) || !Number.isFinite(result)).toBe(true);
  });

  it('T2-03: Expression with multiple spaces and padding ("  150   +   50  ")', () => {
    expect(evaluateFormula('  150   +   50  ')).toBe(200);
    expect(calculateAssignedExpression('   +   25   ', 100)).toBe(125);
    expect(evaluateFormula('  \t 100  \n -   30  ')).toBe(70);
  });

  it('T2-04: Unary minus / negative numbers ("-50 + 100", "100 + -20")', () => {
    expect(evaluateFormula('-50 + 100')).toBe(50);
    expect(evaluateFormula('100 + -20')).toBe(80);
    expect(evaluateFormula('-10 - 20')).toBe(-30);
  });

  it('T2-05: Malformed syntax graceful handling ("100 ++ 20", "abc", "")', () => {
    expect(evaluateFormula('')).toBeNull();
    expect(evaluateFormula('   ')).toBeNull();
    expect(evaluateFormula('abc')).toBeNull();
    expect(evaluateFormula('+++')).toBeNull();
    // Multiple consecutive operators or invalid expressions must not throw unhandled exceptions
    expect(() => evaluateFormula('100 ++ 20')).not.toThrow();
    expect(() => evaluateFormula('100 +* 20')).not.toThrow();
  });
});
