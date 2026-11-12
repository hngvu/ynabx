//! Tauri IPC Commands connecting SQLite and YNAB calculation engines to the Desktop UI.

use rusqlite::{params, Result};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap};
use tauri::State;
use uuid::Uuid;

use crate::calc::auto_assign::{
    compute_batch_quick_budget_plan, compute_underfunded_auto_assign_plan,
    QuickBudgetType, SubcategoryAutoAssignCandidate,
};
use crate::calc::goals_calc::{
    evaluate_subcategory_goal, GoalEvaluationInput, SubcategoryGoalResult,
};
use crate::calc::monthly_calc::{
    calculate_monthly_timeline, MonthSummaryInput, MonthSummaryResult,
};
use crate::calc::subcategory_calc::{
    calculate_subcategories_for_month, CategoryMeta, CreditSpendSlice, SubcategoryCalculationResult,
    SubcategoryMonthInput,
};
use crate::changeset::ChangeSetRecorder;
use crate::ledger::reconcile::{reconcile_account as do_reconcile, ReconcileAccountResult};
use crate::ledger::transfers::{save_transaction as do_save_transaction, SaveTransactionPayload};
use crate::seed::{DEFAULT_BUDGET_ID, MASTER_CAT_DEBT_PAYMENT};
use crate::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct PlanSummaryDto {
    pub id: String,
    pub name: String,
    pub currency_code: String,
    pub number_format: String,
    pub currency_symbol_first: bool,
    pub currency_display_symbol: bool,
    pub date_format: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AccountDto {
    pub id: String,
    pub budget_id: String,
    pub name: String,
    pub r#type: String,
    pub on_budget: bool,
    pub closed: bool,
    pub balance_milliunits: i64,
    pub cleared_balance_milliunits: i64,
    pub uncleared_balance_milliunits: i64,
    pub note: Option<String>,
    pub last_reconciled_at: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryDto {
    pub id: String,
    pub budget_id: String,
    pub group_id: String,
    pub name: String,
    pub note: Option<String>,
    pub r#type: String, // "DFT" or "DBT"
    pub internal_name: Option<String>,
    pub is_credit_card_payment: bool,
    pub credit_card_account_id: Option<String>,
    pub hidden: bool,
    pub sort_order: i32,
    pub assigned_milliunits: i64,
    pub activity_milliunits: i64,
    pub available_milliunits: i64,
    pub cash_overspent_milliunits: i64,
    pub credit_overspent_milliunits: i64,
    pub goal_type: Option<String>,
    pub goal_target_amount: Option<i64>,
    pub goal_under_funded: Option<i64>,
    pub goal_percentage_complete: Option<i32>,
    pub is_snoozed: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryGroupDto {
    pub id: String,
    pub budget_id: String,
    pub name: String,
    pub is_system: bool,
    pub internal_name: Option<String>,
    pub hidden: bool,
    pub sort_order: i32,
    pub categories: Vec<CategoryDto>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlanMonthSummaryDto {
    pub month: String,
    pub ready_to_assign_milliunits: i64,
    pub total_assigned_milliunits: i64,
    pub total_activity_milliunits: i64,
    pub total_available_milliunits: i64,
    pub funded_in_future_milliunits: i64,
    pub category_groups: Vec<CategoryGroupDto>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionDto {
    pub id: String,
    pub budget_id: String,
    pub account_id: String,
    pub payee_id: Option<String>,
    pub payee_name: Option<String>,
    pub category_id: Option<String>,
    pub category_name: Option<String>,
    pub date: String,
    pub amount_milliunits: i64,
    pub memo: Option<String>,
    pub cleared: String,
    pub approved: bool,
    pub flag: Option<String>,
    pub transfer_account_id: Option<String>,
    pub transfer_transaction_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAccountPayload {
    pub name: String,
    pub account_type: String,
    pub balance_milliunits: i64,
    pub on_budget: Option<bool>,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SetAssignedPayload {
    pub budget_id: Option<String>,
    pub category_id: String,
    pub month: String, // "YYYY-MM-01"
    pub assigned_milliunits: i64,
}

#[derive(Debug, Deserialize)]
pub struct SetGoalPayload {
    pub budget_id: Option<String>,
    pub category_id: String,
    pub goal_type: Option<String>,
    pub target_amount: i64,
    pub target_date: Option<String>,
    pub cadence: Option<i32>,
    pub cadence_frequency: Option<i32>,
    pub day_of_week: Option<i32>,
    pub needs_whole_amount: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct SnoozeGoalPayload {
    pub budget_id: Option<String>,
    pub category_id: String,
    pub month: String,
    pub snooze: bool,
}

#[derive(Debug, Deserialize)]
pub struct ApplyQuickBudgetPayload {
    pub budget_id: Option<String>,
    pub month: String, // "YYYY-MM-01"
    pub quick_budget_type: String,
    pub category_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct ReconcileAccountPayload {
    pub budget_id: Option<String>,
    pub account_id: String,
    pub target_balance_milliunits: i64,
    pub create_adjustment: bool,
}

#[derive(Debug, Serialize)]
pub struct ReconcileResponse {
    pub account_id: String,
    pub target_balance_milliunits: i64,
    pub adjustment_amount_milliunits: i64,
    pub reconciled_tx_count: usize,
}

// -------------------------------------------------------------
// Commands
// -------------------------------------------------------------

#[tauri::command]
pub fn get_plan_summary(
    state: State<'_, AppState>,
    budget_id: Option<String>,
) -> Result<PlanSummaryDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let b_id = budget_id.unwrap_or_else(|| DEFAULT_BUDGET_ID.to_string());

    let mut stmt = conn
        .prepare(
            r#"SELECT id, budget_name, currency_iso_code, currency_format,
                      currency_symbol_first, currency_symbol_space, date_format
               FROM be_budgets WHERE id = ?1"#,
        )
        .map_err(|e| e.to_string())?;

    let budget = stmt
        .query_row(params![b_id], |r| {
            Ok(PlanSummaryDto {
                id: r.get(0)?,
                name: r.get(1)?,
                currency_code: r.get(2)?,
                number_format: r.get(3)?,
                currency_symbol_first: r.get::<_, i32>(4)? != 0,
                currency_display_symbol: r.get::<_, i32>(5)? != 0,
                date_format: r.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(budget)
}

#[tauri::command]
pub fn get_accounts(
    state: State<'_, AppState>,
    budget_id: Option<String>,
) -> Result<Vec<AccountDto>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let b_id = budget_id.unwrap_or_else(|| DEFAULT_BUDGET_ID.to_string());

    let mut stmt = conn
        .prepare(
            r#"SELECT id, budget_id, account_name, account_type, on_budget, closed,
                      cleared_balance, uncleared_balance, note, last_reconciled_at, sortable_index
               FROM be_accounts
               WHERE budget_id = ?1 AND is_tombstone = 0
               ORDER BY sortable_index ASC, account_name ASC"#,
        )
        .map_err(|e| e.to_string())?;

    let accounts = stmt
        .query_map(params![b_id], |r| {
            let cleared: i64 = r.get(6)?;
            let uncleared: i64 = r.get(7)?;
            Ok(AccountDto {
                id: r.get(0)?,
                budget_id: r.get(1)?,
                name: r.get(2)?,
                r#type: r.get(3)?,
                on_budget: r.get::<_, i32>(4)? != 0,
                closed: r.get::<_, i32>(5)? != 0,
                balance_milliunits: cleared + uncleared,
                cleared_balance_milliunits: cleared,
                uncleared_balance_milliunits: uncleared,
                note: r.get(8)?,
                last_reconciled_at: r.get(9)?,
                sort_order: r.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    Ok(accounts)
}

#[tauri::command]
pub fn create_account(
    payload: CreateAccountPayload,
    state: State<'_, AppState>,
    budget_id: Option<String>,
) -> Result<AccountDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let b_id = budget_id.unwrap_or_else(|| DEFAULT_BUDGET_ID.to_string());

    let acc_id = Uuid::new_v4().to_string();
    let on_budget = payload.on_budget.unwrap_or_else(|| {
        !matches!(
            payload.account_type.as_str(),
            "otherAsset" | "otherLiability"
        )
    });

    let mut recorder = ChangeSetRecorder::new(&conn, &b_id, "Create Account");

    conn.execute(
        r#"INSERT INTO be_accounts (
               id, budget_id, account_name, account_type, on_budget, closed,
               note, cleared_balance, uncleared_balance
           ) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, 0, 0)"#,
        params![
            acc_id,
            b_id,
            payload.name,
            payload.account_type,
            if on_budget { 1 } else { 0 },
            payload.note
        ],
    )
    .map_err(|e| e.to_string())?;

    recorder.record_change("be_accounts", &acc_id, "create", None, &payload.name);

    // Auto-create transfer payee
    let payee_id = format!("payee/transfer/{}", acc_id);
    let payee_name = format!("Transfer : {}", payload.name);
    conn.execute(
        r#"INSERT INTO be_payees (id, budget_id, entities_account_id, name)
           VALUES (?1, ?2, ?3, ?4)
           ON CONFLICT(id) DO NOTHING"#,
        params![payee_id, b_id, acc_id, payee_name],
    )
    .map_err(|e| e.to_string())?;

    // Auto-create Credit Card Payment Category if CreditCard or LineOfCredit
    if (payload.account_type == "creditCard" || payload.account_type == "lineOfCredit" || payload.account_type == "CreditCard")
        && on_budget
    {
        let cat_id = format!("category/ccpc/{}", acc_id);
        let cat_name = format!("Payment: {}", payload.name);
        conn.execute(
            r#"INSERT INTO be_subcategories (
                   id, budget_id, entities_master_category_id, entities_account_id,
                   name, type, is_hidden
               ) VALUES (?1, ?2, ?3, ?4, ?5, 'DBT', 0)
               ON CONFLICT(id) DO NOTHING"#,
            params![
                cat_id,
                b_id,
                MASTER_CAT_DEBT_PAYMENT,
                acc_id,
                cat_name
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    // Initial starting balance transaction if non-zero
    if payload.balance_milliunits != 0 {
        let starting_payee_id = conn
            .query_row(
                "SELECT id FROM be_payees WHERE budget_id = ?1 AND internal_name = 'Payee/__StartingBalance__'",
                params![b_id],
                |r| r.get::<_, String>(0),
            )
            .ok();

        let starting_cat_id = if on_budget {
            conn.query_row(
                "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name = 'Category/__ImmediateIncome__'",
                params![b_id],
                |r| r.get::<_, String>(0),
            ).ok()
        } else {
            None
        };

        let now = chrono::Local::now().format("%Y-%m-%d").to_string();
        let init_tx = SaveTransactionPayload {
            id: None,
            budget_id: b_id.clone(),
            account_id: acc_id.clone(),
            payee_id: starting_payee_id,
            category_id: starting_cat_id,
            date: now,
            amount_milliunits: payload.balance_milliunits,
            memo: Some("Starting Balance".to_string()),
            cleared: Some("Cleared".to_string()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
        };
        do_save_transaction(&conn, &init_tx).map_err(|e| e.to_string())?;
    }

    let _ = recorder.commit();

    Ok(AccountDto {
        id: acc_id,
        budget_id: b_id,
        name: payload.name,
        r#type: payload.account_type,
        on_budget,
        closed: false,
        balance_milliunits: payload.balance_milliunits,
        cleared_balance_milliunits: payload.balance_milliunits,
        uncleared_balance_milliunits: 0,
        note: payload.note,
        last_reconciled_at: None,
        sort_order: 0,
    })
}

#[derive(Debug, Clone)]
struct SubRowData {
    id: String,
    master_id: String,
    account_id: Option<String>,
    name: String,
    cat_type: String,
    internal_name: Option<String>,
    sort_order: i32,
    hidden: bool,
    note: Option<String>,
    goal_type: Option<String>,
    goal_created_on: Option<String>,
    goal_needs_whole_amount: Option<i32>,
    goal_target_amount: Option<i64>,
    goal_target_date: Option<String>,
    goal_cadence: Option<i32>,
    goal_cadence_frequency: Option<i32>,
    goal_day: Option<i32>,
}

#[tauri::command]
pub fn get_budget_month(
    target_month: String, // "YYYY-MM-01"
    state: State<'_, AppState>,
    budget_id: Option<String>,
) -> Result<PlanMonthSummaryDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let b_id = budget_id.unwrap_or_else(|| DEFAULT_BUDGET_ID.to_string());

    // 1. Fetch all Master Categories
    let mut stmt = conn
        .prepare(
            r#"SELECT id, name, internal_name, sortable_index, is_hidden
               FROM be_master_categories
               WHERE budget_id = ?1 AND is_tombstone = 0
               ORDER BY sortable_index ASC"#,
        )
        .map_err(|e| e.to_string())?;

    struct MasterRow {
        id: String,
        name: String,
        internal_name: Option<String>,
        sort_order: i32,
        hidden: bool,
    }

    let master_rows: Vec<MasterRow> = stmt
        .query_map(params![b_id], |r| {
            Ok(MasterRow {
                id: r.get(0)?,
                name: r.get(1)?,
                internal_name: r.get(2)?,
                sort_order: r.get(3)?,
                hidden: r.get::<_, i32>(4)? != 0,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    // 2. Fetch all Subcategories with Goal configuration
    let mut stmt = conn
        .prepare(
            r#"SELECT id, entities_master_category_id, entities_account_id, name, type,
                      internal_name, sortable_index, is_hidden, note,
                      goal_type, goal_created_on, goal_needs_whole_amount,
                      goal_target_amount, goal_target_date, goal_cadence,
                      goal_cadence_frequency, goal_day
               FROM be_subcategories
               WHERE budget_id = ?1 AND is_tombstone = 0
               ORDER BY sortable_index ASC"#,
        )
        .map_err(|e| e.to_string())?;

    let sub_rows: Vec<SubRowData> = stmt
        .query_map(params![b_id], |r| {
            Ok(SubRowData {
                id: r.get(0)?,
                master_id: r.get(1)?,
                account_id: r.get(2)?,
                name: r.get(3)?,
                cat_type: r.get(4)?,
                internal_name: r.get(5)?,
                sort_order: r.get(6)?,
                hidden: r.get::<_, i32>(7)? != 0,
                note: r.get(8)?,
                goal_type: r.get(9)?,
                goal_created_on: r.get(10)?,
                goal_needs_whole_amount: r.get(11)?,
                goal_target_amount: r.get(12)?,
                goal_target_date: r.get(13)?,
                goal_cadence: r.get(14)?,
                goal_cadence_frequency: r.get(15)?,
                goal_day: r.get(16)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    let mut cat_metas: Vec<CategoryMeta> = Vec::new();
    let mut card_to_cat: HashMap<String, String> = HashMap::new();
    let mut cat_by_id: HashMap<String, SubRowData> = HashMap::new();

    for s in &sub_rows {
        cat_by_id.insert(s.id.clone(), s.clone());
        cat_metas.push(CategoryMeta {
            id: s.id.clone(),
            master_category_id: s.master_id.clone(),
            account_id: s.account_id.clone(),
            name: s.name.clone(),
            cat_type: s.cat_type.clone(),
            internal_name: s.internal_name.clone(),
            is_hidden: s.hidden,
        });

        if let Some(acc_id) = &s.account_id {
            if s.cat_type == "DBT" {
                card_to_cat.insert(acc_id.clone(), s.id.clone());
            }
        }
    }

    // 3. Find range of months: earliest transaction / allocation up to MAX(target_month, max_tx_month, max_alloc_month)
    let min_tx_month: Option<String> = conn
        .query_row(
            r#"SELECT MIN(substr(date, 1, 7) || '-01') FROM be_transactions
               WHERE budget_id = ?1 AND is_tombstone = 0"#,
            params![b_id],
            |r| r.get(0),
        )
        .ok()
        .flatten();

    let max_tx_month: Option<String> = conn
        .query_row(
            r#"SELECT MAX(substr(date, 1, 7) || '-01') FROM be_transactions
               WHERE budget_id = ?1 AND is_tombstone = 0"#,
            params![b_id],
            |r| r.get(0),
        )
        .ok()
        .flatten();

    let min_alloc_month: Option<String> = conn
        .query_row(
            r#"SELECT MIN(month) FROM be_monthly_subcategory_budgets
               WHERE budget_id = ?1 AND is_tombstone = 0"#,
            params![b_id],
            |r| r.get(0),
        )
        .ok()
        .flatten();

    let max_alloc_month: Option<String> = conn
        .query_row(
            r#"SELECT MAX(month) FROM be_monthly_subcategory_budgets
               WHERE budget_id = ?1 AND is_tombstone = 0"#,
            params![b_id],
            |r| r.get(0),
        )
        .ok()
        .flatten();

    let start_month = min_tx_month
        .unwrap_or_else(|| target_month.clone())
        .min(min_alloc_month.unwrap_or_else(|| target_month.clone()))
        .min(target_month.clone());

    // Extend timeline to the future-most month to accurately calculate `funded_in_future` ("Stealing from Future")
    let end_month = max_tx_month
        .unwrap_or_else(|| target_month.clone())
        .max(max_alloc_month.unwrap_or_else(|| target_month.clone()))
        .max(target_month.clone());

    // Preload all CC Account Balances in memory (cleared + uncleared)
    let mut cc_account_balances: HashMap<String, i64> = HashMap::new();
    {
        let mut stmt = conn
            .prepare("SELECT id, (cleared_balance + uncleared_balance) FROM be_accounts WHERE budget_id = ?1 AND is_tombstone = 0")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![b_id], |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)))
            .map_err(|e| e.to_string())?;
        for r in rows.flatten() {
            cc_account_balances.insert(r.0, r.1);
        }
    }

    // Preload all monthly budgets into memory: key = (cat_id, month) -> (budgeted, goal_snoozed_at)
    let mut all_monthly_budgets: HashMap<(String, String), (i64, Option<String>)> = HashMap::new();
    {
        let mut stmt = conn
            .prepare(
                r#"SELECT entities_subcategory_id, month, budgeted, goal_snoozed_at
                   FROM be_monthly_subcategory_budgets
                   WHERE budget_id = ?1 AND is_tombstone = 0"#,
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![b_id], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, i64>(2)?,
                    r.get::<_, Option<String>>(3)?,
                ))
            })
            .map_err(|e| e.to_string())?;
        for r in rows.flatten() {
            all_monthly_budgets.insert((r.0, r.1), (r.2, r.3));
        }
    }

    // Preload internal_name of categories in memory to avoid N+1 queries
    let mut internal_names: HashMap<String, Option<String>> = HashMap::new();
    for s in &sub_rows {
        internal_names.insert(s.id.clone(), s.internal_name.clone());
    }

    // 4. Step through all months from start_month to end_month
    let mut prior_balances: HashMap<String, i64> = HashMap::new();
    let mut timeline_inputs: BTreeMap<String, MonthSummaryInput> = BTreeMap::new();
    let mut target_calc_results: HashMap<String, SubcategoryCalculationResult> = HashMap::new();

    let mut current_ym = start_month.clone();
    while current_ym <= end_month {
        let (in_year, in_month) = parse_year_month(&current_ym);
        let ym_prefix = &current_ym[0..7]; // "YYYY-MM"

        let mut sub_inputs: HashMap<String, SubcategoryMonthInput> = HashMap::new();
        let mut immediate_income: i64 = 0;
        let mut total_budgeted: i64 = 0;

        for meta in &cat_metas {
            let (budgeted, _) = all_monthly_budgets
                .get(&(meta.id.clone(), current_ym.clone()))
                .cloned()
                .unwrap_or((0, None));

            if meta.internal_name.as_deref() != Some("Category/__ImmediateIncome__") {
                total_budgeted += budgeted;
            }

            let prev_bal = prior_balances.get(&meta.id).copied().unwrap_or(0);
            let cc_bal = meta
                .account_id
                .as_ref()
                .and_then(|aid| cc_account_balances.get(aid).copied())
                .unwrap_or(0);

            sub_inputs.insert(
                meta.id.clone(),
                SubcategoryMonthInput {
                    category_id: meta.id.clone(),
                    budgeted_milliunits: budgeted,
                    cash_outflows_milliunits: 0,
                    credit_outflows_milliunits: 0,
                    credit_spend_slices: Vec::new(),
                    prior_month_balance_milliunits: prev_bal,
                    cc_payment_cash_transfers_milliunits: 0,
                    cc_account_balance: cc_bal,
                },
            );
        }

        // Query transactions in this month: ONLY on_budget accounts!
        // Also support subtransactions (split transactions)
        {
            let mut stmt = conn
                .prepare(
                    r#"SELECT t.id, t.entities_account_id,
                              COALESCE(st.entities_subcategory_id, t.entities_subcategory_id),
                              COALESCE(st.amount, t.amount),
                              a.account_type, t.transfer_account_id
                       FROM be_transactions t
                       JOIN be_accounts a ON t.entities_account_id = a.id
                       LEFT JOIN be_subtransactions st ON st.entities_transaction_id = t.id AND st.is_tombstone = 0
                       WHERE t.budget_id = ?1 AND t.date LIKE ?2 AND t.is_tombstone = 0 AND a.on_budget = 1
                       ORDER BY t.date ASC, t.id ASC"#,
                )
                .map_err(|e| e.to_string())?;

            let like_pattern = format!("{}%", ym_prefix);
            let tx_rows = stmt
                .query_map(params![b_id, like_pattern], |r| {
                    Ok((
                        r.get::<_, String>(0)?,
                        r.get::<_, String>(1)?,
                        r.get::<_, Option<String>>(2)?,
                        r.get::<_, i64>(3)?,
                        r.get::<_, String>(4)?,
                        r.get::<_, Option<String>>(5)?,
                    ))
                })
                .map_err(|e| e.to_string())?;

            for item in tx_rows.flatten() {
                let (_tx_id, acc_id, sub_cat_id, amount, acc_type, transfer_acc_id) = item;
                let is_credit_card = acc_type == "creditCard" || acc_type == "CreditCard" || acc_type == "lineOfCredit";

                if let Some(cid) = sub_cat_id {
                    let is_inflow = internal_names
                        .get(&cid)
                        .and_then(|n| n.as_deref())
                        == Some("Category/__ImmediateIncome__");

                    if is_inflow {
                        immediate_income += amount;
                    } else if let Some(input) = sub_inputs.get_mut(&cid) {
                        if is_credit_card {
                            input.credit_outflows_milliunits += amount;
                            input.credit_spend_slices.push(CreditSpendSlice {
                                card_account_id: acc_id.clone(),
                                amount_milliunits: amount,
                            });
                        } else {
                            input.cash_outflows_milliunits += amount;
                        }
                    }
                }

                // If transfer involves credit card payment category
                if is_credit_card && transfer_acc_id.is_some() {
                    if let Some(payment_cat_id) = card_to_cat.get(&acc_id) {
                        if let Some(input) = sub_inputs.get_mut(payment_cat_id) {
                            input.cc_payment_cash_transfers_milliunits += -amount;
                        }
                    }
                }
            }
        }

        // Execute 2-Pass Subcategory calculation
        let calc_res =
            calculate_subcategories_for_month(&cat_metas, &sub_inputs, &card_to_cat);

        // Sum cash overspending and additional to be budgeted
        let mut total_cash_overspent: i64 = 0;
        let mut additional_to_be_budgeted: i64 = 0;
        for (_cid, res) in &calc_res {
            total_cash_overspent += res.unbudgeted_cash_outflows;
            additional_to_be_budgeted += res.additional_to_be_budgeted;
        }

        timeline_inputs.insert(
            current_ym.clone(),
            MonthSummaryInput {
                month: current_ym.clone(),
                immediate_income,
                additional_to_be_budgeted,
                total_budgeted,
                total_cash_overspent,
            },
        );

        // Next month rollover balances
        prior_balances.clear();
        for (cid, res) in &calc_res {
            prior_balances.insert(cid.clone(), res.balance);
        }

        if current_ym == target_month {
            target_calc_results = calc_res;
        }

        current_ym = increment_month(in_year, in_month);
    }

    // 5. Calculate timeline for RTA & Stealing from future across the entire timeline
    let timeline_results: BTreeMap<String, MonthSummaryResult> =
        calculate_monthly_timeline(&timeline_inputs);
    let target_summary = timeline_results
        .get(&target_month)
        .cloned()
        .unwrap_or_default();

    // 6. Assemble Category Groups DTOs & Calculate Goals
    let mut groups_dto: Vec<CategoryGroupDto> = Vec::new();
    let mut total_assigned: i64 = 0;
    let mut total_activity: i64 = 0;
    let mut total_available: i64 = 0;

    for m in &master_rows {
        // Skip internal master group from user presentation
        if m.internal_name.as_deref() == Some("MasterCategory/__Internal__") {
            continue;
        }

        let mut cat_dtos: Vec<CategoryDto> = Vec::new();
        for s in &sub_rows {
            if s.master_id != m.id {
                continue;
            }

            let calc = target_calc_results.get(&s.id);
            let (assigned, snoozed_at) = all_monthly_budgets
                .get(&(s.id.clone(), target_month.clone()))
                .cloned()
                .unwrap_or((0, None));
            let is_snoozed = snoozed_at.is_some();

            let activity = calc.map(|c| c.cash_outflows + c.credit_outflows).unwrap_or(0);
            let available = calc.map(|c| c.balance).unwrap_or(0);
            let cash_over = calc.map(|c| c.unbudgeted_cash_outflows).unwrap_or(0);
            let credit_over = calc.map(|c| c.unbudgeted_credit_outflows).unwrap_or(0);

            total_assigned += assigned;
            total_activity += activity;
            total_available += available;

            let cc_bal = s
                .account_id
                .as_ref()
                .and_then(|aid| cc_account_balances.get(aid).copied())
                .unwrap_or(0);

            // Goal evaluation
            let goal_input = GoalEvaluationInput {
                current_month: target_month[0..7].to_string(),
                is_credit_card_payment: s.cat_type == "DBT",
                goal_type: s.goal_type.clone(),
                goal_creation_month: s.goal_created_on.as_ref().map(|d| d[0..7].to_string()),
                target_amount: s.goal_target_amount.unwrap_or(0),
                target_month: s.goal_target_date.as_ref().map(|d| d[0..7].to_string()),
                cadence: s.goal_cadence,
                cadence_frequency: s.goal_cadence_frequency,
                day_of_week: s.goal_day,
                goal_needs_whole_amount: s.goal_needs_whole_amount.unwrap_or(1) != 0,
                is_snoozed,
                budgeted: assigned,
                balance: available,
                activity,
                positive_cash_outflows: calc.and_then(|c| c.positive_cash_outflows).unwrap_or(0),
                cc_account_balance: cc_bal,
                cc_starting_debt_balance: 0,
                cc_additional_to_be_budgeted: 0,
                cc_budgeted_previous_month: 0,
                cc_payment_previous_month: 0,
            };

            let goal_res: SubcategoryGoalResult = evaluate_subcategory_goal(&goal_input);

            cat_dtos.push(CategoryDto {
                id: s.id.clone(),
                budget_id: b_id.clone(),
                group_id: m.id.clone(),
                name: s.name.clone(),
                note: s.note.clone(),
                r#type: s.cat_type.clone(),
                internal_name: s.internal_name.clone(),
                is_credit_card_payment: s.cat_type == "DBT",
                credit_card_account_id: s.account_id.clone(),
                hidden: s.hidden,
                sort_order: s.sort_order,
                assigned_milliunits: assigned,
                activity_milliunits: activity,
                available_milliunits: available,
                cash_overspent_milliunits: cash_over,
                credit_overspent_milliunits: credit_over,
                goal_type: goal_res.goal_type,
                goal_target_amount: goal_res.goal_target_amount,
                goal_under_funded: goal_res.goal_under_funded,
                goal_percentage_complete: goal_res.goal_percentage_complete,
                is_snoozed,
            });
        }

        groups_dto.push(CategoryGroupDto {
            id: m.id.clone(),
            budget_id: b_id.clone(),
            name: m.name.clone(),
            is_system: m.internal_name.is_some(),
            internal_name: m.internal_name.clone(),
            hidden: m.hidden,
            sort_order: m.sort_order,
            categories: cat_dtos,
        });
    }

    Ok(PlanMonthSummaryDto {
        month: target_month,
        ready_to_assign_milliunits: target_summary.left_to_budget,
        total_assigned_milliunits: total_assigned,
        total_activity_milliunits: total_activity,
        total_available_milliunits: total_available,
        funded_in_future_milliunits: target_summary.funded_in_future,
        category_groups: groups_dto,
    })
}

#[tauri::command]
pub fn set_category_assigned(
    payload: SetAssignedPayload,
    state: State<'_, AppState>,
) -> Result<PlanMonthSummaryDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let b_id = payload
        .budget_id
        .unwrap_or_else(|| DEFAULT_BUDGET_ID.to_string());

    // Find or create monthly budget container
    let mb_id: String = match conn.query_row(
        "SELECT id FROM be_monthly_budgets WHERE budget_id = ?1 AND month = ?2",
        params![b_id, payload.month],
        |r| r.get(0),
    ) {
        Ok(id) => id,
        Err(_) => {
            let new_mb_id = format!("mb/{}/{}", payload.month, b_id);
            conn.execute(
                r#"INSERT INTO be_monthly_budgets (id, budget_id, month)
                   VALUES (?1, ?2, ?3)"#,
                params![new_mb_id, b_id, payload.month],
            )
            .map_err(|e| e.to_string())?;
            new_mb_id
        }
    };

    let mcb_id = format!("mcb/{}/{}", payload.month, payload.category_id);
    let mut recorder = ChangeSetRecorder::new(&conn, &b_id, "Set Assigned Amount");

    conn.execute(
        r#"INSERT INTO be_monthly_subcategory_budgets (
               id, budget_id, entities_monthly_budget_id, entities_subcategory_id,
               month, budgeted
           ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
           ON CONFLICT(entities_subcategory_id, month) DO UPDATE SET
               budgeted = ?6,
               updated_at = CURRENT_TIMESTAMP"#,
        params![
            mcb_id,
            b_id,
            mb_id,
            payload.category_id,
            payload.month,
            payload.assigned_milliunits
        ],
    )
    .map_err(|e| e.to_string())?;

    recorder.record_change(
        "be_monthly_subcategory_budgets",
        &mcb_id,
        "update",
        None,
        &payload.assigned_milliunits.to_string(),
    );
    let _ = recorder.commit();

    drop(conn);
    get_budget_month(payload.month, state, Some(b_id))
}

#[tauri::command]
pub fn set_category_goal(
    payload: SetGoalPayload,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let b_id = payload
        .budget_id
        .unwrap_or_else(|| DEFAULT_BUDGET_ID.to_string());

    let now_date = chrono::Local::now().format("%Y-%m-%d").to_string();
    let mut recorder = ChangeSetRecorder::new(&conn, &b_id, "Set Category Goal");

    conn.execute(
        r#"UPDATE be_subcategories
           SET goal_type = ?1,
               goal_created_on = COALESCE(goal_created_on, ?2),
               goal_target_amount = ?3,
               goal_target_date = ?4,
               goal_cadence = ?5,
               goal_cadence_frequency = ?6,
               goal_day = ?7,
               goal_needs_whole_amount = ?8,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?9"#,
        params![
            payload.goal_type,
            now_date,
            payload.target_amount,
            payload.target_date,
            payload.cadence,
            payload.cadence_frequency,
            payload.day_of_week,
            if payload.needs_whole_amount.unwrap_or(true) { 1 } else { 0 },
            payload.category_id,
        ],
    )
    .map_err(|e| e.to_string())?;

    recorder.record_change(
        "be_subcategories",
        &payload.category_id,
        "update",
        None,
        &payload.target_amount.to_string(),
    );
    let _ = recorder.commit();

    Ok(())
}

#[tauri::command]
pub fn snooze_category_goal(
    payload: SnoozeGoalPayload,
    state: State<'_, AppState>,
) -> Result<PlanMonthSummaryDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let _ = &payload.budget_id;
    let now_str = if payload.snooze {
        Some(chrono::Local::now().to_rfc3339())
    } else {
        None
    };

    conn.execute(
        r#"UPDATE be_monthly_subcategory_budgets
           SET goal_snoozed_at = ?1, updated_at = CURRENT_TIMESTAMP
           WHERE entities_subcategory_id = ?2 AND month = ?3"#,
        params![now_str, payload.category_id, payload.month],
    )
    .map_err(|e| e.to_string())?;

    drop(conn);
    get_budget_month(payload.month, state, payload.budget_id)
}

#[tauri::command]
pub fn apply_quick_budget(
    payload: ApplyQuickBudgetPayload,
    state: State<'_, AppState>,
) -> Result<PlanMonthSummaryDto, String> {
    let current_summary = get_budget_month(payload.month.clone(), state.clone(), payload.budget_id.clone())?;
    let b_id = payload
        .budget_id
        .clone()
        .unwrap_or_else(|| DEFAULT_BUDGET_ID.to_string());

    let qb_type = match payload.quick_budget_type.as_str() {
        "Underfunded" => QuickBudgetType::Underfunded,
        "BudgetedLastMonth" => QuickBudgetType::BudgetedLastMonth,
        "SpentLastMonth" => QuickBudgetType::SpentLastMonth,
        "PaidLastMonth" => QuickBudgetType::PaidLastMonth,
        "AverageBudgeted" => QuickBudgetType::AverageBudgeted,
        "AverageSpent" => QuickBudgetType::AverageSpent,
        "AveragePaid" => QuickBudgetType::AveragePaid,
        "GoalTarget" => QuickBudgetType::GoalTarget,
        "RemoveSurplus" => QuickBudgetType::RemoveSurplus,
        "SetAvailableAmountToZero" => QuickBudgetType::SetAvailableAmountToZero,
        "ResetBudgetedAmounts" => QuickBudgetType::ResetBudgetedAmounts,
        _ => return Err(format!("Unknown quick budget type: {}", payload.quick_budget_type)),
    };

    // Filter categories
    let mut candidates = Vec::new();
    let filter_set: Option<std::collections::HashSet<String>> =
        payload.category_ids.map(|ids| ids.into_iter().collect());

    for group in &current_summary.category_groups {
        for cat in &group.categories {
            if let Some(set) = &filter_set {
                if !set.contains(&cat.id) {
                    continue;
                }
            }

            candidates.push(SubcategoryAutoAssignCandidate {
                subcategory_id: cat.id.clone(),
                master_category_id: group.id.clone(),
                master_sort_index: group.sort_order,
                sub_sort_index: cat.sort_order,
                is_credit_card_payment: cat.is_credit_card_payment,
                is_overspent: cat.available_milliunits < 0,
                balance: cat.available_milliunits,
                budgeted: cat.assigned_milliunits,
                activity: cat.activity_milliunits,
                underfunded_amount: cat.goal_under_funded.unwrap_or(0),
                goal_target_amount: cat.goal_target_amount.unwrap_or(0),
                target_date: None,
                is_snoozed: cat.is_snoozed,
                budgeted_last_month: 0,
                spent_last_month: 0,
                paid_last_month: 0,
                average_budgeted: 0,
                average_spent: 0,
                average_paid: 0,
            });
        }
    }

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let plan = if qb_type == QuickBudgetType::Underfunded {
        compute_underfunded_auto_assign_plan(candidates, current_summary.ready_to_assign_milliunits, &today)
    } else {
        compute_batch_quick_budget_plan(&candidates, qb_type)
    };

    // Apply the plan
    {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        let mut recorder = ChangeSetRecorder::new(&conn, &b_id, "Apply Quick Budget");

        // Ensure monthly budget container
        let mb_id: String = match conn.query_row(
            "SELECT id FROM be_monthly_budgets WHERE budget_id = ?1 AND month = ?2",
            params![b_id, payload.month],
            |r| r.get(0),
        ) {
            Ok(id) => id,
            Err(_) => {
                let new_mb_id = format!("mb/{}/{}", payload.month, b_id);
                conn.execute(
                    r#"INSERT INTO be_monthly_budgets (id, budget_id, month) VALUES (?1, ?2, ?3)"#,
                    params![new_mb_id, b_id, payload.month],
                )
                .map_err(|e| e.to_string())?;
                new_mb_id
            }
        };

        for item in plan {
            let mcb_id = format!("mcb/{}/{}", payload.month, item.subcategory_id);
            conn.execute(
                r#"INSERT INTO be_monthly_subcategory_budgets (
                       id, budget_id, entities_monthly_budget_id, entities_subcategory_id,
                       month, budgeted
                   ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                   ON CONFLICT(entities_subcategory_id, month) DO UPDATE SET
                       budgeted = ?6,
                       updated_at = CURRENT_TIMESTAMP"#,
                params![
                    mcb_id,
                    b_id,
                    mb_id,
                    item.subcategory_id,
                    payload.month,
                    item.new_budgeted
                ],
            )
            .map_err(|e| e.to_string())?;

            recorder.record_change(
                "be_monthly_subcategory_budgets",
                &mcb_id,
                "update",
                None,
                &item.new_budgeted.to_string(),
            );
        }

        let _ = recorder.commit();
    }

    get_budget_month(payload.month, state, payload.budget_id)
}

#[tauri::command]
pub fn get_transactions(
    account_id: Option<String>,
    state: State<'_, AppState>,
    budget_id: Option<String>,
) -> Result<Vec<TransactionDto>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let b_id = budget_id.unwrap_or_else(|| DEFAULT_BUDGET_ID.to_string());

    let sql = match account_id {
        Some(_) => {
            r#"SELECT t.id, t.budget_id, t.entities_account_id, t.entities_payee_id, p.name,
                      t.entities_subcategory_id, c.name, t.date, t.amount, t.memo,
                      t.cleared, t.accepted, t.flag, t.transfer_account_id, t.transfer_transaction_id
               FROM be_transactions t
               LEFT JOIN be_payees p ON t.entities_payee_id = p.id
               LEFT JOIN be_subcategories c ON t.entities_subcategory_id = c.id
               WHERE t.budget_id = ?1 AND t.entities_account_id = ?2 AND t.is_tombstone = 0
               ORDER BY t.date DESC, t.created_at DESC"#
        }
        None => {
            r#"SELECT t.id, t.budget_id, t.entities_account_id, t.entities_payee_id, p.name,
                      t.entities_subcategory_id, c.name, t.date, t.amount, t.memo,
                      t.cleared, t.accepted, t.flag, t.transfer_account_id, t.transfer_transaction_id
               FROM be_transactions t
               LEFT JOIN be_payees p ON t.entities_payee_id = p.id
               LEFT JOIN be_subcategories c ON t.entities_subcategory_id = c.id
               WHERE t.budget_id = ?1 AND t.is_tombstone = 0
               ORDER BY t.date DESC, t.created_at DESC"#
        }
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let mapper = |r: &rusqlite::Row| {
        Ok(TransactionDto {
            id: r.get(0)?,
            budget_id: r.get(1)?,
            account_id: r.get(2)?,
            payee_id: r.get(3)?,
            payee_name: r.get(4)?,
            category_id: r.get(5)?,
            category_name: r.get(6)?,
            date: r.get(7)?,
            amount_milliunits: r.get(8)?,
            memo: r.get(9)?,
            cleared: r.get(10)?,
            approved: r.get::<_, i32>(11)? != 0,
            flag: r.get(12)?,
            transfer_account_id: r.get(13)?,
            transfer_transaction_id: r.get(14)?,
        })
    };

    let txs = match account_id {
        Some(aid) => stmt
            .query_map(params![b_id, aid], mapper)
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .collect(),
        None => stmt
            .query_map(params![b_id], mapper)
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .collect(),
    };

    Ok(txs)
}

#[tauri::command]
pub fn save_transaction(
    payload: SaveTransactionPayload,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    do_save_transaction(&conn, &payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reconcile_account(
    payload: ReconcileAccountPayload,
    state: State<'_, AppState>,
) -> Result<ReconcileResponse, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let b_id = payload
        .budget_id
        .unwrap_or_else(|| DEFAULT_BUDGET_ID.to_string());

    let res: ReconcileAccountResult = do_reconcile(
        &conn,
        &b_id,
        &payload.account_id,
        payload.target_balance_milliunits,
        payload.create_adjustment,
    )
    .map_err(|e| e.to_string())?;

    Ok(ReconcileResponse {
        account_id: res.account_id,
        target_balance_milliunits: res.target_balance_milliunits,
        adjustment_amount_milliunits: res.adjustment_amount_milliunits,
        reconciled_tx_count: res.reconciled_tx_count,
    })
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

fn parse_year_month(ym: &str) -> (i32, u32) {
    let parts: Vec<&str> = ym.split('-').collect();
    let year: i32 = parts[0].parse().unwrap_or(2026);
    let month: u32 = parts[1].parse().unwrap_or(1);
    (year, month)
}

fn increment_month(year: i32, month: u32) -> String {
    if month == 12 {
        format!("{:04}-01-01", year + 1)
    } else {
        format!("{:04}-{:02}-01", year, month + 1)
    }
}
