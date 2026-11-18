//! Pure integer (scaled milliunits) Shunting-Yard inline currency calculator
//! matching YNAB Ember math engine (`Zi` & `Wi` in `wrapper-DkFKwf1z.js`).
//! Supports `+`, `-`, `*`, `/`, `%`, `^`, parentheses, and relative adjustments (`+25`, `-10`).
//! Zero floating-point operations (`#![deny(clippy::float_arithmetic)]`).

#![deny(clippy::float_arithmetic)]

const SCALE: i128 = 1000; // 1000 milliunits = 1.00 unit

fn precedence(op: char) -> Option<u8> {
    match op {
        '+' | '-' => Some(1),
        '*' | '/' | '%' | '^' => Some(2),
        _ => None,
    }
}

/// Parse a decimal token like "12.50" or "-50.25" into scaled milliunits (i128).
fn parse_scaled_milliunits(token: &str) -> Option<i128> {
    let trimmed = token.trim();
    if trimmed.is_empty() || trimmed == "-" || trimmed == "." || trimmed == "-." {
        return None;
    }
    let (is_neg, body) = if let Some(rest) = trimmed.strip_prefix('-') {
        (true, rest)
    } else if let Some(rest) = trimmed.strip_prefix('+') {
        (false, rest)
    } else {
        (false, trimmed)
    };

    if body.is_empty() {
        return None;
    }

    let parts: Vec<&str> = body.split('.').collect();
    if parts.len() > 2 {
        return None;
    }

    let whole_str = parts[0];
    let whole: i128 = if whole_str.is_empty() {
        0
    } else {
        whole_str.parse::<i128>().ok()?
    };

    let frac_milli: i128 = if parts.len() == 2 {
        let frac_str = parts[1];
        if !frac_str.chars().all(|c| c.is_ascii_digit()) {
            return None;
        }
        // Take up to 4 digits for rounding to nearest milliunit
        let mut padded = String::with_capacity(4);
        for c in frac_str.chars().take(4) {
            padded.push(c);
        }
        while padded.len() < 4 {
            padded.push('0');
        }
        let ten_thousandths: i128 = padded.parse::<i128>().ok()?;
        (ten_thousandths + 5) / 10
    } else {
        0
    };

    let total = whole.checked_mul(SCALE)?.checked_add(frac_milli)?;
    Some(if is_neg { -total } else { total })
}

fn apply_op_scaled(left: i128, op: char, right: i128) -> Option<i128> {
    match op {
        '+' => left.checked_add(right),
        '-' => left.checked_subtract_or_sub(right),
        '*' => {
            // (left * right) / SCALE with half-up rounding
            let prod = left.checked_mul(right)?;
            let adj = if prod >= 0 { SCALE / 2 } else { -(SCALE / 2) };
            Some((prod + adj) / SCALE)
        }
        '/' => {
            if right == 0 {
                return None;
            }
            // (left * SCALE) / right with half-up rounding
            let num = left.checked_mul(SCALE)?;
            let half = right.abs() / 2;
            let same_sign = (num >= 0 && right > 0) || (num <= 0 && right < 0);
            let adjusted = if same_sign { num + half } else { num - half };
            Some(adjusted / right)
        }
        '%' => {
            if right == 0 {
                return None;
            }
            Some(left % right)
        }
        '^' => {
            // Integer exponentiation where exponent is (right / SCALE)
            let exp = right / SCALE;
            if !(0..=20).contains(&exp) {
                return None;
            }
            let mut acc = SCALE;
            for _ in 0..exp {
                acc = apply_op_scaled(acc, '*', left)?;
            }
            Some(acc)
        }
        _ => None,
    }
}

trait CheckedSubExt {
    fn checked_subtract_or_sub(self, rhs: Self) -> Option<Self>
    where
        Self: Sized;
}

impl CheckedSubExt for i128 {
    fn checked_subtract_or_sub(self, rhs: Self) -> Option<Self> {
        self.checked_sub(rhs)
    }
}

/// Evaluates standard currency formula (e.g. `"50 + 25 * 2"` -> `Some(100_000)` milliunits).
/// Returns `None` on empty input, malformed input, or division/modulo by zero.
pub fn evaluate_formula_milliunits(raw_expr: &str) -> Option<i64> {
    let mut expr: String = raw_expr
        .chars()
        .filter(|c| !c.is_whitespace() && *c != '$' && *c != ',')
        .collect();

    if expr.is_empty() {
        return None;
    }

    // Trim trailing operator like "50+" -> "50"
    while let Some(last) = expr.chars().last() {
        if matches!(last, '+' | '-' | '*' | '/' | '%' | '^') {
            expr.pop();
        } else {
            break;
        }
    }

    if expr.is_empty() {
        return None;
    }

    let mut stack: Vec<char> = Vec::new();
    let mut last_char: Option<char> = None;
    let mut is_negative = false;

    if expr.starts_with('-') {
        is_negative = true;
        expr.remove(0);
    }

    let mut postfix: Vec<String> = Vec::new();
    let chars: Vec<char> = expr.chars().collect();

    for (s, &ch) in chars.iter().enumerate() {
        if ch.is_ascii_digit() || ch == '.' {
            let piece = if is_negative {
                is_negative = false;
                format!("-{}", ch)
            } else {
                ch.to_string()
            };

            if s == 0 || last_char.is_some() {
                postfix.push(piece);
                last_char = None;
            } else if let Some(last_token) = postfix.last_mut() {
                last_token.push_str(&piece);
            } else {
                postfix.push(piece);
            }
        } else if let Some(prec) = precedence(ch) {
            if let Some(lc) = last_char {
                if lc != ')' && ch == '-' {
                    if is_negative {
                        postfix.push(ch.to_string());
                    }
                    is_negative = true;
                } else {
                    while let Some(&top) = stack.last() {
                        if let Some(top_prec) = precedence(top) {
                            if prec <= top_prec {
                                postfix.push(stack.pop().unwrap().to_string());
                                continue;
                            }
                        }
                        break;
                    }
                    stack.push(ch);
                }
            } else {
                while let Some(&top) = stack.last() {
                    if let Some(top_prec) = precedence(top) {
                        if prec <= top_prec {
                            postfix.push(stack.pop().unwrap().to_string());
                            continue;
                        }
                    }
                    break;
                }
                stack.push(ch);
            }
            last_char = Some(ch);
        } else if ch == '(' {
            if is_negative {
                postfix.push("-".to_string());
                is_negative = false;
            }
            stack.push(ch);
            last_char = Some(ch);
        } else if ch == ')' {
            while let Some(&top) = stack.last() {
                if top != '(' {
                    postfix.push(stack.pop().unwrap().to_string());
                } else {
                    break;
                }
            }
            let _ = stack.pop(); // remove '('
            last_char = Some(ch);
        } else {
            // Invalid character in expression
            return None;
        }
    }

    while let Some(op) = stack.pop() {
        if op != '(' {
            postfix.push(op.to_string());
        }
    }

    if postfix.is_empty() {
        return None;
    }

    let mut eval_stack: Vec<i128> = Vec::new();
    for token in postfix {
        if let Some(val) = parse_scaled_milliunits(&token) {
            eval_stack.push(val);
        } else if token.len() == 1 {
            let op = token.chars().next().unwrap();
            if precedence(op).is_some() {
                if eval_stack.len() < 2 {
                    continue;
                }
                let right = eval_stack.pop()?;
                let left = eval_stack.pop()?;
                let res = apply_op_scaled(left, op, right)?;
                eval_stack.push(res);
            } else {
                return None;
            }
        } else {
            return None;
        }
    }

    let final_val = *eval_stack.first()?;
    i64::try_from(final_val).ok()
}

/// Evaluates relative or absolute expression against `current_amount_milliunits`.
/// e.g. `"+ 25"` on `100_000` ($100.00) -> `Some(125_000)` ($125.00).
pub fn calculate_assigned_expression_milliunits(
    input_str: &str,
    current_amount_milliunits: i64,
) -> Option<i64> {
    let trimmed: String = input_str
        .trim()
        .chars()
        .filter(|c| *c != '$' && *c != ',')
        .collect();
    let trimmed = trimmed.trim();
    if trimmed.is_empty() {
        return Some(0);
    }

    let first_ch = trimmed.chars().next()?;
    if matches!(first_ch, '+' | '-' | '*' | '/' | '%') {
        let sign = if current_amount_milliunits < 0 {
            "-"
        } else {
            ""
        };
        let abs = current_amount_milliunits.unsigned_abs();
        let whole = abs / 1000;
        let frac = abs % 1000;
        let current_str = if frac == 0 {
            format!("{}{}", sign, whole)
        } else {
            format!("{}{}.{:03}", sign, whole, frac)
        };
        return evaluate_formula_milliunits(&format!("{}{}", current_str, trimmed));
    }

    evaluate_formula_milliunits(trimmed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_f12_t1_01_basic_addition_and_subtraction() {
        assert_eq!(evaluate_formula_milliunits("50 + 25"), Some(75_000));
        assert_eq!(evaluate_formula_milliunits("100 - 30"), Some(70_000));
        assert_eq!(evaluate_formula_milliunits("10 + 20 + 30"), Some(60_000));
    }

    #[test]
    fn test_f12_t1_02_multiplication_and_division() {
        assert_eq!(evaluate_formula_milliunits("20 * 4"), Some(80_000));
        assert_eq!(evaluate_formula_milliunits("100 / 4"), Some(25_000));
        assert_eq!(evaluate_formula_milliunits("15 * 3 / 5"), Some(9_000));
    }

    #[test]
    fn test_f12_t1_03_operator_precedence() {
        assert_eq!(evaluate_formula_milliunits("10 + 5 * 2"), Some(20_000));
        assert_eq!(evaluate_formula_milliunits("20 - 4 / 2"), Some(18_000));
        assert_eq!(
            evaluate_formula_milliunits("2 + 3 * 4 - 6 / 2"),
            Some(11_000)
        );
    }

    #[test]
    fn test_f12_t1_04_decimal_expressions() {
        assert_eq!(evaluate_formula_milliunits("12.50 + 7.50"), Some(20_000));
        assert_eq!(evaluate_formula_milliunits("10.25 * 2"), Some(20_500));
        assert_eq!(evaluate_formula_milliunits("100.50 - 50.25"), Some(50_250));
    }

    #[test]
    fn test_f12_t1_05_leading_operator_on_current_value() {
        assert_eq!(
            calculate_assigned_expression_milliunits("+ 25", 100_000),
            Some(125_000)
        );
        assert_eq!(
            calculate_assigned_expression_milliunits("+25", 100_000),
            Some(125_000)
        );
        assert_eq!(
            calculate_assigned_expression_milliunits("- 20", 100_000),
            Some(80_000)
        );
        assert_eq!(
            calculate_assigned_expression_milliunits("-20", 100_000),
            Some(80_000)
        );
        assert_eq!(
            calculate_assigned_expression_milliunits("* 2", 50_000),
            Some(100_000)
        );
    }

    #[test]
    fn test_f12_t2_01_division_by_zero_safe() {
        assert_eq!(evaluate_formula_milliunits("10 / 0"), None);
        assert_eq!(evaluate_formula_milliunits("0 / 0"), None);
        assert_eq!(evaluate_formula_milliunits("100 / (5 - 5)"), None);
        assert_eq!(evaluate_formula_milliunits("10 % 0"), None);
    }

    #[test]
    fn test_f12_t2_03_whitespace_and_unary_minus() {
        assert_eq!(
            evaluate_formula_milliunits("  150   +   50  "),
            Some(200_000)
        );
        assert_eq!(
            calculate_assigned_expression_milliunits("   +   25   ", 100_000),
            Some(125_000)
        );
        assert_eq!(evaluate_formula_milliunits("-50 + 100"), Some(50_000));
        assert_eq!(evaluate_formula_milliunits("100 + -20"), Some(80_000));
        assert_eq!(evaluate_formula_milliunits("-10 - 20"), Some(-30_000));
    }

    #[test]
    fn test_f12_t2_05_malformed_syntax_graceful() {
        assert_eq!(evaluate_formula_milliunits(""), None);
        assert_eq!(evaluate_formula_milliunits("   "), None);
        assert_eq!(evaluate_formula_milliunits("abc"), None);
        assert_eq!(evaluate_formula_milliunits("+++"), None);
        // Should not panic on consecutive operators
        let _ = evaluate_formula_milliunits("100 ++ 20");
        let _ = evaluate_formula_milliunits("100 +* 20");
    }
}
