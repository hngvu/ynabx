//! F05: Paired transfer creation, balance updates, and unlink cleanup test suite.
//! Tests `ledger::transfers::save_transaction`: paired transfer creation, source/dest
//! balance updates, and unlinking cleanup (`is_tombstone = 1` on peer transaction when edited to non-transfer).

use rusqlite::params;
use uuid::Uuid;
use super::common::setup_test_db;
use crate::seed::DEFAULT_BUDGET_ID;
use crate::ledger::transfers::{save_transaction, SaveTransactionPayload};

fn setup_two_accounts(conn: &rusqlite::Connection) -> (String, String) {
    let acc1_id = Uuid::new_v4().to_string();
    let acc2_id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO be_accounts (id, budget_id, account_type, account_name, on_budget) VALUES (?1, ?2, 'checking', 'Checking 1', 1)",
        params![acc1_id, DEFAULT_BUDGET_ID],
    ).unwrap();
    conn.execute(
        "INSERT INTO be_accounts (id, budget_id, account_type, account_name, on_budget) VALUES (?1, ?2, 'savings', 'Savings 2', 1)",
        params![acc2_id, DEFAULT_BUDGET_ID],
    ).unwrap();

    // Create transfer payees pointing to each account
    let payee1_id = Uuid::new_v4().to_string();
    let payee2_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_payees (id, budget_id, entities_account_id, name) VALUES (?1, ?2, ?3, 'Transfer : Checking 1')",
        params![payee1_id, DEFAULT_BUDGET_ID, acc1_id],
    ).unwrap();
    conn.execute(
        "INSERT INTO be_payees (id, budget_id, entities_account_id, name) VALUES (?1, ?2, ?3, 'Transfer : Savings 2')",
        params![payee2_id, DEFAULT_BUDGET_ID, acc2_id],
    ).unwrap();

    (acc1_id, acc2_id)
}

// =========================================================================
// Tier 1: Primary Behavioral & Equivalence Tests
// =========================================================================

#[test]
fn test_f05_t1_create_paired_transfer_creates_both_legs() {
    let conn = setup_test_db();
    let (acc1, acc2) = setup_two_accounts(&conn);

    let payload = SaveTransactionPayload {
        id: None,
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: acc1.clone(),
        payee_id: None,
        category_id: None,
        date: "2026-03-01".to_string(),
        amount_milliunits: -50000, // -$50.00
        memo: Some("Savings transfer".to_string()),
        cleared: Some("Cleared".to_string()),
        approved: Some(true),
        flag: None,
        transfer_account_id: Some(acc2.clone()),
    };

    let source_tx_id = save_transaction(&conn, &payload).expect("save_transaction must succeed");

    // Fetch peer transaction
    let peer_tx_id: Option<String> = conn.query_row(
        "SELECT transfer_transaction_id FROM be_transactions WHERE id = ?1",
        params![source_tx_id],
        |r| r.get(0),
    ).unwrap();

    assert!(peer_tx_id.is_some(), "Source must have transfer_transaction_id");
    let peer_id = peer_tx_id.unwrap();

    // Verify peer points back to source
    let backlink: String = conn.query_row(
        "SELECT transfer_transaction_id FROM be_transactions WHERE id = ?1",
        params![peer_id],
        |r| r.get(0),
    ).expect("Peer transaction must exist");

    assert_eq!(backlink, source_tx_id, "Peer transaction must point back to source");
}

#[test]
fn test_f05_t1_paired_transfer_amounts_sum_to_zero() {
    let conn = setup_test_db();
    let (acc1, acc2) = setup_two_accounts(&conn);

    let payload = SaveTransactionPayload {
        id: None,
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: acc1,
        payee_id: None,
        category_id: None,
        date: "2026-03-01".to_string(),
        amount_milliunits: -123450,
        memo: None,
        cleared: Some("Uncleared".to_string()),
        approved: Some(true),
        flag: None,
        transfer_account_id: Some(acc2),
    };

    let source_tx_id = save_transaction(&conn, &payload).unwrap();
    let (source_amt, peer_id): (i64, String) = conn.query_row(
        "SELECT amount, transfer_transaction_id FROM be_transactions WHERE id = ?1",
        params![source_tx_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).unwrap();

    let peer_amt: i64 = conn.query_row(
        "SELECT amount FROM be_transactions WHERE id = ?1",
        params![peer_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(source_amt, -123450);
    assert_eq!(peer_amt, 123450);
    assert_eq!(source_amt + peer_amt, 0, "Paired transfer legs must sum to exactly 0 milliunits");
}

#[test]
fn test_f05_t1_paired_transfer_updates_both_account_balances() {
    let conn = setup_test_db();
    let (acc1, acc2) = setup_two_accounts(&conn);

    let payload = SaveTransactionPayload {
        id: None,
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: acc1.clone(),
        payee_id: None,
        category_id: None,
        date: "2026-03-01".to_string(),
        amount_milliunits: -200000,
        memo: None,
        cleared: Some("Cleared".to_string()),
        approved: Some(true),
        flag: None,
        transfer_account_id: Some(acc2.clone()),
    };

    save_transaction(&conn, &payload).unwrap();

    let bal1: i64 = conn.query_row("SELECT cleared_balance FROM be_accounts WHERE id = ?1", params![acc1], |r| r.get(0)).unwrap();
    let bal2: i64 = conn.query_row("SELECT uncleared_balance FROM be_accounts WHERE id = ?1", params![acc2], |r| r.get(0)).unwrap();

    assert_eq!(bal1, -200000, "Source account cleared balance updated");
    // Dest is created as Uncleared by default in save_transaction
    assert_eq!(bal2, 200000, "Destination account uncleared balance updated");
}

#[test]
fn test_f05_t1_on_budget_to_on_budget_transfer_category_is_null() {
    let conn = setup_test_db();
    let (acc1, acc2) = setup_two_accounts(&conn);

    let payload = SaveTransactionPayload {
        id: None,
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: acc1,
        payee_id: None,
        category_id: Some("some-cat-id".to_string()), // Pass a category, should be ignored/nulled
        date: "2026-03-01".to_string(),
        amount_milliunits: -10000,
        memo: None,
        cleared: None,
        approved: None,
        flag: None,
        transfer_account_id: Some(acc2),
    };

    let source_id = save_transaction(&conn, &payload).unwrap();
    let (source_cat, peer_id): (Option<String>, String) = conn.query_row(
        "SELECT entities_subcategory_id, transfer_transaction_id FROM be_transactions WHERE id = ?1",
        params![source_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).unwrap();

    let peer_cat: Option<String> = conn.query_row(
        "SELECT entities_subcategory_id FROM be_transactions WHERE id = ?1",
        params![peer_id],
        |r| r.get(0),
    ).unwrap();

    assert!(source_cat.is_none(), "On-budget transfer source category must be NULL");
    assert!(peer_cat.is_none(), "On-budget transfer destination category must be NULL");
}

#[test]
fn test_f05_t1_independent_cleared_status_per_transfer_leg() {
    let conn = setup_test_db();
    let (acc1, acc2) = setup_two_accounts(&conn);

    let payload = SaveTransactionPayload {
        id: None,
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: acc1,
        payee_id: None,
        category_id: None,
        date: "2026-03-01".to_string(),
        amount_milliunits: -50000,
        memo: None,
        cleared: Some("Cleared".to_string()),
        approved: Some(true),
        flag: None,
        transfer_account_id: Some(acc2),
    };

    let source_id = save_transaction(&conn, &payload).unwrap();
    let peer_id: String = conn.query_row(
        "SELECT transfer_transaction_id FROM be_transactions WHERE id = ?1",
        params![source_id],
        |r| r.get(0),
    ).unwrap();

    let source_cleared: String = conn.query_row("SELECT cleared FROM be_transactions WHERE id = ?1", params![source_id], |r| r.get(0)).unwrap();
    let peer_cleared: String = conn.query_row("SELECT cleared FROM be_transactions WHERE id = ?1", params![peer_id], |r| r.get(0)).unwrap();

    assert_eq!(source_cleared, "Cleared");
    assert_eq!(peer_cleared, "Uncleared", "Peer leg retains independent uncleared status");
}

// =========================================================================
// Tier 2: Boundary & Corner Cases (Unlink Cleanup & Edge Amounts)
// =========================================================================

#[test]
fn test_f05_t2_unlink_transfer_to_non_transfer_tombstones_peer() {
    let conn = setup_test_db();
    let (acc1, acc2) = setup_two_accounts(&conn);

    // 1. Create a transfer
    let payload = SaveTransactionPayload {
        id: None,
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: acc1.clone(),
        payee_id: None,
        category_id: None,
        date: "2026-03-01".to_string(),
        amount_milliunits: -75000,
        memo: None,
        cleared: Some("Cleared".to_string()),
        approved: Some(true),
        flag: None,
        transfer_account_id: Some(acc2.clone()),
    };

    let source_id = save_transaction(&conn, &payload).unwrap();
    let peer_id: String = conn.query_row(
        "SELECT transfer_transaction_id FROM be_transactions WHERE id = ?1",
        params![source_id],
        |r| r.get(0),
    ).unwrap();

    // 2. Edit source transaction into a non-transfer (transfer_account_id = None)
    // In canonical behavior (PROJECT.md F16), orphaned peer must be tombstoned
    // First, let's see current behavior:
    let edit_payload = SaveTransactionPayload {
        id: Some(source_id.clone()),
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: acc1.clone(),
        payee_id: None,
        category_id: None,
        date: "2026-03-01".to_string(),
        amount_milliunits: -75000,
        memo: Some("Edited to non-transfer".to_string()),
        cleared: Some("Cleared".to_string()),
        approved: Some(true),
        flag: None,
        transfer_account_id: None, // UNLINK!
    };

    save_transaction(&conn, &edit_payload).unwrap();

    // Check if peer was tombstoned
    let peer_tombstone: i64 = conn.query_row(
        "SELECT is_tombstone FROM be_transactions WHERE id = ?1",
        params![peer_id],
        |r| r.get(0),
    ).expect("peer transaction must exist in db");
    assert_eq!(peer_tombstone, 1, "unlinked peer transaction must be tombstoned");
}

#[test]
fn test_f05_t2_zero_amount_transfer() {
    let conn = setup_test_db();
    let (acc1, acc2) = setup_two_accounts(&conn);

    let payload = SaveTransactionPayload {
        id: None,
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: acc1,
        payee_id: None,
        category_id: None,
        date: "2026-03-01".to_string(),
        amount_milliunits: 0,
        memo: Some("Zero transfer test".to_string()),
        cleared: None,
        approved: None,
        flag: None,
        transfer_account_id: Some(acc2),
    };

    let tx_id = save_transaction(&conn, &payload).expect("Zero amount transfer must succeed without error");
    let amt: i64 = conn.query_row("SELECT amount FROM be_transactions WHERE id = ?1", params![tx_id], |r| r.get(0)).unwrap();
    assert_eq!(amt, 0);
}

#[test]
fn test_f05_t2_transfer_on_budget_to_tracking_requires_category() {
    let conn = setup_test_db();
    let acc1 = Uuid::new_v4().to_string();
    let track_acc = Uuid::new_v4().to_string();

    conn.execute("INSERT INTO be_accounts (id, budget_id, account_type, account_name, on_budget) VALUES (?1, ?2, 'checking', 'Checking', 1)", params![acc1, DEFAULT_BUDGET_ID]).unwrap();
    conn.execute("INSERT INTO be_accounts (id, budget_id, account_type, account_name, on_budget) VALUES (?1, ?2, 'otherAsset', 'Brokerage', 0)", params![track_acc, DEFAULT_BUDGET_ID]).unwrap();

    let p1 = Uuid::new_v4().to_string();
    let p2 = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO be_payees (id, budget_id, entities_account_id, name) VALUES (?1, ?2, ?3, 'Transfer : Checking')", params![p1, DEFAULT_BUDGET_ID, acc1]).unwrap();
    conn.execute("INSERT INTO be_payees (id, budget_id, entities_account_id, name) VALUES (?1, ?2, ?3, 'Transfer : Brokerage')", params![p2, DEFAULT_BUDGET_ID, track_acc]).unwrap();

    let subcat_id: String = conn.query_row("SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1", params![DEFAULT_BUDGET_ID], |r| r.get(0)).unwrap();

    let payload = SaveTransactionPayload {
        id: None,
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: acc1,
        payee_id: None,
        category_id: Some(subcat_id.clone()),
        date: "2026-03-01".to_string(),
        amount_milliunits: -100000,
        memo: None,
        cleared: None,
        approved: None,
        flag: None,
        transfer_account_id: Some(track_acc),
    };

    let source_id = save_transaction(&conn, &payload).unwrap();
    let source_cat: Option<String> = conn.query_row("SELECT entities_subcategory_id FROM be_transactions WHERE id = ?1", params![source_id], |r| r.get(0)).unwrap();

    assert_eq!(source_cat, Some(subcat_id), "On-budget leg to tracking account MUST retain its category");
}

#[test]
fn test_f05_t2_transfer_amount_update_synchronizes_peer() {
    let conn = setup_test_db();
    let (acc1, acc2) = setup_two_accounts(&conn);

    let payload = SaveTransactionPayload {
        id: None,
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: acc1.clone(),
        payee_id: None,
        category_id: None,
        date: "2026-03-01".to_string(),
        amount_milliunits: -50000,
        memo: None,
        cleared: Some("Cleared".to_string()),
        approved: Some(true),
        flag: None,
        transfer_account_id: Some(acc2.clone()),
    };

    let source_id = save_transaction(&conn, &payload).unwrap();
    let peer_id: String = conn.query_row("SELECT transfer_transaction_id FROM be_transactions WHERE id = ?1", params![source_id], |r| r.get(0)).unwrap();

    // Update amount from -50000 to -80000
    let update_payload = SaveTransactionPayload {
        id: Some(source_id.clone()),
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: acc1,
        payee_id: None,
        category_id: None,
        date: "2026-03-01".to_string(),
        amount_milliunits: -80000,
        memo: None,
        cleared: Some("Cleared".to_string()),
        approved: Some(true),
        flag: None,
        transfer_account_id: Some(acc2),
    };

    save_transaction(&conn, &update_payload).unwrap();

    let peer_amt: i64 = conn.query_row("SELECT amount FROM be_transactions WHERE id = ?1", params![peer_id], |r| r.get(0)).unwrap();
    assert_eq!(peer_amt, 80000, "Updating transfer amount must synchronize peer transaction to negated amount");
}

#[test]
fn test_f05_t2_delete_transfer_tombstones_both_legs() {
    let conn = setup_test_db();
    let (acc1, acc2) = setup_two_accounts(&conn);

    let payload = SaveTransactionPayload {
        id: None,
        budget_id: DEFAULT_BUDGET_ID.to_string(),
        account_id: acc1,
        payee_id: None,
        category_id: None,
        date: "2026-03-01".to_string(),
        amount_milliunits: -30000,
        memo: None,
        cleared: None,
        approved: None,
        flag: None,
        transfer_account_id: Some(acc2),
    };

    let source_id = save_transaction(&conn, &payload).unwrap();
    let peer_id: String = conn.query_row("SELECT transfer_transaction_id FROM be_transactions WHERE id = ?1", params![source_id], |r| r.get(0)).unwrap();

    // Soft delete both legs (as commands::delete_transactions does)
    conn.execute("UPDATE be_transactions SET is_tombstone = 1 WHERE id IN (?1, ?2)", params![source_id, peer_id]).unwrap();

    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM be_transactions WHERE id IN (?1, ?2) AND is_tombstone = 0",
        params![source_id, peer_id],
        |r| r.get(0),
    ).unwrap();

    assert_eq!(count, 0, "Both transfer legs must be tombstoned");
}
