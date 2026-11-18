//! Immutable Recent Moves (`be_money_movement_groups` & `be_money_movements`),
//! Combine Payees (`be_payees`, `be_payee_rename_conditions`, `be_transactions`, `be_scheduled_transactions`),
//! and Fabricated Scheduled Transfer Counterparts
//! matching YNAB SLIK (`wrapper.renamed.js:26089–26121`, `26589–26700`, `31942–31978`, `84848–84908`).
//!
//! 100% Pure Integer Milliunits (`#![deny(clippy::float_arithmetic)]`).

#![deny(clippy::float_arithmetic)]

use chrono::{Duration, NaiveDate, Utc};
use rusqlite::{params, Connection, OptionalExtension, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

use crate::changeset::ChangeSetRecorder;
use crate::import::{add_payee_rename_condition, RenameOperator};
use crate::ledger::scheduled::ScheduledTransactionDto;

/// Number of days tracked in YNAB's Recent Moves audit drawer (`Nd.RECENT_MOVES_DAYS_TO_TRACK = 34`).
pub const RECENT_MOVES_DAYS_TO_TRACK: i64 = 34;

/// Origin of a money movement (`fo` enum in `wrapper.renamed.js:13812`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum MoneyMovementSource {
    ManualMovement,
    ManualAssign,
    AutoAssignDueDate,
    AutoAssignUnderfunded,
    AutoAssignUpcoming,
    AutoAssignGoalTarget,
    AutoAssignAssignedLastMonth,
    AutoAssignSpentLastMonth,
    AutoAssignPaidLastMonth,
    AutoAssignAverageAssigned,
    AutoAssignAverageSpent,
    AutoAssignAveragePaid,
    AutoAssignSetToZero,
    AutoAssignRemoveSurplus,
    AutoAssignReset,
    CategoryDeletion,
    Custom(String),
}

impl MoneyMovementSource {
    pub fn as_str(&self) -> &str {
        match self {
            Self::ManualMovement => "manual_movement",
            Self::ManualAssign => "manual_assign",
            Self::AutoAssignDueDate => "auto_assign_due_date",
            Self::AutoAssignUnderfunded => "auto_assign_underfunded",
            Self::AutoAssignUpcoming => "auto_assign_upcoming",
            Self::AutoAssignGoalTarget => "auto_assign_goal_target",
            Self::AutoAssignAssignedLastMonth => "auto_assign_assigned_last_month",
            Self::AutoAssignSpentLastMonth => "auto_assign_spent_last_month",
            Self::AutoAssignPaidLastMonth => "auto_assign_paid_last_month",
            Self::AutoAssignAverageAssigned => "auto_assign_average_assigned",
            Self::AutoAssignAverageSpent => "auto_assign_average_spent",
            Self::AutoAssignAveragePaid => "auto_assign_average_paid",
            Self::AutoAssignSetToZero => "auto_assign_set_to_zero",
            Self::AutoAssignRemoveSurplus => "auto_assign_remove_surplus",
            Self::AutoAssignReset => "auto_assign_reset",
            Self::CategoryDeletion => "category_deletion",
            Self::Custom(s) => s.as_str(),
        }
    }

    pub fn from_str_loose(raw: &str) -> Self {
        match raw.trim() {
            "manual_movement" => Self::ManualMovement,
            "manual_assign" => Self::ManualAssign,
            "auto_assign_due_date" => Self::AutoAssignDueDate,
            "auto_assign_underfunded" => Self::AutoAssignUnderfunded,
            "auto_assign_upcoming" => Self::AutoAssignUpcoming,
            "auto_assign_goal_target" => Self::AutoAssignGoalTarget,
            "auto_assign_assigned_last_month" => Self::AutoAssignAssignedLastMonth,
            "auto_assign_spent_last_month" => Self::AutoAssignSpentLastMonth,
            "auto_assign_paid_last_month" => Self::AutoAssignPaidLastMonth,
            "auto_assign_average_assigned" => Self::AutoAssignAverageAssigned,
            "auto_assign_average_spent" => Self::AutoAssignAverageSpent,
            "auto_assign_average_paid" => Self::AutoAssignAveragePaid,
            "auto_assign_set_to_zero" => Self::AutoAssignSetToZero,
            "auto_assign_remove_surplus" => Self::AutoAssignRemoveSurplus,
            "auto_assign_reset" => Self::AutoAssignReset,
            "category_deletion" => Self::CategoryDeletion,
            other => Self::Custom(other.to_string()),
        }
    }
}

/// Filter tabs in YNAB's Recent Moves drawer (`mo` enum in `wrapper.renamed.js:13821`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RecentMoveFilter {
    All,
    Assigned,
    Moved,
}

/// Input payload to append an immutable money movement record.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RecordMoneyMovementPayload {
    pub budget_id: String,
    /// Month in `"YYYY-MM-01"` (or `"YYYY-MM"`) format.
    pub month: String,
    /// Source category ID (`None` = Ready to Assign).
    pub from_subcategory_id: Option<String>,
    /// Destination category ID (`None` = Ready to Assign).
    pub to_subcategory_id: Option<String>,
    /// Milliunit amount. If negative, `from` and `to` are swapped and amount stored positive (YNAB SLIK rule).
    pub amount_milliunits: i64,
    pub source: Option<MoneyMovementSource>,
    pub group_id: Option<String>,
    pub note: Option<String>,
    pub performed_by_user_id: Option<String>,
    /// Optional ISO-8601 timestamp override (defaults to current UTC timestamp).
    pub move_started_at: Option<String>,
}

/// Persisted immutable `be_money_movement_groups` header.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MoneyMovementGroup {
    pub id: String,
    pub budget_id: String,
    pub month: String,
    pub source: String,
    pub note: Option<String>,
    pub performed_by_user_id: Option<String>,
    pub group_created_at: String,
    pub deleted_subcategory_id: Option<String>,
}

/// Read model for an entry in the Recent Moves audit trail (`be_money_movements`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RecentMoveEntry {
    pub id: String,
    pub group_id: Option<String>,
    pub budget_id: String,
    pub month: String,
    pub from_subcategory_id: Option<String>,
    pub from_category_name: String,
    pub to_subcategory_id: Option<String>,
    pub to_category_name: String,
    pub amount_milliunits: i64,
    pub source: String,
    pub is_assignment: bool,
    pub note: Option<String>,
    pub performed_by_user_id: Option<String>,
    pub move_started_at: String,
    pub move_accepted_at: Option<String>,
}

fn normalize_month_key(raw: &str) -> String {
    let trimmed = raw.trim();
    let mut parts = trimmed.split('-');
    let y = parts.next().unwrap_or("2026");
    let m = parts.next().unwrap_or("01");
    format!("{:0>4}-{:0>2}-01", y, m)
}

fn resolve_mcb_id(
    conn: &Connection,
    budget_id: &str,
    month: &str,
    sub_id: &str,
) -> Result<String, String> {
    if let Some(existing) = conn
        .query_row(
            r#"SELECT id FROM be_monthly_subcategory_budgets
               WHERE budget_id = ?1 AND entities_subcategory_id = ?2 AND month = ?3 AND is_tombstone = 0
               LIMIT 1"#,
            params![budget_id, sub_id, month],
            |r| r.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
    {
        return Ok(existing);
    }
    Ok(format!("mcb/{}/{}", month, sub_id))
}

fn extract_subcategory_from_mcb_id(mcb_id: &str) -> Option<String> {
    if let Some(rest) = mcb_id.strip_prefix("mcb/") {
        let (_month, sub_id) = rest.split_once('/')?;
        if !sub_id.is_empty() {
            return Some(sub_id.to_string());
        }
    }
    None
}

fn extract_month_from_mcb_id(mcb_id: &str) -> Option<String> {
    if let Some(rest) = mcb_id.strip_prefix("mcb/") {
        let month = rest.split('/').next()?;
        if month.len() >= 7 {
            return Some(normalize_month_key(month));
        }
    }
    None
}

/// Creates a `be_money_movement_groups` header row for batching multiple movements (e.g. Auto-Assign, Category Deletion).
pub fn create_money_movement_group(
    conn: &Connection,
    budget_id: &str,
    month: &str,
    source: MoneyMovementSource,
    note: Option<&str>,
    performed_by_user_id: Option<&str>,
    deleted_subcategory_id: Option<&str>,
) -> Result<MoneyMovementGroup, String> {
    let id = Uuid::new_v4().to_string();
    let norm_month = normalize_month_key(month);
    let created_at = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    conn.execute(
        r#"INSERT INTO be_money_movement_groups (
               id, budget_id, is_tombstone, performed_by_user_id, source, note,
               month, group_created_at, deleted_entities_subcategory_id
           ) VALUES (?1, ?2, 0, ?3, ?4, ?5, ?6, ?7, ?8)"#,
        params![
            id,
            budget_id,
            performed_by_user_id,
            source.as_str(),
            note,
            norm_month,
            created_at,
            deleted_subcategory_id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(MoneyMovementGroup {
        id,
        budget_id: budget_id.to_string(),
        month: norm_month,
        source: source.as_str().to_string(),
        note: note.map(|s| s.to_string()),
        performed_by_user_id: performed_by_user_id.map(|s| s.to_string()),
        group_created_at: created_at,
        deleted_subcategory_id: deleted_subcategory_id.map(|s| s.to_string()),
    })
}

/// Appends an immutable money movement record into `be_money_movements` (creating a parent
/// `be_money_movement_groups` row if `payload.group_id` is `None`).
///
/// Mirrors YNAB SLIK's `moveMoneyBetweenCategories`:
/// - At least one of `from_subcategory_id` or `to_subcategory_id` must be `Some`
/// - `from` and `to` cannot be the same category
/// - Negative amounts swap `from`/`to` so stored amount is always positive
pub fn record_money_movement(
    conn: &Connection,
    payload: &RecordMoneyMovementPayload,
) -> Result<RecentMoveEntry, String> {
    if payload.amount_milliunits == 0 {
        return Err("Money movement amount cannot be zero".to_string());
    }

    let (mut from_sub, mut to_sub, mut amount) = (
        payload.from_subcategory_id.clone(),
        payload.to_subcategory_id.clone(),
        payload.amount_milliunits,
    );

    if amount < 0 {
        amount = -amount;
        std::mem::swap(&mut from_sub, &mut to_sub);
    }

    if from_sub.is_none() && to_sub.is_none() {
        return Err("Either from_subcategory_id or to_subcategory_id must be provided".to_string());
    }
    if from_sub == to_sub {
        return Err("Source and destination categories cannot be identical".to_string());
    }

    let norm_month = normalize_month_key(&payload.month);
    let is_assignment = from_sub.is_none() || to_sub.is_none();
    let effective_source = payload.source.clone().unwrap_or(if is_assignment {
        MoneyMovementSource::ManualAssign
    } else {
        MoneyMovementSource::ManualMovement
    });

    let group_id = match &payload.group_id {
        Some(gid) => gid.clone(),
        None => {
            create_money_movement_group(
                conn,
                &payload.budget_id,
                &norm_month,
                effective_source.clone(),
                payload.note.as_deref(),
                payload.performed_by_user_id.as_deref(),
                None,
            )?
            .id
        }
    };

    let from_mcb_id = match &from_sub {
        Some(sid) => Some(resolve_mcb_id(conn, &payload.budget_id, &norm_month, sid)?),
        None => None,
    };
    let to_mcb_id = match &to_sub {
        Some(sid) => Some(resolve_mcb_id(conn, &payload.budget_id, &norm_month, sid)?),
        None => None,
    };

    let move_started_at = payload
        .move_started_at
        .clone()
        .unwrap_or_else(|| Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string());

    let id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_money_movements (
               id, budget_id, entities_money_movement_group_id, is_tombstone,
               from_entities_monthly_subcategory_budget_id, to_entities_monthly_subcategory_budget_id,
               amount, performed_by_user_id, source, note, move_started_at, move_accepted_at
           ) VALUES (?1, ?2, ?3, 0, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)"#,
        params![
            id,
            payload.budget_id,
            group_id,
            from_mcb_id,
            to_mcb_id,
            amount,
            payload.performed_by_user_id,
            effective_source.as_str(),
            payload.note,
            move_started_at,
        ],
    )
    .map_err(|e| e.to_string())?;

    let lookup_name = |sid_opt: &Option<String>| -> String {
        match sid_opt {
            None => "Ready to Assign".to_string(),
            Some(sid) => conn
                .query_row(
                    "SELECT name FROM be_subcategories WHERE id = ?1",
                    params![sid],
                    |r| r.get::<_, String>(0),
                )
                .unwrap_or_else(|_| "Deleted Category".to_string()),
        }
    };

    Ok(RecentMoveEntry {
        id,
        group_id: Some(group_id),
        budget_id: payload.budget_id.clone(),
        month: norm_month,
        from_category_name: lookup_name(&from_sub),
        to_category_name: lookup_name(&to_sub),
        from_subcategory_id: from_sub,
        to_subcategory_id: to_sub,
        amount_milliunits: amount,
        source: effective_source.as_str().to_string(),
        is_assignment,
        note: payload.note.clone(),
        performed_by_user_id: payload.performed_by_user_id.clone(),
        move_started_at: move_started_at.clone(),
        move_accepted_at: Some(move_started_at),
    })
}

/// Updates ONLY the `note` field on an existing `be_money_movements` row (the sole mutable
/// field permitted on YNAB's `MoneyMovement` entity; `amount`, `from`, `to`, `source`,
/// `move_started_at`, `performed_by_user_id`, and `group_id` remain immutable).
pub fn update_money_movement_note(
    conn: &Connection,
    movement_id: &str,
    note: Option<&str>,
) -> Result<(), String> {
    let rows = conn
        .execute(
            "UPDATE be_money_movements SET note = ?1 WHERE id = ?2 AND is_tombstone = 0",
            params![note, movement_id],
        )
        .map_err(|e| e.to_string())?;
    if rows == 0 {
        return Err(format!("MoneyMovement '{}' not found", movement_id));
    }
    Ok(())
}

/// Lists Recent Moves within the trailing 34-day window (`RECENT_MOVES_DAYS_TO_TRACK = 34`),
/// filtered by `All | Assigned | Moved` and optional `subcategory_id`.
pub fn list_recent_moves(
    conn: &Connection,
    budget_id: &str,
    filter: RecentMoveFilter,
    subcategory_id: Option<&str>,
) -> Result<Vec<RecentMoveEntry>, String> {
    list_recent_moves_as_of(conn, budget_id, filter, subcategory_id, None)
}

/// Deterministic variant of `list_recent_moves` allowing an explicit `as_of_date` (`"YYYY-MM-DD"`).
pub fn list_recent_moves_as_of(
    conn: &Connection,
    budget_id: &str,
    filter: RecentMoveFilter,
    subcategory_id: Option<&str>,
    as_of_date: Option<&str>,
) -> Result<Vec<RecentMoveEntry>, String> {
    let as_of = match as_of_date {
        Some(raw) => NaiveDate::parse_from_str(raw.trim(), "%Y-%m-%d")
            .map_err(|_| format!("Invalid as_of_date '{}'", raw))?,
        None => Utc::now().date_naive(),
    };
    let cutoff = as_of - Duration::days(RECENT_MOVES_DAYS_TO_TRACK);

    let mut stmt = conn
        .prepare(
            r#"SELECT mm.id,
                      mm.entities_money_movement_group_id,
                      mm.budget_id,
                      COALESCE(mmg.month, ''),
                      mm.from_entities_monthly_subcategory_budget_id,
                      mcb_from.entities_subcategory_id,
                      c_from.name,
                      mm.to_entities_monthly_subcategory_budget_id,
                      mcb_to.entities_subcategory_id,
                      c_to.name,
                      mm.amount,
                      COALESCE(mm.source, ''),
                      mm.note,
                      mm.performed_by_user_id,
                      mm.move_started_at,
                      mm.move_accepted_at
               FROM be_money_movements mm
               LEFT JOIN be_money_movement_groups mmg
                      ON mm.entities_money_movement_group_id = mmg.id
               LEFT JOIN be_monthly_subcategory_budgets mcb_from
                      ON mm.from_entities_monthly_subcategory_budget_id = mcb_from.id
               LEFT JOIN be_subcategories c_from
                      ON mcb_from.entities_subcategory_id = c_from.id
               LEFT JOIN be_monthly_subcategory_budgets mcb_to
                      ON mm.to_entities_monthly_subcategory_budget_id = mcb_to.id
               LEFT JOIN be_subcategories c_to
                      ON mcb_to.entities_subcategory_id = c_to.id
               WHERE mm.budget_id = ?1 AND mm.is_tombstone = 0
               ORDER BY mm.move_started_at DESC, mm.rowid DESC"#,
        )
        .map_err(|e| e.to_string())?;

    // Fallback subcategory name lookup when `be_monthly_subcategory_budgets` row didn't exist yet
    let mut sub_names: HashMap<String, String> = HashMap::new();
    {
        let mut sub_stmt = conn
            .prepare("SELECT id, name FROM be_subcategories WHERE budget_id = ?1")
            .map_err(|e| e.to_string())?;
        let srows = sub_stmt
            .query_map(params![budget_id], |r| {
                Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?;
        for (sid, sname) in srows.flatten() {
            sub_names.insert(sid, sname);
        }
    }

    #[allow(clippy::type_complexity)]
    let raw_rows = stmt
        .query_map(params![budget_id], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, Option<String>>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, String>(3)?,
                r.get::<_, Option<String>>(4)?,
                r.get::<_, Option<String>>(5)?,
                r.get::<_, Option<String>>(6)?,
                r.get::<_, Option<String>>(7)?,
                r.get::<_, Option<String>>(8)?,
                r.get::<_, Option<String>>(9)?,
                r.get::<_, i64>(10)?,
                r.get::<_, String>(11)?,
                r.get::<_, Option<String>>(12)?,
                r.get::<_, Option<String>>(13)?,
                r.get::<_, String>(14)?,
                r.get::<_, Option<String>>(15)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in raw_rows.flatten() {
        let (
            id,
            group_id,
            b_id,
            group_month,
            from_mcb_id,
            from_sub_join,
            from_name_join,
            to_mcb_id,
            to_sub_join,
            to_name_join,
            amount,
            source,
            note,
            performed_by_user_id,
            move_started_at,
            move_accepted_at,
        ) = row;

        // Enforce 34-day recent window
        let date_prefix: String = move_started_at.chars().take(10).collect();
        if let Ok(move_date) = NaiveDate::parse_from_str(&date_prefix, "%Y-%m-%d") {
            if move_date < cutoff {
                continue;
            }
        }

        let from_sub_id = from_sub_join.or_else(|| {
            from_mcb_id
                .as_deref()
                .and_then(extract_subcategory_from_mcb_id)
        });
        let to_sub_id = to_sub_join.or_else(|| {
            to_mcb_id
                .as_deref()
                .and_then(extract_subcategory_from_mcb_id)
        });

        let is_assignment = from_sub_id.is_none() || to_sub_id.is_none();
        match filter {
            RecentMoveFilter::All => {}
            RecentMoveFilter::Assigned if !is_assignment => continue,
            RecentMoveFilter::Moved if is_assignment => continue,
            _ => {}
        }

        if let Some(target_sub) = subcategory_id {
            let matches_from = from_sub_id.as_deref() == Some(target_sub);
            let matches_to = to_sub_id.as_deref() == Some(target_sub);
            if !matches_from && !matches_to {
                continue;
            }
        }

        let from_category_name = match (&from_sub_id, from_name_join) {
            (None, _) => "Ready to Assign".to_string(),
            (Some(_), Some(n)) => n,
            (Some(sid), None) => sub_names
                .get(sid)
                .cloned()
                .unwrap_or_else(|| "Deleted Category".to_string()),
        };

        let to_category_name = match (&to_sub_id, to_name_join) {
            (None, _) => "Ready to Assign".to_string(),
            (Some(_), Some(n)) => n,
            (Some(sid), None) => sub_names
                .get(sid)
                .cloned()
                .unwrap_or_else(|| "Deleted Category".to_string()),
        };

        let month = if !group_month.is_empty() {
            group_month
        } else {
            from_mcb_id
                .as_deref()
                .and_then(extract_month_from_mcb_id)
                .or_else(|| to_mcb_id.as_deref().and_then(extract_month_from_mcb_id))
                .unwrap_or_else(|| {
                    format!("{}-01", date_prefix.chars().take(7).collect::<String>())
                })
        };

        results.push(RecentMoveEntry {
            id,
            group_id,
            budget_id: b_id,
            month,
            from_subcategory_id: from_sub_id,
            from_category_name,
            to_subcategory_id: to_sub_id,
            to_category_name,
            amount_milliunits: amount,
            source,
            is_assignment,
            note,
            performed_by_user_id,
            move_started_at,
            move_accepted_at,
        });
    }

    Ok(results)
}

// -----------------------------------------------------------------------------
// Combine Payees (`CombinePayeesUseCase`)
// -----------------------------------------------------------------------------

/// Summary of merging multiple payees into a single canonical payee.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CombinePayeesResult {
    pub target_payee_id: String,
    pub target_payee_name: String,
    pub merged_payee_ids: Vec<String>,
    pub updated_transactions_count: usize,
    pub updated_scheduled_transactions_count: usize,
    pub created_rename_conditions_count: usize,
}

/// Reassigns `entities_payee_id` from `src_payee_id` to `target_payee_id` across `table`
/// while recording each active row update in `ChangeSetRecorder`.
fn reassign_payee_refs_with_changeset(
    conn: &Connection,
    recorder: &mut ChangeSetRecorder<'_>,
    table: &str,
    budget_id: &str,
    src_payee_id: &str,
    target_payee_id: &str,
) -> Result<usize, String> {
    let select_sql = format!(
        "SELECT id FROM {} WHERE budget_id = ?1 AND entities_payee_id = ?2 AND is_tombstone = 0",
        table
    );
    let ids: Vec<String> = {
        let mut stmt = conn.prepare(&select_sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![budget_id, src_payee_id], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        rows.filter_map(SqlResult::ok).collect()
    };

    if ids.is_empty() {
        return Ok(0);
    }

    let before_json = serde_json::json!({ "entities_payee_id": src_payee_id }).to_string();
    let after_json = serde_json::json!({ "entities_payee_id": target_payee_id }).to_string();
    for id in &ids {
        recorder.record_change(table, id, "update", Some(&before_json), &after_json);
    }

    let update_sql = format!(
        "UPDATE {} SET entities_payee_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE budget_id = ?2 AND entities_payee_id = ?3 AND is_tombstone = 0",
        table
    );
    conn.execute(
        &update_sql,
        params![target_payee_id, budget_id, src_payee_id],
    )
    .map_err(|e| e.to_string())
}

/// Combines `source_payee_ids` into `target_payee_id_or_new_name` inside a SAVEPOINT + `ChangeSetRecorder`:
/// - Resolves `target_payee_id_or_new_name` as an existing payee ID, existing payee name, or creates a new payee
/// - Updates `be_transactions`, `be_subtransactions`, `be_scheduled_transactions`, and `be_scheduled_subtransactions`
/// - Reassigns existing `be_payee_rename_conditions` and creates `"Is"` auto-rename conditions for merged payee names
/// - Tombstones merged source payees (`is_tombstone = 1`)
pub fn combine_payees(
    conn: &mut Connection,
    budget_id: &str,
    source_payee_ids: &[String],
    target_payee_id_or_new_name: &str,
) -> Result<CombinePayeesResult, String> {
    if source_payee_ids.is_empty() {
        return Err("At least one source payee ID is required to combine payees".to_string());
    }
    let target_trimmed = target_payee_id_or_new_name.trim();
    if target_trimmed.is_empty() {
        return Err("Target payee ID or name cannot be empty".to_string());
    }

    // Deduplicate source IDs preserving order
    let mut unique_sources = Vec::new();
    let mut seen_src = HashSet::new();
    for sid in source_payee_ids {
        if seen_src.insert(sid.clone()) {
            unique_sources.push(sid.clone());
        }
    }

    // Verify all source payees exist and are regular user payees (not transfer or system payees)
    struct SourcePayeeInfo {
        id: String,
        name: String,
        auto_fill_cat: Option<String>,
        auto_fill_user_cat: Option<String>,
    }

    let mut source_infos = Vec::with_capacity(unique_sources.len());
    for sid in &unique_sources {
        let row: (
            String,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
        ) = conn
            .query_row(
                r#"SELECT name, entities_account_id, internal_name,
                          auto_fill_subcategory_id, auto_fill_user_defined_subcategory_id
                   FROM be_payees
                   WHERE id = ?1 AND budget_id = ?2 AND is_tombstone = 0"#,
                params![sid, budget_id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
            )
            .map_err(|e| format!("Source payee '{}' not found: {}", sid, e))?;

        if row.1.is_some() {
            return Err(format!("Cannot combine transfer payee '{}'", row.0));
        }
        if row.2.is_some() {
            return Err(format!("Cannot combine system payee '{}'", row.0));
        }

        source_infos.push(SourcePayeeInfo {
            id: sid.clone(),
            name: row.0,
            auto_fill_cat: row.3,
            auto_fill_user_cat: row.4,
        });
    }

    // Resolve target: match by existing ID, then by case-insensitive name, else create new payee
    let existing_by_id: Option<(String, String, Option<String>, Option<String>)> = conn
        .query_row(
            r#"SELECT id, name, entities_account_id, internal_name
               FROM be_payees
               WHERE id = ?1 AND budget_id = ?2 AND is_tombstone = 0"#,
            params![target_trimmed, budget_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let existing_by_name: Option<(String, String, Option<String>, Option<String>)> =
        if existing_by_id.is_none() {
            conn.query_row(
                r#"SELECT id, name, entities_account_id, internal_name
                   FROM be_payees
                   WHERE budget_id = ?1 AND lower(name) = lower(?2) AND is_tombstone = 0
                   LIMIT 1"#,
                params![budget_id, target_trimmed],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
            )
            .optional()
            .map_err(|e| e.to_string())?
        } else {
            None
        };

    let resolved_existing = existing_by_id.or(existing_by_name);
    if let Some((_, ref tname, ref acc_id, ref int_name)) = resolved_existing {
        if acc_id.is_some() || int_name.is_some() {
            return Err(format!(
                "Cannot combine payees into transfer or system payee '{}'",
                tname
            ));
        }
    }

    conn.execute_batch("SAVEPOINT sp_combine_payees;")
        .map_err(|e| e.to_string())?;

    let work = (|| -> Result<CombinePayeesResult, String> {
        let mut recorder = ChangeSetRecorder::new(conn, budget_id, "Combine Payees");

        let (target_id, target_name) = match resolved_existing {
            Some((tid, tname, _, _)) => (tid, tname),
            None => {
                let new_id = Uuid::new_v4().to_string();
                let inherited_auto = source_infos.iter().find_map(|s| s.auto_fill_cat.clone());
                let inherited_user = source_infos
                    .iter()
                    .find_map(|s| s.auto_fill_user_cat.clone());

                conn.execute(
                    r#"INSERT INTO be_payees (
                           id, budget_id, name, enabled,
                           auto_fill_subcategory_id, auto_fill_user_defined_subcategory_id
                       ) VALUES (?1, ?2, ?3, 1, ?4, ?5)"#,
                    params![
                        new_id,
                        budget_id,
                        target_trimmed,
                        inherited_auto,
                        inherited_user
                    ],
                )
                .map_err(|e| e.to_string())?;

                recorder.record_change(
                    "be_payees",
                    &new_id,
                    "insert",
                    None,
                    &serde_json::json!({ "name": target_trimmed, "is_tombstone": 0 }).to_string(),
                );
                (new_id, target_trimmed.to_string())
            }
        };

        let mut merged_payee_ids = Vec::new();
        let mut updated_tx_count = 0usize;
        let mut updated_sched_count = 0usize;
        let mut created_rc_count = 0usize;

        for src in &source_infos {
            if src.id == target_id {
                continue;
            }

            updated_tx_count += reassign_payee_refs_with_changeset(
                conn,
                &mut recorder,
                "be_transactions",
                budget_id,
                &src.id,
                &target_id,
            )?;

            reassign_payee_refs_with_changeset(
                conn,
                &mut recorder,
                "be_subtransactions",
                budget_id,
                &src.id,
                &target_id,
            )?;

            updated_sched_count += reassign_payee_refs_with_changeset(
                conn,
                &mut recorder,
                "be_scheduled_transactions",
                budget_id,
                &src.id,
                &target_id,
            )?;

            reassign_payee_refs_with_changeset(
                conn,
                &mut recorder,
                "be_scheduled_subtransactions",
                budget_id,
                &src.id,
                &target_id,
            )?;

            // Reassign existing rename conditions from source payee to target payee
            reassign_payee_refs_with_changeset(
                conn,
                &mut recorder,
                "be_payee_rename_conditions",
                budget_id,
                &src.id,
                &target_id,
            )?;

            // Add an exact ("Is") auto-rename rule for the merged payee's name so future imports map to target
            if !src.name.trim().is_empty() && !src.name.eq_ignore_ascii_case(&target_name) {
                let before_exists: bool = conn
                    .query_row(
                        r#"SELECT 1 FROM be_payee_rename_conditions
                           WHERE budget_id = ?1 AND entities_payee_id = ?2
                             AND lower(operator) = 'is' AND lower(operand) = lower(?3)
                             AND is_tombstone = 0
                           LIMIT 1"#,
                        params![budget_id, target_id, src.name.trim()],
                        |_| Ok(true),
                    )
                    .unwrap_or(false);

                let rc_id = add_payee_rename_condition(
                    conn,
                    budget_id,
                    &target_id,
                    RenameOperator::Is,
                    &src.name,
                )
                .map_err(|e| e.to_string())?;

                if !before_exists {
                    created_rc_count += 1;
                    recorder.record_change(
                        "be_payee_rename_conditions",
                        &rc_id,
                        "insert",
                        None,
                        &serde_json::json!({
                            "entities_payee_id": target_id,
                            "operator": "Is",
                            "operand": src.name.trim(),
                            "is_tombstone": 0,
                        })
                        .to_string(),
                    );
                }
            }

            // Tombstone the merged source payee
            conn.execute(
                "UPDATE be_payees SET is_tombstone = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
                params![src.id],
            )
            .map_err(|e| e.to_string())?;

            recorder.record_change(
                "be_payees",
                &src.id,
                "update",
                Some(&serde_json::json!({ "name": src.name, "is_tombstone": 0 }).to_string()),
                &serde_json::json!({ "name": src.name, "is_tombstone": 1 }).to_string(),
            );
            merged_payee_ids.push(src.id.clone());
        }

        recorder.commit().map_err(|e| e.to_string())?;

        Ok(CombinePayeesResult {
            target_payee_id: target_id,
            target_payee_name: target_name,
            merged_payee_ids,
            updated_transactions_count: updated_tx_count,
            updated_scheduled_transactions_count: updated_sched_count,
            created_rename_conditions_count: created_rc_count,
        })
    })();

    match work {
        Ok(res) => {
            conn.execute_batch("RELEASE SAVEPOINT sp_combine_payees;")
                .map_err(|e| e.to_string())?;
            Ok(res)
        }
        Err(err) => {
            let _ = conn.execute_batch(
                "ROLLBACK TO SAVEPOINT sp_combine_payees; RELEASE SAVEPOINT sp_combine_payees;",
            );
            Err(err)
        }
    }
}

// -----------------------------------------------------------------------------
// Fabricated Scheduled Transaction Transfers
// -----------------------------------------------------------------------------

/// Scheduled transaction display DTO that includes virtual fabricated transfer counterparts
/// (`wrapper.renamed.js:26089-26121`, `28009`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ScheduledTransferViewRow {
    pub scheduled: ScheduledTransactionDto,
    pub is_fabricated: bool,
    pub source_scheduled_transaction_id: Option<String>,
    pub source_scheduled_subtransaction_id: Option<String>,
}

/// Builds a fabricated ID matching YNAB's counterpart naming convention.
pub fn fabricated_scheduled_transfer_id(scheduled_tx_id: &str) -> String {
    format!("fabricated_scheduled_transfer/{}", scheduled_tx_id)
}

/// Builds a fabricated ID for a split scheduled subtransaction transfer counterpart.
pub fn fabricated_scheduled_sub_transfer_id(scheduled_sub_tx_id: &str) -> String {
    format!("fabricated_scheduled_sub_transfer/{}", scheduled_sub_tx_id)
}

/// Lists scheduled transactions for `account_id` (or all accounts when `None`), expanding
/// virtual fabricated counterpart rows (`is_fabricated = true`, negated amount, swapped
/// account/transfer_account and transfer payee) for transfers targeting `account_id`.
pub fn expand_fabricated_scheduled_transfers(
    conn: &Connection,
    budget_id: &str,
    account_id: Option<&str>,
) -> Result<Vec<ScheduledTransferViewRow>, String> {
    let mut rows: Vec<ScheduledTransferViewRow> = Vec::new();

    // 1. Direct persisted scheduled transactions on `account_id` (or entire budget)
    {
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

        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let mapper = |r: &rusqlite::Row| {
            Ok(ScheduledTransferViewRow {
                scheduled: ScheduledTransactionDto {
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
                },
                is_fabricated: false,
                source_scheduled_transaction_id: None,
                source_scheduled_subtransaction_id: None,
            })
        };

        let items = match account_id {
            Some(aid) => stmt
                .query_map(params![budget_id, aid], mapper)
                .map_err(|e| e.to_string())?
                .filter_map(SqlResult::ok)
                .collect::<Vec<_>>(),
            None => stmt
                .query_map(params![budget_id], mapper)
                .map_err(|e| e.to_string())?
                .filter_map(SqlResult::ok)
                .collect::<Vec<_>>(),
        };
        rows.extend(items);
    }

    // 2. Fabricated counterparts from top-level `be_scheduled_transactions` transfers
    {
        let sql = match account_id {
            Some(_) => {
                r#"SELECT st.id, st.budget_id, st.transfer_account_id, dest_acc.account_name,
                          src_payee.id, COALESCE(src_payee.name, 'Transfer : ' || COALESCE(src_acc.account_name, 'Account')),
                          st.date, st.frequency, -st.amount, st.memo, st.flag, st.entities_account_id
                   FROM be_scheduled_transactions st
                   LEFT JOIN be_accounts src_acc ON st.entities_account_id = src_acc.id
                   LEFT JOIN be_accounts dest_acc ON st.transfer_account_id = dest_acc.id
                   LEFT JOIN be_payees src_payee
                          ON src_payee.entities_account_id = st.entities_account_id
                         AND src_payee.is_tombstone = 0
                   WHERE st.budget_id = ?1
                     AND st.transfer_account_id = ?2
                     AND st.is_tombstone = 0
                   ORDER BY st.date ASC"#
            }
            None => {
                r#"SELECT st.id, st.budget_id, st.transfer_account_id, dest_acc.account_name,
                          src_payee.id, COALESCE(src_payee.name, 'Transfer : ' || COALESCE(src_acc.account_name, 'Account')),
                          st.date, st.frequency, -st.amount, st.memo, st.flag, st.entities_account_id
                   FROM be_scheduled_transactions st
                   LEFT JOIN be_accounts src_acc ON st.entities_account_id = src_acc.id
                   LEFT JOIN be_accounts dest_acc ON st.transfer_account_id = dest_acc.id
                   LEFT JOIN be_payees src_payee
                          ON src_payee.entities_account_id = st.entities_account_id
                         AND src_payee.is_tombstone = 0
                   WHERE st.budget_id = ?1
                     AND st.transfer_account_id IS NOT NULL
                     AND st.is_tombstone = 0
                   ORDER BY st.date ASC"#
            }
        };

        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let mapper = |r: &rusqlite::Row| {
            let orig_id: String = r.get(0)?;
            let src_acc_id: String = r.get(11)?;
            let payee_id: Option<String> = r.get(4)?;
            Ok(ScheduledTransferViewRow {
                scheduled: ScheduledTransactionDto {
                    id: fabricated_scheduled_transfer_id(&orig_id),
                    budget_id: r.get(1)?,
                    account_id: r.get(2)?,
                    account_name: r.get(3)?,
                    payee_id: payee_id.or_else(|| Some(format!("payee/transfer/{}", src_acc_id))),
                    payee_name: r.get(5)?,
                    category_id: None,
                    category_name: None,
                    date: r.get(6)?,
                    frequency: r.get(7)?,
                    amount_milliunits: r.get(8)?,
                    memo: r.get(9)?,
                    flag: r.get(10)?,
                    transfer_account_id: Some(src_acc_id),
                },
                is_fabricated: true,
                source_scheduled_transaction_id: Some(orig_id),
                source_scheduled_subtransaction_id: None,
            })
        };

        let items = match account_id {
            Some(aid) => stmt
                .query_map(params![budget_id, aid], mapper)
                .map_err(|e| e.to_string())?
                .filter_map(SqlResult::ok)
                .collect::<Vec<_>>(),
            None => stmt
                .query_map(params![budget_id], mapper)
                .map_err(|e| e.to_string())?
                .filter_map(SqlResult::ok)
                .collect::<Vec<_>>(),
        };
        rows.extend(items);
    }

    // 3. Fabricated counterparts from split `be_scheduled_subtransactions` transfers
    {
        let sql = match account_id {
            Some(_) => {
                r#"SELECT sst.id, st.id, sst.budget_id, sst.transfer_account_id, dest_acc.account_name,
                          src_payee.id, COALESCE(src_payee.name, 'Transfer : ' || COALESCE(src_acc.account_name, 'Account')),
                          st.date, st.frequency, -sst.amount, COALESCE(sst.memo, st.memo), st.flag, st.entities_account_id
                   FROM be_scheduled_subtransactions sst
                   JOIN be_scheduled_transactions st ON sst.entities_scheduled_transaction_id = st.id
                   LEFT JOIN be_accounts src_acc ON st.entities_account_id = src_acc.id
                   LEFT JOIN be_accounts dest_acc ON sst.transfer_account_id = dest_acc.id
                   LEFT JOIN be_payees src_payee
                          ON src_payee.entities_account_id = st.entities_account_id
                         AND src_payee.is_tombstone = 0
                   WHERE sst.budget_id = ?1
                     AND sst.transfer_account_id = ?2
                     AND sst.is_tombstone = 0
                     AND st.is_tombstone = 0
                   ORDER BY st.date ASC"#
            }
            None => {
                r#"SELECT sst.id, st.id, sst.budget_id, sst.transfer_account_id, dest_acc.account_name,
                          src_payee.id, COALESCE(src_payee.name, 'Transfer : ' || COALESCE(src_acc.account_name, 'Account')),
                          st.date, st.frequency, -sst.amount, COALESCE(sst.memo, st.memo), st.flag, st.entities_account_id
                   FROM be_scheduled_subtransactions sst
                   JOIN be_scheduled_transactions st ON sst.entities_scheduled_transaction_id = st.id
                   LEFT JOIN be_accounts src_acc ON st.entities_account_id = src_acc.id
                   LEFT JOIN be_accounts dest_acc ON sst.transfer_account_id = dest_acc.id
                   LEFT JOIN be_payees src_payee
                          ON src_payee.entities_account_id = st.entities_account_id
                         AND src_payee.is_tombstone = 0
                   WHERE sst.budget_id = ?1
                     AND sst.transfer_account_id IS NOT NULL
                     AND sst.is_tombstone = 0
                     AND st.is_tombstone = 0
                   ORDER BY st.date ASC"#
            }
        };

        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let mapper = |r: &rusqlite::Row| {
            let sub_id: String = r.get(0)?;
            let parent_id: String = r.get(1)?;
            let src_acc_id: String = r.get(12)?;
            let payee_id: Option<String> = r.get(5)?;
            Ok(ScheduledTransferViewRow {
                scheduled: ScheduledTransactionDto {
                    id: fabricated_scheduled_sub_transfer_id(&sub_id),
                    budget_id: r.get(2)?,
                    account_id: r.get(3)?,
                    account_name: r.get(4)?,
                    payee_id: payee_id.or_else(|| Some(format!("payee/transfer/{}", src_acc_id))),
                    payee_name: r.get(6)?,
                    category_id: None,
                    category_name: None,
                    date: r.get(7)?,
                    frequency: r.get(8)?,
                    amount_milliunits: r.get(9)?,
                    memo: r.get(10)?,
                    flag: r.get(11)?,
                    transfer_account_id: Some(src_acc_id),
                },
                is_fabricated: true,
                source_scheduled_transaction_id: Some(parent_id),
                source_scheduled_subtransaction_id: Some(sub_id),
            })
        };

        let items = match account_id {
            Some(aid) => stmt
                .query_map(params![budget_id, aid], mapper)
                .map_err(|e| e.to_string())?
                .filter_map(SqlResult::ok)
                .collect::<Vec<_>>(),
            None => stmt
                .query_map(params![budget_id], mapper)
                .map_err(|e| e.to_string())?
                .filter_map(SqlResult::ok)
                .collect::<Vec<_>>(),
        };
        rows.extend(items);
    }

    rows.sort_by(|a, b| {
        a.scheduled
            .date
            .cmp(&b.scheduled.date)
            .then_with(|| a.is_fabricated.cmp(&b.is_fabricated))
            .then_with(|| a.scheduled.id.cmp(&b.scheduled.id))
    });

    Ok(rows)
}
