//! 2-Pass Subcategory Calculation Engine matching YNAB v26.160.1 `SubcategoryCalculations`
//! (`wrapper.beautified.js:31956–32132`).
//!
//! Enforces:
//! 1. Cash-First envelope deduction (cash outflows consume category available funds first).
//! 2. Chronological FIFO Credit Outflow attribution (Card A spends before Card B within a partially funded category).
//! 3. Credit Card Payment category automatic movement without proportional drift.

use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct CategoryMeta {
    pub id: String,
    pub master_category_id: String,
    pub account_id: Option<String>,
    pub name: String,
    pub cat_type: String, // "DFT" or "DBT"
    pub internal_name: Option<String>,
    pub is_hidden: bool,
}

#[derive(Debug, Clone)]
pub struct CreditSpendSlice {
    pub card_account_id: String,
    pub amount_milliunits: i64, // negative for outflow, positive for refund/inflow
}

#[derive(Debug, Clone, Default)]
pub struct SubcategoryMonthInput {
    pub category_id: String,
    pub budgeted_milliunits: i64,
    pub cash_outflows_milliunits: i64,
    pub credit_outflows_milliunits: i64,
    pub credit_spend_slices: Vec<CreditSpendSlice>,
    pub prior_month_balance_milliunits: i64,
    pub cc_payment_cash_transfers_milliunits: i64, // Checking -> CC payments (negative for payment outflows)
}

#[derive(Debug, Clone, Default)]
pub struct SubcategoryCalculationResult {
    pub category_id: String,
    pub balance_previous_month: i64,
    pub cash_outflows: i64,
    pub positive_cash_outflows: Option<i64>, // Funded spending moving into CC Payment category
    pub credit_outflows: i64,
    pub balance: i64, // Available
    pub budgeted_cash_outflows: i64,
    pub unbudgeted_cash_outflows: i64, // Cash overspending (<= 0)
    pub budgeted_credit_outflows: i64,
    pub unbudgeted_credit_outflows: i64, // Credit overspending (<= 0)
    pub budgeted_spending: Option<i64>,
}

/// Executes 2-Pass Calculation for all subcategories in a single month.
pub fn calculate_subcategories_for_month(
    categories: &[CategoryMeta],
    inputs: &HashMap<String, SubcategoryMonthInput>,
    card_account_to_payment_category: &HashMap<String, String>,
) -> HashMap<String, SubcategoryCalculationResult> {
    let mut results: HashMap<String, SubcategoryCalculationResult> = HashMap::new();
    let mut funded_by_payment_category: HashMap<String, i64> = HashMap::new();

    // -------------------------------------------------------------
    // PASS 1: Regular (DFT) and Internal Subcategories (Cash-First Rule)
    // -------------------------------------------------------------
    for cat in categories {
        if cat.cat_type == "DBT" {
            continue;
        }

        let input = inputs.get(&cat.id).cloned().unwrap_or_default();
        let prev_balance = input.prior_month_balance_milliunits;
        let positive_rollover = if prev_balance > 0 { prev_balance } else { 0 };

        let funds_before_activity = positive_rollover + input.budgeted_milliunits;
        let r = input.cash_outflows_milliunits;
        let o = input.credit_outflows_milliunits;
        let a = funds_before_activity;

        // Exact YNAB L32121-32132 equations:
        let budgeted_cash = r - ((-a).min(r).min(0) + a.max(0));
        let unbudgeted_cash = (a + r).min(0);

        let budgeted_credit = o - ((-(a + r)).min(o).min(0) + (a + r).max(0));
        let unbudgeted_credit = (-(a + r)).min(o).min(0) + (a + r).max(0);

        let ending_balance = a + r + o;

        // Total funded credit capacity in this category-month
        let funded_credit_capacity = (-budgeted_credit).max(0);

        // Attribute funded credit spending to specific cards via Chronological FIFO
        if funded_credit_capacity > 0 && !input.credit_spend_slices.is_empty() {
            allocate_funded_credit_chronologically(
                &input.credit_spend_slices,
                funded_credit_capacity,
                card_account_to_payment_category,
                &mut funded_by_payment_category,
            );
        }

        results.insert(
            cat.id.clone(),
            SubcategoryCalculationResult {
                category_id: cat.id.clone(),
                balance_previous_month: prev_balance,
                cash_outflows: r,
                positive_cash_outflows: None,
                credit_outflows: o,
                balance: ending_balance,
                budgeted_cash_outflows: budgeted_cash,
                unbudgeted_cash_outflows: unbudgeted_cash,
                budgeted_credit_outflows: budgeted_credit,
                unbudgeted_credit_outflows: unbudgeted_credit,
                budgeted_spending: None,
            },
        );
    }

    // -------------------------------------------------------------
    // PASS 2: Credit Card Payment Subcategories (DBT)
    // -------------------------------------------------------------
    for cat in categories {
        if cat.cat_type != "DBT" {
            continue;
        }

        let input = inputs.get(&cat.id).cloned().unwrap_or_default();
        let prev_balance = input.prior_month_balance_milliunits;
        let positive_rollover = if prev_balance > 0 { prev_balance } else { 0 };

        let funded_moved_in = funded_by_payment_category
            .get(&cat.id)
            .copied()
            .unwrap_or(0);
        let payments_and_transfers = input.cc_payment_cash_transfers_milliunits;

        // For CCPC: cash_outflows = payments_and_transfers + funded_moved_in
        let net_cash_outflows = payments_and_transfers + funded_moved_in;
        let ending_available = positive_rollover + input.budgeted_milliunits + net_cash_outflows;

        // If ending_available < 0, it means user sent more payments to the card than available
        let unbudgeted_cash = ending_available.min(0);

        results.insert(
            cat.id.clone(),
            SubcategoryCalculationResult {
                category_id: cat.id.clone(),
                balance_previous_month: prev_balance,
                cash_outflows: net_cash_outflows,
                positive_cash_outflows: Some(funded_moved_in),
                credit_outflows: 0,
                balance: ending_available,
                budgeted_cash_outflows: payments_and_transfers,
                unbudgeted_cash_outflows: unbudgeted_cash,
                budgeted_credit_outflows: 0,
                unbudgeted_credit_outflows: 0,
                budgeted_spending: Some(-funded_moved_in),
            },
        );
    }

    results
}

/// Chronological FIFO attribution for Multi-Credit-Card spending
fn allocate_funded_credit_chronologically(
    slices: &[CreditSpendSlice],
    funded_credit_capacity: i64,
    card_to_cat: &HashMap<String, String>,
    funded_by_cat: &mut HashMap<String, i64>,
) {
    let mut card_refunds: HashMap<String, i64> = HashMap::new();
    for s in slices.iter().filter(|s| s.amount_milliunits > 0) {
        *card_refunds.entry(s.card_account_id.clone()).or_insert(0) += s.amount_milliunits;
    }

    let mut remaining_pool = funded_credit_capacity;
    for s in slices.iter().filter(|s| s.amount_milliunits < 0) {
        if remaining_pool <= 0 {
            break;
        }
        let gross_outflow = -s.amount_milliunits;
        let refund_offset = card_refunds
            .get_mut(&s.card_account_id)
            .map(|r| {
                let used = (*r).min(gross_outflow);
                *r -= used;
                used
            })
            .unwrap_or(0);
        let net_outflow = gross_outflow - refund_offset;
        let covered = net_outflow.min(remaining_pool);
        if covered > 0 {
            if let Some(payment_cat_id) = card_to_cat.get(&s.card_account_id) {
                *funded_by_cat.entry(payment_cat_id.clone()).or_insert(0) += covered;
            }
            remaining_pool -= covered;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cash_first_and_multi_credit_card_chronological() {
        let cat_groceries = CategoryMeta {
            id: "cat-groceries".into(),
            master_category_id: "m-1".into(),
            account_id: None,
            name: "Groceries".into(),
            cat_type: "DFT".into(),
            internal_name: None,
            is_hidden: false,
        };

        let cat_visa_payment = CategoryMeta {
            id: "cat-visa-pay".into(),
            master_category_id: "m-debt".into(),
            account_id: Some("acc-visa".into()),
            name: "Visa Payment".into(),
            cat_type: "DBT".into(),
            internal_name: None,
            is_hidden: false,
        };

        let cat_master_payment = CategoryMeta {
            id: "cat-master-pay".into(),
            master_category_id: "m-debt".into(),
            account_id: Some("acc-master".into()),
            name: "Mastercard Payment".into(),
            cat_type: "DBT".into(),
            internal_name: None,
            is_hidden: false,
        };

        let categories = vec![
            cat_groceries.clone(),
            cat_visa_payment.clone(),
            cat_master_payment.clone(),
        ];

        let mut card_to_cat = HashMap::new();
        card_to_cat.insert("acc-visa".into(), "cat-visa-pay".into());
        card_to_cat.insert("acc-master".into(), "cat-master-pay".into());

        // Case: $60.00 budgeted in Groceries.
        // Card A (Visa) spends -$50.00 first. Card B (Mastercard) spends -$50.00 second.
        let mut inputs = HashMap::new();
        inputs.insert(
            "cat-groceries".into(),
            SubcategoryMonthInput {
                category_id: "cat-groceries".into(),
                budgeted_milliunits: 60000,
                cash_outflows_milliunits: 0,
                credit_outflows_milliunits: -100000,
                credit_spend_slices: vec![
                    CreditSpendSlice {
                        card_account_id: "acc-visa".into(),
                        amount_milliunits: -50000,
                    },
                    CreditSpendSlice {
                        card_account_id: "acc-master".into(),
                        amount_milliunits: -50000,
                    },
                ],
                prior_month_balance_milliunits: 0,
                cc_payment_cash_transfers_milliunits: 0,
            },
        );

        let results = calculate_subcategories_for_month(&categories, &inputs, &card_to_cat);

        let groc_res = results.get("cat-groceries").unwrap();
        assert_eq!(groc_res.balance, -40000); // -$40.00 available
        assert_eq!(groc_res.unbudgeted_cash_outflows, 0); // No cash overspent
        assert_eq!(groc_res.unbudgeted_credit_outflows, -40000); // -$40.00 credit overspent (Yellow)

        // Visa should get full $50.00 funded, Mastercard gets remaining $10.00
        let visa_res = results.get("cat-visa-pay").unwrap();
        assert_eq!(visa_res.positive_cash_outflows, Some(50000));
        assert_eq!(visa_res.balance, 50000);

        let master_res = results.get("cat-master-pay").unwrap();
        assert_eq!(master_res.positive_cash_outflows, Some(10000));
        assert_eq!(master_res.balance, 10000);
    }
}
