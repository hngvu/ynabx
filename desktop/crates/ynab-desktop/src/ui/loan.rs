//! Loan Account Workspace (`LoanAccountWorkspace`, `EditLoanTermsModal`)
//! Provides YNAB Ember Loan Planner parity using 100% integer milliunit and fixed-point math:
//! - Top toggle: `Overview` (Loan Planner) vs `Account Activity` (Register)
//! - KPI cards: Remaining Balance, APR, Monthly Payment (Principal + Interest + Escrow breakdown), Payoff Date, Total Interest Remaining
//! - Interactive Loan Payoff Simulator: Extra Monthly + One-Time Extra -> Interest Saved, Time Saved (Years & Months), New Payoff Date
//! - Pure-integer SVG Payoff Curve Chart (Baseline Debt Curve vs Accelerated Payoff Curve)
//! - Expandable Monthly Amortization Schedule table
//! - `EditLoanTermsModal` for APR, Minimum Monthly Payment, Monthly Escrow, and Original Balance

#![deny(clippy::float_arithmetic)]

use dioxus::prelude::*;

use crate::state::{ActiveModal, AppStore};
use crate::ui::accounts::AccountRegisterPanel;
use crate::ui::core::{Icon, YnabButton};
use ynab_core::analytics::MONTH_NAMES;
use ynab_core::calc::calculator::evaluate_formula_milliunits;
use ynab_core::repo::{parse_year_month, AccountDto};

const MAX_AMORTIZATION_MONTHS: u32 = 600;

/// Persistent / editable loan terms view-model wired by `integrator` via `AppStore::get_loan_terms`
/// and `AppStore::save_loan_terms`.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct LoanTermsVm {
    pub account_id: String,
    /// Positive magnitude of original loan principal in milliunits (`$250,000.00` = `250_000_000`).
    pub original_balance_milliunits: i64,
    /// Annual Percentage Rate in millipercent (`1_000` = `1.000%`, `6_500` = `6.500%`).
    pub apr_millipercent: u32,
    /// Required minimum total monthly payment (P&I + Escrow) in positive milliunits.
    pub minimum_payment_milliunits: i64,
    /// Monthly escrow portion included in the payment in positive milliunits.
    pub monthly_escrow_milliunits: i64,
    /// Optional start date `"YYYY-MM-DD"`.
    pub start_date: Option<String>,
}

/// Payload passed to `AppStore::save_loan_terms`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SaveLoanTermsPayload {
    pub account_id: String,
    pub original_balance_milliunits: i64,
    pub apr_millipercent: u32,
    pub minimum_payment_milliunits: i64,
    pub monthly_escrow_milliunits: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AmortizationMonthVm {
    pub month_index: u32,
    pub date_iso: String,
    pub date_label: String,
    pub starting_balance_milliunits: i64,
    pub payment_milliunits: i64,
    pub principal_milliunits: i64,
    pub interest_milliunits: i64,
    pub escrow_milliunits: i64,
    pub ending_balance_milliunits: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LoanScheduleVm {
    pub months: Vec<AmortizationMonthVm>,
    pub payoff_months: u32,
    pub payoff_date_label: String,
    pub total_interest_milliunits: i64,
    pub total_escrow_milliunits: i64,
    pub total_paid_milliunits: i64,
    pub next_interest_milliunits: i64,
    pub next_principal_milliunits: i64,
    pub next_escrow_milliunits: i64,
    pub is_negative_amortization: bool,
    pub is_paid_off: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LoanSimulationVm {
    pub baseline: LoanScheduleVm,
    pub accelerated: LoanScheduleVm,
    pub interest_saved_milliunits: i64,
    pub months_saved: u32,
    pub time_saved_label: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum LoanTab {
    Overview,
    Activity,
}

/// Returns true if the account type is any of the 6 YNAB loan account types.
pub fn is_loan_account_type(acc_type: &str) -> bool {
    matches!(
        acc_type.trim().to_ascii_lowercase().as_str(),
        "mortgage"
            | "autoloan"
            | "auto_loan"
            | "studentloan"
            | "student_loan"
            | "personalloan"
            | "personal_loan"
            | "medicaldebt"
            | "medical_debt"
            | "otherdebt"
            | "other_debt"
            | "loan"
    )
}

fn loan_type_display_label(acc_type: &str) -> &'static str {
    match acc_type.trim().to_ascii_lowercase().as_str() {
        "mortgage" => "Mortgage",
        "autoloan" | "auto_loan" => "Auto Loan",
        "studentloan" | "student_loan" => "Student Loan",
        "personalloan" | "personal_loan" => "Personal Loan",
        "medicaldebt" | "medical_debt" => "Medical Debt",
        _ => "Other Debt / Loan",
    }
}

/// Formats APR millipercent (`6_500` -> `"6.50%"`, `6_125` -> `"6.125%"`).
pub fn format_apr_millipercent(apr_millipercent: u32) -> String {
    let whole = apr_millipercent / 1000;
    let rem = apr_millipercent % 1000;
    if rem.is_multiple_of(10) {
        format!("{}.{:02}%", whole, rem / 10)
    } else {
        format!("{}.{:03}%", whole, rem)
    }
}

/// Formats APR millipercent as plain input string (`6_500` -> `"6.50"`).
pub fn format_apr_plain_input(apr_millipercent: u32) -> String {
    let whole = apr_millipercent / 1000;
    let rem = apr_millipercent % 1000;
    if rem.is_multiple_of(10) {
        format!("{}.{:02}", whole, rem / 10)
    } else {
        format!("{}.{:03}", whole, rem)
    }
}

/// Parses an APR percentage string (`"6.5%"` or `"6.125"`) into millipercent (`6_500`, `6_125`).
pub fn parse_apr_to_millipercent(raw: &str) -> Option<u32> {
    let cleaned = raw.replace('%', "");
    let milli = evaluate_formula_milliunits(cleaned.trim())?;
    let clamped = milli.clamp(0, 100_000);
    Some(clamped as u32)
}

/// Formats a duration in months into `"X years, Y months"` / `"Y months"`.
pub fn format_months_years_label(total_months: u32) -> String {
    if total_months == 0 {
        return "0 months".to_string();
    }
    let years = total_months / 12;
    let months = total_months % 12;
    let y_part = match years {
        0 => None,
        1 => Some("1 year".to_string()),
        y => Some(format!("{y} years")),
    };
    let m_part = match months {
        0 => None,
        1 => Some("1 month".to_string()),
        m => Some(format!("{m} months")),
    };
    match (y_part, m_part) {
        (Some(y), Some(m)) => format!("{y}, {m}"),
        (Some(y), None) => y,
        (None, Some(m)) => m,
        (None, None) => "0 months".to_string(),
    }
}

fn add_months_ym(start_year: i32, start_month: u32, offset: u32) -> (i32, u32) {
    let total_zero_based = (start_month.saturating_sub(1)) + offset;
    let year_add = (total_zero_based / 12) as i32;
    let month = (total_zero_based % 12) + 1;
    (start_year + year_add, month)
}

fn format_ym_short(year: i32, month: u32) -> String {
    let idx = (month.saturating_sub(1) as usize).min(11);
    format!("{} {}", MONTH_NAMES[idx], year)
}

/// Computes integer monthly interest with half-up rounding via `i128`.
/// `apr_millipercent = 1_000` represents `1.000%`, so annual fraction is `apr / 100_000`
/// and monthly fraction is `apr / 1_200_000`.
pub fn compute_monthly_interest_milliunits(balance_milliunits: i64, apr_millipercent: u32) -> i64 {
    if balance_milliunits <= 0 || apr_millipercent == 0 {
        return 0;
    }
    let num = (balance_milliunits as i128) * (apr_millipercent as i128) + 600_000;
    (num / 1_200_000) as i64
}

/// Pure-integer month-by-month amortization schedule solver matching YNAB SLIK (`solveAmortization`).
pub fn compute_loan_schedule(
    remaining_balance_milliunits: i64,
    apr_millipercent: u32,
    minimum_payment_milliunits: i64,
    monthly_escrow_milliunits: i64,
    extra_monthly_milliunits: i64,
    one_time_extra_milliunits: i64,
    start_month_iso: &str,
) -> LoanScheduleVm {
    let initial_balance = remaining_balance_milliunits.max(0);
    let escrow = monthly_escrow_milliunits.max(0);
    let base_payment = minimum_payment_milliunits.max(0);
    let extra_monthly = extra_monthly_milliunits.max(0);
    let one_time_extra = one_time_extra_milliunits.max(0);

    if initial_balance == 0 {
        return LoanScheduleVm {
            months: Vec::new(),
            payoff_months: 0,
            payoff_date_label: "Paid Off".to_string(),
            total_interest_milliunits: 0,
            total_escrow_milliunits: 0,
            total_paid_milliunits: 0,
            next_interest_milliunits: 0,
            next_principal_milliunits: 0,
            next_escrow_milliunits: 0,
            is_negative_amortization: false,
            is_paid_off: true,
        };
    }

    let (start_y, start_m) = parse_year_month(start_month_iso);
    let recurring_pi = base_payment.saturating_sub(escrow) + extra_monthly;

    let mut balance = initial_balance;
    let mut months: Vec<AmortizationMonthVm> = Vec::new();
    let mut total_interest: i64 = 0;
    let mut total_escrow: i64 = 0;
    let mut total_paid: i64 = 0;
    let mut negative_amort_triggered = false;

    let max_iter = if recurring_pi == 0 && one_time_extra == 0 {
        12
    } else {
        MAX_AMORTIZATION_MONTHS
    };

    for idx in 1..=max_iter {
        if balance <= 0 {
            break;
        }
        let (my, mm) = add_months_ym(start_y, start_m, idx - 1);
        let date_iso = format!("{my:04}-{mm:02}-01");
        let date_label = format_ym_short(my, mm);

        let interest = compute_monthly_interest_milliunits(balance, apr_millipercent);
        let one_time_this_month = if idx == 1 { one_time_extra } else { 0 };
        let pi_budget = recurring_pi.saturating_add(one_time_this_month);

        let (actual_principal, actual_interest, actual_escrow, actual_payment, next_bal) =
            if pi_budget <= 0 {
                negative_amort_triggered = true;
                let nb = balance.saturating_add(interest);
                (0, interest, escrow, escrow, nb)
            } else if balance.saturating_add(interest) <= pi_budget {
                let p = balance;
                let pay = p.saturating_add(interest).saturating_add(escrow);
                (p, interest, escrow, pay, 0)
            } else if pi_budget <= interest {
                negative_amort_triggered = true;
                // Payment doesn't cover monthly interest; unpaid interest capitalizes onto balance
                let principal_delta = pi_budget - interest; // <= 0
                let nb = balance.saturating_sub(principal_delta);
                let pay = pi_budget.saturating_add(escrow);
                (principal_delta, interest, escrow, pay, nb)
            } else {
                let p = pi_budget - interest;
                let nb = balance.saturating_sub(p);
                let pay = pi_budget.saturating_add(escrow);
                (p, interest, escrow, pay, nb)
            };

        total_interest = total_interest.saturating_add(actual_interest);
        total_escrow = total_escrow.saturating_add(actual_escrow);
        total_paid = total_paid.saturating_add(actual_payment);

        months.push(AmortizationMonthVm {
            month_index: idx,
            date_iso,
            date_label,
            starting_balance_milliunits: balance,
            payment_milliunits: actual_payment,
            principal_milliunits: actual_principal,
            interest_milliunits: actual_interest,
            escrow_milliunits: actual_escrow,
            ending_balance_milliunits: next_bal,
        });

        balance = next_bal;

        if negative_amort_triggered && idx >= 60 {
            break;
        }
    }

    let paid_off_completely = balance == 0;
    let is_negative_amort = negative_amort_triggered || !paid_off_completely;
    let payoff_months = if paid_off_completely {
        months.len() as u32
    } else {
        MAX_AMORTIZATION_MONTHS
    };
    let payoff_date_label = if paid_off_completely {
        months
            .last()
            .map(|m| m.date_label.clone())
            .unwrap_or_else(|| "Paid Off".to_string())
    } else if recurring_pi == 0 {
        "No Payment Set".to_string()
    } else {
        "Never (Payment ≤ Interest)".to_string()
    };

    let (next_principal, next_interest, next_escrow) = months
        .first()
        .map(|m| {
            (
                m.principal_milliunits,
                m.interest_milliunits,
                m.escrow_milliunits,
            )
        })
        .unwrap_or((0, 0, 0));

    LoanScheduleVm {
        months,
        payoff_months,
        payoff_date_label,
        total_interest_milliunits: total_interest,
        total_escrow_milliunits: total_escrow,
        total_paid_milliunits: total_paid,
        next_interest_milliunits: next_interest,
        next_principal_milliunits: next_principal,
        next_escrow_milliunits: next_escrow,
        is_negative_amortization: is_negative_amort,
        is_paid_off: false,
    }
}

/// Runs baseline vs accelerated payoff simulation in pure integer arithmetic.
pub fn simulate_loan_payoff_vm(
    remaining_balance_milliunits: i64,
    terms: &LoanTermsVm,
    extra_monthly_milliunits: i64,
    one_time_extra_milliunits: i64,
    start_month_iso: &str,
) -> LoanSimulationVm {
    let baseline = compute_loan_schedule(
        remaining_balance_milliunits,
        terms.apr_millipercent,
        terms.minimum_payment_milliunits,
        terms.monthly_escrow_milliunits,
        0,
        0,
        start_month_iso,
    );
    let accelerated = compute_loan_schedule(
        remaining_balance_milliunits,
        terms.apr_millipercent,
        terms.minimum_payment_milliunits,
        terms.monthly_escrow_milliunits,
        extra_monthly_milliunits,
        one_time_extra_milliunits,
        start_month_iso,
    );

    let interest_saved_milliunits = baseline
        .total_interest_milliunits
        .saturating_sub(accelerated.total_interest_milliunits);
    let months_saved = baseline
        .payoff_months
        .saturating_sub(accelerated.payoff_months);
    let time_saved_label = format_months_years_label(months_saved);

    LoanSimulationVm {
        baseline,
        accelerated,
        interest_saved_milliunits,
        months_saved,
        time_saved_label,
    }
}

struct PayoffCurvePaths {
    line_d: String,
    area_d: String,
    start_x_str: String,
    start_y_str: String,
    end_x_str: String,
    end_y_str: String,
    end_x_px: i64,
}

fn fmt_tenth_px(tenths: i64) -> String {
    let sign = if tenths < 0 { "-" } else { "" };
    let abs = tenths.abs();
    format!("{sign}{}.{}", abs / 10, abs % 10)
}

/// Computes an integer fixed-point (tenths of an SVG unit) Catmull-Rom spline converted
/// directly into SVG cubic Bezier commands (`M ... C x1 y1, x2 y2, x y`) with zero floats.
fn build_catmull_rom_bezier_paths(
    start_balance: i64,
    months: &[AmortizationMonthVm],
    max_months: i64,
    max_balance: i64,
) -> PayoffCurvePaths {
    let x_left_tenth: i64 = 740;
    let width_tenth: i64 = 5820;
    let y_top_tenth: i64 = 240;
    let y_bottom_tenth: i64 = 2160;
    let height_tenth: i64 = y_bottom_tenth - y_top_tenth;

    let safe_max_m = max_months.max(1);
    let safe_max_b = max_balance.max(1) as i128;

    let map_x_tenth = |m_idx: i64| -> i64 { x_left_tenth + (m_idx * width_tenth) / safe_max_m };
    let map_y_tenth = |bal: i64| -> i64 {
        let clamped = bal.clamp(0, max_balance) as i128;
        let offset = (clamped * (height_tenth as i128)) / safe_max_b;
        y_bottom_tenth - (offset as i64)
    };

    let y0_tenth = map_y_tenth(start_balance);
    let mut pts: Vec<(i64, i64)> = Vec::new();
    pts.push((x_left_tenth, y0_tenth));

    let total = months.len();
    let step = (total / 36).max(1);

    for (idx, row) in months.iter().enumerate() {
        let m_num = (idx + 1) as i64;
        if idx % step == 0 || idx + 1 == total || row.ending_balance_milliunits == 0 {
            let px = map_x_tenth(m_num);
            let py = map_y_tenth(row.ending_balance_milliunits);
            if pts.last().copied() != Some((px, py)) {
                pts.push((px, py));
            }
            if row.ending_balance_milliunits == 0 {
                break;
            }
        }
    }

    let last_pt = *pts.last().unwrap_or(&(x_left_tenth, y0_tenth));
    let mut line_d = format!("M {} {}", fmt_tenth_px(pts[0].0), fmt_tenth_px(pts[0].1));

    if pts.len() >= 2 {
        let last_idx = pts.len() - 1;
        for i in 0..last_idx {
            let p0 = if i == 0 { pts[0] } else { pts[i - 1] };
            let p1 = pts[i];
            let p2 = pts[i + 1];
            let p3 = if i + 2 <= last_idx {
                pts[i + 2]
            } else {
                pts[last_idx]
            };

            // Uniform Catmull-Rom to cubic Bezier control points scaled in tenths, clamped
            // vertically to `[y_top_tenth, y_bottom_tenth]` and horizontally within `[p1.x, p2.x]`.
            let c1x = (p1.0 + (p2.0 - p0.0) / 6).clamp(p1.0, p2.0);
            let c2x = (p2.0 - (p3.0 - p1.0) / 6).clamp(p1.0, p2.0);
            let (mut c1y, mut c2y) = if p1.1 == p2.1 && p2.1 == y_bottom_tenth {
                (y_bottom_tenth, y_bottom_tenth)
            } else {
                (
                    (p1.1 + (p2.1 - p0.1) / 6).clamp(y_top_tenth, y_bottom_tenth),
                    (p2.1 - (p3.1 - p1.1) / 6).clamp(y_top_tenth, y_bottom_tenth),
                )
            };
            if p1.1 <= p2.1 {
                c1y = c1y.max(p1.1);
                c2y = c2y.min(p2.1);
            }

            line_d.push_str(&format!(
                " C {} {}, {} {}, {} {}",
                fmt_tenth_px(c1x),
                fmt_tenth_px(c1y),
                fmt_tenth_px(c2x),
                fmt_tenth_px(c2y),
                fmt_tenth_px(p2.0),
                fmt_tenth_px(p2.1)
            ));
        }
    }

    let area_d = format!(
        "{line_d} L {} {} L {} {} Z",
        fmt_tenth_px(last_pt.0),
        fmt_tenth_px(y_bottom_tenth),
        fmt_tenth_px(x_left_tenth),
        fmt_tenth_px(y_bottom_tenth)
    );

    PayoffCurvePaths {
        line_d,
        area_d,
        start_x_str: fmt_tenth_px(x_left_tenth),
        start_y_str: fmt_tenth_px(y0_tenth),
        end_x_str: fmt_tenth_px(last_pt.0),
        end_y_str: fmt_tenth_px(last_pt.1),
        end_x_px: last_pt.0 / 10,
    }
}

#[component]
pub fn LoanAccountWorkspace(account: AccountDto) -> Element {
    let mut store = use_context::<AppStore>();
    let mut active_tab = use_signal(|| LoanTab::Overview);
    let mut extra_monthly_input = use_signal(|| "0.00".to_string());
    let mut one_time_input = use_signal(|| "0.00".to_string());
    let mut show_schedule = use_signal(|| false);
    let mut schedule_mode = use_signal(|| "accelerated".to_string());

    let terms = store.get_loan_terms(&account.id);
    let current_month_iso = store.current_month.read().clone();

    // Loan accounts carry debt as negative balance (`-$250,000` -> `250_000_000` remaining owed).
    let remaining_balance = if account.balance_milliunits < 0 {
        account.balance_milliunits.abs()
    } else {
        0
    };
    let original_balance = if terms.original_balance_milliunits > 0 {
        terms.original_balance_milliunits.max(remaining_balance)
    } else {
        remaining_balance
    };
    let paid_so_far = original_balance.saturating_sub(remaining_balance);
    let paid_percent_tenths: i64 = if original_balance > 0 {
        (((paid_so_far as i128) * 1000) / (original_balance as i128)).clamp(0, 1000) as i64
    } else if remaining_balance == 0 {
        1000
    } else {
        0
    };
    let paid_pct_bar = (paid_percent_tenths / 10).clamp(0, 100);
    let remaining_pct_tenths = 1000 - paid_percent_tenths;

    let extra_monthly_milli = evaluate_formula_milliunits(&extra_monthly_input.read())
        .unwrap_or(0)
        .max(0);
    let one_time_milli = evaluate_formula_milliunits(&one_time_input.read())
        .unwrap_or(0)
        .max(0);

    let sim = simulate_loan_payoff_vm(
        remaining_balance,
        &terms,
        extra_monthly_milli,
        one_time_milli,
        &current_month_iso,
    );

    let has_missing_details = terms.minimum_payment_milliunits == 0 && remaining_balance > 0;
    let active_schedule = if *schedule_mode.read() == "baseline" {
        &sim.baseline
    } else {
        &sim.accelerated
    };

    // Pure-integer Catmull-Rom cubic Bezier SVG Payoff Curve coordinates
    let chart_max_months = sim
        .baseline
        .months
        .len()
        .max(sim.accelerated.months.len())
        .max(1) as i64;
    let mut chart_max_balance = remaining_balance.max(1);
    for m in &sim.baseline.months {
        if m.ending_balance_milliunits > chart_max_balance {
            chart_max_balance = m.ending_balance_milliunits;
        }
    }
    let base_curve = build_catmull_rom_bezier_paths(
        remaining_balance,
        &sim.baseline.months,
        chart_max_months,
        chart_max_balance,
    );
    let acc_curve = build_catmull_rom_bezier_paths(
        remaining_balance,
        &sim.accelerated.months,
        chart_max_months,
        chart_max_balance,
    );
    let acc_label_x = acc_curve.end_x_px.clamp(140, 585);
    let mid_month_idx = (chart_max_months / 2).max(1) as u32;
    let (cur_y, cur_m) = parse_year_month(&current_month_iso);
    let (mid_y, mid_m) = add_months_ym(cur_y, cur_m, mid_month_idx);

    let acc_for_edit = account.clone();
    let acc_for_terms = account.clone();
    let acc_for_terms_banner = account.clone();
    let acc_for_rec = account.clone();

    let type_label = loan_type_display_label(&account.r#type);
    let last_updated = match account.last_reconciled_at.as_deref() {
        Some(ts) => format!("Updated {}", &ts[..ts.len().min(10)]),
        None => "Not yet updated".to_string(),
    };

    let has_extra = extra_monthly_milli > 0 || one_time_milli > 0;
    let is_overview = *active_tab.read() == LoanTab::Overview;
    let comparison_class = if sim.baseline.is_negative_amortization && !sim.baseline.is_paid_off {
        "paydown-comparison warning loan-comparison-summary"
    } else if has_extra || sim.baseline.is_paid_off {
        "paydown-comparison positive loan-comparison-summary"
    } else {
        "paydown-comparison neutral loan-comparison-summary"
    };

    rsx! {
        section {
            class: "scroll-wrap ynab-u content loan-account loan-account-lpv2",

            // Loan Account Header
            header {
                class: "loan-account-account-header",
                div {
                    class: "loan-account-header-top",
                    div {
                        class: "loan-account-header-account-details",
                        div {
                            class: "loan-account-header-title-row",
                            h1 {
                                class: "loan-account-header-account-name user-data",
                                title: "{account.name}",
                                "{account.name}"
                            }
                            div {
                                class: "segmented-control textOnlyOption",
                                button {
                                    class: if is_overview { "segmented-control-button selected" } else { "segmented-control-button" },
                                    r#type: "button",
                                    onclick: move |_| active_tab.set(LoanTab::Overview),
                                    "Overview"
                                }
                                button {
                                    class: if !is_overview { "segmented-control-button selected" } else { "segmented-control-button" },
                                    r#type: "button",
                                    onclick: move |_| active_tab.set(LoanTab::Activity),
                                    "Account Activity"
                                }
                            }
                        }
                        div {
                            class: "loan-account-header-account-info",
                            span {
                                class: "icon-and-label",
                                Icon { name: "line_chart_down", width: 12, height: 12 }
                                "{type_label}"
                            }
                            span {
                                class: "icon-and-label",
                                Icon { name: "lock", width: 12, height: 12 }
                                span { class: "loan-account-header-balance-last-updated-date", "{last_updated}" }
                            }
                        }
                    }

                    div {
                        class: "loan-account-header-actions",
                        button {
                            class: "loan-account-header-button loan-account-header-edit-account-button",
                            r#type: "button",
                            title: "Edit Account",
                            onclick: move |_| store.active_modal.set(ActiveModal::EditAccount(acc_for_edit.clone())),
                            Icon { name: "pencil", width: 14, height: 14 }
                        }
                        button {
                            class: "loan-account-header-button loan-account-header-edit-terms-button",
                            r#type: "button",
                            onclick: move |_| store.active_modal.set(ActiveModal::EditLoanTerms(acc_for_terms.clone())),
                            Icon { name: "gear", width: 14, height: 14 }
                            span { "Edit Loan Terms" }
                        }
                        button {
                            class: "loan-account-header-button loan-account-header-update-balance-button",
                            r#type: "button",
                            onclick: move |_| store.active_modal.set(ActiveModal::ReconcileWizard(acc_for_rec.clone())),
                            "Update Balance"
                        }
                    }
                }

                hr {}

                // KPI Cards Strip
                div {
                    class: "loan-account-header-balances loan-account-header-balances-grid",
                    div {
                        class: "loan-account-header-element",
                        div {
                            class: "loan-account-header-element-amount loan-account-header-element-balance user-data",
                            span { class: "currency tabular-nums", "{store.format_money(remaining_balance)}" }
                        }
                        div {
                            class: "loan-account-header-element-label",
                            "Remaining Balance"
                        }
                    }
                    div {
                        class: "loan-account-header-element",
                        div {
                            class: "loan-account-header-element-amount loan-account-header-element-interest-rate",
                            "{format_apr_millipercent(terms.apr_millipercent)}"
                        }
                        div {
                            class: "loan-account-header-element-label",
                            "Interest Rate (APR)"
                        }
                    }
                    div {
                        class: "loan-account-header-element",
                        div {
                            class: "loan-account-header-element-amount loan-account-header-element-min-payment-amount",
                            span { class: "currency tabular-nums", "{store.format_money(terms.minimum_payment_milliunits)}" }
                        }
                        div {
                            class: "loan-account-header-element-label",
                            "Monthly Payment"
                        }
                        div {
                            class: "loan-account-header-element-sublabel",
                            "P: {store.format_money(sim.baseline.next_principal_milliunits)} · I: {store.format_money(sim.baseline.next_interest_milliunits)} · Esc: {store.format_money(sim.baseline.next_escrow_milliunits)}"
                        }
                    }
                    div {
                        class: "loan-account-header-element",
                        div {
                            class: "loan-account-header-element-amount loan-account-header-element-payoff-date",
                            strong { "{sim.baseline.payoff_date_label}" }
                        }
                        div {
                            class: "loan-account-header-element-label",
                            "Payoff Date"
                        }
                    }
                    div {
                        class: "loan-account-header-element",
                        div {
                            class: "loan-account-header-element-amount loan-account-header-element-total-interest",
                            span { class: "currency tabular-nums", "{store.format_money(sim.baseline.total_interest_milliunits)}" }
                        }
                        div {
                            class: "loan-account-header-element-label",
                            "Total Interest Remaining"
                        }
                    }
                }
            }

            if is_overview {
                div {
                    class: "loan-account-container",
                    section {
                        class: "loan-account-main",

                        // Missing Terms / Negative Amortization Warning Banner
                        if has_missing_details {
                            div {
                                class: "loan-account-payoff-simulator-banner",
                                div {
                                    class: "banner-text",
                                    div { class: "banner-heading", "Finish setting up your loan details" }
                                    div {
                                        class: "banner-subheading",
                                        "Add your Interest Rate (APR), Minimum Monthly Payment, and Escrow to unlock payoff forecasts and interest savings."
                                    }
                                }
                                YnabButton {
                                    variant: "primary",
                                    onclick: move |_| store.active_modal.set(ActiveModal::EditLoanTerms(acc_for_terms_banner.clone())),
                                    "Add Loan Details"
                                }
                            }
                        } else if sim.baseline.is_negative_amortization && !sim.baseline.is_paid_off {
                            div {
                                class: "loan-negative-amort-banner",
                                Icon { name: "exclamation_mark_triangle_fill", width: 16, height: 16 }
                                span {
                                    strong { "Negative Amortization Warning: " }
                                    "Your current principal & interest payment does not exceed monthly interest ({store.format_money(sim.baseline.next_interest_milliunits)}/mo). Use the Payoff Simulator below or increase your minimum payment."
                                }
                            }
                        }

                        // Loan Progress Card
                        section {
                            class: "card loan-progress-container",
                            div {
                                class: "card-body loan-progress-card-body",
                                div {
                                    class: "loan-progress-intro",
                                    div {
                                        class: "loan-progress-title-group",
                                        h2 { "Your Loan's Progress" }
                                        div {
                                            class: "loan-progress-original-balance",
                                            "Original Balance: {store.format_money(original_balance)}"
                                        }
                                    }
                                    div {
                                        class: "loan-progress-balance-remaining",
                                        span {
                                            class: "loan-progress-balance-remaining-amount tabular-nums",
                                            "{store.format_money(paid_so_far)} "
                                        }
                                        span {
                                            class: "loan-progress-balance-remaining-percent",
                                            "paid so far ({paid_percent_tenths / 10}.{paid_percent_tenths % 10}%) · {remaining_pct_tenths / 10}.{remaining_pct_tenths % 10}% remaining"
                                        }
                                    }
                                }
                                svg {
                                    class: if sim.baseline.is_paid_off { "progress-bar positive" } else { "progress-bar" },
                                    width: "100%",
                                    height: "12",
                                    view_box: "0 0 1000 12",
                                    preserve_aspect_ratio: "none",
                                    rect {
                                        class: "background",
                                        x: "0",
                                        y: "0",
                                        width: "1000",
                                        height: "12",
                                    }
                                    rect {
                                        class: "percent",
                                        x: "0",
                                        y: "0",
                                        width: "{paid_pct_bar * 10}",
                                        height: "12",
                                    }
                                }
                            }
                        }

                        // Interactive Loan Payoff Simulator + Pure-Integer Catmull-Rom SVG Payoff Curve
                        section {
                            class: "card loan-account-payoff-simulator",
                            div {
                                class: "card-roll-up loan-simulator-card-header",
                                div {
                                    h2 { "Loan Payoff Simulator" }
                                    div {
                                        class: "loan-simulator-subtitle",
                                        "See how extra monthly or one-time payments reduce your interest and payoff timeline."
                                    }
                                }
                                if has_extra {
                                    YnabButton {
                                        variant: "secondary",
                                        class: "payoff-simulator-inputs-reset",
                                        onclick: move |_| {
                                            extra_monthly_input.set("0.00".to_string());
                                            one_time_input.set("0.00".to_string());
                                        },
                                        "Reset Simulator"
                                    }
                                }
                            }

                            div {
                                class: "card-body paydown-analysis loan-paydown-analysis-grid",

                                // Simulator Controls Left Panel
                                div {
                                    class: "payoff-simulator-inputs",

                                    div {
                                        class: "payoff-simulator-inputs-section",
                                        div {
                                            class: "payoff-simulator-inputs-section-label",
                                            "Required Minimum Payment"
                                        }
                                        div {
                                            class: "loan-simulator-min-payment-value tabular-nums",
                                            "{store.format_money(terms.minimum_payment_milliunits)}"
                                        }
                                    }

                                    div {
                                        class: "payoff-simulator-inputs-section",
                                        label {
                                            class: "payoff-simulator-inputs-section-label",
                                            "Extra Monthly Payment"
                                        }
                                        div {
                                            class: "ynab-new-currency-input is-editing loan-simulator-currency-wrap",
                                            input {
                                                class: "user-data",
                                                r#type: "text",
                                                value: "{extra_monthly_input}",
                                                placeholder: "0.00",
                                                oninput: move |e| extra_monthly_input.set(e.value()),
                                            }
                                        }
                                        div {
                                            class: "loan-quick-chips",
                                            for (amt_label, amt_val) in [("+$50", "50.00"), ("+$100", "100.00"), ("+$250", "250.00"), ("+$500", "500.00")] {
                                                {
                                                    let v = amt_val.to_string();
                                                    let is_chip_active = *extra_monthly_input.read() == v;
                                                    rsx! {
                                                        button {
                                                            key: "{amt_label}",
                                                            r#type: "button",
                                                            class: if is_chip_active { "loan-quick-chip active" } else { "loan-quick-chip" },
                                                            onclick: move |_| extra_monthly_input.set(v.clone()),
                                                            "{amt_label}"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    div {
                                        class: "payoff-simulator-inputs-section",
                                        label {
                                            class: "payoff-simulator-inputs-section-label",
                                            "One-Time Extra Payment"
                                        }
                                        div {
                                            class: "ynab-new-currency-input is-editing loan-simulator-currency-wrap",
                                            input {
                                                class: "user-data",
                                                r#type: "text",
                                                value: "{one_time_input}",
                                                placeholder: "0.00",
                                                oninput: move |e| one_time_input.set(e.value()),
                                            }
                                        }
                                        div {
                                            class: "loan-quick-chips",
                                            for (amt_label, amt_val) in [("+$500", "500.00"), ("+$1,000", "1000.00"), ("+$5,000", "5000.00")] {
                                                {
                                                    let v = amt_val.to_string();
                                                    let is_chip_active = *one_time_input.read() == v;
                                                    rsx! {
                                                        button {
                                                            key: "ot-{amt_label}",
                                                            r#type: "button",
                                                            class: if is_chip_active { "loan-quick-chip active" } else { "loan-quick-chip" },
                                                            onclick: move |_| one_time_input.set(v.clone()),
                                                            "{amt_label}"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    // Live Simulator Summary Stats
                                    div {
                                        class: "loan-simulator-summary",
                                        div {
                                            class: "loan-simulator-summary-row",
                                            span { class: "loan-simulator-summary-label", "Interest Saved" }
                                            strong {
                                                class: "loan-simulator-summary-positive tabular-nums",
                                                "{store.format_money(sim.interest_saved_milliunits)}"
                                            }
                                        }
                                        div {
                                            class: "loan-simulator-summary-row",
                                            span { class: "loan-simulator-summary-label", "Time Saved" }
                                            strong {
                                                class: "loan-simulator-summary-positive",
                                                "{sim.time_saved_label}"
                                            }
                                        }
                                        div {
                                            class: "loan-simulator-summary-row",
                                            span { class: "loan-simulator-summary-label", "New Payoff Date" }
                                            strong { "{sim.accelerated.payoff_date_label}" }
                                        }
                                        div {
                                            class: "loan-simulator-summary-row",
                                            span { class: "loan-simulator-summary-label", "Simulated Total Interest" }
                                            span { class: "tabular-nums", "{store.format_money(sim.accelerated.total_interest_milliunits)}" }
                                        }
                                    }
                                }

                                // Pure-Integer Catmull-Rom Cubic Bezier Payoff Curve Chart
                                div {
                                    class: "paydown-analysis-results",
                                    div {
                                        class: "{comparison_class}",
                                        div {
                                            class: "loan-comparison-kpi-grid",
                                            div {
                                                class: "loan-comparison-kpi-card",
                                                div { class: "loan-comparison-kpi-label", "Interest Saved" }
                                                div {
                                                    class: "loan-comparison-kpi-value is-positive tabular-nums",
                                                    "{store.format_money(sim.interest_saved_milliunits)}"
                                                }
                                            }
                                            div {
                                                class: "loan-comparison-kpi-card",
                                                div { class: "loan-comparison-kpi-label", "Time Saved" }
                                                div {
                                                    class: "loan-comparison-kpi-value is-primary",
                                                    "{sim.time_saved_label}"
                                                }
                                            }
                                            div {
                                                class: "loan-comparison-kpi-card",
                                                div { class: "loan-comparison-kpi-label", "New Payoff Date" }
                                                div {
                                                    class: "loan-comparison-kpi-value",
                                                    "{sim.accelerated.payoff_date_label}"
                                                }
                                            }
                                        }
                                    }

                                    div {
                                        class: "loan-paydown-chart",
                                        div {
                                            class: "loan-paydown-chart-body",
                                            svg {
                                                class: "bb-svg loan-paydown-svg",
                                                width: "100%",
                                                height: "256",
                                                view_box: "0 0 680 256",
                                                // Y-axis gridlines & labels (0%, 25%, 50%, 75%, 100%)
                                                g {
                                                    class: "bb-axis bb-axis-y",
                                                    for step_idx in 0i64..=4 {
                                                        {
                                                            let y_pos = 216 - step_idx * 48;
                                                            let val = (chart_max_balance * step_idx) / 4;
                                                            let y_lbl = y_pos + 4;
                                                            rsx! {
                                                                line {
                                                                    key: "grid-{step_idx}",
                                                                    class: "bb-ygrid",
                                                                    x1: "74",
                                                                    y1: "{y_pos}",
                                                                    x2: "656",
                                                                    y2: "{y_pos}",
                                                                }
                                                                g {
                                                                    class: "tick",
                                                                    text {
                                                                        x: "66",
                                                                        y: "{y_lbl}",
                                                                        text_anchor: "end",
                                                                        font_size: "10",
                                                                        "{store.format_money(val)}"
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }

                                                // Baseline Catmull-Rom area & dashed curve
                                                if !base_curve.area_d.is_empty() {
                                                    path {
                                                        class: "loan-chart-area-baseline",
                                                        d: "{base_curve.area_d}",
                                                    }
                                                }
                                                if !base_curve.line_d.is_empty() {
                                                    path {
                                                        class: "bb-line bb-line-neutralFuture loan-chart-line-baseline",
                                                        d: "{base_curve.line_d}",
                                                    }
                                                }

                                                // Accelerated Catmull-Rom area & smooth curve
                                                if !acc_curve.area_d.is_empty() {
                                                    path {
                                                        class: "loan-chart-area-accelerated",
                                                        d: "{acc_curve.area_d}",
                                                    }
                                                }
                                                if !acc_curve.line_d.is_empty() {
                                                    path {
                                                        class: "bb-line bb-line-simulation loan-chart-line-accelerated",
                                                        d: "{acc_curve.line_d}",
                                                    }
                                                }

                                                // Today & payoff endpoint markers
                                                circle {
                                                    class: "circle-today",
                                                    cx: "{acc_curve.start_x_str}",
                                                    cy: "{acc_curve.start_y_str}",
                                                    r: "4",
                                                }
                                                circle {
                                                    class: "loan-chart-marker-baseline",
                                                    cx: "{base_curve.end_x_str}",
                                                    cy: "{base_curve.end_y_str}",
                                                    r: "4",
                                                }
                                                circle {
                                                    class: "loan-chart-marker-accelerated",
                                                    cx: "{acc_curve.end_x_str}",
                                                    cy: "{acc_curve.end_y_str}",
                                                    r: "5",
                                                }

                                                // X-axis baseline, ticks & labels
                                                g {
                                                    class: "bb-axis bb-axis-x",
                                                    line {
                                                        class: "loan-chart-xaxis-line",
                                                        x1: "74",
                                                        y1: "216",
                                                        x2: "656",
                                                        y2: "216",
                                                    }
                                                    g {
                                                        class: "tick",
                                                        line { x1: "74", y1: "216", x2: "74", y2: "221" }
                                                        text {
                                                            x: "74",
                                                            y: "238",
                                                            text_anchor: "start",
                                                            font_size: "11",
                                                            "{format_ym_short(cur_y, cur_m)}"
                                                        }
                                                    }
                                                    if has_extra && sim.months_saved > 0 {
                                                        g {
                                                            class: "tick",
                                                            line { x1: "{acc_curve.end_x_str}", y1: "216", x2: "{acc_curve.end_x_str}", y2: "221" }
                                                            text {
                                                                class: "loan-chart-x-accelerated-label",
                                                                x: "{acc_label_x}",
                                                                y: "238",
                                                                text_anchor: "middle",
                                                                font_size: "11",
                                                                "{sim.accelerated.payoff_date_label}"
                                                            }
                                                        }
                                                    } else if chart_max_months > 4 {
                                                        g {
                                                            class: "tick",
                                                            line { x1: "365", y1: "216", x2: "365", y2: "221" }
                                                            text {
                                                                x: "365",
                                                                y: "238",
                                                                text_anchor: "middle",
                                                                font_size: "11",
                                                                "{format_ym_short(mid_y, mid_m)}"
                                                            }
                                                        }
                                                    }
                                                    g {
                                                        class: "tick",
                                                        line { x1: "656", y1: "216", x2: "656", y2: "221" }
                                                        text {
                                                            x: "656",
                                                            y: "238",
                                                            text_anchor: "end",
                                                            font_size: "11",
                                                            "{sim.baseline.payoff_date_label}"
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        // Legend
                                        ul {
                                            class: "loan-paydown-chart-legend",
                                            li {
                                                class: "series-legend-example-and-text",
                                                svg {
                                                    class: "series-example",
                                                    width: "24",
                                                    height: "6",
                                                    view_box: "0 0 24 6",
                                                    line {
                                                        class: "bb-line bb-line-neutralFuture loan-legend-line-baseline",
                                                        x1: "0",
                                                        y1: "3",
                                                        x2: "24",
                                                        y2: "3",
                                                    }
                                                }
                                                "Baseline Debt Curve ({sim.baseline.payoff_date_label})"
                                            }
                                            li {
                                                class: "series-legend-example-and-text",
                                                svg {
                                                    class: "series-example",
                                                    width: "24",
                                                    height: "6",
                                                    view_box: "0 0 24 6",
                                                    line {
                                                        class: "bb-line loan-legend-line-accelerated",
                                                        x1: "0",
                                                        y1: "3",
                                                        x2: "24",
                                                        y2: "3",
                                                    }
                                                }
                                                "Accelerated Payoff Curve ({sim.accelerated.payoff_date_label})"
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Expandable Monthly Amortization Schedule
                        section {
                            class: "card loan-schedule-card",
                            div {
                                class: "card-roll-up loan-schedule-header",
                                button {
                                    class: "loan-schedule-toggle",
                                    r#type: "button",
                                    onclick: move |_| {
                                        let cur = *show_schedule.read();
                                        show_schedule.set(!cur);
                                    },
                                    Icon {
                                        name: if *show_schedule.read() { "chevron_down" } else { "chevron_right" },
                                        width: 12,
                                        height: 12,
                                    }
                                    "Monthly Amortization Schedule ({active_schedule.months.len()} months)"
                                }
                                if *show_schedule.read() && has_extra {
                                    div {
                                        class: "loan-schedule-mode-actions",
                                        YnabButton {
                                            variant: if *schedule_mode.read() == "accelerated" { "primary" } else { "secondary" },
                                            onclick: move |_| schedule_mode.set("accelerated".to_string()),
                                            "With Extra Payments"
                                        }
                                        YnabButton {
                                            variant: if *schedule_mode.read() == "baseline" { "primary" } else { "secondary" },
                                            onclick: move |_| schedule_mode.set("baseline".to_string()),
                                            "Baseline"
                                        }
                                    }
                                }
                            }

                            if *show_schedule.read() {
                                div {
                                    class: "card-body loan-schedule-table-wrap",
                                    table {
                                        class: "ynab-table loan-schedule-table",
                                        thead {
                                            class: "ynab-table-head",
                                            tr {
                                                class: "ynab-table-row",
                                                th { class: "ynab-table-col", "#" }
                                                th { class: "ynab-table-col", "Month" }
                                                th { class: "ynab-table-col amount-column", "Start Balance" }
                                                th { class: "ynab-table-col amount-column", "Payment" }
                                                th { class: "ynab-table-col amount-column", "Principal" }
                                                th { class: "ynab-table-col amount-column", "Interest" }
                                                th { class: "ynab-table-col amount-column", "Escrow" }
                                                th { class: "ynab-table-col amount-column", "Ending Balance" }
                                            }
                                        }
                                        tbody {
                                            class: "ynab-table-body",
                                            for row in active_schedule.months.iter() {
                                                tr {
                                                    key: "{row.month_index}",
                                                    class: "ynab-table-row",
                                                    td { class: "ynab-table-col tabular-nums", "{row.month_index}" }
                                                    td { class: "ynab-table-col loan-schedule-month", "{row.date_label}" }
                                                    td { class: "ynab-table-col amount-column tabular-nums", "{store.format_money(row.starting_balance_milliunits)}" }
                                                    td { class: "ynab-table-col amount-column tabular-nums", "{store.format_money(row.payment_milliunits)}" }
                                                    td { class: "ynab-table-col amount-column tabular-nums loan-schedule-principal", "{store.format_money(row.principal_milliunits)}" }
                                                    td { class: "ynab-table-col amount-column tabular-nums loan-schedule-interest", "{store.format_money(row.interest_milliunits)}" }
                                                    td { class: "ynab-table-col amount-column tabular-nums", "{store.format_money(row.escrow_milliunits)}" }
                                                    td { class: "ynab-table-col amount-column tabular-nums loan-schedule-ending", "{store.format_money(row.ending_balance_milliunits)}" }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                // Embedded Account Activity Register
                AccountRegisterPanel {
                    selected_account_id: Some(account.id.clone()),
                    embedded_in_loan: true,
                }
            }
        }
    }
}

#[component]
pub fn EditLoanTermsModal(account: AccountDto) -> Element {
    let mut store = use_context::<AppStore>();
    let existing = store.get_loan_terms(&account.id);

    let init_orig = if existing.original_balance_milliunits > 0 {
        existing.original_balance_milliunits
    } else {
        account.balance_milliunits.abs()
    };

    let mut apr_str = use_signal(|| format_apr_plain_input(existing.apr_millipercent));
    let mut min_pay_str =
        use_signal(|| store.format_plain_decimal(existing.minimum_payment_milliunits));
    let mut escrow_str =
        use_signal(|| store.format_plain_decimal(existing.monthly_escrow_milliunits));
    let mut orig_bal_str = use_signal(|| store.format_plain_decimal(init_orig));
    let mut validation_error = use_signal(|| None::<String>);

    let acc_id = account.id.clone();

    rsx! {
        div {
            class: "dialog-overlay active modal-popup modal-loan-terms",
            onclick: move |_| store.active_modal.set(ActiveModal::None),
            div {
                class: "dialog regular",
                role: "dialog",
                aria_modal: "true",
                aria_labelledby: "edit-loan-terms-title",
                onclick: move |e| e.stop_propagation(),

                div {
                    class: "dialog-header",
                    div {
                        class: "dialog-title",
                        h1 { id: "edit-loan-terms-title", "Edit Loan Terms — {account.name}" }
                    }
                    button {
                        class: "dialog-close",
                        r#type: "button",
                        title: "Close",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        Icon { name: "close", width: 16, height: 16 }
                    }
                }

                div {
                    class: "scroll-content",
                    div {
                        class: "dialog-body legacy-form-fields",
                        if let Some(ref err) = *validation_error.read() {
                            div {
                                class: "modal-error-banner",
                                "{err}"
                            }
                        }
                        div {
                            class: "fieldset",
                            dl {
                                dt { class: "section-header", label { r#for: "loan-terms-apr", "Interest Rate (APR %)" } }
                                dd {
                                    class: "user-data",
                                    input {
                                        id: "loan-terms-apr",
                                        class: "user-data modal-account-settings-interest-rate",
                                        r#type: "text",
                                        autofocus: true,
                                        value: "{apr_str}",
                                        placeholder: "e.g. 6.50",
                                        oninput: move |e| apr_str.set(e.value()),
                                    }
                                }
                            }
                            dl {
                                dt { class: "section-header", label { r#for: "loan-terms-min-pay", "Minimum Monthly Payment" } }
                                dd {
                                    class: "user-data ynab-new-currency-input is-editing legacy-currency-input",
                                    input {
                                        id: "loan-terms-min-pay",
                                        class: "user-data modal-account-settings-minimum-payment",
                                        r#type: "text",
                                        value: "{min_pay_str}",
                                        placeholder: "e.g. 1500.00",
                                        oninput: move |e| min_pay_str.set(e.value()),
                                    }
                                }
                            }
                            dl {
                                dt { class: "section-header", label { r#for: "loan-terms-escrow", "Monthly Escrow (Taxes & Insurance)" } }
                                dd {
                                    class: "user-data ynab-new-currency-input is-editing legacy-currency-input",
                                    input {
                                        id: "loan-terms-escrow",
                                        class: "user-data modal-account-settings-escrow modal-account-settings-escrow-amount",
                                        r#type: "text",
                                        value: "{escrow_str}",
                                        placeholder: "0.00",
                                        oninput: move |e| escrow_str.set(e.value()),
                                    }
                                }
                            }
                            dl {
                                dt { class: "section-header", label { r#for: "loan-terms-orig-bal", "Original Loan Balance" } }
                                dd {
                                    class: "user-data ynab-new-currency-input is-editing legacy-currency-input",
                                    input {
                                        id: "loan-terms-orig-bal",
                                        class: "user-data modal-account-settings-original-balance",
                                        r#type: "text",
                                        value: "{orig_bal_str}",
                                        placeholder: "e.g. 250000.00",
                                        oninput: move |e| orig_bal_str.set(e.value()),
                                    }
                                    small {
                                        class: "loan-terms-helper-text",
                                        "Used to calculate principal paid down so far in Your Loan's Progress."
                                    }
                                }
                            }
                        }
                    }
                }

                div {
                    class: "dialog-footer",
                    YnabButton {
                        variant: "secondary",
                        class: "button-cancel",
                        onclick: move |_| store.active_modal.set(ActiveModal::None),
                        "Cancel"
                    }
                    YnabButton {
                        variant: "primary",
                        onclick: move |_| {
                            let Some(apr_milli) = parse_apr_to_millipercent(&apr_str.read()) else {
                                validation_error.set(Some("Enter a valid APR percentage (e.g. 6.50).".to_string()));
                                return;
                            };
                            let min_pay = evaluate_formula_milliunits(&min_pay_str.read())
                                .unwrap_or(0)
                                .abs();
                            let escrow = evaluate_formula_milliunits(&escrow_str.read())
                                .unwrap_or(0)
                                .abs();
                            let orig_bal = evaluate_formula_milliunits(&orig_bal_str.read())
                                .unwrap_or(init_orig)
                                .abs();
                            if escrow > min_pay && min_pay > 0 {
                                validation_error.set(Some("Monthly escrow cannot exceed minimum monthly payment.".to_string()));
                                return;
                            }
                            store.save_loan_terms(SaveLoanTermsPayload {
                                account_id: acc_id.clone(),
                                original_balance_milliunits: orig_bal,
                                apr_millipercent: apr_milli,
                                minimum_payment_milliunits: min_pay,
                                monthly_escrow_milliunits: escrow,
                            });
                            store.active_modal.set(ActiveModal::None);
                        },
                        "Save Terms"
                    }
                }
            }
        }
    }
}
