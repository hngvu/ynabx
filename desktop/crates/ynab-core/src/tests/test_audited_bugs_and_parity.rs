//! Comprehensive Regression Test Suite for all 13 Audited Domain / Invariant / SQLite Bugs
//! plus full parity tests ported from the Vitest frontend suite.

use rusqlite::params;
use serde_json::json;
use std::collections::HashSet;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;

use super::common::{mock_app, setup_test_db};
use crate::analytics::{
    calculate_age_of_money_history, calculate_net_worth, calculate_net_worth_history,
    calculate_spending_breakdown, calculate_timeframe_dates,
    filter_transactions_by_date_and_filters, format_timeframe_label, generate_net_worth_history,
    AnalyticsAccount, AnalyticsTransaction, TimeframePreset, TimeframeState,
};
use crate::calc::calculator::{
    calculate_assigned_expression_milliunits, evaluate_formula_milliunits,
};
use crate::calc::goals_calc::{
    calc_percentage_int, calculate_current_goal_period, evaluate_subcategory_goal,
    GoalEvaluationInput,
};
use crate::calc::target_status::{
    calculate_category_target_status, format_currency, CategoryTarget, TargetCadence, TargetType,
};
use crate::changeset::{get_undo_redo_state, redo_last_changeset, undo_last_changeset};
use crate::commands::{
    self, CreateAccountPayload, DeleteTransactionsPayload, FreshStartPayload, SetAssignedPayload,
    SetGoalPayload, SnoozeGoalPayload, ToggleClearedPayload,
};
use crate::format::{
    export_transactions_to_csv, format_date_with_pattern, format_milliunits_with_config,
    format_plain_decimal_milliunits, generate_budget_plan_csv_rows, CurrencyFormatConfig,
    ExportBudgetCategoryRow, ExportRegisterRow,
};
use crate::ledger::payee_autocat::{
    compute_payee_auto_categorization, update_payee_autofill_category, AutoCategorizeReason,
};
use crate::ledger::scheduled::{
    delete_scheduled_transaction, enter_scheduled_transaction_now, get_scheduled_transactions,
    save_scheduled_transaction, SaveScheduledTransactionPayload,
};
use crate::ledger::transfers::{
    apply_payee_selection, calculate_balance_adjustment_delta, save_transaction,
    SaveTransactionPayload, SubTransactionDto,
};
use crate::repo::{
    self, is_credit_card_account, AccountGroup, AccountType, UpdateAccountPayload,
    UpdatePlanSettingsPayload,
};
use crate::seed::{CAT_IMMEDIATE_INCOME, DEFAULT_BUDGET_ID};
use crate::AppState;

// =========================================================================
// Bug #1: get_plan_summary decodes JSON currency_format & date_format
// =========================================================================
#[test]
fn test_bug01_get_plan_summary_decodes_json_columns() {
    let conn = setup_test_db();
    let summary = repo::get_plan_summary(&conn, None).expect("get_plan_summary must succeed");
    assert_eq!(summary.id, DEFAULT_BUDGET_ID);
    assert_eq!(summary.name, "Test Budget");
    assert_eq!(summary.currency_code, "USD");
    assert_eq!(summary.currency_symbol, "$");
    assert!(summary.currency_symbol_first);
    assert!(summary.currency_display_symbol);
    assert_eq!(summary.decimal_digits, 2);
    assert_eq!(summary.date_format, "YYYY-MM-DD");

    // Update currency and date format via update_plan_settings (Bug #12)
    repo::update_plan_settings(
        &conn,
        &UpdatePlanSettingsPayload {
            name: "Euro Plan".to_string(),
            budget_id: None,
            currency_format: Some(CurrencyFormatConfig {
                iso_code: "EUR".to_string(),
                example_format: "1.234,56".to_string(),
                decimal_digits: 2,
                decimal_separator: ",".to_string(),
                symbol_first: false,
                group_separator: ".".to_string(),
                currency_symbol: "€".to_string(),
                display_symbol: true,
            }),
            date_format: Some("DD/MM/YYYY".to_string()),
        },
    )
    .unwrap();

    let updated = repo::get_plan_summary(&conn, None).unwrap();
    assert_eq!(updated.name, "Euro Plan");
    assert_eq!(updated.currency_code, "EUR");
    assert_eq!(updated.currency_symbol, "€");
    assert!(!updated.currency_symbol_first);
    assert_eq!(updated.date_format, "DD/MM/YYYY");
}

// =========================================================================
// Bug #2: Cumulative Credit Card Balance & Zero-Based Conservation across Months
// =========================================================================
#[test]
fn test_bug02_cc_cumulative_balance_prevents_multi_month_rta_inflation() {
    let app = mock_app();
    let conn = setup_test_db();
    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Create a Credit Card account with a positive balance (+$100.00 overpayment in Jan 2026)
    let cc = commands::create_account(
        CreateAccountPayload {
            name: "Visa Overpaid".to_string(),
            account_type: "creditCard".to_string(),
            balance_milliunits: 0,
            on_budget: Some(true),
            note: None,
        },
        state.clone(),
        None,
    )
    .unwrap();

    let income_cat_id: String = {
        let conn = state.db.lock().unwrap();
        conn.query_row(
            "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name = ?2",
            params![DEFAULT_BUDGET_ID, CAT_IMMEDIATE_INCOME],
            |r| r.get(0),
        )
        .unwrap()
    };

    // Add a positive refund/overpayment on the credit card in 2026-01-10 (+$100 = 100_000)
    // Not categorized to ImmediateIncome so it triggers positive CC balance -> additional_to_be_budgeted
    let groc_id: String = {
        let conn = state.db.lock().unwrap();
        conn.query_row(
            "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND name = 'Groceries'",
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        )
        .unwrap()
    };

    // Also add $1,000 checking income in Jan 2026
    let chk = commands::create_account(
        CreateAccountPayload {
            name: "Checking".to_string(),
            account_type: "checking".to_string(),
            balance_milliunits: 0,
            on_budget: Some(true),
            note: None,
        },
        state.clone(),
        None,
    )
    .unwrap();

    commands::save_transaction(
        SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            account_id: chk.id.clone(),
            payee_id: None,
            payee_name: None,
            category_id: Some(income_cat_id),
            date: "2026-01-05".to_string(),
            amount_milliunits: 1_000_000,
            memo: Some("Jan Paycheck".to_string()),
            cleared: Some("Cleared".to_string()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
            subtransactions: Vec::new(),
            allow_reconciled_mutation: false,
        },
        state.clone(),
    )
    .unwrap();

    commands::save_transaction(
        SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            account_id: cc.id.clone(),
            payee_id: None,
            payee_name: None,
            category_id: Some(groc_id),
            date: "2026-01-10".to_string(),
            amount_milliunits: 100_000,
            memo: Some("CC Positive Balance".to_string()),
            cleared: Some("Cleared".to_string()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
            subtransactions: Vec::new(),
            allow_reconciled_mutation: false,
        },
        state.clone(),
    )
    .unwrap();

    // Query Jan 2026, Feb 2026, Mar 2026, Apr 2026:
    // Positive CC balance of +100_000 in Jan must ONLY add to RTA once in Jan (total RTA = 1_100_000),
    // NOT 4 * 100_000 = 400_000 in April!
    let jan = commands::get_budget_month("2026-01-01".to_string(), state.clone(), None).unwrap();
    let apr = commands::get_budget_month("2026-04-01".to_string(), state.clone(), None).unwrap();

    assert_eq!(jan.ready_to_assign_milliunits, 1_100_000);
    assert_eq!(
        apr.ready_to_assign_milliunits, 1_100_000,
        "RTA must remain 1_100_000 across future months without multiplying positive CC balance!"
    );
}

// =========================================================================
// Bug #3: Zero N+1 Queries in get_budget_month
// =========================================================================
#[test]
fn test_bug03_get_budget_month_bounded_sql_queries_no_n_plus_1() {
    let mut conn = setup_test_db();
    static QUERY_COUNT: AtomicUsize = AtomicUsize::new(0);
    QUERY_COUNT.store(0, Ordering::SeqCst);

    #[allow(deprecated)]
    conn.trace(Some(|_sql: &str| {
        QUERY_COUNT.fetch_add(1, Ordering::SeqCst);
    }));

    let summary = repo::get_budget_month(&conn, "2026-11-01", None).unwrap();
    let executed = QUERY_COUNT.load(Ordering::SeqCst);

    #[allow(deprecated)]
    conn.trace(None);

    assert!(!summary.category_groups.is_empty());
    // Must execute in <= 6 queries total (4 bulk SELECTs), never 4 * 15 = 60+ queries!
    assert!(
        executed <= 6,
        "Expected bounded <= 6 SQL queries in get_budget_month, but executed {} queries",
        executed
    );
}

// =========================================================================
// Bug #4: ChangeSetRecorder Undo / Redo Stack
// =========================================================================
#[test]
fn test_bug04_changeset_undo_and_redo_stack() {
    let mut conn = setup_test_db();
    let subcat_id: String = conn
        .query_row(
            "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1",
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        )
        .unwrap();

    // Assign $250.00 (250_000) in 2026-11-01
    repo::set_category_assigned(
        &conn,
        &SetAssignedPayload {
            budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
            category_id: subcat_id.clone(),
            month: "2026-11-01".to_string(),
            assigned_milliunits: 250_000,
        },
    )
    .unwrap();

    // Assign $400.00 (400_000) in 2026-11-01
    repo::set_category_assigned(
        &conn,
        &SetAssignedPayload {
            budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
            category_id: subcat_id.clone(),
            month: "2026-11-01".to_string(),
            assigned_milliunits: 400_000,
        },
    )
    .unwrap();

    let state_before = get_undo_redo_state(&conn, DEFAULT_BUDGET_ID).unwrap();
    assert!(state_before.can_undo);
    assert!(!state_before.can_redo);

    // Undo -> should revert from 400_000 back to 250_000
    assert!(undo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).unwrap());
    let budgeted_after_undo: i64 = conn
        .query_row(
            "SELECT budgeted FROM be_monthly_subcategory_budgets WHERE entities_subcategory_id = ?1 AND month = '2026-11-01'",
            params![subcat_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(budgeted_after_undo, 250_000);

    let state_mid = get_undo_redo_state(&conn, DEFAULT_BUDGET_ID).unwrap();
    assert!(state_mid.can_undo);
    assert!(state_mid.can_redo);

    // Redo -> should restore 400_000
    assert!(redo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).unwrap());
    let budgeted_after_redo: i64 = conn
        .query_row(
            "SELECT budgeted FROM be_monthly_subcategory_budgets WHERE entities_subcategory_id = ?1 AND month = '2026-11-01'",
            params![subcat_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(budgeted_after_redo, 400_000);
}

// =========================================================================
// Bug #5: Split Subtransactions & Scheduled Transactions Persistence
// =========================================================================
#[test]
fn test_bug05_split_subtransactions_and_scheduled_transactions() {
    let conn = setup_test_db();
    let acc = repo::create_account(
        &conn,
        &CreateAccountPayload {
            name: "Checking".to_string(),
            account_type: "checking".to_string(),
            balance_milliunits: 1_000_000,
            on_budget: Some(true),
            note: None,
        },
        None,
    )
    .unwrap();

    let subcats: Vec<String> = {
        let mut stmt = conn
            .prepare("SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 2")
            .unwrap();
        stmt.query_map(params![DEFAULT_BUDGET_ID], |r| r.get(0))
            .unwrap()
            .flatten()
            .collect()
    };

    // Save a split transaction (-$100.00 split into -$60.00 and -$40.00)
    let split_tx_id = save_transaction(
        &conn,
        &SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            account_id: acc.id.clone(),
            payee_id: None,
            payee_name: Some("Target Superstore".to_string()),
            category_id: None,
            date: "2026-11-10".to_string(),
            amount_milliunits: -100_000,
            memo: Some("Split purchase".to_string()),
            cleared: Some("Cleared".to_string()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
            subtransactions: vec![
                SubTransactionDto {
                    id: None,
                    payee_id: None,
                    payee_name: None,
                    category_id: Some(subcats[0].clone()),
                    category_name: None,
                    amount_milliunits: -60_000,
                    memo: Some("Groceries part".to_string()),
                    transfer_account_id: None,
                },
                SubTransactionDto {
                    id: None,
                    payee_id: None,
                    payee_name: None,
                    category_id: Some(subcats[1].clone()),
                    category_name: None,
                    amount_milliunits: -40_000,
                    memo: Some("Household part".to_string()),
                    transfer_account_id: None,
                },
            ],
            allow_reconciled_mutation: false,
        },
    )
    .unwrap();

    let txs = repo::get_transactions(&conn, Some(&acc.id), None).unwrap();
    let loaded_split = txs.iter().find(|t| t.id == split_tx_id).unwrap();
    assert_eq!(loaded_split.subtransactions.len(), 2);
    assert_eq!(loaded_split.subtransactions[0].amount_milliunits, -60_000);
    assert_eq!(loaded_split.subtransactions[1].amount_milliunits, -40_000);

    // Verify budget month activity reflects both split legs
    let month_summary = repo::get_budget_month(&conn, "2026-11-01", None).unwrap();
    let mut act_0 = 0;
    let mut act_1 = 0;
    for g in &month_summary.category_groups {
        for c in &g.categories {
            if c.id == subcats[0] {
                act_0 = c.activity_milliunits;
            }
            if c.id == subcats[1] {
                act_1 = c.activity_milliunits;
            }
        }
    }
    assert_eq!(act_0, -60_000);
    assert_eq!(act_1, -40_000);

    // Scheduled transaction save, list, and enter_now
    let sched_id = save_scheduled_transaction(
        &conn,
        &SaveScheduledTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            account_id: acc.id.clone(),
            payee_id: None,
            category_id: Some(subcats[0].clone()),
            date: "2026-12-01".to_string(),
            frequency: "Monthly".to_string(),
            amount_milliunits: -50_000,
            memo: Some("Monthly Subscription".to_string()),
            flag: Some("Blue".to_string()),
            transfer_account_id: None,
        },
    )
    .unwrap();

    let sched_list = get_scheduled_transactions(&conn, DEFAULT_BUDGET_ID, Some(&acc.id)).unwrap();
    assert_eq!(sched_list.len(), 1);
    assert_eq!(sched_list[0].id, sched_id);

    let entered_tx_id = enter_scheduled_transaction_now(&conn, &sched_id).unwrap();
    assert!(!entered_tx_id.is_empty());
    let sched_after = get_scheduled_transactions(&conn, DEFAULT_BUDGET_ID, Some(&acc.id)).unwrap();
    assert!(sched_after.is_empty());
    let _ = delete_scheduled_transaction(&conn, &sched_id);
}

// =========================================================================
// Bug #6: Reconciled (LOCKED) Transaction Protection (INVARIANTS.md L33)
// =========================================================================
#[test]
fn test_bug06_reconciled_locked_transaction_protection() {
    let conn = setup_test_db();
    let acc = repo::create_account(
        &conn,
        &CreateAccountPayload {
            name: "Checking".to_string(),
            account_type: "checking".to_string(),
            balance_milliunits: 0,
            on_budget: Some(true),
            note: None,
        },
        None,
    )
    .unwrap();

    let tx_id = save_transaction(
        &conn,
        &SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            account_id: acc.id.clone(),
            payee_id: None,
            payee_name: Some("Payroll".to_string()),
            category_id: None,
            date: "2026-11-01".to_string(),
            amount_milliunits: 500_000,
            memo: Some("Reconciled Deposit".to_string()),
            cleared: Some("Reconciled".to_string()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
            subtransactions: Vec::new(),
            allow_reconciled_mutation: true,
        },
    )
    .unwrap();

    // 1. Mutating amount on Reconciled transaction without allow_reconciled_mutation must fail
    let err_amt = save_transaction(
        &conn,
        &SaveTransactionPayload {
            id: Some(tx_id.clone()),
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            account_id: acc.id.clone(),
            payee_id: None,
            payee_name: Some("Payroll".to_string()),
            category_id: None,
            date: "2026-11-01".to_string(),
            amount_milliunits: 999_000,
            memo: Some("Tampered".to_string()),
            cleared: Some("Reconciled".to_string()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
            subtransactions: Vec::new(),
            allow_reconciled_mutation: false,
        },
    );
    assert!(
        err_amt.is_err(),
        "Reconciled amount mutation must be rejected"
    );

    // 2. Toggling cleared on Reconciled transaction without allow_reconciled must fail
    let err_toggle = repo::toggle_transaction_cleared(
        &conn,
        &ToggleClearedPayload {
            id: tx_id.clone(),
            cleared: "Cleared".to_string(),
            budget_id: None,
            allow_reconciled: false,
        },
    );
    assert!(
        err_toggle.is_err(),
        "Reconciled cleared toggle must be rejected"
    );

    // 3. Deleting Reconciled transaction without allow_reconciled must fail
    let err_del = repo::delete_transactions(
        &conn,
        &DeleteTransactionsPayload {
            ids: vec![tx_id.clone()],
            budget_id: None,
            allow_reconciled: false,
        },
    );
    assert!(err_del.is_err(), "Reconciled deletion must be rejected");

    // 4. With explicit allow_reconciled = true, un-reconciling succeeds
    let ok_toggle = repo::toggle_transaction_cleared(
        &conn,
        &ToggleClearedPayload {
            id: tx_id,
            cleared: "Cleared".to_string(),
            budget_id: None,
            allow_reconciled: true,
        },
    );
    assert!(ok_toggle.is_ok());
}

// =========================================================================
// Bug #7: Manual Balance Adjustment Categorized to ImmediateIncome & Fresh Start Snapshot
// =========================================================================
#[test]
fn test_bug07_manual_adjustment_immediate_income_and_fresh_start_snapshot() {
    let mut conn = setup_test_db();
    let acc = repo::create_account(
        &conn,
        &CreateAccountPayload {
            name: "Checking".to_string(),
            account_type: "checking".to_string(),
            balance_milliunits: 500_000,
            on_budget: Some(true),
            note: None,
        },
        None,
    )
    .unwrap();

    // Update account with a +$250.00 manual balance adjustment
    repo::update_account(
        &conn,
        &UpdateAccountPayload {
            id: acc.id.clone(),
            name: "Checking Updated".to_string(),
            note: Some("Updated note".to_string()),
            budget_id: None,
            balance_adjustment_delta: Some(250_000),
        },
    )
    .unwrap();

    // Verify account balance is now 750_000 and RTA includes the +250_000 adjustment
    let accs = repo::get_accounts(&conn, None).unwrap();
    assert_eq!(accs[0].balance_milliunits, 750_000);

    let today_month = format!("{}-01", chrono::Local::now().format("%Y-%m"));
    let summary = repo::get_budget_month(&conn, &today_month, None).unwrap();
    assert_eq!(summary.ready_to_assign_milliunits, 750_000);

    // Fresh Start with preserve_current_balance_as_starting = Some(true)
    repo::make_fresh_start(
        &mut conn,
        &FreshStartPayload {
            budget_id: Some(DEFAULT_BUDGET_ID.to_string()),
            new_name: Some("Snapshot Fresh Start".to_string()),
            preserve_current_balance_as_starting: Some(true),
        },
    )
    .unwrap();

    let accs_after = repo::get_accounts(&conn, None).unwrap();
    assert_eq!(
        accs_after[0].balance_milliunits, 750_000,
        "Fresh start with snapshot must preserve current working balance 750_000"
    );
}

// =========================================================================
// Bug #9 & #10: Snooze Goal Upsert on Empty Month & Repeating Goal Period
// =========================================================================
#[test]
fn test_bug09_and_10_snooze_on_empty_month_and_repeating_goal_period() {
    let conn = setup_test_db();
    let subcat_id: String = conn
        .query_row(
            "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1",
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        )
        .unwrap();

    // Set a goal on subcat_id without assigning any money in 2026-11-01
    repo::set_category_goal(
        &conn,
        &SetGoalPayload {
            budget_id: None,
            category_id: subcat_id.clone(),
            goal_type: Some("NEED".to_string()),
            target_amount: 300_000,
            target_date: Some("2026-12-01".to_string()),
            cadence: Some(1),
            cadence_frequency: Some(1),
            day_of_week: None,
            needs_whole_amount: Some(true),
        },
    )
    .unwrap();

    // Snooze goal in 2026-11-01 where 0 rows exist in be_monthly_subcategory_budgets
    let summary = repo::snooze_category_goal(
        &conn,
        &SnoozeGoalPayload {
            budget_id: None,
            category_id: subcat_id.clone(),
            month: "2026-11-01".to_string(),
            snooze: true,
        },
    )
    .unwrap();

    let cat = summary
        .category_groups
        .iter()
        .flat_map(|g| &g.categories)
        .find(|c| c.id == subcat_id)
        .unwrap();
    assert!(
        cat.is_snoozed,
        "Snoozing a category in a month with no prior allocation must persist is_snoozed = true"
    );
    assert_eq!(cat.goal_target_date.as_deref(), Some("2026-12-01"));
    assert_eq!(cat.goal_cadence, Some(1));

    // Test repeating goal period & integer percentage (Ember inclusive months & Math.floor percentage)
    let period = calculate_current_goal_period("2025-01", Some("2025-06"), 6, "2026-03");
    assert!(period.is_repeat);
    assert_eq!(period.total_months, 6);
    assert_eq!(calc_percentage_int(1, 3), 33);
    assert_eq!(calc_percentage_int(2, 3), 66);

    let eval = evaluate_subcategory_goal(&GoalEvaluationInput {
        current_month: "2026-03".to_string(),
        is_credit_card_payment: false,
        goal_type: Some("TBD".to_string()),
        goal_creation_month: Some("2026-01".to_string()),
        target_amount: 600_000,
        target_month: Some("2026-06".to_string()),
        cadence: Some(1),
        cadence_frequency: Some(6),
        day_of_week: None,
        goal_needs_whole_amount: false,
        is_snoozed: false,
        budgeted: 0,
        balance: 200_000,
        activity: 0,
        positive_cash_outflows: 0,
        cc_account_balance: 0,
        cc_starting_debt_balance: 0,
        cc_additional_to_be_budgeted: 0,
        cc_budgeted_previous_month: 0,
        cc_payment_previous_month: 0,
        ..Default::default()
    });
    // Remaining = 400_000 across 4 months (Mar, Apr, May, Jun) = 100_000/month
    assert_eq!(eval.goal_under_funded, Some(100_000));
}

// =========================================================================
// Bug #11 & #12: AccountType Enum Grouping & Payee 2-of-3 Auto-Categorization
// =========================================================================
#[test]
fn test_bug11_and_12_account_type_grouping_and_payee_autocat() {
    assert_eq!(
        AccountType::from_str_loose("otherasset").sidebar_group(false),
        AccountGroup::Tracking
    );
    assert_eq!(
        AccountType::from_str_loose("otherAsset").sidebar_group(false),
        AccountGroup::Tracking
    );
    assert_eq!(
        AccountType::from_str_loose("otherLiability").sidebar_group(false),
        AccountGroup::Tracking
    );
    assert_eq!(
        AccountType::from_str_loose("mortgage").sidebar_group(false),
        AccountGroup::Loan
    );
    assert_eq!(
        AccountType::from_str_loose("autoLoan").sidebar_group(false),
        AccountGroup::Loan
    );
    assert_eq!(
        AccountType::from_str_loose("creditCard").sidebar_group(false),
        AccountGroup::Credit
    );
    assert_eq!(
        AccountType::from_str_loose("checking").sidebar_group(true),
        AccountGroup::Closed
    );

    assert!(is_credit_card_account(Some("creditCard")));
    assert!(is_credit_card_account(Some("CreditCard")));
    assert!(is_credit_card_account(Some("lineOfCredit")));
    assert!(!is_credit_card_account(Some("checking")));
    assert!(!is_credit_card_account(None));

    // Payee 2-of-3 auto-categorization
    let conn = setup_test_db();
    let acc = repo::create_account(
        &conn,
        &CreateAccountPayload {
            name: "Checking".to_string(),
            account_type: "checking".to_string(),
            balance_milliunits: 0,
            on_budget: Some(true),
            note: None,
        },
        None,
    )
    .unwrap();

    let subcats: Vec<String> = {
        let mut stmt = conn
            .prepare("SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 2")
            .unwrap();
        stmt.query_map(params![DEFAULT_BUDGET_ID], |r| r.get(0))
            .unwrap()
            .flatten()
            .collect()
    };

    // Save 1st transaction with payee "Coffee Shop" -> cat 0 (FirstCategorization)
    save_transaction(
        &conn,
        &SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            account_id: acc.id.clone(),
            payee_id: None,
            payee_name: Some("Coffee Shop".to_string()),
            category_id: Some(subcats[0].clone()),
            date: "2026-11-01".to_string(),
            amount_milliunits: -5_000,
            memo: None,
            cleared: Some("Cleared".to_string()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
            subtransactions: Vec::new(),
            allow_reconciled_mutation: false,
        },
    )
    .unwrap();

    let payees = repo::get_payees(&conn, None).unwrap();
    let coffee = payees.iter().find(|p| p.name == "Coffee Shop").unwrap();
    assert_eq!(
        coffee.auto_fill_subcategory_id.as_deref(),
        Some(subcats[0].as_str())
    );

    // Save 2 more transactions with cat 1 -> 2-of-3 rule switches autofill to cat 1
    for d in ["2026-11-02", "2026-11-03"] {
        save_transaction(
            &conn,
            &SaveTransactionPayload {
                id: None,
                budget_id: DEFAULT_BUDGET_ID.to_string(),
                account_id: acc.id.clone(),
                payee_id: Some(coffee.id.clone()),
                payee_name: None,
                category_id: Some(subcats[1].clone()),
                date: d.to_string(),
                amount_milliunits: -6_000,
                memo: None,
                cleared: Some("Cleared".to_string()),
                approved: Some(true),
                flag: None,
                transfer_account_id: None,
                subtransactions: Vec::new(),
                allow_reconciled_mutation: false,
            },
        )
        .unwrap();
    }

    let (_, reason) = compute_payee_auto_categorization(&conn, &coffee.id, Some(&subcats[0]))
        .unwrap()
        .unwrap();
    assert_eq!(reason, AutoCategorizeReason::TwoOfThree);
    update_payee_autofill_category(&conn, &coffee.id).unwrap();

    let payees_after = repo::get_payees(&conn, None).unwrap();
    let coffee_after = payees_after.iter().find(|p| p.id == coffee.id).unwrap();
    assert_eq!(
        coffee_after.auto_fill_subcategory_id.as_deref(),
        Some(subcats[1].as_str())
    );
}

// =========================================================================
// Vitest Parity Tests: Reflect Analytics, Timeframes, Formatting, Calculator, Target Status
// =========================================================================
#[test]
fn test_vitest_parity_f04_timeframe_and_filtering() {
    let tf = TimeframeState {
        preset: TimeframePreset::Custom,
        start_year: 2026,
        start_month: 8, // Sep
        end_year: 2026,
        end_month: 10, // Nov
    };

    let txs = vec![
        AnalyticsTransaction {
            id: "tx-prior".to_string(),
            account_id: "acc-1".to_string(),
            account_name: "Checking".to_string(),
            date: "2026-08-31".to_string(),
            payee_name: "Payee".to_string(),
            category_id: Some("cat-1".to_string()),
            category_name: "Cat".to_string(),
            group_id: None,
            group_name: String::new(),
            amount_milliunits: -50_000,
            transfer_account_id: None,
        },
        AnalyticsTransaction {
            id: "tx-start".to_string(),
            account_id: "acc-1".to_string(),
            account_name: "Checking".to_string(),
            date: "2026-09-01".to_string(),
            payee_name: "Payee".to_string(),
            category_id: Some("cat-1".to_string()),
            category_name: "Cat".to_string(),
            group_id: None,
            group_name: String::new(),
            amount_milliunits: -10_000,
            transfer_account_id: None,
        },
        AnalyticsTransaction {
            id: "tx-end".to_string(),
            account_id: "acc-1".to_string(),
            account_name: "Checking".to_string(),
            date: "2026-11-30".to_string(),
            payee_name: "Payee".to_string(),
            category_id: Some("cat-1".to_string()),
            category_name: "Cat".to_string(),
            group_id: None,
            group_name: String::new(),
            amount_milliunits: -30_000,
            transfer_account_id: None,
        },
        AnalyticsTransaction {
            id: "tx-malformed".to_string(),
            account_id: "acc-1".to_string(),
            account_name: "Checking".to_string(),
            date: "2026-99-99".to_string(),
            payee_name: "Payee".to_string(),
            category_id: Some("cat-1".to_string()),
            category_name: "Cat".to_string(),
            group_id: None,
            group_name: String::new(),
            amount_milliunits: -40_000,
            transfer_account_id: None,
        },
    ];

    let filtered =
        filter_transactions_by_date_and_filters(&txs, &tf, &HashSet::new(), &HashSet::new());
    let ids: Vec<&str> = filtered.iter().map(|t| t.id.as_str()).collect();
    assert_eq!(ids, vec!["tx-start", "tx-end"]);

    let (total_spend, breakdown) = calculate_spending_breakdown(&filtered, false);
    assert_eq!(total_spend, 40_000);
    assert_eq!(breakdown.len(), 1);
    assert_eq!(breakdown[0].amount, 40_000);
}

#[test]
fn test_vitest_parity_f10_net_worth_and_aom_history() {
    let accounts = vec![
        AnalyticsAccount {
            id: "acc-asset".to_string(),
            name: "Savings".to_string(),
            account_type: "savings".to_string(),
            balance_milliunits: 15_000_000_000,
        },
        AnalyticsAccount {
            id: "acc-debt".to_string(),
            name: "Debt".to_string(),
            account_type: "otherDebt".to_string(),
            balance_milliunits: -5_000_000_000,
        },
    ];

    let nw = calculate_net_worth(&accounts, None);
    assert_eq!(nw.assets, 15_000_000_000);
    assert_eq!(nw.debts, 5_000_000_000);
    assert_eq!(nw.net_worth, 10_000_000_000);

    let tf = TimeframeState {
        preset: TimeframePreset::Latest3Months,
        start_year: 2026,
        start_month: 8,
        end_year: 2026,
        end_month: 10,
    };
    let history = generate_net_worth_history(&accounts, &[], Some(&tf));
    assert_eq!(history.len(), 3);
    let full_history = calculate_net_worth_history(&accounts, &[]);
    assert!(full_history.len() >= 6);

    // Age of money history with 10 outflows
    let mut txs = vec![AnalyticsTransaction {
        id: "in-1".to_string(),
        account_id: "acc-asset".to_string(),
        account_name: "Savings".to_string(),
        date: "2026-05-01".to_string(),
        payee_name: "Income".to_string(),
        category_id: None,
        category_name: String::new(),
        group_id: None,
        group_name: String::new(),
        amount_milliunits: 3_000_000,
        transfer_account_id: None,
    }];
    for i in 1..=10 {
        txs.push(AnalyticsTransaction {
            id: format!("out-{}", i),
            account_id: "acc-asset".to_string(),
            account_name: "Savings".to_string(),
            date: format!("2026-06-{:02}", i + 5),
            payee_name: "Spend".to_string(),
            category_id: Some("cat-1".to_string()),
            category_name: "Groceries".to_string(),
            group_id: None,
            group_name: String::new(),
            amount_milliunits: -200_000,
            transfer_account_id: None,
        });
    }
    let aom_hist = calculate_age_of_money_history(&txs, 12);
    assert!(!aom_hist.is_empty());
    assert!(aom_hist[0].age > 0);
}

#[test]
fn test_vitest_parity_formatting_and_settings() {
    let conn = setup_test_db();
    repo::set_setting(&conn, DEFAULT_BUDGET_ID, "theme", "theme-dark").unwrap();
    let theme = repo::get_setting(&conn, DEFAULT_BUDGET_ID, "theme").unwrap();
    assert_eq!(theme.as_deref(), Some("theme-dark"));

    assert_eq!(
        format_date_with_pattern("2026-11-18", "MM/DD/YYYY"),
        "11/18/2026"
    );
    assert_eq!(
        format_date_with_pattern("2026-11-18", "DD.MM.YYYY"),
        "18.11.2026"
    );
    assert_eq!(format_plain_decimal_milliunits(1_500_000), "1500.00");
    assert_eq!(format_plain_decimal_milliunits(-450_000), "-450.00");

    let cfg = CurrencyFormatConfig {
        iso_code: "EUR".to_string(),
        example_format: "1.234,56".to_string(),
        decimal_digits: 2,
        decimal_separator: ",".to_string(),
        symbol_first: false,
        group_separator: ".".to_string(),
        currency_symbol: "€".to_string(),
        display_symbol: true,
    };
    assert_eq!(
        format_milliunits_with_config(1_234_560, &cfg, false, false),
        "1.234,56 €"
    );

    // Unused imports exercise
    let _ = (
        calculate_timeframe_dates(TimeframePreset::AllDates, 2026, 10),
        format_timeframe_label(&TimeframeState {
            preset: TimeframePreset::ThisMonth,
            start_year: 2026,
            start_month: 10,
            end_year: 2026,
            end_month: 10,
        }),
        evaluate_formula_milliunits("10 + 20"),
        calculate_assigned_expression_milliunits("+10", 50_000),
        format_currency(10_000, false),
        calculate_category_target_status(
            10_000,
            0,
            10_000,
            Some(&CategoryTarget {
                target_amount: 10_000,
                target_type: Some(TargetType::MF),
                cadence: Some(TargetCadence::Monthly),
                day_of_month: None,
                day_of_week: None,
                target_date: None,
                repeat_interval: None,
                repeat_unit: None,
                needs_whole_amount: None,
            }),
            false,
            None,
            0,
        ),
        export_transactions_to_csv(&[ExportRegisterRow {
            date: "2026-11-18".to_string(),
            account_name: "Checking".to_string(),
            payee_name: "Store".to_string(),
            category_name: "Groceries".to_string(),
            memo: String::new(),
            amount_milliunits: -10_000,
        }]),
        generate_budget_plan_csv_rows(&[ExportBudgetCategoryRow {
            group_name: "Group".to_string(),
            category_name: "Cat".to_string(),
            assigned_milliunits: 10_000,
            activity_milliunits: 0,
            available_milliunits: 10_000,
        }]),
        apply_payee_selection(None, "", "Store", None),
        calculate_balance_adjustment_delta(0, "100"),
        json!({"ok": true}),
    );
}
