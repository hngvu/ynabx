//! Default Seeding for YNAB Desktop following YNAB v26.160.1 specifications.
//! Seeds the required internal master categories, internal subcategories, system payees, and flag settings.

use rusqlite::{params, Connection, Result};
use tracing::info;
use uuid::Uuid;

pub const DEFAULT_BUDGET_ID: &str = "00000000-0000-0000-0000-000000000001";

// Internal System Names
pub const MASTER_CAT_INTERNAL: &str = "MasterCategory/__Internal__";
pub const MASTER_CAT_DEBT_PAYMENT: &str = "MasterCategory/__DebtPayment__";
pub const MASTER_CAT_HIDDEN: &str = "MasterCategory/__Hidden__";

pub const CAT_IMMEDIATE_INCOME: &str = "Category/__ImmediateIncome__";
pub const CAT_SPLIT: &str = "Category/__Split__";
pub const CAT_NONE: &str = "Category/__None__";
pub const CAT_CREDIT_CARD_INTEREST: &str = "Category/__CreditCardInterest__";

pub const PAYEE_STARTING_BALANCE: &str = "StartingBalancePayee";
pub const PAYEE_MANUAL_ADJUSTMENT: &str = "BalanceAdjustmentPayee";
pub const PAYEE_RECONCILIATION_ADJUSTMENT: &str = "BalanceAdjustmentReconcilePayee";

pub fn seed_new_budget_if_needed(
    conn: &mut Connection,
    budget_id: &str,
    budget_name: &str,
) -> Result<()> {
    let exists: bool = conn
        .query_row(
            "SELECT 1 FROM be_budgets WHERE id = ?1",
            params![budget_id],
            |_| Ok(true),
        )
        .unwrap_or(false);
    if exists {
        info!("Budget {} already exists; skipping seeding.", budget_id);
        return Ok(());
    }
    seed_new_budget(conn, budget_id, budget_name)
}

/// Deduplicates system master categories created by pre-fix runs where seeding ran on every launch,
/// and fixes any subcategories whose `entities_master_category_id` was stored as the internal_name literal.
pub fn cleanup_duplicate_system_categories(conn: &mut Connection, budget_id: &str) -> Result<()> {
    let tx = conn.transaction()?;
    for internal_name in [
        MASTER_CAT_INTERNAL,
        MASTER_CAT_DEBT_PAYMENT,
        MASTER_CAT_HIDDEN,
    ] {
        let mut stmt = tx.prepare(
            "SELECT id FROM be_master_categories WHERE budget_id = ?1 AND internal_name = ?2 AND is_tombstone = 0 ORDER BY rowid ASC",
        )?;
        let ids: Vec<String> = stmt
            .query_map(params![budget_id, internal_name], |r| r.get(0))?
            .filter_map(Result::ok)
            .collect();
        drop(stmt);

        if let Some(canonical_id) = ids.first() {
            // Re-point any subcategories referencing the internal_name literal
            tx.execute(
                "UPDATE be_subcategories SET entities_master_category_id = ?1 WHERE budget_id = ?2 AND entities_master_category_id = ?3",
                params![canonical_id, budget_id, internal_name],
            )?;

            // Re-point subcategories from duplicate master rows and remove duplicates
            for dup_id in ids.iter().skip(1) {
                tx.execute(
                    "UPDATE be_subcategories SET entities_master_category_id = ?1 WHERE budget_id = ?2 AND entities_master_category_id = ?3",
                    params![canonical_id, budget_id, dup_id],
                )?;
                tx.execute(
                    "DELETE FROM be_master_categories WHERE id = ?1",
                    params![dup_id],
                )?;
            }
        }
    }
    tx.commit()?;
    Ok(())
}

pub fn seed_new_budget(conn: &mut Connection, budget_id: &str, budget_name: &str) -> Result<()> {
    let tx = conn.transaction()?;

    // 1. Insert Budget Record
    tx.execute(
        r#"INSERT OR IGNORE INTO be_budgets (id, budget_id, budget_name)
           VALUES (?1, ?1, ?2)"#,
        params![budget_id, budget_name],
    )?;

    // 2. Default Flag Settings
    let default_flags = r#"{"flags":[{"color":"Red","name":"Red"},{"color":"Orange","name":"Orange"},{"color":"Yellow","name":"Yellow"},{"color":"Green","name":"Green"},{"color":"Blue","name":"Blue"},{"color":"Purple","name":"Purple"}]}"#;
    let flag_setting_id = format!("{}/flag_settings", budget_id);
    tx.execute(
        r#"INSERT OR IGNORE INTO be_settings (id, setting_name, setting_value)
           VALUES (?1, 'flag_settings', ?2)"#,
        params![flag_setting_id, default_flags],
    )?;

    // 3. System Master Categories
    let internal_master_id = Uuid::new_v4().to_string();
    tx.execute(
        r#"INSERT OR IGNORE INTO be_master_categories (id, budget_id, internal_name, deletable, sortable_index, name)
           VALUES (?1, ?2, ?3, 0, -10000, 'Internal Master Category')"#,
        params![internal_master_id, budget_id, MASTER_CAT_INTERNAL],
    )?;

    let debt_master_id = Uuid::new_v4().to_string();
    tx.execute(
        r#"INSERT OR IGNORE INTO be_master_categories (id, budget_id, internal_name, deletable, sortable_index, name)
           VALUES (?1, ?2, ?3, 0, 0, 'Credit Card Payments')"#,
        params![debt_master_id, budget_id, MASTER_CAT_DEBT_PAYMENT],
    )?;

    let hidden_master_id = Uuid::new_v4().to_string();
    tx.execute(
        r#"INSERT OR IGNORE INTO be_master_categories (id, budget_id, internal_name, deletable, sortable_index, name)
           VALUES (?1, ?2, ?3, 0, 2147483646, 'Hidden Categories')"#,
        params![hidden_master_id, budget_id, MASTER_CAT_HIDDEN],
    )?;

    // Retrieve internal master ID
    let internal_mid: String = tx.query_row(
        "SELECT id FROM be_master_categories WHERE budget_id = ?1 AND internal_name = ?2",
        params![budget_id, MASTER_CAT_INTERNAL],
        |r| r.get(0),
    )?;

    // 4. System Subcategories under MasterCategory/__Internal__
    let internal_cats = [
        (CAT_IMMEDIATE_INCOME, "Inflow: Ready to Assign", -100),
        (CAT_SPLIT, "Split (Multiple Categories)...", -90),
        (CAT_NONE, "Uncategorized", -80),
        (CAT_CREDIT_CARD_INTEREST, "Credit Card Interest", -70),
    ];

    for (int_name, cat_name, s_idx) in internal_cats {
        let cid = Uuid::new_v4().to_string();
        tx.execute(
            r#"INSERT OR IGNORE INTO be_subcategories (id, budget_id, entities_master_category_id, internal_name, sortable_index, name, type)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'DFT')"#,
            params![cid, budget_id, internal_mid, int_name, s_idx, cat_name],
        )?;
    }

    // 5. System Payees
    let system_payees = [
        (PAYEE_STARTING_BALANCE, "Starting Balance"),
        (PAYEE_MANUAL_ADJUSTMENT, "Manual Balance Adjustment"),
        (
            PAYEE_RECONCILIATION_ADJUSTMENT,
            "Reconciliation Balance Adjustment",
        ),
    ];

    for (int_name, payee_name) in system_payees {
        let pid = Uuid::new_v4().to_string();
        tx.execute(
            r#"INSERT OR IGNORE INTO be_payees (id, budget_id, name, internal_name, enabled)
               VALUES (?1, ?2, ?3, ?4, 0)"#,
            params![pid, budget_id, payee_name, int_name],
        )?;
    }

    // 6. Default User Envelope Groups
    let default_groups = [
        (
            "Immediate Obligations",
            vec![
                "Rent/Mortgage",
                "Electric",
                "Water",
                "Internet",
                "Groceries",
            ],
        ),
        (
            "True Expenses",
            vec![
                "Auto Maintenance",
                "Home Maintenance",
                "Medical",
                "Clothing",
            ],
        ),
        (
            "Quality of Life Goals",
            vec!["Vacation", "Fitness", "Education"],
        ),
        (
            "Just for Fun",
            vec!["Dining Out", "Gaming", "Music & Entertainment"],
        ),
    ];

    for (g_idx, (group_name, subcats)) in default_groups.iter().enumerate() {
        let group_id = Uuid::new_v4().to_string();
        let sort_order = (g_idx as i32 + 1) * 1000;
        tx.execute(
            r#"INSERT OR IGNORE INTO be_master_categories (id, budget_id, deletable, sortable_index, name)
               VALUES (?1, ?2, 1, ?3, ?4)"#,
            params![group_id, budget_id, sort_order, group_name],
        )?;

        for (c_idx, cat_name) in subcats.iter().enumerate() {
            let cat_id = Uuid::new_v4().to_string();
            let cat_sort = (c_idx as i32 + 1) * 100;
            tx.execute(
                r#"INSERT OR IGNORE INTO be_subcategories (id, budget_id, entities_master_category_id, sortable_index, name, type)
                   VALUES (?1, ?2, ?3, ?4, ?5, 'DFT')"#,
                params![cat_id, budget_id, group_id, cat_sort, cat_name],
            )?;
        }
    }

    tx.commit()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::schema;

    #[test]
    fn test_seed_new_budget_idempotency() {
        let mut conn = Connection::open_in_memory().unwrap();
        schema::init_database(&conn).unwrap();

        // First run: should seed categories and settings
        seed_new_budget_if_needed(&mut conn, DEFAULT_BUDGET_ID, "My Plan").unwrap();

        let count_before: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM be_master_categories WHERE budget_id = ?1",
                params![DEFAULT_BUDGET_ID],
                |r| r.get(0),
            )
            .unwrap();
        assert!(count_before > 0);

        // Second run: should be a no-op due to idempotency check
        seed_new_budget_if_needed(&mut conn, DEFAULT_BUDGET_ID, "My Plan").unwrap();

        let count_after: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM be_master_categories WHERE budget_id = ?1",
                params![DEFAULT_BUDGET_ID],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count_before, count_after);
    }
}
