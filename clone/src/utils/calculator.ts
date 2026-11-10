/**
 * Evaluates in-line currency math expression according to YNAB Ember math engine (Zi & Wi in wrapper-DkFKwf1z.js).
 * Supports +, -, *, /, %, ^, parentheses and relative adjustments (+25, -10).
 */

const OPERATORS_PRECEDENCE: Record<string, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  '%': 2,
  '^': 2,
};

function applyOp(left: number, op: string, right: number): number {
  const l = Number(left);
  const r = Number(right);
  switch (op) {
    case '+':
      return l + r;
    case '-':
      return l - r;
    case '/':
      return r === 0 ? parseFloat(`${l}${r}`) : l / r;
    case '*':
      return l * r;
    case '%':
      return l % r;
    case '^':
      return Math.pow(l, r);
    default:
      return r;
  }
}

/**
 * Evaluates standard expression like "50 + 25 * 2" -> 100
 */
export function evaluateFormula(rawExpr: string): number | null {
  let expr = rawExpr.trim().replace(/\s+/g, '');
  if (!expr) return null;

  // Trim trailing operator like "50+" -> "50"
  while (expr.length > 0 && /[+\-*/%^]$/.test(expr)) {
    expr = expr.slice(0, -1);
  }
  if (!expr) return null;

  const stack: string[] = [];
  let lastChar: string | null = null;
  let isNegative = false;

  if (expr[0] === '-') {
    isNegative = true;
    expr = expr.slice(1);
  }

  const postfix: string[] = [];
  const chars = expr.split('');

  for (let s = 0; s < chars.length; s++) {
    let char = chars[s];
    if (!isNaN(parseInt(char, 10)) || char === '0' || char === '.') {
      if (isNegative) {
        char = `-${char}`;
        isNegative = false;
      }
      if (s === 0 || lastChar) {
        postfix.push(char);
        lastChar = null;
      } else {
        postfix[postfix.length - 1] += char;
      }
    } else if (char in OPERATORS_PRECEDENCE) {
      if (lastChar && lastChar !== ')' && char === '-') {
        if (isNegative) postfix.push(char);
        isNegative = true;
      } else {
        while (
          stack.length > 0 &&
          stack[stack.length - 1] in OPERATORS_PRECEDENCE &&
          OPERATORS_PRECEDENCE[char] <= OPERATORS_PRECEDENCE[stack[stack.length - 1]]
        ) {
          postfix.push(stack.pop()!);
        }
        stack.push(char);
      }
      lastChar = char;
    } else if (char === '(') {
      if (isNegative) {
        postfix.push('-');
        isNegative = false;
      }
      stack.push(char);
      lastChar = char;
    } else if (char === ')') {
      while (stack.length > 0 && stack[stack.length - 1] !== '(') {
        postfix.push(stack.pop()!);
      }
      stack.pop(); // remove '('
      lastChar = char;
    }
  }

  while (stack.length > 0) {
    postfix.push(stack.pop()!);
  }

  // Remove stray '('
  const parenIdx = postfix.indexOf('(');
  if (parenIdx !== -1) postfix.splice(parenIdx, 1);

  const evalStack: number[] = [];
  for (const token of postfix) {
    if (!isNaN(Number(token))) {
      evalStack.push(Number(token));
    } else if (token in OPERATORS_PRECEDENCE) {
      if (evalStack.length < 2) continue;
      const right = evalStack.pop()!;
      const left = evalStack.pop()!;
      evalStack.push(applyOp(left, token, right));
    }
  }

  if (evalStack.length === 0) return null;
  const result = evalStack[0];
  return isNaN(result) ? null : result;
}

/**
 * Handles relative or absolute expression against currentValue.
 * e.g. "+ 25" on 100 -> 125
 * "- 10" on 100 -> 90
 * "50 * 2" on 100 -> 100
 */
export function calculateAssignedExpression(inputStr: string, currentAmountDollars: number): number | null {
  const trimmed = inputStr.trim().replace(/\$/g, '');
  if (!trimmed) return 0;

  // Relative prefix like "+25" or "-10" or "+ 15.5"
  if (/^[+\-*/%]/.test(trimmed)) {
    return evaluateFormula(`${currentAmountDollars}${trimmed}`);
  }

  return evaluateFormula(trimmed);
}
