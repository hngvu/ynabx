//! Payee Smart Auto-Categorization implementing YNAB's `first_categorization` and `two_of_three` rules
//! (`wrapper.beautified.js:33560–33717`, `34020–34056`).

use rusqlite::{params, Connection, Result};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AutoCategorizeReason {
    FirstCategorization,
    TwoOfThree,
    KeepExisting,
}

/// Examines the most recent 3 eligible categorized transactions for a payee,
/// and returns the category ID if an update should occur according to the 2-of-3 rule.
pub fn compute_payee_auto_categorization(
    conn: &Connection,
    payee_id: &str,
    current_autofill_cat_id: Option<&str>,
) -> Result<Option<(String, AutoCategorizeReason)>> {
    // 1. Fetch up to 3 most recent eligible transactions for this payee
    // YNAB L33633-33644 ordering:
    // 1. date DESC
    // 2. amount ASC (most negative outflow first)
    // 3. id ASC
    let mut stmt = conn.prepare(
        r#"SELECT t.entities_subcategory_id
           FROM be_transactions t
           JOIN be_subcategories c ON t.entities_subcategory_id = c.id
           JOIN be_master_categories m ON c.entities_master_category_id = m.id
           WHERE t.entities_payee_id = ?1
             AND t.is_tombstone = 0
             AND t.entities_subcategory_id IS NOT NULL
             AND (m.internal_name != 'MasterCategory/__Internal__' OR c.internal_name = 'Category/__ImmediateIncome__')
           ORDER BY t.date DESC, t.amount ASC, t.id ASC
           LIMIT 3"#,
    )?;

    let cat_ids: Vec<String> = stmt
        .query_map(params![payee_id], |r| r.get(0))?
        .filter_map(Result::ok)
        .collect();

    if cat_ids.is_empty() {
        return Ok(None);
    }

    // Rule 1: First Categorization ever (when payee has no existing autofill category)
    if current_autofill_cat_id.is_none() {
        return Ok(Some((
            cat_ids[0].clone(),
            AutoCategorizeReason::FirstCategorization,
        )));
    }

    let existing_cat = current_autofill_cat_id.unwrap();

    // Rule 2: Two-of-Three consensus rule
    let mut counts: HashMap<&str, usize> = HashMap::new();
    for cid in &cat_ids {
        *counts.entry(cid.as_str()).or_insert(0) += 1;
    }

    for (cid, count) in counts {
        if count >= 2 {
            if cid != existing_cat {
                return Ok(Some((cid.to_string(), AutoCategorizeReason::TwoOfThree)));
            } else {
                return Ok(Some((
                    existing_cat.to_string(),
                    AutoCategorizeReason::KeepExisting,
                )));
            }
        }
    }

    Ok(None)
}

/// Update a payee's autofill category in SQLite if 2-of-3 threshold is met.
pub fn update_payee_autofill_category(conn: &Connection, payee_id: &str) -> Result<()> {
    // Check if auto fill is enabled for this payee
    let (enabled, user_defined, current_autofill): (i32, Option<String>, Option<String>) = conn
        .query_row(
            "SELECT auto_fill_subcategory_enabled, auto_fill_user_defined_subcategory_id, auto_fill_subcategory_id FROM be_payees WHERE id = ?1",
            params![payee_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )?;

    if enabled == 0 || user_defined.is_some() {
        // User defined manual override takes precedence
        return Ok(());
    }

    if let Some((new_cat_id, reason)) =
        compute_payee_auto_categorization(conn, payee_id, current_autofill.as_deref())?
    {
        if reason == AutoCategorizeReason::FirstCategorization
            || reason == AutoCategorizeReason::TwoOfThree
        {
            conn.execute(
                "UPDATE be_payees SET auto_fill_subcategory_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                params![new_cat_id, payee_id],
            )?;
        }
    }

    Ok(())
}
