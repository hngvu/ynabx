//! F06: Persistent reconciliation across sessions & discrepancy adjustment test suite.
//! Tests `ledger::reconcile::reconcile_account`: marks cleared transactions `cleared = 'Reconciled'`,
//! persists `last_reconciled_at`, and creates balance discrepancy adjustment transactions.

use rusqlite::params;
use uuid::Uuid;
use super::common::setup_test_db;
use crate::seed::{DEFAULT_BUDGET_ID, PAYEE_RECONCILIATION_ADJUSTMENT, CAT_IMMEDIATE_INCOME};
use crate::ledger::reconcile::reconcile_account;

fn create_reconcile_test_account(conn: &rusqlite::Connection, on_budget: bool) -> String {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_accounts (
            id, budget_id, account_type, account_name, on_budget, cleared_balance, uncleared_balance
        ) VALUES (?1, ?2, 'checking', 'Reconcile Test Acc', ?3, 0, 0)"#,
        params![id, DEFAULT_BUDGET_ID, if on_budget { 1 } else { 0 }],
    ).unwrap();
    id
}

// =========================================================================
// Tier 1: Primary Behavioral & Equivalence Tests
// =========================================================================

#[test]
fn test_f06_t1_reconcile_locks_cleared_to_reconciled() {
    let conn = setup_test_db();
    let acc_id = create_reconcile_test_account(&conn, true);

    // Insert 2 cleared transactions
    for amt in [50000, 25000] {
        let tx_id = Uuid::new_v4().to_string();
        conn.execute(
            r#"INSERT INTO be_transactions (
                id, budget_id, entities_account_id, date, amount, memo, cleared
            ) VALUES (?1, ?2, ?3, '2026-03-01', ?4, 'Cleared Item', 'Cleared')"#,
            params![tx_id, DEFAULT_BUDGET_ID, acc_id, amt],
        ).unwrap();
    }

    // Reconcile with target balance = 75000 (matches cleared balance)
    let res = reconcile_account(&conn, DEFAULT_BUDGET_ID, &acc_id, 75000, true).unwrap();
    assert_eq!(res.reconciled_tx_count, 2);

    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM be_transactions WHERE entities_account_id = ?1 AND cleared = 'Reconciled'",
        params![acc_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(count, 2, "All cleared transactions must be transitioned to 'Reconciled'");

    let cleared_bal: i64 = conn.query_row(
        "SELECT cleared_balance FROM be_accounts WHERE id = ?1",
        params![acc_id],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(cleared_bal, 75000, "Account cleared_balance must remain 75000 after reconciliation, not reset to 0");
}

#[test]
fn test_f06_t1_reconcile_preserves_cleared_balance_in_be_accounts() {
    let conn = setup_test_db();
    let acc_id = create_reconcile_test_account(&conn, true);

    let tx_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_transactions (
            id, budget_id, entities_account_id, date, amount, memo, cleared
        ) VALUES (?1, ?2, ?3, '2026-03-01', 123450, 'Income', 'Cleared')"#,
        params![tx_id, DEFAULT_BUDGET_ID, acc_id],
    ).unwrap();

    let res = reconcile_account(&conn, DEFAULT_BUDGET_ID, &acc_id, 123450, true).unwrap();
    assert_eq!(res.adjustment_amount_milliunits, 0);

    let cleared_balance: i64 = conn.query_row(
        "SELECT cleared_balance FROM be_accounts WHERE id = ?1",
        params![acc_id],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(cleared_balance, 123450, "Reconciling account must preserve full cleared balance");
}

#[test]
fn test_f06_t1_reconcile_persists_last_reconciled_at() {
    let conn = setup_test_db();
    let acc_id = create_reconcile_test_account(&conn, true);

    reconcile_account(&conn, DEFAULT_BUDGET_ID, &acc_id, 0, false).unwrap();

    let last_reconciled_at: Option<String> = conn.query_row(
        "SELECT last_reconciled_at FROM be_accounts WHERE id = ?1",
        params![acc_id],
        |r| r.get(0),
    ).unwrap();

    assert!(last_reconciled_at.is_some(), "Account must persist last_reconciled_at timestamp in SQLite");
}

#[test]
fn test_f06_t1_reconcile_matching_balance_creates_zero_adjustments() {
    let conn = setup_test_db();
    let acc_id = create_reconcile_test_account(&conn, true);

    let tx_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_transactions (
            id, budget_id, entities_account_id, date, amount, memo, cleared
        ) VALUES (?1, ?2, ?3, '2026-03-01', 100000, 'Exact Balance', 'Cleared')"#,
        params![tx_id, DEFAULT_BUDGET_ID, acc_id],
    ).unwrap();

    let before_count: i64 = conn.query_row("SELECT COUNT(*) FROM be_transactions WHERE entities_account_id = ?1", params![acc_id], |r| r.get(0)).unwrap();

    let res = reconcile_account(&conn, DEFAULT_BUDGET_ID, &acc_id, 100000, true).unwrap();
    assert_eq!(res.adjustment_amount_milliunits, 0);

    let after_count: i64 = conn.query_row("SELECT COUNT(*) FROM be_transactions WHERE entities_account_id = ?1", params![acc_id], |r| r.get(0)).unwrap();
    assert_eq!(before_count, after_count, "Matching statement balance must not create an adjustment transaction");
}

#[test]
fn test_f06_t1_reconcile_positive_discrepancy_creates_adjustment() {
    let conn = setup_test_db();
    let acc_id = create_reconcile_test_account(&conn, true);

    // Cleared balance is 0. Target is +$50.00 (50000)
    let res = reconcile_account(&conn, DEFAULT_BUDGET_ID, &acc_id, 50000, true).unwrap();
    assert_eq!(res.adjustment_amount_milliunits, 50000);

    let adj_amount: i64 = conn.query_row(
        "SELECT amount FROM be_transactions WHERE entities_account_id = ?1 AND memo = 'Reconciliation Balance Adjustment'",
        params![acc_id],
        |r| r.get(0),
    ).expect("Adjustment transaction must be created");

    assert_eq!(adj_amount, 50000);
}

#[test]
fn test_f06_t1_reconcile_negative_discrepancy_creates_adjustment() {
    let conn = setup_test_db();
    let acc_id = create_reconcile_test_account(&conn, true);

    // Cleared balance is $100.00. Statement is $80.00 (difference -$20.00)
    let tx_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_transactions (
            id, budget_id, entities_account_id, date, amount, memo, cleared
        ) VALUES (?1, ?2, ?3, '2026-03-01', 100000, 'Initial', 'Cleared')"#,
        params![tx_id, DEFAULT_BUDGET_ID, acc_id],
    ).unwrap();

    let res = reconcile_account(&conn, DEFAULT_BUDGET_ID, &acc_id, 80000, true).unwrap();
    assert_eq!(res.adjustment_amount_milliunits, -20000);

    let adj_amount: i64 = conn.query_row(
        "SELECT amount FROM be_transactions WHERE entities_account_id = ?1 AND memo = 'Reconciliation Balance Adjustment'",
        params![acc_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(adj_amount, -20000);
}

// =========================================================================
// Tier 2: Boundary & Corner Cases
// =========================================================================

#[test]
fn test_f06_t2_reconcile_with_create_adjustment_false() {
    let conn = setup_test_db();
    let acc_id = create_reconcile_test_account(&conn, true);

    // Discrepancy of 10000 exists, but user opts out of creating adjustment
    let res = reconcile_account(&conn, DEFAULT_BUDGET_ID, &acc_id, 10000, false).unwrap();
    assert_eq!(res.adjustment_amount_milliunits, 10000);

    let adj_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM be_transactions WHERE entities_account_id = ?1 AND memo = 'Reconciliation Balance Adjustment'",
        params![acc_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(adj_count, 0, "No adjustment transaction created when create_adjustment is false");
}

#[test]
fn test_f06_t2_reconcile_preserves_uncleared_transactions() {
    let conn = setup_test_db();
    let acc_id = create_reconcile_test_account(&conn, true);

    let tx_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_transactions (
            id, budget_id, entities_account_id, date, amount, memo, cleared
        ) VALUES (?1, ?2, ?3, '2026-03-01', -15000, 'Pending Check', 'Uncleared')"#,
        params![tx_id, DEFAULT_BUDGET_ID, acc_id],
    ).unwrap();

    reconcile_account(&conn, DEFAULT_BUDGET_ID, &acc_id, 0, false).unwrap();

    let status: String = conn.query_row(
        "SELECT cleared FROM be_transactions WHERE id = ?1",
        params![tx_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(status, "Uncleared", "Uncleared transactions must not be converted to Reconciled");
}

#[test]
fn test_f06_t2_reconcile_adjustment_links_to_reconciliation_payee() {
    let conn = setup_test_db();
    let acc_id = create_reconcile_test_account(&conn, true);

    let expected_payee_id: String = conn.query_row(
        "SELECT id FROM be_payees WHERE budget_id = ?1 AND internal_name = ?2",
        params![DEFAULT_BUDGET_ID, PAYEE_RECONCILIATION_ADJUSTMENT],
        |r| r.get(0),
    ).unwrap();

    reconcile_account(&conn, DEFAULT_BUDGET_ID, &acc_id, 10000, true).unwrap();

    let linked_payee_id: Option<String> = conn.query_row(
        "SELECT entities_payee_id FROM be_transactions WHERE entities_account_id = ?1 AND memo = 'Reconciliation Balance Adjustment'",
        params![acc_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(linked_payee_id, Some(expected_payee_id), "Adjustment must link to system reconciliation payee");
}

#[test]
fn test_f06_t2_reconcile_on_budget_adjustment_categorized_to_immediate_income() {
    let conn = setup_test_db();
    let acc_id = create_reconcile_test_account(&conn, true); // on-budget = true

    let expected_cat_id: String = conn.query_row(
        "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name = ?2",
        params![DEFAULT_BUDGET_ID, CAT_IMMEDIATE_INCOME],
        |r| r.get(0),
    ).unwrap();

    reconcile_account(&conn, DEFAULT_BUDGET_ID, &acc_id, 25000, true).unwrap();

    let linked_cat_id: Option<String> = conn.query_row(
        "SELECT entities_subcategory_id FROM be_transactions WHERE entities_account_id = ?1 AND memo = 'Reconciliation Balance Adjustment'",
        params![acc_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(linked_cat_id, Some(expected_cat_id), "On-budget reconciliation adjustment must categorize to Inflow: Ready to Assign");
}

#[test]
fn test_f06_t2_reconcile_tracking_off_budget_has_no_category() {
    let conn = setup_test_db();
    let track_acc_id = create_reconcile_test_account(&conn, false); // on-budget = false (tracking)

    reconcile_account(&conn, DEFAULT_BUDGET_ID, &track_acc_id, 50000, true).unwrap();

    let linked_cat_id: Option<String> = conn.query_row(
        "SELECT entities_subcategory_id FROM be_transactions WHERE entities_account_id = ?1 AND memo = 'Reconciliation Balance Adjustment'",
        params![track_acc_id],
        |r| r.get(0),
    ).unwrap();

    assert!(linked_cat_id.is_none(), "Off-budget reconciliation adjustment must not assign an envelope category");
}
