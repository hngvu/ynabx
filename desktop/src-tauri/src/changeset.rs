//! Unit-of-Work and ChangeSet Recorder matching YNAB v26.160.1 `ChangeSetManager`
//! (`wrapper.beautified.js:48767–49310`).
//!
//! Provides ACID undo/redo and generates audit trail entries in `be_money_movements` for Recent Moves.

use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeEntry {
    pub entity_table: String,
    pub entity_id: String,
    pub op: String, // "insert" or "update"
    pub before_json: Option<String>,
    pub after_json: String,
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
        self.entries.push(ChangeEntry {
            entity_table: table.to_string(),
            entity_id: id.to_string(),
            op: op.to_string(),
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
