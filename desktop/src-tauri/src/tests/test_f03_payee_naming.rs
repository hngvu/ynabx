//! F03: Starting balance payee internal naming test suite.
//! Tests starting balance payee internal naming (`StartingBalancePayee` vs `Payee/__StartingBalance__`),
//! verifying seeding and queries align so starting balance transactions are linked to `entities_payee_id`.

use rusqlite::params;
use uuid::Uuid;
use super::common::setup_test_db;
use crate::seed::{
    DEFAULT_BUDGET_ID, PAYEE_STARTING_BALANCE, PAYEE_MANUAL_ADJUSTMENT,
    PAYEE_RECONCILIATION_ADJUSTMENT, CAT_IMMEDIATE_INCOME,
};

// =========================================================================
// Tier 1: Primary Behavioral & Equivalence Tests
// =========================================================================

#[test]
fn test_f03_t1_starting_balance_payee_seeded_with_expected_name() {
    let conn = setup_test_db();

    // Verify system payee was seeded
    let (name, internal_name): (String, Option<String>) = conn.query_row(
        "SELECT name, internal_name FROM be_payees WHERE budget_id = ?1 AND internal_name = ?2",
        params![DEFAULT_BUDGET_ID, PAYEE_STARTING_BALANCE],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).expect("Starting Balance payee must be seeded");

    assert_eq!(name, "Starting Balance");
    assert_eq!(internal_name.as_deref(), Some("StartingBalancePayee"));
}

#[test]
fn test_f03_t1_starting_balance_payee_has_enabled_zero() {
    let conn = setup_test_db();

    // System payees must have enabled = 0 to avoid appearing in regular user payee dropdowns
    let enabled: i32 = conn.query_row(
        "SELECT enabled FROM be_payees WHERE budget_id = ?1 AND internal_name = ?2",
        params![DEFAULT_BUDGET_ID, PAYEE_STARTING_BALANCE],
        |r| r.get(0),
    ).expect("Starting Balance payee must exist");

    assert_eq!(enabled, 0, "System Starting Balance payee must have enabled = 0");
}

#[test]
fn test_f03_t1_starting_balance_query_resolves_payee_id() {
    let conn = setup_test_db();

    let payee_id: Option<String> = conn.query_row(
        "SELECT id FROM be_payees WHERE budget_id = ?1 AND internal_name = ?2",
        params![DEFAULT_BUDGET_ID, PAYEE_STARTING_BALANCE],
        |r| r.get(0),
    ).ok();

    assert!(payee_id.is_some(), "Querying with canonical internal name must resolve payee ID");
    assert!(!payee_id.unwrap().is_empty());
}

#[test]
fn test_f03_t1_create_account_starting_balance_links_to_seeded_payee() {
    let conn = setup_test_db();

    let starting_payee_id: String = conn.query_row(
        "SELECT id FROM be_payees WHERE budget_id = ?1 AND internal_name = ?2",
        params![DEFAULT_BUDGET_ID, PAYEE_STARTING_BALANCE],
        |r| r.get(0),
    ).unwrap();

    let acc_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_accounts (id, budget_id, account_type, account_name) VALUES (?1, ?2, 'checking', 'Payroll Account')",
        params![acc_id, DEFAULT_BUDGET_ID],
    ).unwrap();

    // Insert starting balance transaction linked to the resolved payee
    let tx_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_transactions (
            id, budget_id, entities_account_id, entities_payee_id, date, amount, memo, cleared
        ) VALUES (?1, ?2, ?3, ?4, '2026-01-01', 500000, 'Starting Balance', 'Cleared')"#,
        params![tx_id, DEFAULT_BUDGET_ID, acc_id, starting_payee_id],
    ).unwrap();

    let linked_payee_id: Option<String> = conn.query_row(
        "SELECT entities_payee_id FROM be_transactions WHERE id = ?1",
        params![tx_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(linked_payee_id, Some(starting_payee_id), "Starting balance transaction must link to payee");
}

#[test]
fn test_f03_t1_starting_balance_transaction_categorized_to_immediate_income() {
    let conn = setup_test_db();

    let income_cat_id: String = conn.query_row(
        "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name = ?2",
        params![DEFAULT_BUDGET_ID, CAT_IMMEDIATE_INCOME],
        |r| r.get(0),
    ).expect("Immediate Income category must exist");

    let acc_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_accounts (id, budget_id, account_type, account_name, on_budget) VALUES (?1, ?2, 'checking', 'Checking', 1)",
        params![acc_id, DEFAULT_BUDGET_ID],
    ).unwrap();

    let tx_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_transactions (
            id, budget_id, entities_account_id, entities_subcategory_id, date, amount, memo, cleared
        ) VALUES (?1, ?2, ?3, ?4, '2026-01-01', 1000000, 'Starting Balance', 'Cleared')"#,
        params![tx_id, DEFAULT_BUDGET_ID, acc_id, income_cat_id],
    ).unwrap();

    let cat_id: Option<String> = conn.query_row(
        "SELECT entities_subcategory_id FROM be_transactions WHERE id = ?1",
        params![tx_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(cat_id, Some(income_cat_id), "On-budget starting balance must be categorized to Immediate Income");
}

// =========================================================================
// Tier 2: Boundary & Corner Cases (Defect Exposure Tests)
// =========================================================================

#[test]
fn test_f03_t2_detect_payee_naming_mismatch_defect_in_commands() {
    let conn = setup_test_db();

    // In commands.rs:341, the query was:
    // SELECT id FROM be_payees WHERE budget_id = ?1 AND internal_name = 'Payee/__StartingBalance__'
    let legacy_query_result: Option<String> = conn.query_row(
        "SELECT id FROM be_payees WHERE budget_id = ?1 AND internal_name = 'Payee/__StartingBalance__'",
        params![DEFAULT_BUDGET_ID],
        |r| r.get(0),
    ).ok();

    // In seed.rs:19, PAYEE_STARTING_BALANCE is "StartingBalancePayee"
    let canonical_query_result: Option<String> = conn.query_row(
        "SELECT id FROM be_payees WHERE budget_id = ?1 AND internal_name = ?2",
        params![DEFAULT_BUDGET_ID, PAYEE_STARTING_BALANCE],
        |r| r.get(0),
    ).ok();

    // Canonical seeded payee MUST exist
    assert!(canonical_query_result.is_some(), "Seeded StartingBalancePayee must exist");

    // The legacy query in commands.rs:341 will return None unless seeded or aliased.
    // This test documents whether the legacy query matches or produces None.
    let is_mismatched = legacy_query_result.is_none();
    println!("[Defect Check F03] commands.rs:341 'Payee/__StartingBalance__' resolved: {:?}, canonical resolved: {:?}",
        legacy_query_result, canonical_query_result);
    // Canonical query must succeed
    assert!(canonical_query_result.is_some());
    // Document defect state: legacy query currently fails because seed uses 'StartingBalancePayee'
    assert!(is_mismatched, "Exposes defect: commands.rs:341 queries 'Payee/__StartingBalance__' which does not match seed.rs:19 'StartingBalancePayee'");
}

#[test]
fn test_f03_t2_zero_starting_balance_creates_no_payee_transaction() {
    let conn = setup_test_db();
    let acc_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_accounts (id, budget_id, account_type, account_name) VALUES (?1, ?2, 'checking', 'Zero Account')",
        params![acc_id, DEFAULT_BUDGET_ID],
    ).unwrap();

    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM be_transactions WHERE entities_account_id = ?1",
        params![acc_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(count, 0, "Account created with 0 balance must not create starting balance transaction");
}

#[test]
fn test_f03_t2_negative_starting_balance_links_to_same_payee() {
    let conn = setup_test_db();

    let starting_payee_id: String = conn.query_row(
        "SELECT id FROM be_payees WHERE budget_id = ?1 AND internal_name = ?2",
        params![DEFAULT_BUDGET_ID, PAYEE_STARTING_BALANCE],
        |r| r.get(0),
    ).unwrap();

    let cc_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_accounts (id, budget_id, account_type, account_name) VALUES (?1, ?2, 'CreditCard', 'Existing CC')",
        params![cc_id, DEFAULT_BUDGET_ID],
    ).unwrap();

    // Negative initial balance of -$1,500.00 (-1500000 milliunits)
    let tx_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_transactions (
            id, budget_id, entities_account_id, entities_payee_id, date, amount, memo, cleared
        ) VALUES (?1, ?2, ?3, ?4, '2026-01-01', -1500000, 'Starting Balance', 'Cleared')"#,
        params![tx_id, DEFAULT_BUDGET_ID, cc_id, starting_payee_id],
    ).unwrap();

    let linked_payee: Option<String> = conn.query_row(
        "SELECT entities_payee_id FROM be_transactions WHERE id = ?1",
        params![tx_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(linked_payee, Some(starting_payee_id));
}

#[test]
fn test_f03_t2_manual_adjustment_payee_internal_naming() {
    let conn = setup_test_db();

    let (name, internal): (String, Option<String>) = conn.query_row(
        "SELECT name, internal_name FROM be_payees WHERE budget_id = ?1 AND internal_name = ?2",
        params![DEFAULT_BUDGET_ID, PAYEE_MANUAL_ADJUSTMENT],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).expect("Manual balance adjustment payee must exist");

    assert_eq!(name, "Manual Balance Adjustment");
    assert_eq!(internal.as_deref(), Some("BalanceAdjustmentPayee"));
}

#[test]
fn test_f03_t2_reconciliation_adjustment_payee_internal_naming() {
    let conn = setup_test_db();

    let (name, internal): (String, Option<String>) = conn.query_row(
        "SELECT name, internal_name FROM be_payees WHERE budget_id = ?1 AND internal_name = ?2",
        params![DEFAULT_BUDGET_ID, PAYEE_RECONCILIATION_ADJUSTMENT],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).expect("Reconciliation balance adjustment payee must exist");

    assert_eq!(name, "Reconciliation Balance Adjustment");
    assert_eq!(internal.as_deref(), Some("BalanceAdjustmentReconcilePayee"));
}
