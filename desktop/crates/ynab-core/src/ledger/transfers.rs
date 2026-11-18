//! Account-to-Account Transfers, Split Subtransactions, and Transaction Management
//! matching YNAB v26.160.1 (`wrapper.beautified.js:37432–37563`, `37626–38728`).
//!
//! Enforces:
//! 1. Atomic paired transfer rows summing to exact 0 milliunits (wrapped in SQLite `SAVEPOINT`).
//! 2. Category rules: OnBudget <-> OnBudget has category_id = NULL.
//!    OnBudget <-> Tracking requires a category on the OnBudget leg.
//! 3. Independent cleared status per transfer leg.
//! 4. Populates cash_amount and credit_amount columns based on account type.
//! 5. Persists split subtransactions (`be_subtransactions`) atomically.
//! 6. Enforces Reconciled (`LOCKED`) transaction protection (`INVARIANTS.md` line 33).
//! 7. Triggers Payee 2-of-3 auto-categorization upon transaction save.

#![deny(clippy::float_arithmetic)]

use rusqlite::{params, Connection, Error as SqlError, Result};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::calc::calculator::evaluate_formula_milliunits;
use crate::changeset::ChangeSetRecorder;
use crate::ledger::payee_autocat::update_payee_autofill_category;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct SubTransactionDto {
    pub id: Option<String>,
    pub payee_id: Option<String>,
    pub payee_name: Option<String>,
    pub category_id: Option<String>,
    pub category_name: Option<String>,
    pub amount_milliunits: i64,
    pub memo: Option<String>,
    pub transfer_account_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SaveTransactionPayload {
    pub id: Option<String>,
    pub budget_id: String,
    pub account_id: String,
    pub payee_id: Option<String>,
    pub payee_name: Option<String>,
    pub category_id: Option<String>,
    pub date: String,
    pub amount_milliunits: i64,
    pub memo: Option<String>,
    pub cleared: Option<String>,
    pub approved: Option<bool>,
    pub flag: Option<String>,
    pub transfer_account_id: Option<String>,
    #[serde(default)]
    pub subtransactions: Vec<SubTransactionDto>,
    /// Must be true to mutate amount, account, or cleared status of an already-Reconciled transaction
    #[serde(default)]
    pub allow_reconciled_mutation: bool,
}

/// Helper to determine cash_amount and credit_amount based on account type
pub fn determine_cash_credit_amounts(account_type: &str, amount: i64) -> (i64, i64) {
    if account_type.eq_ignore_ascii_case("creditcard")
        || account_type.eq_ignore_ascii_case("lineofcredit")
        || account_type.eq_ignore_ascii_case("credit")
    {
        (0, amount)
    } else {
        (amount, 0)
    }
}

/// Pure integer port of `calculateBalanceAdjustmentDelta` from `EditAccountModal.tsx`
pub fn calculate_balance_adjustment_delta(
    current_balance_milliunits: i64,
    new_balance_input: &str,
) -> (i64, i64) {
    let parsed =
        evaluate_formula_milliunits(new_balance_input).unwrap_or(current_balance_milliunits);
    (parsed, parsed - current_balance_milliunits)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PayeeSelectionState {
    pub payee_name: String,
    pub transfer_account_id: Option<String>,
    pub sub_category_id: Option<String>,
    pub sub_category_name: String,
    pub is_split: bool,
}

/// Port of `applyPayeeSelection` from `RegisterGridEditRow.tsx`
pub fn apply_payee_selection(
    initial_sub_category_id: Option<&str>,
    initial_sub_category_name: &str,
    payee_name: &str,
    target_account_id: Option<&str>,
) -> PayeeSelectionState {
    if let Some(target_acc) = target_account_id.filter(|s| !s.is_empty()) {
        PayeeSelectionState {
            payee_name: payee_name.to_string(),
            transfer_account_id: Some(target_acc.to_string()),
            sub_category_id: Some("category-not-needed".to_string()),
            sub_category_name: "Category not needed".to_string(),
            is_split: false,
        }
    } else {
        let (cat_id, cat_name) = if initial_sub_category_id == Some("category-not-needed") {
            (None, String::new())
        } else {
            (
                initial_sub_category_id.map(|s| s.to_string()),
                initial_sub_category_name.to_string(),
            )
        };
        PayeeSelectionState {
            payee_name: payee_name.to_string(),
            transfer_account_id: None,
            sub_category_id: cat_id,
            sub_category_name: cat_name,
            is_split: false,
        }
    }
}

/// Creates or updates a transaction, its split subtransactions, and its transfer counterpart atomically.
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

    // Check Reconciled lock invariant (INVARIANTS.md line 33) when updating an existing transaction
    if let Some(existing_id) = &payload.id {
        if let Ok((existing_acc, existing_amt, existing_cleared, existing_tombstone)) = conn
            .query_row(
                "SELECT entities_account_id, amount, cleared, is_tombstone FROM be_transactions WHERE id = ?1",
                params![existing_id],
                |r| {
                    Ok((
                        r.get::<_, String>(0)?,
                        r.get::<_, i64>(1)?,
                        r.get::<_, String>(2)?,
                        r.get::<_, i32>(3)?,
                    ))
                },
            )
        {
            if existing_tombstone == 0
                && existing_cleared == "Reconciled"
                && !payload.allow_reconciled_mutation
                && (existing_amt != payload.amount_milliunits
                    || existing_acc != payload.account_id
                    || cleared != "Reconciled")
            {
                return Err(SqlError::ToSqlConversionFailure(Box::new(
                    std::io::Error::new(
                        std::io::ErrorKind::PermissionDenied,
                        "Reconciled (LOCKED) transaction cannot have amount, account, or cleared status mutated without explicit unlock",
                    ),
                )));
            }
        }
    }

    // Begin atomic SAVEPOINT
    conn.execute_batch("SAVEPOINT sp_save_transaction;")?;
    let res = save_transaction_inner(conn, payload, &tx_id, &cleared, approved);
    match res {
        Ok(id) => {
            conn.execute_batch("RELEASE SAVEPOINT sp_save_transaction;")?;
            Ok(id)
        }
        Err(e) => {
            let _ = conn.execute_batch(
                "ROLLBACK TO SAVEPOINT sp_save_transaction; RELEASE SAVEPOINT sp_save_transaction;",
            );
            Err(e)
        }
    }
}

fn query_tx_snapshot_json(conn: &Connection, id: &str) -> Option<String> {
    conn.query_row(
        r#"SELECT is_tombstone, amount, cash_amount, credit_amount, date,
                  entities_payee_id, entities_subcategory_id, memo, cleared, flag
           FROM be_transactions
           WHERE id = ?1"#,
        params![id],
        |r| {
            Ok(serde_json::json!({
                "is_tombstone": r.get::<_, i32>(0)?,
                "amount": r.get::<_, i64>(1)?,
                "cash_amount": r.get::<_, i64>(2)?,
                "credit_amount": r.get::<_, i64>(3)?,
                "date": r.get::<_, String>(4)?,
                "entities_payee_id": r.get::<_, Option<String>>(5)?,
                "entities_subcategory_id": r.get::<_, Option<String>>(6)?,
                "memo": r.get::<_, Option<String>>(7)?,
                "cleared": r.get::<_, String>(8)?,
                "flag": r.get::<_, Option<String>>(9)?,
            })
            .to_string())
        },
    )
    .ok()
}

fn save_transaction_inner(
    conn: &Connection,
    payload: &SaveTransactionPayload,
    tx_id: &str,
    cleared: &str,
    approved: bool,
) -> Result<String> {
    let mut recorder = ChangeSetRecorder::new(conn, &payload.budget_id, "Save Transaction");
    let before_source_json = query_tx_snapshot_json(conn, tx_id);

    // Check account on-budget flags and account types
    let (source_on_budget, source_acc_type): (i32, String) = conn.query_row(
        "SELECT on_budget, account_type FROM be_accounts WHERE id = ?1",
        params![payload.account_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;

    let (source_cash, source_credit) =
        determine_cash_credit_amounts(&source_acc_type, payload.amount_milliunits);

    // Resolve payee_id by name if payee_id is None and payee_name is provided
    let resolved_payee_id: Option<String> = if payload.payee_id.is_some() {
        payload.payee_id.clone()
    } else if let Some(pname) = payload
        .payee_name
        .as_ref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
    {
        if let Ok(existing_pid) = conn.query_row(
            "SELECT id FROM be_payees WHERE budget_id = ?1 AND name = ?2 AND is_tombstone = 0 LIMIT 1",
            params![payload.budget_id, pname],
            |r| r.get::<_, String>(0),
        ) {
            Some(existing_pid)
        } else {
            let new_pid = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO be_payees (id, budget_id, name, enabled) VALUES (?1, ?2, ?3, 1)",
                params![new_pid, payload.budget_id, pname],
            )?;
            Some(new_pid)
        }
    } else {
        None
    };

    // Handle Transfer Logic
    if let Some(target_acc_id) = &payload.transfer_account_id {
        let (target_on_budget, target_acc_type): (i32, String) = conn.query_row(
            "SELECT on_budget, account_type FROM be_accounts WHERE id = ?1",
            params![target_acc_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;

        let (target_cash, target_credit) =
            determine_cash_credit_amounts(&target_acc_type, -payload.amount_milliunits);

        let peer_tx_id: String = match &payload.id {
            Some(existing_id) => {
                let existing_peer: Option<String> = conn
                    .query_row(
                        "SELECT transfer_transaction_id FROM be_transactions WHERE id = ?1",
                        params![existing_id],
                        |r| r.get(0),
                    )
                    .ok()
                    .flatten();
                existing_peer.unwrap_or_else(|| Uuid::new_v4().to_string())
            }
            None => Uuid::new_v4().to_string(),
        };
        let before_peer_json = query_tx_snapshot_json(conn, &peer_tx_id);

        // Ensure transfer payees exist for both accounts
        let source_transfer_payee_id =
            ensure_transfer_payee(conn, &payload.budget_id, &payload.account_id)?;
        let target_transfer_payee_id =
            ensure_transfer_payee(conn, &payload.budget_id, target_acc_id)?;

        // Resolve category_id if passed as internal_name
        let resolved_transfer_cat_id: Option<String> = match payload.category_id.as_deref() {
            Some(cid) if cid.starts_with("Category/") => conn
                .query_row(
                    "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name = ?2 AND is_tombstone = 0 LIMIT 1",
                    params![payload.budget_id, cid],
                    |r| r.get(0),
                )
                .ok()
                .or_else(|| Some(cid.to_string())),
            other => other.map(|s| s.to_string()),
        };

        // Enforce Category Rules
        let (source_cat_id, target_cat_id) = if source_on_budget == 1 && target_on_budget == 1 {
            (None, None)
        } else if source_on_budget == 1 && target_on_budget == 0 {
            (resolved_transfer_cat_id, None)
        } else if source_on_budget == 0 && target_on_budget == 1 {
            (None, resolved_transfer_cat_id)
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

        // Upsert Peer Leg
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

        if let Some(after_source) = query_tx_snapshot_json(conn, tx_id) {
            recorder.record_change(
                "be_transactions",
                tx_id,
                if before_source_json.is_some() {
                    "update"
                } else {
                    "insert"
                },
                before_source_json.as_deref(),
                &after_source,
            );
        }
        if let Some(after_peer) = query_tx_snapshot_json(conn, &peer_tx_id) {
            recorder.record_change(
                "be_transactions",
                &peer_tx_id,
                if before_peer_json.is_some() {
                    "update"
                } else {
                    "insert"
                },
                before_peer_json.as_deref(),
                &after_peer,
            );
        }
        let _ = recorder.commit();

        update_account_balances(conn, &payload.account_id)?;
        update_account_balances(conn, target_acc_id)?;
    } else {
        // Query if existing transaction was a transfer before updating
        let existing_peer: Option<(String, String)> = conn
            .query_row(
                "SELECT transfer_account_id, transfer_transaction_id FROM be_transactions WHERE id = ?1 AND transfer_transaction_id IS NOT NULL",
                params![tx_id],
                |r| Ok((r.get::<_, Option<String>>(0)?, r.get::<_, Option<String>>(1)?)),
            )
            .ok()
            .and_then(|(acc, peer)| match (acc, peer) {
                (Some(a), Some(p)) => Some((a, p)),
                _ => None,
            });

        // Resolve category_id if passed as internal_name (e.g. Category/__ImmediateIncome__)
        let resolved_cat_id: Option<String> = match payload.category_id.as_deref() {
            Some(cid) if cid.starts_with("Category/") => conn
                .query_row(
                    "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name = ?2 AND is_tombstone = 0 LIMIT 1",
                    params![payload.budget_id, cid],
                    |r| r.get(0),
                )
                .ok()
                .or_else(|| Some(cid.to_string())),
            other => other.map(|s| s.to_string()),
        };

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
                resolved_payee_id,
                resolved_cat_id,
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

        if let Some(after_source) = query_tx_snapshot_json(conn, tx_id) {
            recorder.record_change(
                "be_transactions",
                tx_id,
                if before_source_json.is_some() {
                    "update"
                } else {
                    "insert"
                },
                before_source_json.as_deref(),
                &after_source,
            );
        }

        // Soft-delete previous subtransactions if updating
        conn.execute(
            "UPDATE be_subtransactions SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE entities_transaction_id = ?1",
            params![tx_id],
        )?;

        // Persist Split Subtransactions if provided
        for (idx, sub) in payload.subtransactions.iter().enumerate() {
            let sub_id = sub.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());
            let (sub_cash, sub_credit) =
                determine_cash_credit_amounts(&source_acc_type, sub.amount_milliunits);
            let resolved_sub_cat_id: Option<String> = match sub.category_id.as_deref() {
                Some(scid) if scid.starts_with("Category/") => conn
                    .query_row(
                        "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name = ?2 AND is_tombstone = 0 LIMIT 1",
                        params![payload.budget_id, scid],
                        |r| r.get(0),
                    )
                    .ok()
                    .or_else(|| Some(scid.to_string())),
                other => other.map(|s| s.to_string()),
            };
            conn.execute(
                r#"INSERT INTO be_subtransactions (
                       id, budget_id, entities_transaction_id, entities_payee_id,
                       entities_subcategory_id, is_tombstone, amount, cash_amount,
                       credit_amount, memo, transfer_account_id, sortable_index
                   ) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?8, ?9, ?10, ?11)
                   ON CONFLICT(id) DO UPDATE SET
                       entities_payee_id = ?4,
                       entities_subcategory_id = ?5,
                       is_tombstone = 0,
                       amount = ?6,
                       cash_amount = ?7,
                       credit_amount = ?8,
                       memo = ?9,
                       transfer_account_id = ?10,
                       sortable_index = ?11,
                       updated_at = CURRENT_TIMESTAMP"#,
                params![
                    sub_id,
                    payload.budget_id,
                    tx_id,
                    sub.payee_id,
                    resolved_sub_cat_id,
                    sub.amount_milliunits,
                    sub_cash,
                    sub_credit,
                    sub.memo,
                    sub.transfer_account_id,
                    (idx as i32 + 1) * 100,
                ],
            )?;
        }

        // If this transaction was unlinked from a transfer, soft-delete the counterpart transaction
        if let Some((counterpart_acc_id, counterpart_tx_id)) = existing_peer {
            conn.execute(
                "UPDATE be_transactions SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
                params![counterpart_tx_id],
            )?;
            recorder.record_change(
                "be_transactions",
                &counterpart_tx_id,
                "update",
                Some(r#"{"is_tombstone":0}"#),
                r#"{"is_tombstone":1}"#,
            );
            update_account_balances(conn, &counterpart_acc_id)?;
        }

        let _ = recorder.commit();

        // Trigger Payee 2-of-3 auto-categorization if a payee and category were saved
        if let (Some(pid), Some(_cid)) = (&resolved_payee_id, &payload.category_id) {
            let _ = update_payee_autofill_category(conn, pid);
        }

        update_account_balances(conn, &payload.account_id)?;
    }

    Ok(tx_id.to_string())
}

fn ensure_transfer_payee(conn: &Connection, budget_id: &str, account_id: &str) -> Result<String> {
    if let Ok(pid) = conn.query_row(
        "SELECT id FROM be_payees WHERE entities_account_id = ?1",
        params![account_id],
        |r| r.get::<_, String>(0),
    ) {
        return Ok(pid);
    }

    let acc_name: String = conn
        .query_row(
            "SELECT account_name FROM be_accounts WHERE id = ?1",
            params![account_id],
            |r| r.get(0),
        )
        .unwrap_or_else(|_| "Account".to_string());

    let pid = format!("payee/transfer/{}", account_id);
    let pname = format!("Transfer : {}", acc_name);
    conn.execute(
        "INSERT OR IGNORE INTO be_payees (id, budget_id, entities_account_id, name) VALUES (?1, ?2, ?3, ?4)",
        params![pid, budget_id, account_id, pname],
    )?;
    Ok(pid)
}

/// Recalculates and caches direct cleared and uncleared balances on be_accounts
pub fn update_account_balances(conn: &Connection, account_id: &str) -> Result<()> {
    let cleared_balance: i64 = conn
        .query_row(
            r#"SELECT COALESCE(SUM(amount), 0)
               FROM be_transactions
               WHERE entities_account_id = ?1 AND is_tombstone = 0 AND cleared IN ('Cleared', 'Reconciled')"#,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_balance_adjustment_delta() {
        assert_eq!(
            calculate_balance_adjustment_delta(1_000_000, "1500.00"),
            (1_500_000, 500_000)
        );
        assert_eq!(
            calculate_balance_adjustment_delta(1_000_000, "1,250.00"),
            (1_250_000, 250_000)
        );
        assert_eq!(
            calculate_balance_adjustment_delta(1_000_000, "$1,500.50"),
            (1_500_500, 500_500)
        );
        assert_eq!(
            calculate_balance_adjustment_delta(1_000_000, "750.50"),
            (750_500, -249_500)
        );
        assert_eq!(
            calculate_balance_adjustment_delta(1_000_000, "1000.00"),
            (1_000_000, 0)
        );
        assert_eq!(
            calculate_balance_adjustment_delta(0, "-250.00"),
            (-250_000, -250_000)
        );
    }

    #[test]
    fn test_apply_payee_selection() {
        let updated = apply_payee_selection(
            Some("cat-groceries"),
            "Groceries",
            "Transfer : Savings Account",
            Some("acc-savings-01"),
        );
        assert_eq!(updated.payee_name, "Transfer : Savings Account");
        assert_eq!(
            updated.transfer_account_id.as_deref(),
            Some("acc-savings-01")
        );
        assert_eq!(
            updated.sub_category_id.as_deref(),
            Some("category-not-needed")
        );
        assert_eq!(updated.sub_category_name, "Category not needed");
        assert!(!updated.is_split);

        let cleared = apply_payee_selection(
            Some("category-not-needed"),
            "Category not needed",
            "Whole Foods",
            None,
        );
        assert_eq!(cleared.payee_name, "Whole Foods");
        assert!(cleared.transfer_account_id.is_none());
        assert!(cleared.sub_category_id.is_none());
    }
}
