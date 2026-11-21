//! YNAB Goal / Target Calculation Engine (100% integer math — zero floating point)
//! Exact 1-to-1 implementation of YNAB v26.160.1 `SubcategoryCalculations`:
//! - `wrapper-DkFKwf1z.js` lines 32533–32868 (`calculateGoals`, `calculateCurrentGoalPeriod`,
//!   `goalEffectiveTargetAmount`, `goalEffectiveTargetAmountForWeeklyNeed`, `monthsInGoalCadence`,
//!   `normalizeGoalPercentageComplete`)
//! - `wrapper.renamed.js` lines 22008–22138 (`CreditCategoryDetailsData` / CCPC Underfunded)

#![deny(clippy::float_arithmetic)]

use chrono::{Datelike, Duration, NaiveDate};
use serde::{Deserialize, Serialize};

/// Target / Goal calculation result for a subcategory in a specific month
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct SubcategoryGoalResult {
    pub goal_type: Option<String>,
    /// Effective goal target amount `y = goalEffectiveTargetAmount(...)`
    pub goal_target_amount: Option<i64>,
    /// Monthly goal target share `e.goalTarget` (`0` for `TB`, `ceil(b/m)` rounded to 10 milliunits for `TBD`/`NEED`, `y` for `MF`/`DEBT`)
    pub goal_target: Option<i64>,
    pub goal_under_funded: Option<i64>,
    pub goal_overall_funded: Option<i64>,
    pub goal_overall_outflows: Option<i64>,
    pub goal_overall_left: Option<i64>,
    pub goal_expected_completion: Option<i32>,
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
#[derive(Debug, Clone, Default)]
pub struct GoalEvaluationInput {
    pub current_month: String, // "YYYY-MM" or "YYYY-MM-DD"
    pub is_credit_card_payment: bool,
    pub goal_type: Option<String>, // "MF", "TB", "TBD", "NEED", "DEBT"
    pub goal_creation_month: Option<String>,
    pub target_amount: i64,
    pub target_month: Option<String>,   // For TB/TBD/NEED/DEBT
    pub cadence: Option<i32>, // 0=None, 1=Monthly, 2=Weekly, 3..=12=EveryNMonths, 13=Yearly, 14=Every2Years
    pub cadence_frequency: Option<i32>, // every N months/weeks
    pub day_of_week: Option<i32>, // 0=Sun..6=Sat for Weekly, or 1..28 day of month for Monthly
    pub goal_needs_whole_amount: bool, // true = Set Aside; false = Refill Up To
    pub is_snoozed: bool,

    // Month metrics
    pub budgeted: i64,
    pub balance: i64,
    pub activity: i64,
    pub positive_cash_outflows: i64,

    // Optional prior-month calculation row metrics (for multi-month goal period rollups)
    pub prev_month_balance: Option<i64>,
    pub prev_goal_overall_funded: Option<i64>,
    pub prev_goal_overall_outflows: Option<i64>,

    // Credit Card specific metrics (only if is_credit_card_payment == true)
    pub cc_account_balance: i64, // Current balance of credit card account (usually <= 0)
    pub cc_starting_debt_balance: i64,
    pub cc_additional_to_be_budgeted: i64,
    pub cc_budgeted_previous_month: i64,
    pub cc_payment_previous_month: i64,
}

/// Integer percentage helper matching Ember `SubcategoryCalculations.normalizeGoalPercentageComplete`:
/// `Math.floor(100 * (numerator / denominator))` clamped to `[0, 100]`, with `NaN` / `+Infinity` -> `100`.
#[inline]
pub fn calc_percentage_int(numerator: i64, denominator: i64) -> i32 {
    if denominator == 0 {
        if numerator < 0 {
            return 0;
        }
        return 100;
    }
    if denominator < 0 {
        return 100;
    }
    let pct = (numerator * 100).div_euclid(denominator);
    pct.clamp(0, 100) as i32
}

/// Round milliunits up (`Math.ceil`) to currency minimum unit (10 milliunits for 2-decimal currencies like USD).
#[inline]
pub fn round_milli_dollars_ceil_2dec(amount: i64) -> i64 {
    if amount <= 0 {
        0
    } else {
        ((amount + 9) / 10) * 10
    }
}

/// Parse "YYYY-MM" or "YYYY-MM-DD" to (year, month 1..12)
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

/// Parse "YYYY-MM" or "YYYY-MM-DD" into `NaiveDate` (defaulting day to 1)
pub fn parse_iso_date_or_ym(s: &str) -> Option<NaiveDate> {
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() < 2 {
        return None;
    }
    let y = parts[0].parse::<i32>().ok()?;
    let m = parts[1].parse::<u32>().ok()?;
    let d = if parts.len() >= 3 {
        parts[2]
            .chars()
            .take_while(|c| c.is_ascii_digit())
            .collect::<String>()
            .parse::<u32>()
            .unwrap_or(1)
    } else {
        1
    };
    let max_d = days_in_month(y, m);
    NaiveDate::from_ymd_opt(y, m, d.clamp(1, max_d))
}

/// Format (year, month 1..12) to "YYYY-MM"
pub fn format_ym(y: i32, m: u32) -> String {
    format!("{:04}-{:02}", y, m)
}

pub fn format_date_ym(d: NaiveDate) -> String {
    format_ym(d.year(), d.month())
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

pub fn start_of_month(d: NaiveDate) -> NaiveDate {
    NaiveDate::from_ymd_opt(d.year(), d.month(), 1).unwrap_or(d)
}

pub fn end_of_month(d: NaiveDate) -> NaiveDate {
    let last = days_in_month(d.year(), d.month());
    NaiveDate::from_ymd_opt(d.year(), d.month(), last).unwrap_or(d)
}

pub fn same_month(a: NaiveDate, b: NaiveDate) -> bool {
    a.year() == b.year() && a.month() == b.month()
}

/// Add `delta_months` (positive or negative) clamping day to target month's end (matching Moment `add(n, "months")`)
pub fn add_months_date(d: NaiveDate, delta_months: i32) -> NaiveDate {
    let total = d.year() * 12 + (d.month() as i32 - 1) + delta_months;
    let y = total.div_euclid(12);
    let m = (total.rem_euclid(12) + 1) as u32;
    let day = d.day().min(days_in_month(y, m));
    NaiveDate::from_ymd_opt(y, m, day).unwrap_or(d)
}

/// Pure-integer equivalent of `DateWithoutTime.prototype.monthsApart` (`Math.abs(moment.diff(other, "months"))`)
pub fn months_apart_date(a: NaiveDate, b: NaiveDate) -> i32 {
    let (e, t) = if a.day() >= b.day() { (a, b) } else { (b, a) };
    let n = (t.year() - e.year()) * 12 + (t.month() as i32 - e.month() as i32);
    if e.day() > t.day() && n > 0 {
        n - 1
    } else {
        n.abs()
    }
}

/// Pure-integer equivalent of `DateWithoutTime.prototype.weeksApart` (`Math.abs(moment.diff(other, "weeks"))`)
pub fn weeks_apart_date(a: NaiveDate, b: NaiveDate) -> i64 {
    (a - b).num_days().abs() / 7
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

pub fn day_of_week_date(d: NaiveDate) -> i32 {
    d.weekday().num_days_from_sunday() as i32
}

/// Ember `SubcategoryCalculations.nextDayOfWeek(t, e)` (`wrapper-DkFKwf1z.js:32706–32714`)
pub fn next_day_of_week(t: NaiveDate, target_dow: i32) -> NaiveDate {
    let dow = target_dow.rem_euclid(7);
    let n = t + Duration::days(7);
    let shifted = n - Duration::days((dow + 1) as i64);
    let i = day_of_week_date(shifted) + 1;
    n - Duration::days(i as i64)
}

/// Ember `SubcategoryCalculations.daysOfWeekInMonth(t, e)` (`wrapper-DkFKwf1z.js:32699–32705`)
pub fn days_of_week_in_month_from(t: NaiveDate, target_dow: i32) -> i32 {
    let n = next_day_of_week(t, target_dow);
    let i = end_of_month(t);
    if n > i {
        return 0;
    }
    let mut r = next_day_of_week(i, target_dow);
    if r > i {
        r -= Duration::days(7);
    }
    (((r - n).num_days().abs()) / 7 + 1) as i32
}

/// Count how many occurrences of target_dow (0=Sun..6=Sat) exist in a full month
pub fn count_days_of_week_in_month(year: i32, month: u32, target_dow: i32) -> i32 {
    let first = NaiveDate::from_ymd_opt(year, month, 1)
        .unwrap_or_else(|| NaiveDate::from_ymd_opt(2026, 1, 1).unwrap());
    days_of_week_in_month_from(first, target_dow)
}

/// Ember `SubcategoryCalculations.calculateGoalWeeksInMonth(goalCreatedOn, month, goalDay = 6)`
pub fn calculate_goal_weeks_in_month(
    goal_created_on: NaiveDate,
    month: NaiveDate,
    goal_day: Option<i32>,
) -> i32 {
    let dow = goal_day.unwrap_or(6);
    let baseline = if same_month(month, goal_created_on) {
        goal_created_on
    } else {
        month
    };
    days_of_week_in_month_from(baseline, dow)
}

/// Ember `SubcategoryCalculations.goalEffectiveTargetAmountForWeeklyNeed` (`wrapper-DkFKwf1z.js:32723–32748`)
pub fn goal_effective_target_amount_for_weekly_need(
    target_amount: i64,
    goal_day: Option<i32>,
    goal_created_on: NaiveDate,
    cadence_frequency: i32,
    goal_target_date: Option<NaiveDate>,
    month: NaiveDate,
) -> i64 {
    let freq = cadence_frequency.max(1) as i64;
    if let Some(r) = goal_target_date {
        let e = day_of_week_date(r);
        if same_month(month, r) {
            let w = (calculate_goal_weeks_in_month(r, month, Some(e)) - 1).max(0) as i64;
            return target_amount + (target_amount * w) / freq;
        }
        if r > month {
            return target_amount;
        }
        let n = next_day_of_week(month, e);
        let a = weeks_apart_date(r, n) % freq;
        let s = n + Duration::days(7 * a);
        let w = (calculate_goal_weeks_in_month(s, month, Some(e)) - 1).max(0) as i64;
        return target_amount + (target_amount * w) / freq;
    }
    let dow = goal_day.unwrap_or(6);
    target_amount * (calculate_goal_weeks_in_month(goal_created_on, month, Some(dow)) as i64)
}

/// Ember `SubcategoryCalculations.monthsInGoalCadence(cadence, cadenceFrequency)` (`wrapper-DkFKwf1z.js:32819–32868`)
pub fn months_in_goal_cadence(cadence: i32, cadence_frequency: Option<i32>) -> i32 {
    if let Some(e) = cadence_frequency {
        if cadence == 2 {
            1
        } else if cadence == 13 {
            12 * e
        } else {
            e
        }
    } else {
        match cadence {
            3 => 2,
            4 => 3,
            5 => 4,
            6 => 5,
            7 => 6,
            8 => 7,
            9 => 8,
            10 => 9,
            11 => 10,
            12 => 11,
            13 => 12,
            14 => 24,
            1 | 2 => 1,
            _ => 0,
        }
    }
}

/// Exact Ember `SubcategoryCalculations.calculateCurrentGoalPeriod(e, n, i, r, o, a, s)` (`wrapper-DkFKwf1z.js:32776–32818`)
pub fn calculate_ember_goal_period(
    creation_month: Option<&str>,
    target_month: Option<&str>,
    goal_type: &str,
    cadence: i32,
    cadence_frequency: Option<i32>,
    goal_day: Option<i32>,
    current_month: &str,
) -> GoalPeriod {
    let s = parse_iso_date_or_ym(current_month)
        .unwrap_or_else(|| NaiveDate::from_ymd_opt(2026, 1, 1).unwrap());
    let l = start_of_month(s);
    let c = end_of_month(l);
    let e = creation_month
        .and_then(parse_iso_date_or_ym)
        .map(start_of_month)
        .unwrap_or(l);
    let n = target_month.and_then(parse_iso_date_or_ym);
    let u = months_in_goal_cadence(cadence, cadence_frequency);

    let mut d = e;
    let mut h = n.unwrap_or(l);
    let mut is_repeat = false;

    if goal_type == "MF" {
        d = l;
        h = c;
    } else if goal_type == "DEBT" || (cadence == 1 && n.is_none()) {
        d = l;
        h = c;
        if let Some(a) = goal_day {
            if a >= 1 && (a as u32) < h.day() {
                if let Some(custom_h) = NaiveDate::from_ymd_opt(l.year(), l.month(), a as u32) {
                    h = custom_h;
                }
            }
        }
    } else if cadence == 2 && n.is_none() {
        let e_dow = goal_day.unwrap_or(6);
        let n_date = next_day_of_week(s, e_dow);
        let i_date = n_date - Duration::days(6);
        d = if i_date < l { l } else { i_date };
        h = if n_date > c { c } else { n_date };
    } else if cadence != 0 && n.is_some() {
        let n_date = n.unwrap();
        if l > n_date || (cadence == 2 && s > n_date) {
            is_repeat = true;
            if cadence == 2 {
                let o_freq = cadence_frequency.unwrap_or(1).max(1) as i64;
                let e_dow = day_of_week_date(n_date);
                let i_date = next_day_of_week(s, e_dow);
                let r_rem = weeks_apart_date(i_date, n_date) % o_freq;
                let a_rem = o_freq - r_rem;
                h = i_date + Duration::days(7 * r_rem);
                d = i_date - Duration::days(7 * a_rem - 1);
            } else {
                let t_date = start_of_month(n_date);
                let e_diff = months_apart_date(l, t_date);
                if e_diff <= u {
                    d = add_months_date(t_date, 1);
                } else {
                    let t_rem = if u > 0 { (e_diff - 1) % u } else { 0 };
                    d = add_months_date(l, -t_rem);
                }
                let i_date = add_months_date(d, u - 1);
                let r_diff = months_apart_date(t_date, i_date);
                h = add_months_date(n_date, r_diff);
            }
        } else {
            d = e;
            h = n_date;
        }
    }

    let months_in_period = months_apart_date(d, h) + 1;
    let months_rem = if s > h {
        0
    } else {
        months_apart_date(s, h) + 1
    };

    GoalPeriod {
        start_month: format_date_ym(d),
        end_month: Some(format_date_ym(h)),
        total_months: months_in_period,
        months_remaining: months_rem,
        is_repeat,
    }
}

/// Calculate current goal period (4-argument helper preserved for compatibility; delegates to `calculate_ember_goal_period`)
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
    calculate_ember_goal_period(
        Some(creation_month),
        target_month,
        "NEED",
        1,
        Some(freq),
        None,
        current_month,
    )
}

/// Calculate effective target amount for weekly NEED goals (cadence == 2).
/// Note: Ember defaults `day_of_week == None` to `6` (Saturday).
pub fn calculate_weekly_goal_target(
    year: i32,
    month: u32,
    weekly_target: i64,
    day_of_week: Option<i32>,
) -> i64 {
    let dow = day_of_week.unwrap_or(6); // Ember default: Saturday (6)
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

/// Main Goal Evaluation function matching Ember `SubcategoryCalculations.calculateGoals` (`wrapper-DkFKwf1z.js:32533–32669`)
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
                    goal_target: Some(underfunded),
                    goal_under_funded: Some(underfunded),
                    goal_overall_funded: Some(input.balance.max(0)),
                    goal_overall_outflows: Some(input.activity),
                    goal_overall_left: Some(underfunded),
                    goal_expected_completion: Some(0),
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
            goal_target: Some(input.target_amount),
            goal_under_funded: Some(0),
            goal_overall_funded: Some(input.budgeted),
            goal_overall_outflows: Some(input.activity),
            goal_overall_left: Some(0),
            goal_expected_completion: Some(0),
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
        let eff_target = input.target_amount.max(debt_owed);
        return SubcategoryGoalResult {
            goal_type: Some(goal_type),
            goal_target_amount: Some(eff_target),
            goal_target: Some(eff_target),
            goal_under_funded: Some(underfunded),
            goal_overall_funded: Some(input.balance.max(0)),
            goal_overall_outflows: Some(input.activity),
            goal_overall_left: Some(underfunded),
            goal_expected_completion: Some(0),
            goal_percentage_complete: Some(percentage),
            is_snoozed: false,
        };
    }

    let r = parse_iso_date_or_ym(&input.current_month)
        .unwrap_or_else(|| NaiveDate::from_ymd_opt(2026, 1, 1).unwrap());
    let created_date = input
        .goal_creation_month
        .as_deref()
        .and_then(parse_iso_date_or_ym)
        .unwrap_or(r);
    let target_date = input.target_month.as_deref().and_then(parse_iso_date_or_ym);

    // Line 32541: if (!created || r.isBeforeMonth(created)) -> all zeros
    if r < start_of_month(created_date) {
        return SubcategoryGoalResult {
            goal_type: Some(goal_type),
            goal_target_amount: Some(0),
            goal_target: Some(0),
            goal_under_funded: Some(0),
            goal_overall_funded: Some(0),
            goal_overall_outflows: Some(0),
            goal_overall_left: Some(0),
            goal_expected_completion: Some(0),
            goal_percentage_complete: Some(0),
            is_snoozed: false,
        };
    }

    let cadence = input.cadence.unwrap_or(0);
    let period = calculate_ember_goal_period(
        Some(&format_date_ym(created_date)),
        input.target_month.as_deref(),
        &goal_type,
        cadence,
        input.cadence_frequency,
        input.day_of_week,
        &input.current_month,
    );
    let f = parse_iso_date_or_ym(&period.start_month).unwrap_or(r);
    let m = period.months_remaining;

    // Line 32567: y = goalEffectiveTargetAmount(...)
    let y = if goal_type == "NEED" && cadence == 2 {
        goal_effective_target_amount_for_weekly_need(
            input.target_amount,
            input.day_of_week,
            created_date,
            input.cadence_frequency.unwrap_or(1),
            target_date,
            r,
        )
    } else {
        input.target_amount
    };

    // Lines 32582–32604: goalOverallFunded & goalOverallOutflows
    let (mut goal_overall_funded, goal_overall_outflows) =
        if goal_type == "MF" || goal_type == "DEBT" {
            (input.budgeted, input.activity)
        } else if same_month(r, f) || r > f {
            let mut funded = input.budgeted;
            let mut outflows = input.activity;
            if let Some(prev_bal) = input.prev_month_balance {
                let prev_month_date = add_months_date(r, -1);
                if same_month(prev_month_date, f) || prev_month_date > f {
                    outflows += input.prev_goal_overall_outflows.unwrap_or(0);
                }
                if same_month(r, f) {
                    if !(goal_type == "NEED" && input.goal_needs_whole_amount) {
                        funded += prev_bal.max(0);
                    }
                } else {
                    funded += input.prev_goal_overall_funded.unwrap_or(0);
                }
            }
            (funded, outflows)
        } else {
            (0, 0)
        };

    // Lines 32605–32609: goalOverallLeft
    let goal_overall_left = if goal_type == "MF" || goal_type == "DEBT" {
        (y - input.budgeted).max(0)
    } else if goal_type == "NEED" {
        (y - goal_overall_funded).max(0)
    } else {
        (y - input.balance).max(0)
    };

    // Lines 32610–32618: goalExpectedCompletion
    let goal_expected_completion = if goal_type == "TB" {
        if goal_overall_left > 0 && input.budgeted > 0 {
            ((goal_overall_left + input.budgeted - 1) / input.budgeted) as i32
        } else {
            0
        }
    } else {
        m
    };

    // Lines 32619–32634: b and goalTarget
    let mut b = y - input.balance + input.budgeted;
    if goal_type == "NEED" {
        b = y - (goal_overall_funded - input.budgeted);
    }

    let goal_target = if goal_type == "MF" || goal_type == "DEBT" {
        y
    } else if goal_type == "TBD" || goal_type == "NEED" {
        if m > 0 {
            let m_i64 = m as i64;
            let raw_ceil = if b <= 0 { 0 } else { (b + m_i64 - 1) / m_i64 };
            round_milli_dollars_ceil_2dec(raw_ceil)
        } else {
            0
        }
    } else {
        0
    };

    // Lines 32635–32647: goalUnderFunded
    let goal_under_funded = if goal_type == "MF" || goal_type == "DEBT" {
        goal_overall_left
    } else if goal_type == "TBD" || goal_type == "NEED" {
        if m <= 0 {
            0
        } else if goal_type == "TBD" && input.budgeted < 0 && b < 0 {
            (y - input.balance).max(0)
        } else if goal_type == "NEED" && input.budgeted < 0 && b < 0 {
            (y - goal_overall_funded).max(0)
        } else {
            (goal_target - input.budgeted).max(0)
        }
    } else {
        0
    };

    // Lines 32648–32668: goalPercentageComplete
    let goal_percentage_complete =
        if goal_type == "MF" || goal_type == "DEBT" || goal_type == "NEED" {
            calc_percentage_int(goal_overall_funded, y)
        } else if goal_type == "TB" || goal_type == "TBD" {
            calc_percentage_int(input.balance, y)
        } else {
            goal_overall_funded = 0;
            0
        };

    SubcategoryGoalResult {
        goal_type: Some(goal_type),
        goal_target_amount: Some(y),
        goal_target: Some(goal_target),
        goal_under_funded: Some(goal_under_funded),
        goal_overall_funded: Some(goal_overall_funded),
        goal_overall_outflows: Some(goal_overall_outflows),
        goal_overall_left: Some(goal_overall_left),
        goal_expected_completion: Some(goal_expected_completion),
        goal_percentage_complete: Some(goal_percentage_complete),
        is_snoozed: false,
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
            ..Default::default()
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
            ..Default::default()
        };

        let res = evaluate_subcategory_goal(&input);
        assert_eq!(res.goal_under_funded, Some(50000));
        assert_eq!(res.goal_target_amount, Some(80000));
        assert_eq!(res.goal_percentage_complete, Some(37)); // floor(30000 * 100 / 80000) = 37
    }
}
