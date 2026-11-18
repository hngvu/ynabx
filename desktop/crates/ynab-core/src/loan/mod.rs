//! Pure-Integer Loan & Amortization Solver matching YNAB SLIK (`solveAmortization` in
//! `wrapper.renamed.js:24000–24385`).
//!
//! 100% Fixed-Point Integer Math (`i64` milliunits, `u32` APR in promille-of-percent / bps,
//! `i128` intermediates, `#![deny(clippy::float_arithmetic)]`).

#![deny(clippy::float_arithmetic)]

use chrono::{Months, NaiveDate};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Maximum amortization schedule length (50 years = 600 monthly periods).
pub const MAX_AMORTIZATION_MONTHS: u32 = 600;

/// Promille-of-percent scale: `1000` = `1.000%`, `6500` = `6.500%` (matches YNAB `PercentageFormatter`).
pub const APR_MILLI_PERCENT_SCALE: u32 = 1000;

/// Converts APR in basis points (`650` = `6.50%`) to milli-percent (`6500`).
pub fn apr_bps_to_milli_percent(apr_bps: u32) -> u32 {
    apr_bps.saturating_mul(10)
}

/// Converts APR in milli-percent (`6500` = `6.500%`) to basis points (`650`), half-up.
pub fn milli_percent_to_apr_bps(apr_milli_percent: u32) -> u32 {
    (apr_milli_percent + 5) / 10
}

/// Computes single-month interest in milliunits rounded half-up via `i128`:
/// `round_half_up(balance_milliunits * apr_milli_percent / 1_200_000)`.
///
/// Here `1_200_000 = 12 months * 100 (percent) * 1000 (milli-percent scale)`.
pub fn calculate_monthly_interest_milliunits(
    balance_milliunits: i64,
    apr_milli_percent: u32,
) -> i64 {
    if balance_milliunits <= 0 || apr_milli_percent == 0 {
        return 0;
    }
    let num = (balance_milliunits as i128) * (apr_milli_percent as i128);
    let rounded = (num + 600_000) / 1_200_000;
    i64::try_from(rounded).unwrap_or(i64::MAX)
}

/// Computes YNAB's minimum required monthly payment (`monthly_interest + 1 cent + escrow`)
/// matching `Mh()` in `wrapper.renamed.js:24327-24334`.
pub fn minimum_monthly_payment_milliunits(
    balance_milliunits: i64,
    apr_milli_percent: u32,
    escrow_milliunits: i64,
) -> i64 {
    let interest = calculate_monthly_interest_milliunits(balance_milliunits, apr_milli_percent);
    interest
        .saturating_add(10) // $0.01 = 10 milliunits minimum principal reduction
        .saturating_add(escrow_milliunits.max(0))
}

/// Amortization trajectory classification matching YNAB SLIK (`positive | none | negative | invalid`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LoanProgress {
    Positive,
    Constant,
    Negative,
    Invalid,
}

/// Input parameters for the loan amortization solver.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LoanParams {
    /// Positive remaining principal balance in milliunits (e.g. `250_000_000` for `$250,000.00`).
    pub balance_milliunits: i64,
    /// Annual Percentage Rate in milli-percent (`6500` = `6.500%`; see `apr_bps_to_milli_percent`).
    pub apr_milli_percent: u32,
    /// Total scheduled monthly payment (Principal + Interest + Escrow) in milliunits.
    /// If `None`, the solver computes the required payment to pay off within `term_months`.
    pub monthly_payment_milliunits: Option<i64>,
    /// Optional monthly escrow (taxes/insurance) included in `monthly_payment_milliunits`.
    pub escrow_milliunits: i64,
    /// Optional target term in months (`1..=600`). Used to solve payment when `monthly_payment_milliunits` is `None`,
    /// or to project balance after `term_months` when both payment and term are supplied.
    pub term_months: Option<u32>,
    /// Start date in ISO `"YYYY-MM-DD"` format.
    pub start_date: String,
    /// Optional one-time balance adjustment subtracted from starting balance before solving.
    pub balance_adjustment_milliunits: i64,
    /// Whether first payment occurs on `start_date` (`true`) or one month after `start_date` (`false`).
    pub payment_due_on_first_period: bool,
}

impl LoanParams {
    /// Creates standard monthly loan parameters using APR in milli-percent (`6500` = `6.500%`).
    pub fn new(
        balance_milliunits: i64,
        apr_milli_percent: u32,
        monthly_payment_milliunits: Option<i64>,
        escrow_milliunits: i64,
        term_months: Option<u32>,
        start_date: impl Into<String>,
    ) -> Self {
        Self {
            balance_milliunits,
            apr_milli_percent,
            monthly_payment_milliunits,
            escrow_milliunits,
            term_months,
            start_date: start_date.into(),
            balance_adjustment_milliunits: 0,
            payment_due_on_first_period: true,
        }
    }

    /// Convenience constructor accepting APR in basis points (`650` = `6.50%`).
    pub fn with_apr_bps(
        balance_milliunits: i64,
        apr_bps: u32,
        monthly_payment_milliunits: Option<i64>,
        escrow_milliunits: i64,
        term_months: Option<u32>,
        start_date: impl Into<String>,
    ) -> Self {
        Self::new(
            balance_milliunits,
            apr_bps_to_milli_percent(apr_bps),
            monthly_payment_milliunits,
            escrow_milliunits,
            term_months,
            start_date,
        )
    }
}

/// Single monthly entry in an amortization schedule.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AmortizationMonthRow {
    pub month_index: u32,
    pub date: String,
    pub starting_balance_milliunits: i64,
    pub total_payment_milliunits: i64,
    pub principal_milliunits: i64,
    pub interest_milliunits: i64,
    pub escrow_milliunits: i64,
    pub ending_balance_milliunits: i64,
    pub cumulative_interest_milliunits: i64,
    pub cumulative_principal_milliunits: i64,
}

/// Complete amortization calculation output.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AmortizationResult {
    pub progress: LoanProgress,
    /// `true` when `pi_payment <= monthly_interest` on an active positive balance.
    pub is_negative_amortization: bool,
    /// `true` when the simulation reached `MAX_AMORTIZATION_MONTHS` (600) with remaining debt.
    pub capped_at_max_months: bool,
    pub starting_balance_milliunits: i64,
    pub apr_milli_percent: u32,
    pub monthly_pi_payment_milliunits: i64,
    pub monthly_escrow_milliunits: i64,
    pub monthly_total_payment_milliunits: i64,
    pub total_interest_milliunits: i64,
    pub total_principal_milliunits: i64,
    pub total_escrow_milliunits: i64,
    pub total_paid_milliunits: i64,
    pub final_balance_milliunits: i64,
    pub months_count: u32,
    pub payoff_date: Option<String>,
    pub schedule: Vec<AmortizationMonthRow>,
}

/// Side-by-side comparison of baseline loan repayment vs accelerated extra payments.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LoanPayoffSimulation {
    pub baseline: AmortizationResult,
    pub accelerated: AmortizationResult,
    pub extra_monthly_milliunits: i64,
    pub one_time_extra_milliunits: i64,
    pub interest_saved_milliunits: i64,
    pub months_saved: u32,
}

fn add_months_iso(start: NaiveDate, offset_months: u32) -> String {
    start
        .checked_add_months(Months::new(offset_months))
        .unwrap_or(start)
        .format("%Y-%m-%d")
        .to_string()
}

/// Simulates `term_months` with fixed `pi_payment` using exact integer half-up monthly interest.
/// Returns the ending balance after `term_months` (`0` if paid off before or at `term_months`).
fn simulate_ending_balance(
    starting_balance: i64,
    apr_milli_percent: u32,
    pi_payment: i64,
    term_months: u32,
) -> i128 {
    let mut bal = starting_balance as i128;
    let pi = pi_payment as i128;
    for _ in 0..term_months {
        if bal <= 0 {
            return 0;
        }
        let interest = (bal * (apr_milli_percent as i128) + 600_000) / 1_200_000;
        if bal + interest <= pi {
            return 0;
        }
        bal = bal + interest - pi;
        if bal > (i64::MAX as i128) {
            return bal;
        }
    }
    bal
}

/// Pure-integer binary search finding the smallest monthly P&I payment (in milliunits)
/// that pays `starting_balance` down to `0` within `term_months`.
fn solve_pi_payment_for_term(
    starting_balance: i64,
    apr_milli_percent: u32,
    term_months: u32,
) -> i64 {
    if starting_balance <= 0 || term_months == 0 {
        return starting_balance.max(0);
    }
    if apr_milli_percent == 0 {
        let bal = starting_balance as i128;
        let n = term_months as i128;
        let ceil_div = (bal + n - 1) / n;
        return i64::try_from(ceil_div).unwrap_or(i64::MAX);
    }

    let first_interest = calculate_monthly_interest_milliunits(starting_balance, apr_milli_percent);
    let mut lo = (first_interest as i128).max(1);
    let mut hi = (starting_balance as i128) + (first_interest as i128) * 2 + 1000;

    while simulate_ending_balance(
        starting_balance,
        apr_milli_percent,
        i64::try_from(hi).unwrap_or(i64::MAX),
        term_months,
    ) > 0
    {
        hi = hi.saturating_mul(2);
        if hi >= i64::MAX as i128 {
            hi = i64::MAX as i128;
            break;
        }
    }

    while lo < hi {
        let mid = lo + (hi - lo) / 2;
        let rem = simulate_ending_balance(
            starting_balance,
            apr_milli_percent,
            i64::try_from(mid).unwrap_or(i64::MAX),
            term_months,
        );
        if rem == 0 {
            hi = mid;
        } else {
            lo = mid + 1;
        }
    }

    i64::try_from(lo).unwrap_or(i64::MAX)
}

/// Solves loan amortization matching YNAB SLIK (`solveAmortization` + `buildEveryPeriodStep`):
/// - Solves missing monthly payment when `term_months` is provided, or projects payoff when payment is given
/// - Caps schedule at `MAX_AMORTIZATION_MONTHS` (600 months)
/// - Flags `is_negative_amortization` when `pi_payment <= monthly_interest` on a positive balance
pub fn solve_amortization(params: &LoanParams) -> Result<AmortizationResult, String> {
    if params.balance_milliunits < 0 {
        return Err("Loan balance cannot be negative".to_string());
    }
    if params.escrow_milliunits < 0 {
        return Err("Escrow amount cannot be negative".to_string());
    }

    let start_date = NaiveDate::parse_from_str(&params.start_date, "%Y-%m-%d").map_err(|_| {
        format!(
            "Invalid start_date '{}': expected YYYY-MM-DD",
            params.start_date
        )
    })?;

    let effective_start_balance =
        (params.balance_milliunits - params.balance_adjustment_milliunits).max(0);
    let escrow = params.escrow_milliunits;

    if effective_start_balance == 0 {
        return Ok(AmortizationResult {
            progress: LoanProgress::Positive,
            is_negative_amortization: false,
            capped_at_max_months: false,
            starting_balance_milliunits: 0,
            apr_milli_percent: params.apr_milli_percent,
            monthly_pi_payment_milliunits: 0,
            monthly_escrow_milliunits: escrow,
            monthly_total_payment_milliunits: escrow,
            total_interest_milliunits: 0,
            total_principal_milliunits: 0,
            total_escrow_milliunits: 0,
            total_paid_milliunits: 0,
            final_balance_milliunits: 0,
            months_count: 0,
            payoff_date: Some(start_date.format("%Y-%m-%d").to_string()),
            schedule: Vec::new(),
        });
    }

    let (pi_payment, max_steps, projection_only_term) =
        match (params.monthly_payment_milliunits, params.term_months) {
            (Some(total_pay), Some(term)) => {
                if total_pay < 0 {
                    return Err("Monthly payment cannot be negative".to_string());
                }
                if term == 0 || term > MAX_AMORTIZATION_MONTHS {
                    return Err(format!(
                        "term_months must be between 1 and {}",
                        MAX_AMORTIZATION_MONTHS
                    ));
                }
                ((total_pay - escrow).max(0), term, true)
            }
            (Some(total_pay), None) => {
                if total_pay < 0 {
                    return Err("Monthly payment cannot be negative".to_string());
                }
                ((total_pay - escrow).max(0), MAX_AMORTIZATION_MONTHS, false)
            }
            (None, Some(term)) => {
                if term == 0 || term > MAX_AMORTIZATION_MONTHS {
                    return Err(format!(
                        "term_months must be between 1 and {}",
                        MAX_AMORTIZATION_MONTHS
                    ));
                }
                let solved_pi = solve_pi_payment_for_term(
                    effective_start_balance,
                    params.apr_milli_percent,
                    term,
                );
                (solved_pi, term, false)
            }
            (None, None) => {
                return Err(
                    "Either monthly_payment_milliunits or term_months must be provided".to_string(),
                );
            }
        };

    let initial_interest =
        calculate_monthly_interest_milliunits(effective_start_balance, params.apr_milli_percent);
    let is_negative_amortization = pi_payment <= initial_interest;
    let progress = if pi_payment < initial_interest {
        LoanProgress::Negative
    } else if pi_payment == initial_interest {
        LoanProgress::Constant
    } else {
        LoanProgress::Positive
    };

    let first_offset: u32 = if params.payment_due_on_first_period {
        0
    } else {
        1
    };

    let mut schedule = Vec::with_capacity(max_steps.min(MAX_AMORTIZATION_MONTHS) as usize);
    let mut balance = effective_start_balance;
    let mut cum_interest: i64 = 0;
    let mut cum_principal: i64 = 0;
    let mut total_escrow: i64 = 0;
    let mut payoff_date: Option<String> = None;

    for step in 1..=max_steps {
        let period_date = add_months_iso(start_date, first_offset + step - 1);
        let interest = calculate_monthly_interest_milliunits(balance, params.apr_milli_percent);

        let (principal, ending_balance, actual_pi) =
            if (balance as i128) + (interest as i128) <= (pi_payment as i128) {
                let actual = balance.saturating_add(interest);
                (balance, 0, actual)
            } else {
                let principal_delta = pi_payment - interest; // negative if negative amortization!
                let next_bal = (balance as i128) - (principal_delta as i128);
                let clamped_next = i64::try_from(next_bal.max(0)).unwrap_or(i64::MAX);
                (principal_delta, clamped_next, pi_payment)
            };

        let total_payment = actual_pi.saturating_add(escrow);
        cum_interest = cum_interest.saturating_add(interest);
        cum_principal = cum_principal.saturating_add(principal);
        total_escrow = total_escrow.saturating_add(escrow);

        schedule.push(AmortizationMonthRow {
            month_index: step,
            date: period_date.clone(),
            starting_balance_milliunits: balance,
            total_payment_milliunits: total_payment,
            principal_milliunits: principal,
            interest_milliunits: interest,
            escrow_milliunits: escrow,
            ending_balance_milliunits: ending_balance,
            cumulative_interest_milliunits: cum_interest,
            cumulative_principal_milliunits: cum_principal,
        });

        balance = ending_balance;
        if balance == 0 {
            payoff_date = Some(period_date);
            break;
        }
        if balance == i64::MAX {
            break;
        }
    }

    let capped_at_max_months =
        balance > 0 && !projection_only_term && (schedule.len() as u32) >= MAX_AMORTIZATION_MONTHS;
    let total_paid = cum_principal
        .saturating_add(cum_interest)
        .saturating_add(total_escrow);

    Ok(AmortizationResult {
        progress,
        is_negative_amortization,
        capped_at_max_months,
        starting_balance_milliunits: effective_start_balance,
        apr_milli_percent: params.apr_milli_percent,
        monthly_pi_payment_milliunits: pi_payment,
        monthly_escrow_milliunits: escrow,
        monthly_total_payment_milliunits: pi_payment.saturating_add(escrow),
        total_interest_milliunits: cum_interest,
        total_principal_milliunits: cum_principal,
        total_escrow_milliunits: total_escrow,
        total_paid_milliunits: total_paid,
        final_balance_milliunits: balance,
        months_count: schedule.len() as u32,
        payoff_date,
        schedule,
    })
}

/// Simulates baseline repayment vs accelerated payoff with extra monthly and/or one-time extra principal payments.
pub fn simulate_loan_payoff(
    params: &LoanParams,
    extra_monthly_milliunits: i64,
    one_time_extra_milliunits: i64,
) -> Result<LoanPayoffSimulation, String> {
    if extra_monthly_milliunits < 0 || one_time_extra_milliunits < 0 {
        return Err("Extra payments cannot be negative".to_string());
    }

    let baseline = solve_amortization(params)?;

    let mut accel_params = params.clone();
    // Always preserve the baseline total payment + extra monthly payment so term-solved loans actually accelerate!
    accel_params.monthly_payment_milliunits = Some(
        baseline
            .monthly_total_payment_milliunits
            .saturating_add(extra_monthly_milliunits),
    );
    accel_params.term_months = None;
    accel_params.balance_adjustment_milliunits = params
        .balance_adjustment_milliunits
        .saturating_add(one_time_extra_milliunits);

    let accelerated = solve_amortization(&accel_params)?;

    let interest_saved =
        (baseline.total_interest_milliunits - accelerated.total_interest_milliunits).max(0);
    let months_saved = baseline
        .months_count
        .saturating_sub(accelerated.months_count);

    Ok(LoanPayoffSimulation {
        baseline,
        accelerated,
        extra_monthly_milliunits,
        one_time_extra_milliunits,
        interest_saved_milliunits: interest_saved,
        months_saved,
    })
}

// -----------------------------------------------------------------------------
// YNAB `be_accounts` `debt_*` JSON Persistence Helpers
// -----------------------------------------------------------------------------

/// Loan metadata mapped to `be_accounts.debt_*` columns.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LoanAccountTerms {
    pub account_id: String,
    pub start_date: Option<String>,
    pub original_balance_milliunits: Option<i64>,
    /// Positive debt magnitude (`abs(cleared + uncleared)`).
    pub current_balance_milliunits: i64,
    pub apr_milli_percent: u32,
    pub minimum_payment_milliunits: i64,
    pub escrow_milliunits: i64,
    pub asset_value_milliunits: Option<i64>,
}

/// Reads the latest chronological integer value from a YNAB `debt_*` JSON map (`{"2026-01-01": 6500}`).
pub fn parse_debt_timeline_latest(json_str: Option<&str>) -> Option<i64> {
    let raw = json_str?.trim();
    if raw.is_empty() || raw == "null" {
        return None;
    }
    if let Ok(direct) = raw.parse::<i64>() {
        return Some(direct);
    }
    let map: BTreeMap<String, i64> = serde_json::from_str(raw).ok()?;
    map.values().next_back().copied()
}

/// Inserts or updates a date entry inside a YNAB `debt_*` JSON timeline map.
pub fn encode_debt_timeline_entry(
    existing_json: Option<&str>,
    effective_date: &str,
    value: i64,
) -> String {
    let mut map: BTreeMap<String, i64> = existing_json
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_default();
    map.insert(effective_date.to_string(), value);
    serde_json::to_string(&map).unwrap_or_else(|_| format!(r#"{{"{}":{}}}"#, effective_date, value))
}

/// Loads `LoanAccountTerms` from `be_accounts` `debt_*` columns.
pub fn load_loan_account_terms(
    conn: &Connection,
    account_id: &str,
) -> Result<LoanAccountTerms, String> {
    #[allow(clippy::type_complexity)]
    let (
        cleared,
        uncleared,
        debt_start_date,
        debt_orig_bal,
        debt_rates,
        debt_min_pays,
        debt_escrows,
        debt_assets,
    ): (
        i64,
        i64,
        Option<String>,
        Option<i64>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
    ) = conn
        .query_row(
            r#"SELECT cleared_balance, uncleared_balance, debt_start_date, debt_original_balance,
                      debt_interest_rates, debt_minimum_payments, debt_escrow_amounts, debt_asset_values
               FROM be_accounts
               WHERE id = ?1 AND is_tombstone = 0"#,
            params![account_id],
            |r| {
                Ok((
                    r.get(0)?,
                    r.get(1)?,
                    r.get(2)?,
                    r.get(3)?,
                    r.get(4)?,
                    r.get(5)?,
                    r.get(6)?,
                    r.get(7)?,
                ))
            },
        )
        .map_err(|e| format!("Loan account '{}' not found: {}", account_id, e))?;

    let working_balance = (cleared + uncleared).abs();
    let apr = parse_debt_timeline_latest(debt_rates.as_deref())
        .and_then(|v| u32::try_from(v.max(0)).ok())
        .unwrap_or(0);
    let min_pay = parse_debt_timeline_latest(debt_min_pays.as_deref()).unwrap_or(0);
    let escrow = parse_debt_timeline_latest(debt_escrows.as_deref()).unwrap_or(0);
    let asset_val = parse_debt_timeline_latest(debt_assets.as_deref());

    Ok(LoanAccountTerms {
        account_id: account_id.to_string(),
        start_date: debt_start_date,
        original_balance_milliunits: debt_orig_bal,
        current_balance_milliunits: working_balance,
        apr_milli_percent: apr,
        minimum_payment_milliunits: min_pay,
        escrow_milliunits: escrow,
        asset_value_milliunits: asset_val,
    })
}

/// Persists `LoanAccountTerms` back to `be_accounts.debt_*` columns.
pub fn save_loan_account_terms(conn: &Connection, terms: &LoanAccountTerms) -> Result<(), String> {
    let existing: (Option<String>, Option<String>, Option<String>, Option<String>) = conn
        .query_row(
            r#"SELECT debt_interest_rates, debt_minimum_payments, debt_escrow_amounts, debt_asset_values
               FROM be_accounts
               WHERE id = ?1 AND is_tombstone = 0"#,
            params![terms.account_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )
        .map_err(|e| format!("Loan account '{}' not found: {}", terms.account_id, e))?;

    let eff_date = terms
        .start_date
        .clone()
        .unwrap_or_else(|| chrono::Local::now().format("%Y-%m-01").to_string());

    let rates_json = encode_debt_timeline_entry(
        existing.0.as_deref(),
        &eff_date,
        terms.apr_milli_percent as i64,
    );
    let min_pay_json = encode_debt_timeline_entry(
        existing.1.as_deref(),
        &eff_date,
        terms.minimum_payment_milliunits,
    );
    let escrow_json =
        encode_debt_timeline_entry(existing.2.as_deref(), &eff_date, terms.escrow_milliunits);
    let asset_json = terms
        .asset_value_milliunits
        .map(|val| encode_debt_timeline_entry(existing.3.as_deref(), &eff_date, val))
        .or(existing.3);

    conn.execute(
        r#"UPDATE be_accounts
           SET debt_start_date = COALESCE(?1, debt_start_date),
               debt_original_balance = COALESCE(?2, debt_original_balance),
               debt_interest_rates = ?3,
               debt_minimum_payments = ?4,
               debt_escrow_amounts = ?5,
               debt_asset_values = ?6,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?7"#,
        params![
            terms.start_date,
            terms.original_balance_milliunits,
            rates_json,
            min_pay_json,
            escrow_json,
            asset_json,
            terms.account_id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
