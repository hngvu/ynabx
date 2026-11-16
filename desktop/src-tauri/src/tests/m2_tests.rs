use std::sync::Mutex;
use tauri::Manager;
use rusqlite::params;
use serde_json::json;

use crate::commands::{
    self, calculate_category_historical_stats, parse_year_month, safe_ym_prefix,
    ApplyQuickBudgetPayload, CreateAccountPayload,
};
use crate::ledger::transfers::{determine_cash_credit_amounts, SaveTransactionPayload};
use crate::seed::{DEFAULT_BUDGET_ID, PAYEE_STARTING_BALANCE};
use crate::AppState;
use super::common;

#[test]
fn test_item1_hide_category_non_destructive() {
    let app = tauri::test::mock_app();
    let conn = common::setup_test_db();
    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // 1. Get a subcategory ID from seeded categories
    let subcat_id: String = {
        let conn = state.db.lock().unwrap();
        conn.query_row(
            "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND is_hidden = 0 LIMIT 1",
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        ).unwrap()
    };

    // Hide subcategory
    let res = commands::hide_category(Some(subcat_id.clone()), Some(false), Some(true), None, state.clone());
    assert!(res.is_ok());

    {
        let conn = state.db.lock().unwrap();
        let (hidden, tombstone): (i32, i32) = conn.query_row(
            "SELECT is_hidden, is_tombstone FROM be_subcategories WHERE id = ?1",
            params![subcat_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        ).unwrap();
        assert_eq!(hidden, 1, "Category should be hidden");
        assert_eq!(tombstone, 0, "Category should NOT be tombstoned");
    }

    // Unhide subcategory
    let res = commands::hide_category(Some(subcat_id.clone()), Some(false), Some(false), None, state.clone());
    assert!(res.is_ok());

    {
        let conn = state.db.lock().unwrap();
        let hidden: i32 = conn.query_row(
            "SELECT is_hidden FROM be_subcategories WHERE id = ?1",
            params![subcat_id],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(hidden, 0, "Category should be unhidden");
    }

    // Hide master category
    let master_id: String = {
        let conn = state.db.lock().unwrap();
        conn.query_row(
            "SELECT id FROM be_master_categories WHERE budget_id = ?1 AND is_hidden = 0 LIMIT 1",
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        ).unwrap()
    };

    let res = commands::hide_category(Some(master_id.clone()), Some(true), Some(true), None, state.clone());
    assert!(res.is_ok());

    {
        let conn = state.db.lock().unwrap();
        let (hidden, tombstone): (i32, i32) = conn.query_row(
            "SELECT is_hidden, is_tombstone FROM be_master_categories WHERE id = ?1",
            params![master_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        ).unwrap();
        assert_eq!(hidden, 1, "Master category should be hidden");
        assert_eq!(tombstone, 0, "Master category should NOT be tombstoned");
    }
}

#[test]
fn test_item2_close_account_non_destructive_with_balance_adjustment() {
    let app = tauri::test::mock_app();
    let conn = common::setup_test_db();
    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // 1. Create account with positive balance ($150.00 = 150000 milliunits)
    let acc = commands::create_account(
        CreateAccountPayload {
            name: "Test Checking".to_string(),
            account_type: "checking".to_string(),
            balance_milliunits: 150000,
            on_budget: Some(true),
            note: None,
        },
        state.clone(),
        None,
    ).unwrap();

    // Verify initial balance
    {
        let conn = state.db.lock().unwrap();
        let (cleared, closed): (i64, i32) = conn.query_row(
            "SELECT cleared_balance, closed FROM be_accounts WHERE id = ?1",
            params![acc.id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        ).unwrap();
        assert_eq!(cleared, 150000);
        assert_eq!(closed, 0);
    }

    // 2. Close account
    let close_res = commands::close_account(Some(acc.id.clone()), None, state.clone());
    assert!(close_res.is_ok());

    // 3. Verify account is marked closed and balance zeroed out via adjustment transaction
    {
        let conn = state.db.lock().unwrap();
        let (cleared, uncleared, closed, is_closed): (i64, i64, i32, i32) = conn.query_row(
            "SELECT cleared_balance, uncleared_balance, closed, is_closed FROM be_accounts WHERE id = ?1",
            params![acc.id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        ).unwrap();
        assert_eq!(cleared, 0, "Working balance must be 0 after closure");
        assert_eq!(uncleared, 0);
        assert_eq!(closed, 1);
        assert_eq!(is_closed, 1);

        // Verify adjustment transaction was created
        let adj_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM be_transactions WHERE entities_account_id = ?1 AND memo = 'Account Close Adjustment' AND is_tombstone = 0",
            params![acc.id],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(adj_count, 1, "Should create 1 adjustment transaction");

        // Verify starting balance transaction is preserved (not tombstoned)
        let starting_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM be_transactions WHERE entities_account_id = ?1 AND memo = 'Starting Balance' AND is_tombstone = 0",
            params![acc.id],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(starting_count, 1, "Starting balance transaction must NOT be deleted");
    }
}

#[test]
fn test_item3_payee_internal_naming_alignment() {
    let app = tauri::test::mock_app();
    let conn = common::setup_test_db();
    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // Create an account with a starting balance
    let acc = commands::create_account(
        CreateAccountPayload {
            name: "Savings Account".to_string(),
            account_type: "savings".to_string(),
            balance_milliunits: 50000,
            on_budget: Some(true),
            note: None,
        },
        state.clone(),
        None,
    ).unwrap();

    // Verify the transaction has a valid entities_payee_id referencing StartingBalancePayee
    {
        let conn = state.db.lock().unwrap();
        let payee_internal_name: Option<String> = conn.query_row(
            r#"SELECT p.internal_name
               FROM be_transactions t
               JOIN be_payees p ON t.entities_payee_id = p.id
               WHERE t.entities_account_id = ?1 AND t.memo = 'Starting Balance'"#,
            params![acc.id],
            |r| r.get(0),
        ).unwrap();

        assert_eq!(payee_internal_name.as_deref(), Some(PAYEE_STARTING_BALANCE));
    }
}

#[test]
fn test_item4_date_parsing_robustness() {
    // Normal cases
    assert_eq!(parse_year_month("2026-05-01"), (2026, 5));
    assert_eq!(parse_year_month("2026-12"), (2026, 12));
    assert_eq!(parse_year_month("2025-01"), (2025, 1));

    // Malformed and edge cases: should NOT panic, should fallback gracefully
    assert_eq!(parse_year_month(""), (2026, 1));
    assert_eq!(parse_year_month("invalid"), (2026, 1));
    assert_eq!(parse_year_month("2026"), (2026, 1));
    assert_eq!(parse_year_month("2026-99"), (2026, 12)); // clamped to 12
    assert_eq!(parse_year_month("2026-00"), (2026, 1));  // clamped to 1

    // Safe YM prefix
    assert_eq!(safe_ym_prefix("2026-05-01"), "2026-05");
    assert_eq!(safe_ym_prefix("2026-11"), "2026-11");
    assert_eq!(safe_ym_prefix(""), "2026-01");
    assert_eq!(safe_ym_prefix("abc"), "2026-01");
}

#[test]
fn test_item5_credit_card_ledger_classification() {
    // Case-insensitive matching for credit card types
    assert_eq!(determine_cash_credit_amounts("creditCard", 50000), (0, 50000));
    assert_eq!(determine_cash_credit_amounts("CreditCard", 50000), (0, 50000));
    assert_eq!(determine_cash_credit_amounts("creditcard", 50000), (0, 50000));
    assert_eq!(determine_cash_credit_amounts("lineOfCredit", 50000), (0, 50000));
    assert_eq!(determine_cash_credit_amounts("LINEOFCREDIT", 50000), (0, 50000));
    assert_eq!(determine_cash_credit_amounts("credit", 50000), (0, 50000));

    // Cash accounts
    assert_eq!(determine_cash_credit_amounts("checking", 50000), (50000, 0));
    assert_eq!(determine_cash_credit_amounts("savings", 50000), (50000, 0));
    assert_eq!(determine_cash_credit_amounts("cash", 50000), (50000, 0));
}

#[test]
fn test_item6_transfer_unlink_cleanup() {
    let app = tauri::test::mock_app();
    let conn = common::setup_test_db();
    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // 1. Create Checking account and Savings account
    let checking = commands::create_account(
        CreateAccountPayload {
            name: "Checking".to_string(),
            account_type: "checking".to_string(),
            balance_milliunits: 0,
            on_budget: Some(true),
            note: None,
        },
        state.clone(),
        None,
    ).unwrap();

    let savings = commands::create_account(
        CreateAccountPayload {
            name: "Savings".to_string(),
            account_type: "savings".to_string(),
            balance_milliunits: 0,
            on_budget: Some(true),
            note: None,
        },
        state.clone(),
        None,
    ).unwrap();

    // 2. Create a transfer from Checking to Savings: $100.00 (100000 milliunits)
    let transfer_tx_id = commands::save_transaction(
        SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            account_id: checking.id.clone(),
            payee_id: None,
            category_id: None,
            date: "2026-05-10".to_string(),
            amount_milliunits: -100000,
            memo: Some("Transfer to Savings".to_string()),
            cleared: Some("Cleared".to_string()),
            approved: Some(true),
            flag: None,
            transfer_account_id: Some(savings.id.clone()),
        },
        state.clone(),
    ).unwrap();

    // Verify both accounts have their balances updated
    {
        let conn = state.db.lock().unwrap();
        let chk_bal: i64 = conn.query_row("SELECT cleared_balance FROM be_accounts WHERE id = ?1", params![checking.id], |r| r.get(0)).unwrap();
        let sav_uncleared: i64 = conn.query_row("SELECT uncleared_balance FROM be_accounts WHERE id = ?1", params![savings.id], |r| r.get(0)).unwrap();
        assert_eq!(chk_bal, -100000);
        assert_eq!(sav_uncleared, 100000);

        // Counterpart exists in Savings
        let peer_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM be_transactions WHERE entities_account_id = ?1 AND is_tombstone = 0",
            params![savings.id],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(peer_count, 1);
    }

    // 3. Edit Checking transaction into a NON-transfer (remove transfer_account_id)
    let updated_tx_id = commands::save_transaction(
        SaveTransactionPayload {
            id: Some(transfer_tx_id.clone()),
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            account_id: checking.id.clone(),
            payee_id: None,
            category_id: None,
            date: "2026-05-10".to_string(),
            amount_milliunits: -100000,
            memo: Some("Regular Expense Now".to_string()),
            cleared: Some("Cleared".to_string()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
        },
        state.clone(),
    ).unwrap();
    assert_eq!(updated_tx_id, transfer_tx_id);

    // 4. Verify counterpart transaction in Savings was soft-deleted and Savings balance reset to 0
    {
        let conn = state.db.lock().unwrap();
        let (sav_cleared, sav_uncleared): (i64, i64) = conn.query_row(
            "SELECT cleared_balance, uncleared_balance FROM be_accounts WHERE id = ?1",
            params![savings.id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        ).unwrap();
        assert_eq!(sav_cleared + sav_uncleared, 0, "Savings account working balance must be 0 after transfer is unlinked");

        let active_sav_txs: i64 = conn.query_row(
            "SELECT COUNT(*) FROM be_transactions WHERE entities_account_id = ?1 AND is_tombstone = 0",
            params![savings.id],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(active_sav_txs, 0, "Peer transaction in Savings must be soft-deleted");

        let tombstoned_sav_txs: i64 = conn.query_row(
            "SELECT COUNT(*) FROM be_transactions WHERE entities_account_id = ?1 AND is_tombstone = 1",
            params![savings.id],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(tombstoned_sav_txs, 1, "Tombstone flag must be set on peer transaction");
    }
}

#[test]
fn test_item7_bulk_update_transactions() {
    let app = tauri::test::mock_app();
    let conn = common::setup_test_db();
    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    let acc1 = commands::create_account(
        CreateAccountPayload {
            name: "Account 1".to_string(),
            account_type: "checking".to_string(),
            balance_milliunits: 0,
            on_budget: Some(true),
            note: None,
        },
        state.clone(),
        None,
    ).unwrap();

    let acc2 = commands::create_account(
        CreateAccountPayload {
            name: "Account 2".to_string(),
            account_type: "savings".to_string(),
            balance_milliunits: 0,
            on_budget: Some(true),
            note: None,
        },
        state.clone(),
        None,
    ).unwrap();

    // Create 2 uncleared transactions in acc1
    let tx1 = commands::save_transaction(
        SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            account_id: acc1.id.clone(),
            payee_id: None,
            category_id: None,
            date: "2026-05-01".to_string(),
            amount_milliunits: -50000,
            memo: Some("tx1".to_string()),
            cleared: Some("Uncleared".to_string()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
        },
        state.clone(),
    ).unwrap();

    let tx2 = commands::save_transaction(
        SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            account_id: acc1.id.clone(),
            payee_id: None,
            category_id: None,
            date: "2026-05-02".to_string(),
            amount_milliunits: -30000,
            memo: Some("tx2".to_string()),
            cleared: Some("Uncleared".to_string()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
        },
        state.clone(),
    ).unwrap();

    let tx_ids = vec![tx1.clone(), tx2.clone()];

    // 1. Bulk clear
    commands::bulk_update_transactions(
        Some(tx_ids.clone()),
        Some("clear".to_string()),
        None,
        None,
        state.clone(),
    ).unwrap();

    {
        let conn = state.db.lock().unwrap();
        let cleared_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM be_transactions WHERE id IN (?1, ?2) AND cleared = 'Cleared'",
            params![tx1, tx2],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(cleared_count, 2);

        let acc1_cleared: i64 = conn.query_row("SELECT cleared_balance FROM be_accounts WHERE id = ?1", params![acc1.id], |r| r.get(0)).unwrap();
        assert_eq!(acc1_cleared, -80000);
    }

    // 2. Bulk unclear
    commands::bulk_update_transactions(
        Some(tx_ids.clone()),
        Some("unclear".to_string()),
        None,
        None,
        state.clone(),
    ).unwrap();

    {
        let conn = state.db.lock().unwrap();
        let uncleared_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM be_transactions WHERE id IN (?1, ?2) AND cleared = 'Uncleared'",
            params![tx1, tx2],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(uncleared_count, 2);
    }

    // 3. Bulk flag
    commands::bulk_update_transactions(
        Some(tx_ids.clone()),
        Some("flag".to_string()),
        Some(json!({ "flag": "Green" })),
        None,
        state.clone(),
    ).unwrap();

    {
        let conn = state.db.lock().unwrap();
        let flagged_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM be_transactions WHERE id IN (?1, ?2) AND flag = 'Green'",
            params![tx1, tx2],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(flagged_count, 2);
    }

    // 4. Bulk move_account from acc1 to acc2
    commands::bulk_update_transactions(
        Some(tx_ids.clone()),
        Some("move_account".to_string()),
        Some(json!({ "account_id": acc2.id })),
        None,
        state.clone(),
    ).unwrap();

    {
        let conn = state.db.lock().unwrap();
        let moved_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM be_transactions WHERE id IN (?1, ?2) AND entities_account_id = ?3",
            params![tx1, tx2, acc2.id],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(moved_count, 2);

        // Account balances recalculated
        let acc1_bal: i64 = conn.query_row("SELECT uncleared_balance FROM be_accounts WHERE id = ?1", params![acc1.id], |r| r.get(0)).unwrap();
        let acc2_bal: i64 = conn.query_row("SELECT uncleared_balance FROM be_accounts WHERE id = ?1", params![acc2.id], |r| r.get(0)).unwrap();
        assert_eq!(acc1_bal, 0);
        assert_eq!(acc2_bal, -80000);
    }
}

#[test]
fn test_item8_quick_budget_historical_calculations() {
    let app = tauri::test::mock_app();
    let conn = common::setup_test_db();
    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // 1. Get a non-internal user subcategory and an account
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
            balance_milliunits: 500000,
            on_budget: Some(true),
            note: None,
        },
        state.clone(),
        None,
    ).unwrap();

    // 2. Set prior month (2026-04-01) budgeted allocation: $200.00 = 200000
    {
        let conn = state.db.lock().unwrap();
        conn.execute(
            r#"INSERT INTO be_monthly_budgets (id, budget_id, month) VALUES ('mb/2026-04-01', ?1, '2026-04-01')
               ON CONFLICT(budget_id, month) DO NOTHING"#,
            params![DEFAULT_BUDGET_ID],
        ).unwrap();

        conn.execute(
            r#"INSERT INTO be_monthly_subcategory_budgets (
                   id, budget_id, entities_monthly_budget_id, entities_subcategory_id, month, budgeted
               ) VALUES ('mcb/2026-04-01/1', ?1, 'mb/2026-04-01', ?2, '2026-04-01', 200000)"#,
            params![DEFAULT_BUDGET_ID, subcat_id],
        ).unwrap();
    }

    // 3. Add spending transactions in prior month (2026-04-15): $75.00 outflow = -75000
    commands::save_transaction(
        SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            account_id: acc.id.clone(),
            payee_id: None,
            category_id: Some(subcat_id.clone()),
            date: "2026-04-15".to_string(),
            amount_milliunits: -75000,
            memo: Some("Groceries".to_string()),
            cleared: Some("Cleared".to_string()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
        },
        state.clone(),
    ).unwrap();

    // 4. Test calculate_category_historical_stats for target month 2026-05-01
    {
        let conn = state.db.lock().unwrap();
        let (b_lm, s_lm, a_b, a_s) = calculate_category_historical_stats(&conn, &subcat_id, "2026-05-01");
        assert_eq!(b_lm, 200000, "budgeted_last_month must equal 200000");
        assert_eq!(s_lm, 75000, "spent_last_month must equal 75000");
        assert_eq!(a_b, 200000, "average_budgeted must equal 200000");
        assert_eq!(a_s, 75000, "average_spent must equal 75000");
    }

    // 5. Test get_budget_month returns CategoryDto with these populated
    let summary = commands::get_budget_month("2026-05-01".to_string(), state.clone(), None).unwrap();
    let mut found = false;
    for group in summary.category_groups {
        for cat in group.categories {
            if cat.id == subcat_id {
                assert_eq!(cat.budgeted_last_month, 200000);
                assert_eq!(cat.spent_last_month, 75000);
                assert_eq!(cat.average_budgeted, 200000);
                assert_eq!(cat.average_spent, 75000);
                found = true;
            }
        }
    }
    assert!(found, "Target category must be in summary with historical stats");

    // 6. Test apply_quick_budget with SpentLastMonth and AverageSpent assigns positive amounts
    let qb_summary = commands::apply_quick_budget(
        ApplyQuickBudgetPayload {
            month: "2026-05-01".to_string(),
            quick_budget_type: "SpentLastMonth".to_string(),
            category_ids: Some(vec![subcat_id.clone()]),
            budget_id: None,
        },
        state.clone(),
    ).unwrap();

    let mut qb_assigned = 0i64;
    for group in qb_summary.category_groups {
        for cat in group.categories {
            if cat.id == subcat_id {
                qb_assigned = cat.assigned_milliunits;
            }
        }
    }
    assert_eq!(qb_assigned, 75000, "SpentLastMonth must assign positive 75000");

    let qb_summary2 = commands::apply_quick_budget(
        ApplyQuickBudgetPayload {
            month: "2026-05-01".to_string(),
            quick_budget_type: "AverageSpent".to_string(),
            category_ids: Some(vec![subcat_id.clone()]),
            budget_id: None,
        },
        state.clone(),
    ).unwrap();

    let mut qb_assigned2 = 0i64;
    for group in qb_summary2.category_groups {
        for cat in group.categories {
            if cat.id == subcat_id {
                qb_assigned2 = cat.assigned_milliunits;
            }
        }
    }
    assert_eq!(qb_assigned2, 75000, "AverageSpent must assign positive 75000");
}

#[test]
fn test_item9_payee_management_ipc() {
    let app = tauri::test::mock_app();
    let conn = common::setup_test_db();
    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // 1. Get payees
    let payees = commands::get_payees(None, state.clone()).unwrap();
    assert!(!payees.is_empty(), "Should return seeded system payees");

    let starting_payee = payees.iter().find(|p| p.name == "Starting Balance").expect("Starting Balance payee must exist");
    let payee_id = starting_payee.id.clone();

    // 2. Update payee name
    commands::update_payee(
        Some(payee_id.clone()),
        Some("Initial Balance".to_string()),
        None,
        state.clone(),
    ).unwrap();

    {
        let conn = state.db.lock().unwrap();
        let name: String = conn.query_row("SELECT name FROM be_payees WHERE id = ?1", params![payee_id], |r| r.get(0)).unwrap();
        assert_eq!(name, "Initial Balance");
    }

    // 3. Delete payee (soft-delete)
    commands::delete_payee(Some(payee_id.clone()), None, state.clone()).unwrap();

    {
        let conn = state.db.lock().unwrap();
        let tombstone: i32 = conn.query_row("SELECT is_tombstone FROM be_payees WHERE id = ?1", params![payee_id], |r| r.get(0)).unwrap();
        assert_eq!(tombstone, 1, "Payee must be soft-deleted with tombstone = 1");
    }
}

#[test]
fn test_item10_sort_order_persistence() {
    let app = tauri::test::mock_app();
    let conn = common::setup_test_db();
    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    let acc1 = commands::create_account(
        CreateAccountPayload {
            name: "A Account".to_string(),
            account_type: "checking".to_string(),
            balance_milliunits: 0,
            on_budget: Some(true),
            note: None,
        },
        state.clone(),
        None,
    ).unwrap();

    let acc2 = commands::create_account(
        CreateAccountPayload {
            name: "B Account".to_string(),
            account_type: "savings".to_string(),
            balance_milliunits: 0,
            on_budget: Some(true),
            note: None,
        },
        state.clone(),
        None,
    ).unwrap();

    // Reorder accounts: put acc2 first, acc1 second
    commands::reorder_accounts(
        Some(vec![acc2.id.clone(), acc1.id.clone()]),
        None,
        state.clone(),
    ).unwrap();

    {
        let conn = state.db.lock().unwrap();
        let idx2: i32 = conn.query_row("SELECT sortable_index FROM be_accounts WHERE id = ?1", params![acc2.id], |r| r.get(0)).unwrap();
        let idx1: i32 = conn.query_row("SELECT sortable_index FROM be_accounts WHERE id = ?1", params![acc1.id], |r| r.get(0)).unwrap();
        assert!(idx2 < idx1, "acc2 must have lower sortable_index than acc1");
    }

    // Reorder categories
    let (g1, g2): (String, String) = {
        let conn = state.db.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id FROM be_master_categories WHERE budget_id = ?1 AND deletable = 1 LIMIT 2").unwrap();
        let mut rows = stmt.query(params![DEFAULT_BUDGET_ID]).unwrap();
        (rows.next().unwrap().unwrap().get(0).unwrap(), rows.next().unwrap().unwrap().get(0).unwrap())
    };

    commands::reorder_categories(
        Some(DEFAULT_BUDGET_ID.to_string()),
        Some(vec![g2.clone(), g1.clone()]),
        None,
        None,
        state.clone(),
    ).unwrap();

    {
        let conn = state.db.lock().unwrap();
        let g2_idx: i32 = conn.query_row("SELECT sortable_index FROM be_master_categories WHERE id = ?1", params![g2], |r| r.get(0)).unwrap();
        let g1_idx: i32 = conn.query_row("SELECT sortable_index FROM be_master_categories WHERE id = ?1", params![g1], |r| r.get(0)).unwrap();
        assert!(g2_idx < g1_idx, "g2 must have lower sortable_index than g1");
    }
}

#[test]
fn test_item11_fresh_start_reset() {
    let app = tauri::test::mock_app();
    let conn = common::setup_test_db();
    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    // 1. Create account with starting balance ($500.00 = 500000 milliunits)
    let acc = commands::create_account(
        CreateAccountPayload {
            name: "Main Checking".to_string(),
            account_type: "checking".to_string(),
            balance_milliunits: 500000,
            on_budget: Some(true),
            note: None,
        },
        state.clone(),
        None,
    ).unwrap();

    // 2. Add an expense transaction ($50.00 outflow = -50000)
    let subcat_id: String = {
        let conn = state.db.lock().unwrap();
        conn.query_row(
            "SELECT id FROM be_subcategories WHERE budget_id = ?1 LIMIT 1",
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        ).unwrap()
    };

    commands::save_transaction(
        SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            account_id: acc.id.clone(),
            payee_id: None,
            category_id: Some(subcat_id.clone()),
            date: "2026-05-05".to_string(),
            amount_milliunits: -50000,
            memo: Some("Expense to be reset".to_string()),
            cleared: Some("Cleared".to_string()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
        },
        state.clone(),
    ).unwrap();

    // Set a budget allocation of 100000
    commands::set_category_assigned(
        commands::SetAssignedPayload {
            budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
            month: "2026-05-01".to_string(),
            category_id: subcat_id.clone(),
            assigned_milliunits: 100000,
        },
        state.clone(),
    ).unwrap();

    // Verify pre-reset balance: 500000 - 50000 = 450000
    {
        let conn = state.db.lock().unwrap();
        let bal: i64 = conn.query_row("SELECT cleared_balance FROM be_accounts WHERE id = ?1", params![acc.id], |r| r.get(0)).unwrap();
        assert_eq!(bal, 450000);
    }

    // 3. Perform Fresh Start
    let fresh_id = commands::make_fresh_start(
        Some(DEFAULT_BUDGET_ID.to_string()),
        Some("Fresh Budget 2026".to_string()),
        None,
        state.clone(),
    ).unwrap();
    assert_eq!(fresh_id, DEFAULT_BUDGET_ID);

    // 4. Verify Fresh Start results:
    {
        let conn = state.db.lock().unwrap();
        // A. Budget name updated
        let budget_name: String = conn.query_row("SELECT budget_name FROM be_budgets WHERE id = ?1", params![DEFAULT_BUDGET_ID], |r| r.get(0)).unwrap();
        assert_eq!(budget_name, "Fresh Budget 2026");

        // B. Non-starting transactions soft-deleted (tombstoned)
        let non_starting_active: i64 = conn.query_row(
            r#"SELECT COUNT(*) FROM be_transactions
               WHERE budget_id = ?1 AND is_tombstone = 0 AND memo != 'Starting Balance'"#,
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(non_starting_active, 0, "All non-starting transactions must be tombstoned");

        // C. Starting balance transaction remains active
        let starting_active: i64 = conn.query_row(
            r#"SELECT COUNT(*) FROM be_transactions
               WHERE budget_id = ?1 AND is_tombstone = 0 AND memo = 'Starting Balance'"#,
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(starting_active, 1, "Starting balance transaction must remain active");

        // D. Account balance reset back to starting balance ($500.00 = 500000)
        let bal: i64 = conn.query_row("SELECT cleared_balance FROM be_accounts WHERE id = ?1", params![acc.id], |r| r.get(0)).unwrap();
        assert_eq!(bal, 500000, "Account balance must reset to starting balance");

        // E. Category allocations reset to 0
        let alloc_sum: i64 = conn.query_row(
            "SELECT COALESCE(SUM(budgeted), 0) FROM be_monthly_subcategory_budgets WHERE budget_id = ?1",
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(alloc_sum, 0, "All monthly category allocations must reset to 0");

        // F. Accounts and categories still exist
        let acc_count: i64 = conn.query_row("SELECT COUNT(*) FROM be_accounts WHERE budget_id = ?1 AND is_tombstone = 0", params![DEFAULT_BUDGET_ID], |r| r.get(0)).unwrap();
        assert!(acc_count >= 1);
        let cat_count: i64 = conn.query_row("SELECT COUNT(*) FROM be_subcategories WHERE budget_id = ?1 AND is_tombstone = 0", params![DEFAULT_BUDGET_ID], |r| r.get(0)).unwrap();
        assert!(cat_count > 0);
    }
}

#[test]
fn test_item12_account_name_in_register() {
    let app = tauri::test::mock_app();
    let conn = common::setup_test_db();
    app.manage(AppState { db: Mutex::new(conn) });
    let state = app.state::<AppState>();

    let acc = commands::create_account(
        CreateAccountPayload {
            name: "Primary Checking".to_string(),
            account_type: "checking".to_string(),
            balance_milliunits: 100000,
            on_budget: Some(true),
            note: None,
        },
        state.clone(),
        None,
    ).unwrap();

    // Query all transactions (None account_id)
    let txs = commands::get_transactions(None, state.clone(), None).unwrap();
    let starting_tx = txs.iter().find(|t| t.account_id == acc.id).expect("Should find transaction for created account");

    assert_eq!(starting_tx.account_name.as_deref(), Some("Primary Checking"));
    assert_eq!(starting_tx.account_name_camel.as_deref(), Some("Primary Checking"));
}
