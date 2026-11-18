//! Scheduled Transactions Management (`be_scheduled_transactions` & `be_scheduled_subtransactions`)

#![deny(clippy::float_arithmetic)]

use chrono::{Datelike, Duration, Months, NaiveDate};
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::ledger::transfers::{save_transaction, SaveTransactionPayload};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ScheduledTransactionDto {
    pub id: String,
    pub budget_id: String,
    pub account_id: String,
    pub account_name: Option<String>,
    pub payee_id: Option<String>,
    pub payee_name: Option<String>,
    pub category_id: Option<String>,
    pub category_name: Option<String>,
    pub date: String,
    pub frequency: String,
    pub amount_milliunits: i64,
    pub memo: Option<String>,
    pub flag: Option<String>,
    pub transfer_account_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveScheduledTransactionPayload {
    pub id: Option<String>,
    pub budget_id: String,
    pub account_id: String,
    pub payee_id: Option<String>,
    pub category_id: Option<String>,
    pub date: String,
    pub frequency: String,
    pub amount_milliunits: i64,
    pub memo: Option<String>,
    pub flag: Option<String>,
    pub transfer_account_id: Option<String>,
}

pub fn save_scheduled_transaction(
    conn: &Connection,
    payload: &SaveScheduledTransactionPayload,
) -> Result<String> {
    let id = payload
        .id
        .clone()
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    conn.execute(
        r#"INSERT INTO be_scheduled_transactions (
               id, budget_id, entities_account_id, entities_payee_id, entities_subcategory_id,
               is_tombstone, date, frequency, amount, memo, flag, transfer_account_id
           ) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?8, ?9, ?10, ?11)
           ON CONFLICT(id) DO UPDATE SET
               entities_account_id = ?3,
               entities_payee_id = ?4,
               entities_subcategory_id = ?5,
               is_tombstone = 0,
               date = ?6,
               frequency = ?7,
               amount = ?8,
               memo = ?9,
               flag = ?10,
               transfer_account_id = ?11,
               updated_at = CURRENT_TIMESTAMP"#,
        params![
            id,
            payload.budget_id,
            payload.account_id,
            payload.payee_id,
            payload.category_id,
            payload.date,
            payload.frequency,
            payload.amount_milliunits,
            payload.memo,
            payload.flag,
            payload.transfer_account_id,
        ],
    )?;

    Ok(id)
}

pub fn get_scheduled_transactions(
    conn: &Connection,
    budget_id: &str,
    account_id: Option<&str>,
) -> Result<Vec<ScheduledTransactionDto>> {
    let sql = match account_id {
        Some(_) => {
            r#"SELECT st.id, st.budget_id, st.entities_account_id, a.account_name,
                      st.entities_payee_id, p.name, st.entities_subcategory_id, c.name,
                      st.date, st.frequency, st.amount, st.memo, st.flag, st.transfer_account_id
               FROM be_scheduled_transactions st
               LEFT JOIN be_accounts a ON st.entities_account_id = a.id
               LEFT JOIN be_payees p ON st.entities_payee_id = p.id
               LEFT JOIN be_subcategories c ON st.entities_subcategory_id = c.id
               WHERE st.budget_id = ?1 AND st.entities_account_id = ?2 AND st.is_tombstone = 0
               ORDER BY st.date ASC"#
        }
        None => {
            r#"SELECT st.id, st.budget_id, st.entities_account_id, a.account_name,
                      st.entities_payee_id, p.name, st.entities_subcategory_id, c.name,
                      st.date, st.frequency, st.amount, st.memo, st.flag, st.transfer_account_id
               FROM be_scheduled_transactions st
               LEFT JOIN be_accounts a ON st.entities_account_id = a.id
               LEFT JOIN be_payees p ON st.entities_payee_id = p.id
               LEFT JOIN be_subcategories c ON st.entities_subcategory_id = c.id
               WHERE st.budget_id = ?1 AND st.is_tombstone = 0
               ORDER BY st.date ASC"#
        }
    };

    let mut stmt = conn.prepare(sql)?;
    let mapper = |r: &rusqlite::Row| {
        Ok(ScheduledTransactionDto {
            id: r.get(0)?,
            budget_id: r.get(1)?,
            account_id: r.get(2)?,
            account_name: r.get(3)?,
            payee_id: r.get(4)?,
            payee_name: r.get(5)?,
            category_id: r.get(6)?,
            category_name: r.get(7)?,
            date: r.get(8)?,
            frequency: r.get(9)?,
            amount_milliunits: r.get(10)?,
            memo: r.get(11)?,
            flag: r.get(12)?,
            transfer_account_id: r.get(13)?,
        })
    };

    let rows = match account_id {
        Some(aid) => stmt
            .query_map(params![budget_id, aid], mapper)?
            .filter_map(Result::ok)
            .collect(),
        None => stmt
            .query_map(params![budget_id], mapper)?
            .filter_map(Result::ok)
            .collect(),
    };

    Ok(rows)
}

pub fn delete_scheduled_transaction(conn: &Connection, id: &str) -> Result<()> {
    conn.execute(
        "UPDATE be_scheduled_transactions SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

/// Enters a scheduled transaction into the active register immediately (`Enter Now` shortcut `E`).
pub fn enter_scheduled_transaction_now(conn: &Connection, id: &str) -> Result<String> {
    let row: ScheduledTransactionDto = conn.query_row(
        r#"SELECT id, budget_id, entities_account_id, NULL,
                  entities_payee_id, NULL, entities_subcategory_id, NULL,
                  date, frequency, amount, memo, flag, transfer_account_id
           FROM be_scheduled_transactions WHERE id = ?1 AND is_tombstone = 0"#,
        params![id],
        |r| {
            Ok(ScheduledTransactionDto {
                id: r.get(0)?,
                budget_id: r.get(1)?,
                account_id: r.get(2)?,
                account_name: r.get(3)?,
                payee_id: r.get(4)?,
                payee_name: r.get(5)?,
                category_id: r.get(6)?,
                category_name: r.get(7)?,
                date: r.get(8)?,
                frequency: r.get(9)?,
                amount_milliunits: r.get(10)?,
                memo: r.get(11)?,
                flag: r.get(12)?,
                transfer_account_id: r.get(13)?,
            })
        },
    )?;

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let tx_id = save_transaction(
        conn,
        &SaveTransactionPayload {
            id: None,
            budget_id: row.budget_id,
            account_id: row.account_id,
            payee_id: row.payee_id,
            payee_name: None,
            category_id: row.category_id,
            date: today,
            amount_milliunits: row.amount_milliunits,
            memo: row.memo,
            cleared: Some("Uncleared".to_string()),
            approved: Some(true),
            flag: row.flag,
            transfer_account_id: row.transfer_account_id,
            subtransactions: Vec::new(),
            allow_reconciled_mutation: false,
        },
    )?;

    delete_scheduled_transaction(conn, id)?;
    Ok(tx_id)
}

fn days_in_month(year: i32, month: u32) -> u32 {
    let (ny, nm) = if month == 12 {
        (year + 1, 1)
    } else {
        (year, month + 1)
    };
    let next_first = NaiveDate::from_ymd_opt(ny, nm, 1);
    next_first
        .and_then(|d| d.pred_opt())
        .map(|d| d.day())
        .unwrap_or(28)
}

/// Computes the next scheduled ISO date (`YYYY-MM-DD`) by advancing `date_iso` by `frequency`.
/// Returns `Ok(None)` when `frequency` is non-repeating (`"Never"` / `"Once"`).
pub fn advance_scheduled_date(
    date_iso: &str,
    frequency: &str,
) -> std::result::Result<Option<String>, String> {
    let date = NaiveDate::parse_from_str(date_iso.trim(), "%Y-%m-%d")
        .map_err(|_| format!("Invalid scheduled date '{}': expected YYYY-MM-DD", date_iso))?;
    let freq_norm: String = frequency
        .trim()
        .to_ascii_lowercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect();

    let next_opt = match freq_norm.as_str() {
        "never" | "once" => None,
        "weekly" | "everyweek" => Some(date + Duration::days(7)),
        "everyotherweek" | "biweekly" | "everytwoweeks" | "every2weeks" => {
            Some(date + Duration::days(14))
        }
        "twiceamonth" | "twicemonthly" => {
            if date.day() < 15 {
                let target_day = (date.day() + 14).min(days_in_month(date.year(), date.month()));
                NaiveDate::from_ymd_opt(date.year(), date.month(), target_day)
            } else {
                let (ny, nm) = if date.month() == 12 {
                    (date.year() + 1, 1)
                } else {
                    (date.year(), date.month() + 1)
                };
                let target_day = (date.day() - 14).clamp(1, days_in_month(ny, nm));
                NaiveDate::from_ymd_opt(ny, nm, target_day)
            }
        }
        "everyfourweeks" | "every4weeks" => Some(date + Duration::days(28)),
        "monthly" | "everymonth" => date.checked_add_months(Months::new(1)),
        "everyothermonth" | "everytwomonths" | "every2months" | "bimonthly" => {
            date.checked_add_months(Months::new(2))
        }
        "everythreemonths" | "every3months" | "quarterly" => {
            date.checked_add_months(Months::new(3))
        }
        "everyfourmonths" | "every4months" => date.checked_add_months(Months::new(4)),
        "twiceayear" | "everysixmonths" | "every6months" | "semiannually" => {
            date.checked_add_months(Months::new(6))
        }
        "yearly" | "annually" | "everyyear" => date.checked_add_months(Months::new(12)),
        "everytwoyears" | "every2years" => date.checked_add_months(Months::new(24)),
        _ => date.checked_add_months(Months::new(1)),
    };

    Ok(next_opt.map(|d| d.format("%Y-%m-%d").to_string()))
}

/// Skips the next scheduled occurrence by advancing `be_scheduled_transactions.date` by `frequency`
/// without creating a real ledger transaction. Non-repeating (`"Never"` / `"Once"`) rows are tombstoned.
/// Returns `Ok(Some(new_date))` when advanced, or `Ok(None)` when tombstoned.
pub fn skip_scheduled_occurrence(
    conn: &Connection,
    id: &str,
) -> std::result::Result<Option<String>, String> {
    let real_id = id
        .strip_prefix("fabricated_scheduled_transfer/")
        .or_else(|| id.strip_prefix("fabricated:"))
        .or_else(|| id.strip_prefix("fabricated/"))
        .unwrap_or(id);

    let (curr_date, freq): (String, String) = conn
        .query_row(
            "SELECT date, frequency FROM be_scheduled_transactions WHERE id = ?1 AND is_tombstone = 0",
            params![real_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|e| format!("Scheduled transaction '{}' not found: {}", real_id, e))?;

    match advance_scheduled_date(&curr_date, &freq)? {
        Some(next_date) => {
            conn.execute(
                "UPDATE be_scheduled_transactions SET date = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                params![next_date, real_id],
            )
            .map_err(|e| e.to_string())?;
            Ok(Some(next_date))
        }
        None => {
            delete_scheduled_transaction(conn, real_id).map_err(|e| e.to_string())?;
            Ok(None)
        }
    }
}
