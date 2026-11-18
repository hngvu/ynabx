//! YNAB Goal / Target Calculation Engine (100% integer math — zero floating point)
//! Reverse-engineered from YNAB v26.160.1:
//! - `wrapper.renamed.js` lines 22008-22138 (CreditCategoryDetailsData / CCPC Underfunded)
//! - `wrapper.renamed.js` lines 22210-22425 (SubcategoryCalculations Goal Evaluation)
//! - `wrapper.renamed.js` lines 85912-86072 (Kotlin Slik Goal calculations)
//! - `wrapper.renamed.js` lines 32010-32132 (TargetConfiguration & Weekly cadences)

#![deny(clippy::float_arithmetic)]

use serde::{Deserialize, Serialize};

/// Target / Goal calculation result for a subcategory in a specific month
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct SubcategoryGoalResult {
    pub goal_type: Option<String>,
    pub goal_target_amount: Option<i64>,
    pub goal_under_funded: Option<i64>,
    pub goal_overall_funded: Option<i64>,
    pub goal_overall_left: Option<i64>,
    pub goal_percentage_complete: Option<i32>,
    pub is_snoozed: bool,
}

/// Goal period computation result
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GoalPeriod {
    pub start_month: String,       // "YYYY-MM"
    pub end_month: Option<String>, // "YYYY-MM"
    pub total_months: i32,
    pub months_remaining: i32,
    pub is_repeat: bool,
}

/// Input parameters for goal calculation
#[derive(Debug, Clone)]
pub struct GoalEvaluationInput {
    pub current_month: String, // "YYYY-MM"
    pub is_credit_card_payment: bool,
    pub goal_type: Option<String>, // "MF", "TB", "TBD", "NEED", "DEBT"
    pub goal_creation_month: Option<String>,
    pub target_amount: i64,
    pub target_month: Option<String>,   // For TB/TBD/NEED/DEBT
    pub cadence: Option<i32>,           // 1 = monthly, 2 = weekly, 13 = yearly, etc.
    pub cadence_frequency: Option<i32>, // every N months/weeks
    pub day_of_week: Option<i32>,       // 0=Sun, 1=Mon, ..., 6=Sat
    pub goal_needs_whole_amount: bool,  // true = Set Aside; false = Refill Up To
    pub is_snoozed: bool,

    // Month metrics
    pub budgeted: i64,
    pub balance: i64,
    pub activity: i64,
    pub positive_cash_outflows: i64,

    // Credit Card specific metrics (only if is_credit_card_payment == true)
    pub cc_account_balance: i64, // Current balance of credit card account (usually <= 0)
    pub cc_starting_debt_balance: i64,
    pub cc_additional_to_be_budgeted: i64,
    pub cc_budgeted_previous_month: i64,
    pub cc_payment_previous_month: i64,
}

/// Integer percentage helper: round((numerator / denominator) * 100) using half-up integer math
#[inline]
pub fn calc_percentage_int(numerator: i64, denominator: i64) -> i32 {
    if denominator <= 0 {
        return 100;
    }
    let num = numerator.max(0);
    let pct = (num * 100 + denominator / 2) / denominator;
    pct.clamp(0, 100) as i32
}

/// Parse "YYYY-MM" to (year, month 1..12)
pub fn parse_ym(ym: &str) -> Option<(i32, u32)> {
    let parts: Vec<&str> = ym.split('-').collect();
    if parts.len() < 2 {
        return None;
    }
    let y = parts[0].parse::<i32>().ok()?;
    let m = parts[1].parse::<u32>().ok()?;
    if (1..=12).contains(&m) {
        Some((y, m))
    } else {
        None
    }
}

/// Format (year, month 1..12) to "YYYY-MM"
pub fn format_ym(y: i32, m: u32) -> String {
    format!("{:04}-{:02}", y, m)
}

/// Difference in months between ym1 and ym2: ym2 - ym1
pub fn months_between(ym1: &str, ym2: &str) -> i32 {
    let (y1, m1) = parse_ym(ym1).unwrap_or((2000, 1));
    let (y2, m2) = parse_ym(ym2).unwrap_or((2000, 1));
    (y2 - y1) * 12 + (m2 as i32 - m1 as i32)
}

/// Number of days in a given year/month
pub fn days_in_month(year: i32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0) {
                29
            } else {
                28
            }
        }
        _ => 30,
    }
}

/// Day of week using Tomohiko Sakamoto's algorithm
/// Returns 0 = Sunday, 1 = Monday, ..., 6 = Saturday
pub fn day_of_week(year: i32, month: u32, day: u32) -> i32 {
    let t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    let mut y = year;
    if month < 3 {
        y -= 1;
    }
    ((y + y / 4 - y / 100 + y / 400 + t[(month - 1) as usize] + day as i32) % 7 + 7) % 7
}

/// Count how many occurrences of target_dow (0=Sun..6=Sat) exist in a month
pub fn count_days_of_week_in_month(year: i32, month: u32, target_dow: i32) -> i32 {
    let total_days = days_in_month(year, month);
    let mut count = 0;
    for d in 1..=total_days {
        if day_of_week(year, month, d) == target_dow {
            count += 1;
        }
    }
    count
}

/// Calculate current goal period for repeating goals (wrapper.renamed.js lines 85912-85980)
pub fn calculate_current_goal_period(
    creation_month: &str,
    target_month: Option<&str>,
    cadence_frequency: i32,
    current_month: &str,
) -> GoalPeriod {
    let freq = if cadence_frequency <= 0 {
        1
    } else {
        cadence_frequency
    };

    let base_start = creation_month;
    let base_end = target_month.unwrap_or(creation_month);
    let span = months_between(base_start, base_end);
    let period_months = if span > 0 { span } else { freq };

    let diff = months_between(base_start, current_month);
    if diff <= 0 {
        return GoalPeriod {
            start_month: base_start.to_string(),
            end_month: Some(base_end.to_string()),
            total_months: period_months.max(1),
            months_remaining: period_months.max(1),
            is_repeat: false,
        };
    }

    let cycles = diff / period_months;
    let (start_y, start_m) = parse_ym(base_start).unwrap_or((2020, 1));

    let total_start_months = start_y * 12 + (start_m as i32 - 1) + cycles * period_months;
    let cur_period_start_y = total_start_months / 12;
    let cur_period_start_m = (total_start_months % 12 + 1) as u32;
    let cur_start_ym = format_ym(cur_period_start_y, cur_period_start_m);

    let total_end_months = total_start_months + period_months;
    let cur_period_end_y = total_end_months / 12;
    let cur_period_end_m = (total_end_months % 12 + 1) as u32;
    let cur_end_ym = format_ym(cur_period_end_y, cur_period_end_m);

    let rem = months_between(current_month, &cur_end_ym);

    GoalPeriod {
        start_month: cur_start_ym,
        end_month: Some(cur_end_ym),
        total_months: period_months.max(1),
        months_remaining: rem.max(1),
        is_repeat: true,
    }
}

/// Calculate effective target amount for weekly NEED goals (cadence == 2)
pub fn calculate_weekly_goal_target(
    year: i32,
    month: u32,
    weekly_target: i64,
    day_of_week: Option<i32>,
) -> i64 {
    let dow = day_of_week.unwrap_or(5); // default Friday
    let weeks_in_month = count_days_of_week_in_month(year, month, dow) as i64;
    weekly_target * weeks_in_month
}

/// Calculate CCPC Underfunded Amount (wrapper.renamed.js lines 22008-22138: `CreditCategoryDetailsData`)
pub fn calculate_ccpc_underfunded(input: &GoalEvaluationInput) -> i64 {
    let debt_owed = if input.cc_account_balance < 0 {
        -input.cc_account_balance
    } else {
        0
    };

    let payment_available = input.balance.max(0);
    if payment_available >= debt_owed {
        return 0;
    }

    let total_shortfall = debt_owed - payment_available;

    match input.goal_type.as_deref() {
        Some("TBD") | Some("DEBT") => {
            if let Some(target_ym) = &input.target_month {
                let months_rem =
                    (months_between(&input.current_month, target_ym) + 1).max(1) as i64;
                ((total_shortfall + months_rem - 1) / months_rem).max(0)
            } else {
                total_shortfall
            }
        }
        Some("MF") => {
            let target = input.target_amount;
            if input.budgeted < target {
                (target - input.budgeted).min(total_shortfall).max(0)
            } else {
                0
            }
        }
        _ => total_shortfall,
    }
}

/// Main Goal Evaluation function (evaluates any subcategory in a month)
pub fn evaluate_subcategory_goal(input: &GoalEvaluationInput) -> SubcategoryGoalResult {
    let goal_type = match &input.goal_type {
        Some(t) if !t.is_empty() => t.clone(),
        _ => {
            if input.is_credit_card_payment && input.cc_account_balance < 0 {
                let underfunded = calculate_ccpc_underfunded(input);
                let debt = -input.cc_account_balance;
                let percentage = calc_percentage_int(input.balance.max(0), debt);
                return SubcategoryGoalResult {
                    goal_type: Some("CCPC".to_string()),
                    goal_target_amount: Some(debt),
                    goal_under_funded: Some(underfunded),
                    goal_overall_funded: Some(input.balance.max(0)),
                    goal_overall_left: Some(underfunded),
                    goal_percentage_complete: Some(percentage),
                    is_snoozed: input.is_snoozed,
                };
            }
            return SubcategoryGoalResult::default();
        }
    };

    if input.is_snoozed {
        return SubcategoryGoalResult {
            goal_type: Some(goal_type),
            goal_target_amount: Some(input.target_amount),
            goal_under_funded: Some(0),
            goal_overall_funded: Some(input.budgeted),
            goal_overall_left: Some(0),
            goal_percentage_complete: Some(100),
            is_snoozed: true,
        };
    }

    if input.is_credit_card_payment {
        let underfunded = calculate_ccpc_underfunded(input);
        let debt_owed = if input.cc_account_balance < 0 {
            -input.cc_account_balance
        } else {
            0
        };
        let percentage = calc_percentage_int(input.balance.max(0), debt_owed);
        return SubcategoryGoalResult {
            goal_type: Some(goal_type),
            goal_target_amount: Some(input.target_amount.max(debt_owed)),
            goal_under_funded: Some(underfunded),
            goal_overall_funded: Some(input.balance.max(0)),
            goal_overall_left: Some(underfunded),
            goal_percentage_complete: Some(percentage),
            is_snoozed: false,
        };
    }

    let (cur_y, cur_m) = parse_ym(&input.current_month).unwrap_or((2026, 1));
    let mut effective_target = input.target_amount;

    // Handle weekly cadence for NEED
    if input.cadence == Some(2) {
        effective_target =
            calculate_weekly_goal_target(cur_y, cur_m, input.target_amount, input.day_of_week);
    }

    // Resolve repeating goal period if cadence_frequency > 1 or yearly (cadence == 13)
    let resolved_target_month =
        if input.cadence == Some(13) || input.cadence_frequency.unwrap_or(1) > 1 {
            let freq = if input.cadence == Some(13) {
                12
            } else {
                input.cadence_frequency.unwrap_or(1)
            };
            let creation = input
                .goal_creation_month
                .as_deref()
                .unwrap_or(&input.current_month);
            let period = calculate_current_goal_period(
                creation,
                input.target_month.as_deref(),
                freq,
                &input.current_month,
            );
            period.end_month.or_else(|| input.target_month.clone())
        } else {
            input.target_month.clone()
        };

    match goal_type.as_str() {
        "MF" => {
            let underfunded = (effective_target - input.budgeted).max(0);
            let percentage = calc_percentage_int(input.budgeted, effective_target);
            SubcategoryGoalResult {
                goal_type: Some(goal_type),
                goal_target_amount: Some(effective_target),
                goal_under_funded: Some(underfunded),
                goal_overall_funded: Some(input.budgeted),
                goal_overall_left: Some(underfunded),
                goal_percentage_complete: Some(percentage),
                is_snoozed: false,
            }
        }
        "TB" | "TBD" => {
            let underfunded = match &resolved_target_month {
                Some(target_ym) => {
                    let months_rem = months_between(&input.current_month, target_ym);
                    if months_rem <= 0 {
                        (effective_target - input.balance).max(0)
                    } else {
                        let remaining_needed = (effective_target - input.balance).max(0);
                        let months_total = (months_rem + 1) as i64;
                        let monthly_share = (remaining_needed + months_total - 1) / months_total;
                        (monthly_share - input.budgeted).max(0)
                    }
                }
                None => (effective_target - input.balance).max(0),
            };

            let percentage = calc_percentage_int(input.balance, effective_target);
            SubcategoryGoalResult {
                goal_type: Some(goal_type),
                goal_target_amount: Some(effective_target),
                goal_under_funded: Some(underfunded),
                goal_overall_funded: Some(input.balance),
                goal_overall_left: Some((effective_target - input.balance).max(0)),
                goal_percentage_complete: Some(percentage),
                is_snoozed: false,
            }
        }
        "NEED" => {
            let underfunded = if input.goal_needs_whole_amount {
                (effective_target - input.budgeted).max(0)
            } else {
                (effective_target - input.balance).max(0)
            };

            let funded_metric = if input.goal_needs_whole_amount {
                input.budgeted
            } else {
                input.balance
            };

            let percentage = calc_percentage_int(funded_metric, effective_target);
            SubcategoryGoalResult {
                goal_type: Some(goal_type),
                goal_target_amount: Some(effective_target),
                goal_under_funded: Some(underfunded),
                goal_overall_funded: Some(funded_metric),
                goal_overall_left: Some(underfunded),
                goal_percentage_complete: Some(percentage),
                is_snoozed: false,
            }
        }
        "DEBT" => {
            let underfunded = match &resolved_target_month {
                Some(target_ym) => {
                    let months_rem = months_between(&input.current_month, target_ym);
                    if months_rem <= 0 {
                        (effective_target - input.budgeted).max(0)
                    } else {
                        let monthly_share =
                            (effective_target + months_rem as i64) / (months_rem as i64 + 1);
                        (monthly_share - input.budgeted).max(0)
                    }
                }
                None => (effective_target - input.budgeted).max(0),
            };

            let percentage = calc_percentage_int(input.budgeted, effective_target);
            SubcategoryGoalResult {
                goal_type: Some(goal_type),
                goal_target_amount: Some(effective_target),
                goal_under_funded: Some(underfunded),
                goal_overall_funded: Some(input.budgeted),
                goal_overall_left: Some(underfunded),
                goal_percentage_complete: Some(percentage),
                is_snoozed: false,
            }
        }
        _ => SubcategoryGoalResult::default(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_day_of_week_and_weekly_goal() {
        assert_eq!(day_of_week(2026, 11, 1), 0);
        assert_eq!(day_of_week(2026, 11, 6), 5);
        let fridays_nov = count_days_of_week_in_month(2026, 11, 5);
        assert_eq!(fridays_nov, 4);

        let target = calculate_weekly_goal_target(2026, 11, 50000, Some(5));
        assert_eq!(target, 200000);

        let fridays_oct = count_days_of_week_in_month(2026, 10, 5);
        assert_eq!(fridays_oct, 5);
        let target_oct = calculate_weekly_goal_target(2026, 10, 50000, Some(5));
        assert_eq!(target_oct, 250000);
    }

    #[test]
    fn test_monthly_funding_goal() {
        let input = GoalEvaluationInput {
            current_month: "2026-11".to_string(),
            is_credit_card_payment: false,
            goal_type: Some("MF".to_string()),
            goal_creation_month: Some("2026-10".to_string()),
            target_amount: 100000,
            target_month: None,
            cadence: Some(1),
            cadence_frequency: Some(1),
            day_of_week: None,
            goal_needs_whole_amount: true,
            is_snoozed: false,
            budgeted: 40000,
            balance: 60000,
            activity: -20000,
            positive_cash_outflows: 0,
            cc_account_balance: 0,
            cc_starting_debt_balance: 0,
            cc_additional_to_be_budgeted: 0,
            cc_budgeted_previous_month: 0,
            cc_payment_previous_month: 0,
        };

        let res = evaluate_subcategory_goal(&input);
        assert_eq!(res.goal_under_funded, Some(60000));
        assert_eq!(res.goal_percentage_complete, Some(40));
    }

    #[test]
    fn test_ccpc_underfunded() {
        let input = GoalEvaluationInput {
            current_month: "2026-11".to_string(),
            is_credit_card_payment: true,
            goal_type: None,
            goal_creation_month: None,
            target_amount: 0,
            target_month: None,
            cadence: None,
            cadence_frequency: None,
            day_of_week: None,
            goal_needs_whole_amount: false,
            is_snoozed: false,
            budgeted: 10000,
            balance: 30000,
            activity: -10000,
            positive_cash_outflows: 0,
            cc_account_balance: -80000,
            cc_starting_debt_balance: 0,
            cc_additional_to_be_budgeted: 0,
            cc_budgeted_previous_month: 0,
            cc_payment_previous_month: 0,
        };

        let res = evaluate_subcategory_goal(&input);
        assert_eq!(res.goal_under_funded, Some(50000));
        assert_eq!(res.goal_target_amount, Some(80000));
        assert_eq!(res.goal_percentage_complete, Some(38)); // (30000*100 + 40000)/80000 = 38
    }
}
