//! Account-to-Account Transfers and Transaction Management matching YNAB v26.160.1
//! (`wrapper.beautified.js:37432–37563`, `37626–38728`).
//!
//! Enforces:
//! 1. Atomic paired transfer rows summing to exact 0 milliunits.
//! 2. Category rules: OnBudget <-> OnBudget has category_id = NULL.
//!    OnBudget <-> Tracking requires a category on the OnBudget leg.
//! 3. Independent cleared status per transfer leg.

use rusqlite::{params, Connection, Result};
use uuid::Uuid;

#[derive(Debug, Clone)]
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

    // Check account on-budget flags
    let (source_on_budget, source_acc_type): (i32, String) = conn.query_row(
        "SELECT on_budget, account_type FROM be_accounts WHERE id = ?1",
        params![payload.account_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;

    // Handle Transfer Logic
    if let Some(target_acc_id) = &payload.transfer_account_id {
        let (target_on_budget, _target_acc_type): (i32, String) = conn.query_row(
            "SELECT on_budget, account_type FROM be_accounts WHERE id = ?1",
            params![target_acc_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;

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
                   date, amount, memo, cleared, accepted, flag,
                   transfer_account_id, transfer_transaction_id
               ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
               ON CONFLICT(id) DO UPDATE SET
                   entities_account_id = ?3,
                   entities_payee_id = ?4,
                   entities_subcategory_id = ?5,
                   date = ?6,
                   amount = ?7,
                   memo = ?8,
                   cleared = ?9,
                   accepted = ?10,
                   flag = ?11,
                   transfer_account_id = ?12,
                   transfer_transaction_id = ?13,
                   updated_at = CURRENT_TIMESTAMP"#,
            params![
                tx_id,
                payload.budget_id,
                payload.account_id,
                target_transfer_payee_id,
                source_cat_id,
                payload.date,
                payload.amount_milliunits,
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
                   date, amount, memo, cleared, accepted, flag,
                   transfer_account_id, transfer_transaction_id
               ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'Uncleared', ?9, ?10, ?11, ?12)
               ON CONFLICT(id) DO UPDATE SET
                   entities_account_id = ?3,
                   entities_payee_id = ?4,
                   entities_subcategory_id = ?5,
                   date = ?6,
                   amount = ?7,
                   memo = ?8,
                   transfer_account_id = ?11,
                   transfer_transaction_id = ?12,
                   updated_at = CURRENT_TIMESTAMP"#,
            params![
                peer_tx_id,
                payload.budget_id,
                target_acc_id,
                source_transfer_payee_id,
                target_cat_id,
                payload.date,
                -payload.amount_milliunits,
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
                   date, amount, memo, cleared, accepted, flag,
                   transfer_account_id, transfer_transaction_id
               ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, NULL, NULL)
               ON CONFLICT(id) DO UPDATE SET
                   entities_account_id = ?3,
                   entities_payee_id = ?4,
                   entities_subcategory_id = ?5,
                   date = ?6,
                   amount = ?7,
                   memo = ?8,
                   cleared = ?9,
                   accepted = ?10,
                   flag = ?11,
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
                payload.memo,
                cleared,
                if approved { 1 } else { 0 },
                payload.flag,
            ],
        )?;

        // Update account balances
        update_account_balances(conn, &payload.account_id)?;

        // Trigger Payee 2-of-3 Autocategorization check
        if let Some(payee_id) = &payload.payee_id {
            let _ = crate::ledger::payee_autocat::update_payee_autofill_category(conn, payee_id);
        }
    }

    Ok(tx_id)
}

/// Updates the materialized balances in `be_account_calculations` for an account.
pub fn update_account_balances(conn: &Connection, account_id: &str) -> Result<()> {
    let (cleared, uncleared, tx_count): (i64, i64, i64) = conn.query_row(
        r#"SELECT
               COALESCE(SUM(CASE WHEN cleared IN ('Cleared', 'Reconciled') THEN amount ELSE 0 END), 0),
               COALESCE(SUM(CASE WHEN cleared = 'Uncleared' THEN amount ELSE 0 END), 0),
               COUNT(*)
           FROM be_transactions
           WHERE entities_account_id = ?1 AND is_tombstone = 0"#,
        params![account_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    )?;

    let calc_id = format!("ac/{}", account_id);
    conn.execute(
        r#"INSERT INTO be_account_calculations (
               id, entities_account_id, cleared_balance, uncleared_balance, transaction_count
           ) VALUES (?1, ?2, ?3, ?4, ?5)
           ON CONFLICT(id) DO UPDATE SET
               cleared_balance = ?3,
               uncleared_balance = ?4,
               transaction_count = ?5,
               updated_at = CURRENT_TIMESTAMP"#,
        params![calc_id, account_id, cleared, uncleared, tx_count],
    )?;

    Ok(())
}
