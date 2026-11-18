//! F07: Register bulk operations (clear, unclear, flag, move, categorize) test suite.
//! Tests bulk transaction updates on SQLite: bulk clear, bulk unclear, bulk flag,
//! bulk move to account, bulk categorize across empty, 1, and 50+ item sets.

use super::common::setup_test_db;
use crate::commands;
use crate::seed::DEFAULT_BUDGET_ID;
use crate::AppState;
use rusqlite::params;
use serde_json::json;
use std::sync::Mutex;
use uuid::Uuid;

fn create_account_and_txs(conn: &rusqlite::Connection, count: usize) -> (String, Vec<String>) {
    let acc_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_accounts (id, budget_id, account_type, account_name) VALUES (?1, ?2, 'checking', 'Bulk Test Acc')",
        params![acc_id, DEFAULT_BUDGET_ID],
    ).unwrap();

    let mut ids = Vec::new();
    for i in 0..count {
        let tx_id = Uuid::new_v4().to_string();
        conn.execute(
            r#"INSERT INTO be_transactions (
                id, budget_id, entities_account_id, date, amount, memo, cleared, flag
            ) VALUES (?1, ?2, ?3, '2026-03-01', ?4, 'Bulk Item', 'Uncleared', NULL)"#,
            params![tx_id, DEFAULT_BUDGET_ID, acc_id, (i as i64 + 1) * 1000],
        )
        .unwrap();
        ids.push(tx_id);
    }

    (acc_id, ids)
}

// =========================================================================
// Tier 1: Primary Behavioral & Equivalence Tests
// =========================================================================

#[test]
fn test_f07_t1_bulk_clear_transactions() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let (_, tx_ids) = create_account_and_txs(&conn, 5);
    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Bulk clear via commands::bulk_update_transactions
    let res = commands::bulk_update_transactions(
        Some(tx_ids.clone()),
        Some("clear".to_string()),
        None,
        None,
        state.clone(),
    );
    assert!(res.is_ok());

    let conn = state.db.lock().unwrap();
    let cleared_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM be_transactions WHERE cleared = 'Cleared' AND is_tombstone = 0",
            [],
            |r| r.get(0),
        )
        .unwrap();

    assert_eq!(cleared_count, 5, "All 5 transactions must be Cleared");
}

#[test]
fn test_f07_t1_bulk_unclear_transactions() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let (_, tx_ids) = create_account_and_txs(&conn, 4);
    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Start by clearing all
    commands::bulk_update_transactions(
        Some(tx_ids.clone()),
        Some("clear".to_string()),
        None,
        None,
        state.clone(),
    )
    .unwrap();

    // Bulk unclear via commands::bulk_update_transactions
    let res = commands::bulk_update_transactions(
        Some(tx_ids.clone()),
        Some("unclear".to_string()),
        None,
        None,
        state.clone(),
    );
    assert!(res.is_ok());

    let conn = state.db.lock().unwrap();
    let uncleared_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM be_transactions WHERE cleared = 'Uncleared' AND is_tombstone = 0",
            [],
            |r| r.get(0),
        )
        .unwrap();

    assert_eq!(uncleared_count, 4);
}

#[test]
fn test_f07_t1_bulk_set_flag() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let (_, tx_ids) = create_account_and_txs(&conn, 3);
    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Bulk set flag via commands::bulk_update_transactions
    let res = commands::bulk_update_transactions(
        Some(tx_ids.clone()),
        Some("flag".to_string()),
        Some(json!({ "flag": "Red" })),
        None,
        state.clone(),
    );
    assert!(res.is_ok());

    let conn = state.db.lock().unwrap();
    let red_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM be_transactions WHERE flag = 'Red'",
            [],
            |r| r.get(0),
        )
        .unwrap();

    assert_eq!(
        red_count, 3,
        "All selected transactions must be flagged Red"
    );
}

#[test]
fn test_f07_t1_bulk_move_to_account() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let (acc1, tx_ids) = create_account_and_txs(&conn, 3);

    let acc2 = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_accounts (id, budget_id, account_type, account_name) VALUES (?1, ?2, 'savings', 'Target Savings')",
        params![acc2, DEFAULT_BUDGET_ID],
    ).unwrap();

    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Bulk move from acc1 to acc2 via commands::bulk_update_transactions
    let res = commands::bulk_update_transactions(
        Some(tx_ids.clone()),
        Some("move_account".to_string()),
        Some(json!({ "account_id": acc2 })),
        None,
        state.clone(),
    );
    assert!(res.is_ok());

    let conn = state.db.lock().unwrap();
    let count_in_acc2: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM be_transactions WHERE entities_account_id = ?1",
            params![acc2],
            |r| r.get(0),
        )
        .unwrap();

    assert_eq!(
        count_in_acc2, 3,
        "Transactions must now reside in account 2"
    );

    let acc1_bal: i64 = conn
        .query_row(
            "SELECT uncleared_balance FROM be_accounts WHERE id = ?1",
            params![acc1],
            |r| r.get(0),
        )
        .unwrap();
    let acc2_bal: i64 = conn
        .query_row(
            "SELECT uncleared_balance FROM be_accounts WHERE id = ?1",
            params![acc2],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(acc1_bal, 0);
    assert_eq!(acc2_bal, 6000); // 1000 + 2000 + 3000
}

#[test]
fn test_f07_t1_bulk_categorize() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let (_, tx_ids) = create_account_and_txs(&conn, 4);

    let subcat_id: String = conn.query_row(
        "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1",
        params![DEFAULT_BUDGET_ID],
        |r| r.get(0),
    ).unwrap();

    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Bulk categorize via commands::bulk_update_transactions
    let res = commands::bulk_update_transactions(
        Some(tx_ids.clone()),
        Some("categorize".to_string()),
        Some(json!({ "category_id": subcat_id })),
        None,
        state.clone(),
    );
    assert!(res.is_ok());

    let conn = state.db.lock().unwrap();
    let categorized_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM be_transactions WHERE entities_subcategory_id = ?1",
            params![subcat_id],
            |r| r.get(0),
        )
        .unwrap();

    assert_eq!(
        categorized_count, 4,
        "All 4 transactions must be assigned to subcategory"
    );
}

// =========================================================================
// Tier 2: Boundary & Corner Cases (Empty, Single, 100+ Stress)
// =========================================================================

#[test]
fn test_f07_t2_bulk_ops_empty_list() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    let empty_ids: Vec<String> = vec![];

    // Bulk clear on empty list must be a safe no-op
    let res = commands::bulk_update_transactions(
        Some(empty_ids),
        Some("clear".to_string()),
        None,
        None,
        state.clone(),
    );
    assert!(res.is_ok(), "Empty bulk update must succeed as no-op");
}

#[test]
fn test_f07_t2_bulk_ops_single_item() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let (_, tx_ids) = create_account_and_txs(&conn, 1);
    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    let res = commands::bulk_update_transactions(
        Some(vec![tx_ids[0].clone()]),
        Some("flag".to_string()),
        Some(json!({ "flag": "Green" })),
        None,
        state.clone(),
    );
    assert!(res.is_ok());

    let conn = state.db.lock().unwrap();
    let flag: Option<String> = conn
        .query_row(
            "SELECT flag FROM be_transactions WHERE id = ?1",
            params![tx_ids[0]],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(flag.as_deref(), Some("Green"));
}

#[test]
fn test_f07_t2_bulk_ops_large_batch_stress() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let (acc_id, tx_ids) = create_account_and_txs(&conn, 100);
    assert_eq!(tx_ids.len(), 100);

    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Stress test: bulk clear 100 transactions via commands::bulk_update_transactions
    let res = commands::bulk_update_transactions(
        Some(tx_ids.clone()),
        Some("clear".to_string()),
        None,
        None,
        state.clone(),
    );
    assert!(res.is_ok());

    let conn = state.db.lock().unwrap();
    let cleared_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM be_transactions WHERE entities_account_id = ?1 AND cleared = 'Cleared'",
        params![acc_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(
        cleared_count, 100,
        "100 item stress batch must successfully update all rows"
    );
}

#[test]
fn test_f07_t2_bulk_clear_flag_to_none() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let (_, tx_ids) = create_account_and_txs(&conn, 3);
    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Set flags first
    commands::bulk_update_transactions(
        Some(tx_ids.clone()),
        Some("flag".to_string()),
        Some(json!({ "flag": "Blue" })),
        None,
        state.clone(),
    )
    .unwrap();

    // Bulk remove flag (pass "none" in payload)
    commands::bulk_update_transactions(
        Some(tx_ids.clone()),
        Some("flag".to_string()),
        Some(json!({ "flag": "none" })),
        None,
        state.clone(),
    )
    .unwrap();

    let conn = state.db.lock().unwrap();
    let flagged_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM be_transactions WHERE flag IS NOT NULL",
            [],
            |r| r.get(0),
        )
        .unwrap();

    assert_eq!(
        flagged_count, 0,
        "Bulk clearing flags must reset all flags to NULL"
    );
}

#[test]
fn test_f07_t2_bulk_tombstoned_transactions_ignored() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let (_, tx_ids) = create_account_and_txs(&conn, 2);

    // Tombstone one transaction
    conn.execute(
        "UPDATE be_transactions SET is_tombstone = 1 WHERE id = ?1",
        params![tx_ids[0]],
    )
    .unwrap();

    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Invoke real IPC command bulk_update_transactions
    let res = commands::bulk_update_transactions(
        Some(tx_ids.clone()),
        Some("clear".to_string()),
        None,
        None,
        state.clone(),
    );
    assert!(res.is_ok());

    let conn = state.db.lock().unwrap();
    let tombstone_status: String = conn
        .query_row(
            "SELECT cleared FROM be_transactions WHERE id = ?1",
            params![tx_ids[0]],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(
        tombstone_status, "Uncleared",
        "Tombstoned transactions must not be modified by bulk actions"
    );

    let active_status: String = conn
        .query_row(
            "SELECT cleared FROM be_transactions WHERE id = ?1",
            params![tx_ids[1]],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(
        active_status, "Cleared",
        "Active transactions must be cleared by bulk actions"
    );
}

#[test]
fn test_f07_t2_bulk_reconciled_transactions_ignored() {
    let app = super::common::mock_app();
    let conn = setup_test_db();
    let (_, tx_ids) = create_account_and_txs(&conn, 2);

    // Reconcile one transaction
    conn.execute(
        "UPDATE be_transactions SET cleared = 'Reconciled' WHERE id = ?1",
        params![tx_ids[0]],
    )
    .unwrap();

    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Invoke bulk unclear
    let res = commands::bulk_update_transactions(
        Some(tx_ids.clone()),
        Some("unclear".to_string()),
        None,
        None,
        state.clone(),
    );
    assert!(res.is_ok());

    let conn = state.db.lock().unwrap();
    let rec_status: String = conn
        .query_row(
            "SELECT cleared FROM be_transactions WHERE id = ?1",
            params![tx_ids[0]],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(
        rec_status, "Reconciled",
        "Reconciled transactions must NOT be modified by bulk actions"
    );
}
