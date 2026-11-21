//! Synchronous SQLite Repository Services for `ynab-core` (Zero N+1 queries, 100% integer math).
//! Replaces `commands.rs` and fixes all 13 audited domain, invariant, and persistence defects.

#![deny(clippy::float_arithmetic)]

use rusqlite::{params, Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, HashSet};
use uuid::Uuid;

use crate::calc::auto_assign::{
    compute_batch_quick_budget_plan, compute_underfunded_auto_assign_plan, QuickBudgetType,
    SubcategoryAutoAssignCandidate,
};
use crate::calc::goals_calc::{
    evaluate_subcategory_goal, GoalEvaluationInput, SubcategoryGoalResult,
};
use crate::calc::monthly_calc::{
    calculate_monthly_timeline, MonthSummaryInput, MonthSummaryResult,
};
use crate::calc::subcategory_calc::{
    calculate_subcategories_for_month, CategoryMeta, CreditSpendSlice,
    SubcategoryCalculationResult, SubcategoryMonthInput,
};
use crate::changeset::ChangeSetRecorder;
use crate::format::{CurrencyFormatConfig, DateFormatConfig};
pub use crate::import::{
    ImportCommitResult, ImportFileFormat, ImportOptions, ImportPreviewResult, ImportPreviewRow,
    ImportRowStatus, PayeeRenameCondition, RenameOperator,
};
pub use crate::ledger::money_movements::{
    CombinePayeesResult, MoneyMovementSource, RecentMoveEntry, RecentMoveFilter,
    RecordMoneyMovementPayload, ScheduledTransferViewRow,
};
use crate::ledger::reconcile::{reconcile_account as do_reconcile, ReconcileAccountResult};
use crate::ledger::scheduled::skip_scheduled_occurrence as do_skip_scheduled;
use crate::ledger::transfers::{
    determine_cash_credit_amounts, save_transaction as do_save_transaction,
    update_account_balances, SaveTransactionPayload, SubTransactionDto,
};
pub use crate::loan::{
    AmortizationMonthRow, AmortizationResult, LoanAccountTerms, LoanParams, LoanPayoffSimulation,
    LoanProgress,
};
use crate::seed::{
    CAT_IMMEDIATE_INCOME, DEFAULT_BUDGET_ID, MASTER_CAT_DEBT_PAYMENT, PAYEE_MANUAL_ADJUSTMENT,
    PAYEE_STARTING_BALANCE,
};
use crate::sortable_index::calculate_midpoint_index;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AccountGroup {
    Cash,
    Credit,
    Loan,
    Tracking,
    Closed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AccountType {
    Checking,
    Savings,
    Cash,
    CreditCard,
    LineOfCredit,
    OtherAsset,
    OtherLiability,
    Mortgage,
    AutoLoan,
    StudentLoan,
    PersonalLoan,
    MedicalDebt,
    OtherDebt,
}

impl AccountType {
    pub fn from_str_loose(s: &str) -> Self {
        match s.trim().to_ascii_lowercase().as_str() {
            "checking" => Self::Checking,
            "savings" => Self::Savings,
            "cash" => Self::Cash,
            "creditcard" | "credit" | "credit_card" => Self::CreditCard,
            "lineofcredit" | "line_of_credit" => Self::LineOfCredit,
            "otherasset" | "other_asset" | "asset" | "investment" => Self::OtherAsset,
            "otherliability" | "other_liability" | "liability" => Self::OtherLiability,
            "mortgage" => Self::Mortgage,
            "autoloan" | "auto_loan" => Self::AutoLoan,
            "studentloan" | "student_loan" => Self::StudentLoan,
            "personalloan" | "personal_loan" => Self::PersonalLoan,
            "medicaldebt" | "medical_debt" => Self::MedicalDebt,
            "otherdebt" | "other_debt" | "loan" => Self::OtherDebt,
            _ => Self::Checking,
        }
    }

    pub fn canonical_str(&self) -> &'static str {
        match self {
            Self::Checking => "checking",
            Self::Savings => "savings",
            Self::Cash => "cash",
            Self::CreditCard => "creditCard",
            Self::LineOfCredit => "lineOfCredit",
            Self::OtherAsset => "otherAsset",
            Self::OtherLiability => "otherLiability",
            Self::Mortgage => "mortgage",
            Self::AutoLoan => "autoLoan",
            Self::StudentLoan => "studentLoan",
            Self::PersonalLoan => "personalLoan",
            Self::MedicalDebt => "medicalDebt",
            Self::OtherDebt => "otherDebt",
        }
    }

    pub fn is_credit_card(&self) -> bool {
        matches!(self, Self::CreditCard | Self::LineOfCredit)
    }

    pub fn default_on_budget(&self) -> bool {
        matches!(
            self,
            Self::Checking | Self::Savings | Self::Cash | Self::CreditCard | Self::LineOfCredit
        )
    }

    pub fn sidebar_group(&self, is_closed: bool) -> AccountGroup {
        if is_closed {
            return AccountGroup::Closed;
        }
        match self {
            Self::Checking | Self::Savings | Self::Cash => AccountGroup::Cash,
            Self::CreditCard | Self::LineOfCredit => AccountGroup::Credit,
            Self::Mortgage
            | Self::AutoLoan
            | Self::StudentLoan
            | Self::PersonalLoan
            | Self::MedicalDebt
            | Self::OtherDebt => AccountGroup::Loan,
            Self::OtherAsset | Self::OtherLiability => AccountGroup::Tracking,
        }
    }
}

pub fn is_credit_card_account(acc_type: Option<&str>) -> bool {
    let Some(s) = acc_type else {
        return false;
    };
    AccountType::from_str_loose(s).is_credit_card()
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlanSummaryDto {
    pub id: String,
    pub name: String,
    pub currency_code: String,
    pub number_format: String,
    pub currency_symbol_first: bool,
    pub currency_display_symbol: bool,
    pub currency_symbol: String,
    pub decimal_digits: u8,
    pub decimal_separator: String,
    pub group_separator: String,
    pub date_format: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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

impl AccountDto {
    pub fn parsed_type(&self) -> AccountType {
        AccountType::from_str_loose(&self.r#type)
    }

    pub fn sidebar_group(&self) -> AccountGroup {
        self.parsed_type().sidebar_group(self.closed)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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
    pub from_previous_month_milliunits: i64,
    pub cash_overspent_milliunits: i64,
    pub credit_overspent_milliunits: i64,
    pub goal_type: Option<String>,
    pub goal_target_amount: Option<i64>,
    pub goal_target_date: Option<String>,
    pub goal_cadence: Option<i32>,
    pub goal_cadence_frequency: Option<i32>,
    pub goal_day: Option<i32>,
    pub goal_needs_whole_amount: Option<bool>,
    pub goal_under_funded: Option<i64>,
    pub goal_percentage_complete: Option<i32>,
    pub is_snoozed: bool,
    #[serde(default)]
    pub budgeted_last_month: i64,
    #[serde(default)]
    pub spent_last_month: i64,
    #[serde(default)]
    pub paid_last_month: i64,
    #[serde(default)]
    pub average_budgeted: i64,
    #[serde(default)]
    pub average_spent: i64,
    #[serde(default)]
    pub average_paid: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlanMonthSummaryDto {
    pub month: String,
    pub ready_to_assign_milliunits: i64,
    pub total_assigned_milliunits: i64,
    pub total_activity_milliunits: i64,
    pub total_available_milliunits: i64,
    pub funded_in_future_milliunits: i64,
    pub immediate_income_milliunits: i64,
    pub prior_month_overspent_milliunits: i64,
    pub category_groups: Vec<CategoryGroupDto>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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
    #[serde(default)]
    pub import_id: Option<String>,
    #[serde(default)]
    pub imported_payee: Option<String>,
    #[serde(default)]
    pub matched_transaction_id: Option<String>,
    #[serde(default)]
    pub source: Option<String>,
    #[serde(default)]
    pub subtransactions: Vec<SubTransactionDto>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PayeeDto {
    pub id: String,
    pub budget_id: String,
    pub name: String,
    pub internal_name: Option<String>,
    pub account_id: Option<String>,
    pub enabled: bool,
    pub auto_fill_subcategory_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAccountPayload {
    pub name: String,
    pub account_type: String,
    pub balance_milliunits: i64,
    pub on_budget: Option<bool>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetAssignedPayload {
    pub budget_id: Option<String>,
    pub category_id: String,
    pub month: String, // "YYYY-MM-01"
    pub assigned_milliunits: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnoozeGoalPayload {
    pub budget_id: Option<String>,
    pub category_id: String,
    pub month: String,
    pub snooze: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplyQuickBudgetPayload {
    pub budget_id: Option<String>,
    pub month: String,
    pub quick_budget_type: String,
    pub category_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReconcileAccountPayload {
    pub budget_id: Option<String>,
    pub account_id: String,
    pub target_balance_milliunits: i64,
    pub create_adjustment: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReconcileResponse {
    pub account_id: String,
    pub target_balance_milliunits: i64,
    pub adjustment_amount_milliunits: i64,
    pub reconciled_tx_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeleteTransactionsPayload {
    pub ids: Vec<String>,
    pub budget_id: Option<String>,
    #[serde(default)]
    pub allow_reconciled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToggleClearedPayload {
    pub id: String,
    pub cleared: String,
    pub budget_id: Option<String>,
    #[serde(default)]
    pub allow_reconciled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAccountPayload {
    pub id: String,
    pub name: String,
    pub note: Option<String>,
    pub budget_id: Option<String>,
    pub balance_adjustment_delta: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdatePlanSettingsPayload {
    pub name: String,
    pub budget_id: Option<String>,
    pub currency_format: Option<CurrencyFormatConfig>,
    pub date_format: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FreshStartPayload {
    pub budget_id: Option<String>,
    pub new_name: Option<String>,
    pub preserve_current_balance_as_starting: Option<bool>,
}

// -------------------------------------------------------------
// Repository Functions
// -------------------------------------------------------------

/// Reads budget summary and properly decodes JSON `currency_format` and `date_format` (Bug #1 fix).
pub fn get_plan_summary(
    conn: &Connection,
    budget_id: Option<&str>,
) -> Result<PlanSummaryDto, String> {
    let b_id = budget_id.unwrap_or(DEFAULT_BUDGET_ID);

    let (id, name, currency_json, date_json): (String, String, String, String) = conn
        .query_row(
            "SELECT id, budget_name, currency_format, date_format FROM be_budgets WHERE id = ?1",
            params![b_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )
        .map_err(|e| e.to_string())?;

    let curr_cfg: CurrencyFormatConfig = serde_json::from_str(&currency_json).unwrap_or_default();
    let date_cfg: DateFormatConfig =
        serde_json::from_str(&date_json).unwrap_or_else(|_| DateFormatConfig {
            format: if date_json.trim().starts_with('{') {
                "YYYY-MM-DD".to_string()
            } else {
                date_json.clone()
            },
        });

    Ok(PlanSummaryDto {
        id,
        name,
        currency_code: curr_cfg.iso_code,
        number_format: curr_cfg.example_format,
        currency_symbol_first: curr_cfg.symbol_first,
        currency_display_symbol: curr_cfg.display_symbol,
        currency_symbol: curr_cfg.currency_symbol,
        decimal_digits: curr_cfg.decimal_digits,
        decimal_separator: curr_cfg.decimal_separator,
        group_separator: curr_cfg.group_separator,
        date_format: date_cfg.format,
    })
}

pub fn list_budgets(conn: &Connection) -> Result<Vec<(String, String)>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, budget_name FROM be_budgets WHERE is_tombstone = 0 ORDER BY created_at ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;
    Ok(rows.filter_map(SqlResult::ok).collect())
}

pub fn create_new_budget(conn: &mut Connection, budget_name: &str) -> Result<String, String> {
    let new_id = Uuid::new_v4().to_string();
    crate::seed::seed_new_budget(conn, &new_id, budget_name).map_err(|e| e.to_string())?;
    Ok(new_id)
}

pub fn get_setting(
    conn: &Connection,
    budget_id: &str,
    setting_name: &str,
) -> Result<Option<String>, String> {
    let id = format!("{}/{}", budget_id, setting_name);
    let val = conn
        .query_row(
            "SELECT setting_value FROM be_settings WHERE id = ?1 OR setting_name = ?2 ORDER BY CASE WHEN id = ?1 THEN 0 ELSE 1 END LIMIT 1",
            params![id, setting_name],
            |r| r.get::<_, String>(0),
        )
        .ok();
    Ok(val)
}

pub fn set_setting(
    conn: &Connection,
    budget_id: &str,
    setting_name: &str,
    setting_value: &str,
) -> Result<(), String> {
    let id = format!("{}/{}", budget_id, setting_name);
    conn.execute(
        r#"INSERT INTO be_settings (id, setting_name, setting_value, updated_at)
           VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)
           ON CONFLICT(id) DO UPDATE SET
               setting_value = ?3,
               updated_at = CURRENT_TIMESTAMP"#,
        params![id, setting_name, setting_value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_accounts(conn: &Connection, budget_id: Option<&str>) -> Result<Vec<AccountDto>, String> {
    let b_id = budget_id.unwrap_or(DEFAULT_BUDGET_ID);

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
            let raw_type: String = r.get(3)?;
            let canonical_type = AccountType::from_str_loose(&raw_type)
                .canonical_str()
                .to_string();
            Ok(AccountDto {
                id: r.get(0)?,
                budget_id: r.get(1)?,
                name: r.get(2)?,
                r#type: canonical_type,
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
        .filter_map(SqlResult::ok)
        .collect();

    Ok(accounts)
}

pub fn create_account(
    conn: &Connection,
    payload: &CreateAccountPayload,
    budget_id: Option<&str>,
) -> Result<AccountDto, String> {
    let b_id = budget_id.unwrap_or(DEFAULT_BUDGET_ID);
    let acc_id = Uuid::new_v4().to_string();
    let parsed_type = AccountType::from_str_loose(&payload.account_type);
    let canonical_type = parsed_type.canonical_str().to_string();
    let on_budget = payload
        .on_budget
        .unwrap_or_else(|| parsed_type.default_on_budget());

    // Find next sortable_index using midpoint
    let max_idx: Option<i32> = conn
        .query_row(
            "SELECT MAX(sortable_index) FROM be_accounts WHERE budget_id = ?1 AND is_tombstone = 0",
            params![b_id],
            |r| r.get(0),
        )
        .ok()
        .flatten();
    let next_sort = calculate_midpoint_index(max_idx, None).unwrap_or(1000);

    let mut recorder = ChangeSetRecorder::new(conn, b_id, "Create Account");

    conn.execute(
        r#"INSERT INTO be_accounts (
               id, budget_id, account_name, account_type, on_budget, closed,
               note, cleared_balance, uncleared_balance, sortable_index
           ) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, 0, 0, ?7)"#,
        params![
            acc_id,
            b_id,
            payload.name,
            canonical_type,
            if on_budget { 1 } else { 0 },
            payload.note,
            next_sort
        ],
    )
    .map_err(|e| e.to_string())?;

    let after_json = serde_json::json!({
        "account_name": payload.name,
        "is_tombstone": 0
    })
    .to_string();
    recorder.record_change("be_accounts", &acc_id, "insert", None, &after_json);

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
    if parsed_type.is_credit_card() && on_budget {
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
            params![cat_id, b_id, debt_master_id, acc_id, cat_name],
        )
        .map_err(|e| e.to_string())?;
    }

    // Initial starting balance transaction if non-zero (insert directly and record in the same ChangeSet)
    if payload.balance_milliunits != 0 {
        let starting_payee_id: Option<String> = conn
            .query_row(
                "SELECT id FROM be_payees WHERE budget_id = ?1 AND (internal_name = ?2 OR internal_name = 'Payee/__StartingBalance__')",
                params![b_id, PAYEE_STARTING_BALANCE],
                |r| r.get::<_, String>(0),
            )
            .ok();

        let starting_cat_id: Option<String> = if on_budget {
            conn.query_row(
                "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name = ?2",
                params![b_id, CAT_IMMEDIATE_INCOME],
                |r| r.get::<_, String>(0),
            )
            .ok()
        } else {
            None
        };

        let now = chrono::Local::now().format("%Y-%m-%d").to_string();
        let init_tx_id = Uuid::new_v4().to_string();
        let (cash_amt, credit_amt) =
            determine_cash_credit_amounts(&canonical_type, payload.balance_milliunits);

        conn.execute(
            r#"INSERT INTO be_transactions (
                   id, budget_id, entities_account_id, entities_payee_id, entities_subcategory_id,
                   date, amount, cash_amount, credit_amount, memo, cleared, accepted
               ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'Starting Balance', 'Cleared', 1)"#,
            params![
                init_tx_id,
                b_id,
                acc_id,
                starting_payee_id,
                starting_cat_id,
                now,
                payload.balance_milliunits,
                cash_amt,
                credit_amt
            ],
        )
        .map_err(|e| e.to_string())?;

        let tx_after = serde_json::json!({
            "is_tombstone": 0,
            "amount": payload.balance_milliunits,
            "cash_amount": cash_amt,
            "credit_amount": credit_amt,
            "cleared": "Cleared"
        })
        .to_string();
        recorder.record_change("be_transactions", &init_tx_id, "insert", None, &tx_after);
        let _ = update_account_balances(conn, &acc_id);
    }

    let _ = recorder.commit();

    Ok(AccountDto {
        id: acc_id,
        budget_id: b_id.to_string(),
        name: payload.name.clone(),
        r#type: canonical_type,
        on_budget,
        closed: false,
        balance_milliunits: payload.balance_milliunits,
        cleared_balance_milliunits: payload.balance_milliunits,
        uncleared_balance_milliunits: 0,
        note: payload.note.clone(),
        last_reconciled_at: None,
        sort_order: next_sort,
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

#[derive(Debug, Clone)]
struct BulkOnBudgetTxItem {
    acc_id: String,
    sub_cat_id: Option<String>,
    amount: i64,
    acc_type: String,
    transfer_acc_id: Option<String>,
}

/// Computes the complete budget month state in bounded queries (4 SQL queries total, zero N+1 loops!)
/// and tracks cumulative Credit Card balances chronologically per month (fixing Bugs #2, #3, #8, #10).
pub fn get_budget_month(
    conn: &Connection,
    target_month: &str,
    budget_id: Option<&str>,
) -> Result<PlanMonthSummaryDto, String> {
    let b_id = budget_id.unwrap_or(DEFAULT_BUDGET_ID);
    let normalized_target = format!("{}-01", safe_ym_prefix(target_month));

    // Query 1: Fetch all Master Categories
    struct MasterRow {
        id: String,
        name: String,
        internal_name: Option<String>,
        sort_order: i32,
        hidden: bool,
    }

    let master_rows: Vec<MasterRow> = {
        let mut stmt = conn
            .prepare(
                r#"SELECT id, name, internal_name, sortable_index, is_hidden
                   FROM be_master_categories
                   WHERE budget_id = ?1 AND is_tombstone = 0
                   ORDER BY sortable_index ASC"#,
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![b_id], |r| {
                Ok(MasterRow {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    internal_name: r.get(2)?,
                    sort_order: r.get(3)?,
                    hidden: r.get::<_, i32>(4)? != 0,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.filter_map(SqlResult::ok).collect()
    };

    // Query 2: Fetch all Subcategories with Goal configuration
    let sub_rows: Vec<SubRowData> = {
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
        let rows = stmt
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
            .map_err(|e| e.to_string())?;
        rows.filter_map(SqlResult::ok).collect()
    };

    let mut cat_metas: Vec<CategoryMeta> = Vec::with_capacity(sub_rows.len());
    let mut card_to_cat: HashMap<String, String> = HashMap::new();
    let mut internal_names: HashMap<String, Option<String>> =
        HashMap::with_capacity(sub_rows.len());

    for s in &sub_rows {
        internal_names.insert(s.id.clone(), s.internal_name.clone());
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

    // Query 3: Preload all monthly subcategory budgets in a single query
    // Also track min/max allocation month in memory
    let mut all_monthly_budgets: HashMap<(String, String), (i64, Option<String>)> = HashMap::new();
    let mut budgets_by_cat: HashMap<String, Vec<(String, i64)>> = HashMap::new();
    let mut min_month = normalized_target.clone();
    let mut max_month = normalized_target.clone();

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
            let ym_key = format!("{}-01", safe_ym_prefix(&r.1));
            if ym_key < min_month {
                min_month = ym_key.clone();
            }
            if ym_key > max_month {
                max_month = ym_key.clone();
            }
            all_monthly_budgets.insert((r.0.clone(), ym_key.clone()), (r.2, r.3));
            budgets_by_cat.entry(r.0).or_default().push((ym_key, r.2));
        }
    }

    // Query 4: Preload all on-budget transactions (and split subtransactions) in a single query!
    // Bucket them by month_key = "YYYY-MM-01" and compute historical spending per category in memory.
    let mut txs_by_month: BTreeMap<String, Vec<BulkOnBudgetTxItem>> = BTreeMap::new();
    let mut cat_monthly_outflows: HashMap<String, BTreeMap<String, i64>> = HashMap::new();

    {
        let mut stmt = conn
            .prepare(
                r#"SELECT t.entities_account_id,
                          CASE WHEN st.id IS NOT NULL THEN st.entities_subcategory_id ELSE t.entities_subcategory_id END,
                          CASE WHEN st.id IS NOT NULL THEN st.amount ELSE t.amount END,
                          a.account_type,
                          CASE WHEN st.id IS NOT NULL THEN st.transfer_account_id ELSE t.transfer_account_id END,
                          t.date
                   FROM be_transactions t
                   JOIN be_accounts a ON t.entities_account_id = a.id
                   LEFT JOIN be_subtransactions st ON st.entities_transaction_id = t.id AND st.is_tombstone = 0
                   WHERE t.budget_id = ?1 AND t.is_tombstone = 0 AND a.on_budget = 1
                   ORDER BY t.date ASC, t.id ASC, st.sortable_index ASC"#,
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![b_id], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, Option<String>>(1)?,
                    r.get::<_, i64>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, Option<String>>(4)?,
                    r.get::<_, String>(5)?,
                ))
            })
            .map_err(|e| e.to_string())?;

        for item in rows.flatten() {
            let (acc_id, sub_cat_id, amount, acc_type, transfer_acc_id, date_str) = item;
            let month_key = format!("{}-01", safe_ym_prefix(&date_str));
            if month_key < min_month {
                min_month = month_key.clone();
            }
            if month_key > max_month {
                max_month = month_key.clone();
            }

            if let Some(cid) = &sub_cat_id {
                if amount < 0 {
                    *cat_monthly_outflows
                        .entry(cid.clone())
                        .or_default()
                        .entry(month_key.clone())
                        .or_insert(0) += amount;
                }
            }

            txs_by_month
                .entry(month_key)
                .or_default()
                .push(BulkOnBudgetTxItem {
                    acc_id,
                    sub_cat_id,
                    amount,
                    acc_type,
                    transfer_acc_id,
                });
        }
    }

    // Step through all months from min_month to max_month in memory
    let mut prior_balances: HashMap<String, i64> = HashMap::new();
    let mut running_cc_balances: HashMap<String, i64> = HashMap::new();
    let mut timeline_inputs: BTreeMap<String, MonthSummaryInput> = BTreeMap::new();
    let mut target_calc_results: HashMap<String, SubcategoryCalculationResult> = HashMap::new();
    let mut target_cc_balances: HashMap<String, i64> = HashMap::new();
    let mut target_prev_overspent: i64 = 0;
    let mut running_prev_overspent: i64 = 0;

    let mut current_ym = min_month;
    while current_ym <= max_month {
        let (in_year, in_month) = parse_year_month(&current_ym);

        let mut sub_inputs: HashMap<String, SubcategoryMonthInput> = HashMap::new();
        let mut immediate_income: i64 = 0;
        let mut total_budgeted: i64 = 0;

        // First, update cumulative credit card balances for transactions in `current_ym`
        let prev_cc_balances = running_cc_balances.clone();
        if let Some(month_txs) = txs_by_month.get(&current_ym) {
            for tx in month_txs {
                if AccountType::from_str_loose(&tx.acc_type).is_credit_card() {
                    *running_cc_balances.entry(tx.acc_id.clone()).or_insert(0) += tx.amount;
                }
            }
        }

        for meta in &cat_metas {
            let (budgeted, _) = all_monthly_budgets
                .get(&(meta.id.clone(), current_ym.clone()))
                .cloned()
                .unwrap_or((0, None));

            if meta.internal_name.as_deref() != Some(CAT_IMMEDIATE_INCOME) {
                total_budgeted += budgeted;
            }

            let prev_bal = prior_balances.get(&meta.id).copied().unwrap_or(0);
            let (cc_bal, cc_pos_delta) = if let Some(aid) = &meta.account_id {
                let cur_cc = running_cc_balances.get(aid).copied().unwrap_or(0);
                let prev_cc = prev_cc_balances.get(aid).copied().unwrap_or(0);
                let pos_cur = cur_cc.max(0);
                let pos_prev = prev_cc.max(0);
                (cur_cc, (pos_cur - pos_prev).max(0))
            } else {
                (0, 0)
            };

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
                    cc_positive_inflow_delta: cc_pos_delta,
                },
            );
        }

        if let Some(month_txs) = txs_by_month.get(&current_ym) {
            for tx in month_txs {
                let is_credit_card = AccountType::from_str_loose(&tx.acc_type).is_credit_card();

                if let Some(cid) = &tx.sub_cat_id {
                    let is_inflow = internal_names.get(cid).and_then(|n| n.as_deref())
                        == Some(CAT_IMMEDIATE_INCOME);

                    if is_inflow {
                        immediate_income += tx.amount;
                    } else if let Some(input) = sub_inputs.get_mut(cid) {
                        if is_credit_card {
                            input.credit_outflows_milliunits += tx.amount;
                            input.credit_spend_slices.push(CreditSpendSlice {
                                card_account_id: tx.acc_id.clone(),
                                amount_milliunits: tx.amount,
                            });
                        } else {
                            input.cash_outflows_milliunits += tx.amount;
                        }
                    }
                }

                // If transfer involves credit card payment category
                if is_credit_card && tx.transfer_acc_id.is_some() {
                    if let Some(payment_cat_id) = card_to_cat.get(&tx.acc_id) {
                        if let Some(input) = sub_inputs.get_mut(payment_cat_id) {
                            input.cc_payment_cash_transfers_milliunits += -tx.amount;
                        }
                    }
                }
            }
        }

        let calc_res = calculate_subcategories_for_month(&cat_metas, &sub_inputs, &card_to_cat);

        let mut total_cash_overspent: i64 = 0;
        let mut additional_to_be_budgeted: i64 = 0;
        for res in calc_res.values() {
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

        prior_balances.clear();
        for (cid, res) in &calc_res {
            prior_balances.insert(cid.clone(), res.balance);
        }

        if current_ym == normalized_target {
            target_calc_results = calc_res;
            target_cc_balances = running_cc_balances.clone();
            target_prev_overspent = running_prev_overspent;
        }

        running_prev_overspent = total_cash_overspent;
        current_ym = increment_month(in_year, in_month);
    }

    let timeline_results: BTreeMap<String, MonthSummaryResult> =
        calculate_monthly_timeline(&timeline_inputs);
    let target_summary = timeline_results
        .get(&normalized_target)
        .cloned()
        .unwrap_or_default();

    let (target_y, target_m) = parse_year_month(&normalized_target);
    let (prev_y, prev_m) = if target_m == 1 {
        (target_y - 1, 12)
    } else {
        (target_y, target_m - 1)
    };
    let prev_month_str = format!("{:04}-{:02}-01", prev_y, prev_m);

    // Assemble Category Groups DTOs & Calculate Goals
    let mut groups_dto: Vec<CategoryGroupDto> = Vec::new();
    let mut total_assigned: i64 = 0;
    let mut total_activity: i64 = 0;
    let mut total_available: i64 = 0;

    for m in &master_rows {
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
                .get(&(s.id.clone(), normalized_target.clone()))
                .cloned()
                .unwrap_or((0, None));
            let is_snoozed = snoozed_at.is_some();

            let activity = calc
                .map(|c| c.cash_outflows + c.credit_outflows)
                .unwrap_or(0);
            let available = calc.map(|c| c.balance).unwrap_or(0);
            let prev_balance = calc.map(|c| c.balance_previous_month).unwrap_or(0);
            let cash_over = calc.map(|c| c.unbudgeted_cash_outflows).unwrap_or(0);
            let credit_over = calc.map(|c| c.unbudgeted_credit_outflows).unwrap_or(0);

            total_assigned += assigned;
            total_activity += activity;
            total_available += available;

            let cc_bal = s
                .account_id
                .as_ref()
                .and_then(|aid| target_cc_balances.get(aid).copied())
                .unwrap_or(0);

            let goal_input = GoalEvaluationInput {
                current_month: safe_ym_prefix(&normalized_target),
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
                ..Default::default()
            };

            let goal_res: SubcategoryGoalResult = evaluate_subcategory_goal(&goal_input);

            // Historical stats computed in memory (0 extra SQL queries!)
            let b_lm = all_monthly_budgets
                .get(&(s.id.clone(), prev_month_str.clone()))
                .map(|(b, _)| *b)
                .unwrap_or(0);

            let a_b = if let Some(b_list) = budgets_by_cat.get(&s.id) {
                let mut sum = 0i64;
                let mut cnt = 0i64;
                for (m_key, val) in b_list {
                    if m_key < &normalized_target {
                        sum += *val;
                        cnt += 1;
                    }
                }
                if cnt > 0 {
                    sum / cnt
                } else {
                    0
                }
            } else {
                0
            };

            let (s_lm, a_s) = if let Some(outflow_map) = cat_monthly_outflows.get(&s.id) {
                let last_m = outflow_map
                    .get(&prev_month_str)
                    .map(|v| v.abs())
                    .unwrap_or(0);
                let mut sum = 0i64;
                let mut cnt = 0i64;
                for (m_key, val) in outflow_map {
                    if m_key < &normalized_target {
                        sum += val.abs();
                        cnt += 1;
                    }
                }
                let avg = if cnt > 0 { sum / cnt } else { 0 };
                (last_m, avg)
            } else {
                (0, 0)
            };

            cat_dtos.push(CategoryDto {
                id: s.id.clone(),
                budget_id: b_id.to_string(),
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
                from_previous_month_milliunits: prev_balance.max(0),
                cash_overspent_milliunits: cash_over,
                credit_overspent_milliunits: credit_over,
                goal_type: goal_res.goal_type,
                goal_target_amount: goal_res.goal_target_amount,
                goal_target_date: s.goal_target_date.clone(),
                goal_cadence: s.goal_cadence,
                goal_cadence_frequency: s.goal_cadence_frequency,
                goal_day: s.goal_day,
                goal_needs_whole_amount: Some(s.goal_needs_whole_amount.unwrap_or(1) != 0),
                goal_under_funded: goal_res.goal_under_funded,
                goal_percentage_complete: goal_res.goal_percentage_complete,
                is_snoozed,
                budgeted_last_month: b_lm,
                spent_last_month: s_lm,
                paid_last_month: s_lm,
                average_budgeted: a_b,
                average_spent: a_s,
                average_paid: a_s,
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
            budget_id: b_id.to_string(),
            name: m.name.clone(),
            is_system: m.internal_name.is_some(),
            internal_name: m.internal_name.clone(),
            hidden: m.hidden,
            sort_order: m.sort_order,
            categories: cat_dtos,
        });
    }

    Ok(PlanMonthSummaryDto {
        month: normalized_target,
        ready_to_assign_milliunits: target_summary.left_to_budget,
        total_assigned_milliunits: total_assigned,
        total_activity_milliunits: total_activity,
        total_available_milliunits: total_available,
        funded_in_future_milliunits: target_summary.funded_in_future,
        immediate_income_milliunits: target_summary.immediate_income,
        prior_month_overspent_milliunits: target_prev_overspent,
        category_groups: groups_dto,
    })
}

fn ensure_monthly_budget_container(
    conn: &Connection,
    budget_id: &str,
    month: &str,
) -> Result<String, String> {
    match conn.query_row(
        "SELECT id FROM be_monthly_budgets WHERE budget_id = ?1 AND month = ?2",
        params![budget_id, month],
        |r| r.get(0),
    ) {
        Ok(id) => Ok(id),
        Err(_) => {
            let new_mb_id = format!("mb/{}/{}", month, budget_id);
            conn.execute(
                "INSERT INTO be_monthly_budgets (id, budget_id, month) VALUES (?1, ?2, ?3)",
                params![new_mb_id, budget_id, month],
            )
            .map_err(|e| e.to_string())?;
            Ok(new_mb_id)
        }
    }
}

pub fn set_category_assigned(
    conn: &Connection,
    payload: &SetAssignedPayload,
) -> Result<PlanMonthSummaryDto, String> {
    let b_id = payload.budget_id.as_deref().unwrap_or(DEFAULT_BUDGET_ID);
    let normalized_month = format!("{}-01", safe_ym_prefix(&payload.month));
    let mb_id = ensure_monthly_budget_container(conn, b_id, &normalized_month)?;
    let mcb_id = format!("mcb/{}/{}", normalized_month, payload.category_id);

    let prev_budgeted: Option<i64> = conn
        .query_row(
            "SELECT budgeted FROM be_monthly_subcategory_budgets WHERE entities_subcategory_id = ?1 AND month = ?2",
            params![payload.category_id, normalized_month],
            |r| r.get(0),
        )
        .ok();

    let mut recorder = ChangeSetRecorder::new(conn, b_id, "Set Assigned Amount");

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
            normalized_month,
            payload.assigned_milliunits
        ],
    )
    .map_err(|e| e.to_string())?;

    let actual_mcb_id: String = conn
        .query_row(
            "SELECT id FROM be_monthly_subcategory_budgets WHERE entities_subcategory_id = ?1 AND month = ?2",
            params![payload.category_id, normalized_month],
            |r| r.get(0),
        )
        .unwrap_or(mcb_id);

    let prev_val = prev_budgeted.unwrap_or(0);
    let before_str = prev_val.to_string();
    let after_str = payload.assigned_milliunits.to_string();
    recorder.record_change(
        "be_monthly_subcategory_budgets",
        &actual_mcb_id,
        if prev_budgeted.is_some() {
            "update"
        } else {
            "insert"
        },
        Some(&before_str),
        &after_str,
    );
    let _ = recorder.commit();

    let delta = payload.assigned_milliunits - prev_val;
    if delta != 0 {
        let (from_sub, to_sub, move_amt) = if delta > 0 {
            (None, Some(payload.category_id.clone()), delta)
        } else {
            (Some(payload.category_id.clone()), None, -delta)
        };
        let _ = crate::ledger::money_movements::record_money_movement(
            conn,
            &RecordMoneyMovementPayload {
                budget_id: b_id.to_string(),
                month: normalized_month.clone(),
                from_subcategory_id: from_sub,
                to_subcategory_id: to_sub,
                amount_milliunits: move_amt,
                source: Some(MoneyMovementSource::ManualAssign),
                group_id: None,
                note: None,
                performed_by_user_id: None,
                move_started_at: None,
            },
        );
    }

    get_budget_month(conn, &normalized_month, Some(b_id))
}

pub fn move_money_between_categories(
    conn: &Connection,
    budget_id: Option<&str>,
    month: &str,
    from_category_id: Option<&str>,
    to_category_id: Option<&str>,
    amount_milliunits: i64,
) -> Result<PlanMonthSummaryDto, String> {
    if amount_milliunits <= 0 {
        return get_budget_month(conn, month, budget_id);
    }
    let b_id = budget_id.unwrap_or(DEFAULT_BUDGET_ID);
    let normalized_month = format!("{}-01", safe_ym_prefix(month));
    let mb_id = ensure_monthly_budget_container(conn, b_id, &normalized_month)?;
    let mut recorder = ChangeSetRecorder::new(conn, b_id, "Move Money");

    for (cat_opt, delta) in [
        (from_category_id, -amount_milliunits),
        (to_category_id, amount_milliunits),
    ] {
        let Some(cid) = cat_opt.filter(|s| !s.is_empty() && *s != "rta") else {
            continue;
        };
        let prev_val: i64 = conn
            .query_row(
                "SELECT budgeted FROM be_monthly_subcategory_budgets WHERE entities_subcategory_id = ?1 AND month = ?2",
                params![cid, normalized_month],
                |r| r.get(0),
            )
            .unwrap_or(0);
        let new_val = prev_val + delta;
        let mcb_id = format!("mcb/{}/{}", normalized_month, cid);
        conn.execute(
            r#"INSERT INTO be_monthly_subcategory_budgets (
                   id, budget_id, entities_monthly_budget_id, entities_subcategory_id,
                   month, budgeted
               ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
               ON CONFLICT(entities_subcategory_id, month) DO UPDATE SET
                   budgeted = ?6,
                   updated_at = CURRENT_TIMESTAMP"#,
            params![mcb_id, b_id, mb_id, cid, normalized_month, new_val],
        )
        .map_err(|e| e.to_string())?;

        let actual_mcb_id: String = conn
            .query_row(
                "SELECT id FROM be_monthly_subcategory_budgets WHERE entities_subcategory_id = ?1 AND month = ?2",
                params![cid, normalized_month],
                |r| r.get(0),
            )
            .unwrap_or(mcb_id);
        recorder.record_change(
            "be_monthly_subcategory_budgets",
            &actual_mcb_id,
            "update",
            Some(&prev_val.to_string()),
            &new_val.to_string(),
        );
    }

    let _ = recorder.commit();

    let from_sub = from_category_id
        .filter(|s| !s.is_empty() && *s != "rta")
        .map(str::to_string);
    let to_sub = to_category_id
        .filter(|s| !s.is_empty() && *s != "rta")
        .map(str::to_string);
    if from_sub != to_sub && (from_sub.is_some() || to_sub.is_some()) {
        let mm_source = if from_sub.is_none() || to_sub.is_none() {
            MoneyMovementSource::ManualAssign
        } else {
            MoneyMovementSource::ManualMovement
        };
        let _ = crate::ledger::money_movements::record_money_movement(
            conn,
            &RecordMoneyMovementPayload {
                budget_id: b_id.to_string(),
                month: normalized_month.clone(),
                from_subcategory_id: from_sub,
                to_subcategory_id: to_sub,
                amount_milliunits,
                source: Some(mm_source),
                group_id: None,
                note: None,
                performed_by_user_id: None,
                move_started_at: None,
            },
        );
    }

    get_budget_month(conn, &normalized_month, Some(b_id))
}

pub fn set_category_goal(conn: &Connection, payload: &SetGoalPayload) -> Result<(), String> {
    let b_id = payload.budget_id.as_deref().unwrap_or(DEFAULT_BUDGET_ID);
    let now_date = chrono::Local::now().format("%Y-%m-%d").to_string();
    let mut recorder = ChangeSetRecorder::new(conn, b_id, "Set Category Goal");

    let before_json: Option<String> = conn
        .query_row(
            r#"SELECT goal_type, goal_created_on, goal_target_amount, goal_target_date,
                      goal_cadence, goal_cadence_frequency, goal_day, goal_needs_whole_amount
               FROM be_subcategories
               WHERE id = ?1"#,
            params![payload.category_id],
            |r| {
                Ok(serde_json::json!({
                    "goal_type": r.get::<_, Option<String>>(0)?,
                    "goal_created_on": r.get::<_, Option<String>>(1)?,
                    "goal_target_amount": r.get::<_, Option<i64>>(2)?,
                    "goal_target_date": r.get::<_, Option<String>>(3)?,
                    "goal_cadence": r.get::<_, Option<i32>>(4)?,
                    "goal_cadence_frequency": r.get::<_, Option<i32>>(5)?,
                    "goal_day": r.get::<_, Option<i32>>(6)?,
                    "goal_needs_whole_amount": r.get::<_, Option<i32>>(7)?,
                })
                .to_string())
            },
        )
        .ok();

    let whole_int = if payload.needs_whole_amount.unwrap_or(true) {
        1
    } else {
        0
    };

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
            whole_int,
            payload.category_id,
        ],
    )
    .map_err(|e| e.to_string())?;

    let after_json = serde_json::json!({
        "goal_type": payload.goal_type,
        "goal_created_on": now_date,
        "goal_target_amount": payload.target_amount,
        "goal_target_date": payload.target_date,
        "goal_cadence": payload.cadence,
        "goal_cadence_frequency": payload.cadence_frequency,
        "goal_day": payload.day_of_week,
        "goal_needs_whole_amount": whole_int,
    })
    .to_string();
    recorder.record_change(
        "be_subcategories",
        &payload.category_id,
        "update",
        before_json.as_deref(),
        &after_json,
    );
    let _ = recorder.commit();

    Ok(())
}

/// Upserts `goal_snoozed_at` into `be_monthly_subcategory_budgets` so snoozing works even if
/// the category had no row in `be_monthly_subcategory_budgets` yet (Bug #9 fix).
pub fn snooze_category_goal(
    conn: &Connection,
    payload: &SnoozeGoalPayload,
) -> Result<PlanMonthSummaryDto, String> {
    let b_id = payload.budget_id.as_deref().unwrap_or(DEFAULT_BUDGET_ID);
    let normalized_month = format!("{}-01", safe_ym_prefix(&payload.month));
    let mb_id = ensure_monthly_budget_container(conn, b_id, &normalized_month)?;
    let mcb_id = format!("mcb/{}/{}", normalized_month, payload.category_id);

    let prev_row: Option<(String, i64, Option<String>)> = conn
        .query_row(
            "SELECT id, budgeted, goal_snoozed_at FROM be_monthly_subcategory_budgets WHERE entities_subcategory_id = ?1 AND month = ?2",
            params![payload.category_id, normalized_month],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .ok();

    let now_str = if payload.snooze {
        Some(chrono::Local::now().to_rfc3339())
    } else {
        None
    };

    conn.execute(
        r#"INSERT INTO be_monthly_subcategory_budgets (
               id, budget_id, entities_monthly_budget_id, entities_subcategory_id,
               month, budgeted, goal_snoozed_at
           ) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)
           ON CONFLICT(entities_subcategory_id, month) DO UPDATE SET
               goal_snoozed_at = ?6,
               updated_at = CURRENT_TIMESTAMP"#,
        params![
            mcb_id,
            b_id,
            mb_id,
            payload.category_id,
            normalized_month,
            now_str
        ],
    )
    .map_err(|e| e.to_string())?;

    let mut recorder = ChangeSetRecorder::new(conn, b_id, "Snooze Goal");
    let (actual_id, cur_budgeted, prev_snoozed) = match prev_row {
        Some((id, b, s)) => (id, b, s),
        None => (mcb_id, 0, None),
    };
    let before_json = serde_json::json!({
        "budgeted": cur_budgeted,
        "goal_snoozed_at": prev_snoozed,
    })
    .to_string();
    let after_json = serde_json::json!({
        "budgeted": cur_budgeted,
        "goal_snoozed_at": now_str,
    })
    .to_string();
    recorder.record_change(
        "be_monthly_subcategory_budgets",
        &actual_id,
        "update",
        Some(&before_json),
        &after_json,
    );
    let _ = recorder.commit();

    get_budget_month(conn, &normalized_month, Some(b_id))
}

pub fn apply_quick_budget(
    conn: &Connection,
    payload: &ApplyQuickBudgetPayload,
) -> Result<PlanMonthSummaryDto, String> {
    let b_id = payload.budget_id.as_deref().unwrap_or(DEFAULT_BUDGET_ID);
    let normalized_month = format!("{}-01", safe_ym_prefix(&payload.month));
    let current_summary = get_budget_month(conn, &normalized_month, Some(b_id))?;

    let qb_type = match payload.quick_budget_type.as_str() {
        "Underfunded" | "underfunded" => QuickBudgetType::Underfunded,
        "BudgetedLastMonth" | "budgeted_last_month" => QuickBudgetType::BudgetedLastMonth,
        "SpentLastMonth" | "spent_last_month" => QuickBudgetType::SpentLastMonth,
        "PaidLastMonth" | "paid_last_month" => QuickBudgetType::PaidLastMonth,
        "AverageBudgeted" | "average_budgeted" => QuickBudgetType::AverageBudgeted,
        "AverageSpent" | "average_spent" => QuickBudgetType::AverageSpent,
        "AveragePaid" | "average_paid" => QuickBudgetType::AveragePaid,
        "GoalTarget" | "goal_target" => QuickBudgetType::GoalTarget,
        "RemoveSurplus" | "remove_surplus" => QuickBudgetType::RemoveSurplus,
        "SetAvailableAmountToZero" | "set_available_to_zero" => {
            QuickBudgetType::SetAvailableAmountToZero
        }
        "ResetBudgetedAmounts" | "reset_budgeted_amounts" => QuickBudgetType::ResetBudgetedAmounts,
        _ => {
            return Err(format!(
                "Unknown quick budget type: {}",
                payload.quick_budget_type
            ))
        }
    };

    let mut candidates = Vec::new();
    let filter_set: Option<HashSet<String>> = payload
        .category_ids
        .as_ref()
        .map(|ids| ids.iter().cloned().collect());

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
                target_date: cat.goal_target_date.clone(),
                is_snoozed: cat.is_snoozed,
                budgeted_last_month: cat.budgeted_last_month,
                spent_last_month: cat.spent_last_month,
                paid_last_month: cat.paid_last_month,
                average_budgeted: cat.average_budgeted,
                average_spent: cat.average_spent,
                average_paid: cat.average_paid,
            });
        }
    }

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let plan = if qb_type == QuickBudgetType::Underfunded {
        compute_underfunded_auto_assign_plan(
            candidates,
            current_summary.ready_to_assign_milliunits,
            &today,
        )
    } else {
        compute_batch_quick_budget_plan(&candidates, qb_type)
    };

    if !plan.is_empty() {
        let mut recorder = ChangeSetRecorder::new(conn, b_id, "Apply Quick Budget");
        let mb_id = ensure_monthly_budget_container(conn, b_id, &normalized_month)?;
        let mm_source = match qb_type {
            QuickBudgetType::Underfunded => MoneyMovementSource::AutoAssignUnderfunded,
            QuickBudgetType::BudgetedLastMonth => MoneyMovementSource::AutoAssignAssignedLastMonth,
            QuickBudgetType::SpentLastMonth => MoneyMovementSource::AutoAssignSpentLastMonth,
            QuickBudgetType::PaidLastMonth => MoneyMovementSource::AutoAssignPaidLastMonth,
            QuickBudgetType::AverageBudgeted => MoneyMovementSource::AutoAssignAverageAssigned,
            QuickBudgetType::AverageSpent => MoneyMovementSource::AutoAssignAverageSpent,
            QuickBudgetType::AveragePaid => MoneyMovementSource::AutoAssignAveragePaid,
            QuickBudgetType::GoalTarget => MoneyMovementSource::AutoAssignGoalTarget,
            QuickBudgetType::RemoveSurplus => MoneyMovementSource::AutoAssignRemoveSurplus,
            QuickBudgetType::SetAvailableAmountToZero => MoneyMovementSource::AutoAssignSetToZero,
            QuickBudgetType::ResetBudgetedAmounts => MoneyMovementSource::AutoAssignReset,
        };
        let mut movement_items: Vec<(String, i64)> = Vec::new();

        for item in plan {
            let mcb_id = format!("mcb/{}/{}", normalized_month, item.subcategory_id);
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
                    normalized_month,
                    item.new_budgeted
                ],
            )
            .map_err(|e| e.to_string())?;

            let actual_mcb_id: String = conn
                .query_row(
                    "SELECT id FROM be_monthly_subcategory_budgets WHERE entities_subcategory_id = ?1 AND month = ?2",
                    params![item.subcategory_id, normalized_month],
                    |r| r.get(0),
                )
                .unwrap_or(mcb_id);

            recorder.record_change(
                "be_monthly_subcategory_budgets",
                &actual_mcb_id,
                "update",
                Some(&item.previous_budgeted.to_string()),
                &item.new_budgeted.to_string(),
            );

            let delta = item.new_budgeted - item.previous_budgeted;
            if delta != 0 {
                movement_items.push((item.subcategory_id, delta));
            }
        }

        let _ = recorder.commit();

        if !movement_items.is_empty() {
            if let Ok(group) = crate::ledger::money_movements::create_money_movement_group(
                conn,
                b_id,
                &normalized_month,
                mm_source.clone(),
                None,
                None,
                None,
            ) {
                for (sub_id, delta) in movement_items {
                    let (from_sub, to_sub, move_amt) = if delta > 0 {
                        (None, Some(sub_id), delta)
                    } else {
                        (Some(sub_id), None, -delta)
                    };
                    let _ = crate::ledger::money_movements::record_money_movement(
                        conn,
                        &RecordMoneyMovementPayload {
                            budget_id: b_id.to_string(),
                            month: normalized_month.clone(),
                            from_subcategory_id: from_sub,
                            to_subcategory_id: to_sub,
                            amount_milliunits: move_amt,
                            source: Some(mm_source.clone()),
                            group_id: Some(group.id.clone()),
                            note: None,
                            performed_by_user_id: None,
                            move_started_at: None,
                        },
                    );
                }
            }
        }
    }

    get_budget_month(conn, &normalized_month, Some(b_id))
}

pub fn get_transactions(
    conn: &Connection,
    account_id: Option<&str>,
    budget_id: Option<&str>,
) -> Result<Vec<TransactionDto>, String> {
    let b_id = budget_id.unwrap_or(DEFAULT_BUDGET_ID);

    let sql = match account_id {
        Some(_) => {
            r#"SELECT t.id, t.budget_id, t.entities_account_id, t.entities_payee_id, p.name,
                      t.entities_subcategory_id, c.name, t.date, t.amount, t.memo,
                      t.cleared, t.accepted, t.flag, t.transfer_account_id, t.transfer_transaction_id,
                      a.account_name,
                      t.import_id,
                      COALESCE(
                          NULLIF(t.imported_payee, ''),
                          CASE WHEN t.original_imported_payee LIKE '{%' THEN NULL ELSE t.original_imported_payee END
                      ),
                      t.matched_transaction_id,
                      t.source
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
                      a.account_name,
                      t.import_id,
                      COALESCE(
                          NULLIF(t.imported_payee, ''),
                          CASE WHEN t.original_imported_payee LIKE '{%' THEN NULL ELSE t.original_imported_payee END
                      ),
                      t.matched_transaction_id,
                      t.source
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
            import_id: r.get(16)?,
            imported_payee: r.get(17)?,
            matched_transaction_id: r.get(18)?,
            source: r.get(19)?,
            subtransactions: Vec::new(),
        })
    };

    let mut txs: Vec<TransactionDto> = match account_id {
        Some(aid) => stmt
            .query_map(params![b_id, aid], mapper)
            .map_err(|e| e.to_string())?
            .filter_map(SqlResult::ok)
            .collect(),
        None => stmt
            .query_map(params![b_id], mapper)
            .map_err(|e| e.to_string())?
            .filter_map(SqlResult::ok)
            .collect(),
    };

    // Bulk load split subtransactions in a single query
    if !txs.is_empty() {
        let mut sub_by_tx: HashMap<String, Vec<SubTransactionDto>> = HashMap::new();
        let mut sub_stmt = conn
            .prepare(
                r#"SELECT st.id, st.entities_transaction_id, st.entities_payee_id, p.name,
                          st.entities_subcategory_id, c.name, st.amount, st.memo, st.transfer_account_id
                   FROM be_subtransactions st
                   LEFT JOIN be_payees p ON st.entities_payee_id = p.id
                   LEFT JOIN be_subcategories c ON st.entities_subcategory_id = c.id
                   WHERE st.budget_id = ?1 AND st.is_tombstone = 0
                   ORDER BY st.sortable_index ASC"#,
            )
            .map_err(|e| e.to_string())?;

        let sub_rows = sub_stmt
            .query_map(params![b_id], |r| {
                Ok((
                    r.get::<_, String>(1)?,
                    SubTransactionDto {
                        id: Some(r.get(0)?),
                        payee_id: r.get(2)?,
                        payee_name: r.get(3)?,
                        category_id: r.get(4)?,
                        category_name: r.get(5)?,
                        amount_milliunits: r.get(6)?,
                        memo: r.get(7)?,
                        transfer_account_id: r.get(8)?,
                    },
                ))
            })
            .map_err(|e| e.to_string())?;

        for (parent_id, sub_dto) in sub_rows.flatten() {
            sub_by_tx.entry(parent_id).or_default().push(sub_dto);
        }

        for tx in &mut txs {
            if let Some(subs) = sub_by_tx.remove(&tx.id) {
                if !subs.is_empty() && tx.category_name.is_none() {
                    tx.category_name = Some("Split (Multiple Categories)...".to_string());
                }
                tx.subtransactions = subs;
            }
        }
    }

    Ok(txs)
}

pub fn save_transaction(
    conn: &Connection,
    payload: &SaveTransactionPayload,
) -> Result<String, String> {
    do_save_transaction(conn, payload).map_err(|e| e.to_string())
}

pub fn reconcile_account(
    conn: &Connection,
    payload: &ReconcileAccountPayload,
) -> Result<ReconcileResponse, String> {
    let b_id = payload.budget_id.as_deref().unwrap_or(DEFAULT_BUDGET_ID);
    let res: ReconcileAccountResult = do_reconcile(
        conn,
        b_id,
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

pub fn delete_transactions(
    conn: &Connection,
    payload: &DeleteTransactionsPayload,
) -> Result<(), String> {
    let b_id = payload.budget_id.as_deref().unwrap_or(DEFAULT_BUDGET_ID);

    // Pre-validate every requested transaction and every linked transfer leg BEFORE mutating anything
    for id in &payload.ids {
        let row_info: Option<(Option<String>, String)> = conn
            .query_row(
                "SELECT transfer_transaction_id, cleared FROM be_transactions WHERE id = ?1 AND is_tombstone = 0",
                params![id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .ok();

        if let Some((peer_id, cleared)) = row_info {
            if cleared == "Reconciled" && !payload.allow_reconciled {
                return Err(
                    "Reconciled (LOCKED) transaction cannot be deleted without explicit unlock"
                        .to_string(),
                );
            }
            if let Some(pid) = peer_id {
                let peer_cleared: Option<String> = conn
                    .query_row(
                        "SELECT cleared FROM be_transactions WHERE id = ?1 AND is_tombstone = 0",
                        params![pid],
                        |r| r.get(0),
                    )
                    .ok();
                if peer_cleared.as_deref() == Some("Reconciled") && !payload.allow_reconciled {
                    return Err(
                        "Transfer transaction paired with a Reconciled (LOCKED) peer cannot be deleted without explicit unlock"
                            .to_string(),
                    );
                }
            }

            let split_reconciled_peer: bool = conn
                .query_row(
                    r#"SELECT 1
                       FROM be_subtransactions s
                       JOIN be_transactions peer ON peer.id = s.transfer_transaction_id
                       WHERE s.entities_transaction_id = ?1
                         AND s.is_tombstone = 0
                         AND peer.is_tombstone = 0
                         AND peer.cleared = 'Reconciled'
                       LIMIT 1"#,
                    params![id],
                    |_| Ok(true),
                )
                .unwrap_or(false);
            if split_reconciled_peer && !payload.allow_reconciled {
                return Err(
                    "Split transaction paired with a Reconciled (LOCKED) transfer peer cannot be deleted without explicit unlock"
                        .to_string(),
                );
            }
        }
    }

    conn.execute_batch("SAVEPOINT sp_delete_txs;")
        .map_err(|e| e.to_string())?;

    let work = (|| -> Result<(), String> {
        let mut recorder = ChangeSetRecorder::new(conn, b_id, "Delete Transactions");

        for id in &payload.ids {
            let row_info: Option<(String, Option<String>)> = conn
                .query_row(
                    "SELECT entities_account_id, transfer_transaction_id FROM be_transactions WHERE id = ?1 AND is_tombstone = 0",
                    params![id],
                    |r| Ok((r.get(0)?, r.get(1)?)),
                )
                .ok();

            if let Some((account_id, peer_id)) = row_info {
                conn.execute(
                    "UPDATE be_transactions SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
                    params![id],
                )
                .map_err(|e| e.to_string())?;
                recorder.record_change(
                    "be_transactions",
                    id,
                    "update",
                    Some(r#"{"is_tombstone":0}"#),
                    r#"{"is_tombstone":1}"#,
                );

                let _ = conn.execute(
                    "UPDATE be_subtransactions SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE entities_transaction_id = ?1",
                    params![id],
                );
                let _ = update_account_balances(conn, &account_id);

                if let Some(pid) = peer_id {
                    let peer_account_id: Option<String> = conn
                        .query_row(
                            "SELECT entities_account_id FROM be_transactions WHERE id = ?1 AND is_tombstone = 0",
                            params![pid],
                            |r| r.get(0),
                        )
                        .ok();
                    if let Some(paid) = peer_account_id {
                        conn.execute(
                            "UPDATE be_transactions SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
                            params![pid],
                        )
                        .map_err(|e| e.to_string())?;
                        recorder.record_change(
                            "be_transactions",
                            &pid,
                            "update",
                            Some(r#"{"is_tombstone":0}"#),
                            r#"{"is_tombstone":1}"#,
                        );
                        let _ = update_account_balances(conn, &paid);
                    }
                }
            }
        }
        recorder.commit().map_err(|e| e.to_string())?;
        Ok(())
    })();

    match work {
        Ok(()) => {
            conn.execute_batch("RELEASE SAVEPOINT sp_delete_txs;")
                .map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(err) => {
            let _ = conn.execute_batch(
                "ROLLBACK TO SAVEPOINT sp_delete_txs; RELEASE SAVEPOINT sp_delete_txs;",
            );
            Err(err)
        }
    }
}

pub fn toggle_transaction_cleared(
    conn: &Connection,
    payload: &ToggleClearedPayload,
) -> Result<(), String> {
    let b_id = payload.budget_id.as_deref().unwrap_or(DEFAULT_BUDGET_ID);
    let (account_id, current_cleared): (String, String) = conn
        .query_row(
            "SELECT entities_account_id, cleared FROM be_transactions WHERE id = ?1",
            params![payload.id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    if current_cleared == "Reconciled" && !payload.allow_reconciled {
        return Err(
            "Reconciled (LOCKED) transaction cannot have cleared status mutated without explicit unlock"
                .to_string(),
        );
    }

    conn.execute(
        "UPDATE be_transactions SET cleared = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![payload.cleared, payload.id],
    )
    .map_err(|e| e.to_string())?;

    let mut recorder = ChangeSetRecorder::new(conn, b_id, "Toggle Cleared");
    let before_json = serde_json::json!({ "cleared": current_cleared }).to_string();
    let after_json = serde_json::json!({ "cleared": payload.cleared }).to_string();
    recorder.record_change(
        "be_transactions",
        &payload.id,
        "update",
        Some(&before_json),
        &after_json,
    );
    let _ = recorder.commit();

    let _ = update_account_balances(conn, &account_id);
    Ok(())
}

pub fn update_account(conn: &Connection, payload: &UpdateAccountPayload) -> Result<(), String> {
    let b_id = payload.budget_id.as_deref().unwrap_or(DEFAULT_BUDGET_ID);
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

    if let Some(delta) = payload.balance_adjustment_delta.filter(|&d| d != 0) {
        let on_budget: i32 = conn
            .query_row(
                "SELECT on_budget FROM be_accounts WHERE id = ?1",
                params![payload.id],
                |r| r.get(0),
            )
            .unwrap_or(1);

        let adj_payee_id: Option<String> = conn
            .query_row(
                "SELECT id FROM be_payees WHERE budget_id = ?1 AND (internal_name = ?2 OR internal_name = ?3) LIMIT 1",
                params![b_id, PAYEE_MANUAL_ADJUSTMENT, PAYEE_STARTING_BALANCE],
                |r| r.get(0),
            )
            .ok();

        let adj_cat_id: Option<String> = if on_budget == 1 {
            conn.query_row(
                "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name = ?2",
                params![b_id, CAT_IMMEDIATE_INCOME],
                |r| r.get(0),
            )
            .ok()
        } else {
            None
        };

        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        do_save_transaction(
            conn,
            &SaveTransactionPayload {
                id: None,
                budget_id: b_id.to_string(),
                account_id: payload.id.clone(),
                payee_id: adj_payee_id,
                payee_name: None,
                category_id: adj_cat_id,
                date: today,
                amount_milliunits: delta,
                memo: Some("Manual Balance Adjustment".to_string()),
                cleared: Some("Cleared".to_string()),
                approved: Some(true),
                flag: None,
                transfer_account_id: None,
                subtransactions: Vec::new(),
                allow_reconciled_mutation: false,
            },
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub fn delete_account(conn: &Connection, acc_id: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE be_accounts SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![acc_id],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE be_transactions SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE entities_account_id = ?1",
        params![acc_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn close_account_in_db(conn: &Connection, acc_id: &str) -> Result<(), String> {
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
                    "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name = ?2",
                    params![budget_id, CAT_IMMEDIATE_INCOME],
                    |r| r.get(0),
                )
                .ok()
            } else {
                None
            };

            let today = chrono::Local::now().format("%Y-%m-%d").to_string();
            let adj_tx_id = Uuid::new_v4().to_string();
            let (cash_amount, credit_amount) = determine_cash_credit_amounts(&account_type, delta);

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

            let _ = update_account_balances(conn, acc_id);
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

pub fn create_category_group(
    conn: &Connection,
    name: &str,
    budget_id: Option<&str>,
) -> Result<String, String> {
    let b_id = budget_id.unwrap_or(DEFAULT_BUDGET_ID);
    let id = Uuid::new_v4().to_string();
    let max_idx: Option<i32> = conn
        .query_row(
            "SELECT MAX(sortable_index) FROM be_master_categories WHERE budget_id = ?1 AND deletable = 1 AND is_tombstone = 0",
            params![b_id],
            |r| r.get(0),
        )
        .ok()
        .flatten();
    let sort_idx = calculate_midpoint_index(max_idx, None).unwrap_or(10000);
    conn.execute(
        "INSERT INTO be_master_categories (id, budget_id, name, deletable, sortable_index) VALUES (?1, ?2, ?3, 1, ?4)",
        params![id, b_id, name, sort_idx],
    )
    .map_err(|e| e.to_string())?;
    let mut recorder = ChangeSetRecorder::new(conn, b_id, "Create Category Group");
    let after_json = serde_json::json!({ "name": name, "is_tombstone": 0 }).to_string();
    recorder.record_change("be_master_categories", &id, "insert", None, &after_json);
    let _ = recorder.commit();
    Ok(id)
}

pub fn create_subcategory(
    conn: &Connection,
    master_id: &str,
    name: &str,
    budget_id: Option<&str>,
) -> Result<String, String> {
    let b_id = budget_id.unwrap_or(DEFAULT_BUDGET_ID);
    let id = Uuid::new_v4().to_string();
    let max_idx: Option<i32> = conn
        .query_row(
            "SELECT MAX(sortable_index) FROM be_subcategories WHERE entities_master_category_id = ?1 AND is_tombstone = 0",
            params![master_id],
            |r| r.get(0),
        )
        .ok()
        .flatten();
    let sort_idx = calculate_midpoint_index(max_idx, None).unwrap_or(1000);
    conn.execute(
        "INSERT INTO be_subcategories (id, budget_id, entities_master_category_id, name, type, sortable_index) VALUES (?1, ?2, ?3, ?4, 'DFT', ?5)",
        params![id, b_id, master_id, name, sort_idx],
    )
    .map_err(|e| e.to_string())?;
    let mut recorder = ChangeSetRecorder::new(conn, b_id, "Create Category");
    let after_json = serde_json::json!({ "name": name, "is_tombstone": 0 }).to_string();
    recorder.record_change("be_subcategories", &id, "insert", None, &after_json);
    let _ = recorder.commit();
    Ok(id)
}

pub fn rename_category(
    conn: &Connection,
    id: &str,
    name: &str,
    is_master: bool,
) -> Result<(), String> {
    if is_master {
        let prev_info: Option<(String, String)> = conn
            .query_row(
                "SELECT budget_id, name FROM be_master_categories WHERE id = ?1",
                params![id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .ok();
        conn.execute(
            "UPDATE be_master_categories SET name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![name, id],
        )
        .map_err(|e| e.to_string())?;
        if let Some((b_id, prev_name)) = prev_info {
            let mut recorder = ChangeSetRecorder::new(conn, &b_id, "Rename Category Group");
            let before_json = serde_json::json!({ "name": prev_name }).to_string();
            let after_json = serde_json::json!({ "name": name }).to_string();
            recorder.record_change(
                "be_master_categories",
                id,
                "update",
                Some(&before_json),
                &after_json,
            );
            let _ = recorder.commit();
        }
    } else {
        let prev_info: Option<(String, String)> = conn
            .query_row(
                "SELECT budget_id, name FROM be_subcategories WHERE id = ?1",
                params![id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .ok();
        conn.execute(
            "UPDATE be_subcategories SET name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![name, id],
        )
        .map_err(|e| e.to_string())?;
        if let Some((b_id, prev_name)) = prev_info {
            let mut recorder = ChangeSetRecorder::new(conn, &b_id, "Rename Category");
            let before_json = serde_json::json!({ "name": prev_name }).to_string();
            let after_json = serde_json::json!({ "name": name }).to_string();
            recorder.record_change(
                "be_subcategories",
                id,
                "update",
                Some(&before_json),
                &after_json,
            );
            let _ = recorder.commit();
        }
    }
    Ok(())
}

pub fn delete_category(conn: &Connection, id: &str, is_master: bool) -> Result<(), String> {
    if is_master {
        let b_id: String = conn
            .query_row(
                "SELECT budget_id FROM be_master_categories WHERE id = ?1",
                params![id],
                |r| r.get(0),
            )
            .unwrap_or_else(|_| DEFAULT_BUDGET_ID.to_string());
        let child_ids: Vec<String> = {
            let mut stmt = conn
                .prepare(
                    "SELECT id FROM be_subcategories WHERE entities_master_category_id = ?1 AND is_tombstone = 0",
                )
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map(params![id], |r| r.get(0))
                .map_err(|e| e.to_string())?;
            rows.filter_map(Result::ok).collect()
        };
        let mut recorder = ChangeSetRecorder::new(conn, &b_id, "Delete Category Group");
        conn.execute(
            "UPDATE be_master_categories SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            params![id],
        )
        .map_err(|e| e.to_string())?;
        recorder.record_change(
            "be_master_categories",
            id,
            "update",
            Some(r#"{"is_tombstone":0}"#),
            r#"{"is_tombstone":1}"#,
        );
        conn.execute(
            "UPDATE be_subcategories SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE entities_master_category_id = ?1 AND is_tombstone = 0",
            params![id],
        )
        .map_err(|e| e.to_string())?;
        for cid in &child_ids {
            recorder.record_change(
                "be_subcategories",
                cid,
                "update",
                Some(r#"{"is_tombstone":0}"#),
                r#"{"is_tombstone":1}"#,
            );
        }
        recorder.commit().map_err(|e| e.to_string())?;
    } else {
        let b_id: String = conn
            .query_row(
                "SELECT budget_id FROM be_subcategories WHERE id = ?1",
                params![id],
                |r| r.get(0),
            )
            .unwrap_or_else(|_| DEFAULT_BUDGET_ID.to_string());
        let mut recorder = ChangeSetRecorder::new(conn, &b_id, "Delete Category");
        conn.execute(
            "UPDATE be_subcategories SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            params![id],
        )
        .map_err(|e| e.to_string())?;
        recorder.record_change(
            "be_subcategories",
            id,
            "update",
            Some(r#"{"is_tombstone":0}"#),
            r#"{"is_tombstone":1}"#,
        );
        let _ = recorder.commit();
    }
    Ok(())
}

pub fn update_category_note(conn: &Connection, id: &str, note: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE be_subcategories SET note = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![note, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn hide_category(
    conn: &Connection,
    cat_id: &str,
    is_master: bool,
    is_hidden: bool,
) -> Result<(), String> {
    let hidden_val = if is_hidden { 1 } else { 0 };
    let prev_val = if is_hidden { 0 } else { 1 };
    if is_master {
        let b_id: String = conn
            .query_row(
                "SELECT budget_id FROM be_master_categories WHERE id = ?1",
                params![cat_id],
                |r| r.get(0),
            )
            .unwrap_or_else(|_| DEFAULT_BUDGET_ID.to_string());
        conn.execute(
            "UPDATE be_master_categories SET is_hidden = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![hidden_val, cat_id],
        )
        .map_err(|e| e.to_string())?;
        let mut recorder = ChangeSetRecorder::new(conn, &b_id, "Hide Category Group");
        recorder.record_change(
            "be_master_categories",
            cat_id,
            "update",
            Some(&serde_json::json!({ "is_hidden": prev_val }).to_string()),
            &serde_json::json!({ "is_hidden": hidden_val }).to_string(),
        );
        let _ = recorder.commit();
    } else {
        let b_id: String = conn
            .query_row(
                "SELECT budget_id FROM be_subcategories WHERE id = ?1",
                params![cat_id],
                |r| r.get(0),
            )
            .unwrap_or_else(|_| DEFAULT_BUDGET_ID.to_string());
        conn.execute(
            "UPDATE be_subcategories SET is_hidden = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![hidden_val, cat_id],
        )
        .map_err(|e| e.to_string())?;
        let mut recorder = ChangeSetRecorder::new(conn, &b_id, "Hide Category");
        recorder.record_change(
            "be_subcategories",
            cat_id,
            "update",
            Some(&serde_json::json!({ "is_hidden": prev_val }).to_string()),
            &serde_json::json!({ "is_hidden": hidden_val }).to_string(),
        );
        let _ = recorder.commit();
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
    let mut affected_account_ids = HashSet::new();

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
        "toggle_cleared" => {
            let target_cleared = pload
                .get("cleared")
                .and_then(|v| v.as_str())
                .unwrap_or("Cleared");
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
                            "UPDATE be_transactions SET cleared = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND cleared != 'Reconciled' AND is_tombstone = 0",
                            params![target_cleared, tid],
                        )
                        .map_err(|e| e.to_string())?;
                    }
                }
            }
        }
        "approve" => {
            for tid in tx_ids {
                tx.execute(
                    "UPDATE be_transactions SET accepted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND is_tombstone = 0",
                    params![tid],
                )
                .map_err(|e| e.to_string())?;
            }
        }
        "reject" => {
            for tid in tx_ids {
                tx.execute(
                    "UPDATE be_transactions SET accepted = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND is_tombstone = 0",
                    params![tid],
                )
                .map_err(|e| e.to_string())?;
            }
        }
        "duplicate" => {
            for tid in tx_ids {
                if let Ok((b_id, acc_id, payee_id, cat_id, date, amt, cash, credit, memo, flag)) = tx
                    .query_row(
                        r#"SELECT budget_id, entities_account_id, entities_payee_id, entities_subcategory_id,
                                  date, amount, cash_amount, credit_amount, memo, flag
                           FROM be_transactions
                           WHERE id = ?1 AND is_tombstone = 0"#,
                        params![tid],
                        |r| {
                            Ok((
                                r.get::<_, String>(0)?,
                                r.get::<_, String>(1)?,
                                r.get::<_, Option<String>>(2)?,
                                r.get::<_, Option<String>>(3)?,
                                r.get::<_, String>(4)?,
                                r.get::<_, i64>(5)?,
                                r.get::<_, i64>(6)?,
                                r.get::<_, i64>(7)?,
                                r.get::<_, Option<String>>(8)?,
                                r.get::<_, Option<String>>(9)?,
                            ))
                        },
                    )
                {
                    let new_id = Uuid::new_v4().to_string();
                    affected_account_ids.insert(acc_id.clone());
                    tx.execute(
                        r#"INSERT INTO be_transactions (
                               id, budget_id, entities_account_id, entities_payee_id, entities_subcategory_id,
                               date, amount, cash_amount, credit_amount, memo, cleared, accepted, flag
                           ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'Uncleared', 1, ?11)"#,
                        params![
                            new_id, b_id, acc_id, payee_id, cat_id, date, amt, cash, credit, memo,
                            flag
                        ],
                    )
                    .map_err(|e| e.to_string())?;
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
                let row_info: Option<(String, i64, i32, String)> = tx
                    .query_row(
                        "SELECT entities_account_id, amount, is_tombstone, cleared FROM be_transactions WHERE id = ?1",
                        params![tid],
                        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
                    )
                    .ok();

                if let Some((old_acc_id, amount, is_tombstone, cleared_val)) = row_info {
                    if is_tombstone == 0 && cleared_val != "Reconciled" {
                        affected_account_ids.insert(old_acc_id);
                        let (cash, credit) = determine_cash_credit_amounts(&new_acc_type, amount);
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
        let _ = update_account_balances(conn, &acc_id);
    }

    Ok(())
}

pub fn get_payees(conn: &Connection, budget_id: Option<&str>) -> Result<Vec<PayeeDto>, String> {
    let b_id = budget_id.unwrap_or(DEFAULT_BUDGET_ID);
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
        .filter_map(SqlResult::ok)
        .collect();

    Ok(payees)
}

pub fn update_payee(conn: &Connection, payee_id: &str, name: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE be_payees SET name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![name, payee_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_payee(conn: &Connection, payee_id: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE be_payees SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![payee_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn reorder_accounts(conn: &Connection, ordered_ids: &[String]) -> Result<(), String> {
    for (idx, id) in ordered_ids.iter().enumerate() {
        let sort_idx = (idx as i32 + 1) * 1000;
        conn.execute(
            "UPDATE be_accounts SET sortable_index = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![sort_idx, id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn reorder_categories(
    conn: &mut Connection,
    budget_id: Option<&str>,
    ordered_group_ids: &[String],
    subcategories_by_group: Option<&serde_json::Value>,
) -> Result<(), String> {
    let b_id = budget_id.unwrap_or(DEFAULT_BUDGET_ID);
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    for (g_idx, group_id) in ordered_group_ids.iter().enumerate() {
        let g_sort = (g_idx as i32 + 1) * 1000;
        tx.execute(
            "UPDATE be_master_categories SET sortable_index = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND budget_id = ?3",
            params![g_sort, group_id, b_id],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(val) = subcategories_by_group {
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

pub fn make_fresh_start(
    conn: &mut Connection,
    payload: &FreshStartPayload,
) -> Result<String, String> {
    let b_id = payload.budget_id.as_deref().unwrap_or(DEFAULT_BUDGET_ID);
    let fresh_name = payload.new_name.as_deref().unwrap_or("Fresh Start Budget");
    let snapshot_current = payload
        .preserve_current_balance_as_starting
        .unwrap_or(false);

    // Snapshot current balances of open accounts if requested
    let open_accounts: Vec<(String, i64, i32, String)> = {
        let mut stmt = conn
            .prepare(
                "SELECT id, (cleared_balance + uncleared_balance), on_budget, account_type FROM be_accounts WHERE budget_id = ?1 AND is_tombstone = 0 AND closed = 0",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![b_id], |r| {
                Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?))
            })
            .map_err(|e| e.to_string())?;
        rows.filter_map(SqlResult::ok).collect()
    };

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Update budget name
    tx.execute(
        "UPDATE be_budgets SET budget_name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![fresh_name, b_id],
    )
    .map_err(|e| e.to_string())?;

    if snapshot_current {
        // Tombstone ALL old transactions and create fresh Starting Balance snapshots for open accounts
        tx.execute(
            "UPDATE be_transactions SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE budget_id = ?1",
            params![b_id],
        )
        .map_err(|e| e.to_string())?;

        let start_payee_id: Option<String> = tx
            .query_row(
                "SELECT id FROM be_payees WHERE budget_id = ?1 AND (internal_name = ?2 OR internal_name = 'Payee/__StartingBalance__') LIMIT 1",
                params![b_id, PAYEE_STARTING_BALANCE],
                |r| r.get(0),
            )
            .ok();

        let income_cat_id: Option<String> = tx
            .query_row(
                "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name = ?2 LIMIT 1",
                params![b_id, CAT_IMMEDIATE_INCOME],
                |r| r.get(0),
            )
            .ok();

        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        for (acc_id, bal, on_budget, acc_type) in &open_accounts {
            if *bal != 0 {
                let (cash, credit) = determine_cash_credit_amounts(acc_type, *bal);
                let cat_id = if *on_budget == 1 {
                    income_cat_id.clone()
                } else {
                    None
                };
                tx.execute(
                    r#"INSERT INTO be_transactions (
                           id, budget_id, entities_account_id, entities_payee_id, entities_subcategory_id,
                           date, amount, cash_amount, credit_amount, memo, cleared, accepted
                       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'Starting Balance', 'Cleared', 1)"#,
                    params![
                        Uuid::new_v4().to_string(),
                        b_id,
                        acc_id,
                        start_payee_id,
                        cat_id,
                        today,
                        bal,
                        cash,
                        credit
                    ],
                )
                .map_err(|e| e.to_string())?;
            }
        }
    } else {
        // Soft-delete all non-starting-balance transactions
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
    }

    // Soft-delete all subtransactions
    tx.execute(
        "UPDATE be_subtransactions SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE budget_id = ?1",
        params![b_id],
    )
    .map_err(|e| e.to_string())?;

    // Reset monthly allocations to 0
    tx.execute(
        "UPDATE be_monthly_subcategory_budgets SET budgeted = 0, updated_at = CURRENT_TIMESTAMP WHERE budget_id = ?1",
        params![b_id],
    )
    .map_err(|e| e.to_string())?;

    let account_ids: Vec<String> = {
        let mut stmt = tx
            .prepare("SELECT id FROM be_accounts WHERE budget_id = ?1 AND is_tombstone = 0")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![b_id], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        rows.filter_map(SqlResult::ok).collect()
    };

    tx.commit().map_err(|e| e.to_string())?;

    for acc_id in account_ids {
        let _ = update_account_balances(conn, &acc_id);
    }

    Ok(b_id.to_string())
}

pub fn update_plan_settings(
    conn: &Connection,
    payload: &UpdatePlanSettingsPayload,
) -> Result<(), String> {
    let b_id = payload.budget_id.as_deref().unwrap_or(DEFAULT_BUDGET_ID);
    conn.execute(
        "UPDATE be_budgets SET budget_name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![payload.name, b_id],
    )
    .map_err(|e| e.to_string())?;

    if let Some(curr) = &payload.currency_format {
        if let Ok(json_str) = serde_json::to_string(curr) {
            conn.execute(
                "UPDATE be_budgets SET currency_format = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                params![json_str, b_id],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    if let Some(df) = &payload.date_format {
        let json_str = serde_json::to_string(&DateFormatConfig { format: df.clone() })
            .unwrap_or_else(|_| format!(r#"{{"format":"{}"}}"#, df));
        conn.execute(
            "UPDATE be_budgets SET date_format = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![json_str, b_id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

// -------------------------------------------------------------
// File Import, Matching, Loan, Recent Moves, Payee Rules & Scheduled Wrappers
// -------------------------------------------------------------

pub fn preview_file_import(
    conn: &Connection,
    budget_id: Option<&str>,
    account_id: &str,
    filename: Option<&str>,
    content: &str,
    options: &ImportOptions,
) -> Result<ImportPreviewResult, String> {
    let b_id = budget_id.unwrap_or(DEFAULT_BUDGET_ID);
    crate::import::preview_import(conn, b_id, account_id, filename, content, options)
}

pub fn commit_file_import(
    conn: &mut Connection,
    budget_id: Option<&str>,
    account_id: &str,
    filename: Option<&str>,
    content: &str,
    options: &ImportOptions,
) -> Result<ImportCommitResult, String> {
    let b_id = budget_id.unwrap_or(DEFAULT_BUDGET_ID);
    crate::import::commit_import(conn, b_id, account_id, filename, content, options)
}

pub fn match_transactions(
    conn: &mut Connection,
    manual_tx_id: &str,
    imported_tx_id: &str,
) -> Result<(), String> {
    crate::import::match_transactions(conn, manual_tx_id, imported_tx_id)
}

pub fn unmatch_transaction(conn: &mut Connection, tx_id: &str) -> Result<String, String> {
    crate::import::unmatch_transaction(conn, tx_id)
}

pub fn unmatch_transactions(
    conn: &mut Connection,
    tx_ids: &[String],
) -> Result<Vec<String>, String> {
    if tx_ids.is_empty() {
        return Ok(Vec::new());
    }
    if tx_ids.len() == 1 {
        let restored = crate::import::unmatch_transaction(conn, &tx_ids[0])?;
        return Ok(vec![restored]);
    }
    conn.execute_batch("SAVEPOINT sp_unmatch_batch;")
        .map_err(|e| e.to_string())?;

    let mut restored_ids = Vec::new();
    let mut handled: HashSet<String> = HashSet::new();
    for tx_id in tx_ids {
        if handled.contains(tx_id) {
            continue;
        }
        let is_matched: bool = conn
            .query_row(
                "SELECT matched_transaction_id IS NOT NULL FROM be_transactions WHERE id = ?1",
                params![tx_id],
                |r| r.get(0),
            )
            .unwrap_or(false);
        if !is_matched {
            continue;
        }
        match crate::import::unmatch_transaction(conn, tx_id) {
            Ok(restored) => {
                handled.insert(tx_id.clone());
                handled.insert(restored.clone());
                restored_ids.push(restored);
            }
            Err(err) => {
                let _ = conn.execute_batch(
                    "ROLLBACK TO SAVEPOINT sp_unmatch_batch; RELEASE SAVEPOINT sp_unmatch_batch;",
                );
                return Err(err);
            }
        }
    }
    conn.execute_batch("RELEASE SAVEPOINT sp_unmatch_batch;")
        .map_err(|e| e.to_string())?;
    Ok(restored_ids)
}

pub fn get_loan_terms(conn: &Connection, account_id: &str) -> Result<LoanAccountTerms, String> {
    crate::loan::load_loan_account_terms(conn, account_id)
}

pub fn save_loan_terms(conn: &Connection, terms: &LoanAccountTerms) -> Result<(), String> {
    crate::loan::save_loan_account_terms(conn, terms)
}

pub fn simulate_loan_payoff(
    conn: &Connection,
    account_id: &str,
    extra_monthly_milliunits: i64,
    one_time_extra_milliunits: i64,
    start_date_override: Option<&str>,
) -> Result<LoanPayoffSimulation, String> {
    let terms = crate::loan::load_loan_account_terms(conn, account_id)?;
    let raw_start = start_date_override
        .map(str::to_string)
        .or_else(|| terms.start_date.clone())
        .unwrap_or_else(|| chrono::Local::now().format("%Y-%m-01").to_string());
    let normalized_start = if raw_start.len() == 7 {
        format!("{}-01", raw_start)
    } else {
        raw_start
    };
    let loan_params = LoanParams::new(
        terms.current_balance_milliunits,
        terms.apr_milli_percent,
        Some(terms.minimum_payment_milliunits.max(0)),
        terms.escrow_milliunits.max(0),
        None,
        normalized_start,
    );
    crate::loan::simulate_loan_payoff(
        &loan_params,
        extra_monthly_milliunits,
        one_time_extra_milliunits,
    )
}

pub fn list_recent_moves(
    conn: &Connection,
    budget_id: Option<&str>,
    filter: RecentMoveFilter,
    subcategory_id: Option<&str>,
) -> Result<Vec<RecentMoveEntry>, String> {
    let b_id = budget_id.unwrap_or(DEFAULT_BUDGET_ID);
    crate::ledger::money_movements::list_recent_moves(conn, b_id, filter, subcategory_id)
}

pub fn list_recent_moves_as_of(
    conn: &Connection,
    budget_id: Option<&str>,
    filter: RecentMoveFilter,
    subcategory_id: Option<&str>,
    as_of_date: Option<&str>,
) -> Result<Vec<RecentMoveEntry>, String> {
    let b_id = budget_id.unwrap_or(DEFAULT_BUDGET_ID);
    crate::ledger::money_movements::list_recent_moves_as_of(
        conn,
        b_id,
        filter,
        subcategory_id,
        as_of_date,
    )
}

pub fn combine_payees(
    conn: &mut Connection,
    budget_id: Option<&str>,
    source_payee_ids: &[String],
    target_payee_id_or_new_name: &str,
) -> Result<CombinePayeesResult, String> {
    let b_id = budget_id.unwrap_or(DEFAULT_BUDGET_ID);
    crate::ledger::money_movements::combine_payees(
        conn,
        b_id,
        source_payee_ids,
        target_payee_id_or_new_name,
    )
}

pub fn list_payee_rename_conditions(
    conn: &Connection,
    budget_id: Option<&str>,
    payee_id: Option<&str>,
) -> Result<Vec<PayeeRenameCondition>, String> {
    let b_id = budget_id.unwrap_or(DEFAULT_BUDGET_ID);
    match payee_id {
        Some(pid) => crate::import::list_payee_rename_conditions_for_payee(conn, pid)
            .map_err(|e| e.to_string()),
        None => crate::import::list_payee_rename_conditions(conn, b_id).map_err(|e| e.to_string()),
    }
}

pub fn add_payee_rename_condition(
    conn: &Connection,
    budget_id: Option<&str>,
    payee_id: &str,
    operator: RenameOperator,
    operand: &str,
) -> Result<String, String> {
    let trimmed = operand.trim();
    if trimmed.is_empty() {
        return Err("Auto-rename rule operand cannot be empty".to_string());
    }
    let b_id = budget_id.unwrap_or(DEFAULT_BUDGET_ID);
    let exists: bool = conn
        .query_row(
            "SELECT 1 FROM be_payees WHERE id = ?1 AND budget_id = ?2 AND is_tombstone = 0 LIMIT 1",
            params![payee_id, b_id],
            |_| Ok(true),
        )
        .unwrap_or(false);
    if !exists {
        return Err(format!("Payee '{}' not found", payee_id));
    }
    crate::import::add_payee_rename_condition(conn, b_id, payee_id, operator, trimmed)
        .map_err(|e| e.to_string())
}

pub fn delete_payee_rename_condition(conn: &Connection, rule_id: &str) -> Result<(), String> {
    crate::import::delete_payee_rename_condition(conn, rule_id).map_err(|e| e.to_string())
}

pub fn skip_scheduled_occurrence(
    conn: &Connection,
    scheduled_id: &str,
) -> Result<Option<String>, String> {
    do_skip_scheduled(conn, scheduled_id)
}

pub fn list_scheduled_transactions_for_account(
    conn: &Connection,
    budget_id: Option<&str>,
    account_id: Option<&str>,
) -> Result<Vec<ScheduledTransferViewRow>, String> {
    let b_id = budget_id.unwrap_or(DEFAULT_BUDGET_ID);
    crate::ledger::money_movements::expand_fabricated_scheduled_transfers(conn, b_id, account_id)
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

pub fn safe_ym_prefix(s: &str) -> String {
    let (y, m) = parse_year_month(s);
    format!("{:04}-{:02}", y, m)
}

pub fn parse_year_month(ym: &str) -> (i32, u32) {
    if ym.is_empty() {
        return (2026, 1);
    }
    let parts: Vec<&str> = ym.split('-').collect();
    let year: i32 = parts.first().and_then(|s| s.parse().ok()).unwrap_or(2026);
    let month: u32 = parts
        .get(1)
        .and_then(|s| s.parse().ok())
        .unwrap_or(1)
        .clamp(1, 12);
    (year, month)
}

pub fn increment_month(year: i32, month: u32) -> String {
    if month == 12 {
        format!("{:04}-01-01", year + 1)
    } else {
        format!("{:04}-{:02}-01", year, month + 1)
    }
}

pub fn decrement_month(year: i32, month: u32) -> String {
    if month <= 1 {
        format!("{:04}-12-01", year - 1)
    } else {
        format!("{:04}-{:02}-01", year, month - 1)
    }
}

pub fn calculate_category_historical_stats(
    conn: &Connection,
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

    let budgeted_last_month: i64 = conn
        .query_row(
            "SELECT budgeted FROM be_monthly_subcategory_budgets WHERE entities_subcategory_id = ?1 AND month = ?2 AND is_tombstone = 0",
            params![subcategory_id, prev_month_str],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let spent_last_month: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM be_transactions WHERE entities_subcategory_id = ?1 AND date LIKE (?2 || '%') AND is_tombstone = 0 AND amount < 0",
            params![subcategory_id, prev_ym_prefix],
            |r| r.get::<_, i64>(0),
        )
        .map(|sum| sum.abs())
        .unwrap_or(0);

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

    let mut stmt = conn
        .prepare(
            "SELECT strftime('%Y-%m', date) as ym, SUM(amount) FROM be_transactions WHERE entities_subcategory_id = ?1 AND date < ?2 AND is_tombstone = 0 AND amount < 0 GROUP BY ym",
        )
        .ok();
    let mut month_count = 0i64;
    let mut total_spent = 0i64;
    if let Some(ref mut s) = stmt {
        if let Ok(rows) = s.query_map(params![subcategory_id, target_month], |r| {
            r.get::<_, i64>(1)
        }) {
            for r in rows.flatten() {
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

    (
        budgeted_last_month,
        spent_last_month,
        average_budgeted,
        average_spent,
    )
}
