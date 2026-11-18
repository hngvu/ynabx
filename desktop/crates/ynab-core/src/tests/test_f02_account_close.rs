//! F02: Account close non-destructive archive & zeroing adjustment test suite.
//! Tests account close (`closed = 1, is_closed = 1`), zeroing adjustment transaction
//! creation when balance != 0, zero-balance account closed without adjustment,
//! and transaction history preservation.

use super::common::setup_test_db;
use crate::commands;
use crate::ledger::transfers::update_account_balances;
use crate::seed::DEFAULT_BUDGET_ID;
use crate::AppState;
use rusqlite::params;
use std::sync::Mutex;
use uuid::Uuid;

// Helper to create an account
fn create_test_account(conn: &rusqlite::Connection, acc_type: &str, on_budget: bool) -> String {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_accounts (
            id, budget_id, account_type, account_name, on_budget, closed, is_closed, cleared_balance, uncleared_balance
        ) VALUES (?1, ?2, ?3, 'Test Account', ?4, 0, 0, 0, 0)"#,
        params![id, DEFAULT_BUDGET_ID, acc_type, if on_budget { 1 } else { 0 }],
    ).unwrap();
    id
}

// =========================================================================
// Tier 1: Primary Behavioral & Equivalence Tests
// =========================================================================

#[test]
fn test_f02_t1_close_account_marks_closed_flags() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let acc_id = create_test_account(&conn, "checking", true);
    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Close account via commands::close_account IPC command
    let res = commands::close_account(Some(acc_id.clone()), None, state.clone());
    assert!(res.is_ok(), "commands::close_account must succeed");

    let conn = state.db.lock().unwrap();
    let (closed, is_closed): (i32, i32) = conn
        .query_row(
            "SELECT closed, is_closed FROM be_accounts WHERE id = ?1",
            params![acc_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();

    assert_eq!(closed, 1, "closed must be set to 1");
    assert_eq!(is_closed, 1, "is_closed must be set to 1");
}

#[test]
fn test_f02_t1_close_account_preserves_account_record() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let acc_id = create_test_account(&conn, "checking", true);
    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Close account via commands::close_account
    commands::close_account(Some(acc_id.clone()), None, state.clone()).unwrap();

    let conn = state.db.lock().unwrap();
    let is_tombstone: i32 = conn
        .query_row(
            "SELECT is_tombstone FROM be_accounts WHERE id = ?1",
            params![acc_id],
            |r| r.get(0),
        )
        .expect("closed account record must still exist in SQLite");

    assert_eq!(
        is_tombstone, 0,
        "Account closure must be an archive, NOT a tombstone/delete"
    );
}

#[test]
fn test_f02_t1_close_account_preserves_transaction_history() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let acc_id = create_test_account(&conn, "checking", true);

    // Add 3 transactions
    for i in 1..=3 {
        let tx_id = Uuid::new_v4().to_string();
        conn.execute(
            r#"INSERT INTO be_transactions (
                id, budget_id, entities_account_id, date, amount, memo, cleared
            ) VALUES (?1, ?2, ?3, '2026-01-10', ?4, 'Tx History', 'Cleared')"#,
            params![tx_id, DEFAULT_BUDGET_ID, acc_id, i * 10000],
        )
        .unwrap();
    }
    update_account_balances(&conn, &acc_id).unwrap();

    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Close account via commands::close_account
    commands::close_account(Some(acc_id.clone()), None, state.clone()).unwrap();

    let conn = state.db.lock().unwrap();
    let tx_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM be_transactions WHERE entities_account_id = ?1 AND is_tombstone = 0 AND memo = 'Tx History'",
        params![acc_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(
        tx_count, 3,
        "All historical transactions must remain intact after account closure"
    );
}

#[test]
fn test_f02_t1_close_zero_balance_account_creates_no_adjustment() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let acc_id = create_test_account(&conn, "checking", true);

    let initial_tx_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM be_transactions", [], |r| r.get(0))
        .unwrap();

    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Account has 0 balance, close it via commands::close_account
    commands::close_account(Some(acc_id.clone()), None, state.clone()).unwrap();

    let conn = state.db.lock().unwrap();
    let final_tx_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM be_transactions", [], |r| r.get(0))
        .unwrap();
    assert_eq!(
        initial_tx_count, final_tx_count,
        "Zero-balance close must not create superfluous adjustment transactions"
    );
}

#[test]
fn test_f02_t1_reopen_closed_account_restores_active_status() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let acc_id = create_test_account(&conn, "checking", true);
    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    commands::close_account(Some(acc_id.clone()), None, state.clone()).unwrap();

    // Reopen
    {
        let conn = state.db.lock().unwrap();
        conn.execute(
            "UPDATE be_accounts SET closed = 0, is_closed = 0 WHERE id = ?1",
            params![acc_id],
        )
        .unwrap();
    }

    let conn = state.db.lock().unwrap();
    let (closed, is_closed): (i32, i32) = conn
        .query_row(
            "SELECT closed, is_closed FROM be_accounts WHERE id = ?1",
            params![acc_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();

    assert_eq!(closed, 0);
    assert_eq!(
        is_closed, 0,
        "Reopened account must have closed flags cleared"
    );
}

// =========================================================================
// Tier 2: Boundary & Corner Cases
// =========================================================================

#[test]
fn test_f02_t2_close_account_positive_balance_requires_zeroing_adjustment() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let acc_id = create_test_account(&conn, "checking", true);

    // Initial deposit of $100.00 (100000 milliunits)
    let tx_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_transactions (
            id, budget_id, entities_account_id, date, amount, cash_amount, credit_amount, memo, cleared
        ) VALUES (?1, ?2, ?3, '2026-01-01', 100000, 100000, 0, 'Initial Deposit', 'Cleared')"#,
        params![tx_id, DEFAULT_BUDGET_ID, acc_id],
    ).unwrap();
    update_account_balances(&conn, &acc_id).unwrap();

    // Verify current balance is 100000
    let balance: i64 = conn
        .query_row(
            "SELECT cleared_balance FROM be_accounts WHERE id = ?1",
            params![acc_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(balance, 100000);

    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // When closing an account with non-zero balance via commands::close_account,
    // the command automatically generates a zeroing adjustment transaction of -balance
    commands::close_account(Some(acc_id.clone()), None, state.clone()).unwrap();

    let conn = state.db.lock().unwrap();
    let (closed, final_balance): (i32, i64) = conn
        .query_row(
            "SELECT closed, cleared_balance FROM be_accounts WHERE id = ?1",
            params![acc_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();
    assert_eq!(closed, 1);
    assert_eq!(final_balance, 0, "Closed account balance must be zeroed");

    // Verify adjustment transaction was genuinely created by commands::close_account
    let (adj_amount, cash_amount, credit_amount): (i64, i64, i64) = conn.query_row(
        "SELECT amount, cash_amount, credit_amount FROM be_transactions WHERE entities_account_id = ?1 AND memo = 'Account Close Adjustment'",
        params![acc_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).unwrap();
    assert_eq!(adj_amount, -100000);
    assert_eq!(
        cash_amount, -100000,
        "Checking account adjustment must have cash_amount = delta"
    );
    assert_eq!(
        credit_amount, 0,
        "Checking account adjustment must have credit_amount = 0"
    );
}

#[test]
fn test_f02_t2_close_account_negative_balance_requires_zeroing_adjustment() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let acc_id = create_test_account(&conn, "checking", true);

    // Negative balance of -$50.00 (-50000 milliunits)
    let tx_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_transactions (
            id, budget_id, entities_account_id, date, amount, cash_amount, credit_amount, memo, cleared
        ) VALUES (?1, ?2, ?3, '2026-01-01', -50000, -50000, 0, 'Overdrawn', 'Cleared')"#,
        params![tx_id, DEFAULT_BUDGET_ID, acc_id],
    ).unwrap();
    update_account_balances(&conn, &acc_id).unwrap();

    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Close account via commands::close_account
    commands::close_account(Some(acc_id.clone()), None, state.clone()).unwrap();

    let conn = state.db.lock().unwrap();
    let (closed, final_balance): (i32, i64) = conn
        .query_row(
            "SELECT closed, cleared_balance FROM be_accounts WHERE id = ?1",
            params![acc_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();
    assert_eq!(closed, 1);
    assert_eq!(
        final_balance, 0,
        "Negative balance must be zeroed on closure"
    );

    let adj_amount: i64 = conn.query_row(
        "SELECT amount FROM be_transactions WHERE entities_account_id = ?1 AND memo = 'Account Close Adjustment'",
        params![acc_id],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(adj_amount, 50000);
}

#[test]
fn test_f02_t2_close_credit_card_account_with_debt() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let cc_acc_id = create_test_account(&conn, "CreditCard", true);

    // Credit card purchase: -$75.00 (-75000 milliunits)
    let tx_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_transactions (
            id, budget_id, entities_account_id, date, amount, cash_amount, credit_amount, memo, cleared
        ) VALUES (?1, ?2, ?3, '2026-01-01', -75000, 0, -75000, 'CC Charge', 'Cleared')"#,
        params![tx_id, DEFAULT_BUDGET_ID, cc_acc_id],
    ).unwrap();
    update_account_balances(&conn, &cc_acc_id).unwrap();

    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Close credit card with debt via commands::close_account
    commands::close_account(Some(cc_acc_id.clone()), None, state.clone()).unwrap();

    let conn = state.db.lock().unwrap();
    let (closed, balance): (i32, i64) = conn
        .query_row(
            "SELECT closed, cleared_balance FROM be_accounts WHERE id = ?1",
            params![cc_acc_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();

    assert_eq!(closed, 1);
    assert_eq!(balance, 0);

    // Verify credit card adjustment transaction has cash_amount = 0, credit_amount = delta (75000)
    let (adj_amount, cash_amount, credit_amount): (i64, i64, i64) = conn.query_row(
        "SELECT amount, cash_amount, credit_amount FROM be_transactions WHERE entities_account_id = ?1 AND memo = 'Account Close Adjustment'",
        params![cc_acc_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).unwrap();
    assert_eq!(adj_amount, 75000);
    assert_eq!(
        cash_amount, 0,
        "Credit card adjustment must have cash_amount = 0"
    );
    assert_eq!(
        credit_amount, 75000,
        "Credit card adjustment must have credit_amount = delta"
    );
}

#[test]
fn test_f02_t2_close_tracking_off_budget_account() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let track_id = create_test_account(&conn, "otherAsset", false);
    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    commands::close_account(Some(track_id.clone()), None, state.clone()).unwrap();

    let conn = state.db.lock().unwrap();
    let (on_budget, closed): (i32, i32) = conn
        .query_row(
            "SELECT on_budget, closed FROM be_accounts WHERE id = ?1",
            params![track_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();

    assert_eq!(on_budget, 0, "Tracking account must remain off-budget");
    assert_eq!(closed, 1, "Tracking account must be closed");
}

#[test]
fn test_f02_t2_close_account_with_uncleared_transactions() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let acc_id = create_test_account(&conn, "checking", true);

    // Uncleared check
    let tx_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_transactions (
            id, budget_id, entities_account_id, date, amount, memo, cleared
        ) VALUES (?1, ?2, ?3, '2026-01-01', -30000, 'Uncleared Check', 'Uncleared')"#,
        params![tx_id, DEFAULT_BUDGET_ID, acc_id],
    )
    .unwrap();
    update_account_balances(&conn, &acc_id).unwrap();

    // Verify uncleared balance is -30000
    let (cleared, uncleared): (i64, i64) = conn
        .query_row(
            "SELECT cleared_balance, uncleared_balance FROM be_accounts WHERE id = ?1",
            params![acc_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();
    assert_eq!(cleared, 0);
    assert_eq!(uncleared, -30000);

    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Close account via commands::close_account
    commands::close_account(Some(acc_id.clone()), None, state.clone()).unwrap();

    let conn = state.db.lock().unwrap();
    let (closed, cleared_after, uncleared_after): (i32, i64, i64) = conn
        .query_row(
            "SELECT closed, cleared_balance, uncleared_balance FROM be_accounts WHERE id = ?1",
            params![acc_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .unwrap();
    assert_eq!(closed, 1);
    assert_eq!(
        cleared_after + uncleared_after,
        0,
        "Working balance must be zeroed"
    );

    let tx_cleared_status: String = conn
        .query_row(
            "SELECT cleared FROM be_transactions WHERE id = ?1",
            params![tx_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(
        tx_cleared_status, "Uncleared",
        "Transaction cleared status preserved on closure"
    );
}
