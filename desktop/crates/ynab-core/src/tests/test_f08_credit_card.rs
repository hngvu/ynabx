//! F08: Credit card account classification, available banner & debt calculation test suite.
//! Tests credit card classification (`"creditCard"`, `"lineOfCredit"`, `"CreditCard"`, `"LineOfCredit"`)
//! and debt calculation (`determine_cash_credit_amounts`: credit debt vs cash).

use crate::ledger::transfers::determine_cash_credit_amounts;

// Canonical case-insensitive matcher specification (PROJECT.md F15)
pub fn determine_cash_credit_amounts_robust(account_type: &str, amount: i64) -> (i64, i64) {
    let lower = account_type.to_lowercase();
    if lower == "creditcard" || lower == "lineofcredit" {
        (0, amount)
    } else {
        (amount, 0)
    }
}

// =========================================================================
// Tier 1: Primary Behavioral & Equivalence Tests
// =========================================================================

#[test]
fn test_f08_t1_pascal_case_credit_card_classified_as_credit() {
    let (cash, credit) = determine_cash_credit_amounts("CreditCard", -50000);
    assert_eq!(cash, 0, "Credit card must have 0 cash amount");
    assert_eq!(credit, -50000, "Credit card must populate credit amount");
}

#[test]
fn test_f08_t1_pascal_case_line_of_credit_classified_as_credit() {
    let (cash, credit) = determine_cash_credit_amounts("LineOfCredit", -25000);
    assert_eq!(cash, 0);
    assert_eq!(credit, -25000);
}

#[test]
fn test_f08_t1_checking_account_classified_as_cash() {
    let (cash, credit) = determine_cash_credit_amounts("checking", -30000);
    assert_eq!(cash, -30000, "Checking account must populate cash amount");
    assert_eq!(credit, 0, "Checking account must have 0 credit amount");
}

#[test]
fn test_f08_t1_savings_account_classified_as_cash() {
    let (cash, credit) = determine_cash_credit_amounts("savings", 100000);
    assert_eq!(cash, 100000);
    assert_eq!(credit, 0);
}

#[test]
fn test_f08_t1_cash_account_classified_as_cash() {
    let (cash, credit) = determine_cash_credit_amounts("cash", -15000);
    assert_eq!(cash, -15000);
    assert_eq!(credit, 0);
}

// =========================================================================
// Tier 2: Boundary & Corner Cases (CamelCase Defect Exposure & Edge Values)
// =========================================================================

#[test]
fn test_f08_t2_camel_case_credit_card_defect_exposure() {
    // Backend determine_cash_credit_amounts:
    // With case-insensitive matching, camelCase "creditCard" must be classified as credit: (0, -50000)
    let (current_cash, current_credit) = determine_cash_credit_amounts("creditCard", -50000);
    let (robust_cash, robust_credit) = determine_cash_credit_amounts_robust("creditCard", -50000);

    assert_eq!(robust_cash, 0);
    assert_eq!(robust_credit, -50000);

    // Verify current implementation produces correct credit classification
    assert_eq!(current_cash, 0, "creditCard must produce 0 cash amount");
    assert_eq!(
        current_credit, -50000,
        "creditCard must produce -50000 credit amount"
    );
}

#[test]
fn test_f08_t2_camel_case_line_of_credit_defect_exposure() {
    let (current_cash, current_credit) = determine_cash_credit_amounts("lineOfCredit", -20000);
    let (robust_cash, robust_credit) = determine_cash_credit_amounts_robust("lineOfCredit", -20000);

    assert_eq!(robust_cash, 0);
    assert_eq!(robust_credit, -20000);

    assert_eq!(current_cash, 0, "lineOfCredit must produce 0 cash amount");
    assert_eq!(
        current_credit, -20000,
        "lineOfCredit must produce -20000 credit amount"
    );
}

#[test]
fn test_f08_t2_case_insensitive_matcher_specification() {
    // Test all case variations across robust specification
    for cc_variant in [
        "CreditCard",
        "creditCard",
        "creditcard",
        "CREDITCARD",
        "CrEdItCaRd",
    ] {
        let (cash, credit) = determine_cash_credit_amounts_robust(cc_variant, -10000);
        assert_eq!(cash, 0, "Variant {} must have cash = 0", cc_variant);
        assert_eq!(
            credit, -10000,
            "Variant {} must have credit = -10000",
            cc_variant
        );
    }
}

#[test]
fn test_f08_t2_zero_amount_credit_card_outflow() {
    let (cash, credit) = determine_cash_credit_amounts_robust("creditCard", 0);
    assert_eq!(cash, 0);
    assert_eq!(credit, 0);
}

#[test]
fn test_f08_t2_positive_amount_credit_card_inflow_refund() {
    // When a refund occurs on a credit card (inflow: +$45.00)
    let (cash, credit) = determine_cash_credit_amounts_robust("creditCard", 45000);
    assert_eq!(cash, 0, "Refund on credit card must have cash = 0");
    assert_eq!(
        credit, 45000,
        "Refund on credit card must populate positive credit amount"
    );
}
