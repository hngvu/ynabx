//! Account Reconciliation and Balance Adjustments matching YNAB v26.160.1
//! (`wrapper.beautified.js:57433–57612`).

use rusqlite::{params, Connection, Result};
use uuid::Uuid;

use crate::ledger::transfers::update_account_balances;
use crate::seed::{CAT_IMMEDIATE_INCOME, PAYEE_RECONCILIATION_ADJUSTMENT};

#[derive(Debug, Clone)]
pub struct ReconcileAccountResult {
    pub account_id: String,
    pub target_balance_milliunits: i64,
    pub adjustment_amount_milliunits: i64,
    pub reconciled_tx_count: usize,
}

/// Reconciles an account against the provided statement balance:
/// 1. Computes difference: target_balance - cleared_balance.
/// 2. If difference != 0 and create_adjustment is true, creates a "Reconciliation Balance Adjustment" transaction.
/// 3. Locks all Cleared transactions on the account to Reconciled.
/// 4. Updates last_reconciled_at on the account.
pub fn reconcile_account(
    conn: &Connection,
    budget_id: &str,
    account_id: &str,
    target_balance_milliunits: i64,
    create_adjustment: bool,
) -> Result<ReconcileAccountResult> {
    // Current cleared balance
    let (cleared_balance, on_budget): (i64, i32) = conn.query_row(
        r#"SELECT
               COALESCE(SUM(CASE WHEN cleared IN ('Cleared', 'Reconciled') THEN amount ELSE 0 END), 0),
               a.on_budget
           FROM be_accounts a
           LEFT JOIN be_transactions t ON a.id = t.entities_account_id AND t.is_tombstone = 0
           WHERE a.id = ?1
           GROUP BY a.id"#,
        params![account_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;

    let delta = target_balance_milliunits - cleared_balance;

    if delta != 0 && create_adjustment {
        let adj_payee_id: String = conn.query_row(
            "SELECT id FROM be_payees WHERE budget_id = ?1 AND internal_name = ?2",
            params![budget_id, PAYEE_RECONCILIATION_ADJUSTMENT],
            |r| r.get(0),
        )?;

        // If on-budget, categorize to Immediate Income Subcategory
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

        conn.execute(
            r#"INSERT INTO be_transactions (
                   id, budget_id, entities_account_id, entities_payee_id, entities_subcategory_id,
                   date, amount, memo, cleared, accepted
               ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'Reconciliation Balance Adjustment', 'Reconciled', 1)"#,
            params![
                adj_tx_id,
                budget_id,
                account_id,
                adj_payee_id,
                adj_cat_id,
                today,
                delta,
            ],
        )?;
    }

    // Lock all Cleared transactions to Reconciled
    let updated_count = conn.execute(
        r#"UPDATE be_transactions
           SET cleared = 'Reconciled', updated_at = CURRENT_TIMESTAMP
           WHERE entities_account_id = ?1 AND cleared = 'Cleared' AND is_tombstone = 0"#,
        params![account_id],
    )?;

    // Update account last_reconciled_at
    conn.execute(
        "UPDATE be_accounts SET last_reconciled_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![account_id],
    )?;

    // Refresh calculations
    update_account_balances(conn, account_id)?;

    Ok(ReconcileAccountResult {
        account_id: account_id.to_string(),
        target_balance_milliunits,
        adjustment_amount_milliunits: delta,
        reconciled_tx_count: updated_count,
    })
}
