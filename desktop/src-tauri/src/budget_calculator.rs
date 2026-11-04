use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryMeta {
    pub category_id: Uuid,
    pub group_id: Uuid,
    pub name: String,
    pub inflow_category: bool,
    pub credit_card_payment: bool,
    pub credit_card_account_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryBalance {
    pub category_id: Uuid,
    pub assigned_milliunits: i64,
    pub activity_milliunits: i64,
    pub available_milliunits: i64,
    pub cash_overspent_milliunits: i64,
    pub credit_overspent_milliunits: i64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PriorMonthSummary {
    pub ready_to_assign_milliunits: i64,
    pub category_available_milliunits: HashMap<Uuid, i64>,
    pub category_cash_overspent_milliunits: HashMap<Uuid, i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanMonthRollup {
    pub ready_to_assign_milliunits: i64,
    pub total_assigned_milliunits: i64,
    pub total_activity_milliunits: i64,
    pub total_available_milliunits: i64,
    pub category_balances: HashMap<Uuid, CategoryBalance>,
}

impl PlanMonthRollup {
    pub fn to_prior_month_summary(&self) -> PriorMonthSummary {
        let mut available = HashMap::new();
        let mut cash_overspent = HashMap::new();
        for (id, balance) in &self.category_balances {
            available.insert(*id, balance.available_milliunits);
            if balance.cash_overspent_milliunits > 0 {
                cash_overspent.insert(*id, balance.cash_overspent_milliunits);
            }
        }
        PriorMonthSummary {
            ready_to_assign_milliunits: self.ready_to_assign_milliunits,
            category_available_milliunits: available,
            category_cash_overspent_milliunits: cash_overspent,
        }
    }
}

pub fn calculate_month(
    categories: &[CategoryMeta],
    prior_month: Option<&PriorMonthSummary>,
    month_inflow_milliunits: i64,
    month_assigned: &HashMap<Uuid, i64>,
    month_cash_activity: &HashMap<Uuid, i64>,
    month_credit_activity: &HashMap<Uuid, i64>,
    cc_payment_transfers: &HashMap<Uuid, i64>,
) -> PlanMonthRollup {
    let mut starting_available: HashMap<Uuid, i64> = HashMap::new();
    let mut prior_cash_overspending_deduction: i64 = 0;

    if let Some(prior) = prior_month {
        for cat in categories {
            let prior_avail = prior.category_available_milliunits.get(&cat.category_id).copied().unwrap_or(0);
            if prior_avail > 0 {
                starting_available.insert(cat.category_id, prior_avail);
            } else if prior_avail < 0 {
                starting_available.insert(cat.category_id, 0);
                let cash_over = prior.category_cash_overspent_milliunits.get(&cat.category_id).copied().unwrap_or(0);
                if cash_over > 0 {
                    prior_cash_overspending_deduction += cash_over;
                }
            } else {
                starting_available.insert(cat.category_id, 0);
            }
        }
    }

    let mut total_assigned: i64 = 0;
    for &amount in month_assigned.values() {
        total_assigned += amount;
    }

    let mut cc_account_to_category: HashMap<Uuid, Uuid> = HashMap::new();
    let mut single_cc_payment_cat_id: Option<Uuid> = None;
    for cat in categories {
        if cat.credit_card_payment {
            if let Some(card_acc_id) = cat.credit_card_account_id {
                cc_account_to_category.insert(card_acc_id, cat.category_id);
            }
            single_cc_payment_cat_id = Some(cat.category_id);
        }
    }

    let mut funded_by_card: HashMap<Uuid, i64> = HashMap::new();
    let mut balances: HashMap<Uuid, CategoryBalance> = HashMap::new();
    let mut total_activity: i64 = 0;
    let mut total_available: i64 = 0;

    // First pass: standard spending envelopes
    for cat in categories {
        if cat.inflow_category || cat.credit_card_payment {
            continue;
        }

        let assigned = month_assigned.get(&cat.category_id).copied().unwrap_or(0);
        let start_avail = starting_available.get(&cat.category_id).copied().unwrap_or(0);
        let cash_act = month_cash_activity.get(&cat.category_id).copied().unwrap_or(0);
        let credit_act = month_credit_activity.get(&cat.category_id).copied().unwrap_or(0);

        let net_activity = cash_act + credit_act;
        total_activity += net_activity;

        let funds_before_spending = start_avail + assigned;
        let funds_after_cash = funds_before_spending + cash_act;

        let mut cash_overspent: i64 = 0;
        let mut credit_overspent: i64 = 0;
        let mut funded_credit_spending: i64 = 0;

        if funds_after_cash < 0 {
            cash_overspent = -funds_after_cash;
            credit_overspent = -credit_act;
        } else {
            let credit_outflow = -credit_act;
            if credit_outflow > 0 {
                if funds_after_cash >= credit_outflow {
                    funded_credit_spending = credit_outflow;
                } else {
                    funded_credit_spending = funds_after_cash;
                    credit_overspent = credit_outflow - funds_after_cash;
                }
            }
        }

        let ending_available = funds_before_spending + net_activity;
        total_available += ending_available;

        balances.insert(
            cat.category_id,
            CategoryBalance {
                category_id: cat.category_id,
                assigned_milliunits: assigned,
                activity_milliunits: net_activity,
                available_milliunits: ending_available,
                cash_overspent_milliunits: cash_overspent,
                credit_overspent_milliunits: credit_overspent,
            },
        );

        if let Some(target_cat_id) = single_cc_payment_cat_id {
            *funded_by_card.entry(target_cat_id).or_insert(0) += funded_credit_spending;
        }
    }

    // Second pass: Credit Card Payment categories
    for cat in categories {
        if !cat.credit_card_payment {
            continue;
        }

        let assigned = month_assigned.get(&cat.category_id).copied().unwrap_or(0);
        let start_avail = starting_available.get(&cat.category_id).copied().unwrap_or(0);
        let payments = cc_payment_transfers.get(&cat.category_id).copied().unwrap_or(0);
        let funded = funded_by_card.get(&cat.category_id).copied().unwrap_or(0);

        // Net activity for CC payment category:
        // Cash transfers (payments out) are negative, funded amount moved from categories is positive
        let net_activity = payments + funded;
        total_activity += net_activity;

        let ending_available = start_avail + assigned + net_activity;
        total_available += ending_available;

        balances.insert(
            cat.category_id,
            CategoryBalance {
                category_id: cat.category_id,
                assigned_milliunits: assigned,
                activity_milliunits: net_activity,
                available_milliunits: ending_available,
                cash_overspent_milliunits: 0,
                credit_overspent_milliunits: 0,
            },
        );
    }

    let prior_rta = prior_month.map(|p| p.ready_to_assign_milliunits).unwrap_or(0);
    let ready_to_assign = prior_rta - prior_cash_overspending_deduction + month_inflow_milliunits - total_assigned;

    PlanMonthRollup {
        ready_to_assign_milliunits: ready_to_assign,
        total_assigned_milliunits: total_assigned,
        total_activity_milliunits: total_activity,
        total_available_milliunits: total_available,
        category_balances: balances,
    }
}
