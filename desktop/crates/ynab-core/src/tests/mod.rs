#![allow(clippy::print_stdout)]

pub mod common;
pub mod m2_tests;
pub mod test_audited_bugs_and_parity;
pub mod test_ember_slik_subsystems;
pub mod test_f01_category_hide;
pub mod test_f02_account_close;
pub mod test_f03_payee_naming;
pub mod test_f04_date_parsing;
pub mod test_f05_transfers;
pub mod test_f06_reconciliation;
pub mod test_f07_bulk_ops;
pub mod test_f08_credit_card;
pub mod test_f09_quick_budget;
pub mod test_f11_sort_order;
pub mod test_tier3_pairwise;
pub mod test_tier4_scenarios;
pub mod test_vitest_complete_suite;

#[test]
fn test_sanity_in_main_binary() {
    let conn = common::setup_test_db();
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM be_budgets", [], |r| r.get(0))
        .unwrap();
    assert_eq!(count, 1);
}
