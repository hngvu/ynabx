//! Lightweight compatibility wrappers around `repo` functions for existing command-level test suites
//! (zero dependency on `tauri`, using `Arc<AppState>` with `Mutex<Connection>`).

use rusqlite::Connection;
use std::sync::{Arc, Mutex};

use crate::ledger::transfers::SaveTransactionPayload;
pub use crate::repo::{
    add_payee_rename_condition as repo_add_payee_rename_condition,
    apply_quick_budget as repo_apply_quick_budget, bulk_update_transactions_in_db,
    calculate_category_historical_stats, close_account_in_db,
    combine_payees as repo_combine_payees, commit_file_import as repo_commit_file_import,
    create_account as repo_create_account, create_category_group as repo_create_category_group,
    create_subcategory as repo_create_subcategory, delete_account as repo_delete_account,
    delete_category as repo_delete_category, delete_payee as repo_delete_payee,
    delete_payee_rename_condition as repo_delete_payee_rename_condition,
    delete_transactions as repo_delete_transactions, get_accounts as repo_get_accounts,
    get_budget_month as repo_get_budget_month, get_loan_terms as repo_get_loan_terms,
    get_payees as repo_get_payees, get_plan_summary as repo_get_plan_summary,
    get_transactions as repo_get_transactions, hide_category as repo_hide_category,
    increment_month, list_payee_rename_conditions as repo_list_payee_rename_conditions,
    list_recent_moves as repo_list_recent_moves,
    list_scheduled_transactions_for_account as repo_list_scheduled_transactions_for_account,
    make_fresh_start as repo_make_fresh_start, match_transactions as repo_match_transactions,
    move_money_between_categories as repo_move_money_between_categories, parse_year_month,
    preview_file_import as repo_preview_file_import, reconcile_account as repo_reconcile_account,
    rename_category as repo_rename_category, reorder_accounts as repo_reorder_accounts,
    reorder_categories as repo_reorder_categories, safe_ym_prefix,
    save_loan_terms as repo_save_loan_terms, save_transaction as repo_save_transaction,
    set_category_assigned as repo_set_category_assigned,
    set_category_goal as repo_set_category_goal, simulate_loan_payoff as repo_simulate_loan_payoff,
    skip_scheduled_occurrence as repo_skip_scheduled_occurrence,
    snooze_category_goal as repo_snooze_category_goal,
    toggle_transaction_cleared as repo_toggle_transaction_cleared,
    unmatch_transactions as repo_unmatch_transactions, update_account as repo_update_account,
    update_category_note as repo_update_category_note, update_payee as repo_update_payee,
    update_plan_settings as repo_update_plan_settings, AccountDto, ApplyQuickBudgetPayload,
    CategoryDto, CategoryGroupDto, CombinePayeesResult, CreateAccountPayload,
    DeleteTransactionsPayload, FreshStartPayload, ImportCommitResult, ImportOptions,
    ImportPreviewResult, LoanAccountTerms, LoanPayoffSimulation, PayeeDto, PayeeRenameCondition,
    PlanMonthSummaryDto, PlanSummaryDto, RecentMoveEntry, RecentMoveFilter,
    ReconcileAccountPayload, ReconcileResponse, RenameOperator, ScheduledTransferViewRow,
    SetAssignedPayload, SetGoalPayload, SnoozeGoalPayload, ToggleClearedPayload, TransactionDto,
    UpdateAccountPayload, UpdatePlanSettingsPayload,
};

pub struct AppState {
    pub db: Mutex<Connection>,
}

pub type StateRef = Arc<AppState>;

#[derive(Debug)]
pub struct HideCategoryPayload {
    pub category_id: Option<String>,
    pub id: Option<String>,
    pub is_master: Option<bool>,
    pub is_hidden: Option<bool>,
}

#[derive(Debug)]
pub struct BulkUpdateTransactionsPayload {
    pub transaction_ids: Vec<String>,
    pub action: String,
    pub payload: serde_json::Value,
}

#[derive(Debug)]
pub struct UpdatePayeePayload {
    pub payee_id: Option<String>,
    pub id: Option<String>,
    pub name: String,
}

#[derive(Debug)]
pub struct DeletePayeePayload {
    pub payee_id: Option<String>,
    pub id: Option<String>,
}

#[derive(Debug)]
pub struct ReorderAccountsPayload {
    pub ordered_ids: Vec<String>,
}

#[derive(Debug)]
pub struct ReorderCategoriesPayload {
    pub budget_id: Option<String>,
    pub ordered_group_ids: Option<Vec<String>>,
    pub subcategories_by_group: Option<serde_json::Value>,
}

#[derive(Debug)]
pub struct CloseAccountPayload {
    pub id: Option<String>,
    pub account_id: Option<String>,
    pub budget_id: Option<String>,
}

pub fn get_plan_summary(
    state: StateRef,
    budget_id: Option<String>,
) -> Result<PlanSummaryDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_get_plan_summary(&conn, budget_id.as_deref())
}

pub fn get_accounts(state: StateRef, budget_id: Option<String>) -> Result<Vec<AccountDto>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_get_accounts(&conn, budget_id.as_deref())
}

pub fn create_account(
    payload: CreateAccountPayload,
    state: StateRef,
    budget_id: Option<String>,
) -> Result<AccountDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_create_account(&conn, &payload, budget_id.as_deref())
}

pub fn get_budget_month(
    target_month: String,
    state: StateRef,
    budget_id: Option<String>,
) -> Result<PlanMonthSummaryDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_get_budget_month(&conn, &target_month, budget_id.as_deref())
}

pub fn set_category_assigned(
    payload: SetAssignedPayload,
    state: StateRef,
) -> Result<PlanMonthSummaryDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_set_category_assigned(&conn, &payload)
}

pub fn set_category_goal(payload: SetGoalPayload, state: StateRef) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_set_category_goal(&conn, &payload)
}

pub fn snooze_category_goal(
    payload: SnoozeGoalPayload,
    state: StateRef,
) -> Result<PlanMonthSummaryDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_snooze_category_goal(&conn, &payload)
}

pub fn apply_quick_budget(
    payload: ApplyQuickBudgetPayload,
    state: StateRef,
) -> Result<PlanMonthSummaryDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_apply_quick_budget(&conn, &payload)
}

pub fn get_transactions(
    account_id: Option<String>,
    state: StateRef,
    budget_id: Option<String>,
) -> Result<Vec<TransactionDto>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_get_transactions(&conn, account_id.as_deref(), budget_id.as_deref())
}

pub fn save_transaction(
    payload: SaveTransactionPayload,
    state: StateRef,
) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_save_transaction(&conn, &payload)
}

pub fn reconcile_account(
    payload: ReconcileAccountPayload,
    state: StateRef,
) -> Result<ReconcileResponse, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_reconcile_account(&conn, &payload)
}

pub fn delete_transactions(
    payload: DeleteTransactionsPayload,
    state: StateRef,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_delete_transactions(&conn, &payload)
}

pub fn toggle_transaction_cleared(
    payload: ToggleClearedPayload,
    state: StateRef,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_toggle_transaction_cleared(&conn, &payload)
}

pub fn close_account(
    account_id: Option<String>,
    payload: Option<CloseAccountPayload>,
    state: StateRef,
) -> Result<(), String> {
    let acc_id = account_id
        .or_else(|| {
            payload
                .as_ref()
                .and_then(|p| p.account_id.clone().or_else(|| p.id.clone()))
        })
        .ok_or_else(|| "account_id is required".to_string())?;
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    close_account_in_db(&conn, &acc_id)
}

pub fn hide_category(
    category_id: Option<String>,
    is_master: Option<bool>,
    is_hidden: Option<bool>,
    payload: Option<HideCategoryPayload>,
    state: StateRef,
) -> Result<(), String> {
    let cat_id = category_id
        .or_else(|| {
            payload
                .as_ref()
                .and_then(|p| p.category_id.clone().or_else(|| p.id.clone()))
        })
        .ok_or_else(|| "category_id is required".to_string())?;
    let is_m = is_master
        .or_else(|| payload.as_ref().and_then(|p| p.is_master))
        .unwrap_or(false);
    let is_h = is_hidden
        .or_else(|| payload.as_ref().and_then(|p| p.is_hidden))
        .unwrap_or(true);
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_hide_category(&conn, &cat_id, is_m, is_h)
}

pub fn bulk_update_transactions(
    transaction_ids: Option<Vec<String>>,
    action: Option<String>,
    payload: Option<serde_json::Value>,
    bulk_payload: Option<BulkUpdateTransactionsPayload>,
    state: StateRef,
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

pub fn get_payees(budget_id: Option<String>, state: StateRef) -> Result<Vec<PayeeDto>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_get_payees(&conn, budget_id.as_deref())
}

pub fn update_payee(
    payee_id: Option<String>,
    name: Option<String>,
    payload: Option<UpdatePayeePayload>,
    state: StateRef,
) -> Result<(), String> {
    let pid = payee_id
        .or_else(|| {
            payload
                .as_ref()
                .and_then(|p| p.payee_id.clone().or_else(|| p.id.clone()))
        })
        .ok_or_else(|| "payee_id is required".to_string())?;
    let new_name = name
        .or_else(|| payload.as_ref().map(|p| p.name.clone()))
        .ok_or_else(|| "name is required".to_string())?;
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_update_payee(&conn, &pid, &new_name)
}

pub fn delete_payee(
    payee_id: Option<String>,
    payload: Option<DeletePayeePayload>,
    state: StateRef,
) -> Result<(), String> {
    let pid = payee_id
        .or_else(|| {
            payload
                .as_ref()
                .and_then(|p| p.payee_id.clone().or_else(|| p.id.clone()))
        })
        .ok_or_else(|| "payee_id is required".to_string())?;
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_delete_payee(&conn, &pid)
}

pub fn reorder_accounts(
    ordered_ids: Option<Vec<String>>,
    payload: Option<ReorderAccountsPayload>,
    state: StateRef,
) -> Result<(), String> {
    let ids = ordered_ids
        .or_else(|| payload.map(|p| p.ordered_ids))
        .ok_or_else(|| "ordered_ids is required".to_string())?;
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_reorder_accounts(&conn, &ids)
}

pub fn reorder_categories(
    budget_id: Option<String>,
    ordered_group_ids: Option<Vec<String>>,
    subcategories_by_group: Option<serde_json::Value>,
    payload: Option<ReorderCategoriesPayload>,
    state: StateRef,
) -> Result<(), String> {
    let b_id = budget_id.or_else(|| payload.as_ref().and_then(|p| p.budget_id.clone()));
    let groups = ordered_group_ids
        .or_else(|| payload.as_ref().and_then(|p| p.ordered_group_ids.clone()))
        .unwrap_or_default();
    let subcats_map =
        subcategories_by_group.or_else(|| payload.and_then(|p| p.subcategories_by_group));
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_reorder_categories(&mut conn, b_id.as_deref(), &groups, subcats_map.as_ref())
}

pub fn make_fresh_start(
    budget_id: Option<String>,
    new_name: Option<String>,
    payload: Option<FreshStartPayload>,
    state: StateRef,
) -> Result<String, String> {
    let b_id = budget_id.or_else(|| payload.as_ref().and_then(|p| p.budget_id.clone()));
    let fresh_name = new_name.or_else(|| payload.as_ref().and_then(|p| p.new_name.clone()));
    let preserve = payload.and_then(|p| p.preserve_current_balance_as_starting);
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_make_fresh_start(
        &mut conn,
        &FreshStartPayload {
            budget_id: b_id,
            new_name: fresh_name,
            preserve_current_balance_as_starting: preserve,
        },
    )
}

pub fn update_category_note(
    category_id: String,
    note: String,
    state: StateRef,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_update_category_note(&conn, &category_id, &note)
}

pub fn move_money_between_categories(
    budget_id: Option<String>,
    month: String,
    from_category_id: Option<String>,
    to_category_id: Option<String>,
    amount_milliunits: i64,
    state: StateRef,
) -> Result<PlanMonthSummaryDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_move_money_between_categories(
        &conn,
        budget_id.as_deref(),
        &month,
        from_category_id.as_deref(),
        to_category_id.as_deref(),
        amount_milliunits,
    )
}

pub fn list_recent_moves(
    budget_id: Option<String>,
    filter: RecentMoveFilter,
    subcategory_id: Option<String>,
    state: StateRef,
) -> Result<Vec<RecentMoveEntry>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_list_recent_moves(
        &conn,
        budget_id.as_deref(),
        filter,
        subcategory_id.as_deref(),
    )
}

pub fn preview_file_import(
    budget_id: Option<String>,
    account_id: String,
    filename: Option<String>,
    content: String,
    options: ImportOptions,
    state: StateRef,
) -> Result<ImportPreviewResult, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_preview_file_import(
        &conn,
        budget_id.as_deref(),
        &account_id,
        filename.as_deref(),
        &content,
        &options,
    )
}

pub fn commit_file_import(
    budget_id: Option<String>,
    account_id: String,
    filename: Option<String>,
    content: String,
    options: ImportOptions,
    state: StateRef,
) -> Result<ImportCommitResult, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_commit_file_import(
        &mut conn,
        budget_id.as_deref(),
        &account_id,
        filename.as_deref(),
        &content,
        &options,
    )
}

pub fn match_transactions(
    manual_tx_id: String,
    imported_tx_id: String,
    state: StateRef,
) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_match_transactions(&mut conn, &manual_tx_id, &imported_tx_id)
}

pub fn unmatch_transactions(tx_ids: Vec<String>, state: StateRef) -> Result<Vec<String>, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_unmatch_transactions(&mut conn, &tx_ids)
}

pub fn get_loan_terms(account_id: String, state: StateRef) -> Result<LoanAccountTerms, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_get_loan_terms(&conn, &account_id)
}

pub fn save_loan_terms(terms: LoanAccountTerms, state: StateRef) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_save_loan_terms(&conn, &terms)
}

pub fn simulate_loan_payoff(
    account_id: String,
    extra_monthly_milliunits: i64,
    one_time_extra_milliunits: i64,
    start_date_override: Option<String>,
    state: StateRef,
) -> Result<LoanPayoffSimulation, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_simulate_loan_payoff(
        &conn,
        &account_id,
        extra_monthly_milliunits,
        one_time_extra_milliunits,
        start_date_override.as_deref(),
    )
}

pub fn combine_payees(
    budget_id: Option<String>,
    source_payee_ids: Vec<String>,
    target_payee_id_or_new_name: String,
    state: StateRef,
) -> Result<CombinePayeesResult, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_combine_payees(
        &mut conn,
        budget_id.as_deref(),
        &source_payee_ids,
        &target_payee_id_or_new_name,
    )
}

pub fn list_payee_rename_conditions(
    budget_id: Option<String>,
    payee_id: Option<String>,
    state: StateRef,
) -> Result<Vec<PayeeRenameCondition>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_list_payee_rename_conditions(&conn, budget_id.as_deref(), payee_id.as_deref())
}

pub fn add_payee_rename_condition(
    budget_id: Option<String>,
    payee_id: String,
    operator: RenameOperator,
    operand: String,
    state: StateRef,
) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_add_payee_rename_condition(&conn, budget_id.as_deref(), &payee_id, operator, &operand)
}

pub fn delete_payee_rename_condition(rule_id: String, state: StateRef) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_delete_payee_rename_condition(&conn, &rule_id)
}

pub fn skip_scheduled_occurrence(
    scheduled_id: String,
    state: StateRef,
) -> Result<Option<String>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_skip_scheduled_occurrence(&conn, &scheduled_id)
}

pub fn list_scheduled_transactions_for_account(
    budget_id: Option<String>,
    account_id: Option<String>,
    state: StateRef,
) -> Result<Vec<ScheduledTransferViewRow>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    repo_list_scheduled_transactions_for_account(&conn, budget_id.as_deref(), account_id.as_deref())
}
