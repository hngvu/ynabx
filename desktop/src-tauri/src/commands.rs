use crate::budget_calculator::{
    calculate_month, CategoryMeta, PlanMonthRollup, PriorMonthSummary,
};
use crate::db::{Db, DEFAULT_PLAN_ID};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

pub struct AppState {
    pub db: Mutex<Db>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlanDto {
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
    pub plan_id: String,
    pub name: String,
    pub r#type: String,
    pub on_budget: bool,
    pub closed: bool,
    pub balance_milliunits: i64,
    pub cleared_balance_milliunits: i64,
    pub uncleared_balance_milliunits: i64,
    pub note: Option<String>,
    pub transfer_payee_id: Option<String>,
    pub last_reconciled_at: Option<String>,
    pub sort_order: i32,
    pub deleted: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryDto {
    pub id: String,
    pub plan_id: String,
    pub group_id: String,
    pub name: String,
    pub note: Option<String>,
    pub is_inflow_category: bool,
    pub is_credit_card_payment: bool,
    pub credit_card_account_id: Option<String>,
    pub hidden: bool,
    pub sort_order: i32,
    pub deleted: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryGroupDto {
    pub id: String,
    pub plan_id: String,
    pub name: String,
    pub is_system: bool,
    pub hidden: bool,
    pub sort_order: i32,
    pub deleted: bool,
    pub categories: Vec<CategoryDto>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionDto {
    pub id: String,
    pub plan_id: String,
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
    pub transfer_account_id: Option<String>,
    pub transfer_transaction_id: Option<String>,
    pub deleted: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryMonthAllocationDto {
    pub category_id: String,
    pub assigned_milliunits: i64,
    pub activity_milliunits: i64,
    pub available_milliunits: i64,
    pub cash_overspent_milliunits: i64,
    pub credit_overspent_milliunits: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlanMonthSummaryDto {
    pub month: String,
    pub ready_to_assign_milliunits: i64,
    pub total_assigned_milliunits: i64,
    pub total_activity_milliunits: i64,
    pub total_available_milliunits: i64,
    pub category_allocations: Vec<CategoryMonthAllocationDto>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAccountPayload {
    pub name: String,
    pub r#type: String,
    pub balance_milliunits: i64,
}

#[derive(Debug, Deserialize)]
pub struct SaveTransactionPayload {
    pub id: Option<String>,
    pub account_id: String,
    pub payee_id: Option<String>,
    pub payee_name: Option<String>,
    pub category_id: Option<String>,
    pub date: String,
    pub amount_milliunits: i64,
    pub memo: Option<String>,
    pub cleared: Option<String>,
    pub approved: Option<bool>,
}

#[tauri::command]
pub fn get_plans(state: State<'_, AppState>) -> Result<Vec<PlanDto>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .conn
        .prepare("SELECT id, name, currency_code, number_format, currency_symbol_first, currency_display_symbol, date_format FROM plans")
        .map_err(|e| e.to_string())?;

    let plans = stmt
        .query_map([], |row| {
            Ok(PlanDto {
                id: row.get(0)?,
                name: row.get(1)?,
                currency_code: row.get(2)?,
                number_format: row.get(3)?,
                currency_symbol_first: row.get::<_, i32>(4)? != 0,
                currency_display_symbol: row.get::<_, i32>(5)? != 0,
                date_format: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    Ok(plans)
}

#[tauri::command]
pub fn get_accounts(state: State<'_, AppState>) -> Result<Vec<AccountDto>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .conn
        .prepare(
            r#"SELECT id, plan_id, name, type, on_budget, closed, balance_milliunits,
                      cleared_balance_milliunits, uncleared_balance_milliunits, note,
                      transfer_payee_id, last_reconciled_at, sort_order, deleted
               FROM accounts WHERE deleted = 0 ORDER BY sort_order, name"#,
        )
        .map_err(|e| e.to_string())?;

    let accounts = stmt
        .query_map([], |row| {
            Ok(AccountDto {
                id: row.get(0)?,
                plan_id: row.get(1)?,
                name: row.get(2)?,
                r#type: row.get(3)?,
                on_budget: row.get::<_, i32>(4)? != 0,
                closed: row.get::<_, i32>(5)? != 0,
                balance_milliunits: row.get(6)?,
                cleared_balance_milliunits: row.get(7)?,
                uncleared_balance_milliunits: row.get(8)?,
                note: row.get(9)?,
                transfer_payee_id: row.get(10)?,
                last_reconciled_at: row.get(11)?,
                sort_order: row.get(12)?,
                deleted: row.get::<_, i32>(13)? != 0,
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
) -> Result<AccountDto, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let account_id = Uuid::new_v4().to_string();
    let on_budget = payload.r#type != "TRACKING";

    // 1. Create transfer payee
    let payee_id = Uuid::new_v4().to_string();
    let payee_name = format!("Transfer : {}", payload.name);
    db.conn
        .execute(
            "INSERT INTO payees (id, plan_id, name, transfer_account_id) VALUES (?1, ?2, ?3, ?4)",
            params![payee_id, DEFAULT_PLAN_ID, payee_name, account_id],
        )
        .map_err(|e| e.to_string())?;

    // 2. Insert account
    db.conn
        .execute(
            r#"INSERT INTO accounts (id, plan_id, name, type, on_budget, balance_milliunits,
                                    cleared_balance_milliunits, transfer_payee_id)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?7)"#,
            params![
                account_id,
                DEFAULT_PLAN_ID,
                payload.name,
                payload.r#type,
                if on_budget { 1 } else { 0 },
                payload.balance_milliunits,
                payee_id,
            ],
        )
        .map_err(|e| e.to_string())?;

    // 3. If credit card, create credit card payment category
    if payload.r#type == "CREDIT_CARD" {
        let cat_id = Uuid::new_v4().to_string();
        let cc_group_id: Option<String> = db
            .conn
            .query_row(
                "SELECT id FROM category_groups WHERE plan_id = ?1 AND name = 'Credit Card Payments'",
                params![DEFAULT_PLAN_ID],
                |r| r.get(0),
            )
            .ok();

        let group_id = match cc_group_id {
            Some(g) => g,
            None => {
                let new_g = Uuid::new_v4().to_string();
                db.conn
                    .execute(
                        "INSERT INTO category_groups (id, plan_id, name, is_system, sort_order) VALUES (?1, ?2, 'Credit Card Payments', 1, -2)",
                        params![new_g, DEFAULT_PLAN_ID],
                    )
                    .map_err(|e| e.to_string())?;
                new_g
            }
        };

        let cat_name = format!("Payment: {}", payload.name);
        db.conn
            .execute(
                "INSERT INTO categories (id, plan_id, group_id, name, is_credit_card_payment, credit_card_account_id) VALUES (?1, ?2, ?3, ?4, 1, ?5)",
                params![cat_id, DEFAULT_PLAN_ID, group_id, cat_name, account_id],
            )
            .map_err(|e| e.to_string())?;
    }

    // 4. Initial balance transaction if balance != 0
    if payload.balance_milliunits != 0 {
        let tx_id = Uuid::new_v4().to_string();
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        db.conn
            .execute(
                r#"INSERT INTO transactions (id, plan_id, account_id, date, amount_milliunits, memo, cleared, approved)
                   VALUES (?1, ?2, ?3, ?4, ?5, 'Starting Balance', 'CLEARED', 1)"#,
                params![tx_id, DEFAULT_PLAN_ID, account_id, today, payload.balance_milliunits],
            )
            .map_err(|e| e.to_string())?;
    }

    Ok(AccountDto {
        id: account_id,
        plan_id: DEFAULT_PLAN_ID.to_string(),
        name: payload.name,
        r#type: payload.r#type,
        on_budget,
        closed: false,
        balance_milliunits: payload.balance_milliunits,
        cleared_balance_milliunits: payload.balance_milliunits,
        uncleared_balance_milliunits: 0,
        note: None,
        transfer_payee_id: Some(payee_id),
        last_reconciled_at: None,
        sort_order: 0,
        deleted: false,
    })
}

#[tauri::command]
pub fn get_category_groups(state: State<'_, AppState>) -> Result<Vec<CategoryGroupDto>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut group_stmt = db
        .conn
        .prepare(
            "SELECT id, plan_id, name, is_system, hidden, sort_order, deleted
             FROM category_groups WHERE deleted = 0 ORDER BY sort_order, name",
        )
        .map_err(|e| e.to_string())?;

    let groups_iter = group_stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i32>(3)? != 0,
                row.get::<_, i32>(4)? != 0,
                row.get::<_, i32>(5)?,
                row.get::<_, i32>(6)? != 0,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut groups = Vec::new();
    for g in groups_iter.flatten() {
        let (id, plan_id, name, is_system, hidden, sort_order, deleted) = g;

        let mut cat_stmt = db
            .conn
            .prepare(
                "SELECT id, plan_id, group_id, name, note, is_inflow_category, is_credit_card_payment, credit_card_account_id, hidden, sort_order, deleted
                 FROM categories WHERE group_id = ?1 AND deleted = 0 ORDER BY sort_order, name",
            )
            .map_err(|e| e.to_string())?;

        let categories = cat_stmt
            .query_map(params![id], |r| {
                Ok(CategoryDto {
                    id: r.get(0)?,
                    plan_id: r.get(1)?,
                    group_id: r.get(2)?,
                    name: r.get(3)?,
                    note: r.get(4)?,
                    is_inflow_category: r.get::<_, i32>(5)? != 0,
                    is_credit_card_payment: r.get::<_, i32>(6)? != 0,
                    credit_card_account_id: r.get(7)?,
                    hidden: r.get::<_, i32>(8)? != 0,
                    sort_order: r.get(9)?,
                    deleted: r.get::<_, i32>(10)? != 0,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .collect();

        groups.push(CategoryGroupDto {
            id,
            plan_id,
            name,
            is_system,
            hidden,
            sort_order,
            deleted,
            categories,
        });
    }

    Ok(groups)
}

#[tauri::command]
pub fn get_month_budget(
    month: String,
    state: State<'_, AppState>,
) -> Result<PlanMonthSummaryDto, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Load all non-deleted categories
    let mut cat_stmt = db
        .conn
        .prepare(
            "SELECT id, group_id, name, is_inflow_category, is_credit_card_payment, credit_card_account_id
             FROM categories WHERE deleted = 0",
        )
        .map_err(|e| e.to_string())?;

    let categories: Vec<CategoryMeta> = cat_stmt
        .query_map([], |r| {
            let cid_str: String = r.get(0)?;
            let gid_str: String = r.get(1)?;
            let cc_acc_str: Option<String> = r.get(5)?;
            Ok(CategoryMeta {
                category_id: Uuid::parse_str(&cid_str).unwrap_or_default(),
                group_id: Uuid::parse_str(&gid_str).unwrap_or_default(),
                name: r.get(2)?,
                inflow_category: r.get::<_, i32>(3)? != 0,
                credit_card_payment: r.get::<_, i32>(4)? != 0,
                credit_card_account_id: cc_acc_str.and_then(|s| Uuid::parse_str(&s).ok()),
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    // Load monthly allocations for requested month
    let mut alloc_stmt = db
        .conn
        .prepare("SELECT category_id, assigned_milliunits FROM monthly_category_allocations WHERE month = ?1")
        .map_err(|e| e.to_string())?;

    let mut month_assigned: HashMap<Uuid, i64> = HashMap::new();
    let alloc_rows = alloc_stmt
        .query_map(params![month], |r| {
            let cid: String = r.get(0)?;
            let assigned: i64 = r.get(1)?;
            Ok((Uuid::parse_str(&cid).unwrap_or_default(), assigned))
        })
        .map_err(|e| e.to_string())?;

    for row in alloc_rows.flatten() {
        month_assigned.insert(row.0, row.1);
    }

    // Load transactions for the month
    // Month is in format YYYY-MM-01, query date LIKE 'YYYY-MM%'
    let month_prefix = if month.len() >= 7 { &month[0..7] } else { &month };
    let pattern = format!("{}%", month_prefix);

    let mut tx_stmt = db
        .conn
        .prepare(
            r#"SELECT t.category_id, t.amount_milliunits, a.type
               FROM transactions t
               JOIN accounts a ON t.account_id = a.id
               WHERE t.deleted = 0 AND t.date LIKE ?1"#,
        )
        .map_err(|e| e.to_string())?;

    let mut month_cash_activity: HashMap<Uuid, i64> = HashMap::new();
    let mut month_credit_activity: HashMap<Uuid, i64> = HashMap::new();
    let mut month_inflow: i64 = 0;

    let tx_rows = tx_stmt
        .query_map(params![pattern], |r| {
            let cat_id: Option<String> = r.get(0)?;
            let amount: i64 = r.get(1)?;
            let acc_type: String = r.get(2)?;
            Ok((cat_id, amount, acc_type))
        })
        .map_err(|e| e.to_string())?;

    for row in tx_rows.flatten() {
        let (cat_id_opt, amount, acc_type) = row;
        if let Some(cat_str) = cat_id_opt {
            if let Ok(cat_uuid) = Uuid::parse_str(&cat_str) {
                let is_credit = acc_type == "CREDIT_CARD";
                if is_credit {
                    *month_credit_activity.entry(cat_uuid).or_insert(0) += amount;
                } else {
                    *month_cash_activity.entry(cat_uuid).or_insert(0) += amount;
                }
            }
        } else if amount > 0 {
            // Uncategorized inflow counts towards Ready to Assign
            month_inflow += amount;
        }
    }

    let rollup = calculate_month(
        &categories,
        None, // Prior month rollover
        month_inflow,
        &month_assigned,
        &month_cash_activity,
        &month_credit_activity,
        &HashMap::new(),
    );

    let category_allocations: Vec<CategoryMonthAllocationDto> = rollup
        .category_balances
        .into_iter()
        .map(|(cid, bal)| CategoryMonthAllocationDto {
            category_id: cid.to_string(),
            assigned_milliunits: bal.assigned_milliunits,
            activity_milliunits: bal.activity_milliunits,
            available_milliunits: bal.available_milliunits,
            cash_overspent_milliunits: bal.cash_overspent_milliunits,
            credit_overspent_milliunits: bal.credit_overspent_milliunits,
        })
        .collect();

    Ok(PlanMonthSummaryDto {
        month,
        ready_to_assign_milliunits: rollup.ready_to_assign_milliunits,
        total_assigned_milliunits: rollup.total_assigned_milliunits,
        total_activity_milliunits: rollup.total_activity_milliunits,
        total_available_milliunits: rollup.total_available_milliunits,
        category_allocations,
    })
}

#[tauri::command]
pub fn update_category_allocation(
    category_id: String,
    month: String,
    assigned_milliunits: i64,
    state: State<'_, AppState>,
) -> Result<CategoryMonthAllocationDto, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let alloc_id = Uuid::new_v4().to_string();

    db.conn
        .execute(
            r#"INSERT INTO monthly_category_allocations (id, plan_id, category_id, month, assigned_milliunits)
               VALUES (?1, ?2, ?3, ?4, ?5)
               ON CONFLICT(category_id, month) DO UPDATE SET assigned_milliunits = ?5, updated_at = CURRENT_TIMESTAMP"#,
            params![alloc_id, DEFAULT_PLAN_ID, category_id, month, assigned_milliunits],
        )
        .map_err(|e| e.to_string())?;

    Ok(CategoryMonthAllocationDto {
        category_id,
        assigned_milliunits,
        activity_milliunits: 0,
        available_milliunits: assigned_milliunits,
        cash_overspent_milliunits: 0,
        credit_overspent_milliunits: 0,
    })
}

#[tauri::command]
pub fn get_transactions(
    account_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<TransactionDto>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let sql = match account_id {
        Some(_) => {
            r#"SELECT t.id, t.plan_id, t.account_id, t.payee_id, p.name, t.category_id, c.name,
                      t.date, t.amount_milliunits, t.memo, t.cleared, t.approved,
                      t.transfer_account_id, t.transfer_transaction_id, t.deleted
               FROM transactions t
               LEFT JOIN payees p ON t.payee_id = p.id
               LEFT JOIN categories c ON t.category_id = c.id
               WHERE t.deleted = 0 AND t.account_id = ?1
               ORDER BY t.date DESC, t.created_at DESC"#
        }
        None => {
            r#"SELECT t.id, t.plan_id, t.account_id, t.payee_id, p.name, t.category_id, c.name,
                      t.date, t.amount_milliunits, t.memo, t.cleared, t.approved,
                      t.transfer_account_id, t.transfer_transaction_id, t.deleted
               FROM transactions t
               LEFT JOIN payees p ON t.payee_id = p.id
               LEFT JOIN categories c ON t.category_id = c.id
               WHERE t.deleted = 0
               ORDER BY t.date DESC, t.created_at DESC"#
        }
    };

    let mut stmt = db.conn.prepare(sql).map_err(|e| e.to_string())?;
    let mapper = |r: &rusqlite::Row| {
        Ok(TransactionDto {
            id: r.get(0)?,
            plan_id: r.get(1)?,
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
            transfer_account_id: r.get(12)?,
            transfer_transaction_id: r.get(13)?,
            deleted: r.get::<_, i32>(14)? != 0,
        })
    };

    let txs = match account_id {
        Some(aid) => stmt
            .query_map(params![aid], mapper)
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .collect(),
        None => stmt
            .query_map([], mapper)
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
) -> Result<TransactionDto, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let tx_id = payload.id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let cleared = payload.cleared.unwrap_or_else(|| "UNCLEARED".to_string());
    let approved = payload.approved.unwrap_or(true);

    db.conn
        .execute(
            r#"INSERT INTO transactions (id, plan_id, account_id, payee_id, category_id, date, amount_milliunits, memo, cleared, approved)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
               ON CONFLICT(id) DO UPDATE SET
                   account_id = ?3,
                   payee_id = ?4,
                   category_id = ?5,
                   date = ?6,
                   amount_milliunits = ?7,
                   memo = ?8,
                   cleared = ?9,
                   approved = ?10,
                   updated_at = CURRENT_TIMESTAMP"#,
            params![
                tx_id,
                DEFAULT_PLAN_ID,
                payload.account_id,
                payload.payee_id,
                payload.category_id,
                payload.date,
                payload.amount_milliunits,
                payload.memo,
                cleared,
                if approved { 1 } else { 0 },
            ],
        )
        .map_err(|e| e.to_string())?;

    // Update account balances
    db.conn
        .execute(
            r#"UPDATE accounts SET
               balance_milliunits = (SELECT COALESCE(SUM(amount_milliunits), 0) FROM transactions WHERE account_id = ?1 AND deleted = 0),
               cleared_balance_milliunits = (SELECT COALESCE(SUM(amount_milliunits), 0) FROM transactions WHERE account_id = ?1 AND cleared != 'UNCLEARED' AND deleted = 0),
               uncleared_balance_milliunits = (SELECT COALESCE(SUM(amount_milliunits), 0) FROM transactions WHERE account_id = ?1 AND cleared = 'UNCLEARED' AND deleted = 0)
               WHERE id = ?1"#,
            params![payload.account_id],
        )
        .map_err(|e| e.to_string())?;

    Ok(TransactionDto {
        id: tx_id,
        plan_id: DEFAULT_PLAN_ID.to_string(),
        account_id: payload.account_id,
        payee_id: payload.payee_id,
        payee_name: payload.payee_name,
        category_id: payload.category_id,
        category_name: None,
        date: payload.date,
        amount_milliunits: payload.amount_milliunits,
        memo: payload.memo,
        cleared,
        approved,
        transfer_account_id: None,
        transfer_transaction_id: None,
        deleted: false,
    })
}
