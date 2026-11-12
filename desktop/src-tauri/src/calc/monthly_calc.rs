//! Monthly Calculations & Ready to Assign (RTA) Engine matching YNAB v26.160.1 `MonthlyCalculations`
//! (`wrapper.beautified.js:47701–47774` & Kotlin `slik-domain` lines `140992–141021`).
//!
//! Enforces:
//! 1. Forward recurrence for `available_to_budget` (ATB).
//! 2. Stealing From the Future (`funded_in_future` and `left_to_budget`).
//! 3. Preservation of negative RTA without double deduction.

#![allow(dead_code)]

use std::collections::BTreeMap;

#[derive(Debug, Clone, Default)]
pub struct MonthSummaryInput {
    pub month: String, // "YYYY-MM-01"
    pub immediate_income: i64,
    pub additional_to_be_budgeted: i64, // positive CC balance inflows / overpayment
    pub total_budgeted: i64,
    pub total_cash_overspent: i64, // negative sum of cash overspending (<= 0)
}

#[derive(Debug, Clone, Default)]
pub struct MonthSummaryResult {
    pub month: String,
    pub available_to_budget: i64,
    pub funded_in_future: i64,
    pub left_to_budget: i64, // Displayed Ready to Assign
    pub immediate_income: i64,
    pub additional_to_be_budgeted: i64,
    pub total_budgeted: i64,
    pub total_cash_overspent: i64,
}

/// Calculate the timeline of monthly budgets across months M_0 .. M_N.
/// Inputs must be ordered by month string ascending ("YYYY-MM-01").
pub fn calculate_monthly_timeline(
    months: &BTreeMap<String, MonthSummaryInput>,
) -> BTreeMap<String, MonthSummaryResult> {
    let mut results: BTreeMap<String, MonthSummaryResult> = BTreeMap::new();
    let mut prev_atb: i64 = 0;
    let mut prev_overspent: i64 = 0;

    // Pass 1: Forward calculation of available_to_budget (ATB)
    for (m_str, input) in months {
        // Exact YNAB L47728-47732 formula:
        // atb = prev_atb + prev_overspent + immediate_income + additional_to_be_budgeted - budgeted
        let atb = prev_atb
            + prev_overspent
            + input.immediate_income
            + input.additional_to_be_budgeted
            - input.total_budgeted;

        results.insert(
            m_str.clone(),
            MonthSummaryResult {
                month: m_str.clone(),
                available_to_budget: atb,
                funded_in_future: 0,
                left_to_budget: atb,
                immediate_income: input.immediate_income,
                additional_to_be_budgeted: input.additional_to_be_budgeted,
                total_budgeted: input.total_budgeted,
                total_cash_overspent: input.total_cash_overspent,
            },
        );

        prev_atb = atb;
        prev_overspent = input.total_cash_overspent; // negative <= 0
    }

    // Pass 2: Calculate funded_in_future & left_to_budget (Stealing From the Future)
    let month_keys: Vec<String> = results.keys().cloned().collect();
    for (idx, m_str) in month_keys.iter().enumerate() {
        let current_atb = results.get(m_str).map(|r| r.available_to_budget).unwrap_or(0);

        // Sum of budgeted amounts in all future months > m_str
        let mut future_budgeted_sum: i64 = 0;
        for future_key in &month_keys[(idx + 1)..] {
            if let Some(future_input) = months.get(future_key) {
                future_budgeted_sum += future_input.total_budgeted;
            }
        }

        // Exact YNAB L47765-47773 formulas:
        // calculateFundedInFuture(atb, futureBudgeted) {
        //     return atb <= 0 || futureBudgeted <= 0 ? 0 : Math.min(atb, futureBudgeted);
        // }
        // calculateLeftToBudget(atb, fundedInFuture) {
        //     return atb - fundedInFuture;
        // }
        let funded_in_future = if current_atb <= 0 || future_budgeted_sum <= 0 {
            0
        } else {
            current_atb.min(future_budgeted_sum)
        };

        let left_to_budget = current_atb - funded_in_future;

        if let Some(res) = results.get_mut(m_str) {
            res.funded_in_future = funded_in_future;
            res.left_to_budget = left_to_budget;
        }
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stealing_from_the_future() {
        let mut months = BTreeMap::new();
        // Month 1: $1,000 income, $500 budgeted -> ATB = $500
        months.insert(
            "2026-10-01".into(),
            MonthSummaryInput {
                month: "2026-10-01".into(),
                immediate_income: 1000000,
                additional_to_be_budgeted: 0,
                total_budgeted: 500000,
                total_cash_overspent: 0,
            },
        );

        // Month 2: $0 income, $300 budgeted in future
        months.insert(
            "2026-11-01".into(),
            MonthSummaryInput {
                month: "2026-11-01".into(),
                immediate_income: 0,
                additional_to_be_budgeted: 0,
                total_budgeted: 300000,
                total_cash_overspent: 0,
            },
        );

        let timeline = calculate_monthly_timeline(&months);

        let m1 = timeline.get("2026-10-01").unwrap();
        assert_eq!(m1.available_to_budget, 500000);
        assert_eq!(m1.funded_in_future, 300000); // $300 stolen by Nov!
        assert_eq!(m1.left_to_budget, 200000); // Oct RTA displays $200

        let m2 = timeline.get("2026-11-01").unwrap();
        assert_eq!(m2.available_to_budget, 200000);
        assert_eq!(m2.funded_in_future, 0);
        assert_eq!(m2.left_to_budget, 200000);
    }

    #[test]
    fn test_cash_overspent_deduction_in_next_month() {
        let mut months = BTreeMap::new();
        // Month 1: $1,000 income, $1,000 budgeted, -$150 cash overspending
        months.insert(
            "2026-10-01".into(),
            MonthSummaryInput {
                month: "2026-10-01".into(),
                immediate_income: 1000000,
                additional_to_be_budgeted: 0,
                total_budgeted: 1000000,
                total_cash_overspent: -150000,
            },
        );

        // Month 2: $500 income, $0 budgeted
        months.insert(
            "2026-11-01".into(),
            MonthSummaryInput {
                month: "2026-11-01".into(),
                immediate_income: 500000,
                additional_to_be_budgeted: 0,
                total_budgeted: 0,
                total_cash_overspent: 0,
            },
        );

        let timeline = calculate_monthly_timeline(&months);

        let m1 = timeline.get("2026-10-01").unwrap();
        assert_eq!(m1.available_to_budget, 0);
        assert_eq!(m1.left_to_budget, 0);

        let m2 = timeline.get("2026-11-01").unwrap();
        // ATB = 0 (prev atb) - 150 (prev overspent) + 500 (income) = 350
        assert_eq!(m2.available_to_budget, 350000);
        assert_eq!(m2.left_to_budget, 350000);
    }
}
