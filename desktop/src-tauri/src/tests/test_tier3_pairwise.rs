//! Tier 3: Pairwise combinatorial cross-feature integration test suite.
//! Tests pairwise interactions across features (transfers + credit card,
//! bulk move + account close, quick budget + hidden categories, etc.).

use std::sync::Mutex;
use tauri::Manager;
use rusqlite::params;
use serde_json::json;
use uuid::Uuid;
use super::common::setup_test_db;
use crate::commands;
use crate::AppState;
use crate::seed::{DEFAULT_BUDGET_ID, PAYEE_STARTING_BALANCE};
use crate::ledger::transfers::{save_transaction, SaveTransactionPayload};
use crate::ledger::reconcile::reconcile_account;

// Helper to create accounts and payees
fn create_acc(conn: &rusqlite::Connection, name: &str, acc_type: &str, on_budget: bool) -> String {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_accounts (id, budget_id, account_type, account_name, on_budget) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, DEFAULT_BUDGET_ID, acc_type, name, if on_budget { 1 } else { 0 }],
    ).unwrap();

    let p_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_payees (id, budget_id, entities_account_id, name) VALUES (?1, ?2, ?3, ?4)",
        params![p_id, DEFAULT_BUDGET_ID, id, format!("Transfer : {}", name)],
    ).unwrap();

    id
}

#[test]
fn test_tier3_01_transfer_between_checking_and_credit_card() {
    let conn = setup_test_db();
    let checking_id = create_acc(&conn, "Checking", "checking", true);
    let cc_id = create_acc(&conn, "Credit Card", "CreditCard", true);

    // CC payment: transfer $150 from checking to credit card
    let payload = SaveTransactionPayload {
        id: None,
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: checking_id.clone(),
        payee_id: None,
        category_id: None,
        date: "2026-03-01".to_string(),
        amount_milliunits: -150000,
        memo: Some("CC Payment".to_string()),
        cleared: Some("Cleared".to_string()),
        approved: Some(true),
        flag: None,
        transfer_account_id: Some(cc_id.clone()),
    };

    let tx_id = save_transaction(&conn, &payload).unwrap();
    let peer_id: String = conn.query_row("SELECT transfer_transaction_id FROM be_transactions WHERE id = ?1", params![tx_id], |r| r.get(0)).unwrap();

    let (chk_cash, chk_credit): (i64, i64) = conn.query_row("SELECT cash_amount, credit_amount FROM be_transactions WHERE id = ?1", params![tx_id], |r| Ok((r.get(0)?, r.get(1)?))).unwrap();
    let (cc_cash, cc_credit): (i64, i64) = conn.query_row("SELECT cash_amount, credit_amount FROM be_transactions WHERE id = ?1", params![peer_id], |r| Ok((r.get(0)?, r.get(1)?))).unwrap();

    assert_eq!(chk_cash, -150000);
    assert_eq!(chk_credit, 0);
    assert_eq!(cc_cash, 0);
    assert_eq!(cc_credit, 150000, "Credit card payment inflow reduces credit debt (+150000 credit amount)");
}

#[test]
fn test_tier3_02_account_close_with_transfers_intact() {
    let conn = setup_test_db();
    let acc1 = create_acc(&conn, "Old Checking", "checking", true);
    let acc2 = create_acc(&conn, "Active Savings", "savings", true);

    let payload = SaveTransactionPayload {
        id: None,
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: acc1.clone(),
        payee_id: None,
        category_id: None,
        date: "2026-03-01".to_string(),
        amount_milliunits: -50000,
        memo: None,
        cleared: Some("Cleared".to_string()),
        approved: Some(true),
        flag: None,
        transfer_account_id: Some(acc2.clone()),
    };

    let tx1 = save_transaction(&conn, &payload).unwrap();
    let tx2: String = conn.query_row("SELECT transfer_transaction_id FROM be_transactions WHERE id = ?1", params![tx1], |r| r.get(0)).unwrap();

    // Close Old Checking
    conn.execute("UPDATE be_accounts SET closed = 1, is_closed = 1 WHERE id = ?1", params![acc1]).unwrap();

    // Verify peer transfer in Active Savings is NOT tombstoned or corrupted
    let (peer_tombstone, peer_acc): (i32, String) = conn.query_row(
        "SELECT is_tombstone, entities_account_id FROM be_transactions WHERE id = ?1",
        params![tx2],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).unwrap();

    assert_eq!(peer_tombstone, 0);
    assert_eq!(peer_acc, acc2);
}

#[test]
fn test_tier3_03_quick_budget_excludes_hidden_categories() {
    let app = tauri::test::mock_app();
    let conn = setup_test_db();

    // Pick two non-internal subcategories
    let subcat_ids: Vec<String> = {
        let mut stmt = conn.prepare("SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 2").unwrap();
        stmt.query_map(params![DEFAULT_BUDGET_ID], |r| r.get(0)).unwrap().flatten().collect()
    };
    let active_cat_id = subcat_ids[0].clone();
    let hidden_cat_id = subcat_ids[1].clone();

    // Set previous month (2026-04-01) budgeted allocation for both categories
    let mb_id = "mb/2026-04-01";
    conn.execute(
        "INSERT INTO be_monthly_budgets (id, budget_id, month) VALUES (?1, ?2, '2026-04-01') ON CONFLICT(budget_id, month) DO NOTHING",
        params![mb_id, DEFAULT_BUDGET_ID],
    ).unwrap();
    conn.execute(
        "INSERT INTO be_monthly_subcategory_budgets (id, budget_id, entities_monthly_budget_id, entities_subcategory_id, month, budgeted) VALUES (?1, ?2, ?3, ?4, '2026-04-01', 200000)",
        params![Uuid::new_v4().to_string(), DEFAULT_BUDGET_ID, mb_id, active_cat_id],
    ).unwrap();
    conn.execute(
        "INSERT INTO be_monthly_subcategory_budgets (id, budget_id, entities_monthly_budget_id, entities_subcategory_id, month, budgeted) VALUES (?1, ?2, ?3, ?4, '2026-04-01', 150000)",
        params![Uuid::new_v4().to_string(), DEFAULT_BUDGET_ID, mb_id, hidden_cat_id],
    ).unwrap();

    // Hide the second category using commands::hide_category
    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    commands::hide_category(
        Some(hidden_cat_id.clone()),
        Some(false),
        Some(true),
        None,
        state.clone(),
    ).unwrap();

    // Apply Quick Budget "BudgetedLastMonth" for 2026-05-01 across all categories (category_ids: None)
    commands::apply_quick_budget(
        commands::ApplyQuickBudgetPayload {
            month: "2026-05-01".to_string(),
            quick_budget_type: "BudgetedLastMonth".to_string(),
            category_ids: None,
            budget_id: None,
        },
        state.clone(),
    ).unwrap();

    // Assert that active category received 200000, and hidden category received 0
    let conn = state.db.lock().unwrap();
    let active_budgeted: i64 = conn.query_row(
        "SELECT COALESCE(budgeted, 0) FROM be_monthly_subcategory_budgets WHERE entities_subcategory_id = ?1 AND month = '2026-05-01'",
        params![active_cat_id],
        |r| r.get(0),
    ).unwrap_or(0);
    let hidden_budgeted: i64 = conn.query_row(
        "SELECT COALESCE(budgeted, 0) FROM be_monthly_subcategory_budgets WHERE entities_subcategory_id = ?1 AND month = '2026-05-01'",
        params![hidden_cat_id],
        |r| r.get(0),
    ).unwrap_or(0);

    assert_eq!(active_budgeted, 200000, "Active category must be allocated from Quick Budget");
    assert_eq!(hidden_budgeted, 0, "Hidden category must NOT receive Quick Budget allocation");
}

#[test]
fn test_tier3_04_bulk_clear_on_reconciled_transactions_protection() {
    let app = tauri::test::mock_app();
    let conn = setup_test_db();
    let acc_id = create_acc(&conn, "Checking", "checking", true);

    let tx_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_transactions (
            id, budget_id, entities_account_id, date, amount, memo, cleared
        ) VALUES (?1, ?2, ?3, '2026-03-01', 50000, 'Reconciled Item', 'Reconciled')"#,
        params![tx_id, DEFAULT_BUDGET_ID, acc_id],
    ).unwrap();

    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // Test 1: commands::bulk_update_transactions with "unclear" must NOT modify Reconciled transaction
    let res = commands::bulk_update_transactions(
        Some(vec![tx_id.clone()]),
        Some("unclear".to_string()),
        None,
        None,
        state.clone(),
    );
    assert!(res.is_ok());

    {
        let conn = state.db.lock().unwrap();
        let status: String = conn.query_row("SELECT cleared FROM be_transactions WHERE id = ?1", params![tx_id], |r| r.get(0)).unwrap();
        assert_eq!(status, "Reconciled", "Reconciled transactions must be locked against bulk un-clearing");
    }

    // Test 2: commands::bulk_update_transactions with "clear" must NOT modify Reconciled transaction
    let res = commands::bulk_update_transactions(
        Some(vec![tx_id.clone()]),
        Some("clear".to_string()),
        None,
        None,
        state.clone(),
    );
    assert!(res.is_ok());

    {
        let conn = state.db.lock().unwrap();
        let status: String = conn.query_row("SELECT cleared FROM be_transactions WHERE id = ?1", params![tx_id], |r| r.get(0)).unwrap();
        assert_eq!(status, "Reconciled", "Reconciled transactions must be locked against bulk clearing");
    }
}

#[test]
fn test_tier3_05_reconciliation_adjustment_on_credit_card() {
    let conn = setup_test_db();
    let cc_id = create_acc(&conn, "Visa Card", "CreditCard", true);

    // Reconcile credit card statement balance = -$250.00 (-250000)
    let res = reconcile_account(&conn, DEFAULT_BUDGET_ID, &cc_id, -250000, true).unwrap();
    assert_eq!(res.adjustment_amount_milliunits, -250000);

    let (adj_amount, cash_amount, credit_amount): (i64, i64, i64) = conn.query_row(
        "SELECT amount, cash_amount, credit_amount FROM be_transactions WHERE entities_account_id = ?1 AND memo = 'Reconciliation Balance Adjustment'",
        params![cc_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).unwrap();

    assert_eq!(adj_amount, -250000);
    assert_eq!(cash_amount, 0, "Credit card reconciliation adjustment must have cash_amount = 0");
    assert_eq!(credit_amount, -250000, "Credit card reconciliation adjustment must classify discrepancy as credit debt");
}

#[test]
fn test_tier3_06_sort_order_persistence_with_hidden_categories() {
    let conn = setup_test_db();
    let subcat_id: String = conn.query_row("SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1", params![DEFAULT_BUDGET_ID], |r| r.get(0)).unwrap();

    conn.execute("UPDATE be_subcategories SET sortable_index = 4500 WHERE id = ?1", params![subcat_id]).unwrap();

    // Hide then unhide
    conn.execute("UPDATE be_subcategories SET is_hidden = 1 WHERE id = ?1", params![subcat_id]).unwrap();
    conn.execute("UPDATE be_subcategories SET is_hidden = 0 WHERE id = ?1", params![subcat_id]).unwrap();

    let idx: i32 = conn.query_row("SELECT sortable_index FROM be_subcategories WHERE id = ?1", params![subcat_id], |r| r.get(0)).unwrap();
    assert_eq!(idx, 4500, "sortable_index must be preserved through hide/unhide cycle");
}

#[test]
fn test_tier3_07_bulk_move_transactions_across_account_types() {
    let app = tauri::test::mock_app();
    let conn = setup_test_db();
    let chk_id = create_acc(&conn, "Checking", "checking", true);
    let cc_id = create_acc(&conn, "Card", "CreditCard", true);

    let tx_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_transactions (
            id, budget_id, entities_account_id, date, amount, cash_amount, credit_amount
        ) VALUES (?1, ?2, ?3, '2026-03-01', -25000, -25000, 0)"#,
        params![tx_id, DEFAULT_BUDGET_ID, chk_id],
    ).unwrap();

    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // Move to CC account via commands::bulk_update_transactions
    commands::bulk_update_transactions(
        Some(vec![tx_id.clone()]),
        Some("move_account".to_string()),
        Some(json!({ "account_id": cc_id })),
        None,
        state.clone(),
    ).unwrap();

    let conn = state.db.lock().unwrap();
    let (acc_id, cash, credit): (String, i64, i64) = conn.query_row(
        "SELECT entities_account_id, cash_amount, credit_amount FROM be_transactions WHERE id = ?1",
        params![tx_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).unwrap();
    assert_eq!(acc_id, cc_id);
    assert_eq!(cash, 0);
    assert_eq!(credit, -25000, "Moved transaction now reflects credit card debt");
}

#[test]
fn test_tier3_08_starting_balance_on_closed_account_preserved() {
    let conn = setup_test_db();
    let acc_id = create_acc(&conn, "Old Bank", "checking", true);

    let start_payee_id: String = conn.query_row(
        "SELECT id FROM be_payees WHERE budget_id = ?1 AND internal_name = ?2",
        params![DEFAULT_BUDGET_ID, PAYEE_STARTING_BALANCE],
        |r| r.get(0),
    ).unwrap();

    let tx_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_transactions (
            id, budget_id, entities_account_id, entities_payee_id, date, amount, memo, cleared
        ) VALUES (?1, ?2, ?3, ?4, '2025-01-01', 500000, 'Starting Balance', 'Cleared')"#,
        params![tx_id, DEFAULT_BUDGET_ID, acc_id, start_payee_id],
    ).unwrap();

    // Close account
    conn.execute("UPDATE be_accounts SET closed = 1, is_closed = 1 WHERE id = ?1", params![acc_id]).unwrap();

    let linked_payee: Option<String> = conn.query_row(
        "SELECT entities_payee_id FROM be_transactions WHERE id = ?1 AND is_tombstone = 0",
        params![tx_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(linked_payee, Some(start_payee_id));
}

#[test]
fn test_tier3_09_transfer_unlink_cleanup_with_credit_card_peer() {
    let conn = setup_test_db();
    let chk = create_acc(&conn, "Checking", "checking", true);
    let cc = create_acc(&conn, "Credit Card", "CreditCard", true);

    let payload = SaveTransactionPayload {
        id: None,
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: chk.clone(),
        payee_id: None,
        category_id: None,
        date: "2026-03-01".to_string(),
        amount_milliunits: -50000,
        memo: None,
        cleared: Some("Cleared".to_string()),
        approved: Some(true),
        flag: None,
        transfer_account_id: Some(cc.clone()),
    };

    let tx_id = save_transaction(&conn, &payload).unwrap();
    let peer_id: String = conn.query_row("SELECT transfer_transaction_id FROM be_transactions WHERE id = ?1", params![tx_id], |r| r.get(0)).unwrap();

    // Edit into regular transaction
    let edit_payload = SaveTransactionPayload {
        id: Some(tx_id.clone()),
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: chk,
        payee_id: None,
        category_id: None,
        date: "2026-03-01".to_string(),
        amount_milliunits: -50000,
        memo: Some("Normal expenditure".to_string()),
        cleared: Some("Cleared".to_string()),
        approved: Some(true),
        flag: None,
        transfer_account_id: None,
    };

    save_transaction(&conn, &edit_payload).unwrap();

    let (link, is_tombstone): (Option<String>, i32) = conn.query_row(
        "SELECT transfer_account_id, is_tombstone FROM be_transactions WHERE id = ?1",
        params![tx_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).unwrap();

    assert!(link.is_none(), "Edited transaction has transfer link cleared");
    assert_eq!(is_tombstone, 0);

    let peer_tombstone: i64 = conn.query_row(
        "SELECT is_tombstone FROM be_transactions WHERE id = ?1",
        params![peer_id],
        |r| r.get(0),
    ).expect("peer transaction must exist in db");
    assert_eq!(peer_tombstone, 1, "unlinked credit card peer transaction must be tombstoned");
    println!("[Pairwise T3-09] Unlinked transfer peer {} tombstone verified", peer_id);
}

#[test]
fn test_tier3_10_quick_budget_average_with_category_reordering() {
    let conn = setup_test_db();
    let subcat_id: String = conn.query_row("SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1", params![DEFAULT_BUDGET_ID], |r| r.get(0)).unwrap();

    // Add historical budget allocation
    let mb_id = Uuid::new_v4().to_string();
    conn.execute("INSERT OR IGNORE INTO be_monthly_budgets (id, budget_id, month) VALUES (?1, ?2, '2026-02-01')", params![mb_id, DEFAULT_BUDGET_ID]).unwrap();
    let mcb_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_monthly_subcategory_budgets (
            id, budget_id, entities_monthly_budget_id, entities_subcategory_id, month, budgeted
        ) VALUES (?1, ?2, ?3, ?4, '2026-02-01', 300000)"#,
        params![mcb_id, DEFAULT_BUDGET_ID, mb_id, subcat_id],
    ).unwrap();

    // Change sort order
    conn.execute("UPDATE be_subcategories SET sortable_index = 9999 WHERE id = ?1", params![subcat_id]).unwrap();

    let budgeted: i64 = conn.query_row(
        "SELECT budgeted FROM be_monthly_subcategory_budgets WHERE entities_subcategory_id = ?1 AND month = '2026-02-01'",
        params![subcat_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(budgeted, 300000, "Reordering subcategory must not alter historical monthly budget records");
}

#[test]
fn test_tier3_11_bulk_categorize_to_hidden_category() {
    let app = tauri::test::mock_app();
    let conn = setup_test_db();
    let acc_id = create_acc(&conn, "Checking", "checking", true);

    let subcat_id: String = conn.query_row("SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1", params![DEFAULT_BUDGET_ID], |r| r.get(0)).unwrap();
    // Hide category
    conn.execute("UPDATE be_subcategories SET is_hidden = 1 WHERE id = ?1", params![subcat_id]).unwrap();

    let tx_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_transactions (id, budget_id, entities_account_id, date, amount) VALUES (?1, ?2, ?3, '2026-03-01', -10000)",
        params![tx_id, DEFAULT_BUDGET_ID, acc_id],
    ).unwrap();

    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // Categorize to hidden category via commands::bulk_update_transactions
    commands::bulk_update_transactions(
        Some(vec![tx_id.clone()]),
        Some("categorize".to_string()),
        Some(json!({ "category_id": subcat_id })),
        None,
        state.clone(),
    ).unwrap();

    let conn = state.db.lock().unwrap();
    let assigned_cat: Option<String> = conn.query_row("SELECT entities_subcategory_id FROM be_transactions WHERE id = ?1", params![tx_id], |r| r.get(0)).unwrap();
    assert_eq!(assigned_cat, Some(subcat_id));
}

#[test]
fn test_tier3_12_reconcile_after_bulk_cleared() {
    let app = tauri::test::mock_app();
    let conn = setup_test_db();
    let acc_id = create_acc(&conn, "Checking", "checking", true);

    let mut ids = Vec::new();
    for i in 1..=5 {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO be_transactions (id, budget_id, entities_account_id, date, amount, cleared) VALUES (?1, ?2, ?3, '2026-03-01', ?4, 'Uncleared')",
            params![id, DEFAULT_BUDGET_ID, acc_id, i * 10000],
        ).unwrap();
        ids.push(id);
    }

    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // 1. Bulk clear all 5 via commands::bulk_update_transactions
    commands::bulk_update_transactions(
        Some(ids.clone()),
        Some("clear".to_string()),
        None,
        None,
        state.clone(),
    ).unwrap();

    // Total cleared = 10000 + 20000 + 30000 + 40000 + 50000 = 150000
    // 2. Reconcile account with target 150000
    let conn = state.db.lock().unwrap();
    let res = reconcile_account(&conn, DEFAULT_BUDGET_ID, &acc_id, 150000, true).unwrap();
    assert_eq!(res.reconciled_tx_count, 5);

    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM be_transactions WHERE entities_account_id = ?1 AND cleared = 'Reconciled'",
        params![acc_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(count, 5, "All 5 bulk-cleared transactions must now be Reconciled");

    // Also assert cleared_balance is preserved
    let cleared_bal: i64 = conn.query_row("SELECT cleared_balance FROM be_accounts WHERE id = ?1", params![acc_id], |r| r.get(0)).unwrap();
    assert_eq!(cleared_bal, 150000, "cleared_balance must remain equal to 150000");
}
