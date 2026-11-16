import { describe, it, expect } from 'vitest';
import { evaluateFormula, calculateAssignedExpression } from './calculator';

describe('evaluateFormula', () => {
  it('handles basic arithmetic operations', () => {
    expect(evaluateFormula('10 + 20')).toBe(30);
    expect(evaluateFormula('50 - 15')).toBe(35);
    expect(evaluateFormula('6 * 7')).toBe(42);
    expect(evaluateFormula('100 / 4')).toBe(25);
    expect(evaluateFormula('17 % 5')).toBe(2);
    expect(evaluateFormula('2 ^ 3')).toBe(8);
  });

  it('respects operator precedence', () => {
    expect(evaluateFormula('2 + 3 * 4')).toBe(14);
    expect(evaluateFormula('10 - 4 / 2')).toBe(8);
    expect(evaluateFormula('2 * 3 + 4 * 5')).toBe(26);
  });

  it('handles parentheses correctly', () => {
    expect(evaluateFormula('(2 + 3) * 4')).toBe(20);
    expect(evaluateFormula('100 / (2 + 3)')).toBe(20);
    expect(evaluateFormula('((5 + 5) * (3 + 2))')).toBe(50);
  });

  it('handles decimal numbers accurately', () => {
    expect(evaluateFormula('12.50 + 7.25')).toBe(19.75);
    expect(evaluateFormula('10.5 * 2')).toBe(21);
    expect(evaluateFormula('0.1 + 0.2')).toBeCloseTo(0.3, 5);
  });

  it('trims trailing operators safely', () => {
    expect(evaluateFormula('50+')).toBe(50);
    expect(evaluateFormula('25 *')).toBe(25);
    expect(evaluateFormula('100 -')).toBe(100);
    expect(evaluateFormula('10 /')).toBe(10);
  });

  it('handles leading negative numbers', () => {
    expect(evaluateFormula('-10 + 50')).toBe(40);
    expect(evaluateFormula('-5 * 4')).toBe(-20);
  });

  it('handles empty or blank input gracefully', () => {
    expect(evaluateFormula('')).toBeNull();
    expect(evaluateFormula('   ')).toBeNull();
    expect(evaluateFormula('+++')).toBeNull();
  });

  it('handles division by zero safely without string concatenation', () => {
    const result = evaluateFormula('10 / 0');
    expect(result).toBeNull();
    expect(evaluateFormula('100 / (5 - 5)')).toBeNull();
    expect(evaluateFormula('50 % 0')).toBeNull();
  });
});

describe('calculateAssignedExpression', () => {
  it('evaluates absolute dollar amounts', () => {
    expect(calculateAssignedExpression('150.00', 50)).toBe(150);
    expect(calculateAssignedExpression('$250.50', 0)).toBe(250.5);
  });

  it('evaluates relative adjustments against currentValue', () => {
    expect(calculateAssignedExpression('+25', 100)).toBe(125);
    expect(calculateAssignedExpression('-30', 100)).toBe(70);
    expect(calculateAssignedExpression('+ 50', 200)).toBe(250);
    expect(calculateAssignedExpression('* 2', 50)).toBe(100);
  });

  it('returns 0 for empty or whitespace strings', () => {
    expect(calculateAssignedExpression('', 100)).toBe(0);
    expect(calculateAssignedExpression('  ', 100)).toBe(0);
  });
});
