//! F11: Account and category sort order persistence test suite.
//! Tests account and category `sortable_index` persistence and ordering (`ORDER BY sortable_index ASC`).

use super::common::setup_test_db;
use crate::commands;
use crate::seed::DEFAULT_BUDGET_ID;
use crate::sortable_index::{calculate_midpoint_index, evenly_space_indices};
use crate::AppState;
use rusqlite::params;
use serde_json::json;
use std::sync::Mutex;
use uuid::Uuid;

// =========================================================================
// Tier 1: Primary Behavioral & Equivalence Tests
// =========================================================================

#[test]
fn test_f11_t1_accounts_persist_sortable_index() {
    let conn = setup_test_db();
    let acc_id = Uuid::new_v4().to_string();

    conn.execute(
        r#"INSERT INTO be_accounts (
            id, budget_id, account_type, account_name, sortable_index
        ) VALUES (?1, ?2, 'checking', 'Sorted Acc', 2500)"#,
        params![acc_id, DEFAULT_BUDGET_ID],
    )
    .unwrap();

    let idx: i32 = conn
        .query_row(
            "SELECT sortable_index FROM be_accounts WHERE id = ?1",
            params![acc_id],
            |r| r.get(0),
        )
        .unwrap();

    assert_eq!(
        idx, 2500,
        "sortable_index must be accurately persisted in be_accounts"
    );
}

#[test]
fn test_f11_t1_accounts_ordered_by_sortable_index_asc() {
    let conn = setup_test_db();

    // Insert 3 accounts with specific sort indices: 300, 100, 200
    let a1 = Uuid::new_v4().to_string();
    let a2 = Uuid::new_v4().to_string();
    let a3 = Uuid::new_v4().to_string();

    conn.execute("INSERT INTO be_accounts (id, budget_id, account_type, account_name, sortable_index) VALUES (?1, ?2, 'checking', 'C', 300)", params![a1, DEFAULT_BUDGET_ID]).unwrap();
    conn.execute("INSERT INTO be_accounts (id, budget_id, account_type, account_name, sortable_index) VALUES (?1, ?2, 'checking', 'A', 100)", params![a2, DEFAULT_BUDGET_ID]).unwrap();
    conn.execute("INSERT INTO be_accounts (id, budget_id, account_type, account_name, sortable_index) VALUES (?1, ?2, 'checking', 'B', 200)", params![a3, DEFAULT_BUDGET_ID]).unwrap();

    let mut stmt = conn
        .prepare(
            "SELECT account_name FROM be_accounts WHERE budget_id = ?1 ORDER BY sortable_index ASC",
        )
        .unwrap();
    let names: Vec<String> = stmt
        .query_map(params![DEFAULT_BUDGET_ID], |r| r.get(0))
        .unwrap()
        .flatten()
        .collect();

    assert_eq!(
        names,
        vec!["A", "B", "C"],
        "Query with ORDER BY sortable_index ASC must return exact ascending order"
    );
}

#[test]
fn test_f11_t1_reorder_accounts_updates_sortable_indices() {
    let app = super::common::mock_app();
    let conn = setup_test_db();

    let a1 = Uuid::new_v4().to_string();
    let a2 = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO be_accounts (id, budget_id, account_type, account_name, sortable_index) VALUES (?1, ?2, 'checking', 'First', 1000)", params![a1, DEFAULT_BUDGET_ID]).unwrap();
    conn.execute("INSERT INTO be_accounts (id, budget_id, account_type, account_name, sortable_index) VALUES (?1, ?2, 'checking', 'Second', 2000)", params![a2, DEFAULT_BUDGET_ID]).unwrap();

    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Reorder: invoke commands::reorder_accounts to put Second first, First second
    let res = commands::reorder_accounts(Some(vec![a2.clone(), a1.clone()]), None, state.clone());
    assert!(res.is_ok(), "commands::reorder_accounts must succeed");

    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT account_name FROM be_accounts WHERE budget_id = ?1 ORDER BY sortable_index ASC",
        )
        .unwrap();
    let names: Vec<String> = stmt
        .query_map(params![DEFAULT_BUDGET_ID], |r| r.get(0))
        .unwrap()
        .flatten()
        .collect();

    assert_eq!(names, vec!["Second", "First"]);
}

#[test]
fn test_f11_t1_categories_ordered_by_sortable_index_asc() {
    let conn = setup_test_db();

    let master_id: String = conn
        .query_row(
            "SELECT id FROM be_master_categories WHERE budget_id = ?1 AND deletable = 1 LIMIT 1",
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        )
        .unwrap();

    // Clear existing subcats in this group for clean test
    conn.execute(
        "DELETE FROM be_subcategories WHERE entities_master_category_id = ?1",
        params![master_id],
    )
    .unwrap();

    conn.execute("INSERT INTO be_subcategories (id, budget_id, entities_master_category_id, name, sortable_index) VALUES (?1, ?2, ?3, 'Groceries', 50)", params![Uuid::new_v4().to_string(), DEFAULT_BUDGET_ID, master_id]).unwrap();
    conn.execute("INSERT INTO be_subcategories (id, budget_id, entities_master_category_id, name, sortable_index) VALUES (?1, ?2, ?3, 'Rent', 10)", params![Uuid::new_v4().to_string(), DEFAULT_BUDGET_ID, master_id]).unwrap();
    conn.execute("INSERT INTO be_subcategories (id, budget_id, entities_master_category_id, name, sortable_index) VALUES (?1, ?2, ?3, 'Utilities', 30)", params![Uuid::new_v4().to_string(), DEFAULT_BUDGET_ID, master_id]).unwrap();

    let mut stmt = conn.prepare("SELECT name FROM be_subcategories WHERE entities_master_category_id = ?1 ORDER BY sortable_index ASC").unwrap();
    let names: Vec<String> = stmt
        .query_map(params![master_id], |r| r.get(0))
        .unwrap()
        .flatten()
        .collect();

    assert_eq!(names, vec!["Rent", "Utilities", "Groceries"]);
}

#[test]
fn test_f11_t1_reorder_categories_command_updates_sortable_indices() {
    let app = super::common::mock_app();
    let conn = setup_test_db();

    let (g1, g2) = {
        let mut stmt = conn.prepare("SELECT id FROM be_master_categories WHERE budget_id = ?1 AND deletable = 1 ORDER BY sortable_index ASC LIMIT 2").unwrap();
        let g_ids: Vec<String> = stmt
            .query_map(params![DEFAULT_BUDGET_ID], |r| r.get(0))
            .unwrap()
            .flatten()
            .collect();
        (g_ids[0].clone(), g_ids[1].clone())
    };

    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Reorder groups: swap g1 and g2
    let res = commands::reorder_categories(
        Some(DEFAULT_BUDGET_ID.to_string()),
        Some(vec![g2.clone(), g1.clone()]),
        None,
        None,
        state.clone(),
    );
    assert!(res.is_ok(), "commands::reorder_categories must succeed");

    let conn = state.db.lock().unwrap();
    let (s2, s1): (i32, i32) = (
        conn.query_row(
            "SELECT sortable_index FROM be_master_categories WHERE id = ?1",
            params![g2],
            |r| r.get(0),
        )
        .unwrap(),
        conn.query_row(
            "SELECT sortable_index FROM be_master_categories WHERE id = ?1",
            params![g1],
            |r| r.get(0),
        )
        .unwrap(),
    );
    assert!(s2 < s1, "g2 should sort before g1 after reordering");
}

#[test]
fn test_f11_t1_midpoint_index_insertion_between_two_items() {
    let midpoint = calculate_midpoint_index(Some(1000), Some(2000));
    assert_eq!(
        midpoint,
        Some(1500),
        "Midpoint between 1000 and 2000 must be 1500"
    );
}

// =========================================================================
// Tier 2: Boundary & Corner Cases (Head, Tail, Relabeling, Negative Indices)
// =========================================================================

#[test]
fn test_f11_t2_insert_at_head_before_first_item() {
    // Inserting before item with index 1000: (None, Some(1000))
    let head_index = calculate_midpoint_index(None, Some(1000));
    assert_eq!(
        head_index,
        Some(0),
        "Inserting at head before 1000 must yield index 0"
    );
}

#[test]
fn test_f11_t2_insert_at_tail_after_last_item() {
    // Inserting after item with index 5000: (Some(5000), None)
    let tail_index = calculate_midpoint_index(Some(5000), None);
    assert_eq!(
        tail_index,
        Some(6000),
        "Inserting at tail after 5000 must yield 6000"
    );
}

#[test]
fn test_f11_t2_no_gap_relabeling_with_evenly_spaced_indices() {
    // When items have adjacent indices (10 and 11), difference is 1, so no integer gap exists
    let no_gap = calculate_midpoint_index(Some(10), Some(11));
    assert_eq!(
        no_gap, None,
        "Midpoint between adjacent integers must return None to trigger relabeling"
    );

    // Relabel 3 items across [1000, 3000]
    let spaced = evenly_space_indices(3, 1000, 3000);
    assert_eq!(spaced.len(), 3);
    assert!(
        spaced[0] < spaced[1] && spaced[1] < spaced[2],
        "Relabeled indices must be strictly increasing"
    );
}

#[test]
fn test_f11_t2_negative_sortable_index_boundary() {
    let conn = setup_test_db();

    // System internal master category has sortable_index = -10000
    let sys_idx: i32 = conn.query_row(
        "SELECT sortable_index FROM be_master_categories WHERE budget_id = ?1 AND internal_name = 'MasterCategory/__Internal__'",
        params![DEFAULT_BUDGET_ID],
        |r| r.get(0),
    ).expect("Internal master category must exist");

    assert_eq!(
        sys_idx, -10000,
        "Internal system category must have sortable_index = -10000"
    );

    // User categories have positive sortable_index (>= 1000)
    let min_user_idx: i32 = conn.query_row(
        "SELECT MIN(sortable_index) FROM be_master_categories WHERE budget_id = ?1 AND deletable = 1",
        params![DEFAULT_BUDGET_ID],
        |r| r.get(0),
    ).unwrap();

    assert!(
        min_user_idx > sys_idx,
        "System categories must sort before user categories"
    );
}

#[test]
fn test_f11_t2_move_subcategory_to_different_master_category() {
    let app = super::common::mock_app();
    let conn = setup_test_db();

    // Get two user master categories
    let (m1, m2) = {
        let mut stmt = conn.prepare("SELECT id FROM be_master_categories WHERE budget_id = ?1 AND deletable = 1 LIMIT 2").unwrap();
        let master_ids: Vec<String> = stmt
            .query_map(params![DEFAULT_BUDGET_ID], |r| r.get(0))
            .unwrap()
            .flatten()
            .collect();
        (master_ids[0].clone(), master_ids[1].clone())
    };

    let subcat_id = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO be_subcategories (id, budget_id, entities_master_category_id, name, sortable_index) VALUES (?1, ?2, ?3, 'Movable Cat', 500)", params![subcat_id, DEFAULT_BUDGET_ID, m1]).unwrap();

    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // Move to master category 2 with new sort index via commands::reorder_categories
    let res = commands::reorder_categories(
        Some(DEFAULT_BUDGET_ID.to_string()),
        None,
        Some(json!({ &m2: [subcat_id.clone()] })),
        None,
        state.clone(),
    );
    assert!(res.is_ok(), "commands::reorder_categories must succeed");

    let conn = state.db.lock().unwrap();
    let (assigned_master, assigned_idx): (String, i32) = conn.query_row(
        "SELECT entities_master_category_id, sortable_index FROM be_subcategories WHERE id = ?1",
        params![subcat_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).unwrap();

    assert_eq!(assigned_master, m2);
    assert_eq!(
        assigned_idx, 100,
        "Moving to another group via reorder_categories sets sort index"
    );
}
