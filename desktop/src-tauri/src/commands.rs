//! Tauri IPC Commands connecting SQLite and YNAB calculation engines to the Desktop UI.

use rusqlite::{params, Connection, Result};
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
    #[serde(default)]
    pub budgeted_last_month: i64,
    #[serde(default)]
    pub spent_last_month: i64,
    #[serde(default)]
    pub average_budgeted: i64,
    #[serde(default)]
    pub average_spent: i64,
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
    pub account_name: Option<String>,
    #[serde(rename = "accountName", default)]
    pub account_name_camel: Option<String>,
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

#[derive(Debug, Serialize, Deserialize)]
pub struct PayeeDto {
    pub id: String,
    pub budget_id: String,
    pub name: String,
    pub internal_name: Option<String>,
    pub account_id: Option<String>,
    pub enabled: bool,
    pub auto_fill_subcategory_id: Option<String>,
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

#[derive(Debug, Deserialize)]
pub struct HideCategoryPayload {
    pub category_id: Option<String>,
    pub id: Option<String>,
    pub is_master: Option<bool>,
    pub is_hidden: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct BulkUpdateTransactionsPayload {
    pub transaction_ids: Vec<String>,
    pub action: String,
    pub payload: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePayeePayload {
    pub payee_id: Option<String>,
    pub id: Option<String>,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct DeletePayeePayload {
    pub payee_id: Option<String>,
    pub id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReorderAccountsPayload {
    pub ordered_ids: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReorderCategoriesPayload {
    pub budget_id: Option<String>,
    pub ordered_group_ids: Option<Vec<String>>,
    pub subcategories_by_group: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct FreshStartPayload {
    pub budget_id: Option<String>,
    pub new_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CloseAccountPayload {
    pub id: Option<String>,
    pub account_id: Option<String>,
    pub budget_id: Option<String>,
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
    if (payload.account_type.eq_ignore_ascii_case("creditcard")
        || payload.account_type.eq_ignore_ascii_case("lineofcredit")
        || payload.account_type.eq_ignore_ascii_case("credit"))
        && on_budget
    {
        let debt_master_id: String = conn
            .query_row(
                "SELECT id FROM be_master_categories WHERE budget_id = ?1 AND internal_name = ?2 AND is_tombstone = 0 ORDER BY rowid ASC LIMIT 1",
                params![b_id, MASTER_CAT_DEBT_PAYMENT],
                |r| r.get(0),
            )
            .unwrap_or_else(|_| MASTER_CAT_DEBT_PAYMENT.to_string());
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
                debt_master_id,
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
                "SELECT id FROM be_payees WHERE budget_id = ?1 AND (internal_name = 'StartingBalancePayee' OR internal_name = 'Payee/__StartingBalance__')",
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
        let ym_prefix = format!("{:04}-{:02}", in_year, in_month);

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
                let is_credit_card = acc_type.eq_ignore_ascii_case("creditcard")
                    || acc_type.eq_ignore_ascii_case("lineofcredit")
                    || acc_type.eq_ignore_ascii_case("credit");

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
                current_month: safe_ym_prefix(&target_month),
                is_credit_card_payment: s.cat_type == "DBT",
                goal_type: s.goal_type.clone(),
                goal_creation_month: s.goal_created_on.as_ref().map(|d| safe_ym_prefix(d)),
                target_amount: s.goal_target_amount.unwrap_or(0),
                target_month: s.goal_target_date.as_ref().map(|d| safe_ym_prefix(d)),
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
            let (b_lm, s_lm, a_b, a_s) = calculate_category_historical_stats(&conn, &s.id, &target_month);

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
                budgeted_last_month: b_lm,
                spent_last_month: s_lm,
                average_budgeted: a_b,
                average_spent: a_s,
            });
        }

        let is_empty_system_group = matches!(
            m.internal_name.as_deref(),
            Some("MasterCategory/__DebtPayment__") | Some("MasterCategory/__Hidden__")
        ) && cat_dtos.is_empty();
        if is_empty_system_group {
            continue;
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
        if group.hidden {
            continue;
        }
        for cat in &group.categories {
            if cat.hidden {
                continue;
            }
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
                budgeted_last_month: cat.budgeted_last_month,
                spent_last_month: cat.spent_last_month,
                paid_last_month: 0,
                average_budgeted: cat.average_budgeted,
                average_spent: cat.average_spent,
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
                      t.cleared, t.accepted, t.flag, t.transfer_account_id, t.transfer_transaction_id,
                      a.account_name
               FROM be_transactions t
               LEFT JOIN be_payees p ON t.entities_payee_id = p.id
               LEFT JOIN be_subcategories c ON t.entities_subcategory_id = c.id
               LEFT JOIN be_accounts a ON t.entities_account_id = a.id
               WHERE t.budget_id = ?1 AND t.entities_account_id = ?2 AND t.is_tombstone = 0
               ORDER BY t.date DESC, t.created_at DESC"#
        }
        None => {
            r#"SELECT t.id, t.budget_id, t.entities_account_id, t.entities_payee_id, p.name,
                      t.entities_subcategory_id, c.name, t.date, t.amount, t.memo,
                      t.cleared, t.accepted, t.flag, t.transfer_account_id, t.transfer_transaction_id,
                      a.account_name
               FROM be_transactions t
               LEFT JOIN be_payees p ON t.entities_payee_id = p.id
               LEFT JOIN be_subcategories c ON t.entities_subcategory_id = c.id
               LEFT JOIN be_accounts a ON t.entities_account_id = a.id
               WHERE t.budget_id = ?1 AND t.is_tombstone = 0
               ORDER BY t.date DESC, t.created_at DESC"#
        }
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let mapper = |r: &rusqlite::Row| {
        let acc_name: Option<String> = r.get(15)?;
        Ok(TransactionDto {
            id: r.get(0)?,
            budget_id: r.get(1)?,
            account_id: r.get(2)?,
            account_name: acc_name.clone(),
            account_name_camel: acc_name,
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
// Transaction Operations
// -------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct DeleteTransactionsPayload {
    pub ids: Vec<String>,
    pub budget_id: Option<String>,
}

#[tauri::command]
pub fn delete_transactions(
    payload: DeleteTransactionsPayload,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    for id in &payload.ids {
        let row_info: Option<(String, Option<String>)> = conn
            .query_row(
                "SELECT entities_account_id, transfer_transaction_id FROM be_transactions WHERE id = ?1",
                params![id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .ok();

        if let Some((account_id, peer_id)) = row_info {
            let _ = conn.execute(
                "UPDATE be_transactions SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
                params![id],
            );
            let _ = crate::ledger::transfers::update_account_balances(&conn, &account_id);

            if let Some(pid) = peer_id {
                let peer_account_id: Option<String> = conn
                    .query_row(
                        "SELECT entities_account_id FROM be_transactions WHERE id = ?1",
                        params![pid],
                        |r| r.get(0),
                    )
                    .ok();
                let _ = conn.execute(
                    "UPDATE be_transactions SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
                    params![pid],
                );
                if let Some(paid) = peer_account_id {
                    let _ = crate::ledger::transfers::update_account_balances(&conn, &paid);
                }
            }
        }
    }
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct ToggleClearedPayload {
    pub id: String,
    pub cleared: String,
    pub budget_id: Option<String>,
}

#[tauri::command]
pub fn toggle_transaction_cleared(
    payload: ToggleClearedPayload,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let account_id: String = conn
        .query_row(
            "SELECT entities_account_id FROM be_transactions WHERE id = ?1",
            params![payload.id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE be_transactions SET cleared = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![payload.cleared, payload.id],
    )
    .map_err(|e| e.to_string())?;

    let _ = crate::ledger::transfers::update_account_balances(&conn, &account_id);
    Ok(())
}

// -------------------------------------------------------------
// Account Operations
// -------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct UpdateAccountPayload {
    pub id: String,
    pub name: String,
    pub note: Option<String>,
    pub budget_id: Option<String>,
}

#[tauri::command]
pub fn update_account(
    payload: UpdateAccountPayload,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE be_accounts SET account_name = ?1, note = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
        params![payload.name, payload.note, payload.id],
    )
    .map_err(|e| e.to_string())?;

    let transfer_name = format!("Transfer : {}", payload.name);
    let _ = conn.execute(
        "UPDATE be_payees SET name = ?1, updated_at = CURRENT_TIMESTAMP WHERE entities_account_id = ?2",
        params![transfer_name, payload.id],
    );
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct DeleteAccountPayload {
    pub id: String,
    pub budget_id: Option<String>,
}

#[tauri::command]
pub fn delete_account(
    payload: DeleteAccountPayload,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE be_accounts SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![payload.id],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE be_transactions SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE entities_account_id = ?1",
        params![payload.id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn close_account_in_db(conn: &Connection, acc_id: &str) -> Result<(), String> {
    // Query account details: cleared, uncleared, on_budget, budget_id, account_type
    let row_info: Option<(i64, i64, i32, String, String)> = conn
        .query_row(
            "SELECT cleared_balance, uncleared_balance, on_budget, budget_id, account_type FROM be_accounts WHERE id = ?1",
            params![acc_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
        )
        .ok();

    if let Some((cleared, uncleared, on_budget, budget_id, account_type)) = row_info {
        let working_balance = cleared + uncleared;
        if working_balance != 0 {
            let delta = -working_balance;
            let adj_payee_id: Option<String> = conn
                .query_row(
                    "SELECT id FROM be_payees WHERE budget_id = ?1 AND (internal_name = 'BalanceAdjustmentPayee' OR internal_name = 'ManualBalanceAdjustmentPayee')",
                    params![budget_id],
                    |r| r.get(0),
                )
                .ok();

            let adj_cat_id: Option<String> = if on_budget == 1 {
                conn.query_row(
                    "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name = 'Category/__ImmediateIncome__'",
                    params![budget_id],
                    |r| r.get(0),
                )
                .ok()
            } else {
                None
            };

            let today = chrono::Local::now().format("%Y-%m-%d").to_string();
            let adj_tx_id = Uuid::new_v4().to_string();
            let (cash_amount, credit_amount) =
                crate::ledger::transfers::determine_cash_credit_amounts(&account_type, delta);

            conn.execute(
                r#"INSERT INTO be_transactions (
                       id, budget_id, entities_account_id, entities_payee_id, entities_subcategory_id,
                       date, amount, cash_amount, credit_amount, memo, cleared, accepted
                   ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'Account Close Adjustment', 'Cleared', 1)"#,
                params![
                    adj_tx_id,
                    budget_id,
                    acc_id,
                    adj_payee_id,
                    adj_cat_id,
                    today,
                    delta,
                    cash_amount,
                    credit_amount,
                ],
            )
            .map_err(|e| e.to_string())?;

            let _ = crate::ledger::transfers::update_account_balances(conn, acc_id);
        }

        conn.execute(
            "UPDATE be_accounts SET closed = 1, is_closed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            params![acc_id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        return Err(format!("Account {} not found", acc_id));
    }

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn close_account(
    account_id: Option<String>,
    payload: Option<CloseAccountPayload>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let acc_id = account_id
        .or_else(|| payload.as_ref().and_then(|p| p.account_id.clone().or_else(|| p.id.clone())))
        .ok_or_else(|| "account_id is required".to_string())?;

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    close_account_in_db(&conn, &acc_id)
}

// -------------------------------------------------------------
// Category & Group Operations
// -------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct CreateCategoryGroupPayload {
    pub name: String,
    pub budget_id: Option<String>,
}

#[tauri::command]
pub fn create_category_group(
    payload: CreateCategoryGroupPayload,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let b_id = payload.budget_id.unwrap_or_else(|| DEFAULT_BUDGET_ID.to_string());
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_master_categories (id, budget_id, name, deletable, sortable_index) VALUES (?1, ?2, ?3, 1, 10000)",
        params![id, b_id, payload.name],
    )
    .map_err(|e| e.to_string())?;
    Ok(id)
}

#[derive(Debug, Deserialize)]
pub struct CreateSubcategoryPayload {
    pub master_id: String,
    pub name: String,
    pub budget_id: Option<String>,
}

#[tauri::command]
pub fn create_subcategory(
    payload: CreateSubcategoryPayload,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let b_id = payload.budget_id.unwrap_or_else(|| DEFAULT_BUDGET_ID.to_string());
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_subcategories (id, budget_id, entities_master_category_id, name, type, sortable_index) VALUES (?1, ?2, ?3, ?4, 'DFT', 1000)",
        params![id, b_id, payload.master_id, payload.name],
    )
    .map_err(|e| e.to_string())?;
    Ok(id)
}

#[derive(Debug, Deserialize)]
pub struct RenameCategoryPayload {
    pub id: String,
    pub name: String,
    pub is_master: bool,
}

#[tauri::command]
pub fn rename_category(
    payload: RenameCategoryPayload,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    if payload.is_master {
        conn.execute(
            "UPDATE be_master_categories SET name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![payload.name, payload.id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE be_subcategories SET name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![payload.name, payload.id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct DeleteCategoryPayload {
    pub id: String,
    pub is_master: bool,
}

#[tauri::command]
pub fn delete_category(
    payload: DeleteCategoryPayload,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    if payload.is_master {
        conn.execute(
            "UPDATE be_master_categories SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            params![payload.id],
        )
        .map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE be_subcategories SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE entities_master_category_id = ?1",
            params![payload.id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE be_subcategories SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            params![payload.id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct UpdateCategoryNotePayload {
    pub id: String,
    pub note: String,
}

#[tauri::command]
pub fn update_category_note(
    payload: UpdateCategoryNotePayload,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE be_subcategories SET note = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![payload.note, payload.id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn hide_category(
    category_id: Option<String>,
    is_master: Option<bool>,
    is_hidden: Option<bool>,
    payload: Option<HideCategoryPayload>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let cat_id = category_id
        .or_else(|| payload.as_ref().and_then(|p| p.category_id.clone().or_else(|| p.id.clone())))
        .ok_or_else(|| "category_id is required".to_string())?;
    let is_m = is_master
        .or_else(|| payload.as_ref().and_then(|p| p.is_master))
        .unwrap_or(false);
    let is_h = is_hidden
        .or_else(|| payload.as_ref().and_then(|p| p.is_hidden))
        .unwrap_or(true);
    let hidden_val = if is_h { 1 } else { 0 };

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    if is_m {
        conn.execute(
            "UPDATE be_master_categories SET is_hidden = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![hidden_val, cat_id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE be_subcategories SET is_hidden = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![hidden_val, cat_id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn bulk_update_transactions_in_db(
    conn: &mut Connection,
    tx_ids: &[String],
    act: &str,
    pload: &serde_json::Value,
) -> Result<(), String> {
    if tx_ids.is_empty() {
        return Ok(());
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let mut affected_account_ids = std::collections::HashSet::new();

    match act {
        "clear" => {
            for tid in tx_ids {
                let row_info: Option<(String, String, i32)> = tx
                    .query_row(
                        "SELECT entities_account_id, cleared, is_tombstone FROM be_transactions WHERE id = ?1",
                        params![tid],
                        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
                    )
                    .ok();

                if let Some((acc_id, cleared_val, is_tombstone)) = row_info {
                    if cleared_val != "Reconciled" && is_tombstone == 0 {
                        affected_account_ids.insert(acc_id);
                        tx.execute(
                            "UPDATE be_transactions SET cleared = 'Cleared', updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND cleared != 'Reconciled' AND is_tombstone = 0",
                            params![tid],
                        )
                        .map_err(|e| e.to_string())?;
                    }
                }
            }
        }
        "unclear" => {
            for tid in tx_ids {
                let row_info: Option<(String, String, i32)> = tx
                    .query_row(
                        "SELECT entities_account_id, cleared, is_tombstone FROM be_transactions WHERE id = ?1",
                        params![tid],
                        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
                    )
                    .ok();

                if let Some((acc_id, cleared_val, is_tombstone)) = row_info {
                    if cleared_val != "Reconciled" && is_tombstone == 0 {
                        affected_account_ids.insert(acc_id);
                        tx.execute(
                            "UPDATE be_transactions SET cleared = 'Uncleared', updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND cleared != 'Reconciled' AND is_tombstone = 0",
                            params![tid],
                        )
                        .map_err(|e| e.to_string())?;
                    }
                }
            }
        }
        "flag" => {
            let flag_val: Option<String> = pload
                .get("flag")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty() && *s != "none")
                .map(|s| s.to_string());
            for tid in tx_ids {
                tx.execute(
                    "UPDATE be_transactions SET flag = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND is_tombstone = 0",
                    params![flag_val, tid],
                )
                .map_err(|e| e.to_string())?;
            }
        }
        "move_account" => {
            let new_acc_id = pload
                .get("account_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "account_id is required in payload for move_account".to_string())?;

            let new_acc_type: String = tx
                .query_row(
                    "SELECT account_type FROM be_accounts WHERE id = ?1",
                    params![new_acc_id],
                    |r| r.get(0),
                )
                .map_err(|e| format!("Destination account not found: {}", e))?;

            affected_account_ids.insert(new_acc_id.to_string());

            for tid in tx_ids {
                let row_info: Option<(String, i64, i32)> = tx
                    .query_row(
                        "SELECT entities_account_id, amount, is_tombstone FROM be_transactions WHERE id = ?1",
                        params![tid],
                        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
                    )
                    .ok();

                if let Some((old_acc_id, amount, is_tombstone)) = row_info {
                    if is_tombstone == 0 {
                        affected_account_ids.insert(old_acc_id);
                        let (cash, credit) = crate::ledger::transfers::determine_cash_credit_amounts(&new_acc_type, amount);
                        tx.execute(
                            "UPDATE be_transactions SET entities_account_id = ?1, cash_amount = ?2, credit_amount = ?3, updated_at = CURRENT_TIMESTAMP WHERE id = ?4 AND is_tombstone = 0",
                            params![new_acc_id, cash, credit, tid],
                        )
                        .map_err(|e| e.to_string())?;
                    }
                }
            }
        }
        "categorize" => {
            let cat_id: Option<String> = pload
                .get("category_id")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string());
            for tid in tx_ids {
                tx.execute(
                    "UPDATE be_transactions SET entities_subcategory_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND is_tombstone = 0",
                    params![cat_id, tid],
                )
                .map_err(|e| e.to_string())?;
            }
        }
        other => return Err(format!("Unknown action: {}", other)),
    }

    tx.commit().map_err(|e| e.to_string())?;

    for acc_id in affected_account_ids {
        let _ = crate::ledger::transfers::update_account_balances(conn, &acc_id);
    }

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn bulk_update_transactions(
    transaction_ids: Option<Vec<String>>,
    action: Option<String>,
    payload: Option<serde_json::Value>,
    bulk_payload: Option<BulkUpdateTransactionsPayload>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let (tx_ids, act, pload) = match bulk_payload {
        Some(bp) => (bp.transaction_ids, bp.action, bp.payload),
        None => (
            transaction_ids.ok_or_else(|| "transaction_ids is required".to_string())?,
            action.ok_or_else(|| "action is required".to_string())?,
            payload.unwrap_or(serde_json::Value::Null),
        ),
    };

    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    bulk_update_transactions_in_db(&mut conn, &tx_ids, &act, &pload)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_payees(
    budget_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<PayeeDto>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let b_id = budget_id.unwrap_or_else(|| DEFAULT_BUDGET_ID.to_string());

    let mut stmt = conn
        .prepare(
            r#"SELECT id, budget_id, name, internal_name, entities_account_id, enabled, auto_fill_subcategory_id
               FROM be_payees
               WHERE budget_id = ?1 AND is_tombstone = 0
               ORDER BY name ASC"#,
        )
        .map_err(|e| e.to_string())?;

    let payees = stmt
        .query_map(params![b_id], |r| {
            Ok(PayeeDto {
                id: r.get(0)?,
                budget_id: r.get(1)?,
                name: r.get(2)?,
                internal_name: r.get(3)?,
                account_id: r.get(4)?,
                enabled: r.get::<_, i32>(5)? != 0,
                auto_fill_subcategory_id: r.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    Ok(payees)
}

#[tauri::command(rename_all = "snake_case")]
pub fn update_payee(
    payee_id: Option<String>,
    name: Option<String>,
    payload: Option<UpdatePayeePayload>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pid = payee_id
        .or_else(|| payload.as_ref().and_then(|p| p.payee_id.clone().or_else(|| p.id.clone())))
        .ok_or_else(|| "payee_id is required".to_string())?;
    let new_name = name
        .or_else(|| payload.as_ref().map(|p| p.name.clone()))
        .ok_or_else(|| "name is required".to_string())?;

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE be_payees SET name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![new_name, pid],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn delete_payee(
    payee_id: Option<String>,
    payload: Option<DeletePayeePayload>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pid = payee_id
        .or_else(|| payload.as_ref().and_then(|p| p.payee_id.clone().or_else(|| p.id.clone())))
        .ok_or_else(|| "payee_id is required".to_string())?;

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE be_payees SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![pid],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn reorder_accounts(
    ordered_ids: Option<Vec<String>>,
    payload: Option<ReorderAccountsPayload>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let ids = ordered_ids
        .or_else(|| payload.map(|p| p.ordered_ids))
        .ok_or_else(|| "ordered_ids is required".to_string())?;

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    for (idx, id) in ids.iter().enumerate() {
        let sort_idx = (idx as i32 + 1) * 1000;
        conn.execute(
            "UPDATE be_accounts SET sortable_index = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![sort_idx, id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn reorder_categories(
    budget_id: Option<String>,
    ordered_group_ids: Option<Vec<String>>,
    subcategories_by_group: Option<serde_json::Value>,
    payload: Option<ReorderCategoriesPayload>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let b_id = budget_id
        .or_else(|| payload.as_ref().and_then(|p| p.budget_id.clone()))
        .unwrap_or_else(|| DEFAULT_BUDGET_ID.to_string());
    let groups = ordered_group_ids
        .or_else(|| payload.as_ref().and_then(|p| p.ordered_group_ids.clone()))
        .unwrap_or_default();
    let subcats_map = subcategories_by_group
        .or_else(|| payload.and_then(|p| p.subcategories_by_group));

    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Update master category sortable_index
    for (g_idx, group_id) in groups.iter().enumerate() {
        let g_sort = (g_idx as i32 + 1) * 1000;
        tx.execute(
            "UPDATE be_master_categories SET sortable_index = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND budget_id = ?3",
            params![g_sort, group_id, b_id],
        )
        .map_err(|e| e.to_string())?;
    }

    // Update subcategories sortable_index and master_category_id
    if let Some(val) = subcats_map {
        if let Some(map) = val.as_object() {
            for (group_id, cat_list) in map {
                if let Some(arr) = cat_list.as_array() {
                    for (c_idx, c_val) in arr.iter().enumerate() {
                        if let Some(cat_id) = c_val.as_str() {
                            let c_sort = (c_idx as i32 + 1) * 100;
                            tx.execute(
                                "UPDATE be_subcategories SET sortable_index = ?1, entities_master_category_id = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3 AND budget_id = ?4",
                                params![c_sort, group_id, cat_id, b_id],
                            )
                            .map_err(|e| e.to_string())?;
                        }
                    }
                }
            }
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn make_fresh_start(
    budget_id: Option<String>,
    new_name: Option<String>,
    payload: Option<FreshStartPayload>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let b_id = budget_id
        .or_else(|| payload.as_ref().and_then(|p| p.budget_id.clone()))
        .unwrap_or_else(|| DEFAULT_BUDGET_ID.to_string());
    let fresh_name = new_name
        .or_else(|| payload.and_then(|p| p.new_name))
        .unwrap_or_else(|| "Fresh Start Budget".to_string());

    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Update budget name
    tx.execute(
        "UPDATE be_budgets SET budget_name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![fresh_name, b_id],
    )
    .map_err(|e| e.to_string())?;

    // 2. Soft-delete all non-starting-balance transactions
    tx.execute(
        r#"UPDATE be_transactions
           SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP
           WHERE budget_id = ?1
             AND (entities_payee_id IS NULL OR entities_payee_id NOT IN (
                 SELECT id FROM be_payees
                 WHERE budget_id = ?1 AND (internal_name = 'StartingBalancePayee' OR internal_name = 'Payee/__StartingBalance__')
             ))"#,
        params![b_id],
    )
    .map_err(|e| e.to_string())?;

    // 3. Soft-delete all subtransactions
    tx.execute(
        "UPDATE be_subtransactions SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE budget_id = ?1",
        params![b_id],
    )
    .map_err(|e| e.to_string())?;

    // 4. Reset monthly allocations to 0
    tx.execute(
        "UPDATE be_monthly_subcategory_budgets SET budgeted = 0, updated_at = CURRENT_TIMESTAMP WHERE budget_id = ?1",
        params![b_id],
    )
    .map_err(|e| e.to_string())?;

    // 5. Query all active accounts to update their balances
    let account_ids: Vec<String> = {
        let mut stmt = tx
            .prepare("SELECT id FROM be_accounts WHERE budget_id = ?1 AND is_tombstone = 0")
            .map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![b_id], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        rows.filter_map(Result::ok).collect()
    };

    tx.commit().map_err(|e| e.to_string())?;

    // 6. Recalculate balances for all accounts
    for acc_id in account_ids {
        let _ = crate::ledger::transfers::update_account_balances(&conn, &acc_id);
    }

    Ok(b_id)
}

// -------------------------------------------------------------
// Plan Settings Operations
// -------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct UpdatePlanSettingsPayload {
    pub name: String,
    pub budget_id: Option<String>,
}

#[tauri::command]
pub fn update_plan_settings(
    payload: UpdatePlanSettingsPayload,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let b_id = payload.budget_id.unwrap_or_else(|| DEFAULT_BUDGET_ID.to_string());
    conn.execute(
        "UPDATE be_budgets SET budget_name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![payload.name, b_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

pub fn safe_ym_prefix(s: &str) -> String {
    let (y, m) = parse_year_month(s);
    format!("{:04}-{:02}", y, m)
}

pub fn parse_year_month(ym: &str) -> (i32, u32) {
    let parts: Vec<&str> = ym.split('-').collect();
    let year: i32 = parts.first().and_then(|s| s.parse().ok()).unwrap_or(2026);
    let month: u32 = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(1).clamp(1, 12);
    (year, month)
}

pub fn increment_month(year: i32, month: u32) -> String {
    if month == 12 {
        format!("{:04}-01-01", year + 1)
    } else {
        format!("{:04}-{:02}-01", year, month + 1)
    }
}

pub fn calculate_category_historical_stats(
    conn: &rusqlite::Connection,
    subcategory_id: &str,
    target_month: &str,
) -> (i64, i64, i64, i64) {
    let (year, month) = parse_year_month(target_month);
    let (prev_year, prev_month) = if month == 1 {
        (year - 1, 12)
    } else {
        (year, month - 1)
    };
    let prev_month_str = format!("{:04}-{:02}-01", prev_year, prev_month);
    let prev_ym_prefix = format!("{:04}-{:02}", prev_year, prev_month);

    // 1. budgeted_last_month
    let budgeted_last_month: i64 = conn
        .query_row(
            "SELECT budgeted FROM be_monthly_subcategory_budgets WHERE entities_subcategory_id = ?1 AND month = ?2 AND is_tombstone = 0",
            params![subcategory_id, prev_month_str],
            |r| r.get(0),
        )
        .unwrap_or(0);

    // 2. spent_last_month (sum of outflows in preceding month as positive number)
    let spent_last_month: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM be_transactions WHERE entities_subcategory_id = ?1 AND date LIKE (?2 || '%') AND is_tombstone = 0 AND amount < 0",
            params![subcategory_id, prev_ym_prefix],
            |r| r.get::<_, i64>(0),
        )
        .map(|sum| sum.abs())
        .unwrap_or(0);

    // 3. average_budgeted over available prior months
    let (budget_sum, budget_count): (i64, i64) = conn
        .query_row(
            "SELECT COALESCE(SUM(budgeted), 0), COUNT(*) FROM be_monthly_subcategory_budgets WHERE entities_subcategory_id = ?1 AND month < ?2 AND is_tombstone = 0",
            params![subcategory_id, target_month],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap_or((0, 0));
    let average_budgeted = if budget_count > 0 {
        budget_sum / budget_count
    } else {
        0
    };

    // 4. average_spent (monthly average outflow over months where spending occurred prior to target_month)
    let mut stmt = conn
        .prepare(
            "SELECT strftime('%Y-%m', date) as ym, SUM(amount) FROM be_transactions WHERE entities_subcategory_id = ?1 AND date < ?2 AND is_tombstone = 0 AND amount < 0 GROUP BY ym",
        )
        .ok();
    let mut month_count = 0i64;
    let mut total_spent = 0i64;
    if let Some(ref mut s) = stmt {
        let rows = s.query_map(params![subcategory_id, target_month], |r| {
            let m_spent: i64 = r.get(1)?;
            Ok(m_spent)
        });
        if let Ok(iter) = rows {
            for r in iter.flatten() {
                month_count += 1;
                total_spent += r.abs();
            }
        }
    }
    let average_spent = if month_count > 0 {
        total_spent / month_count
    } else {
        0
    };

    (budgeted_last_month, spent_last_month, average_budgeted, average_spent)
}
