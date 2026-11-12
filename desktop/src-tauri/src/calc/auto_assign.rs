// auto_assign.rs - YNAB Quick Budget / Auto-Assign Engine
// Reverse-engineered from YNAB v26.160.1:
// - `wrapper.renamed.js` lines 148360-148739 (QuickBudget / Auto-Assign classes `YK`, `KK`, `GK`)
// - 6-level priority sort for Underfunded assignments:
//   1. !is_overspent (negative balance first)
//   2. is_credit_card_payment_category (regular categories before CCPC)
//   3. !first_needed_by_date.equals_by_month(current_month)
//   4. first_needed_by_date < context_date
//   5. first_needed_by_date ascending
//   6. master.sortable_index, sub.sortable_index

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum QuickBudgetType {
    Underfunded,
    BudgetedLastMonth,
    SpentLastMonth,
    PaidLastMonth,
    AverageBudgeted,
    AverageSpent,
    AveragePaid,
    GoalTarget,
    RemoveSurplus,
    SetAvailableAmountToZero,
    ResetBudgetedAmounts,
}

#[derive(Debug, Clone)]
pub struct SubcategoryAutoAssignCandidate {
    pub subcategory_id: String,
    pub master_category_id: String,
    pub master_sort_index: i32,
    pub sub_sort_index: i32,

    pub is_credit_card_payment: bool,
    pub is_overspent: bool, // balance < 0
    pub balance: i64,
    pub budgeted: i64,
    pub activity: i64,

    // Goal / Target metrics
    pub underfunded_amount: i64,
    pub goal_target_amount: i64,
    pub target_date: Option<String>, // "YYYY-MM-DD" or "YYYY-MM"
    pub is_snoozed: bool,

    // Historical metrics
    pub budgeted_last_month: i64,
    pub spent_last_month: i64,
    pub paid_last_month: i64,
    pub average_budgeted: i64,
    pub average_spent: i64,
    pub average_paid: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AutoAssignPlanItem {
    pub subcategory_id: String,
    pub previous_budgeted: i64,
    pub new_budgeted: i64,
    pub delta: i64,
}

/// Calculate the quick budget value for a single subcategory (wrapper.renamed.js lines 148360-148500: `GK`)
pub fn calculate_quick_budget_value(
    candidate: &SubcategoryAutoAssignCandidate,
    budget_type: QuickBudgetType,
) -> i64 {
    match budget_type {
        QuickBudgetType::Underfunded => {
            if candidate.is_snoozed {
                return candidate.budgeted;
            }
            // If overspent (balance < 0), we must cover the overspending first
            if candidate.balance < 0 {
                candidate.budgeted + (-candidate.balance)
            } else if candidate.underfunded_amount > 0 {
                candidate.budgeted + candidate.underfunded_amount
            } else {
                candidate.budgeted
            }
        }
        QuickBudgetType::BudgetedLastMonth => candidate.budgeted_last_month.max(0),
        QuickBudgetType::SpentLastMonth => (-candidate.spent_last_month).max(0),
        QuickBudgetType::PaidLastMonth => (-candidate.paid_last_month).max(0),
        QuickBudgetType::AverageBudgeted => candidate.average_budgeted.max(0),
        QuickBudgetType::AverageSpent => (-candidate.average_spent).max(0),
        QuickBudgetType::AveragePaid => (-candidate.average_paid).max(0),
        QuickBudgetType::GoalTarget => {
            if candidate.goal_target_amount > 0 {
                candidate.goal_target_amount
            } else {
                candidate.budgeted
            }
        }
        QuickBudgetType::RemoveSurplus => {
            // Remove surplus moves excess available above target back to RTA
            if candidate.goal_target_amount > 0 && candidate.balance > candidate.goal_target_amount {
                let surplus = candidate.balance - candidate.goal_target_amount;
                (candidate.budgeted - surplus).max(0)
            } else {
                candidate.budgeted
            }
        }
        QuickBudgetType::SetAvailableAmountToZero => {
            // Adjust budgeted so that balance becomes 0
            (candidate.budgeted - candidate.balance).max(0)
        }
        QuickBudgetType::ResetBudgetedAmounts => 0,
    }
}

/// Compute smart underfunded auto-assign plan with strict 6-level priority sort (wrapper.renamed.js `KK`)
pub fn compute_underfunded_auto_assign_plan(
    mut candidates: Vec<SubcategoryAutoAssignCandidate>,
    mut available_rta: i64,
    current_date: &str, // e.g. "2026-11-12"
) -> Vec<AutoAssignPlanItem> {
    // 6-level priority sort (wrapper.renamed.js lines 148500-148620)
    candidates.sort_by(|a, b| {
        // 1. Negative balance first (!is_overspent)
        if a.is_overspent != b.is_overspent {
            return b.is_overspent.cmp(&a.is_overspent); // true (overspent) comes first
        }

        // 2. Regular categories before CCPC (is_credit_card_payment_category)
        if a.is_credit_card_payment != b.is_credit_card_payment {
            return a.is_credit_card_payment.cmp(&b.is_credit_card_payment); // false (regular) comes first
        }

        // 3 & 4 & 5. Target date sorting
        let date_a = a.target_date.as_deref().unwrap_or("9999-99-99");
        let date_b = b.target_date.as_deref().unwrap_or("9999-99-99");
        if date_a != date_b {
            let a_past = date_a < current_date;
            let b_past = date_b < current_date;
            if a_past != b_past {
                return b_past.cmp(&a_past); // Past target dates first
            }
            return date_a.cmp(date_b); // Ascending target date
        }

        // 6. Hierarchy index sort (master_sort_index, sub_sort_index)
        if a.master_sort_index != b.master_sort_index {
            a.master_sort_index.cmp(&b.master_sort_index)
        } else {
            a.sub_sort_index.cmp(&b.sub_sort_index)
        }
    });

    let mut plan = Vec::new();

    for candidate in candidates {
        if candidate.is_snoozed {
            continue;
        }

        let needed_delta = if candidate.is_overspent {
            -candidate.balance
        } else {
            candidate.underfunded_amount
        };

        if needed_delta <= 0 {
            continue;
        }

        // Determine how much we can fund given available_rta
        let fund_amount = if available_rta > 0 {
            let alloc = needed_delta.min(available_rta);
            available_rta -= alloc;
            alloc
        } else {
            // When RTA is 0 or negative, we cannot assign further positive amounts
            0
        };

        if fund_amount > 0 {
            let new_budgeted = candidate.budgeted + fund_amount;
            plan.push(AutoAssignPlanItem {
                subcategory_id: candidate.subcategory_id,
                previous_budgeted: candidate.budgeted,
                new_budgeted,
                delta: fund_amount,
            });
        }
    }

    plan
}

/// Compute batch plan for standard Quick Budget types (e.g. Budgeted Last Month, Spent Last Month, etc.)
pub fn compute_batch_quick_budget_plan(
    candidates: &[SubcategoryAutoAssignCandidate],
    budget_type: QuickBudgetType,
) -> Vec<AutoAssignPlanItem> {
    let mut plan = Vec::new();
    for candidate in candidates {
        let target_val = calculate_quick_budget_value(candidate, budget_type);
        if target_val != candidate.budgeted {
            plan.push(AutoAssignPlanItem {
                subcategory_id: candidate.subcategory_id.clone(),
                previous_budgeted: candidate.budgeted,
                new_budgeted: target_val,
                delta: target_val - candidate.budgeted,
            });
        }
    }
    plan
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_underfunded_priority_sorting() {
        let candidates = vec![
            SubcategoryAutoAssignCandidate {
                subcategory_id: "cc_1".to_string(),
                master_category_id: "m_cc".to_string(),
                master_sort_index: 0,
                sub_sort_index: 0,
                is_credit_card_payment: true,
                is_overspent: false,
                balance: 10000,
                budgeted: 0,
                activity: 0,
                underfunded_amount: 50000,
                goal_target_amount: 60000,
                target_date: None,
                is_snoozed: false,
                budgeted_last_month: 0,
                spent_last_month: 0,
                paid_last_month: 0,
                average_budgeted: 0,
                average_spent: 0,
                average_paid: 0,
            },
            SubcategoryAutoAssignCandidate {
                subcategory_id: "reg_overspent".to_string(),
                master_category_id: "m_reg".to_string(),
                master_sort_index: 10,
                sub_sort_index: 5,
                is_credit_card_payment: false,
                is_overspent: true,
                balance: -30000, // -$30 overspent
                budgeted: 20000,
                activity: -50000,
                underfunded_amount: 30000,
                goal_target_amount: 0,
                target_date: None,
                is_snoozed: false,
                budgeted_last_month: 0,
                spent_last_month: 0,
                paid_last_month: 0,
                average_budgeted: 0,
                average_spent: 0,
                average_paid: 0,
            },
            SubcategoryAutoAssignCandidate {
                subcategory_id: "reg_goal_early".to_string(),
                master_category_id: "m_reg".to_string(),
                master_sort_index: 10,
                sub_sort_index: 1,
                is_credit_card_payment: false,
                is_overspent: false,
                balance: 0,
                budgeted: 0,
                activity: 0,
                underfunded_amount: 40000,
                goal_target_amount: 40000,
                target_date: Some("2026-11-05".to_string()),
                is_snoozed: false,
                budgeted_last_month: 0,
                spent_last_month: 0,
                paid_last_month: 0,
                average_budgeted: 0,
                average_spent: 0,
                average_paid: 0,
            },
        ];

        // Total needed = 30000 (overspent) + 40000 (goal) + 50000 (cc) = 120000
        // Available RTA = 50000.
        // It should fund 30000 to reg_overspent, then remaining 20000 to reg_goal_early, and 0 to cc_1!
        let plan = compute_underfunded_auto_assign_plan(candidates, 50000, "2026-11-12");

        assert_eq!(plan.len(), 2);
        assert_eq!(plan[0].subcategory_id, "reg_overspent");
        assert_eq!(plan[0].delta, 30000);
        assert_eq!(plan[1].subcategory_id, "reg_goal_early");
        assert_eq!(plan[1].delta, 20000);
    }
}
