//! Tier 4: Real-world application full user journeys test suite (S01 to S06).
//! Tests 6 end-to-end user workflows matching TEST_INFRA.md specification:
//! - S01: New User Setup & First Paycheck Workflow
//! - S02: Credit Card Purchase & Debt Paydown Cycle
//! - S03: Monthly Budget Reorganization & Category Hide
//! - S04: Monthly Account Reconciliation & Statement Adjustment
//! - S05: Debt Consolidation, Account Closure & Transfer Unlink
//! - S06: Malformed Input & Edge Case Stress Workload

use super::common::setup_test_db;
use super::test_f04_date_parsing::parse_year_month_safe;
use crate::ledger::reconcile::reconcile_account;
use crate::ledger::transfers::{save_transaction, update_account_balances, SaveTransactionPayload};
use crate::seed::{CAT_IMMEDIATE_INCOME, DEFAULT_BUDGET_ID, PAYEE_STARTING_BALANCE};
use rusqlite::params;
use uuid::Uuid;

#[test]
fn test_tier4_s01_new_user_setup_and_first_paycheck_workflow() {
    let conn = setup_test_db();

    // 1. User creates checking account with starting balance $2,500.00 (2500000 milliunits)
    let acc_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_accounts (id, budget_id, account_type, account_name, on_budget) VALUES (?1, ?2, 'checking', 'Primary Checking', 1)",
        params![acc_id, DEFAULT_BUDGET_ID],
    ).unwrap();

    let start_payee_id: String = conn
        .query_row(
            "SELECT id FROM be_payees WHERE budget_id = ?1 AND internal_name = ?2",
            params![DEFAULT_BUDGET_ID, PAYEE_STARTING_BALANCE],
            |r| r.get(0),
        )
        .unwrap();

    let income_cat_id: String = conn
        .query_row(
            "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name = ?2",
            params![DEFAULT_BUDGET_ID, CAT_IMMEDIATE_INCOME],
            |r| r.get(0),
        )
        .unwrap();

    let tx_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_transactions (
            id, budget_id, entities_account_id, entities_payee_id, entities_subcategory_id, date, amount, cleared
        ) VALUES (?1, ?2, ?3, ?4, ?5, '2026-03-01', 2500000, 'Cleared')"#,
        params![tx_id, DEFAULT_BUDGET_ID, acc_id, start_payee_id, income_cat_id],
    ).unwrap();
    update_account_balances(&conn, &acc_id).unwrap();

    // 2. Verify account cleared balance
    let balance: i64 = conn
        .query_row(
            "SELECT cleared_balance FROM be_accounts WHERE id = ?1",
            params![acc_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(balance, 2500000);

    // 3. Assign budget across two envelopes: Rent ($1,200 = 1200000), Groceries ($400 = 400000)
    let rent_cat_id: String = conn
        .query_row(
            "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND name = 'Rent/Mortgage'",
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        )
        .unwrap();
    let groc_cat_id: String = conn
        .query_row(
            "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND name = 'Groceries'",
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        )
        .unwrap();

    let mb_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_monthly_budgets (id, budget_id, month) VALUES (?1, ?2, '2026-03-01')",
        params![mb_id, DEFAULT_BUDGET_ID],
    )
    .unwrap();

    conn.execute("INSERT INTO be_monthly_subcategory_budgets (id, budget_id, entities_monthly_budget_id, entities_subcategory_id, month, budgeted) VALUES (?1, ?2, ?3, ?4, '2026-03-01', 1200000)", params![Uuid::new_v4().to_string(), DEFAULT_BUDGET_ID, mb_id, rent_cat_id]).unwrap();
    conn.execute("INSERT INTO be_monthly_subcategory_budgets (id, budget_id, entities_monthly_budget_id, entities_subcategory_id, month, budgeted) VALUES (?1, ?2, ?3, ?4, '2026-03-01', 400000)", params![Uuid::new_v4().to_string(), DEFAULT_BUDGET_ID, mb_id, groc_cat_id]).unwrap();

    // Verify Ready to Assign via calculation engine:
    // Immediate income $2500.00 minus total budgeted $1600.00 = $900.00 (900000 milliunits)
    let total_budgeted: i64 = conn.query_row(
        "SELECT SUM(budgeted) FROM be_monthly_subcategory_budgets WHERE budget_id = ?1 AND month = '2026-03-01'",
        params![DEFAULT_BUDGET_ID],
        |r| r.get(0),
    ).unwrap();

    let mut months = std::collections::BTreeMap::new();
    months.insert(
        "2026-03-01".to_string(),
        crate::calc::monthly_calc::MonthSummaryInput {
            month: "2026-03-01".to_string(),
            immediate_income: balance,
            additional_to_be_budgeted: 0,
            total_budgeted,
            total_cash_overspent: 0,
        },
    );

    let timeline = crate::calc::monthly_calc::calculate_monthly_timeline(&months);
    let march_summary = timeline
        .get("2026-03-01")
        .expect("March summary must exist in timeline");
    assert_eq!(
        march_summary.available_to_budget, 900000,
        "Ready to Assign (available_to_budget) must equal income minus total budgeted allocations via calculation engine"
    );
}

#[test]
fn test_tier4_s02_credit_card_purchase_and_debt_paydown_cycle() {
    let conn = setup_test_db();

    // 1. Setup checking and CC accounts
    let chk_id = Uuid::new_v4().to_string();
    let cc_id = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO be_accounts (id, budget_id, account_type, account_name, on_budget) VALUES (?1, ?2, 'checking', 'Checking', 1)", params![chk_id, DEFAULT_BUDGET_ID]).unwrap();
    conn.execute("INSERT INTO be_accounts (id, budget_id, account_type, account_name, on_budget) VALUES (?1, ?2, 'CreditCard', 'Credit Card', 1)", params![cc_id, DEFAULT_BUDGET_ID]).unwrap();

    let chk_payee = Uuid::new_v4().to_string();
    let cc_payee = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO be_payees (id, budget_id, entities_account_id, name) VALUES (?1, ?2, ?3, 'Transfer : Checking')", params![chk_payee, DEFAULT_BUDGET_ID, chk_id]).unwrap();
    conn.execute("INSERT INTO be_payees (id, budget_id, entities_account_id, name) VALUES (?1, ?2, ?3, 'Transfer : Credit Card')", params![cc_payee, DEFAULT_BUDGET_ID, cc_id]).unwrap();

    // Checking starts with $500.00
    conn.execute("INSERT INTO be_transactions (id, budget_id, entities_account_id, date, amount, cleared) VALUES (?1, ?2, ?3, '2026-03-01', 500000, 'Cleared')", params![Uuid::new_v4().to_string(), DEFAULT_BUDGET_ID, chk_id]).unwrap();
    update_account_balances(&conn, &chk_id).unwrap();

    // 2. Budgeted expense on Groceries using Credit Card: -$120.00 (-120000)
    let groc_id: String = conn
        .query_row(
            "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND name = 'Groceries'",
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        )
        .unwrap();
    let cc_charge_payload = SaveTransactionPayload {
        id: None,
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: cc_id.clone(),
        payee_id: None,
        category_id: Some(groc_id),
        date: "2026-03-05".to_string(),
        amount_milliunits: -120000,
        memo: Some("Groceries on CC".to_string()),
        cleared: Some("Cleared".to_string()),
        approved: Some(true),
        flag: None,
        subtransactions: Vec::new(),
        allow_reconciled_mutation: false,
        payee_name: None,
        transfer_account_id: None,
    };
    let cc_charge_id = save_transaction(&conn, &cc_charge_payload).unwrap();

    // Verify transaction classification computed by save_transaction
    let (saved_cash, saved_credit): (i64, i64) = conn
        .query_row(
            "SELECT cash_amount, credit_amount FROM be_transactions WHERE id = ?1",
            params![cc_charge_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();
    assert_eq!(
        saved_cash, 0,
        "Credit card expense must classify cash_amount as 0"
    );
    assert_eq!(
        saved_credit, -120000,
        "Credit card expense must classify credit_amount as debt"
    );

    let cc_balance: i64 = conn
        .query_row(
            "SELECT cleared_balance FROM be_accounts WHERE id = ?1",
            params![cc_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(cc_balance, -120000, "Credit card balance reflects debt");

    // 3. User records payment from Checking to CC: $120.00
    let payment_payload = SaveTransactionPayload {
        id: None,
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: chk_id.clone(),
        payee_id: None,
        category_id: None,
        date: "2026-03-10".to_string(),
        amount_milliunits: -120000,
        memo: Some("Pay off CC".to_string()),
        cleared: Some("Cleared".to_string()),
        approved: Some(true),
        flag: None,
        subtransactions: Vec::new(),
        allow_reconciled_mutation: false,
        payee_name: None,
        transfer_account_id: Some(cc_id.clone()),
    };

    save_transaction(&conn, &payment_payload).unwrap();

    // Re-verify balances
    let chk_final: i64 = conn
        .query_row(
            "SELECT cleared_balance FROM be_accounts WHERE id = ?1",
            params![chk_id],
            |r| r.get(0),
        )
        .unwrap();
    let cc_final: i64 = conn
        .query_row(
            "SELECT (cleared_balance + uncleared_balance) FROM be_accounts WHERE id = ?1",
            params![cc_id],
            |r| r.get(0),
        )
        .unwrap();

    assert_eq!(
        chk_final, 380000,
        "Checking decreased by payment: 500000 - 120000 = 380000"
    );
    assert_eq!(
        cc_final, 0,
        "Credit card debt is paid off completely (-120000 + 120000 = 0)"
    );
}

#[test]
fn test_tier4_s03_monthly_budget_reorganization_and_category_hide() {
    let conn = setup_test_db();

    // Reorder two categories in Immediate Obligations
    let cat1: String = conn
        .query_row(
            "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND name = 'Electric'",
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        )
        .unwrap();
    let cat2: String = conn
        .query_row(
            "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND name = 'Water'",
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        )
        .unwrap();

    conn.execute(
        "UPDATE be_subcategories SET sortable_index = 100 WHERE id = ?1",
        params![cat1],
    )
    .unwrap();
    conn.execute(
        "UPDATE be_subcategories SET sortable_index = 200 WHERE id = ?1",
        params![cat2],
    )
    .unwrap();

    // Hide Water category
    conn.execute(
        "UPDATE be_subcategories SET is_hidden = 1 WHERE id = ?1",
        params![cat2],
    )
    .unwrap();

    // Verify Electric remains visible and Water is hidden
    let is_cat1_hidden: i32 = conn
        .query_row(
            "SELECT is_hidden FROM be_subcategories WHERE id = ?1",
            params![cat1],
            |r| r.get(0),
        )
        .unwrap();
    let is_cat2_hidden: i32 = conn
        .query_row(
            "SELECT is_hidden FROM be_subcategories WHERE id = ?1",
            params![cat2],
            |r| r.get(0),
        )
        .unwrap();

    assert_eq!(is_cat1_hidden, 0);
    assert_eq!(is_cat2_hidden, 1);

    // Unhide Water
    conn.execute(
        "UPDATE be_subcategories SET is_hidden = 0 WHERE id = ?1",
        params![cat2],
    )
    .unwrap();
    let is_cat2_unhidden: i32 = conn
        .query_row(
            "SELECT is_hidden FROM be_subcategories WHERE id = ?1",
            params![cat2],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(is_cat2_unhidden, 0);
}

#[test]
fn test_tier4_s04_monthly_account_reconciliation_and_statement_adjustment() {
    let conn = setup_test_db();
    let acc_id = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO be_accounts (id, budget_id, account_type, account_name, on_budget) VALUES (?1, ?2, 'checking', 'Checking', 1)", params![acc_id, DEFAULT_BUDGET_ID]).unwrap();

    // User adds 3 transactions: $100, $50, -$30
    for amt in [100000, 50000, -30000] {
        conn.execute(
            "INSERT INTO be_transactions (id, budget_id, entities_account_id, date, amount, cleared) VALUES (?1, ?2, ?3, '2026-03-01', ?4, 'Cleared')",
            params![Uuid::new_v4().to_string(), DEFAULT_BUDGET_ID, acc_id, amt],
        ).unwrap();
    }
    update_account_balances(&conn, &acc_id).unwrap();

    // Cleared balance is 120000 ($120.00). Bank statement says $125.00 (125000)
    let res = reconcile_account(&conn, DEFAULT_BUDGET_ID, &acc_id, 125000, true).unwrap();
    assert_eq!(res.adjustment_amount_milliunits, 5000);
    assert_eq!(res.reconciled_tx_count, 3);

    // Verify all transactions on account now locked to Reconciled
    let mut stmt = conn
        .prepare("SELECT cleared FROM be_transactions WHERE entities_account_id = ?1")
        .unwrap();
    let statuses: Vec<String> = stmt
        .query_map(params![acc_id], |r| r.get(0))
        .unwrap()
        .flatten()
        .collect();

    for s in statuses {
        assert_eq!(
            s, "Reconciled",
            "All transactions including adjustment must be Reconciled"
        );
    }

    let final_cleared: i64 = conn
        .query_row(
            "SELECT cleared_balance FROM be_accounts WHERE id = ?1",
            params![acc_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(
        final_cleared, 125000,
        "Account cleared_balance must equal target statement balance 125000 after reconciliation"
    );
}

#[test]
fn test_tier4_s05_debt_consolidation_account_closure_and_transfer_unlink() {
    let conn = setup_test_db();
    let chk_id = Uuid::new_v4().to_string();
    let loan_id = Uuid::new_v4().to_string();

    conn.execute("INSERT INTO be_accounts (id, budget_id, account_type, account_name, on_budget) VALUES (?1, ?2, 'checking', 'Checking', 1)", params![chk_id, DEFAULT_BUDGET_ID]).unwrap();
    conn.execute("INSERT INTO be_accounts (id, budget_id, account_type, account_name, on_budget) VALUES (?1, ?2, 'lineOfCredit', 'Personal Loan', 1)", params![loan_id, DEFAULT_BUDGET_ID]).unwrap();

    let p1 = Uuid::new_v4().to_string();
    let p2 = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO be_payees (id, budget_id, entities_account_id, name) VALUES (?1, ?2, ?3, 'Transfer : Checking')", params![p1, DEFAULT_BUDGET_ID, chk_id]).unwrap();
    conn.execute("INSERT INTO be_payees (id, budget_id, entities_account_id, name) VALUES (?1, ?2, ?3, 'Transfer : Personal Loan')", params![p2, DEFAULT_BUDGET_ID, loan_id]).unwrap();

    // Loan had -$500.00 balance
    conn.execute("INSERT INTO be_transactions (id, budget_id, entities_account_id, date, amount, cleared) VALUES (?1, ?2, ?3, '2026-01-01', -500000, 'Cleared')", params![Uuid::new_v4().to_string(), DEFAULT_BUDGET_ID, loan_id]).unwrap();
    update_account_balances(&conn, &loan_id).unwrap();

    // Pay off loan via transfer from checking
    let payoff_payload = SaveTransactionPayload {
        id: None,
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: chk_id,
        payee_id: None,
        category_id: None,
        date: "2026-03-01".to_string(),
        amount_milliunits: -500000,
        memo: Some("Payoff Loan".to_string()),
        cleared: Some("Cleared".to_string()),
        approved: Some(true),
        flag: None,
        subtransactions: Vec::new(),
        allow_reconciled_mutation: false,
        payee_name: None,
        transfer_account_id: Some(loan_id.clone()),
    };

    save_transaction(&conn, &payoff_payload).unwrap();

    // Verify loan balance is now 0
    let loan_bal: i64 = conn
        .query_row(
            "SELECT (cleared_balance + uncleared_balance) FROM be_accounts WHERE id = ?1",
            params![loan_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(loan_bal, 0);

    // Close the paid-off loan account via real backend logic
    crate::commands::close_account_in_db(&conn, &loan_id).unwrap();

    let (closed, tombstone): (i32, i32) = conn
        .query_row(
            "SELECT closed, is_tombstone FROM be_accounts WHERE id = ?1",
            params![loan_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();

    assert_eq!(closed, 1);
    assert_eq!(tombstone, 0, "Closed account preserved in database");
}

#[test]
fn test_tier4_s06_malformed_input_and_edge_case_stress_workload() {
    let conn = setup_test_db();
    let acc_id = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO be_accounts (id, budget_id, account_type, account_name) VALUES (?1, ?2, 'checking', 'Stress Acc')", params![acc_id, DEFAULT_BUDGET_ID]).unwrap();

    // 1. Safe date parsing across various malformed inputs
    for input in [
        "",
        "2026",
        "2026-13",
        "not-a-date",
        "2026-0",
        "---",
        "2026-05-32",
    ] {
        let (y, m) = parse_year_month_safe(input);
        assert!(
            y > 0 && (1..=12).contains(&m),
            "Date parser must handle {} safely",
            input
        );
    }

    // 2. Insert 50 transactions with various edge amounts (0, max, min, single milliunit)
    let edge_amounts = [0, 1, -1, 1000, -1000, 999999999, -999999999];
    for (i, amt) in edge_amounts.iter().cycle().take(50).enumerate() {
        let tx_id = Uuid::new_v4().to_string();
        conn.execute(
            r#"INSERT INTO be_transactions (
                id, budget_id, entities_account_id, date, amount, memo, cleared
            ) VALUES (?1, ?2, ?3, '2026-03-01', ?4, ?5, 'Cleared')"#,
            params![
                tx_id,
                DEFAULT_BUDGET_ID,
                acc_id,
                amt,
                format!("Edge Tx {}", i)
            ],
        )
        .unwrap();
    }

    update_account_balances(&conn, &acc_id).unwrap();

    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM be_transactions WHERE entities_account_id = ?1",
            params![acc_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(
        count, 50,
        "All 50 edge amount transactions must be successfully stored and counted"
    );
}
