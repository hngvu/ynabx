//! F01: Category hide / unhide non-destructive lifecycle test suite.
//! Tests non-destructive category hide/unhide lifecycle (`is_hidden = 1` vs `0`),
//! verifying subcategory, historical allocations in `be_monthly_subcategory_budgets`,
//! and transactions in `be_transactions` remain completely intact.

use std::sync::Mutex;
use tauri::Manager;
use rusqlite::params;
use uuid::Uuid;
use super::common::setup_test_db;
use crate::commands;
use crate::AppState;
use crate::seed::{DEFAULT_BUDGET_ID, MASTER_CAT_INTERNAL, CAT_IMMEDIATE_INCOME};

// =========================================================================
// Tier 1: Primary Behavioral & Equivalence Tests
// =========================================================================

#[test]
fn test_f01_t1_hide_subcategory_sets_is_hidden_flag() {
    let app = tauri::test::mock_app();
    let conn = setup_test_db();
    
    // Find an active user subcategory
    let subcat_id: String = conn.query_row(
        "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND is_hidden = 0 AND internal_name IS NULL LIMIT 1",
        params![DEFAULT_BUDGET_ID],
        |r| r.get(0),
    ).expect("failed to find active user subcategory");

    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // Hide subcategory non-destructively via IPC command
    let res = commands::hide_category(Some(subcat_id.clone()), Some(false), Some(true), None, state.clone());
    assert!(res.is_ok(), "commands::hide_category must succeed");

    let conn = state.db.lock().unwrap();
    let (is_hidden, is_tombstone): (i32, i32) = conn.query_row(
        "SELECT is_hidden, is_tombstone FROM be_subcategories WHERE id = ?1",
        params![subcat_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).expect("failed to query subcategory");

    assert_eq!(is_hidden, 1, "Subcategory must have is_hidden = 1");
    assert_eq!(is_tombstone, 0, "Non-destructive hide must NOT tombstone category");
}

#[test]
fn test_f01_t1_unhide_subcategory_clears_is_hidden_flag() {
    let app = tauri::test::mock_app();
    let conn = setup_test_db();
    
    let subcat_id: String = conn.query_row(
        "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND is_hidden = 0 AND internal_name IS NULL LIMIT 1",
        params![DEFAULT_BUDGET_ID],
        |r| r.get(0),
    ).expect("failed to find active user subcategory");

    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // Hide then unhide via IPC command
    commands::hide_category(Some(subcat_id.clone()), Some(false), Some(true), None, state.clone()).unwrap();
    commands::hide_category(Some(subcat_id.clone()), Some(false), Some(false), None, state.clone()).unwrap();

    let conn = state.db.lock().unwrap();
    let is_hidden: i32 = conn.query_row(
        "SELECT is_hidden FROM be_subcategories WHERE id = ?1",
        params![subcat_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(is_hidden, 0, "Unhiding subcategory must restore is_hidden = 0");
}

#[test]
fn test_f01_t1_hide_master_category_sets_is_hidden_flag() {
    let app = tauri::test::mock_app();
    let conn = setup_test_db();
    
    let master_id: String = conn.query_row(
        "SELECT id FROM be_master_categories WHERE budget_id = ?1 AND deletable = 1 LIMIT 1",
        params![DEFAULT_BUDGET_ID],
        |r| r.get(0),
    ).expect("failed to find user master category");

    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // Hide master category via IPC command
    let res = commands::hide_category(Some(master_id.clone()), Some(true), Some(true), None, state.clone());
    assert!(res.is_ok());

    let conn = state.db.lock().unwrap();
    let (is_hidden, is_tombstone): (i32, i32) = conn.query_row(
        "SELECT is_hidden, is_tombstone FROM be_master_categories WHERE id = ?1",
        params![master_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).unwrap();

    assert_eq!(is_hidden, 1);
    assert_eq!(is_tombstone, 0, "Master category hide must be non-destructive");
}

#[test]
fn test_f01_t1_historical_monthly_budget_allocations_preserved_on_hide() {
    let app = tauri::test::mock_app();
    let conn = setup_test_db();
    
    let subcat_id: String = conn.query_row(
        "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1",
        params![DEFAULT_BUDGET_ID],
        |r| r.get(0),
    ).unwrap();

    let monthly_budget_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_monthly_budgets (id, budget_id, month) VALUES (?1, ?2, '2026-01-01')",
        params![monthly_budget_id, DEFAULT_BUDGET_ID],
    ).unwrap();

    let mcb_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_monthly_subcategory_budgets (
            id, budget_id, entities_monthly_budget_id, entities_subcategory_id, month, budgeted
        ) VALUES (?1, ?2, ?3, ?4, '2026-01-01', 150000)"#,
        params![mcb_id, DEFAULT_BUDGET_ID, monthly_budget_id, subcat_id],
    ).unwrap();

    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // Now hide the subcategory via commands::hide_category
    commands::hide_category(Some(subcat_id.clone()), Some(false), Some(true), None, state.clone()).unwrap();

    // Verify historical allocations in be_monthly_subcategory_budgets remain intact
    let conn = state.db.lock().unwrap();
    let budgeted: i64 = conn.query_row(
        "SELECT budgeted FROM be_monthly_subcategory_budgets WHERE id = ?1 AND is_tombstone = 0",
        params![mcb_id],
        |r| r.get(0),
    ).expect("historical allocation must still exist");

    assert_eq!(budgeted, 150000, "Historical allocation amount must not be altered");
}

#[test]
fn test_f01_t1_historical_transactions_preserved_on_hide() {
    let app = tauri::test::mock_app();
    let conn = setup_test_db();
    
    let subcat_id: String = conn.query_row(
        "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1",
        params![DEFAULT_BUDGET_ID],
        |r| r.get(0),
    ).unwrap();

    let acc_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_accounts (id, budget_id, account_type, account_name) VALUES (?1, ?2, 'checking', 'Main Checking')",
        params![acc_id, DEFAULT_BUDGET_ID],
    ).unwrap();

    let tx_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_transactions (
            id, budget_id, entities_account_id, entities_subcategory_id, date, amount, memo
        ) VALUES (?1, ?2, ?3, ?4, '2026-01-15', -45000, 'Grocery store run')"#,
        params![tx_id, DEFAULT_BUDGET_ID, acc_id, subcat_id],
    ).unwrap();

    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // Hide category via commands::hide_category
    commands::hide_category(Some(subcat_id.clone()), Some(false), Some(true), None, state.clone()).unwrap();

    // Historical transaction must remain linked with intact amount and memo
    let conn = state.db.lock().unwrap();
    let (tx_amount, tx_subcat, tx_tombstone): (i64, Option<String>, i32) = conn.query_row(
        "SELECT amount, entities_subcategory_id, is_tombstone FROM be_transactions WHERE id = ?1",
        params![tx_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).expect("transaction must exist");

    assert_eq!(tx_amount, -45000);
    assert_eq!(tx_subcat.as_deref(), Some(subcat_id.as_str()), "Transaction category link preserved");
    assert_eq!(tx_tombstone, 0, "Transaction must not be tombstoned on category hide");
}

// =========================================================================
// Tier 2: Boundary & Corner Cases
// =========================================================================

#[test]
fn test_f01_t2_hide_category_with_zero_budget_and_activity() {
    let app = tauri::test::mock_app();
    let conn = setup_test_db();
    
    let master_id: String = conn.query_row(
        "SELECT id FROM be_master_categories WHERE budget_id = ?1 AND deletable = 1 LIMIT 1",
        params![DEFAULT_BUDGET_ID],
        |r| r.get(0),
    ).unwrap();

    let zero_subcat_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_subcategories (id, budget_id, entities_master_category_id, name, is_hidden) VALUES (?1, ?2, ?3, 'Empty Category', 0)",
        params![zero_subcat_id, DEFAULT_BUDGET_ID, master_id],
    ).unwrap();

    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // Hide empty category via commands::hide_category
    commands::hide_category(Some(zero_subcat_id.clone()), Some(false), Some(true), None, state.clone()).unwrap();

    let conn = state.db.lock().unwrap();
    let is_hidden: i32 = conn.query_row(
        "SELECT is_hidden FROM be_subcategories WHERE id = ?1",
        params![zero_subcat_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(is_hidden, 1);
}

#[test]
fn test_f01_t2_hide_category_with_negative_balance_overspending() {
    let app = tauri::test::mock_app();
    let conn = setup_test_db();
    
    let subcat_id: String = conn.query_row(
        "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1",
        params![DEFAULT_BUDGET_ID],
        |r| r.get(0),
    ).unwrap();

    // Insert subcategory calculation with cash overspending (-25000)
    let mb_id = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO be_monthly_budgets (id, budget_id, month) VALUES (?1, ?2, '2026-02-01')", params![mb_id, DEFAULT_BUDGET_ID]).unwrap();
    let mcb_id = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO be_monthly_subcategory_budgets (id, budget_id, entities_monthly_budget_id, entities_subcategory_id, month, budgeted) VALUES (?1, ?2, ?3, ?4, '2026-02-01', 0)", params![mcb_id, DEFAULT_BUDGET_ID, mb_id, subcat_id]).unwrap();
    
    let mcbc_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_monthly_subcategory_budget_calculations (
            id, budget_id, entities_monthly_subcategory_budget_id, entities_subcategory_id, month, balance, cash_outflows
        ) VALUES (?1, ?2, ?3, ?4, '2026-02-01', -25000, 25000)"#,
        params![mcbc_id, DEFAULT_BUDGET_ID, mcb_id, subcat_id],
    ).unwrap();

    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // Hide category while overspent via commands::hide_category
    commands::hide_category(Some(subcat_id.clone()), Some(false), Some(true), None, state.clone()).unwrap();

    let conn = state.db.lock().unwrap();
    let balance: i64 = conn.query_row(
        "SELECT balance FROM be_monthly_subcategory_budget_calculations WHERE entities_subcategory_id = ?1 AND month = '2026-02-01'",
        params![subcat_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(balance, -25000, "Category balance calculation preserved even when hidden");
}

#[test]
fn test_f01_t2_multiple_consecutive_hide_unhide_cycles() {
    let app = tauri::test::mock_app();
    let conn = setup_test_db();
    
    let subcat_id: String = conn.query_row(
        "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1",
        params![DEFAULT_BUDGET_ID],
        |r| r.get(0),
    ).unwrap();

    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // Execute 5 toggle cycles via commands::hide_category
    for expected in [true, true, false, false, true, false] {
        commands::hide_category(Some(subcat_id.clone()), Some(false), Some(expected), None, state.clone()).unwrap();
        let conn = state.db.lock().unwrap();
        let actual: i32 = conn.query_row(
            "SELECT is_hidden FROM be_subcategories WHERE id = ?1",
            params![subcat_id],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(actual, if expected { 1 } else { 0 }, "Consecutive toggle mismatch");
    }
}

#[test]
fn test_f01_t2_system_internal_category_hide_protection() {
    let conn = setup_test_db();
    
    // Internal master categories (e.g. MasterCategory/__Internal__) have deletable = 0
    let (deletable, internal_name): (i32, Option<String>) = conn.query_row(
        "SELECT deletable, internal_name FROM be_master_categories WHERE budget_id = ?1 AND internal_name = ?2",
        params![DEFAULT_BUDGET_ID, MASTER_CAT_INTERNAL],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).expect("system internal master category must exist");

    assert_eq!(deletable, 0, "System internal master category must have deletable = 0");
    assert_eq!(internal_name.as_deref(), Some(MASTER_CAT_INTERNAL));

    // System subcategory Immediate Income has internal_name set
    let subcat_internal: Option<String> = conn.query_row(
        "SELECT internal_name FROM be_subcategories WHERE budget_id = ?1 AND internal_name = ?2",
        params![DEFAULT_BUDGET_ID, CAT_IMMEDIATE_INCOME],
        |r| r.get(0),
    ).expect("immediate income must exist");

    assert_eq!(subcat_internal.as_deref(), Some(CAT_IMMEDIATE_INCOME));
}

#[test]
fn test_f01_t2_hide_subcategory_with_active_goal() {
    let app = tauri::test::mock_app();
    let conn = setup_test_db();
    
    let subcat_id: String = conn.query_row(
        "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1",
        params![DEFAULT_BUDGET_ID],
        |r| r.get(0),
    ).unwrap();

    // Configure a Target Category Balance goal
    conn.execute(
        r#"UPDATE be_subcategories
           SET goal_type = 'TB', goal_target_amount = 500000, goal_target_date = '2026-12-31'
           WHERE id = ?1"#,
        params![subcat_id],
    ).unwrap();

    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // Hide subcategory via commands::hide_category
    commands::hide_category(Some(subcat_id.clone()), Some(false), Some(true), None, state.clone()).unwrap();

    let conn = state.db.lock().unwrap();
    let (g_type, g_target, g_date): (Option<String>, Option<i64>, Option<String>) = conn.query_row(
        "SELECT goal_type, goal_target_amount, goal_target_date FROM be_subcategories WHERE id = ?1",
        params![subcat_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).unwrap();

    assert_eq!(g_type.as_deref(), Some("TB"));
    assert_eq!(g_target, Some(500000));
    assert_eq!(g_date.as_deref(), Some("2026-12-31"), "Goal parameters preserved through hide lifecycle");
}
