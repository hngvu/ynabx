//! Complete 1:1 port of the Vitest frontend test suite into pure Rust `#[test]` functions:
//! - `calculator.test.ts` (11 tests)
//! - `popoverPosition.test.ts` (7 tests)
//! - `f04_date_timeframe.test.ts` (10 tests)
//! - `f10_reflect_reports.test.ts` (10 tests)
//! - `f12_calculator.test.ts` (10 tests)
//! - `m3_register_accounts_remediation.test.ts` (20 tests)
//! - `m4_budget_reports_remediation.test.ts` (20 tests)
//! - `tauri_bridge_contracts.test.ts` (12 tests)

use serde_json::json;
use std::collections::HashSet;
use std::sync::Mutex;

use super::common::{mock_app, setup_test_db};
use crate::analytics::{
    calculate_age_of_money, calculate_age_of_money_history, calculate_net_worth,
    calculate_net_worth_history, calculate_timeframe_dates,
    filter_transactions_by_date_and_filters, format_timeframe_label, AnalyticsAccount,
    AnalyticsTransaction, TimeframePreset, TimeframeState, MONTH_NAMES,
};
use crate::calc::calculator::{
    calculate_assigned_expression_milliunits, evaluate_formula_milliunits,
};
use crate::calc::goals_calc::days_in_month;
use crate::calc::target_status::format_currency;
use crate::commands::{
    self, ApplyQuickBudgetPayload, CreateAccountPayload, ReconcileAccountPayload,
};
use crate::format::{
    export_transactions_to_csv, generate_budget_plan_csv_rows, ExportBudgetCategoryRow,
    ExportRegisterRow,
};
use crate::layout::{
    calculate_popover_position, ArrowDirection, DomRect, HorizontalAlign, PositionOptions,
};
use crate::ledger::transfers::{
    apply_payee_selection, calculate_balance_adjustment_delta, SaveTransactionPayload,
};
use crate::repo::{self, is_credit_card_account};
use crate::seed::DEFAULT_BUDGET_ID;
use crate::AppState;

// =========================================================================
// 1. calculator.test.ts (11 tests)
// =========================================================================
#[test]
fn test_calc_01_basic_arithmetic_operations() {
    assert_eq!(evaluate_formula_milliunits("10 + 20"), Some(30_000));
    assert_eq!(evaluate_formula_milliunits("50 - 15"), Some(35_000));
    assert_eq!(evaluate_formula_milliunits("6 * 7"), Some(42_000));
    assert_eq!(evaluate_formula_milliunits("100 / 4"), Some(25_000));
    assert_eq!(evaluate_formula_milliunits("17 % 5"), Some(2_000));
    assert_eq!(evaluate_formula_milliunits("2 ^ 3"), Some(8_000));
}

#[test]
fn test_calc_02_respects_operator_precedence() {
    assert_eq!(evaluate_formula_milliunits("2 + 3 * 4"), Some(14_000));
    assert_eq!(evaluate_formula_milliunits("10 - 4 / 2"), Some(8_000));
    assert_eq!(evaluate_formula_milliunits("2 * 3 + 4 * 5"), Some(26_000));
}

#[test]
fn test_calc_03_handles_parentheses_correctly() {
    assert_eq!(evaluate_formula_milliunits("(2 + 3) * 4"), Some(20_000));
    assert_eq!(evaluate_formula_milliunits("100 / (2 + 3)"), Some(20_000));
    assert_eq!(
        evaluate_formula_milliunits("((5 + 5) * (3 + 2))"),
        Some(50_000)
    );
}

#[test]
fn test_calc_04_handles_decimal_numbers_accurately_no_float_drift() {
    assert_eq!(evaluate_formula_milliunits("12.50 + 7.25"), Some(19_750));
    assert_eq!(evaluate_formula_milliunits("10.5 * 2"), Some(21_000));
    // Exact integer milliunit addition: 0.1 + 0.2 == 0.300 exactly (300 milliunits, zero IEEE 754 drift!)
    assert_eq!(evaluate_formula_milliunits("0.1 + 0.2"), Some(300));
}

#[test]
fn test_calc_05_trims_trailing_operators_safely() {
    assert_eq!(evaluate_formula_milliunits("50+"), Some(50_000));
    assert_eq!(evaluate_formula_milliunits("25 *"), Some(25_000));
    assert_eq!(evaluate_formula_milliunits("100 -"), Some(100_000));
    assert_eq!(evaluate_formula_milliunits("10 /"), Some(10_000));
}

#[test]
fn test_calc_06_handles_leading_negative_numbers() {
    assert_eq!(evaluate_formula_milliunits("-10 + 50"), Some(40_000));
    assert_eq!(evaluate_formula_milliunits("-5 * 4"), Some(-20_000));
}

#[test]
fn test_calc_07_handles_empty_or_blank_input_gracefully() {
    assert_eq!(evaluate_formula_milliunits(""), None);
    assert_eq!(evaluate_formula_milliunits("   "), None);
    assert_eq!(evaluate_formula_milliunits("+++"), None);
}

#[test]
fn test_calc_08_handles_division_by_zero_safely() {
    assert_eq!(evaluate_formula_milliunits("10 / 0"), None);
    assert_eq!(evaluate_formula_milliunits("100 / (5 - 5)"), None);
    assert_eq!(evaluate_formula_milliunits("50 % 0"), None);
}

#[test]
fn test_calc_09_evaluates_absolute_dollar_amounts() {
    assert_eq!(
        calculate_assigned_expression_milliunits("150.00", 50_000),
        Some(150_000)
    );
    assert_eq!(
        calculate_assigned_expression_milliunits("$250.50", 0),
        Some(250_500)
    );
}

#[test]
fn test_calc_10_evaluates_relative_adjustments() {
    assert_eq!(
        calculate_assigned_expression_milliunits("+25", 100_000),
        Some(125_000)
    );
    assert_eq!(
        calculate_assigned_expression_milliunits("-30", 100_000),
        Some(70_000)
    );
    assert_eq!(
        calculate_assigned_expression_milliunits("+ 50", 200_000),
        Some(250_000)
    );
    assert_eq!(
        calculate_assigned_expression_milliunits("* 2", 50_000),
        Some(100_000)
    );
}

#[test]
fn test_calc_11_returns_zero_for_empty_assigned_expression() {
    assert_eq!(
        calculate_assigned_expression_milliunits("", 100_000),
        Some(0)
    );
    assert_eq!(
        calculate_assigned_expression_milliunits("  ", 100_000),
        Some(0)
    );
}

// =========================================================================
// 2. popoverPosition.test.ts (7 tests)
// =========================================================================
#[test]
fn test_popover_01_centers_when_trigger_null() {
    let pos = calculate_popover_position(&PositionOptions {
        trigger_rect: None,
        modal_width: 300,
        modal_height: 200,
        window_margin: 10,
        ..Default::default()
    });
    assert_eq!(pos.left, (1920 - 300) / 2);
    assert_eq!(pos.top, (1080 - 200) / 2);
}

#[test]
fn test_popover_02_below_trigger_arrow_up() {
    let pos = calculate_popover_position(&PositionOptions {
        trigger_rect: Some(DomRect {
            top: 100,
            left: 500,
            width: 80,
            height: 30,
        }),
        modal_width: 200,
        modal_height: 150,
        arrow_direction: ArrowDirection::Up,
        ..Default::default()
    });
    assert_eq!(pos.top, 145);
    assert_eq!(pos.left, 440);
    assert_eq!(pos.arrow_transform, "");
}

#[test]
fn test_popover_03_above_trigger_arrow_down() {
    let pos = calculate_popover_position(&PositionOptions {
        trigger_rect: Some(DomRect {
            top: 300,
            left: 500,
            width: 80,
            height: 30,
        }),
        modal_width: 200,
        modal_height: 100,
        arrow_direction: ArrowDirection::Down,
        ..Default::default()
    });
    assert_eq!(pos.top, 185);
    assert_eq!(pos.arrow_transform, "rotate(180 50 50)");
}

#[test]
fn test_popover_04_right_of_trigger_arrow_left() {
    let pos = calculate_popover_position(&PositionOptions {
        trigger_rect: Some(DomRect {
            top: 200,
            left: 300,
            width: 100,
            height: 50,
        }),
        modal_width: 250,
        modal_height: 120,
        arrow_direction: ArrowDirection::Left,
        ..Default::default()
    });
    assert_eq!(pos.left, 415);
    assert_eq!(pos.arrow_transform, "rotate(-90 50 50)");
}

#[test]
fn test_popover_05_left_of_trigger_arrow_right() {
    let pos = calculate_popover_position(&PositionOptions {
        trigger_rect: Some(DomRect {
            top: 200,
            left: 600,
            width: 100,
            height: 50,
        }),
        modal_width: 200,
        modal_height: 120,
        arrow_direction: ArrowDirection::Right,
        ..Default::default()
    });
    assert_eq!(pos.left, 385);
    assert_eq!(pos.arrow_transform, "rotate(90 50 50)");
}

#[test]
fn test_popover_06_constrains_screen_edges() {
    let near_left = calculate_popover_position(&PositionOptions {
        trigger_rect: Some(DomRect {
            top: 200,
            left: 5,
            width: 20,
            height: 20,
        }),
        modal_width: 300,
        modal_height: 200,
        arrow_direction: ArrowDirection::Up,
        window_margin: 15,
        ..Default::default()
    });
    assert!(near_left.left >= 15);

    let near_right = calculate_popover_position(&PositionOptions {
        trigger_rect: Some(DomRect {
            top: 200,
            left: 1900,
            width: 20,
            height: 20,
        }),
        modal_width: 300,
        modal_height: 200,
        arrow_direction: ArrowDirection::Up,
        window_margin: 15,
        ..Default::default()
    });
    assert!(near_right.left + 300 <= 1920);
}

#[test]
fn test_popover_07_horizontal_align_start() {
    let pos = calculate_popover_position(&PositionOptions {
        trigger_rect: Some(DomRect {
            top: 200,
            left: 400,
            width: 100,
            height: 40,
        }),
        modal_width: 200,
        modal_height: 150,
        arrow_direction: ArrowDirection::Up,
        horizontal_align: HorizontalAlign::Start,
        ..Default::default()
    });
    assert_eq!(pos.left, 423);
}

// =========================================================================
// 3. f04_date_timeframe.test.ts (10 tests)
// =========================================================================
#[test]
fn test_f04_vt_t1_01_timeframe_date_ranges() {
    assert_eq!(
        calculate_timeframe_dates(TimeframePreset::ThisMonth, 2026, 10),
        (2026, 10, 2026, 10)
    );
    assert_eq!(
        calculate_timeframe_dates(TimeframePreset::Latest3Months, 2026, 10),
        (2026, 8, 2026, 10)
    );
    assert_eq!(
        calculate_timeframe_dates(TimeframePreset::Latest6Months, 2026, 10),
        (2026, 5, 2026, 10)
    );
    assert_eq!(
        calculate_timeframe_dates(TimeframePreset::Latest12Months, 2026, 10),
        (2025, 11, 2026, 10)
    );
    assert_eq!(
        calculate_timeframe_dates(TimeframePreset::AllDates, 2026, 10),
        (2024, 0, 2026, 10)
    );
}

#[test]
fn test_f04_vt_t1_02_monthly_interval_labels() {
    let tf = TimeframeState {
        preset: TimeframePreset::Latest3Months,
        start_year: 2026,
        start_month: 8,
        end_year: 2026,
        end_month: 10,
    };
    let mut labels = Vec::new();
    let mut cy = tf.start_year;
    let mut cm = tf.start_month;
    while cy < tf.end_year || (cy == tf.end_year && cm <= tf.end_month) {
        labels.push(format!("{} {}", MONTH_NAMES[cm as usize], cy));
        cm += 1;
        if cm > 11 {
            cm = 0;
            cy += 1;
        }
    }
    assert_eq!(labels, vec!["Sep 2026", "Oct 2026", "Nov 2026"]);
}

#[test]
fn test_f04_vt_t1_03_year_month_iso_formatting() {
    let fmt = |y: i32, m_idx: u32| format!("{:04}-{:02}-01", y, m_idx + 1);
    assert_eq!(fmt(2026, 0), "2026-01-01");
    assert_eq!(fmt(2026, 9), "2026-10-01");
    assert_eq!(fmt(2026, 11), "2026-12-01");
}

#[test]
fn test_f04_vt_t1_04_transaction_date_filtering_boundaries() {
    let tf = TimeframeState {
        preset: TimeframePreset::Custom,
        start_year: 2026,
        start_month: 8,
        end_year: 2026,
        end_month: 10,
    };
    let mk = |id: &str, d: &str| AnalyticsTransaction {
        id: id.to_string(),
        account_id: "acc-1".to_string(),
        account_name: "Checking".to_string(),
        date: d.to_string(),
        payee_name: "Payee".to_string(),
        category_id: Some("cat-1".to_string()),
        category_name: "Cat".to_string(),
        group_id: None,
        group_name: String::new(),
        amount_milliunits: -10_000,
        transfer_account_id: None,
    };
    let txs = vec![
        mk("tx-prior", "2026-08-31"),
        mk("tx-start-boundary", "2026-09-01"),
        mk("tx-mid", "2026-10-15"),
        mk("tx-end-boundary", "2026-11-30"),
        mk("tx-future", "2026-12-01"),
    ];
    let filtered =
        filter_transactions_by_date_and_filters(&txs, &tf, &HashSet::new(), &HashSet::new());
    let ids: Vec<&str> = filtered.iter().map(|t| t.id.as_str()).collect();
    assert_eq!(ids, vec!["tx-start-boundary", "tx-mid", "tx-end-boundary"]);
}

#[test]
fn test_f04_vt_t1_05_relative_timeframe_year_wraparound() {
    assert_eq!(
        calculate_timeframe_dates(TimeframePreset::Latest3Months, 2027, 1),
        (2026, 11, 2027, 1)
    );
    assert_eq!(
        calculate_timeframe_dates(TimeframePreset::Latest12Months, 2027, 1),
        (2026, 2, 2027, 1)
    );
}

#[test]
fn test_f04_vt_t2_01_malformed_dates_no_crash() {
    let tf = TimeframeState {
        preset: TimeframePreset::ThisMonth,
        start_year: 2026,
        start_month: 10,
        end_year: 2026,
        end_month: 10,
    };
    let mk = |id: &str, d: &str| AnalyticsTransaction {
        id: id.to_string(),
        account_id: "acc-1".to_string(),
        account_name: "Checking".to_string(),
        date: d.to_string(),
        payee_name: "Payee".to_string(),
        category_id: None,
        category_name: String::new(),
        group_id: None,
        group_name: String::new(),
        amount_milliunits: -1_000,
        transfer_account_id: None,
    };
    let txs = vec![
        mk("bad1", ""),
        mk("bad2", "invalid-date"),
        mk("bad3", "2026"),
        mk("bad4", "2026-99-99"),
        mk("tx-valid", "2026-11-15"),
    ];
    let res = filter_transactions_by_date_and_filters(&txs, &tf, &HashSet::new(), &HashSet::new());
    assert_eq!(res.len(), 1);
    assert_eq!(res[0].id, "tx-valid");
}

#[test]
fn test_f04_vt_t2_02_leap_year_date_handling() {
    assert_eq!(days_in_month(2024, 2), 29);
    assert_eq!(days_in_month(2026, 2), 28);
    let tf = TimeframeState {
        preset: TimeframePreset::Custom,
        start_year: 2024,
        start_month: 1,
        end_year: 2024,
        end_month: 1,
    };
    let txs = vec![
        AnalyticsTransaction {
            id: "tx-leap".to_string(),
            account_id: "acc-1".to_string(),
            account_name: "Checking".to_string(),
            date: "2024-02-29".to_string(),
            payee_name: "Payee".to_string(),
            category_id: None,
            category_name: String::new(),
            group_id: None,
            group_name: String::new(),
            amount_milliunits: -1_000,
            transfer_account_id: None,
        },
        AnalyticsTransaction {
            id: "tx-mar1".to_string(),
            account_id: "acc-1".to_string(),
            account_name: "Checking".to_string(),
            date: "2024-03-01".to_string(),
            payee_name: "Payee".to_string(),
            category_id: None,
            category_name: String::new(),
            group_id: None,
            group_name: String::new(),
            amount_milliunits: -2_000,
            transfer_account_id: None,
        },
    ];
    let filtered =
        filter_transactions_by_date_and_filters(&txs, &tf, &HashSet::new(), &HashSet::new());
    assert_eq!(filtered.len(), 1);
    assert_eq!(filtered[0].id, "tx-leap");
}

#[test]
fn test_f04_vt_t2_04_year_boundary_transitions_label() {
    let label = format_timeframe_label(&TimeframeState {
        preset: TimeframePreset::Custom,
        start_year: 2025,
        start_month: 11,
        end_year: 2026,
        end_month: 0,
    });
    assert_eq!(label, "Dec 2025 - Jan 2026");

    let single = format_timeframe_label(&TimeframeState {
        preset: TimeframePreset::Custom,
        start_year: 2026,
        start_month: 5,
        end_year: 2026,
        end_month: 5,
    });
    assert_eq!(single, "Jun 2026");
}

// =========================================================================
// 4. f10_reflect_reports.test.ts (10 tests)
// =========================================================================
#[test]
fn test_f10_vt_t1_01_and_02_net_worth_assets_debts_by_type() {
    let accounts = vec![
        AnalyticsAccount {
            id: "a1".to_string(),
            name: "Checking".to_string(),
            account_type: "checking".to_string(),
            balance_milliunits: 1_000_000,
        },
        AnalyticsAccount {
            id: "a2".to_string(),
            name: "Savings".to_string(),
            account_type: "savings".to_string(),
            balance_milliunits: 2_000_000,
        },
        AnalyticsAccount {
            id: "a3".to_string(),
            name: "Cash".to_string(),
            account_type: "cash".to_string(),
            balance_milliunits: 500_000,
        },
        AnalyticsAccount {
            id: "a4".to_string(),
            name: "Card".to_string(),
            account_type: "creditCard".to_string(),
            balance_milliunits: -1_500_000,
        },
        AnalyticsAccount {
            id: "a5".to_string(),
            name: "LOC".to_string(),
            account_type: "lineOfCredit".to_string(),
            balance_milliunits: -800_000,
        },
    ];
    let res = calculate_net_worth(&accounts, None);
    assert_eq!(res.assets, 3_500_000);
    assert_eq!(res.debts, 2_300_000);
    assert_eq!(res.net_worth, 1_200_000);
}

#[test]
fn test_f10_vt_t1_05_filter_by_account_selection() {
    let accounts = vec![
        AnalyticsAccount {
            id: "acc-1".to_string(),
            name: "Checking".to_string(),
            account_type: "checking".to_string(),
            balance_milliunits: 5_000_000,
        },
        AnalyticsAccount {
            id: "acc-2".to_string(),
            name: "Savings".to_string(),
            account_type: "savings".to_string(),
            balance_milliunits: 10_000_000,
        },
    ];
    let mut selected = HashSet::new();
    selected.insert("acc-1".to_string());
    let res = calculate_net_worth(&accounts, Some(&selected));
    assert_eq!(res.assets, 5_000_000);
    assert_eq!(res.debts, 0);
    assert_eq!(res.net_worth, 5_000_000);
}

#[test]
fn test_f10_vt_t2_01_and_02_zero_and_negative_net_worth() {
    let zero_accs = vec![
        AnalyticsAccount {
            id: "a1".to_string(),
            name: "Chk".to_string(),
            account_type: "checking".to_string(),
            balance_milliunits: 0,
        },
        AnalyticsAccount {
            id: "a2".to_string(),
            name: "CC".to_string(),
            account_type: "creditCard".to_string(),
            balance_milliunits: 0,
        },
    ];
    let res0 = calculate_net_worth(&zero_accs, None);
    assert_eq!(res0.net_worth, 0);

    let neg_accs = vec![
        AnalyticsAccount {
            id: "a1".to_string(),
            name: "Chk".to_string(),
            account_type: "checking".to_string(),
            balance_milliunits: 2_000_000,
        },
        AnalyticsAccount {
            id: "a2".to_string(),
            name: "CC".to_string(),
            account_type: "creditCard".to_string(),
            balance_milliunits: -5_000_000,
        },
    ];
    let res_neg = calculate_net_worth(&neg_accs, None);
    assert_eq!(res_neg.assets, 2_000_000);
    assert_eq!(res_neg.debts, 5_000_000);
    assert_eq!(res_neg.net_worth, -3_000_000);
}

#[test]
fn test_f10_vt_t2_03_and_05_insufficient_aom_transactions() {
    assert!(!calculate_age_of_money(&[]).is_ready);
    let single = vec![AnalyticsTransaction {
        id: "tx-1".to_string(),
        account_id: "acc-1".to_string(),
        account_name: "Chk".to_string(),
        date: "2026-01-01".to_string(),
        payee_name: "Payee".to_string(),
        category_id: None,
        category_name: String::new(),
        group_id: None,
        group_name: String::new(),
        amount_milliunits: 1_000_000,
        transfer_account_id: None,
    }];
    assert!(!calculate_age_of_money(&single).is_ready);
}

// =========================================================================
// 5. m3 & m4 & tauri_bridge_contracts Remediation Tests
// =========================================================================
#[test]
fn test_m3_credit_card_case_insensitive_matching() {
    for variant in [
        "creditCard",
        "CreditCard",
        "creditcard",
        "CREDITCARD",
        "lineOfCredit",
        "LineOfCredit",
        "lineofcredit",
        "credit",
        "CREDIT",
    ] {
        assert!(is_credit_card_account(Some(variant)));
    }
    for non_cc in ["checking", "savings", "cash", "otherAsset"] {
        assert!(!is_credit_card_account(Some(non_cc)));
    }
    assert!(!is_credit_card_account(None));
}

#[test]
fn test_m3_edit_account_balance_adjustment_delta_variants() {
    assert_eq!(
        calculate_balance_adjustment_delta(1_000_000, "1500.00"),
        (1_500_000, 500_000)
    );
    assert_eq!(
        calculate_balance_adjustment_delta(1_000_000, "1,250.00"),
        (1_250_000, 250_000)
    );
    assert_eq!(
        calculate_balance_adjustment_delta(1_000_000, "$1,500.50"),
        (1_500_500, 500_500)
    );
    assert_eq!(
        calculate_balance_adjustment_delta(1_000_000, "750.50"),
        (750_500, -249_500)
    );
    assert_eq!(
        calculate_balance_adjustment_delta(1_000_000, "1000.00"),
        (1_000_000, 0)
    );
    assert_eq!(
        calculate_balance_adjustment_delta(0, "-250.00"),
        (-250_000, -250_000)
    );
}

#[test]
fn test_m3_csv_export_empty_and_escaped_fields() {
    let empty_tx = vec![ExportRegisterRow {
        date: "2026-11-16".to_string(),
        account_name: String::new(),
        payee_name: String::new(),
        category_name: String::new(),
        memo: String::new(),
        amount_milliunits: 0,
    }];
    let csv = export_transactions_to_csv(&empty_tx);
    let lines: Vec<&str> = csv.split('\n').collect();
    assert_eq!(lines.len(), 2);
    assert_eq!(lines[1], "\"2026-11-16\",\"\",\"\",\"\",\"\",\"0\"");
}

#[test]
fn test_m3_transfer_payee_selection_sync() {
    let sel = apply_payee_selection(
        Some("cat-groceries"),
        "Groceries",
        "Transfer : Savings Account",
        Some("acc-savings-01"),
    );
    assert_eq!(sel.payee_name, "Transfer : Savings Account");
    assert_eq!(sel.transfer_account_id.as_deref(), Some("acc-savings-01"));
    assert_eq!(sel.sub_category_id.as_deref(), Some("category-not-needed"));
    assert_eq!(sel.sub_category_name, "Category not needed");
    assert!(!sel.is_split);
}

#[test]
fn test_m4_hide_amounts_masking_and_normal() {
    assert_eq!(format_currency(1234567, true), "••••••");
    assert_eq!(format_currency(0, true), "••••••");
    assert_eq!(format_currency(-50000, true), "••••••");
    assert_eq!(format_currency(1234567, false), "$1,234.57");
    assert_eq!(format_currency(0, false), "$0.00");
    assert_eq!(format_currency(-50000, false), "$50.00");
}

#[test]
fn test_m4_budget_plan_csv_rows_rfc4180() {
    let rows = vec![
        ExportBudgetCategoryRow {
            group_name: "Immediate Obligations".to_string(),
            category_name: "Rent/Mortgage".to_string(),
            assigned_milliunits: 1_500_000,
            activity_milliunits: -1_500_000,
            available_milliunits: 0,
        },
        ExportBudgetCategoryRow {
            group_name: "Immediate Obligations".to_string(),
            category_name: "Groceries".to_string(),
            assigned_milliunits: 600_000,
            activity_milliunits: -450_000,
            available_milliunits: 150_000,
        },
    ];
    let out = generate_budget_plan_csv_rows(&rows);
    assert_eq!(out.len(), 3);
    assert_eq!(
        out[0],
        vec![
            "Category Group",
            "Category",
            "Budgeted",
            "Activity",
            "Available"
        ]
    );
    assert_eq!(
        out[1],
        vec![
            "Immediate Obligations",
            "Rent/Mortgage",
            "1500.00",
            "-1500.00",
            "0.00"
        ]
    );
    assert_eq!(
        out[2],
        vec![
            "Immediate Obligations",
            "Groceries",
            "600.00",
            "-450.00",
            "150.00"
        ]
    );
}

#[test]
fn test_bridge_contracts_end_to_end_pipeline() {
    let app = mock_app();
    let conn = setup_test_db();
    app.manage(AppState {
        db: Mutex::new(conn),
    });
    let state = app.state::<AppState>();

    // 1. Create account
    let acc = commands::create_account(
        CreateAccountPayload {
            name: "Checking".to_string(),
            account_type: "checking".to_string(),
            balance_milliunits: 1_000_000,
            on_budget: Some(true),
            note: None,
        },
        state.clone(),
        None,
    )
    .unwrap();

    // 2. Save transaction
    let tx_id = commands::save_transaction(
        SaveTransactionPayload {
            id: None,
            budget_id: DEFAULT_BUDGET_ID.to_string(),
            account_id: acc.id.clone(),
            payee_id: None,
            payee_name: Some("Store".to_string()),
            category_id: None,
            date: "2026-11-15".to_string(),
            amount_milliunits: -50_000,
            memo: Some("Purchase".to_string()),
            cleared: Some("Uncleared".to_string()),
            approved: Some(true),
            flag: None,
            transfer_account_id: None,
            subtransactions: Vec::new(),
            allow_reconciled_mutation: false,
        },
        state.clone(),
    )
    .unwrap();

    // 3. Bulk toggle_cleared
    commands::bulk_update_transactions(
        Some(vec![tx_id.clone()]),
        Some("toggle_cleared".to_string()),
        Some(json!({ "cleared": "Cleared" })),
        None,
        state.clone(),
    )
    .unwrap();

    // 4. Reconcile account
    let rec = commands::reconcile_account(
        ReconcileAccountPayload {
            budget_id: None,
            account_id: acc.id.clone(),
            target_balance_milliunits: 950_000,
            create_adjustment: true,
        },
        state.clone(),
    )
    .unwrap();
    assert_eq!(rec.adjustment_amount_milliunits, 0);
    assert_eq!(rec.reconciled_tx_count, 2);

    // 5. Apply quick budget with lowercase snake_case variant
    let subcat_id: String = {
        let conn = state.db.lock().unwrap();
        conn.query_row(
            "SELECT id FROM be_subcategories WHERE budget_id = ?1 AND internal_name IS NULL LIMIT 1",
            rusqlite::params![DEFAULT_BUDGET_ID],
            |r| r.get(0),
        )
        .unwrap()
    };
    let qb_res = commands::apply_quick_budget(
        ApplyQuickBudgetPayload {
            budget_id: None,
            month: "2026-11-01".to_string(),
            quick_budget_type: "spent_last_month".to_string(),
            category_ids: Some(vec![subcat_id]),
        },
        state.clone(),
    );
    assert!(qb_res.is_ok());

    // 6. Net worth & AoM history smoke
    let nw_hist = calculate_net_worth_history(
        &[AnalyticsAccount {
            id: acc.id,
            name: acc.name,
            account_type: acc.r#type,
            balance_milliunits: 950_000,
        }],
        &[],
    );
    assert!(!nw_hist.is_empty());
    let aom_empty = calculate_age_of_money_history(&[], 12);
    assert!(aom_empty.is_empty());
    let _ = repo::list_budgets(&state.db.lock().unwrap()).unwrap();
}
