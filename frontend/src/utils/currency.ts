// INVARIANT: All internal monetary math uses integer milliunits (1000 = $1.00)

const MILLI_SCALE = 1000n;
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

export class CurrencyParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CurrencyParseError";
  }
}

export interface CurrencyFormatOptions {
  currencySymbol?: string;
  symbolFirst?: boolean;
  displaySymbol?: boolean;
}

export function formatMilliunits(
  milliunits: number,
  options?: CurrencyFormatOptions,
): string {
  const isNegative = milliunits < 0;
  const abs = Math.abs(Math.trunc(milliunits));
  const totalCents = Math.round(abs / 10);
  const dollars = Math.floor(totalCents / 100);
  const cents = totalCents % 100;
  const centsStr = cents.toString().padStart(2, "0");
  const formattedNumber = `${dollars.toLocaleString("en-US")}.${centsStr}`;

  const displaySymbol = options?.displaySymbol ?? true;
  const symbol = displaySymbol ? (options?.currencySymbol ?? "$") : "";
  const symbolFirst = options?.symbolFirst ?? true;

  const withSymbol = symbolFirst
    ? `${symbol}${formattedNumber}`
    : `${formattedNumber}${symbol ? ` ${symbol}` : ""}`;

  return `${isNegative ? "-" : ""}${withSymbol}`;
}

function divRoundHalfAwayFromZero(num: bigint, den: bigint): bigint {
  if (den === 0n) {
    throw new CurrencyParseError("Division by zero is not allowed");
  }
  const isNegative = num < 0n !== den < 0n;
  const absNum = num < 0n ? -num : num;
  const absDen = den < 0n ? -den : den;
  const quotient = (absNum * 2n + absDen) / (2n * absDen);
  return isNegative ? -quotient : quotient;
}

function parseUnsignedDecimalToMilliunits(raw: string): bigint {
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(raw)) {
    throw new CurrencyParseError(`Invalid decimal number: "${raw}"`);
  }
  const parts = raw.split(".");
  const intStr = parts[0] ?? "0";
  const fracStr = parts[1] ?? "";

  const intPart = intStr === "" ? 0n : BigInt(intStr);
  const frac3Str = (fracStr + "000").slice(0, 3);
  let milli = intPart * MILLI_SCALE + BigInt(frac3Str);

  if (fracStr.length >= 4 && fracStr.charCodeAt(3) >= 53) {
    milli += 1n;
  }
  return milli;
}

type Token =
  | { type: "num"; value: bigint }
  | { type: "op"; op: "+" | "-" | "*" | "/" }
  | { type: "paren"; paren: "(" | ")" };

type RpnItem =
  | { type: "num"; value: bigint }
  | { type: "op"; op: "+" | "-" | "*" | "/" | "u+" | "u-" };

type StackOp = "+" | "-" | "*" | "/" | "u+" | "u-" | "(";

function tokenizeExpression(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i]!;
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      const start = i;
      while (
        i < expr.length &&
        ((expr[i]! >= "0" && expr[i]! <= "9") || expr[i] === ".")
      ) {
        i += 1;
      }
      const rawNum = expr.slice(start, i);
      tokens.push({
        type: "num",
        value: parseUnsignedDecimalToMilliunits(rawNum),
      });
      continue;
    }
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ type: "op", op: ch });
      i += 1;
      continue;
    }
    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", paren: ch });
      i += 1;
      continue;
    }
    throw new CurrencyParseError(`Invalid character "${ch}" in expression`);
  }

  return tokens;
}

function getPrecedence(op: Exclude<StackOp, "(">): number {
  if (op === "u+" || op === "u-") return 3;
  if (op === "*" || op === "/") return 2;
  return 1;
}

function isRightAssociative(op: Exclude<StackOp, "(">): boolean {
  return op === "u+" || op === "u-";
}

function toRpn(tokens: Token[]): RpnItem[] {
  const output: RpnItem[] = [];
  const opStack: StackOp[] = [];
  let expectOperand = true;

  for (const token of tokens) {
    if (token.type === "num") {
      if (!expectOperand) {
        throw new CurrencyParseError("Unexpected number in expression");
      }
      output.push({ type: "num", value: token.value });
      expectOperand = false;
    } else if (token.type === "paren") {
      if (token.paren === "(") {
        if (!expectOperand) {
          throw new CurrencyParseError("Unexpected '(' in expression");
        }
        opStack.push("(");
        expectOperand = true;
      } else {
        if (expectOperand) {
          throw new CurrencyParseError("Unexpected ')' in expression");
        }
        let foundOpen = false;
        while (opStack.length > 0) {
          const top = opStack.pop()!;
          if (top === "(") {
            foundOpen = true;
            break;
          }
          output.push({ type: "op", op: top });
        }
        if (!foundOpen) {
          throw new CurrencyParseError("Mismatched parentheses");
        }
        expectOperand = false;
      }
    } else if (token.type === "op") {
      if (expectOperand) {
        if (token.op !== "+" && token.op !== "-") {
          throw new CurrencyParseError(`Unexpected operator "${token.op}"`);
        }
        const unaryOp: StackOp = token.op === "+" ? "u+" : "u-";
        opStack.push(unaryOp);
        expectOperand = true;
      } else {
        const currOp = token.op;
        const currPrec = getPrecedence(currOp);
        while (opStack.length > 0) {
          const top = opStack[opStack.length - 1]!;
          if (top === "(") break;
          const topPrec = getPrecedence(top);
          if (
            topPrec > currPrec ||
            (topPrec === currPrec && !isRightAssociative(currOp))
          ) {
            output.push({ type: "op", op: opStack.pop() as Exclude<StackOp, "("> });
          } else {
            break;
          }
        }
        opStack.push(currOp);
        expectOperand = true;
      }
    }
  }

  if (expectOperand) {
    throw new CurrencyParseError("Incomplete currency expression");
  }

  while (opStack.length > 0) {
    const top = opStack.pop()!;
    if (top === "(") {
      throw new CurrencyParseError("Unclosed '(' in expression");
    }
    output.push({ type: "op", op: top });
  }

  return output;
}

function evaluateRpn(rpn: RpnItem[]): bigint {
  const stack: bigint[] = [];

  for (const item of rpn) {
    if (item.type === "num") {
      stack.push(item.value);
    } else {
      if (item.op === "u+" || item.op === "u-") {
        if (stack.length < 1) {
          throw new CurrencyParseError("Missing operand for unary operator");
        }
        const val = stack.pop()!;
        stack.push(item.op === "u-" ? -val : val);
      } else {
        if (stack.length < 2) {
          throw new CurrencyParseError("Missing operand for binary operator");
        }
        const b = stack.pop()!;
        const a = stack.pop()!;
        switch (item.op) {
          case "+":
            stack.push(a + b);
            break;
          case "-":
            stack.push(a - b);
            break;
          case "*":
            stack.push(divRoundHalfAwayFromZero(a * b, MILLI_SCALE));
            break;
          case "/":
            stack.push(divRoundHalfAwayFromZero(a * MILLI_SCALE, b));
            break;
        }
      }
    }
  }

  if (stack.length !== 1) {
    throw new CurrencyParseError("Invalid expression structure");
  }

  return stack[0]!;
}

/**
 * Parses a user currency input or inline math expression into integer milliunits.
 * - Supports US decimal format ("12.34", "$1,540.25").
 * - Uses unsigned decimal tokenization + Shunting-Yard + scaled BigInt arithmetic.
 * - Relative "+/-" applies ONLY when `currentMilliunits !== undefined` and trimmed input starts with "+" or "-".
 * - Empty or whitespace input always returns 0.
 */
export function parseInputToMilliunits(
  input: string,
  currentMilliunits?: number,
): number {
  const cleaned = input.replace(/[$,]/g, "").trim();
  if (cleaned === "") {
    return 0;
  }

  const tokens = tokenizeExpression(cleaned);
  const isRelative =
    currentMilliunits !== undefined &&
    (cleaned.startsWith("+") || cleaned.startsWith("-"));

  if (isRelative) {
    tokens.unshift({
      type: "num",
      value: BigInt(Math.trunc(currentMilliunits)),
    });
  }

  const rpn = toRpn(tokens);
  const result = evaluateRpn(rpn);

  if (result > MAX_SAFE_BIGINT || result < -MAX_SAFE_BIGINT) {
    throw new CurrencyParseError(
      "Result exceeds JavaScript safe integer range",
    );
  }

  const numericResult = Number(result);
  return Object.is(numericResult, -0) ? 0 : numericResult;
}
