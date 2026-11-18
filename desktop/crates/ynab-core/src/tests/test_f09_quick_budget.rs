//! F09: Quick Budget historical averages test suite.
//! Tests Quick Budget historical averages: querying past months' `be_monthly_subcategory_budgets`
//! for `average_budgeted`, `average_spent`, `budgeted_last_month`, `spent_last_month`.

use super::common::setup_test_db;
use crate::calc::auto_assign::{
    compute_batch_quick_budget_plan, QuickBudgetType, SubcategoryAutoAssignCandidate,
};
use crate::commands::{self, ApplyQuickBudgetPayload, CreateAccountPayload};
use crate::ledger::transfers::SaveTransactionPayload;
use crate::seed::DEFAULT_BUDGET_ID;
use crate::AppState;
use rusqlite::params;
use std::sync::Mutex;
use uuid::Uuid;

fn seed_historical_allocations(
    conn: &rusqlite::Connection,
    subcat_id: &str,
    amounts: &[(&str, i64)],
) {
    for (m, amt) in amounts {
        let mb_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT OR IGNORE INTO be_monthly_budgets (id, budget_id, month) VALUES (?1, ?2, ?3)",
            params![mb_id, DEFAULT_BUDGET_ID, m],
        )
        .unwrap();

        let real_mb_id: String = conn
            .query_row(
                "SELECT id FROM be_monthly_budgets WHERE budget_id = ?1 AND month = ?2",
                params![DEFAULT_BUDGET_ID, m],
                |r| r.get(0),
            )
            .unwrap();

        let mcb_id = Uuid::new_v4().to_string();
        conn.execute(
            r#"INSERT OR REPLACE INTO be_monthly_subcategory_budgets (
                id, budget_id, entities_monthly_budget_id, entities_subcategory_id, month, budgeted
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"#,
            params![mcb_id, DEFAULT_BUDGET_ID, real_mb_id, subcat_id, m, amt],
        )
        .unwrap();
    }
}

// Canonical calculation query for historical averages
fn query_historical_budgeted(
    conn: &rusqlite::Connection,
    subcat_id: &str,
    target_month: &str,
) -> (i64, i64) {
    // 1. Budgeted last month
    let parts: Vec<&str> = target_month.split('-').collect();
    let year: i32 = parts[0].parse().unwrap();
    let month: u32 = parts[1].parse().unwrap();
    let prev_month = if month == 1 {
        format!("{:04}-12-01", year - 1)
    } else {
        format!("{:04}-{:02}-01", year, month - 1)
    };

    let budgeted_last_month: i64 = conn.query_row(
        "SELECT COALESCE(budgeted, 0) FROM be_monthly_subcategory_budgets WHERE entities_subcategory_id = ?1 AND month = ?2 AND is_tombstone = 0",
        params![subcat_id, prev_month],
        |r| r.get(0),
    ).unwrap_or(0);

    // 2. Average budgeted across all past months (month < target_month)
    let (avg_budgeted, _): (i64, i64) = conn
        .query_row(
            r#"SELECT COALESCE(CAST(ROUND(AVG(budgeted)) AS INTEGER), 0), COUNT(*)
           FROM be_monthly_subcategory_budgets
           WHERE entities_subcategory_id = ?1 AND month < ?2 AND is_tombstone = 0"#,
            params![subcat_id, target_month],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap_or((0, 0));

    (budgeted_last_month, avg_budgeted)
}

// =========================================================================
// Tier 1: Primary Behavioral & Equivalence Tests
// =========================================================================

#[test]
fn test_f09_t1_budgeted_last_month_historical_query() {
    let conn = setup_test_db();
    let subcat_id: String = conn.query_row("SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1", params![DEFAULT_BUDGET_ID], |r| r.get(0)).unwrap();

    seed_historical_allocations(
        &conn,
        &subcat_id,
        &[
            ("2026-01-01", 100000), // $100
            ("2026-02-01", 150000), // $150
        ],
    );

    let (last_m, _) = query_historical_budgeted(&conn, &subcat_id, "2026-03-01");
    assert_eq!(
        last_m, 150000,
        "Budgeted last month for March 2026 must be February ($150.00)"
    );
}

#[test]
fn test_f09_t1_average_budgeted_multi_month_query() {
    let conn = setup_test_db();
    let subcat_id: String = conn.query_row("SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1", params![DEFAULT_BUDGET_ID], |r| r.get(0)).unwrap();

    // 3 months: $100, $200, $300 -> avg = $200 (200000)
    seed_historical_allocations(
        &conn,
        &subcat_id,
        &[
            ("2026-01-01", 100000),
            ("2026-02-01", 200000),
            ("2026-03-01", 300000),
        ],
    );

    let (_, avg) = query_historical_budgeted(&conn, &subcat_id, "2026-04-01");
    assert_eq!(
        avg, 200000,
        "Average budgeted across 3 months must be 200000 milliunits"
    );
}

#[test]
fn test_f09_t1_apply_quick_budget_budgeted_last_month() {
    let candidate = SubcategoryAutoAssignCandidate {
        subcategory_id: "cat-1".to_string(),
        master_category_id: "m-1".to_string(),
        master_sort_index: 0,
        sub_sort_index: 0,
        is_credit_card_payment: false,
        is_overspent: false,
        balance: 0,
        budgeted: 0,
        activity: 0,
        underfunded_amount: 0,
        goal_target_amount: 0,
        target_date: None,
        is_snoozed: false,
        budgeted_last_month: 175000,
        spent_last_month: 0,
        paid_last_month: 0,
        average_budgeted: 0,
        average_spent: 0,
        average_paid: 0,
    };

    let plan = compute_batch_quick_budget_plan(&[candidate], QuickBudgetType::BudgetedLastMonth);
    assert_eq!(plan.len(), 1);
    assert_eq!(plan[0].new_budgeted, 175000);
}

#[test]
fn test_f09_t1_apply_quick_budget_average_budgeted() {
    let candidate = SubcategoryAutoAssignCandidate {
        subcategory_id: "cat-1".to_string(),
        master_category_id: "m-1".to_string(),
        master_sort_index: 0,
        sub_sort_index: 0,
        is_credit_card_payment: false,
        is_overspent: false,
        balance: 0,
        budgeted: 0,
        activity: 0,
        underfunded_amount: 0,
        goal_target_amount: 0,
        target_date: None,
        is_snoozed: false,
        budgeted_last_month: 0,
        spent_last_month: 0,
        paid_last_month: 0,
        average_budgeted: 220000,
        average_spent: 0,
        average_paid: 0,
    };

    let plan = compute_batch_quick_budget_plan(&[candidate], QuickBudgetType::AverageBudgeted);
    assert_eq!(plan[0].new_budgeted, 220000);
}

#[test]
fn test_f09_t1_apply_quick_budget_reset_budgeted_amounts() {
    let candidate = SubcategoryAutoAssignCandidate {
        subcategory_id: "cat-1".to_string(),
        master_category_id: "m-1".to_string(),
        master_sort_index: 0,
        sub_sort_index: 0,
        is_credit_card_payment: false,
        is_overspent: false,
        balance: 50000,
        budgeted: 50000,
        activity: 0,
        underfunded_amount: 0,
        goal_target_amount: 0,
        target_date: None,
        is_snoozed: false,
        budgeted_last_month: 0,
        spent_last_month: 0,
        paid_last_month: 0,
        average_budgeted: 0,
        average_spent: 0,
        average_paid: 0,
    };

    let plan = compute_batch_quick_budget_plan(&[candidate], QuickBudgetType::ResetBudgetedAmounts);
    assert_eq!(
        plan[0].new_budgeted, 0,
        "ResetBudgetedAmounts must zero assigned amount"
    );
}

// =========================================================================
// Tier 2: Boundary & Corner Cases (Zero History, Clamping & Set Zero)
// =========================================================================

#[test]
fn test_f09_t2_zero_prior_history_returns_zero() {
    let conn = setup_test_db();
    let subcat_id: String = conn.query_row("SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1", params![DEFAULT_BUDGET_ID], |r| r.get(0)).unwrap();

    let (last_m, avg) = query_historical_budgeted(&conn, &subcat_id, "2026-01-01");
    assert_eq!(
        last_m, 0,
        "New category with no prior month history must return 0"
    );
    assert_eq!(avg, 0, "Average with no prior month history must return 0");
}

#[test]
fn test_f09_t2_january_boundary_rolls_to_december_prior_year() {
    let conn = setup_test_db();
    let subcat_id: String = conn.query_row("SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1", params![DEFAULT_BUDGET_ID], |r| r.get(0)).unwrap();

    // Allocation in December 2025
    seed_historical_allocations(&conn, &subcat_id, &[("2025-12-01", 350000)]);

    let (last_m, _) = query_historical_budgeted(&conn, &subcat_id, "2026-01-01");
    assert_eq!(
        last_m, 350000,
        "For January 2026, last month must correctly resolve December 2025"
    );
}

#[test]
fn test_f09_t2_set_available_amount_to_zero_with_surplus() {
    let candidate = SubcategoryAutoAssignCandidate {
        subcategory_id: "cat-1".to_string(),
        master_category_id: "m-1".to_string(),
        master_sort_index: 0,
        sub_sort_index: 0,
        is_credit_card_payment: false,
        is_overspent: false,
        balance: 100000, // $100 currently available
        budgeted: 50000, // $50 assigned this month
        activity: 0,
        underfunded_amount: 0,
        goal_target_amount: 0,
        target_date: None,
        is_snoozed: false,
        budgeted_last_month: 0,
        spent_last_month: 0,
        paid_last_month: 0,
        average_budgeted: 0,
        average_spent: 0,
        average_paid: 0,
    };

    let plan =
        compute_batch_quick_budget_plan(&[candidate], QuickBudgetType::SetAvailableAmountToZero);
    // Budgeted adjusts: (50000 - 100000).max(0) = 0
    assert_eq!(
        plan[0].new_budgeted, 0,
        "SetAvailableAmountToZero clamps reduction to 0 min"
    );
}

#[test]
fn test_f09_t2_apply_quick_budget_spent_last_month_and_average_spent_positive() {
    // calculate_category_historical_stats produces positive spent_last_month (80000)
    // and average_spent (60000). Quick budget assigns candidate.spent_last_month.abs() = 80000.
    let candidate = SubcategoryAutoAssignCandidate {
        subcategory_id: "cat-1".to_string(),
        master_category_id: "m-1".to_string(),
        master_sort_index: 0,
        sub_sort_index: 0,
        is_credit_card_payment: false,
        is_overspent: false,
        balance: 0,
        budgeted: 0,
        activity: 0,
        underfunded_amount: 0,
        goal_target_amount: 0,
        target_date: None,
        is_snoozed: false,
        budgeted_last_month: 0,
        spent_last_month: 80000, // Positive absolute spend
        paid_last_month: 0,
        average_budgeted: 0,
        average_spent: 60000,
        average_paid: 0,
    };

    let plan_spent = compute_batch_quick_budget_plan(
        std::slice::from_ref(&candidate),
        QuickBudgetType::SpentLastMonth,
    );
    assert_eq!(
        plan_spent[0].new_budgeted, 80000,
        "SpentLastMonth must assign 80000 for positive candidate spend"
    );

    let plan_avg = compute_batch_quick_budget_plan(&[candidate], QuickBudgetType::AverageSpent);
    assert_eq!(
        plan_avg[0].new_budgeted, 60000,
        "AverageSpent must assign 60000 for positive candidate average"
    );
}

#[test]
fn test_f09_t1_apply_quick_budget_ipc_spent_and_average_spent_pipeline() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    let subcat_id: String = {
        let conn = state.db.lock().unwrap();
        conn.query_row(
            "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1",
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        ).unwrap()
    };

    let acc = commands::create_account(
        CreateAccountPayload {
            name: "Checking".to_string(),
            account_type: "checking".to_string(),
            balance_milliunits: 1000000,
            on_budget: Some(true),
            note: None,
        },
        state.clone(),
        None,
    )
    .unwrap();

    // Spend in 2026-03 ($100.00 outflow = -100000)
    commands::save_transaction(
        SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            account_id: acc.id.clone(),
            payee_id: None,
            category_id: Some(subcat_id.clone()),
            date: "2026-03-10".to_string(),
            amount_milliunits: -100000,
            memo: Some("March Spend".to_string()),
            cleared: Some("Cleared".to_string()),
            approved: Some(true),
            flag: None,
            subtransactions: Vec::new(),
            allow_reconciled_mutation: false,
            payee_name: None,
            transfer_account_id: None,
        },
        state.clone(),
    )
    .unwrap();

    // Spend in 2026-04 ($60.00 outflow = -60000)
    commands::save_transaction(
        SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            account_id: acc.id.clone(),
            payee_id: None,
            category_id: Some(subcat_id.clone()),
            date: "2026-04-15".to_string(),
            amount_milliunits: -60000,
            memo: Some("April Spend".to_string()),
            cleared: Some("Cleared".to_string()),
            approved: Some(true),
            flag: None,
            subtransactions: Vec::new(),
            allow_reconciled_mutation: false,
            payee_name: None,
            transfer_account_id: None,
        },
        state.clone(),
    )
    .unwrap();

    // 1. For target month 2026-05-01, apply Quick Budget with "SpentLastMonth":
    // Prior month (April 2026) spending was $60.00 (+60000).
    let summary = commands::apply_quick_budget(
        ApplyQuickBudgetPayload {
            month: "2026-05-01".to_string(),
            quick_budget_type: "SpentLastMonth".to_string(),
            category_ids: Some(vec![subcat_id.clone()]),
            budget_id: None,
        },
        state.clone(),
    )
    .unwrap();

    let mut found_assigned = 0i64;
    for g in summary.category_groups {
        for c in g.categories {
            if c.id == subcat_id {
                found_assigned = c.assigned_milliunits;
            }
        }
    }
    assert_eq!(
        found_assigned, 60000,
        "SpentLastMonth quick budget must assign positive 60000"
    );

    // 2. Apply Quick Budget with "AverageSpent":
    // Two months of spending: 100000 + 60000 = 160000 / 2 = 80000.
    let summary2 = commands::apply_quick_budget(
        ApplyQuickBudgetPayload {
            month: "2026-05-01".to_string(),
            quick_budget_type: "AverageSpent".to_string(),
            category_ids: Some(vec![subcat_id.clone()]),
            budget_id: None,
        },
        state.clone(),
    )
    .unwrap();

    let mut found_assigned2 = 0i64;
    for g in summary2.category_groups {
        for c in g.categories {
            if c.id == subcat_id {
                found_assigned2 = c.assigned_milliunits;
            }
        }
    }
    assert_eq!(
        found_assigned2, 80000,
        "AverageSpent quick budget must assign positive 80000"
    );
}

#[test]
fn test_f09_t2_tombstoned_historical_records_excluded_from_averages() {
    let conn = setup_test_db();
    let subcat_id: String = conn.query_row("SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1", params![DEFAULT_BUDGET_ID], |r| r.get(0)).unwrap();

    seed_historical_allocations(
        &conn,
        &subcat_id,
        &[
            ("2026-01-01", 100000),
            ("2026-02-01", 999999), // Will be tombstoned
        ],
    );

    conn.execute(
        "UPDATE be_monthly_subcategory_budgets SET is_tombstone = 1 WHERE entities_subcategory_id = ?1 AND month = '2026-02-01'",
        params![subcat_id],
    ).unwrap();

    let (_, avg) = query_historical_budgeted(&conn, &subcat_id, "2026-03-01");
    assert_eq!(
        avg, 100000,
        "Tombstoned historical records must be excluded from average calculation"
    );
}
