//! Integration & Unit Tests for YNAB SLIK/Ember Subsystems:
//! - Schema additive migrations (`import_id`, `be_payee_rename_conditions`, indexes)
//! - File Import Parsers (OFX SGML & XML, QIF, CSV/TSV), deterministic `import_id`, deduplication,
//!   payee rename conditions, 10-day 2-way heuristic matcher, `match_transactions`, `unmatch_transaction`
//! - Pure-Integer Loan & Amortization Solver (`solve_amortization`, negative amortization, 600-month cap,
//!   `simulate_loan_payoff`, `be_accounts.debt_*` persistence)
//! - Immutable Recent Moves (`RECENT_MOVES_DAYS_TO_TRACK = 34`, `All|Assigned|Moved`, `subcategory_id`),
//!   `combine_payees`, and `expand_fabricated_scheduled_transfers`.

#![deny(clippy::float_arithmetic)]

use super::common::setup_test_db;
use crate::changeset::{get_undo_redo_state, redo_last_changeset, undo_last_changeset};
use crate::import::{
    add_payee_rename_condition, commit_import, delete_payee_rename_condition, generate_import_id,
    list_payee_rename_conditions, list_payee_rename_conditions_for_payee, match_payee_rename_rules,
    match_transactions, normalize_import_date, parse_csv, parse_money_milliunits, parse_ofx,
    parse_qif, preview_import, unmatch_transaction, unmatch_transaction_with_options,
    DateOrderHint, ImportFileFormat, ImportOptions, ImportRowStatus, PayeeRenameCondition,
    RenameOperator, MATCH_MAX_DAYS_APART,
};
use crate::ledger::money_movements::{
    combine_payees, create_money_movement_group, expand_fabricated_scheduled_transfers,
    list_recent_moves_as_of, record_money_movement, update_money_movement_note,
    MoneyMovementSource, RecentMoveFilter, RecordMoneyMovementPayload, RECENT_MOVES_DAYS_TO_TRACK,
};
use crate::ledger::scheduled::{save_scheduled_transaction, SaveScheduledTransactionPayload};
use crate::ledger::transfers::{save_transaction, SaveTransactionPayload, SubTransactionDto};
use crate::loan::{
    apr_bps_to_milli_percent, calculate_monthly_interest_milliunits, load_loan_account_terms,
    milli_percent_to_apr_bps, minimum_monthly_payment_milliunits, save_loan_account_terms,
    simulate_loan_payoff, solve_amortization, LoanAccountTerms, LoanParams, LoanProgress,
    MAX_AMORTIZATION_MONTHS,
};
use crate::repo::{
    create_account, delete_category, delete_transactions, get_budget_month, CreateAccountPayload,
    DeleteTransactionsPayload,
};
use crate::schema;
use crate::seed::DEFAULT_BUDGET_ID;
use rusqlite::{params, Connection};
use uuid::Uuid;

fn create_checking_account(conn: &Connection, name: &str, starting_milliunits: i64) -> String {
    create_account(
        conn,
        &CreateAccountPayload {
            name: name.to_string(),
            account_type: "checking".to_string(),
            balance_milliunits: starting_milliunits,
            on_budget: Some(true),
            note: None,
        },
        Some(DEFAULT_BUDGET_ID),
    )
    .expect("create_account failed")
    .id
}

fn first_spending_category_id(conn: &Connection) -> (String, String) {
    let summary = get_budget_month(conn, "2026-11-01", Some(DEFAULT_BUDGET_ID))
        .expect("get_budget_month failed");
    for g in &summary.category_groups {
        if !g.is_system && g.categories.len() >= 2 {
            return (g.categories[0].id.clone(), g.categories[1].id.clone());
        }
    }
    panic!("Expected at least two spending categories in seeded budget");
}

// =============================================================================
// 1. Schema Additive Migration Tests
// =============================================================================

#[test]
fn test_schema_idempotent_alter_migration_adds_missing_columns_and_tables() {
    let conn = Connection::open_in_memory().expect("open in-memory db");
    // Simulate a legacy database created before `import_id`, `be_payee_rename_conditions`, etc.
    conn.execute_batch(
        r#"
        CREATE TABLE be_budgets (
            id TEXT PRIMARY KEY,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            budget_id TEXT NOT NULL,
            budget_name TEXT NOT NULL,
            date_format TEXT NOT NULL DEFAULT '{"format":"YYYY-MM-DD"}',
            currency_format TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE be_accounts (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            account_type TEXT NOT NULL,
            account_name TEXT NOT NULL
        );
        CREATE TABLE be_payees (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL,
            entities_account_id TEXT,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            name TEXT NOT NULL
        );
        CREATE TABLE be_subcategories (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL,
            entities_master_category_id TEXT NOT NULL,
            name TEXT NOT NULL
        );
        CREATE TABLE be_transactions (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL,
            entities_account_id TEXT NOT NULL,
            entities_payee_id TEXT,
            entities_subcategory_id TEXT,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            date TEXT NOT NULL,
            amount INTEGER NOT NULL
        );
        CREATE TABLE be_scheduled_transactions (
            id TEXT PRIMARY KEY,
            budget_id TEXT NOT NULL,
            entities_account_id TEXT NOT NULL,
            is_tombstone INTEGER NOT NULL DEFAULT 0,
            date TEXT NOT NULL,
            frequency TEXT NOT NULL,
            amount INTEGER NOT NULL
        );
        "#,
    )
    .unwrap();

    // Run init_database twice to verify idempotent ALTER TABLE & CREATE INDEX
    schema::init_database(&conn).expect("first init_database migration failed");
    schema::init_database(&conn).expect("second init_database migration must be idempotent");

    let mut stmt = conn.prepare("PRAGMA table_info(be_transactions)").unwrap();
    let cols: Vec<String> = stmt
        .query_map([], |r| r.get::<_, String>(1))
        .unwrap()
        .filter_map(Result::ok)
        .collect();
    assert!(cols.contains(&"import_id".to_string()));
    assert!(cols.contains(&"imported_payee".to_string()));
    assert!(cols.contains(&"matched_transaction_id".to_string()));
    assert!(cols.contains(&"source".to_string()));

    let table_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='be_payee_rename_conditions'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(table_exists, 1);
}

// =============================================================================
// 2. Monetary & Date Parsing + Import Parsers
// =============================================================================

#[test]
fn test_parse_money_milliunits_variants() {
    assert_eq!(parse_money_milliunits("$1,234.56"), Some(1_234_560));
    assert_eq!(parse_money_milliunits("-54.32"), Some(-54_320));
    assert_eq!(parse_money_milliunits("(54.32)"), Some(-54_320));
    assert_eq!(parse_money_milliunits("54.32-"), Some(-54_320));
    assert_eq!(parse_money_milliunits("1.234,56"), Some(1_234_560));
    assert_eq!(parse_money_milliunits("-12,50"), Some(-12_500));
    assert_eq!(parse_money_milliunits("0,125"), Some(125));
    assert_eq!(parse_money_milliunits("1,250"), Some(1_250_000));
    assert_eq!(parse_money_milliunits("12.345"), Some(12_345));
    assert_eq!(parse_money_milliunits("12.3456"), Some(12_346)); // half-up
    assert_eq!(parse_money_milliunits("1'234.50"), Some(1_234_500));
    assert_eq!(parse_money_milliunits("0.00"), Some(0));
    assert_eq!(parse_money_milliunits("not-a-number"), None);
}

#[test]
fn test_normalize_import_date_formats() {
    assert_eq!(
        normalize_import_date("20261118120000.000[-5:EST]", DateOrderHint::Auto),
        Some("2026-11-18".to_string())
    );
    assert_eq!(
        normalize_import_date("2026-11-18", DateOrderHint::Auto),
        Some("2026-11-18".to_string())
    );
    assert_eq!(
        normalize_import_date("11/16'26", DateOrderHint::Auto),
        Some("2026-11-16".to_string())
    );
    assert_eq!(
        normalize_import_date("18.11.2026", DateOrderHint::Auto),
        Some("2026-11-18".to_string())
    );
    assert_eq!(
        normalize_import_date("03/04/2026", DateOrderHint::DayFirst),
        Some("2026-04-03".to_string())
    );
    assert_eq!(
        normalize_import_date("03/04/2026", DateOrderHint::MonthFirst),
        Some("2026-03-04".to_string())
    );
    assert_eq!(
        normalize_import_date("02/29/2024", DateOrderHint::MonthFirst),
        Some("2024-02-29".to_string())
    );
    assert_eq!(
        normalize_import_date("02/29/2025", DateOrderHint::MonthFirst),
        None
    );
}

#[test]
fn test_parse_ofx_sgml_tag_soup_and_check_refnum() {
    let sgml = r#"
OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKACCTFROM>
<BANKID>121000358
<ACCTID>99887766
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261110120000[-5:EST]
<TRNAMT>-45.67
<FITID>FIT-1
<REFNUM>REF-IGNORED-FOR-DEBIT
<NAME>TRADER JOE'S &amp; CO
<MEMO><![CDATA[Weekly groceries]]>
<STMTTRN>
<TRNTYPE>CHECK
<DTPOSTED>20261112
<TRNAMT>-1200.00
<FITID>FIT-2
<CHECKNUM>1042
<NAME>LANDLORD LLC
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
"#;
    let parsed = parse_ofx(sgml).expect("parse_ofx SGML failed");
    assert_eq!(parsed.format, ImportFileFormat::Ofx);
    assert_eq!(parsed.account_id_hint.as_deref(), Some("99887766"));
    assert_eq!(parsed.account_type_hint.as_deref(), Some("CHECKING"));
    assert_eq!(parsed.transactions.len(), 2);

    assert_eq!(parsed.transactions[0].date, "2026-11-10");
    assert_eq!(parsed.transactions[0].amount_milliunits, -45_670);
    assert_eq!(parsed.transactions[0].payee_name, "TRADER JOE'S & CO");
    assert_eq!(
        parsed.transactions[0].memo.as_deref(),
        Some("Weekly groceries")
    );
    assert_eq!(parsed.transactions[0].check_number, None);
    assert_eq!(parsed.transactions[0].import_id, "YNAB:-45670:2026-11-10:1");

    assert_eq!(parsed.transactions[1].date, "2026-11-12");
    assert_eq!(parsed.transactions[1].amount_milliunits, -1_200_000);
    assert_eq!(parsed.transactions[1].check_number.as_deref(), Some("1042"));
}

#[test]
fn test_parse_ofx_xml_v2_credit_card() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<OFX>
  <CREDITCARDMSGSRSV1>
    <CCSTMTTRNRS>
      <CCSTMTRS>
        <CCACCTFROM><ACCTID>4111-XXXX</ACCTID></CCACCTFROM>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>CREDIT</TRNTYPE>
            <DTPOSTED>20261115</DTPOSTED>
            <TRNAMT>150.25</TRNAMT>
            <FITID>CC-99</FITID>
            <PAYEE>STATEMENT CREDIT</PAYEE>
            <MEMO>Cashback reward</MEMO>
          </STMTTRN>
        </BANKTRANLIST>
      </CCSTMTRS>
    </CCSTMTTRNRS>
  </CREDITCARDMSGSRSV1>
</OFX>"#;

    let parsed = parse_ofx(xml).expect("parse_ofx XML failed");
    assert_eq!(parsed.account_id_hint.as_deref(), Some("4111-XXXX"));
    assert_eq!(parsed.transactions.len(), 1);
    assert_eq!(parsed.transactions[0].amount_milliunits, 150_250);
    assert_eq!(parsed.transactions[0].payee_name, "STATEMENT CREDIT");
    assert_eq!(parsed.transactions[0].fit_id.as_deref(), Some("CC-99"));
}

#[test]
fn test_parse_qif_bank_and_ccard_with_trailing_minus_and_eof_flush() {
    let qif = r#"!Account
NChecking Main
^
!Type:CCard
D11/16'26
T75.40-
PWhole Foods Market
MOrganic produce
N442
C*
^
D11/18/2026
T500.00
PPaycheck Deposit
C
"#;
    let parsed = parse_qif(qif, DateOrderHint::MonthFirst).expect("parse_qif failed");
    assert_eq!(parsed.format, ImportFileFormat::Qif);
    assert_eq!(parsed.account_id_hint.as_deref(), Some("Checking Main"));
    assert_eq!(parsed.account_type_hint.as_deref(), Some("CCard"));
    assert_eq!(parsed.transactions.len(), 2);

    assert_eq!(parsed.transactions[0].date, "2026-11-16");
    assert_eq!(parsed.transactions[0].amount_milliunits, -75_400);
    assert_eq!(parsed.transactions[0].payee_name, "Whole Foods Market");
    assert_eq!(parsed.transactions[0].check_number.as_deref(), Some("442"));

    // Second record flushed at EOF without trailing '^'
    assert_eq!(parsed.transactions[1].date, "2026-11-18");
    assert_eq!(parsed.transactions[1].amount_milliunits, 500_000);
    assert_eq!(parsed.transactions[1].payee_name, "Paycheck Deposit");
}

#[test]
fn test_parse_csv_outflow_inflow_with_rfc4180_quotes_and_newlines() {
    let csv = concat!(
        "\u{FEFF}Date,Payee,Category,Memo,Outflow,Inflow\r\n",
        "2026-11-05,\"Trader Joe's, Inc.\",Groceries,\"Dinner \"\"party\"\"\nsupplies\",84.50,\r\n",
        "2026-11-06,Employer Payroll,Inflow: Ready to Assign,November pay,,2500.00\r\n"
    );
    let parsed = parse_csv(csv, &ImportOptions::default()).expect("parse_csv failed");
    assert_eq!(parsed.format, ImportFileFormat::Csv);
    assert_eq!(parsed.detected_delimiter, Some(','));
    assert_eq!(parsed.transactions.len(), 2);

    assert_eq!(parsed.transactions[0].payee_name, "Trader Joe's, Inc.");
    assert_eq!(
        parsed.transactions[0].memo.as_deref(),
        Some("Dinner \"party\" supplies")
    );
    assert_eq!(parsed.transactions[0].amount_milliunits, -84_500);
    assert_eq!(
        parsed.transactions[0].category_name.as_deref(),
        Some("Groceries")
    );

    assert_eq!(parsed.transactions[1].amount_milliunits, 2_500_000);
}

#[test]
fn test_parse_csv_single_amount_semicolon_and_tsv_autodetect() {
    let eu_csv = "Date;Payee;Memo;Amount\n18.11.2026;Boulangerie;Croissant;-4,50\n19.11.2026;Refund;Returned;12,00\n";
    let mut opts = ImportOptions::default();
    let parsed_eu = parse_csv(eu_csv, &opts).expect("semicolon CSV failed");
    assert_eq!(parsed_eu.detected_delimiter, Some(';'));
    assert_eq!(parsed_eu.transactions[0].date, "2026-11-18");
    assert_eq!(parsed_eu.transactions[0].amount_milliunits, -4_500);
    assert_eq!(parsed_eu.transactions[1].amount_milliunits, 12_000);

    // swap_inflow_outflow flips signs on Amount
    opts.swap_inflow_outflow = true;
    let tsv = "Date\tPayee\tMemo\tAmount\n2026-11-18\tAmazon\tBooks\t29.99\n";
    let parsed_tsv = parse_csv(tsv, &opts).expect("TSV failed");
    assert_eq!(parsed_tsv.format, ImportFileFormat::Tsv);
    assert_eq!(parsed_tsv.detected_delimiter, Some('\t'));
    assert_eq!(parsed_tsv.transactions[0].amount_milliunits, -29_990);
}

#[test]
fn test_generate_import_id_deterministic_occurrence_numbering() {
    assert_eq!(
        generate_import_id(-5500, "2026-11-18", 1),
        "YNAB:-5500:2026-11-18:1"
    );

    let csv = "Date,Payee,Memo,Amount\n2026-11-18,Coffee,Latte,-5.50\n2026-11-18,Coffee,Latte,-5.50\n2026-11-18,Coffee,Muffin,-5.50\n";
    let parsed = parse_csv(csv, &ImportOptions::default()).unwrap();
    assert_eq!(parsed.transactions[0].import_id, "YNAB:-5500:2026-11-18:1");
    assert_eq!(parsed.transactions[1].import_id, "YNAB:-5500:2026-11-18:2");
    assert_eq!(parsed.transactions[2].import_id, "YNAB:-5500:2026-11-18:3");
}

// =============================================================================
// 3. Payee Rename Rules, Deduplication, Heuristic Matching & Unmatch
// =============================================================================

#[test]
fn test_payee_rename_conditions_precedence_is_contains_starts_ends() {
    let rules = vec![
        PayeeRenameCondition {
            id: "r4".into(),
            budget_id: DEFAULT_BUDGET_ID.into(),
            payee_id: "p_ends".into(),
            operator: RenameOperator::EndsWith,
            operand: "MARKET".into(),
        },
        PayeeRenameCondition {
            id: "r3".into(),
            budget_id: DEFAULT_BUDGET_ID.into(),
            payee_id: "p_starts".into(),
            operator: RenameOperator::StartsWith,
            operand: "WHOLE".into(),
        },
        PayeeRenameCondition {
            id: "r2".into(),
            budget_id: DEFAULT_BUDGET_ID.into(),
            payee_id: "p_contains".into(),
            operator: RenameOperator::Contains,
            operand: "FOODS".into(),
        },
        PayeeRenameCondition {
            id: "r1".into(),
            budget_id: DEFAULT_BUDGET_ID.into(),
            payee_id: "p_is".into(),
            operator: RenameOperator::Is,
            operand: "WHOLE FOODS MARKET".into(),
        },
    ];

    // Exact Is beats Contains/StartsWith/EndsWith
    assert_eq!(
        match_payee_rename_rules(&rules, "whole foods market").map(|r| r.payee_id.as_str()),
        Some("p_is")
    );
    // Contains beats StartsWith/EndsWith
    assert_eq!(
        match_payee_rename_rules(&rules, "WHOLE FOODS #102").map(|r| r.payee_id.as_str()),
        Some("p_contains")
    );
    // StartsWith beats EndsWith
    assert_eq!(
        match_payee_rename_rules(&rules, "WHOLE EARTH MARKET").map(|r| r.payee_id.as_str()),
        Some("p_starts")
    );
    // EndsWith matches last
    assert_eq!(
        match_payee_rename_rules(&rules, "TRADER MARKET").map(|r| r.payee_id.as_str()),
        Some("p_ends")
    );
}

#[test]
fn test_preview_and_commit_import_deduplication_and_payee_enrichment() {
    let mut conn = setup_test_db();
    let acc_id = create_checking_account(&conn, "Checking", 1_000_000);
    let (groceries_cat, _) = first_spending_category_id(&conn);

    // Seed a clean Payee + autofill category + rename rule
    let starbucks_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_payees (id, budget_id, name, enabled, auto_fill_subcategory_id) VALUES (?1, ?2, 'Starbucks', 1, ?3)",
        params![starbucks_id, DEFAULT_BUDGET_ID, groceries_cat],
    )
    .unwrap();
    add_payee_rename_condition(
        &conn,
        DEFAULT_BUDGET_ID,
        &starbucks_id,
        RenameOperator::Contains,
        "STARBUCKS STORE",
    )
    .unwrap();

    let csv = "Date,Payee,Memo,Amount\n2026-11-10,STARBUCKS STORE #4412,Coffee,-6.75\n2026-11-11,NEW BAKERY,Croissant,-4.25\n";
    let opts = ImportOptions::default();

    let preview1 = preview_import(
        &conn,
        DEFAULT_BUDGET_ID,
        &acc_id,
        Some("bank.csv"),
        csv,
        &opts,
    )
    .expect("preview1 failed");
    assert_eq!(preview1.new_count, 2);
    assert_eq!(preview1.matched_count, 0);
    assert_eq!(preview1.duplicate_count, 0);
    assert_eq!(preview1.rows[0].resolved_payee_name, "Starbucks");
    assert_eq!(
        preview1.rows[0].resolved_category_id.as_deref(),
        Some(groceries_cat.as_str())
    );
    assert_eq!(preview1.rows[0].imported_payee, "STARBUCKS STORE #4412");

    let commit1 = commit_import(
        &mut conn,
        DEFAULT_BUDGET_ID,
        &acc_id,
        Some("bank.csv"),
        csv,
        &opts,
    )
    .expect("commit1 failed");
    assert_eq!(commit1.imported_count, 2);
    assert_eq!(commit1.created_payee_count, 1); // NEW BAKERY created

    // Re-importing the exact same file must deduplicate 100%
    let preview2 = preview_import(
        &conn,
        DEFAULT_BUDGET_ID,
        &acc_id,
        Some("bank.csv"),
        csv,
        &opts,
    )
    .expect("preview2 failed");
    assert_eq!(preview2.new_count, 0);
    assert_eq!(preview2.duplicate_count, 2);

    let commit2 = commit_import(
        &mut conn,
        DEFAULT_BUDGET_ID,
        &acc_id,
        Some("bank.csv"),
        csv,
        &opts,
    )
    .expect("commit2 failed");
    assert_eq!(commit2.imported_count, 0);
    assert_eq!(commit2.skipped_duplicate_count, 2);
}

#[test]
fn test_heuristic_matcher_10_day_window_closest_date_and_no_transfers() {
    assert_eq!(MATCH_MAX_DAYS_APART, 10);

    let conn = setup_test_db();
    let acc_a = create_checking_account(&conn, "Checking A", 5_000_000);
    let acc_b = create_checking_account(&conn, "Savings B", 1_000_000);
    let (cat_id, _) = first_spending_category_id(&conn);

    // 1. Manual tx exactly 10 days before imported date (should match)
    let tx_10d = save_transaction(
        &conn,
        &SaveTransactionPayload {
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: acc_a.clone(),
            payee_name: Some("Manual Groceries".into()),
            category_id: Some(cat_id.clone()),
            date: "2026-11-01".into(),
            amount_milliunits: -50_000,
            cleared: Some("Uncleared".into()),
            ..Default::default()
        },
    )
    .unwrap();

    // 2. Manual tx 11 days before imported date (must NOT match)
    let _tx_11d = save_transaction(
        &conn,
        &SaveTransactionPayload {
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: acc_a.clone(),
            payee_name: Some("Old Expense".into()),
            category_id: Some(cat_id.clone()),
            date: "2026-11-01".into(),
            amount_milliunits: -77_000,
            cleared: Some("Uncleared".into()),
            ..Default::default()
        },
    )
    .unwrap();

    // 3. Transfer tx on same date & amount (must NOT match)
    let _tx_transfer = save_transaction(
        &conn,
        &SaveTransactionPayload {
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: acc_a.clone(),
            transfer_account_id: Some(acc_b),
            date: "2026-11-11".into(),
            amount_milliunits: -120_000,
            cleared: Some("Uncleared".into()),
            ..Default::default()
        },
    )
    .unwrap();

    let csv = concat!(
        "Date,Payee,Memo,Amount\n",
        "2026-11-11,GROCERY MART #99,,-50.00\n",
        "2026-11-12,OUT OF WINDOW,,-77.00\n",
        "2026-11-11,BANK XFER,,-120.00\n"
    );
    let preview = preview_import(
        &conn,
        DEFAULT_BUDGET_ID,
        &acc_a,
        Some("test.csv"),
        csv,
        &ImportOptions::default(),
    )
    .unwrap();

    assert_eq!(preview.rows[0].status, ImportRowStatus::AutoMatched);
    assert_eq!(
        preview.rows[0].matched_transaction_id.as_deref(),
        Some(tx_10d.as_str())
    );
    assert_eq!(preview.rows[1].status, ImportRowStatus::New);
    assert_eq!(preview.rows[2].status, ImportRowStatus::New);
}

#[test]
fn test_match_transactions_keeps_manual_metadata_tombstones_duplicate_and_unmatch_restores() {
    let mut conn = setup_test_db();
    let acc_id = create_checking_account(&conn, "Checking", 1_000_000);
    let (cat_id, _) = first_spending_category_id(&conn);

    let manual_id = save_transaction(
        &conn,
        &SaveTransactionPayload {
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: acc_id.clone(),
            payee_name: Some("Trader Joe's".into()),
            category_id: Some(cat_id.clone()),
            date: "2026-11-14".into(),
            amount_milliunits: -64_250,
            memo: Some("Weekly food".into()),
            cleared: Some("Uncleared".into()),
            ..Default::default()
        },
    )
    .unwrap();

    // Commit imported transaction WITHOUT auto_match first so we can test explicit match_transactions + unmatch_transaction
    let csv = "Date,Payee,Memo,Amount\n2026-11-16,TRADER JOES #552,,-64.25\n";
    let no_auto = ImportOptions {
        auto_match: false,
        ..Default::default()
    };
    let commit = commit_import(
        &mut conn,
        DEFAULT_BUDGET_ID,
        &acc_id,
        Some("bank.csv"),
        csv,
        &no_auto,
    )
    .unwrap();
    let imported_id = commit.imported_transaction_ids[0].clone();

    match_transactions(&mut conn, &manual_id, &imported_id).expect("match_transactions failed");

    // Manual tx keeps manual date, payee, category, becomes Cleared, gets matched_transaction_id & imported_payee
    struct MatchedTxSummary {
        date: String,
        payee_name: String,
        subcat: Option<String>,
        cleared: String,
        matched_id: Option<String>,
        imp_payee: Option<String>,
        imp_id: Option<String>,
        source: Option<String>,
    }
    let summary = conn
        .query_row(
            r#"SELECT t.date, p.name, t.entities_subcategory_id, t.cleared,
                      t.matched_transaction_id, t.imported_payee, t.import_id, t.source
               FROM be_transactions t
               JOIN be_payees p ON t.entities_payee_id = p.id
               WHERE t.id = ?1 AND t.is_tombstone = 0"#,
            params![manual_id],
            |r| {
                Ok(MatchedTxSummary {
                    date: r.get(0)?,
                    payee_name: r.get(1)?,
                    subcat: r.get(2)?,
                    cleared: r.get(3)?,
                    matched_id: r.get(4)?,
                    imp_payee: r.get(5)?,
                    imp_id: r.get(6)?,
                    source: r.get(7)?,
                })
            },
        )
        .unwrap();

    assert_eq!(summary.date, "2026-11-14");
    assert_eq!(summary.payee_name, "Trader Joe's");
    assert_eq!(summary.subcat.as_deref(), Some(cat_id.as_str()));
    assert_eq!(summary.cleared, "Cleared");
    assert_eq!(summary.matched_id.as_deref(), Some(imported_id.as_str()));
    assert_eq!(summary.imp_payee.as_deref(), Some("TRADER JOES #552"));
    assert_eq!(summary.imp_id.as_deref(), Some("YNAB:-64250:2026-11-16:1"));
    assert_eq!(summary.source.as_deref(), Some("Matched"));

    // Duplicate imported tx is tombstoned
    let imp_tomb: i32 = conn
        .query_row(
            "SELECT is_tombstone FROM be_transactions WHERE id = ?1",
            params![imported_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(imp_tomb, 1);

    // Re-importing the CSV still detects duplicate because import_id survived on manual_tx
    let re_preview = preview_import(
        &conn,
        DEFAULT_BUDGET_ID,
        &acc_id,
        Some("bank.csv"),
        csv,
        &ImportOptions::default(),
    )
    .unwrap();
    assert_eq!(re_preview.duplicate_count, 1);

    // ChangeSetRecorder recorded Match Transactions
    let undo_state = get_undo_redo_state(&conn, DEFAULT_BUDGET_ID).unwrap();
    assert!(undo_state.can_undo);
    assert_eq!(undo_state.undo_label.as_deref(), Some("Match Transactions"));

    // Account balance shouldn't double-count the tombstoned duplicate
    let (cleared_bal, uncleared_bal): (i64, i64) = conn
        .query_row(
            "SELECT cleared_balance, uncleared_balance FROM be_accounts WHERE id = ?1",
            params![acc_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();
    assert_eq!(cleared_bal, 1_000_000 - 64_250);
    assert_eq!(uncleared_bal, 0);

    // Now unmatch and verify full restoration
    let restored_id = unmatch_transaction(&mut conn, &manual_id).expect("unmatch failed");
    assert_eq!(restored_id, imported_id);

    let (m_cleared_after, m_matched_after): (String, Option<String>) = conn
        .query_row(
            "SELECT cleared, matched_transaction_id FROM be_transactions WHERE id = ?1",
            params![manual_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();
    assert_eq!(m_cleared_after, "Uncleared");
    assert_eq!(m_matched_after, None);

    let (i_tomb_after, i_source_after, i_cleared_after): (i32, Option<String>, String) = conn
        .query_row(
            "SELECT is_tombstone, source, cleared FROM be_transactions WHERE id = ?1",
            params![imported_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .unwrap();
    assert_eq!(i_tomb_after, 0);
    assert_eq!(i_source_after.as_deref(), Some("Imported"));
    assert_eq!(i_cleared_after, "Cleared");
}

#[test]
fn test_commit_import_with_auto_match_and_changeset_undo() {
    let mut conn = setup_test_db();
    let acc_id = create_checking_account(&conn, "Checking", 2_000_000);
    let (cat_id, _) = first_spending_category_id(&conn);

    let manual_id = save_transaction(
        &conn,
        &SaveTransactionPayload {
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: acc_id.clone(),
            payee_name: Some("Electric Utility".into()),
            category_id: Some(cat_id),
            date: "2026-11-10".into(),
            amount_milliunits: -125_000,
            cleared: Some("Uncleared".into()),
            ..Default::default()
        },
    )
    .unwrap();

    let csv = "Date,Payee,Memo,Amount\n2026-11-12,CITY ELECTRIC AUTOPAY,,-125.00\n2026-11-13,CAFE ROASTERS,,-8.50\n";
    let res = commit_import(
        &mut conn,
        DEFAULT_BUDGET_ID,
        &acc_id,
        Some("stmt.csv"),
        csv,
        &ImportOptions::default(),
    )
    .unwrap();

    assert_eq!(res.matched_count, 1);
    assert_eq!(res.imported_count, 1);
    assert_eq!(res.matched_transaction_ids, vec![manual_id.clone()]);

    let manual_cleared: String = conn
        .query_row(
            "SELECT cleared FROM be_transactions WHERE id = ?1",
            params![manual_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(manual_cleared, "Cleared");

    // Undo match changeset restores manual tx state cleanly
    let undone = undo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).unwrap();
    assert!(undone);
    let manual_cleared_undone: String = conn
        .query_row(
            "SELECT cleared FROM be_transactions WHERE id = ?1",
            params![manual_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(manual_cleared_undone, "Uncleared");
}

// =============================================================================
// 4. Pure-Integer Loan & Amortization Solver
// =============================================================================

#[test]
fn test_loan_monthly_interest_half_up_and_apr_bps_conversion() {
    assert_eq!(apr_bps_to_milli_percent(650), 6_500);
    assert_eq!(milli_percent_to_apr_bps(6_500), 650);

    // $100,000.00 at 6.000% APR => $500.00/mo exact
    assert_eq!(
        calculate_monthly_interest_milliunits(100_000_000, 6_000),
        500_000
    );
    // $100,000.00 at 6.500% APR => 541,666.666... => 541,667 milliunits half-up
    assert_eq!(
        calculate_monthly_interest_milliunits(100_000_000, 6_500),
        541_667
    );
    assert_eq!(calculate_monthly_interest_milliunits(0, 6_500), 0);
    assert_eq!(calculate_monthly_interest_milliunits(100_000_000, 0), 0);
    assert_eq!(
        minimum_monthly_payment_milliunits(100_000_000, 6_000, 250_000),
        750_010
    );
}

#[test]
fn test_loan_solve_amortization_30yr_mortgage_payment_from_term() {
    // $300,000 at 6.000% over 360 months -> standard P&I is ~$1,798.65 ($1,798,652 milliunits)
    let params = LoanParams::with_apr_bps(300_000_000, 600, None, 0, Some(360), "2026-01-01");
    let res = solve_amortization(&params).expect("solve_amortization failed");

    assert_eq!(res.progress, LoanProgress::Positive);
    assert!(!res.is_negative_amortization);
    assert!(!res.capped_at_max_months);
    assert_eq!(res.months_count, 360);
    assert_eq!(res.final_balance_milliunits, 0);
    assert_eq!(res.total_principal_milliunits, 300_000_000);
    assert_eq!(res.payoff_date.as_deref(), Some("2055-12-01"));

    // Verify solved P&I is within $0.05 of continuous annuity $1,798.65
    assert!((1_798_600..=1_798_700).contains(&res.monthly_pi_payment_milliunits));

    // Verify invariant on every row: principal + interest + escrow == total_payment,
    // and ending_balance == starting_balance - principal
    for row in &res.schedule {
        assert_eq!(
            row.principal_milliunits + row.interest_milliunits + row.escrow_milliunits,
            row.total_payment_milliunits
        );
        assert_eq!(
            row.starting_balance_milliunits - row.principal_milliunits,
            row.ending_balance_milliunits
        );
    }
}

#[test]
fn test_loan_solve_amortization_with_escrow_and_payoff_date() {
    let params = LoanParams::new(
        20_000_000,    // $20,000.00
        5_000,         // 5.000% APR
        Some(500_000), // $500.00 total monthly payment
        100_000,       // $100.00 monthly escrow
        None,
        "2026-01-31", // tests end-of-month calendar stepping (Jan 31 -> Feb 28 -> Mar 31)
    );
    let res = solve_amortization(&params).unwrap();
    assert_eq!(res.progress, LoanProgress::Positive);
    assert!(!res.is_negative_amortization);
    assert_eq!(res.monthly_pi_payment_milliunits, 400_000);
    assert_eq!(res.monthly_escrow_milliunits, 100_000);
    assert_eq!(res.total_principal_milliunits, 20_000_000);
    assert_eq!(res.final_balance_milliunits, 0);
    assert!(res.months_count > 50 && res.months_count < 60);
    assert_eq!(res.schedule[0].date, "2026-01-31");
    assert_eq!(res.schedule[1].date, "2026-02-28");
    assert_eq!(res.schedule[2].date, "2026-03-31");
    assert_eq!(
        res.total_escrow_milliunits,
        100_000 * (res.months_count as i64)
    );
}

#[test]
fn test_loan_solve_amortization_zero_percent_apr() {
    let params = LoanParams::new(12_000_000, 0, None, 0, Some(12), "2026-01-01");
    let res = solve_amortization(&params).unwrap();
    assert_eq!(res.monthly_pi_payment_milliunits, 1_000_000);
    assert_eq!(res.total_interest_milliunits, 0);
    assert_eq!(res.months_count, 12);
    assert_eq!(res.final_balance_milliunits, 0);
}

#[test]
fn test_loan_negative_amortization_and_600_month_cap() {
    // $100,000 at 12.000% APR => $1,000.00 first month interest
    // Case A: payment = $800.00 (< $1,000 interest) -> Negative amortization, capped at 600 months
    let neg_params = LoanParams::new(100_000_000, 12_000, Some(800_000), 0, None, "2026-01-01");
    let neg_res = solve_amortization(&neg_params).unwrap();
    assert_eq!(neg_res.progress, LoanProgress::Negative);
    assert!(neg_res.is_negative_amortization);
    assert!(neg_res.capped_at_max_months);
    assert_eq!(neg_res.months_count, MAX_AMORTIZATION_MONTHS);
    assert_eq!(neg_res.payoff_date, None);
    assert!(neg_res.final_balance_milliunits > 100_000_000);

    // Case B: payment == interest ($1,000.00) -> Constant balance, still flagged (`payment <= monthly_interest`)
    let const_params = LoanParams::new(100_000_000, 12_000, Some(1_000_000), 0, None, "2026-01-01");
    let const_res = solve_amortization(&const_params).unwrap();
    assert_eq!(const_res.progress, LoanProgress::Constant);
    assert!(const_res.is_negative_amortization);
    assert!(const_res.capped_at_max_months);
    assert_eq!(const_res.months_count, MAX_AMORTIZATION_MONTHS);
    assert_eq!(const_res.final_balance_milliunits, 100_000_000);
    assert_eq!(const_res.payoff_date, None);
}

#[test]
fn test_loan_simulate_payoff_extra_monthly_and_one_time_extra() {
    // Term-solved 30-year $200,000 mortgage at 6.500% APR
    let params = LoanParams::new(200_000_000, 6_500, None, 300_000, Some(360), "2026-01-01");
    let sim = simulate_loan_payoff(&params, 250_000, 10_000_000).expect("simulate failed");

    assert_eq!(sim.baseline.months_count, 360);
    assert!(sim.accelerated.months_count < 260);
    assert!(sim.months_saved > 100);
    assert!(sim.interest_saved_milliunits > 80_000_000);
    assert_eq!(
        sim.accelerated.starting_balance_milliunits,
        190_000_000 // $200k - $10k one-time extra
    );
    assert_eq!(sim.accelerated.final_balance_milliunits, 0);
}

#[test]
fn test_loan_be_accounts_debt_columns_roundtrip() {
    let conn = setup_test_db();
    let loan_acc = create_account(
        &conn,
        &CreateAccountPayload {
            name: "Home Mortgage".into(),
            account_type: "mortgage".into(),
            balance_milliunits: -250_000_000,
            on_budget: Some(false),
            note: None,
        },
        Some(DEFAULT_BUDGET_ID),
    )
    .unwrap();

    save_loan_account_terms(
        &conn,
        &LoanAccountTerms {
            account_id: loan_acc.id.clone(),
            start_date: Some("2026-01-01".into()),
            original_balance_milliunits: Some(260_000_000),
            current_balance_milliunits: 250_000_000,
            apr_milli_percent: 6_250,
            minimum_payment_milliunits: 1_900_000,
            escrow_milliunits: 350_000,
            asset_value_milliunits: Some(400_000_000),
        },
    )
    .expect("save_loan_account_terms failed");

    let loaded = load_loan_account_terms(&conn, &loan_acc.id).expect("load failed");
    assert_eq!(loaded.start_date.as_deref(), Some("2026-01-01"));
    assert_eq!(loaded.original_balance_milliunits, Some(260_000_000));
    assert_eq!(loaded.current_balance_milliunits, 250_000_000);
    assert_eq!(loaded.apr_milli_percent, 6_250);
    assert_eq!(loaded.minimum_payment_milliunits, 1_900_000);
    assert_eq!(loaded.escrow_milliunits, 350_000);
    assert_eq!(loaded.asset_value_milliunits, Some(400_000_000));
}

// =============================================================================
// 5. Recent Moves, Combine Payees & Fabricated Scheduled Transfers
// =============================================================================

#[test]
fn test_money_movements_immutable_record_and_negative_swap() {
    let conn = setup_test_db();
    let (cat_a, cat_b) = first_spending_category_id(&conn);

    // Negative amount swaps from <-> to and stores positive amount (YNAB SLIK rule)
    let entry = record_money_movement(
        &conn,
        &RecordMoneyMovementPayload {
            budget_id: DEFAULT_BUDGET_ID.into(),
            month: "2026-11-01".into(),
            from_subcategory_id: Some(cat_a.clone()),
            to_subcategory_id: Some(cat_b.clone()),
            amount_milliunits: -25_000,
            source: Some(MoneyMovementSource::ManualMovement),
            group_id: None,
            note: Some("Initial note".into()),
            performed_by_user_id: Some("user-1".into()),
            move_started_at: Some("2026-11-18T10:00:00Z".into()),
        },
    )
    .expect("record_money_movement failed");

    assert_eq!(entry.amount_milliunits, 25_000);
    assert_eq!(entry.from_subcategory_id.as_deref(), Some(cat_b.as_str()));
    assert_eq!(entry.to_subcategory_id.as_deref(), Some(cat_a.as_str()));
    assert!(!entry.is_assignment);

    update_money_movement_note(&conn, &entry.id, Some("Updated note"))
        .expect("note update should succeed");
    let stored_note: Option<String> = conn
        .query_row(
            "SELECT note FROM be_money_movements WHERE id = ?1",
            params![entry.id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(stored_note.as_deref(), Some("Updated note"));
}

#[test]
fn test_list_recent_moves_34_day_window_filters_and_subcategory() {
    assert_eq!(RECENT_MOVES_DAYS_TO_TRACK, 34);
    let conn = setup_test_db();
    let (cat_a, cat_b) = first_spending_category_id(&conn);

    // 1. Assigned from RTA, 2 days ago (included in All & Assigned)
    record_money_movement(
        &conn,
        &RecordMoneyMovementPayload {
            budget_id: DEFAULT_BUDGET_ID.into(),
            month: "2026-11-01".into(),
            from_subcategory_id: None,
            to_subcategory_id: Some(cat_a.clone()),
            amount_milliunits: 100_000,
            source: Some(MoneyMovementSource::ManualAssign),
            group_id: None,
            note: None,
            performed_by_user_id: None,
            move_started_at: Some("2026-11-16T12:00:00Z".into()),
        },
    )
    .unwrap();

    // 2. Moved between categories, exactly 34 days ago (included in All & Moved)
    record_money_movement(
        &conn,
        &RecordMoneyMovementPayload {
            budget_id: DEFAULT_BUDGET_ID.into(),
            month: "2026-10-01".into(),
            from_subcategory_id: Some(cat_a.clone()),
            to_subcategory_id: Some(cat_b.clone()),
            amount_milliunits: 35_000,
            source: Some(MoneyMovementSource::ManualMovement),
            group_id: None,
            note: None,
            performed_by_user_id: None,
            move_started_at: Some("2026-10-15T12:00:00Z".into()),
        },
    )
    .unwrap();

    // 3. Moved 35 days ago (OUTSIDE 34-day window -> must be excluded)
    record_money_movement(
        &conn,
        &RecordMoneyMovementPayload {
            budget_id: DEFAULT_BUDGET_ID.into(),
            month: "2026-10-01".into(),
            from_subcategory_id: Some(cat_b.clone()),
            to_subcategory_id: Some(cat_a.clone()),
            amount_milliunits: 99_000,
            source: Some(MoneyMovementSource::ManualMovement),
            group_id: None,
            note: None,
            performed_by_user_id: None,
            move_started_at: Some("2026-10-14T12:00:00Z".into()),
        },
    )
    .unwrap();

    let all = list_recent_moves_as_of(
        &conn,
        DEFAULT_BUDGET_ID,
        RecentMoveFilter::All,
        None,
        Some("2026-11-18"),
    )
    .unwrap();
    assert_eq!(all.len(), 2);

    let assigned = list_recent_moves_as_of(
        &conn,
        DEFAULT_BUDGET_ID,
        RecentMoveFilter::Assigned,
        None,
        Some("2026-11-18"),
    )
    .unwrap();
    assert_eq!(assigned.len(), 1);
    assert_eq!(assigned[0].from_category_name, "Ready to Assign");
    assert_eq!(assigned[0].amount_milliunits, 100_000);

    let moved = list_recent_moves_as_of(
        &conn,
        DEFAULT_BUDGET_ID,
        RecentMoveFilter::Moved,
        None,
        Some("2026-11-18"),
    )
    .unwrap();
    assert_eq!(moved.len(), 1);
    assert_eq!(moved[0].amount_milliunits, 35_000);

    let cat_b_only = list_recent_moves_as_of(
        &conn,
        DEFAULT_BUDGET_ID,
        RecentMoveFilter::All,
        Some(&cat_b),
        Some("2026-11-18"),
    )
    .unwrap();
    assert_eq!(cat_b_only.len(), 1);
    assert_eq!(cat_b_only[0].amount_milliunits, 35_000);
}

#[test]
fn test_money_movement_group_batch_category_deletion() {
    let conn = setup_test_db();
    let (cat_a, cat_b) = first_spending_category_id(&conn);

    let grp = create_money_movement_group(
        &conn,
        DEFAULT_BUDGET_ID,
        "2026-11-01",
        MoneyMovementSource::CategoryDeletion,
        Some("Moved during category delete"),
        Some("user-1"),
        Some(&cat_a),
    )
    .unwrap();

    let m1 = record_money_movement(
        &conn,
        &RecordMoneyMovementPayload {
            budget_id: DEFAULT_BUDGET_ID.into(),
            month: "2026-11-01".into(),
            from_subcategory_id: Some(cat_a),
            to_subcategory_id: Some(cat_b),
            amount_milliunits: 50_000,
            source: Some(MoneyMovementSource::CategoryDeletion),
            group_id: Some(grp.id.clone()),
            note: None,
            performed_by_user_id: Some("user-1".into()),
            move_started_at: None,
        },
    )
    .unwrap();

    assert_eq!(m1.group_id.as_deref(), Some(grp.id.as_str()));
    assert_eq!(m1.source, "category_deletion");
}

#[test]
fn test_combine_payees_into_new_name_updates_tx_and_scheduled_adds_rename_rules() {
    let mut conn = setup_test_db();
    let acc_id = create_checking_account(&conn, "Checking", 1_000_000);
    let (cat_id, _) = first_spending_category_id(&conn);

    let p1 = Uuid::new_v4().to_string();
    let p2 = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_payees (id, budget_id, name, enabled, auto_fill_subcategory_id) VALUES (?1, ?2, 'AMZN Mktp US*1', 1, ?3)",
        params![p1, DEFAULT_BUDGET_ID, cat_id],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO be_payees (id, budget_id, name, enabled) VALUES (?1, ?2, 'AMAZON.COM*2', 1)",
        params![p2, DEFAULT_BUDGET_ID],
    )
    .unwrap();

    let tx1 = save_transaction(
        &conn,
        &SaveTransactionPayload {
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: acc_id.clone(),
            payee_id: Some(p1.clone()),
            category_id: Some(cat_id.clone()),
            date: "2026-11-10".into(),
            amount_milliunits: -25_000,
            ..Default::default()
        },
    )
    .unwrap();
    let tx2 = save_transaction(
        &conn,
        &SaveTransactionPayload {
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: acc_id.clone(),
            payee_id: Some(p2.clone()),
            category_id: Some(cat_id.clone()),
            date: "2026-11-11".into(),
            amount_milliunits: -40_000,
            ..Default::default()
        },
    )
    .unwrap();

    let sched_id = save_scheduled_transaction(
        &conn,
        &SaveScheduledTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: acc_id,
            payee_id: Some(p2.clone()),
            category_id: Some(cat_id),
            date: "2026-12-01".into(),
            frequency: "Monthly".into(),
            amount_milliunits: -14_990,
            memo: Some("Prime".into()),
            flag: None,
            transfer_account_id: None,
        },
    )
    .unwrap();

    let res = combine_payees(
        &mut conn,
        DEFAULT_BUDGET_ID,
        &[p1.clone(), p2.clone()],
        "Amazon",
    )
    .expect("combine_payees failed");

    assert_eq!(res.target_payee_name, "Amazon");
    assert_eq!(res.merged_payee_ids.len(), 2);
    assert_eq!(res.updated_transactions_count, 2);
    assert_eq!(res.updated_scheduled_transactions_count, 1);
    assert_eq!(res.created_rename_conditions_count, 2);

    // Transactions & scheduled transaction point to new target_payee_id
    for tid in [&tx1, &tx2] {
        let pid: String = conn
            .query_row(
                "SELECT entities_payee_id FROM be_transactions WHERE id = ?1",
                params![tid],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(pid, res.target_payee_id);
    }
    let sched_pid: String = conn
        .query_row(
            "SELECT entities_payee_id FROM be_scheduled_transactions WHERE id = ?1",
            params![sched_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(sched_pid, res.target_payee_id);

    // Merged source payees are tombstoned
    for old_id in [&p1, &p2] {
        let tomb: i32 = conn
            .query_row(
                "SELECT is_tombstone FROM be_payees WHERE id = ?1",
                params![old_id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(tomb, 1);
    }

    // Auto-rename conditions created for future imports
    let rules = list_payee_rename_conditions(&conn, DEFAULT_BUDGET_ID).unwrap();
    assert_eq!(
        match_payee_rename_rules(&rules, "AMZN Mktp US*1").map(|r| r.payee_id.as_str()),
        Some(res.target_payee_id.as_str())
    );
    assert_eq!(
        match_payee_rename_rules(&rules, "AMAZON.COM*2").map(|r| r.payee_id.as_str()),
        Some(res.target_payee_id.as_str())
    );

    let target_rules = list_payee_rename_conditions_for_payee(&conn, &res.target_payee_id).unwrap();
    assert_eq!(target_rules.len(), 2);
    delete_payee_rename_condition(&conn, &target_rules[0].id).unwrap();
    assert_eq!(
        list_payee_rename_conditions_for_payee(&conn, &res.target_payee_id)
            .unwrap()
            .len(),
        1
    );

    let undo = get_undo_redo_state(&conn, DEFAULT_BUDGET_ID).unwrap();
    assert_eq!(undo.undo_label.as_deref(), Some("Combine Payees"));
}

#[test]
fn test_combine_payees_into_existing_payee_id_and_rejects_transfer_payee() {
    let mut conn = setup_test_db();
    let acc_id = create_checking_account(&conn, "Checking", 500_000);

    let p1 = Uuid::new_v4().to_string();
    let p2 = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_payees (id, budget_id, name, enabled) VALUES (?1, ?2, 'Target Coffee', 1)",
        params![p1, DEFAULT_BUDGET_ID],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO be_payees (id, budget_id, name, enabled) VALUES (?1, ?2, 'COFFEE KIOSK #9', 1)",
        params![p2, DEFAULT_BUDGET_ID],
    )
    .unwrap();

    let res = combine_payees(&mut conn, DEFAULT_BUDGET_ID, &[p1.clone(), p2.clone()], &p1)
        .expect("combine into existing id failed");
    assert_eq!(res.target_payee_id, p1);
    assert_eq!(res.merged_payee_ids, vec![p2.clone()]);

    let p1_tomb: i32 = conn
        .query_row(
            "SELECT is_tombstone FROM be_payees WHERE id = ?1",
            params![p1],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(p1_tomb, 0);

    let transfer_payee_id = format!("payee/transfer/{}", acc_id);
    let err = combine_payees(
        &mut conn,
        DEFAULT_BUDGET_ID,
        &[transfer_payee_id],
        "Should Fail",
    );
    assert!(err.is_err());
}

#[test]
fn test_expand_fabricated_scheduled_transfers_for_destination_and_splits() {
    let conn = setup_test_db();
    let checking_id = create_checking_account(&conn, "Checking", 2_000_000);
    let savings_id = create_checking_account(&conn, "Savings", 1_000_000);
    let emergency_id = create_checking_account(&conn, "Emergency Fund", 500_000);
    let (cat_id, _) = first_spending_category_id(&conn);

    // 1. Direct scheduled transfer from Checking -> Savings (-$400.00)
    let sched_xfer_id = save_scheduled_transaction(
        &conn,
        &SaveScheduledTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: checking_id.clone(),
            payee_id: Some(format!("payee/transfer/{}", savings_id)),
            category_id: None,
            date: "2026-12-01".into(),
            frequency: "Monthly".into(),
            amount_milliunits: -400_000,
            memo: Some("Monthly savings".into()),
            flag: Some("Blue".into()),
            transfer_account_id: Some(savings_id.clone()),
        },
    )
    .unwrap();

    // 2. Split scheduled transaction on Checking where one subtransaction transfers to Emergency Fund (-$150.00)
    let split_sched_id = save_scheduled_transaction(
        &conn,
        &SaveScheduledTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: checking_id.clone(),
            payee_id: None,
            category_id: None,
            date: "2026-12-05".into(),
            frequency: "Monthly".into(),
            amount_milliunits: -250_000,
            memo: Some("Paycheck split".into()),
            flag: None,
            transfer_account_id: None,
        },
    )
    .unwrap();
    let sub1_id = Uuid::new_v4().to_string();
    let sub2_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_scheduled_subtransactions (
               id, budget_id, entities_scheduled_transaction_id, entities_subcategory_id,
               is_tombstone, amount, memo, transfer_account_id, sortable_index
           ) VALUES (?1, ?2, ?3, ?4, 0, -100000, 'Bills', NULL, 100)"#,
        params![sub1_id, DEFAULT_BUDGET_ID, split_sched_id, cat_id],
    )
    .unwrap();
    conn.execute(
        r#"INSERT INTO be_scheduled_subtransactions (
               id, budget_id, entities_scheduled_transaction_id, entities_subcategory_id,
               is_tombstone, amount, memo, transfer_account_id, sortable_index
           ) VALUES (?1, ?2, ?3, NULL, 0, -150000, 'Emergency transfer', ?4, 200)"#,
        params![sub2_id, DEFAULT_BUDGET_ID, split_sched_id, emergency_id],
    )
    .unwrap();

    // Listing Savings shows fabricated counterpart (+$400.00, payee = Transfer : Checking)
    let savings_rows =
        expand_fabricated_scheduled_transfers(&conn, DEFAULT_BUDGET_ID, Some(&savings_id)).unwrap();
    assert_eq!(savings_rows.len(), 1);
    assert!(savings_rows[0].is_fabricated);
    assert_eq!(
        savings_rows[0].source_scheduled_transaction_id.as_deref(),
        Some(sched_xfer_id.as_str())
    );
    assert_eq!(savings_rows[0].scheduled.account_id, savings_id);
    assert_eq!(
        savings_rows[0].scheduled.transfer_account_id.as_deref(),
        Some(checking_id.as_str())
    );
    assert_eq!(savings_rows[0].scheduled.amount_milliunits, 400_000);
    assert_eq!(
        savings_rows[0].scheduled.payee_name.as_deref(),
        Some("Transfer : Checking")
    );

    // Listing Emergency Fund shows fabricated split subtransaction counterpart (+$150.00)
    let emergency_rows =
        expand_fabricated_scheduled_transfers(&conn, DEFAULT_BUDGET_ID, Some(&emergency_id))
            .unwrap();
    assert_eq!(emergency_rows.len(), 1);
    assert!(emergency_rows[0].is_fabricated);
    assert_eq!(
        emergency_rows[0]
            .source_scheduled_subtransaction_id
            .as_deref(),
        Some(sub2_id.as_str())
    );
    assert_eq!(emergency_rows[0].scheduled.amount_milliunits, 150_000);
    assert_eq!(
        emergency_rows[0].scheduled.memo.as_deref(),
        Some("Emergency transfer")
    );

    // Listing Checking shows only the 2 real rows (is_fabricated = false)
    let checking_rows =
        expand_fabricated_scheduled_transfers(&conn, DEFAULT_BUDGET_ID, Some(&checking_id))
            .unwrap();
    assert_eq!(checking_rows.len(), 2);
    assert!(checking_rows.iter().all(|r| !r.is_fabricated));
}

#[test]
fn test_bipartite_closest_date_matching_and_reconciled_lock_on_unmatch() {
    let mut conn = setup_test_db();
    let acc_id = create_checking_account(&conn, "Checking", 1_000_000);
    let (cat_id, _) = first_spending_category_id(&conn);

    // Two manual transactions with identical amount (-$20.00) on Nov 10 and Nov 12
    let manual_nov10 = save_transaction(
        &conn,
        &SaveTransactionPayload {
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: acc_id.clone(),
            payee_name: Some("Manual Nov 10".into()),
            category_id: Some(cat_id.clone()),
            date: "2026-11-10".into(),
            amount_milliunits: -20_000,
            cleared: Some("Uncleared".into()),
            ..Default::default()
        },
    )
    .unwrap();
    let manual_nov12 = save_transaction(
        &conn,
        &SaveTransactionPayload {
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: acc_id.clone(),
            payee_name: Some("Manual Nov 12".into()),
            category_id: Some(cat_id),
            date: "2026-11-12".into(),
            amount_milliunits: -20_000,
            cleared: Some("Uncleared".into()),
            ..Default::default()
        },
    )
    .unwrap();

    // First imported row is Nov 12 (0 days from Nov 12, 2 days from Nov 10)
    // Second imported row is Nov 11 (1 day from Nov 10 and Nov 12)
    let csv =
        "Date,Payee,Memo,Amount\n2026-11-12,MERCHANT A,,-20.00\n2026-11-11,MERCHANT B,,-20.00\n";
    let preview = preview_import(
        &conn,
        DEFAULT_BUDGET_ID,
        &acc_id,
        Some("bipartite.csv"),
        csv,
        &ImportOptions::default(),
    )
    .unwrap();

    assert_eq!(preview.matched_count, 2);
    assert_eq!(
        preview.rows[0].matched_transaction_id.as_deref(),
        Some(manual_nov12.as_str())
    );
    assert_eq!(
        preview.rows[1].matched_transaction_id.as_deref(),
        Some(manual_nov10.as_str())
    );

    // Lock manual_nov10 as Reconciled after matching:
    // 1. Default unmatch_transaction (allow_reconciled = false) MUST fail cleanly without mutating rows.
    // 2. Explicit unlock unmatch_transaction_with_options(..., true) preserves Reconciled and keeps cleared_balance invariant.
    let no_auto = ImportOptions {
        auto_match: false,
        ..Default::default()
    };
    let imp_csv = "Date,Payee,Memo,Amount\n2026-11-10,RECONCILED IMP,,-20.00\n";
    let imp_commit = commit_import(
        &mut conn,
        DEFAULT_BUDGET_ID,
        &acc_id,
        Some("rec.csv"),
        imp_csv,
        &no_auto,
    )
    .unwrap();
    let imp_tx_id = imp_commit.imported_transaction_ids[0].clone();
    match_transactions(&mut conn, &manual_nov10, &imp_tx_id).unwrap();
    conn.execute(
        "UPDATE be_transactions SET cleared = 'Reconciled' WHERE id = ?1",
        params![manual_nov10],
    )
    .unwrap();
    crate::ledger::transfers::update_account_balances(&conn, &acc_id).unwrap();

    // Auto-import must skip Reconciled transactions; manual match must reject Reconciled
    let locked_probe_csv = "Date,Payee,Memo,Amount\n2026-11-11,ANOTHER RECONCILED,,-20.00\n";
    let probe_commit = commit_import(
        &mut conn,
        DEFAULT_BUDGET_ID,
        &acc_id,
        Some("probe.csv"),
        locked_probe_csv,
        &no_auto,
    )
    .unwrap();
    assert_eq!(probe_commit.imported_transaction_ids.len(), 1);
    assert!(match_transactions(
        &mut conn,
        &manual_nov10,
        &probe_commit.imported_transaction_ids[0]
    )
    .is_err());

    let locked_err = unmatch_transaction(&mut conn, &manual_nov10);
    assert!(locked_err.is_err());

    let cleared_bal_before: i64 = conn
        .query_row(
            "SELECT cleared_balance FROM be_accounts WHERE id = ?1",
            params![acc_id],
            |r| r.get(0),
        )
        .unwrap();

    unmatch_transaction_with_options(&mut conn, &manual_nov10, true).unwrap();
    let (cleared_after, matched_after): (String, Option<String>) = conn
        .query_row(
            "SELECT cleared, matched_transaction_id FROM be_transactions WHERE id = ?1",
            params![manual_nov10],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();
    assert_eq!(cleared_after, "Reconciled");
    assert_eq!(matched_after, None);

    let (imp_cleared_after, imp_tomb_after): (String, i32) = conn
        .query_row(
            "SELECT cleared, is_tombstone FROM be_transactions WHERE id = ?1",
            params![imp_tx_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();
    assert_eq!(imp_cleared_after, "Uncleared");
    assert_eq!(imp_tomb_after, 0);

    let cleared_bal_after: i64 = conn
        .query_row(
            "SELECT cleared_balance FROM be_accounts WHERE id = ?1",
            params![acc_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(cleared_bal_after, cleared_bal_before);
}

#[test]
fn test_import_error_handling_and_loan_full_one_time_payoff() {
    assert!(parse_ofx("<NOT_OFX>hello</NOT_OFX>").is_err());
    assert!(parse_csv("JustOneColumn\n123", &ImportOptions::default()).is_err());

    // One-time extra payment >= loan balance yields immediate 0-month payoff
    let params = LoanParams::new(5_000_000, 6_000, Some(250_000), 0, None, "2026-11-01");
    let sim = simulate_loan_payoff(&params, 0, 5_000_000).unwrap();
    assert_eq!(sim.accelerated.months_count, 0);
    assert_eq!(sim.accelerated.total_interest_milliunits, 0);
    assert_eq!(sim.accelerated.final_balance_milliunits, 0);
    assert_eq!(sim.months_saved, sim.baseline.months_count);
    assert_eq!(
        sim.interest_saved_milliunits,
        sim.baseline.total_interest_milliunits
    );
}

#[test]
fn test_reconciled_guard_skips_auto_match_and_rejects_manual_match() {
    let mut conn = setup_test_db();
    let acc_id = create_checking_account(&conn, "Checking", 1_000_000);
    let (cat_id, _) = first_spending_category_id(&conn);

    let reconciled_id = save_transaction(
        &conn,
        &SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: acc_id.clone(),
            payee_id: None,
            payee_name: Some("Utility Co".into()),
            category_id: Some(cat_id),
            date: "2026-11-10".into(),
            amount_milliunits: -75_000,
            memo: None,
            cleared: Some("Reconciled".into()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
            subtransactions: Vec::new(),
            allow_reconciled_mutation: false,
        },
    )
    .unwrap();

    let csv = "Date,Payee,Memo,Amount\n2026-11-10,UTILITY CO AUTO,,-75.00\n";
    let preview = preview_import(
        &conn,
        DEFAULT_BUDGET_ID,
        &acc_id,
        Some("u.csv"),
        csv,
        &ImportOptions {
            auto_match: true,
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(preview.rows.len(), 1);
    assert_eq!(preview.rows[0].status, ImportRowStatus::New);
    assert_eq!(preview.rows[0].matched_transaction_id, None);

    let committed = commit_import(
        &mut conn,
        DEFAULT_BUDGET_ID,
        &acc_id,
        Some("u.csv"),
        csv,
        &ImportOptions {
            auto_match: false,
            ..Default::default()
        },
    )
    .unwrap();
    let imp_id = committed.imported_transaction_ids[0].clone();
    assert!(match_transactions(&mut conn, &reconciled_id, &imp_id).is_err());

    // Even if imported side somehow were Reconciled, match_transactions must reject
    conn.execute(
        "UPDATE be_transactions SET cleared = 'Cleared' WHERE id = ?1",
        params![reconciled_id],
    )
    .unwrap();
    conn.execute(
        "UPDATE be_transactions SET cleared = 'Reconciled' WHERE id = ?1",
        params![imp_id],
    )
    .unwrap();
    assert!(match_transactions(&mut conn, &reconciled_id, &imp_id).is_err());
}

#[test]
fn test_undo_redo_match_transactions_and_atomic_commit_import_match() {
    let mut conn = setup_test_db();
    let acc_id = create_checking_account(&conn, "Checking", 1_000_000);
    let (cat_id, _) = first_spending_category_id(&conn);

    let manual_id = save_transaction(
        &conn,
        &SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: acc_id.clone(),
            payee_id: None,
            payee_name: Some("Manual Coffee".into()),
            category_id: Some(cat_id.clone()),
            date: "2026-11-10".into(),
            amount_milliunits: -15_000,
            memo: None,
            cleared: Some("Uncleared".into()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
            subtransactions: Vec::new(),
            allow_reconciled_mutation: false,
        },
    )
    .unwrap();

    // Case 1: Manual match_transactions + Undo + Redo
    let csv1 = "Date,Payee,Memo,Amount\n2026-11-11,COFFEE SHOP POS,,-15.00\n";
    let imp1 = commit_import(
        &mut conn,
        DEFAULT_BUDGET_ID,
        &acc_id,
        Some("m1.csv"),
        csv1,
        &ImportOptions {
            auto_match: false,
            ..Default::default()
        },
    )
    .unwrap();
    let imp1_id = imp1.imported_transaction_ids[0].clone();

    match_transactions(&mut conn, &manual_id, &imp1_id).unwrap();
    assert!(undo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).unwrap());

    let (m_cleared, m_match, m_src, m_imp_id): (
        String,
        Option<String>,
        Option<String>,
        Option<String>,
    ) = conn
        .query_row(
            "SELECT cleared, matched_transaction_id, source, import_id FROM be_transactions WHERE id = ?1",
            params![manual_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )
        .unwrap();
    assert_eq!(m_cleared, "Uncleared");
    assert_eq!(m_match, None);
    assert_eq!(m_src, None);
    assert_eq!(m_imp_id, None);

    let (i_tomb, i_match, i_src): (i32, Option<String>, Option<String>) = conn
        .query_row(
            "SELECT is_tombstone, matched_transaction_id, source FROM be_transactions WHERE id = ?1",
            params![imp1_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .unwrap();
    assert_eq!(i_tomb, 0);
    assert_eq!(i_match, None);
    assert_eq!(i_src.as_deref(), Some("Imported"));

    assert!(redo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).unwrap());
    let (m_match_r, i_tomb_r): (Option<String>, i32) = (
        conn.query_row(
            "SELECT matched_transaction_id FROM be_transactions WHERE id = ?1",
            params![manual_id],
            |r| r.get(0),
        )
        .unwrap(),
        conn.query_row(
            "SELECT is_tombstone FROM be_transactions WHERE id = ?1",
            params![imp1_id],
            |r| r.get(0),
        )
        .unwrap(),
    );
    assert_eq!(m_match_r.as_deref(), Some(imp1_id.as_str()));
    assert_eq!(i_tomb_r, 1);

    // Case 2: commit_import with auto_match: true uses ONE single changeset
    let manual2_id = save_transaction(
        &conn,
        &SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: acc_id.clone(),
            payee_id: None,
            payee_name: Some("Manual Lunch".into()),
            category_id: Some(cat_id),
            date: "2026-11-12".into(),
            amount_milliunits: -22_500,
            memo: None,
            cleared: Some("Uncleared".into()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
            subtransactions: Vec::new(),
            allow_reconciled_mutation: false,
        },
    )
    .unwrap();

    let count_before: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM changesets WHERE budget_id = ?1 AND stack = 'undo'",
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        )
        .unwrap();

    let csv2 = "Date,Payee,Memo,Amount\n2026-11-12,LUNCH DELI,,-22.50\n";
    let imp2 = commit_import(
        &mut conn,
        DEFAULT_BUDGET_ID,
        &acc_id,
        Some("m2.csv"),
        csv2,
        &ImportOptions {
            auto_match: true,
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(imp2.matched_count, 1);

    let count_after: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM changesets WHERE budget_id = ?1 AND stack = 'undo'",
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(count_after, count_before + 1);
    let top_ur = get_undo_redo_state(&conn, DEFAULT_BUDGET_ID).unwrap();
    assert_eq!(top_ur.undo_label.as_deref(), Some("File Import"));

    // One undo reverses BOTH the import insert AND the auto-match on manual2_id
    assert!(undo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).unwrap());
    let m2_match_undone: Option<String> = conn
        .query_row(
            "SELECT matched_transaction_id FROM be_transactions WHERE id = ?1",
            params![manual2_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(m2_match_undone, None);
    let active_after_undo: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM be_transactions WHERE entities_account_id = ?1 AND amount = -22500 AND is_tombstone = 0",
            params![acc_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(active_after_undo, 1);

    assert!(redo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).unwrap());
    let m2_match_redone: Option<String> = conn
        .query_row(
            "SELECT matched_transaction_id FROM be_transactions WHERE id = ?1",
            params![manual2_id],
            |r| r.get(0),
        )
        .unwrap();
    assert!(m2_match_redone.is_some());
}

#[test]
fn test_undo_redo_combine_payees_restores_all_five_tables() {
    let mut conn = setup_test_db();
    let acc_id = create_checking_account(&conn, "Checking", 1_000_000);
    let (cat_id, _) = first_spending_category_id(&conn);

    let src_payee_id = Uuid::new_v4().to_string();
    let tgt_payee_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO be_payees (id, budget_id, name, enabled, is_tombstone) VALUES (?1, ?2, 'Old Market', 1, 0)",
        params![src_payee_id, DEFAULT_BUDGET_ID],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO be_payees (id, budget_id, name, enabled, is_tombstone) VALUES (?1, ?2, 'Fresh Market', 1, 0)",
        params![tgt_payee_id, DEFAULT_BUDGET_ID],
    )
    .unwrap();

    // 1. Direct tx
    let tx_id = save_transaction(
        &conn,
        &SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: acc_id.clone(),
            payee_id: Some(src_payee_id.clone()),
            payee_name: None,
            category_id: Some(cat_id.clone()),
            date: "2026-11-15".into(),
            amount_milliunits: -25_000,
            memo: None,
            cleared: Some("Cleared".into()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
            subtransactions: Vec::new(),
            allow_reconciled_mutation: false,
        },
    )
    .unwrap();

    // 2. Split tx with subtransaction carrying src_payee_id
    let split_tx_id = save_transaction(
        &conn,
        &SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: acc_id.clone(),
            payee_id: None,
            payee_name: None,
            category_id: None,
            date: "2026-11-16".into(),
            amount_milliunits: -40_000,
            memo: None,
            cleared: Some("Cleared".into()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
            subtransactions: vec![
                SubTransactionDto {
                    id: None,
                    payee_id: Some(src_payee_id.clone()),
                    payee_name: None,
                    category_id: Some(cat_id.clone()),
                    category_name: None,
                    amount_milliunits: -15_000,
                    memo: Some("Part 1".into()),
                    transfer_account_id: None,
                },
                SubTransactionDto {
                    id: None,
                    payee_id: Some(tgt_payee_id.clone()),
                    payee_name: None,
                    category_id: Some(cat_id.clone()),
                    category_name: None,
                    amount_milliunits: -25_000,
                    memo: Some("Part 2".into()),
                    transfer_account_id: None,
                },
            ],
            allow_reconciled_mutation: false,
        },
    )
    .unwrap();
    let sub_id: String = conn
        .query_row(
            "SELECT id FROM be_subtransactions WHERE entities_transaction_id = ?1 AND entities_payee_id = ?2",
            params![split_tx_id, src_payee_id],
            |r| r.get(0),
        )
        .unwrap();

    // 3. Scheduled transaction & scheduled subtransaction
    let sched_id = save_scheduled_transaction(
        &conn,
        &SaveScheduledTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: acc_id.clone(),
            payee_id: Some(src_payee_id.clone()),
            category_id: Some(cat_id.clone()),
            date: "2026-12-01".into(),
            frequency: "Monthly".into(),
            amount_milliunits: -30_000,
            memo: None,
            flag: None,
            transfer_account_id: None,
        },
    )
    .unwrap();
    let sched_sub_id = Uuid::new_v4().to_string();
    conn.execute(
        r#"INSERT INTO be_scheduled_subtransactions (
               id, budget_id, entities_scheduled_transaction_id, entities_payee_id,
               entities_subcategory_id, is_tombstone, amount, sortable_index
           ) VALUES (?1, ?2, ?3, ?4, ?5, 0, -10000, 100)"#,
        params![
            sched_sub_id,
            DEFAULT_BUDGET_ID,
            sched_id,
            src_payee_id,
            cat_id
        ],
    )
    .unwrap();

    // 4. Existing rename condition on src_payee_id
    let existing_rc_id = add_payee_rename_condition(
        &conn,
        DEFAULT_BUDGET_ID,
        &src_payee_id,
        RenameOperator::Contains,
        "OLD MKT",
    )
    .unwrap();

    combine_payees(
        &mut conn,
        DEFAULT_BUDGET_ID,
        std::slice::from_ref(&src_payee_id),
        &tgt_payee_id,
    )
    .unwrap();

    // Verify all 5 tables + source payee tombstoned
    assert_eq!(
        conn.query_row(
            "SELECT entities_payee_id FROM be_transactions WHERE id = ?1",
            params![tx_id],
            |r| r.get::<_, String>(0),
        )
        .unwrap(),
        tgt_payee_id
    );
    assert_eq!(
        conn.query_row(
            "SELECT entities_payee_id FROM be_subtransactions WHERE id = ?1",
            params![sub_id],
            |r| r.get::<_, String>(0),
        )
        .unwrap(),
        tgt_payee_id
    );
    assert_eq!(
        conn.query_row(
            "SELECT entities_payee_id FROM be_scheduled_transactions WHERE id = ?1",
            params![sched_id],
            |r| r.get::<_, String>(0),
        )
        .unwrap(),
        tgt_payee_id
    );
    assert_eq!(
        conn.query_row(
            "SELECT entities_payee_id FROM be_scheduled_subtransactions WHERE id = ?1",
            params![sched_sub_id],
            |r| r.get::<_, String>(0),
        )
        .unwrap(),
        tgt_payee_id
    );
    assert_eq!(
        conn.query_row(
            "SELECT entities_payee_id FROM be_payee_rename_conditions WHERE id = ?1",
            params![existing_rc_id],
            |r| r.get::<_, String>(0),
        )
        .unwrap(),
        tgt_payee_id
    );
    assert_eq!(
        conn.query_row(
            "SELECT is_tombstone FROM be_payees WHERE id = ?1",
            params![src_payee_id],
            |r| r.get::<_, i32>(0),
        )
        .unwrap(),
        1
    );

    // Undo Combine Payees -> all 5 tables + source payee + auto rename condition restored!
    assert!(undo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).unwrap());
    assert_eq!(
        conn.query_row(
            "SELECT is_tombstone FROM be_payees WHERE id = ?1",
            params![src_payee_id],
            |r| r.get::<_, i32>(0),
        )
        .unwrap(),
        0
    );
    assert_eq!(
        conn.query_row(
            "SELECT entities_payee_id FROM be_transactions WHERE id = ?1",
            params![tx_id],
            |r| r.get::<_, String>(0),
        )
        .unwrap(),
        src_payee_id
    );
    assert_eq!(
        conn.query_row(
            "SELECT entities_payee_id FROM be_subtransactions WHERE id = ?1",
            params![sub_id],
            |r| r.get::<_, String>(0),
        )
        .unwrap(),
        src_payee_id
    );
    assert_eq!(
        conn.query_row(
            "SELECT entities_payee_id FROM be_scheduled_transactions WHERE id = ?1",
            params![sched_id],
            |r| r.get::<_, String>(0),
        )
        .unwrap(),
        src_payee_id
    );
    assert_eq!(
        conn.query_row(
            "SELECT entities_payee_id FROM be_scheduled_subtransactions WHERE id = ?1",
            params![sched_sub_id],
            |r| r.get::<_, String>(0),
        )
        .unwrap(),
        src_payee_id
    );
    assert_eq!(
        conn.query_row(
            "SELECT entities_payee_id FROM be_payee_rename_conditions WHERE id = ?1",
            params![existing_rc_id],
            |r| r.get::<_, String>(0),
        )
        .unwrap(),
        src_payee_id
    );
    let active_auto_rules: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM be_payee_rename_conditions WHERE budget_id = ?1 AND lower(operand) = 'old market' AND is_tombstone = 0",
            params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(active_auto_rules, 0);

    // Redo re-combines cleanly
    assert!(redo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).unwrap());
    assert_eq!(
        conn.query_row(
            "SELECT is_tombstone FROM be_payees WHERE id = ?1",
            params![src_payee_id],
            |r| r.get::<_, i32>(0),
        )
        .unwrap(),
        1
    );
    assert_eq!(
        conn.query_row(
            "SELECT entities_payee_id FROM be_subtransactions WHERE id = ?1",
            params![sub_id],
            |r| r.get::<_, String>(0),
        )
        .unwrap(),
        tgt_payee_id
    );
}

#[test]
fn test_undo_redo_delete_category_group_restores_child_categories() {
    let mut conn = setup_test_db();
    let m0 = get_budget_month(&conn, "2026-11-01", Some(DEFAULT_BUDGET_ID)).unwrap();
    let group_id = m0.category_groups[1].id.clone();
    let child_ids: Vec<String> = m0.category_groups[1]
        .categories
        .iter()
        .map(|c| c.id.clone())
        .collect();
    assert!(!child_ids.is_empty());

    delete_category(&conn, &group_id, true).unwrap();
    let group_tomb: i32 = conn
        .query_row(
            "SELECT is_tombstone FROM be_master_categories WHERE id = ?1",
            params![group_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(group_tomb, 1);
    for cid in &child_ids {
        let ct: i32 = conn
            .query_row(
                "SELECT is_tombstone FROM be_subcategories WHERE id = ?1",
                params![cid],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(ct, 1);
    }

    assert!(undo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).unwrap());
    let group_restored: i32 = conn
        .query_row(
            "SELECT is_tombstone FROM be_master_categories WHERE id = ?1",
            params![group_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(group_restored, 0);
    for cid in &child_ids {
        let ct: i32 = conn
            .query_row(
                "SELECT is_tombstone FROM be_subcategories WHERE id = ?1",
                params![cid],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(ct, 0);
    }

    assert!(redo_last_changeset(&mut conn, DEFAULT_BUDGET_ID).unwrap());
    let group_redone: i32 = conn
        .query_row(
            "SELECT is_tombstone FROM be_master_categories WHERE id = ?1",
            params![group_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(group_redone, 1);
}

#[test]
fn test_delete_transfer_peer_reconciled_lock_and_batch_atomicity() {
    let conn = setup_test_db();
    let chk_id = create_checking_account(&conn, "Checking", 1_000_000);
    let sav_id = create_checking_account(&conn, "Savings", 500_000);
    let (cat_id, _) = first_spending_category_id(&conn);

    // Other regular uncleared transaction in Checking
    let other_tx_id = save_transaction(
        &conn,
        &SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: chk_id.clone(),
            payee_id: None,
            payee_name: Some("Store".into()),
            category_id: Some(cat_id),
            date: "2026-11-10".into(),
            amount_milliunits: -10_000,
            memo: None,
            cleared: Some("Uncleared".into()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
            subtransactions: Vec::new(),
            allow_reconciled_mutation: false,
        },
    )
    .unwrap();

    // Transfer from Checking -> Savings (-$200.00)
    let xfer_chk_id = save_transaction(
        &conn,
        &SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.into(),
            account_id: chk_id.clone(),
            payee_id: None,
            payee_name: None,
            category_id: None,
            date: "2026-11-11".into(),
            amount_milliunits: -200_000,
            memo: None,
            cleared: Some("Uncleared".into()),
            approved: Some(true),
            flag: None,
            transfer_account_id: Some(sav_id.clone()),
            subtransactions: Vec::new(),
            allow_reconciled_mutation: false,
        },
    )
    .unwrap();
    let xfer_sav_id: String = conn
        .query_row(
            "SELECT transfer_transaction_id FROM be_transactions WHERE id = ?1",
            params![xfer_chk_id],
            |r| r.get(0),
        )
        .unwrap();

    // Reconcile the Savings peer leg while leaving the Checking leg Uncleared
    conn.execute(
        "UPDATE be_transactions SET cleared = 'Reconciled' WHERE id = ?1",
        params![xfer_sav_id],
    )
    .unwrap();

    // Attempting to delete [other_tx_id, xfer_chk_id] MUST fail and leave EVERY row untouched
    let err = delete_transactions(
        &conn,
        &DeleteTransactionsPayload {
            budget_id: Some(DEFAULT_BUDGET_ID.into()),
            ids: vec![other_tx_id.clone(), xfer_chk_id.clone()],
            allow_reconciled: false,
        },
    );
    assert!(err.is_err());

    for tid in [&other_tx_id, &xfer_chk_id, &xfer_sav_id] {
        let tomb: i32 = conn
            .query_row(
                "SELECT is_tombstone FROM be_transactions WHERE id = ?1",
                params![tid],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(tomb, 0);
    }

    // Explicit unlock deletes cleanly without error
    delete_transactions(
        &conn,
        &DeleteTransactionsPayload {
            budget_id: Some(DEFAULT_BUDGET_ID.into()),
            ids: vec![xfer_chk_id.clone()],
            allow_reconciled: true,
        },
    )
    .unwrap();
    let peer_tomb: i32 = conn
        .query_row(
            "SELECT is_tombstone FROM be_transactions WHERE id = ?1",
            params![xfer_sav_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(peer_tomb, 1);
}
