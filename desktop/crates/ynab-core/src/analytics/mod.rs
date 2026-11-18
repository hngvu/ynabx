//! Reflect / Reports Analytics Engine (100% integer math — zero floating point)
//! Exact port of `reflectDataEngine.ts`:
//! - Timeframe preset & date boundary calculation
//! - Net Worth point-in-time & multi-month history
//! - FIFO Age of Money (ADR-004, 10-outflow threshold, half-up integer rounding)
//! - Spending Breakdown (Top 10 + "Everything Else")
//! - Spending Trends & Income vs Expense monthly matrix

#![deny(clippy::float_arithmetic)]

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet, VecDeque};

use crate::calc::goals_calc::days_in_month;

pub const SPENDING_COLORS: [&str; 11] = [
    "#545bfe", // Top 1: SPBlurple500
    "#93d53e", // Top 2: SPFirefly500
    "#f6c91d", // Top 3: SPDandelion500
    "#ce5e66", // Top 4: Mulberry
    "#7583ff", // Top 5: SPBlurple400
    "#aee865", // Top 6: SPFirefly400
    "#f8d655", // Top 7: SPDandelion400
    "#e48585", // Top 8: Pink/Salmon
    "#a3acff", // Top 9: SPBlurple300
    "#c2f680", // Top 10: SPFirefly300
    "#d4d5ff", // Everything Else: SPBlurple200
];

pub const MONTH_NAMES: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

pub const FULL_MONTH_NAMES: [&str; 12] = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TimeframePreset {
    ThisMonth,
    Latest3Months,
    Latest6Months,
    Latest12Months,
    ThisYear,
    LastYear,
    AllDates,
    Custom,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TimeframeState {
    pub preset: TimeframePreset,
    pub start_year: i32,
    pub start_month: u32, // 0-indexed (0 = Jan, 11 = Dec) to match reflectDataEngine
    pub end_year: i32,
    pub end_month: u32, // 0-indexed
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NetWorthCalculationResult {
    pub assets: i64,
    pub debts: i64,
    pub net_worth: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AgeOfMoneyCalculationResult {
    pub age: Option<i64>,
    pub is_ready: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NetWorthMonthPoint {
    pub month: String,    // "Jan 2026"
    pub date_key: String, // "2026-01-01"
    pub debts: i64,       // positive milliunits
    pub assets: i64,      // positive milliunits
    pub net_worth: i64,   // signed milliunits (assets - debts)
    pub change: i64,      // signed change from previous month
    pub increased: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AgeOfMoneyPoint {
    pub date: String,
    pub date_key: String,
    pub age: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SpendingItem {
    pub id: String,
    pub name: String,
    pub amount: i64,            // positive milliunits for display
    pub raw_amount: i64,        // milliunits from transactions (negative for outflow)
    pub percentage_tenths: i32, // e.g. 254 = 25.4%
    pub color: String,
    pub entity_ids: Vec<String>,
    pub is_hidden: bool,
    pub is_positive_inflow: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnalyticsAccount {
    pub id: String,
    pub name: String,
    pub account_type: String,
    pub balance_milliunits: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnalyticsTransaction {
    pub id: String,
    pub account_id: String,
    pub account_name: String,
    pub date: String,
    pub payee_name: String,
    pub category_id: Option<String>,
    pub category_name: String,
    pub group_id: Option<String>,
    pub group_name: String,
    pub amount_milliunits: i64,
    pub transfer_account_id: Option<String>,
}

pub fn is_debt_account_type(account_type: &str) -> bool {
    matches!(
        account_type.to_ascii_lowercase().as_str(),
        "creditcard"
            | "credit"
            | "lineofcredit"
            | "loan"
            | "otherdebt"
            | "mortgage"
            | "autoloan"
            | "studentloan"
            | "personalloan"
            | "medicaldebt"
            | "otherliability"
    )
}

pub fn calculate_timeframe_dates(
    preset: TimeframePreset,
    base_year: i32,
    base_month_zero_idx: u32,
) -> (i32, u32, i32, u32) {
    let mut start_year = base_year;
    let mut start_month = base_month_zero_idx as i32;
    let end_year = base_year;
    let end_month = base_month_zero_idx;

    match preset {
        TimeframePreset::ThisMonth | TimeframePreset::Custom => {}
        TimeframePreset::Latest3Months => {
            start_month -= 2;
            if start_month < 0 {
                start_month += 12;
                start_year -= 1;
            }
        }
        TimeframePreset::Latest6Months => {
            start_month -= 5;
            if start_month < 0 {
                start_month += 12;
                start_year -= 1;
            }
        }
        TimeframePreset::Latest12Months => {
            start_month -= 11;
            if start_month < 0 {
                start_month += 12;
                start_year -= 1;
            }
        }
        TimeframePreset::ThisYear => {
            start_month = 0;
        }
        TimeframePreset::LastYear => {
            return (base_year - 1, 0, base_year - 1, 11);
        }
        TimeframePreset::AllDates => {
            return (2024, 0, base_year, base_month_zero_idx);
        }
    }

    (start_year, start_month as u32, end_year, end_month)
}

pub fn format_timeframe_label(state: &TimeframeState) -> String {
    let sm = (state.start_month as usize).min(11);
    let em = (state.end_month as usize).min(11);
    let start_str = format!("{} {}", MONTH_NAMES[sm], state.start_year);
    let end_str = format!("{} {}", MONTH_NAMES[em], state.end_year);
    if state.start_year == state.end_year && state.start_month == state.end_month {
        start_str
    } else {
        format!("{} - {}", start_str, end_str)
    }
}

pub fn filter_transactions_by_date_and_filters(
    transactions: &[AnalyticsTransaction],
    timeframe: &TimeframeState,
    selected_category_ids: &HashSet<String>,
    selected_account_ids: &HashSet<String>,
) -> Vec<AnalyticsTransaction> {
    let start_m = (timeframe.start_month + 1).clamp(1, 12);
    let end_m = (timeframe.end_month + 1).clamp(1, 12);
    let last_day = days_in_month(timeframe.end_year, end_m);

    let start_key = format!("{:04}-{:02}-01", timeframe.start_year, start_m);
    let end_key = format!("{:04}-{:02}-{:02}", timeframe.end_year, end_m, last_day);

    transactions
        .iter()
        .filter(|tx| {
            // Validate YYYY-MM-DD date format before comparing
            if NaiveDate::parse_from_str(&tx.date, "%Y-%m-%d").is_err() {
                return false;
            }
            if tx.date < start_key || tx.date > end_key {
                return false;
            }
            if !selected_account_ids.is_empty() && !selected_account_ids.contains(&tx.account_id) {
                return false;
            }
            if !selected_category_ids.is_empty() {
                if let Some(cid) = &tx.category_id {
                    if !selected_category_ids.contains(cid) {
                        return false;
                    }
                }
            }
            true
        })
        .cloned()
        .collect()
}

pub fn calculate_net_worth(
    accounts: &[AnalyticsAccount],
    selected_account_ids: Option<&HashSet<String>>,
) -> NetWorthCalculationResult {
    let mut assets: i64 = 0;
    let mut debts: i64 = 0;

    for acc in accounts {
        if let Some(sel) = selected_account_ids {
            if !sel.is_empty() && !sel.contains(&acc.id) {
                continue;
            }
        }
        let bal = acc.balance_milliunits;
        if is_debt_account_type(&acc.account_type) {
            if bal < 0 {
                debts += bal.abs();
            } else {
                assets += bal;
            }
        } else if bal >= 0 {
            assets += bal;
        } else {
            debts += bal.abs();
        }
    }

    NetWorthCalculationResult {
        assets,
        debts,
        net_worth: assets - debts,
    }
}

pub fn calculate_net_worth_history(
    accounts: &[AnalyticsAccount],
    transactions: &[AnalyticsTransaction],
) -> Vec<NetWorthMonthPoint> {
    if accounts.is_empty() && transactions.is_empty() {
        return Vec::new();
    }

    let mut month_set: BTreeSet<String> = BTreeSet::new();
    for tx in transactions {
        if tx.date.len() >= 7 {
            month_set.insert(tx.date[..7].to_string());
        }
    }

    let current_ym = chrono::Local::now().format("%Y-%m").to_string();
    month_set.insert(current_ym);

    let mut sorted_yms: Vec<String> = month_set.into_iter().collect();
    if sorted_yms.len() < 6 {
        let first = sorted_yms[0].clone();
        let parts: Vec<&str> = first.split('-').collect();
        let mut cur_y: i32 = parts.first().and_then(|s| s.parse().ok()).unwrap_or(2026);
        let mut cur_m: i32 = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(1);
        while sorted_yms.len() < 6 {
            cur_m -= 1;
            if cur_m < 1 {
                cur_m = 12;
                cur_y -= 1;
            }
            sorted_yms.insert(0, format!("{:04}-{:02}", cur_y, cur_m));
        }
    }

    build_net_worth_series_for_yms(accounts, transactions, &sorted_yms)
}

pub fn generate_net_worth_history(
    accounts: &[AnalyticsAccount],
    transactions: &[AnalyticsTransaction],
    timeframe: Option<&TimeframeState>,
) -> Vec<NetWorthMonthPoint> {
    let Some(tf) = timeframe else {
        return calculate_net_worth_history(accounts, transactions);
    };

    let mut yms = Vec::new();
    let mut cur_y = tf.start_year;
    let mut cur_m = tf.start_month;
    while cur_y < tf.end_year || (cur_y == tf.end_year && cur_m <= tf.end_month) {
        yms.push(format!("{:04}-{:02}", cur_y, cur_m + 1));
        cur_m += 1;
        if cur_m > 11 {
            cur_m = 0;
            cur_y += 1;
        }
    }

    build_net_worth_series_for_yms(accounts, transactions, &yms)
}

fn build_net_worth_series_for_yms(
    accounts: &[AnalyticsAccount],
    transactions: &[AnalyticsTransaction],
    yms: &[String],
) -> Vec<NetWorthMonthPoint> {
    let mut tx_sum_per_account: HashMap<String, i64> = HashMap::new();
    for tx in transactions {
        *tx_sum_per_account.entry(tx.account_id.clone()).or_insert(0) += tx.amount_milliunits;
    }

    let mut prev_net_worth: i64 = 0;
    let mut history = Vec::with_capacity(yms.len());

    for (idx, ym) in yms.iter().enumerate() {
        let parts: Vec<&str> = ym.split('-').collect();
        let y: i32 = parts.first().and_then(|s| s.parse().ok()).unwrap_or(2026);
        let m: u32 = parts
            .get(1)
            .and_then(|s| s.parse().ok())
            .unwrap_or(1)
            .clamp(1, 12);
        let last_day = days_in_month(y, m);
        let cutoff_date = format!("{}-{:02}", ym, last_day);

        let mut tx_up_to_cutoff: HashMap<String, i64> = HashMap::new();
        for tx in transactions {
            if tx.date <= cutoff_date {
                *tx_up_to_cutoff.entry(tx.account_id.clone()).or_insert(0) += tx.amount_milliunits;
            }
        }

        let mut total_debts: i64 = 0;
        let mut total_assets: i64 = 0;

        for acc in accounts {
            let current_bal = acc.balance_milliunits;
            let total_tx = tx_sum_per_account.get(&acc.id).copied().unwrap_or(0);
            let cutoff_tx = tx_up_to_cutoff.get(&acc.id).copied().unwrap_or(0);
            let tx_after_cutoff = total_tx - cutoff_tx;
            let acc_balance_at_cutoff = current_bal - tx_after_cutoff;

            if is_debt_account_type(&acc.account_type) {
                if acc_balance_at_cutoff < 0 {
                    total_debts += acc_balance_at_cutoff.abs();
                } else {
                    total_assets += acc_balance_at_cutoff;
                }
            } else if acc_balance_at_cutoff >= 0 {
                total_assets += acc_balance_at_cutoff;
            } else {
                total_debts += acc_balance_at_cutoff.abs();
            }
        }

        let net_worth = total_assets - total_debts;
        let change = if idx == 0 {
            0
        } else {
            net_worth - prev_net_worth
        };
        prev_net_worth = net_worth;

        history.push(NetWorthMonthPoint {
            month: format!("{} {}", MONTH_NAMES[(m - 1) as usize], y),
            date_key: format!("{}-01", ym),
            debts: total_debts,
            assets: total_assets,
            net_worth,
            change,
            increased: change >= 0,
        });
    }

    history
}

struct OutflowAgeRecord {
    date: String,
    weighted_days: i128,
    amount_taken: i128,
}

fn simulate_aom_fifo(transactions: &[AnalyticsTransaction]) -> Vec<OutflowAgeRecord> {
    let mut cash_txs: Vec<&AnalyticsTransaction> = transactions
        .iter()
        .filter(|tx| {
            if tx.amount_milliunits == 0 {
                return false;
            }
            let is_cash_transfer = tx.transfer_account_id.is_some()
                && tx.payee_name.to_ascii_lowercase().starts_with("transfer :");
            if is_cash_transfer
                && (tx.category_id.is_none()
                    || tx.category_id.as_deref() == Some("category-not-needed"))
            {
                return false;
            }
            true
        })
        .collect();

    cash_txs.sort_by(|a, b| {
        if a.date != b.date {
            a.date.cmp(&b.date)
        } else {
            // Inflows come before outflows on the same date per ADR-004
            b.amount_milliunits.cmp(&a.amount_milliunits)
        }
    });

    let mut fifo_queue: VecDeque<(NaiveDate, i128)> = VecDeque::new();
    let mut outflow_records: Vec<OutflowAgeRecord> = Vec::new();

    for tx in cash_txs {
        let Ok(tx_date) = NaiveDate::parse_from_str(&tx.date, "%Y-%m-%d") else {
            continue;
        };
        if tx.amount_milliunits > 0 {
            fifo_queue.push_back((tx_date, tx.amount_milliunits as i128));
        } else {
            let mut needed = tx.amount_milliunits.unsigned_abs() as i128;
            let mut outflow_weighted_days: i128 = 0;
            let mut outflow_taken: i128 = 0;

            while needed > 0 {
                let Some((lot_date, lot_rem)) = fifo_queue.front_mut() else {
                    break;
                };
                let age_days = (tx_date - *lot_date).num_days().max(0) as i128;
                let take = needed.min(*lot_rem);
                outflow_weighted_days += take * age_days;
                outflow_taken += take;
                *lot_rem -= take;
                needed -= take;

                if *lot_rem <= 0 {
                    fifo_queue.pop_front();
                }
            }

            if outflow_taken > 0 {
                outflow_records.push(OutflowAgeRecord {
                    date: tx.date.clone(),
                    weighted_days: outflow_weighted_days,
                    amount_taken: outflow_taken,
                });
            }
        }
    }

    outflow_records
}

/// Calculates current Age of Money following ADR-004 FIFO queue algorithm.
pub fn calculate_age_of_money(
    transactions: &[AnalyticsTransaction],
) -> AgeOfMoneyCalculationResult {
    let outflow_records = simulate_aom_fifo(transactions);
    if outflow_records.len() < 10 {
        return AgeOfMoneyCalculationResult {
            age: None,
            is_ready: false,
        };
    }

    let start_idx = outflow_records.len().saturating_sub(10);
    let eligible = &outflow_records[start_idx..];
    let sum_weighted_days: i128 = eligible.iter().map(|o| o.weighted_days).sum();
    let sum_amount: i128 = eligible.iter().map(|o| o.amount_taken).sum();

    if sum_amount <= 0 {
        return AgeOfMoneyCalculationResult {
            age: None,
            is_ready: false,
        };
    }

    // ADR-004 half-up rounding: (2A + B) / (2B)
    let age = ((2 * sum_weighted_days + sum_amount) / (2 * sum_amount)) as i64;
    AgeOfMoneyCalculationResult {
        age: Some(age),
        is_ready: true,
    }
}

/// Calculates multi-month Age of Money history following ADR-004.
pub fn calculate_age_of_money_history(
    transactions: &[AnalyticsTransaction],
    months_to_show: usize,
) -> Vec<AgeOfMoneyPoint> {
    let outflow_records = simulate_aom_fifo(transactions);
    if outflow_records.len() < 10 {
        return Vec::new();
    }

    let mut month_set: BTreeSet<String> = BTreeSet::new();
    for tx in transactions {
        if tx.date.len() >= 7 {
            month_set.insert(tx.date[..7].to_string());
        }
    }
    let current_ym = chrono::Local::now().format("%Y-%m").to_string();
    month_set.insert(current_ym);

    let mut sorted_yms: Vec<String> = month_set.into_iter().collect();
    if sorted_yms.len() > months_to_show {
        sorted_yms = sorted_yms.split_off(sorted_yms.len() - months_to_show);
    }

    let mut results = Vec::new();
    for ym in sorted_yms {
        let parts: Vec<&str> = ym.split('-').collect();
        let y: i32 = parts.first().and_then(|s| s.parse().ok()).unwrap_or(2026);
        let m: u32 = parts
            .get(1)
            .and_then(|s| s.parse().ok())
            .unwrap_or(1)
            .clamp(1, 12);
        let last_day = days_in_month(y, m);
        let cutoff_date = format!("{}-{:02}", ym, last_day);

        let eligible: Vec<&OutflowAgeRecord> = outflow_records
            .iter()
            .filter(|o| o.date <= cutoff_date)
            .collect();
        if !eligible.is_empty() {
            let start = eligible.len().saturating_sub(10);
            let window = &eligible[start..];
            let sum_weighted_days: i128 = window.iter().map(|o| o.weighted_days).sum();
            let sum_amount: i128 = window.iter().map(|o| o.amount_taken).sum();
            if sum_amount > 0 {
                let age = ((2 * sum_weighted_days + sum_amount) / (2 * sum_amount)) as i64;
                results.push(AgeOfMoneyPoint {
                    date: format!("{} {}", MONTH_NAMES[(m - 1) as usize], y),
                    date_key: format!("{}-01", ym),
                    age,
                });
            }
        }
    }

    results
}

/// Computes Top-10 + "Everything Else" Spending Breakdown items across filtered transactions.
pub fn calculate_spending_breakdown(
    transactions: &[AnalyticsTransaction],
    by_group: bool,
) -> (i64, Vec<SpendingItem>) {
    let mut map: BTreeMap<String, (String, i64, Vec<String>)> = BTreeMap::new();

    for tx in transactions {
        if tx.transfer_account_id.is_some() {
            continue;
        }
        if tx.category_name == "Inflow: Ready to Assign" {
            continue;
        }
        let (key, name) = if by_group {
            let gid = tx
                .group_id
                .clone()
                .unwrap_or_else(|| "uncategorized-group".to_string());
            let gname = if tx.group_name.is_empty() {
                "Uncategorized".to_string()
            } else {
                tx.group_name.clone()
            };
            (gid, gname)
        } else {
            let cid = tx
                .category_id
                .clone()
                .unwrap_or_else(|| "uncategorized".to_string());
            let cname = if tx.category_name.is_empty() {
                "Uncategorized".to_string()
            } else {
                tx.category_name.clone()
            };
            (cid, cname)
        };

        let entry = map.entry(key).or_insert_with(|| (name, 0, Vec::new()));
        entry.1 += tx.amount_milliunits;
        entry.2.push(tx.id.clone());
    }

    let mut net_outflows: Vec<(String, String, i64, Vec<String>)> = Vec::new();
    let mut total_spending: i64 = 0;

    for (id, (name, raw_sum, tx_ids)) in map {
        if raw_sum < 0 {
            let pos_amt = -raw_sum;
            total_spending += pos_amt;
            net_outflows.push((id, name, raw_sum, tx_ids));
        }
    }

    // Sort descending by positive spending amount
    net_outflows.sort_by_key(|a| std::cmp::Reverse(-a.2));

    let mut items = Vec::new();
    let mut other_raw: i64 = 0;
    let mut other_ids: Vec<String> = Vec::new();

    for (idx, (id, name, raw_amt, tx_ids)) in net_outflows.into_iter().enumerate() {
        let pos_amt = -raw_amt;
        if idx < 10 {
            let pct_tenths = if total_spending > 0 {
                ((pos_amt * 1000 + total_spending / 2) / total_spending) as i32
            } else {
                0
            };
            items.push(SpendingItem {
                id,
                name,
                amount: pos_amt,
                raw_amount: raw_amt,
                percentage_tenths: pct_tenths,
                color: SPENDING_COLORS[idx].to_string(),
                entity_ids: tx_ids,
                is_hidden: false,
                is_positive_inflow: false,
            });
        } else {
            other_raw += raw_amt;
            other_ids.extend(tx_ids);
        }
    }

    if other_raw < 0 {
        let pos_amt = -other_raw;
        let pct_tenths = if total_spending > 0 {
            ((pos_amt * 1000 + total_spending / 2) / total_spending) as i32
        } else {
            0
        };
        items.push(SpendingItem {
            id: "everything-else".to_string(),
            name: "Everything Else".to_string(),
            amount: pos_amt,
            raw_amount: other_raw,
            percentage_tenths: pct_tenths,
            color: SPENDING_COLORS[10].to_string(),
            entity_ids: other_ids,
            is_hidden: false,
            is_positive_inflow: false,
        });
    }

    (total_spending, items)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_f04_timeframe_dates_and_labels() {
        let (sy, sm, ey, em) = calculate_timeframe_dates(TimeframePreset::ThisMonth, 2026, 10);
        assert_eq!((sy, sm, ey, em), (2026, 10, 2026, 10));

        let (sy, sm, ey, em) = calculate_timeframe_dates(TimeframePreset::Latest3Months, 2026, 10);
        assert_eq!((sy, sm, ey, em), (2026, 8, 2026, 10));

        let (sy, sm, ey, em) = calculate_timeframe_dates(TimeframePreset::Latest6Months, 2026, 10);
        assert_eq!((sy, sm, ey, em), (2026, 5, 2026, 10));

        let (sy, sm, ey, em) = calculate_timeframe_dates(TimeframePreset::Latest12Months, 2026, 10);
        assert_eq!((sy, sm, ey, em), (2025, 11, 2026, 10));

        // Year wraparound (Feb 2027 -> Dec 2026)
        let (sy, sm, ey, em) = calculate_timeframe_dates(TimeframePreset::Latest3Months, 2027, 1);
        assert_eq!((sy, sm, ey, em), (2026, 11, 2027, 1));

        let label = format_timeframe_label(&TimeframeState {
            preset: TimeframePreset::Custom,
            start_year: 2025,
            start_month: 11,
            end_year: 2026,
            end_month: 0,
        });
        assert_eq!(label, "Dec 2025 - Jan 2026");
    }

    #[test]
    fn test_f10_net_worth_and_age_of_money_fifo() {
        let accounts = vec![
            AnalyticsAccount {
                id: "acc-checking".to_string(),
                name: "Checking".to_string(),
                account_type: "checking".to_string(),
                balance_milliunits: 5_000_000,
            },
            AnalyticsAccount {
                id: "acc-savings".to_string(),
                name: "Savings".to_string(),
                account_type: "savings".to_string(),
                balance_milliunits: 10_000_000,
            },
            AnalyticsAccount {
                id: "acc-credit".to_string(),
                name: "Visa Card".to_string(),
                account_type: "creditCard".to_string(),
                balance_milliunits: -3_000_000,
            },
        ];

        let nw = calculate_net_worth(&accounts, None);
        assert_eq!(nw.assets, 15_000_000);
        assert_eq!(nw.debts, 3_000_000);
        assert_eq!(nw.net_worth, 12_000_000);

        // Age of money with < 10 transactions -> not ready
        let mut txs = vec![
            AnalyticsTransaction {
                id: "inc-1".to_string(),
                account_id: "acc-checking".to_string(),
                account_name: "Checking".to_string(),
                date: "2026-01-01".to_string(),
                payee_name: "Employer".to_string(),
                category_id: None,
                category_name: "Inflow: Ready to Assign".to_string(),
                group_id: None,
                group_name: String::new(),
                amount_milliunits: 1_000_000,
                transfer_account_id: None,
            },
            AnalyticsTransaction {
                id: "inc-2".to_string(),
                account_id: "acc-checking".to_string(),
                account_name: "Checking".to_string(),
                date: "2026-01-15".to_string(),
                payee_name: "Employer".to_string(),
                category_id: None,
                category_name: "Inflow: Ready to Assign".to_string(),
                group_id: None,
                group_name: String::new(),
                amount_milliunits: 1_000_000,
                transfer_account_id: None,
            },
        ];
        assert!(!calculate_age_of_money(&txs).is_ready);

        // Add 10 cash outflows
        let dates = [
            "2026-01-20",
            "2026-01-22",
            "2026-01-25",
            "2026-01-28",
            "2026-01-30",
            "2026-02-01",
            "2026-02-05",
            "2026-02-10",
            "2026-02-15",
            "2026-02-20",
        ];
        for (i, d) in dates.iter().enumerate() {
            txs.push(AnalyticsTransaction {
                id: format!("out-{}", i),
                account_id: "acc-checking".to_string(),
                account_name: "Checking".to_string(),
                date: d.to_string(),
                payee_name: "Store".to_string(),
                category_id: Some("cat-1".to_string()),
                category_name: "Groceries".to_string(),
                group_id: Some("grp-1".to_string()),
                group_name: "Immediate".to_string(),
                amount_milliunits: -100_000,
                transfer_account_id: None,
            });
        }

        let aom = calculate_age_of_money(&txs);
        assert!(aom.is_ready);
        assert_eq!(aom.age, Some(32)); // average of [19,21,24,27,29,31,35,40,45,50] = 321/10 = 32.1 -> 32
    }
}
