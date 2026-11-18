//! Unit-of-Work and ChangeSet Recorder matching YNAB v26.160.1 `ChangeSetManager`
//! (`wrapper.beautified.js:48767–49310`).
//!
//! Provides ACID undo/redo across budget allocations, categories, accounts, and transactions.

use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeEntry {
    pub entity_table: String,
    pub entity_id: String,
    pub op: String, // "insert" or "update"
    pub before_json: Option<String>,
    pub after_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UndoRedoState {
    pub can_undo: bool,
    pub can_redo: bool,
    pub undo_label: Option<String>,
    pub redo_label: Option<String>,
}

pub struct ChangeSetRecorder<'a> {
    pub conn: &'a Connection,
    pub budget_id: String,
    pub label: String,
    pub entries: Vec<ChangeEntry>,
    pub earliest_affected_month: Option<String>,
}

impl<'a> ChangeSetRecorder<'a> {
    pub fn new(conn: &'a Connection, budget_id: &str, label: &str) -> Self {
        Self {
            conn,
            budget_id: budget_id.to_string(),
            label: label.to_string(),
            entries: Vec::new(),
            earliest_affected_month: None,
        }
    }

    pub fn record_change(
        &mut self,
        table: &str,
        id: &str,
        op: &str,
        before: Option<&str>,
        after: &str,
    ) {
        let normalized_op = if op == "create" || op == "insert" {
            "insert"
        } else {
            "update"
        };
        self.entries.push(ChangeEntry {
            entity_table: table.to_string(),
            entity_id: id.to_string(),
            op: normalized_op.to_string(),
            before_json: before.map(|s| s.to_string()),
            after_json: after.to_string(),
        });
    }

    /// Commit this changeset to the changesets table, clearing any redo history.
    pub fn commit(self) -> Result<i64> {
        if self.entries.is_empty() {
            return Ok(0);
        }

        // 1. Clear Redo stack when a new forward action is taken
        self.conn.execute(
            "DELETE FROM changesets WHERE budget_id = ?1 AND stack = 'redo'",
            params![self.budget_id],
        )?;

        // 2. Insert into changesets
        self.conn.execute(
            r#"INSERT INTO changesets (budget_id, stack, label, earliest_affected_month)
               VALUES (?1, 'undo', ?2, ?3)"#,
            params![self.budget_id, self.label, self.earliest_affected_month],
        )?;
        let changeset_id = self.conn.last_insert_rowid();

        // 3. Insert entries
        for (seq, entry) in self.entries.iter().enumerate() {
            self.conn.execute(
                r#"INSERT INTO changeset_entries (changeset_id, seq, entity_table, entity_id, op, before_json, after_json)
                   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"#,
                params![
                    changeset_id,
                    seq as i64,
                    entry.entity_table,
                    entry.entity_id,
                    entry.op,
                    entry.before_json,
                    entry.after_json,
                ],
            )?;
        }

        Ok(changeset_id)
    }
}

pub fn get_undo_redo_state(conn: &Connection, budget_id: &str) -> Result<UndoRedoState> {
    let undo_label: Option<String> = conn
        .query_row(
            "SELECT label FROM changesets WHERE budget_id = ?1 AND stack = 'undo' ORDER BY id DESC LIMIT 1",
            params![budget_id],
            |r| r.get(0),
        )
        .ok();

    let redo_label: Option<String> = conn
        .query_row(
            "SELECT label FROM changesets WHERE budget_id = ?1 AND stack = 'redo' ORDER BY id DESC LIMIT 1",
            params![budget_id],
            |r| r.get(0),
        )
        .ok();

    Ok(UndoRedoState {
        can_undo: undo_label.is_some(),
        can_redo: redo_label.is_some(),
        undo_label,
        redo_label,
    })
}

fn apply_state_snapshot(
    conn: &Connection,
    table: &str,
    entity_id: &str,
    json_str: Option<&str>,
    is_undo_of_insert: bool,
) -> Result<()> {
    if is_undo_of_insert {
        match table {
            "be_monthly_subcategory_budgets" => {
                conn.execute(
                    "UPDATE be_monthly_subcategory_budgets SET budgeted = 0, goal_snoozed_at = NULL WHERE id = ?1",
                    params![entity_id],
                )?;
            }
            "be_accounts"
            | "be_master_categories"
            | "be_subcategories"
            | "be_transactions"
            | "be_subtransactions"
            | "be_scheduled_transactions"
            | "be_scheduled_subtransactions"
            | "be_payees"
            | "be_payee_rename_conditions" => {
                let sql = format!(
                    "UPDATE {} SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
                    table
                );
                conn.execute(&sql, params![entity_id])?;
                if table == "be_transactions" {
                    if let Ok(acc_id) = conn.query_row(
                        "SELECT entities_account_id FROM be_transactions WHERE id = ?1",
                        params![entity_id],
                        |r| r.get::<_, String>(0),
                    ) {
                        let _ = crate::ledger::transfers::update_account_balances(conn, &acc_id);
                    }
                }
            }
            _ => {}
        }
        return Ok(());
    }

    let Some(raw) = json_str else {
        return Ok(());
    };

    // Parse either structured JSON or simple scalar string
    if let Ok(val) = serde_json::from_str::<Value>(raw) {
        if let Some(obj) = val.as_object() {
            match table {
                "be_monthly_subcategory_budgets" => {
                    if let Some(b) = obj.get("budgeted").and_then(|v| v.as_i64()) {
                        let snoozed = obj.get("goal_snoozed_at").and_then(|v| v.as_str());
                        conn.execute(
                            "UPDATE be_monthly_subcategory_budgets SET budgeted = ?1, goal_snoozed_at = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
                            params![b, snoozed, entity_id],
                        )?;
                    }
                }
                "be_subcategories" => {
                    if let Some(name) = obj.get("name").and_then(|v| v.as_str()) {
                        conn.execute(
                            "UPDATE be_subcategories SET name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![name, entity_id],
                        )?;
                    }
                    if let Some(hidden) = obj.get("is_hidden").and_then(|v| v.as_i64()) {
                        conn.execute(
                            "UPDATE be_subcategories SET is_hidden = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![hidden, entity_id],
                        )?;
                    }
                    if let Some(tombstone) = obj.get("is_tombstone").and_then(|v| v.as_i64()) {
                        conn.execute(
                            "UPDATE be_subcategories SET is_tombstone = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![tombstone, entity_id],
                        )?;
                    }
                    if obj.contains_key("goal_target_amount") {
                        let g_type = obj.get("goal_type").and_then(|v| v.as_str());
                        let g_amt = obj.get("goal_target_amount").and_then(|v| v.as_i64());
                        let g_created = obj.get("goal_created_on").and_then(|v| v.as_str());
                        let g_date = obj.get("goal_target_date").and_then(|v| v.as_str());
                        let g_cadence = obj.get("goal_cadence").and_then(|v| v.as_i64());
                        let g_freq = obj.get("goal_cadence_frequency").and_then(|v| v.as_i64());
                        let g_day = obj.get("goal_day").and_then(|v| v.as_i64());
                        let g_whole = obj.get("goal_needs_whole_amount").and_then(|v| v.as_i64());
                        conn.execute(
                            r#"UPDATE be_subcategories
                               SET goal_type = ?1,
                                   goal_target_amount = ?2,
                                   goal_created_on = ?3,
                                   goal_target_date = ?4,
                                   goal_cadence = ?5,
                                   goal_cadence_frequency = ?6,
                                   goal_day = ?7,
                                   goal_needs_whole_amount = ?8,
                                   updated_at = CURRENT_TIMESTAMP
                               WHERE id = ?9"#,
                            params![
                                g_type, g_amt, g_created, g_date, g_cadence, g_freq, g_day,
                                g_whole, entity_id
                            ],
                        )?;
                    }
                }
                "be_master_categories" => {
                    if let Some(name) = obj.get("name").and_then(|v| v.as_str()) {
                        conn.execute(
                            "UPDATE be_master_categories SET name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![name, entity_id],
                        )?;
                    }
                    if let Some(hidden) = obj.get("is_hidden").and_then(|v| v.as_i64()) {
                        conn.execute(
                            "UPDATE be_master_categories SET is_hidden = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![hidden, entity_id],
                        )?;
                    }
                    if let Some(tombstone) = obj.get("is_tombstone").and_then(|v| v.as_i64()) {
                        conn.execute(
                            "UPDATE be_master_categories SET is_tombstone = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![tombstone, entity_id],
                        )?;
                    }
                }
                "be_payees" => {
                    if let Some(tomb) = obj.get("is_tombstone").and_then(|v| v.as_i64()) {
                        conn.execute(
                            "UPDATE be_payees SET is_tombstone = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![tomb, entity_id],
                        )?;
                    }
                    if let Some(name) = obj.get("name").and_then(|v| v.as_str()) {
                        conn.execute(
                            "UPDATE be_payees SET name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![name, entity_id],
                        )?;
                    }
                }
                "be_payee_rename_conditions" => {
                    if let Some(tomb) = obj.get("is_tombstone").and_then(|v| v.as_i64()) {
                        conn.execute(
                            "UPDATE be_payee_rename_conditions SET is_tombstone = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![tomb, entity_id],
                        )?;
                    }
                    if let Some(pid) = obj.get("entities_payee_id").and_then(|v| v.as_str()) {
                        conn.execute(
                            "UPDATE be_payee_rename_conditions SET entities_payee_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![pid, entity_id],
                        )?;
                    }
                }
                "be_subtransactions" => {
                    if let Some(tomb) = obj.get("is_tombstone").and_then(|v| v.as_i64()) {
                        conn.execute(
                            "UPDATE be_subtransactions SET is_tombstone = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![tomb, entity_id],
                        )?;
                    }
                    if obj.contains_key("entities_payee_id") {
                        let pid = obj.get("entities_payee_id").and_then(|v| v.as_str());
                        conn.execute(
                            "UPDATE be_subtransactions SET entities_payee_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![pid, entity_id],
                        )?;
                    }
                }
                "be_scheduled_transactions" => {
                    if let Some(tomb) = obj.get("is_tombstone").and_then(|v| v.as_i64()) {
                        conn.execute(
                            "UPDATE be_scheduled_transactions SET is_tombstone = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![tomb, entity_id],
                        )?;
                    }
                    if obj.contains_key("entities_payee_id") {
                        let pid = obj.get("entities_payee_id").and_then(|v| v.as_str());
                        conn.execute(
                            "UPDATE be_scheduled_transactions SET entities_payee_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![pid, entity_id],
                        )?;
                    }
                }
                "be_scheduled_subtransactions" => {
                    if let Some(tomb) = obj.get("is_tombstone").and_then(|v| v.as_i64()) {
                        conn.execute(
                            "UPDATE be_scheduled_subtransactions SET is_tombstone = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![tomb, entity_id],
                        )?;
                    }
                    if obj.contains_key("entities_payee_id") {
                        let pid = obj.get("entities_payee_id").and_then(|v| v.as_str());
                        conn.execute(
                            "UPDATE be_scheduled_subtransactions SET entities_payee_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![pid, entity_id],
                        )?;
                    }
                }
                "be_transactions" => {
                    if let Some(tomb) = obj.get("is_tombstone").and_then(|v| v.as_i64()) {
                        conn.execute(
                            "UPDATE be_transactions SET is_tombstone = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![tomb, entity_id],
                        )?;
                    }
                    if let Some(amt) = obj.get("amount").and_then(|v| v.as_i64()) {
                        conn.execute(
                            "UPDATE be_transactions SET amount = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![amt, entity_id],
                        )?;
                    }
                    if let Some(cash) = obj.get("cash_amount").and_then(|v| v.as_i64()) {
                        conn.execute(
                            "UPDATE be_transactions SET cash_amount = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![cash, entity_id],
                        )?;
                    }
                    if let Some(credit) = obj.get("credit_amount").and_then(|v| v.as_i64()) {
                        conn.execute(
                            "UPDATE be_transactions SET credit_amount = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![credit, entity_id],
                        )?;
                    }
                    if let Some(date) = obj.get("date").and_then(|v| v.as_str()) {
                        conn.execute(
                            "UPDATE be_transactions SET date = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![date, entity_id],
                        )?;
                    }
                    if obj.contains_key("entities_payee_id") {
                        let pid = obj.get("entities_payee_id").and_then(|v| v.as_str());
                        conn.execute(
                            "UPDATE be_transactions SET entities_payee_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![pid, entity_id],
                        )?;
                    }
                    if obj.contains_key("entities_subcategory_id") {
                        let cid = obj.get("entities_subcategory_id").and_then(|v| v.as_str());
                        conn.execute(
                            "UPDATE be_transactions SET entities_subcategory_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![cid, entity_id],
                        )?;
                    }
                    if obj.contains_key("memo") {
                        let memo = obj.get("memo").and_then(|v| v.as_str());
                        conn.execute(
                            "UPDATE be_transactions SET memo = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![memo, entity_id],
                        )?;
                    }
                    if obj.contains_key("flag") {
                        let flag = obj.get("flag").and_then(|v| v.as_str());
                        conn.execute(
                            "UPDATE be_transactions SET flag = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![flag, entity_id],
                        )?;
                    }
                    if let Some(cleared) = obj.get("cleared").and_then(|v| v.as_str()) {
                        conn.execute(
                            "UPDATE be_transactions SET cleared = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![cleared, entity_id],
                        )?;
                    }
                    if let Some(accepted) = obj.get("accepted").and_then(|v| v.as_i64()) {
                        conn.execute(
                            "UPDATE be_transactions SET accepted = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![accepted, entity_id],
                        )?;
                    }
                    if obj.contains_key("matched_transaction_id") {
                        let val = obj.get("matched_transaction_id").and_then(|v| v.as_str());
                        conn.execute(
                            "UPDATE be_transactions SET matched_transaction_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![val, entity_id],
                        )?;
                    }
                    if obj.contains_key("source") {
                        let val = obj.get("source").and_then(|v| v.as_str());
                        conn.execute(
                            "UPDATE be_transactions SET source = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![val, entity_id],
                        )?;
                    }
                    if obj.contains_key("import_id") {
                        let val = obj.get("import_id").and_then(|v| v.as_str());
                        conn.execute(
                            "UPDATE be_transactions SET import_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![val, entity_id],
                        )?;
                    }
                    if obj.contains_key("ynab_id") {
                        let val = obj.get("ynab_id").and_then(|v| v.as_str());
                        conn.execute(
                            "UPDATE be_transactions SET ynab_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![val, entity_id],
                        )?;
                    }
                    if obj.contains_key("imported_payee") {
                        let val = obj.get("imported_payee").and_then(|v| v.as_str());
                        conn.execute(
                            "UPDATE be_transactions SET imported_payee = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![val, entity_id],
                        )?;
                    }
                    if obj.contains_key("original_imported_payee") {
                        let val = obj.get("original_imported_payee").and_then(|v| v.as_str());
                        conn.execute(
                            "UPDATE be_transactions SET original_imported_payee = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![val, entity_id],
                        )?;
                    }
                    if obj.contains_key("imported_date") {
                        let val = obj.get("imported_date").and_then(|v| v.as_str());
                        conn.execute(
                            "UPDATE be_transactions SET imported_date = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![val, entity_id],
                        )?;
                    }
                    if let Ok(acc_id) = conn.query_row(
                        "SELECT entities_account_id FROM be_transactions WHERE id = ?1",
                        params![entity_id],
                        |r| r.get::<_, String>(0),
                    ) {
                        let _ = crate::ledger::transfers::update_account_balances(conn, &acc_id);
                    }
                }
                "be_accounts" => {
                    if let Some(tomb) = obj.get("is_tombstone").and_then(|v| v.as_i64()) {
                        conn.execute(
                            "UPDATE be_accounts SET is_tombstone = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![tomb, entity_id],
                        )?;
                    }
                    if let Some(name) = obj.get("account_name").and_then(|v| v.as_str()) {
                        conn.execute(
                            "UPDATE be_accounts SET account_name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                            params![name, entity_id],
                        )?;
                    }
                }
                _ => {}
            }
            return Ok(());
        }
    }

    // Fallback scalar handling (e.g., plain integer string for be_monthly_subcategory_budgets)
    if table == "be_monthly_subcategory_budgets" {
        if let Ok(budgeted_val) = raw.parse::<i64>() {
            conn.execute(
                "UPDATE be_monthly_subcategory_budgets SET budgeted = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                params![budgeted_val, entity_id],
            )?;
        }
    }
    Ok(())
}

/// Undo the most recent changeset on the `undo` stack and move it to the `redo` stack.
pub fn undo_last_changeset(conn: &mut Connection, budget_id: &str) -> Result<bool> {
    let sp = conn.savepoint()?;
    let cs_id: Option<i64> = sp
        .query_row(
            "SELECT id FROM changesets WHERE budget_id = ?1 AND stack = 'undo' ORDER BY id DESC LIMIT 1",
            params![budget_id],
            |r| r.get(0),
        )
        .ok();

    let Some(changeset_id) = cs_id else {
        return Ok(false);
    };

    let entries: Vec<ChangeEntry> = {
        let mut stmt = sp.prepare(
            r#"SELECT entity_table, entity_id, op, before_json, after_json
               FROM changeset_entries
               WHERE changeset_id = ?1
               ORDER BY seq DESC"#,
        )?;
        let rows = stmt.query_map(params![changeset_id], |r| {
            Ok(ChangeEntry {
                entity_table: r.get(0)?,
                entity_id: r.get(1)?,
                op: r.get(2)?,
                before_json: r.get(3)?,
                after_json: r.get(4)?,
            })
        })?;
        rows.filter_map(Result::ok).collect()
    };

    for entry in &entries {
        let is_undo_insert = entry.op == "insert" && entry.before_json.is_none();
        apply_state_snapshot(
            &sp,
            &entry.entity_table,
            &entry.entity_id,
            entry.before_json.as_deref(),
            is_undo_insert,
        )?;
    }

    sp.execute(
        "UPDATE changesets SET stack = 'redo' WHERE id = ?1",
        params![changeset_id],
    )?;

    sp.commit()?;
    Ok(true)
}

/// Redo the most recent changeset on the `redo` stack and move it back to the `undo` stack.
pub fn redo_last_changeset(conn: &mut Connection, budget_id: &str) -> Result<bool> {
    let sp = conn.savepoint()?;
    let cs_id: Option<i64> = sp
        .query_row(
            "SELECT id FROM changesets WHERE budget_id = ?1 AND stack = 'redo' ORDER BY id DESC LIMIT 1",
            params![budget_id],
            |r| r.get(0),
        )
        .ok();

    let Some(changeset_id) = cs_id else {
        return Ok(false);
    };

    let entries: Vec<ChangeEntry> = {
        let mut stmt = sp.prepare(
            r#"SELECT entity_table, entity_id, op, before_json, after_json
               FROM changeset_entries
               WHERE changeset_id = ?1
               ORDER BY seq ASC"#,
        )?;
        let rows = stmt.query_map(params![changeset_id], |r| {
            Ok(ChangeEntry {
                entity_table: r.get(0)?,
                entity_id: r.get(1)?,
                op: r.get(2)?,
                before_json: r.get(3)?,
                after_json: r.get(4)?,
            })
        })?;
        rows.filter_map(Result::ok).collect()
    };

    for entry in &entries {
        apply_state_snapshot(
            &sp,
            &entry.entity_table,
            &entry.entity_id,
            Some(&entry.after_json),
            false,
        )?;
    }

    sp.execute(
        "UPDATE changesets SET stack = 'undo' WHERE id = ?1",
        params![changeset_id],
    )?;

    sp.commit()?;
    Ok(true)
}
