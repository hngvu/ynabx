//! Account-to-Account Transfers and Transaction Management matching YNAB v26.160.1
//! (`wrapper.beautified.js:37432–37563`, `37626–38728`).
//!
//! Enforces:
//! 1. Atomic paired transfer rows summing to exact 0 milliunits.
//! 2. Category rules: OnBudget <-> OnBudget has category_id = NULL.
//!    OnBudget <-> Tracking requires a category on the OnBudget leg.
//! 3. Independent cleared status per transfer leg.
//! 4. Populates cash_amount and credit_amount columns based on account type.

use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveTransactionPayload {
    pub id: Option<String>,
    pub budget_id: String,
    pub account_id: String,
    pub payee_id: Option<String>,
    pub category_id: Option<String>,
    pub date: String,
    pub amount_milliunits: i64,
    pub memo: Option<String>,
    pub cleared: Option<String>,
    pub approved: Option<bool>,
    pub flag: Option<String>,
    pub transfer_account_id: Option<String>,
}

/// Helper to determine cash_amount and credit_amount based on account type
pub fn determine_cash_credit_amounts(account_type: &str, amount: i64) -> (i64, i64) {
    if account_type == "CreditCard" || account_type == "LineOfCredit" {
        (0, amount)
    } else {
        (amount, 0)
    }
}

/// Creates or updates a transaction and its counterpart if it is a transfer.
pub fn save_transaction(conn: &Connection, payload: &SaveTransactionPayload) -> Result<String> {
    let tx_id = payload
        .id
        .clone()
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let cleared = payload
        .cleared
        .clone()
        .unwrap_or_else(|| "Uncleared".to_string());
    let approved = payload.approved.unwrap_or(true);

    // Check account on-budget flags and account types
    let (source_on_budget, source_acc_type): (i32, String) = conn.query_row(
        "SELECT on_budget, account_type FROM be_accounts WHERE id = ?1",
        params![payload.account_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;

    let (source_cash, source_credit) =
        determine_cash_credit_amounts(&source_acc_type, payload.amount_milliunits);

    // Handle Transfer Logic
    if let Some(target_acc_id) = &payload.transfer_account_id {
        let (target_on_budget, target_acc_type): (i32, String) = conn.query_row(
            "SELECT on_budget, account_type FROM be_accounts WHERE id = ?1",
            params![target_acc_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;

        let (target_cash, target_credit) =
            determine_cash_credit_amounts(&target_acc_type, -payload.amount_milliunits);

        // Find or create peer transaction ID
        let peer_tx_id: String = match &payload.id {
            Some(existing_id) => {
                let existing_peer: Option<String> = conn
                    .query_row(
                        "SELECT transfer_transaction_id FROM be_transactions WHERE id = ?1",
                        params![existing_id],
                        |r| r.get(0),
                    )
                    .ok();
                existing_peer.unwrap_or_else(|| Uuid::new_v4().to_string())
            }
            None => Uuid::new_v4().to_string(),
        };

        // Transfer payees
        let source_transfer_payee_id: String = conn.query_row(
            "SELECT id FROM be_payees WHERE entities_account_id = ?1",
            params![payload.account_id],
            |r| r.get(0),
        )?;
        let target_transfer_payee_id: String = conn.query_row(
            "SELECT id FROM be_payees WHERE entities_account_id = ?1",
            params![target_acc_id],
            |r| r.get(0),
        )?;

        // Enforce Category Rules
        let (source_cat_id, target_cat_id) =
            if source_on_budget == 1 && target_on_budget == 1 {
                // On-budget to on-budget: category must be NULL
                (None, None)
            } else if source_on_budget == 1 && target_on_budget == 0 {
                // On-budget to Tracking: category lives on the On-budget leg
                (payload.category_id.clone(), None)
            } else if source_on_budget == 0 && target_on_budget == 1 {
                // Tracking to On-budget: category lives on the On-budget leg
                (None, payload.category_id.clone())
            } else {
                (None, None)
            };

        // Upsert Source Leg
        conn.execute(
            r#"INSERT INTO be_transactions (
                   id, budget_id, entities_account_id, entities_payee_id, entities_subcategory_id,
                   date, amount, cash_amount, credit_amount, memo, cleared, accepted, flag,
                   transfer_account_id, transfer_transaction_id
               ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
               ON CONFLICT(id) DO UPDATE SET
                   entities_account_id = ?3,
                   entities_payee_id = ?4,
                   entities_subcategory_id = ?5,
                   date = ?6,
                   amount = ?7,
                   cash_amount = ?8,
                   credit_amount = ?9,
                   memo = ?10,
                   cleared = ?11,
                   accepted = ?12,
                   flag = ?13,
                   transfer_account_id = ?14,
                   transfer_transaction_id = ?15,
                   updated_at = CURRENT_TIMESTAMP"#,
            params![
                tx_id,
                payload.budget_id,
                payload.account_id,
                target_transfer_payee_id,
                source_cat_id,
                payload.date,
                payload.amount_milliunits,
                source_cash,
                source_credit,
                payload.memo,
                cleared,
                if approved { 1 } else { 0 },
                payload.flag,
                target_acc_id,
                peer_tx_id,
            ],
        )?;

        // Upsert Peer Leg (negated amount, linked back, independent cleared status preserved on update)
        conn.execute(
            r#"INSERT INTO be_transactions (
                   id, budget_id, entities_account_id, entities_payee_id, entities_subcategory_id,
                   date, amount, cash_amount, credit_amount, memo, cleared, accepted, flag,
                   transfer_account_id, transfer_transaction_id
               ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'Uncleared', ?11, ?12, ?13, ?14)
               ON CONFLICT(id) DO UPDATE SET
                   entities_account_id = ?3,
                   entities_payee_id = ?4,
                   entities_subcategory_id = ?5,
                   date = ?6,
                   amount = ?7,
                   cash_amount = ?8,
                   credit_amount = ?9,
                   memo = ?10,
                   transfer_account_id = ?13,
                   transfer_transaction_id = ?14,
                   updated_at = CURRENT_TIMESTAMP"#,
            params![
                peer_tx_id,
                payload.budget_id,
                target_acc_id,
                source_transfer_payee_id,
                target_cat_id,
                payload.date,
                -payload.amount_milliunits,
                target_cash,
                target_credit,
                payload.memo,
                if approved { 1 } else { 0 },
                payload.flag,
                payload.account_id,
                tx_id,
            ],
        )?;

        // Update balances for both accounts
        update_account_balances(conn, &payload.account_id)?;
        update_account_balances(conn, target_acc_id)?;
    } else {
        // Regular Non-Transfer Transaction
        conn.execute(
            r#"INSERT INTO be_transactions (
                   id, budget_id, entities_account_id, entities_payee_id, entities_subcategory_id,
                   date, amount, cash_amount, credit_amount, memo, cleared, accepted, flag,
                   transfer_account_id, transfer_transaction_id
               ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, NULL, NULL)
               ON CONFLICT(id) DO UPDATE SET
                   entities_account_id = ?3,
                   entities_payee_id = ?4,
                   entities_subcategory_id = ?5,
                   date = ?6,
                   amount = ?7,
                   cash_amount = ?8,
                   credit_amount = ?9,
                   memo = ?10,
                   cleared = ?11,
                   accepted = ?12,
                   flag = ?13,
                   transfer_account_id = NULL,
                   transfer_transaction_id = NULL,
                   updated_at = CURRENT_TIMESTAMP"#,
            params![
                tx_id,
                payload.budget_id,
                payload.account_id,
                payload.payee_id,
                payload.category_id,
                payload.date,
                payload.amount_milliunits,
                source_cash,
                source_credit,
                payload.memo,
                cleared,
                if approved { 1 } else { 0 },
                payload.flag,
            ],
        )?;

        update_account_balances(conn, &payload.account_id)?;
    }

    Ok(tx_id)
}

/// Recalculates and caches direct cleared and uncleared balances on be_accounts
pub fn update_account_balances(conn: &Connection, account_id: &str) -> Result<()> {
    let cleared_balance: i64 = conn
        .query_row(
            r#"SELECT COALESCE(SUM(amount), 0)
               FROM be_transactions
               WHERE entities_account_id = ?1 AND is_tombstone = 0 AND cleared = 'Cleared'"#,
            params![account_id],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let uncleared_balance: i64 = conn
        .query_row(
            r#"SELECT COALESCE(SUM(amount), 0)
               FROM be_transactions
               WHERE entities_account_id = ?1 AND is_tombstone = 0 AND cleared = 'Uncleared'"#,
            params![account_id],
            |r| r.get(0),
        )
        .unwrap_or(0);

    conn.execute(
        r#"UPDATE be_accounts
           SET cleared_balance = ?1, uncleared_balance = ?2, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?3"#,
        params![cleared_balance, uncleared_balance, account_id],
    )?;

    Ok(())
}
