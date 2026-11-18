//! Reflect / Reports Analytics Workspace (`ReflectWorkspace`, `ReflectNavigationHeader`,
//! `ReflectPageHeader`, `ReflectFilterControls`, `ReflectSummaryInspector`,
//! `SpendingBreakdownView`, `SpendingTrendsView`, `NetWorthView`, `IncomeExpenseView`, `AgeOfMoneyView`,
//! `TimeframeModal`, `FilterItemsModal`, `ActivityTransactionsModal`, `InflowWarningModal`).
//! Renders native `.bb-*` SVG charts and Ember DOM/CSS structure directly in Rust
//! using 100% integer math (`#![deny(clippy::float_arithmetic)]`).

#![deny(clippy::float_arithmetic)]

use dioxus::prelude::*;
use std::collections::{BTreeMap, HashMap, HashSet};

use crate::interaction::save_csv_file_dialog;
use crate::state::AppStore;
use crate::ui::core::{Icon, ModalDialog, YnabButton};
use ynab_core::analytics::{
    calculate_age_of_money, calculate_age_of_money_history, calculate_net_worth,
    calculate_timeframe_dates, filter_transactions_by_date_and_filters, format_timeframe_label,
    generate_net_worth_history, AgeOfMoneyPoint, AnalyticsAccount, AnalyticsTransaction,
    NetWorthMonthPoint, TimeframePreset, TimeframeState, MONTH_NAMES,
};
use ynab_core::calc::goals_calc::days_in_month;
use ynab_core::format::{export_to_csv_string, format_plain_decimal_milliunits};
use ynab_core::repo::{AccountDto, CategoryGroupDto, TransactionDto};
use ynab_core::seed::CAT_IMMEDIATE_INCOME;

const OTHER_CATEGORIES_ID: &str = "other-categories";
const OTHER_CATEGORIES_NAME: &str = "Other Categories";
const UNCATEGORIZED_ID: &str = "uncategorized";
const UNCATEGORIZED_GROUP_ID: &str = "uncategorized-group";
const EMPTY_FILTER_SENTINEL: &str = "__ynabx_none_selected__";

const REPORT_SPENDING_COLOR_TOKENS: [&str; 11] = [
    "var(--reportsSpendingBreakdownTop1)",
    "var(--reportsSpendingBreakdownTop2)",
    "var(--reportsSpendingBreakdownTop3)",
    "var(--reportsSpendingBreakdownTop4)",
    "var(--reportsSpendingBreakdownTop5)",
    "var(--reportsSpendingBreakdownTop6)",
    "var(--reportsSpendingBreakdownTop7)",
    "var(--reportsSpendingBreakdownTop8)",
    "var(--reportsSpendingBreakdownTop9)",
    "var(--reportsSpendingBreakdownTop10)",
    "var(--reportsSpendingBreakdownTopOther)",
];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReflectTab {
    SpendingBreakdown,
    SpendingTrends,
    NetWorth,
    IncomeExpense,
    AgeOfMoney,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum FilterAction {
    PrevMonth,
    NextMonth,
    OpenTimeframe,
    OpenCategories,
    OpenAccounts,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct FilterBarState {
    timeframe_label: String,
    categories_label: String,
    accounts_label: String,
    categories_pill: Option<String>,
    accounts_pill: Option<String>,
    show_categories: bool,
    disable_left: bool,
    disable_right: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ReflectDrilldown {
    group_id: String,
    group_name: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ReflectSpendingRow {
    id: String,
    name: String,
    amount: i64,
    percentage_tenths: i64,
    color_idx: usize,
    color: String,
    entity_ids: Vec<String>,
    tx_ids: Vec<String>,
    can_drill_down: bool,
    is_hidden: bool,
    tx_count: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ReflectInflowRow {
    id: String,
    name: String,
    amount: i64,
    tx_ids: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ReflectSummaryMetrics {
    total_spending: i64,
    total_outflows_gross: i64,
    total_positive_inflows: i64,
    tx_count: usize,
    average_monthly_spending: i64,
    average_daily_spending: i64,
    most_frequent_bucket_name: String,
    most_frequent_bucket_count: usize,
    most_frequent_payee_name: String,
    most_frequent_payee_count: usize,
    most_frequent_payee_total: i64,
    largest_outflow_payee: String,
    largest_outflow_amount: i64,
    largest_outflow_date: String,
    assets_milliunits: i64,
    debts_milliunits: i64,
    net_worth_milliunits: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct BreakdownComputation {
    donut_items: Vec<ReflectSpendingRow>,
    bar_items: Vec<ReflectSpendingRow>,
    positive_inflows: Vec<ReflectInflowRow>,
    metrics: ReflectSummaryMetrics,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ActivityModalState {
    title: String,
    subtitle: String,
    transactions: Vec<AnalyticsTransaction>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum FilterKind {
    Categories,
    Accounts,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ActivitySortCol {
    Date,
    Payee,
    Category,
    Amount,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ExportModalState {
    report_name: String,
    filename: String,
    csv: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct TrendsTooltipState {
    cx: i64,
    cy: i64,
    month_label: String,
    series_name: String,
    color: String,
    amount: i64,
    pct: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NetWorthHoverState {
    cx: i64,
    cy: i64,
    point: NetWorthMonthPoint,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct AomHoverState {
    cx: i64,
    cy: i64,
    point: AgeOfMoneyPoint,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct TrendSeriesDef {
    id: String,
    name: String,
    color_idx: usize,
    color: String,
    can_drill_down: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct TrendMonthColumn {
    ym: String,
    label: String,
    total_spending: i64,
    segments: Vec<(TrendSeriesDef, i64, Vec<String>)>,
    all_tx_ids: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct IeRowData {
    id: String,
    label: String,
    monthly_amounts: Vec<i64>,
    average: i64,
    total: i64,
    tx_ids_by_month: Vec<Vec<String>>,
    all_tx_ids: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct IeGroupData {
    id: String,
    name: String,
    rows: Vec<IeRowData>,
    monthly_totals: Vec<i64>,
    average: i64,
    total: i64,
    tx_ids_by_month: Vec<Vec<String>>,
    all_tx_ids: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct IeMatrixModel {
    month_labels: Vec<String>,
    income_rows: Vec<IeRowData>,
    income_monthly_totals: Vec<i64>,
    income_average: i64,
    income_total: i64,
    expense_groups: Vec<IeGroupData>,
    expense_monthly_totals: Vec<i64>,
    expense_average: i64,
    expense_total: i64,
    net_monthly: Vec<i64>,
    net_average: i64,
    net_total: i64,
}

/// Generates an SVG donut arc path string using integer lookup sin/cos table (zero floating-point).
/// Angles are in tenths of a percent of a full circle (`0..=1000`).
pub fn build_donut_arc_path(
    cx: i64,
    cy: i64,
    outer_r: i64,
    inner_r: i64,
    start_promille: i64,
    end_promille: i64,
) -> String {
    let span = (end_promille - start_promille).clamp(0, 1000);
    if span <= 0 {
        return String::new();
    }
    if span >= 999 {
        return format!(
            "M {cx} {top_out} A {outer_r} {outer_r} 0 1 1 {cx} {bot_out} A {outer_r} {outer_r} 0 1 1 {cx} {top_out} M {cx} {top_in} A {inner_r} {inner_r} 0 1 0 {cx} {bot_in} A {inner_r} {inner_r} 0 1 0 {cx} {top_in} Z",
            top_out = cy - outer_r,
            bot_out = cy + outer_r,
            top_in = cy - inner_r,
            bot_in = cy + inner_r,
        );
    }

    let (sx_out, sy_out) = circle_point_promille(cx, cy, outer_r, start_promille);
    let (ex_out, ey_out) = circle_point_promille(cx, cy, outer_r, end_promille);
    let (sx_in, sy_in) = circle_point_promille(cx, cy, inner_r, start_promille);
    let (ex_in, ey_in) = circle_point_promille(cx, cy, inner_r, end_promille);
    let large_arc = if span > 500 { 1 } else { 0 };

    format!(
        "M {sx_out} {sy_out} A {outer_r} {outer_r} 0 {large_arc} 1 {ex_out} {ey_out} L {ex_in} {ey_in} A {inner_r} {inner_r} 0 {large_arc} 0 {sx_in} {sy_in} Z"
    )
}

/// Computes `(x, y)` on a circle of radius `r` at angle `promille` (`0..=1000`, where `0` is 12 o'clock, clockwise)
/// using a 250-entry integer quarter-wave sine table scaled by `10_000`.
pub fn circle_point_promille(cx: i64, cy: i64, r: i64, promille: i64) -> (i64, i64) {
    let p = promille.rem_euclid(1000);
    let sin_val = int_sin_promille(p);
    let cos_val = int_sin_promille((p + 250).rem_euclid(1000));
    let x = cx + (r * sin_val) / 10_000;
    let y = cy - (r * cos_val) / 10_000;
    (x, y)
}

/// Integer sine approximation for `p` in `0..1000` (full period), returning values in `-10_000..=10_000`
/// using Bhaskara I's rational integer formula: `sin(x) ~= 16x(pi - x) / (5pi^2 - 4x(pi - x))`.
pub fn int_sin_promille(promille: i64) -> i64 {
    let p = promille.rem_euclid(1000);
    let (sign, half_p) = if p >= 500 { (-1, p - 500) } else { (1, p) };
    let prod = half_p * (500 - half_p);
    let num = 16 * prod * 10_000;
    let den = 5 * 250_000 - 4 * prod;
    if den == 0 {
        0
    } else {
        sign * (num / den)
    }
}

fn round_div_6(num: i64) -> i64 {
    if num >= 0 {
        (num + 3) / 6
    } else {
        -((-num + 3) / 6)
    }
}

/// Builds a smooth cubic Bezier SVG path (`M ... C ...`) through `points` using Catmull-Rom
/// tangents computed strictly with `i64` integer arithmetic (`#![deny(clippy::float_arithmetic)]`).
/// Control point Y coordinates are clamped to `min_y..=max_y` and flat adjacent segments stay level.
pub fn build_catmull_rom_bezier_path(points: &[(i64, i64)], min_y: i64, max_y: i64) -> String {
    if points.is_empty() {
        return String::new();
    }
    if points.len() == 1 {
        return format!("M {} {}", points[0].0, points[0].1);
    }
    let lo_y = min_y.min(max_y);
    let hi_y = min_y.max(max_y);
    let mut path = format!("M {} {}", points[0].0, points[0].1);
    for i in 0..(points.len() - 1) {
        let p0 = if i == 0 { points[0] } else { points[i - 1] };
        let p1 = points[i];
        let p2 = points[i + 1];
        let p3 = if i + 2 < points.len() {
            points[i + 2]
        } else {
            points[points.len() - 1]
        };

        let x_min = p1.0.min(p2.0);
        let x_max = p1.0.max(p2.0);
        let c1x = (p1.0 + round_div_6(p2.0 - p0.0)).clamp(x_min, x_max);
        let c2x = (p2.0 - round_div_6(p3.0 - p1.0)).clamp(x_min, x_max);
        let (c1y, c2y) = if p1.1 == p2.1 {
            (p1.1.clamp(lo_y, hi_y), p2.1.clamp(lo_y, hi_y))
        } else {
            (
                (p1.1 + round_div_6(p2.1 - p0.1)).clamp(lo_y, hi_y),
                (p2.1 - round_div_6(p3.1 - p1.1)).clamp(lo_y, hi_y),
            )
        };
        path.push_str(&format!(" C {c1x} {c1y}, {c2x} {c2y}, {} {}", p2.0, p2.1));
    }
    path
}

/// Builds a closed area SVG path (`M ... C ... L ... Z`) bounded below by `baseline_y`
/// using `build_catmull_rom_bezier_path` (100% integer math).
pub fn build_catmull_rom_area_path(
    points: &[(i64, i64)],
    baseline_y: i64,
    min_y: i64,
    max_y: i64,
) -> String {
    if points.len() < 2 {
        return String::new();
    }
    let curve = build_catmull_rom_bezier_path(points, min_y, max_y);
    let x_first = points[0].0;
    let x_last = points[points.len() - 1].0;
    format!("{curve} L {x_last} {baseline_y} L {x_first} {baseline_y} Z")
}

fn compute_tenths_percent(part: i64, total: i64) -> i64 {
    if total == 0 {
        return 0;
    }
    let p = i128::from(part.abs());
    let t = i128::from(total.abs());
    ((p * 1000 + t / 2) / t) as i64
}

fn format_whole_percent(part: i64, total: i64) -> String {
    if part <= 0 || total <= 0 {
        return "0%".to_string();
    }
    let p = i128::from(part);
    let t = i128::from(total);
    if p * 100 < t {
        "<1%".to_string()
    } else {
        let rounded = (p * 100 + t / 2) / t;
        format!("{rounded}%")
    }
}

fn format_tenths_percent(tenths: i64) -> String {
    format!("{}.{}%", tenths / 10, tenths % 10)
}

fn parse_year_month_zero_based(month_iso: &str) -> (i32, u32) {
    let parts: Vec<&str> = month_iso.split('-').collect();
    let y = parts
        .first()
        .and_then(|s| s.parse::<i32>().ok())
        .unwrap_or(2026);
    let m1 = parts
        .get(1)
        .and_then(|s| s.parse::<u32>().ok())
        .unwrap_or(11)
        .clamp(1, 12);
    (y, m1 - 1)
}

fn build_timeframe_months(tf: &TimeframeState) -> Vec<(String, String)> {
    let mut out = Vec::new();
    let mut y = tf.start_year;
    let mut m = tf.start_month.min(11);
    let mut guard = 0usize;
    while (y < tf.end_year || (y == tf.end_year && m <= tf.end_month.min(11))) && guard < 120 {
        let ym = format!("{:04}-{:02}", y, m + 1);
        let label = format!("{} {}", MONTH_NAMES[m as usize], y);
        out.push((ym, label));
        m += 1;
        if m > 11 {
            m = 0;
            y += 1;
        }
        guard += 1;
    }
    if out.is_empty() {
        let m_idx = tf.start_month.min(11);
        out.push((
            format!("{:04}-{:02}", tf.start_year, m_idx + 1),
            format!("{} {}", MONTH_NAMES[m_idx as usize], tf.start_year),
        ));
    }
    out
}

fn count_days_in_timeframe(tf: &TimeframeState) -> i64 {
    let mut total_days = 0i64;
    let mut y = tf.start_year;
    let mut m = tf.start_month.min(11);
    let mut guard = 0usize;
    while (y < tf.end_year || (y == tf.end_year && m <= tf.end_month.min(11))) && guard < 120 {
        total_days += i64::from(days_in_month(y, m + 1));
        m += 1;
        if m > 11 {
            m = 0;
            y += 1;
        }
        guard += 1;
    }
    total_days.max(1)
}

fn step_timeframe(tf: &TimeframeState, delta_months: i32) -> TimeframeState {
    let shift = |mut y: i32, m: u32| -> (i32, u32) {
        let mut mi = m as i32 + delta_months;
        while mi < 0 {
            mi += 12;
            y -= 1;
        }
        while mi > 11 {
            mi -= 12;
            y += 1;
        }
        (y, mi as u32)
    };
    let (sy, sm) = shift(tf.start_year, tf.start_month);
    let (ey, em) = shift(tf.end_year, tf.end_month);
    TimeframeState {
        preset: TimeframePreset::Custom,
        start_year: sy,
        start_month: sm,
        end_year: ey,
        end_month: em,
    }
}

fn compute_nice_step(span: i64, intervals: i64) -> i64 {
    if span <= 0 || intervals <= 0 {
        return 1_000;
    }
    let raw = (span + intervals - 1) / intervals;
    let mut pow10 = 1i64;
    while pow10 * 10 <= raw && pow10 <= 1_000_000_000_000 {
        pow10 *= 10;
    }
    for mult in [1i64, 2, 5, 10] {
        let candidate = pow10 * mult;
        if candidate >= raw {
            return candidate;
        }
    }
    pow10 * 10
}

fn format_compact_axis_money(milliunits: i64, symbol: &str) -> String {
    let sign = if milliunits < 0 { "-" } else { "" };
    let abs = milliunits.unsigned_abs();
    let dollars = (abs + 500) / 1000;
    if dollars >= 1_000_000 {
        let whole_m = dollars / 1_000_000;
        let tenths_m = (dollars % 1_000_000) / 100_000;
        format!("{sign}{symbol}{whole_m}.{tenths_m}M")
    } else if dollars >= 10_000 {
        let k = (dollars + 500) / 1000;
        format!("{sign}{symbol}{k}k")
    } else {
        let s = dollars.to_string();
        let mut out = String::new();
        for (i, ch) in s.chars().rev().enumerate() {
            if i > 0 && i % 3 == 0 {
                out.push(',');
            }
            out.push(ch);
        }
        let rev: String = out.chars().rev().collect();
        format!("{sign}{symbol}{rev}")
    }
}

fn is_rta_income(tx: &AnalyticsTransaction) -> bool {
    tx.category_id.as_deref() == Some(CAT_IMMEDIATE_INCOME)
        || tx.category_name.contains("Ready to Assign")
}

fn open_activity_modal(
    mut activity_modal: Signal<Option<ActivityModalState>>,
    title: String,
    subtitle: String,
    tx_ids: Vec<String>,
    src: &[AnalyticsTransaction],
) {
    let id_set: HashSet<String> = tx_ids.into_iter().collect();
    let mut matched: Vec<AnalyticsTransaction> = src
        .iter()
        .filter(|t| id_set.contains(&t.id))
        .cloned()
        .collect();
    matched.sort_by(|a, b| {
        b.date
            .cmp(&a.date)
            .then_with(|| a.payee_name.cmp(&b.payee_name))
    });
    activity_modal.set(Some(ActivityModalState {
        title,
        subtitle,
        transactions: matched,
    }));
}

fn build_analytics_datasets(
    raw_accounts: &[AccountDto],
    raw_txs: &[TransactionDto],
    raw_groups: &[CategoryGroupDto],
) -> (
    Vec<AnalyticsAccount>,
    Vec<AnalyticsTransaction>,
    Vec<AnalyticsTransaction>,
    HashSet<String>,
) {
    let mut cat_to_group: HashMap<String, (String, String)> = HashMap::new();
    let mut hidden_cat_ids: HashSet<String> = HashSet::new();

    for g in raw_groups {
        for c in &g.categories {
            cat_to_group.insert(c.id.clone(), (g.id.clone(), g.name.clone()));
            if g.hidden || c.hidden {
                hidden_cat_ids.insert(c.id.clone());
            }
        }
    }

    let analytics_accounts: Vec<AnalyticsAccount> = raw_accounts
        .iter()
        .map(|a| AnalyticsAccount {
            id: a.id.clone(),
            name: a.name.clone(),
            account_type: a.r#type.clone(),
            balance_milliunits: a.balance_milliunits,
        })
        .collect();

    let mut account_level_txs = Vec::with_capacity(raw_txs.len());
    let mut category_expanded_txs = Vec::with_capacity(raw_txs.len());

    for t in raw_txs {
        let acc_name = t
            .account_name
            .clone()
            .or_else(|| t.account_name_camel.clone())
            .unwrap_or_default();
        let payee_name = t.payee_name.clone().unwrap_or_default();

        let cid = t.category_id.clone();
        let (gid, gname) = cid
            .as_ref()
            .and_then(|id| cat_to_group.get(id).cloned())
            .unwrap_or_else(|| (UNCATEGORIZED_GROUP_ID.to_string(), "Other".to_string()));

        let base_tx = AnalyticsTransaction {
            id: t.id.clone(),
            account_id: t.account_id.clone(),
            account_name: acc_name.clone(),
            date: t.date.clone(),
            payee_name: payee_name.clone(),
            category_id: cid,
            category_name: t
                .category_name
                .clone()
                .unwrap_or_else(|| "Uncategorized".to_string()),
            group_id: Some(gid),
            group_name: gname,
            amount_milliunits: t.amount_milliunits,
            transfer_account_id: t.transfer_account_id.clone(),
        };

        account_level_txs.push(base_tx.clone());

        if t.subtransactions.is_empty() {
            category_expanded_txs.push(base_tx);
        } else {
            for (sub_idx, sub) in t.subtransactions.iter().enumerate() {
                let sub_cid = sub.category_id.clone();
                let (sub_gid, sub_gname) = sub_cid
                    .as_ref()
                    .and_then(|id| cat_to_group.get(id).cloned())
                    .unwrap_or_else(|| (UNCATEGORIZED_GROUP_ID.to_string(), "Other".to_string()));
                let sub_payee = sub
                    .payee_name
                    .clone()
                    .filter(|p| !p.is_empty())
                    .unwrap_or_else(|| payee_name.clone());
                category_expanded_txs.push(AnalyticsTransaction {
                    id: sub
                        .id
                        .clone()
                        .unwrap_or_else(|| format!("{}#{}", t.id, sub_idx)),
                    account_id: t.account_id.clone(),
                    account_name: acc_name.clone(),
                    date: t.date.clone(),
                    payee_name: sub_payee,
                    category_id: sub_cid,
                    category_name: sub
                        .category_name
                        .clone()
                        .unwrap_or_else(|| "Uncategorized".to_string()),
                    group_id: Some(sub_gid),
                    group_name: sub_gname,
                    amount_milliunits: sub.amount_milliunits,
                    transfer_account_id: sub
                        .transfer_account_id
                        .clone()
                        .or_else(|| t.transfer_account_id.clone()),
                });
            }
        }
    }

    (
        analytics_accounts,
        account_level_txs,
        category_expanded_txs,
        hidden_cat_ids,
    )
}

fn filter_with_sentinels(
    transactions: &[AnalyticsTransaction],
    tf: &TimeframeState,
    selected_category_ids: &HashSet<String>,
    categories_none: bool,
    selected_account_ids: &HashSet<String>,
    accounts_none: bool,
) -> Vec<AnalyticsTransaction> {
    if categories_none || accounts_none {
        return Vec::new();
    }
    let mut cat_set = selected_category_ids.clone();
    if cat_set.contains(UNCATEGORIZED_ID) {
        cat_set.insert(EMPTY_FILTER_SENTINEL.to_string());
    }
    let base = filter_transactions_by_date_and_filters(
        transactions,
        tf,
        &HashSet::new(),
        selected_account_ids,
    );
    if selected_category_ids.is_empty() {
        return base;
    }
    base.into_iter()
        .filter(|tx| match &tx.category_id {
            Some(cid) => selected_category_ids.contains(cid),
            None => selected_category_ids.contains(UNCATEGORIZED_ID),
        })
        .collect()
}

fn compute_breakdown_and_metrics(
    transactions: &[AnalyticsTransaction],
    tf: &TimeframeState,
    by_group: bool,
    drilldown: Option<&ReflectDrilldown>,
    hidden_cat_ids: &HashSet<String>,
    nw_summary: &NetWorthMonthPoint,
) -> BreakdownComputation {
    let scoped: Vec<&AnalyticsTransaction> = transactions
        .iter()
        .filter(|tx| {
            if tx.transfer_account_id.is_some() || is_rta_income(tx) {
                return false;
            }
            if let Some(dd) = drilldown {
                let tx_gid = tx.group_id.as_deref().unwrap_or(UNCATEGORIZED_GROUP_ID);
                if tx_gid != dd.group_id {
                    return false;
                }
            }
            true
        })
        .collect();

    let effective_by_group = by_group && drilldown.is_none();

    struct BucketAgg {
        name: String,
        raw_sum: i64,
        entity_ids: HashSet<String>,
        tx_ids: Vec<String>,
        can_drill_down: bool,
        is_hidden: bool,
    }

    let mut buckets: BTreeMap<String, BucketAgg> = BTreeMap::new();
    let mut payee_freq: BTreeMap<String, (usize, i64)> = BTreeMap::new();
    let mut largest_outflow: Option<(&str, i64, &str)> = None;
    let mut outflow_tx_count = 0usize;

    for tx in &scoped {
        let (key, name, can_drill, is_hidden) = if effective_by_group {
            let gid = tx
                .group_id
                .clone()
                .unwrap_or_else(|| UNCATEGORIZED_GROUP_ID.to_string());
            let gname = if tx.group_name.is_empty() {
                "Uncategorized".to_string()
            } else {
                tx.group_name.clone()
            };
            let drill = gid != UNCATEGORIZED_GROUP_ID;
            (gid, gname, drill, false)
        } else {
            let cid = tx
                .category_id
                .clone()
                .unwrap_or_else(|| UNCATEGORIZED_ID.to_string());
            let cname = if tx.category_name.is_empty() {
                "Uncategorized".to_string()
            } else {
                tx.category_name.clone()
            };
            let hidden = hidden_cat_ids.contains(&cid);
            (cid, cname, false, hidden)
        };

        let entry = buckets.entry(key.clone()).or_insert_with(|| BucketAgg {
            name,
            raw_sum: 0,
            entity_ids: HashSet::new(),
            tx_ids: Vec::new(),
            can_drill_down: can_drill,
            is_hidden,
        });
        entry.raw_sum += tx.amount_milliunits;
        entry.entity_ids.insert(key);
        entry.tx_ids.push(tx.id.clone());

        if tx.amount_milliunits < 0 {
            outflow_tx_count += 1;
            let abs_amt = tx.amount_milliunits.abs();
            let pname = if tx.payee_name.trim().is_empty() {
                "Unknown Payee".to_string()
            } else {
                tx.payee_name.trim().to_string()
            };
            let p_entry = payee_freq.entry(pname).or_insert((0, 0));
            p_entry.0 += 1;
            p_entry.1 += abs_amt;

            let replace_largest = match largest_outflow {
                Some((_, best_amt, _)) => abs_amt > best_amt,
                None => true,
            };
            if replace_largest {
                let display_payee = if tx.payee_name.trim().is_empty() {
                    tx.category_name.as_str()
                } else {
                    tx.payee_name.trim()
                };
                largest_outflow = Some((display_payee, abs_amt, tx.date.as_str()));
            }
        }
    }

    let mut spending_raw: Vec<(String, BucketAgg)> = Vec::new();
    let mut positive_inflows: Vec<ReflectInflowRow> = Vec::new();
    let mut total_outflows_gross = 0i64;
    let mut total_positive_inflows = 0i64;

    for (id, agg) in buckets {
        if agg.raw_sum < 0 {
            total_outflows_gross += -agg.raw_sum;
            spending_raw.push((id, agg));
        } else if agg.raw_sum > 0 {
            total_positive_inflows += agg.raw_sum;
            positive_inflows.push(ReflectInflowRow {
                id,
                name: agg.name,
                amount: agg.raw_sum,
                tx_ids: agg.tx_ids,
            });
        }
    }

    spending_raw.sort_by(|a, b| {
        (-b.1.raw_sum)
            .cmp(&(-a.1.raw_sum))
            .then_with(|| a.1.name.cmp(&b.1.name))
            .then_with(|| a.0.cmp(&b.0))
    });
    positive_inflows.sort_by(|a, b| b.amount.cmp(&a.amount).then_with(|| a.name.cmp(&b.name)));

    let total_spending = total_outflows_gross;
    let mut bar_items = Vec::with_capacity(spending_raw.len());
    let mut most_frequent_bucket_name = "n/a".to_string();
    let mut most_frequent_bucket_count = 0usize;

    for (idx, (id, agg)) in spending_raw.into_iter().enumerate() {
        let amount = -agg.raw_sum;
        let tx_count = agg.tx_ids.len();
        if tx_count > most_frequent_bucket_count {
            most_frequent_bucket_count = tx_count;
            most_frequent_bucket_name = agg.name.clone();
        }
        let color_idx = if idx < 10 { idx } else { 10 };
        let pct_tenths = compute_tenths_percent(amount, total_spending);
        let entity_ids: Vec<String> = agg.entity_ids.into_iter().collect();
        bar_items.push(ReflectSpendingRow {
            id,
            name: agg.name,
            amount,
            percentage_tenths: pct_tenths,
            color_idx,
            color: REPORT_SPENDING_COLOR_TOKENS[color_idx].to_string(),
            entity_ids,
            tx_ids: agg.tx_ids,
            can_drill_down: agg.can_drill_down,
            is_hidden: agg.is_hidden,
            tx_count,
        });
    }

    // Top-10 + "Other Categories" grouping for Donut slices
    let mut donut_items: Vec<ReflectSpendingRow> = Vec::new();
    if bar_items.len() <= 10 {
        donut_items = bar_items.clone();
    } else {
        donut_items.extend(bar_items[..10].iter().cloned());
        let mut other_amt = 0i64;
        let mut other_entity_ids = Vec::new();
        let mut other_tx_ids = Vec::new();
        let mut other_tx_count = 0usize;
        for rem in &bar_items[10..] {
            other_amt += rem.amount;
            other_entity_ids.extend(rem.entity_ids.iter().cloned());
            other_tx_ids.extend(rem.tx_ids.iter().cloned());
            other_tx_count += rem.tx_count;
        }
        if other_amt > 0 {
            donut_items.push(ReflectSpendingRow {
                id: OTHER_CATEGORIES_ID.to_string(),
                name: OTHER_CATEGORIES_NAME.to_string(),
                amount: other_amt,
                percentage_tenths: compute_tenths_percent(other_amt, total_spending),
                color_idx: 10,
                color: REPORT_SPENDING_COLOR_TOKENS[10].to_string(),
                entity_ids: other_entity_ids,
                tx_ids: other_tx_ids,
                can_drill_down: false,
                is_hidden: false,
                tx_count: other_tx_count,
            });
        }
    }

    let months_count = (build_timeframe_months(tf).len() as i64).max(1);
    let days_count = count_days_in_timeframe(tf);
    let average_monthly_spending = total_spending / months_count;
    let average_daily_spending = total_spending / days_count;

    let mut best_payee_name = "n/a".to_string();
    let mut best_payee_count = 0usize;
    let mut best_payee_total = 0i64;
    for (pname, (cnt, tot)) in payee_freq {
        if cnt > best_payee_count || (cnt == best_payee_count && tot > best_payee_total) {
            best_payee_name = pname;
            best_payee_count = cnt;
            best_payee_total = tot;
        }
    }

    let (largest_outflow_payee, largest_outflow_amount, largest_outflow_date) =
        match largest_outflow {
            Some((p, amt, dt)) => (p.to_string(), amt, dt.to_string()),
            None => ("n/a".to_string(), 0, String::new()),
        };

    BreakdownComputation {
        donut_items,
        bar_items,
        positive_inflows,
        metrics: ReflectSummaryMetrics {
            total_spending,
            total_outflows_gross,
            total_positive_inflows,
            tx_count: outflow_tx_count,
            average_monthly_spending,
            average_daily_spending,
            most_frequent_bucket_name,
            most_frequent_bucket_count,
            most_frequent_payee_name: best_payee_name,
            most_frequent_payee_count: best_payee_count,
            most_frequent_payee_total: best_payee_total,
            largest_outflow_payee,
            largest_outflow_amount,
            largest_outflow_date,
            assets_milliunits: nw_summary.assets,
            debts_milliunits: nw_summary.debts,
            net_worth_milliunits: nw_summary.net_worth,
        },
    }
}

fn compute_spending_trends_series(
    transactions: &[AnalyticsTransaction],
    tf: &TimeframeState,
    drilldown: Option<&ReflectDrilldown>,
) -> (Vec<TrendMonthColumn>, i64, i64) {
    let months = build_timeframe_months(tf);
    let scoped: Vec<&AnalyticsTransaction> = transactions
        .iter()
        .filter(|tx| {
            if tx.transfer_account_id.is_some() || is_rta_income(tx) || tx.date.len() < 7 {
                return false;
            }
            if let Some(dd) = drilldown {
                let tx_gid = tx.group_id.as_deref().unwrap_or(UNCATEGORIZED_GROUP_ID);
                if tx_gid != dd.group_id {
                    return false;
                }
            }
            true
        })
        .collect();

    let mut bucket_totals: BTreeMap<String, (String, i64, bool)> = BTreeMap::new();
    for tx in &scoped {
        if tx.amount_milliunits >= 0 {
            continue;
        }
        let (bid, bname, can_drill) = if drilldown.is_none() {
            let gid = tx
                .group_id
                .clone()
                .unwrap_or_else(|| UNCATEGORIZED_GROUP_ID.to_string());
            let gname = if tx.group_name.is_empty() {
                "Uncategorized".to_string()
            } else {
                tx.group_name.clone()
            };
            let drill = gid != UNCATEGORIZED_GROUP_ID;
            (gid, gname, drill)
        } else {
            let cid = tx
                .category_id
                .clone()
                .unwrap_or_else(|| UNCATEGORIZED_ID.to_string());
            let cname = if tx.category_name.is_empty() {
                "Uncategorized".to_string()
            } else {
                tx.category_name.clone()
            };
            (cid, cname, false)
        };
        let entry = bucket_totals.entry(bid).or_insert((bname, 0, can_drill));
        entry.1 += -tx.amount_milliunits;
    }

    let mut ranked: Vec<(String, String, i64, bool)> = bucket_totals
        .into_iter()
        .map(|(id, (name, tot, drill))| (id, name, tot, drill))
        .collect();
    ranked.sort_by(|a, b| b.2.cmp(&a.2).then_with(|| a.1.cmp(&b.1)));

    let mut series_defs: Vec<TrendSeriesDef> = Vec::new();
    let mut bucket_to_series_idx: HashMap<String, usize> = HashMap::new();
    let mut has_other = false;

    for (idx, (id, name, _, drill)) in ranked.into_iter().enumerate() {
        if idx < 10 {
            let s_idx = series_defs.len();
            bucket_to_series_idx.insert(id.clone(), s_idx);
            series_defs.push(TrendSeriesDef {
                id,
                name,
                color_idx: idx,
                color: REPORT_SPENDING_COLOR_TOKENS[idx].to_string(),
                can_drill_down: drill,
            });
        } else {
            has_other = true;
            bucket_to_series_idx.insert(id, 10);
        }
    }
    if has_other {
        series_defs.push(TrendSeriesDef {
            id: OTHER_CATEGORIES_ID.to_string(),
            name: OTHER_CATEGORIES_NAME.to_string(),
            color_idx: 10,
            color: REPORT_SPENDING_COLOR_TOKENS[10].to_string(),
            can_drill_down: false,
        });
    }

    let mut columns = Vec::with_capacity(months.len());
    let mut grand_total = 0i64;

    for (ym, label) in months {
        let mut per_series_amt = vec![0i64; series_defs.len()];
        let mut per_series_txs: Vec<Vec<String>> = vec![Vec::new(); series_defs.len()];
        let mut month_txs = Vec::new();
        let mut month_total = 0i64;

        for tx in &scoped {
            let Some(tx_ym) = tx.date.get(..7) else {
                continue;
            };
            if tx_ym != ym || tx.amount_milliunits >= 0 {
                continue;
            }
            let bid = if drilldown.is_none() {
                tx.group_id.as_deref().unwrap_or(UNCATEGORIZED_GROUP_ID)
            } else {
                tx.category_id.as_deref().unwrap_or(UNCATEGORIZED_ID)
            };
            let amt = -tx.amount_milliunits;
            month_total += amt;
            month_txs.push(tx.id.clone());
            if let Some(&s_idx) = bucket_to_series_idx.get(bid) {
                per_series_amt[s_idx] += amt;
                per_series_txs[s_idx].push(tx.id.clone());
            }
        }

        let mut segments = Vec::new();
        for (idx, def) in series_defs.iter().enumerate() {
            if per_series_amt[idx] > 0 {
                segments.push((
                    def.clone(),
                    per_series_amt[idx],
                    per_series_txs[idx].clone(),
                ));
            }
        }

        grand_total += month_total;
        columns.push(TrendMonthColumn {
            ym,
            label,
            total_spending: month_total,
            segments,
            all_tx_ids: month_txs,
        });
    }

    let avg = if columns.is_empty() {
        0
    } else {
        grand_total / (columns.len() as i64)
    };
    (columns, grand_total, avg)
}

type IeSubMap = BTreeMap<String, (String, Vec<i64>, Vec<Vec<String>>)>;

fn compute_income_expense_matrix(
    transactions: &[AnalyticsTransaction],
    tf: &TimeframeState,
) -> IeMatrixModel {
    let months = build_timeframe_months(tf);
    let m_count = months.len().max(1);
    let month_idx_map: HashMap<String, usize> = months
        .iter()
        .enumerate()
        .map(|(i, (ym, _))| (ym.clone(), i))
        .collect();

    let mut income_map: BTreeMap<String, (Vec<i64>, Vec<Vec<String>>)> = BTreeMap::new();
    let mut expense_map: BTreeMap<String, (String, IeSubMap)> = BTreeMap::new();

    for tx in transactions {
        if tx.transfer_account_id.is_some() {
            continue;
        }
        let Some(tx_ym) = tx.date.get(..7) else {
            continue;
        };
        let Some(&m_idx) = month_idx_map.get(tx_ym) else {
            continue;
        };

        if is_rta_income(tx) || (tx.category_id.is_none() && tx.amount_milliunits > 0) {
            let payee = if tx.payee_name.trim().is_empty() {
                "Direct Income".to_string()
            } else {
                tx.payee_name.trim().to_string()
            };
            let entry = income_map
                .entry(payee)
                .or_insert_with(|| (vec![0; m_count], vec![Vec::new(); m_count]));
            entry.0[m_idx] += tx.amount_milliunits;
            entry.1[m_idx].push(tx.id.clone());
        } else {
            let gid = tx
                .group_id
                .clone()
                .unwrap_or_else(|| UNCATEGORIZED_GROUP_ID.to_string());
            let gname = if tx.group_name.is_empty() {
                "Other".to_string()
            } else {
                tx.group_name.clone()
            };
            let cid = tx
                .category_id
                .clone()
                .unwrap_or_else(|| UNCATEGORIZED_ID.to_string());
            let cname = if tx.category_name.is_empty() {
                "Uncategorized".to_string()
            } else {
                tx.category_name.clone()
            };

            let grp = expense_map
                .entry(gid)
                .or_insert_with(|| (gname, BTreeMap::new()));
            let sub = grp
                .1
                .entry(cid)
                .or_insert_with(|| (cname, vec![0; m_count], vec![Vec::new(); m_count]));
            sub.1[m_idx] += tx.amount_milliunits;
            sub.2[m_idx].push(tx.id.clone());
        }
    }

    let m_count_i64 = m_count as i64;
    let mut income_rows = Vec::new();
    let mut income_monthly_totals = vec![0i64; m_count];

    for (payee, (vals, txs_by_m)) in income_map {
        let total: i64 = vals.iter().sum();
        let all_tx_ids: Vec<String> = txs_by_m.iter().flatten().cloned().collect();
        for (i, v) in vals.iter().enumerate() {
            income_monthly_totals[i] += *v;
        }
        income_rows.push(IeRowData {
            id: format!("inc-{payee}"),
            label: payee,
            monthly_amounts: vals,
            average: total / m_count_i64,
            total,
            tx_ids_by_month: txs_by_m,
            all_tx_ids,
        });
    }
    income_rows.sort_by(|a, b| b.total.cmp(&a.total).then_with(|| a.label.cmp(&b.label)));
    let income_total: i64 = income_monthly_totals.iter().sum();
    let income_average = income_total / m_count_i64;

    let mut expense_groups = Vec::new();
    let mut expense_monthly_totals = vec![0i64; m_count];

    for (gid, (gname, sub_map)) in expense_map {
        let mut rows = Vec::new();
        let mut grp_monthly = vec![0i64; m_count];
        let mut grp_txs_by_m = vec![Vec::new(); m_count];

        for (cid, (cname, vals, txs_by_m)) in sub_map {
            let total: i64 = vals.iter().sum();
            if total == 0 && txs_by_m.iter().all(|v| v.is_empty()) {
                continue;
            }
            let all_tx_ids: Vec<String> = txs_by_m.iter().flatten().cloned().collect();
            for (i, v) in vals.iter().enumerate() {
                grp_monthly[i] += *v;
                expense_monthly_totals[i] += *v;
                grp_txs_by_m[i].extend(txs_by_m[i].iter().cloned());
            }
            rows.push(IeRowData {
                id: cid,
                label: cname,
                monthly_amounts: vals,
                average: total / m_count_i64,
                total,
                tx_ids_by_month: txs_by_m,
                all_tx_ids,
            });
        }
        rows.sort_by(|a, b| a.total.cmp(&b.total).then_with(|| a.label.cmp(&b.label)));
        if !rows.is_empty() {
            let grp_total: i64 = grp_monthly.iter().sum();
            let grp_all_txs: Vec<String> = grp_txs_by_m.iter().flatten().cloned().collect();
            expense_groups.push(IeGroupData {
                id: gid,
                name: gname,
                rows,
                monthly_totals: grp_monthly,
                average: grp_total / m_count_i64,
                total: grp_total,
                tx_ids_by_month: grp_txs_by_m,
                all_tx_ids: grp_all_txs,
            });
        }
    }
    expense_groups.sort_by(|a, b| a.total.cmp(&b.total).then_with(|| a.name.cmp(&b.name)));
    let expense_total: i64 = expense_monthly_totals.iter().sum();
    let expense_average = expense_total / m_count_i64;

    let net_monthly: Vec<i64> = income_monthly_totals
        .iter()
        .zip(expense_monthly_totals.iter())
        .map(|(inc, exp)| inc + exp)
        .collect();
    let net_total = income_total + expense_total;
    let net_average = net_total / m_count_i64;

    IeMatrixModel {
        month_labels: months.into_iter().map(|(_, l)| l).collect(),
        income_rows,
        income_monthly_totals,
        income_average,
        income_total,
        expense_groups,
        expense_monthly_totals,
        expense_average,
        expense_total,
        net_monthly,
        net_average,
        net_total,
    }
}

#[component]
pub fn ReflectWorkspace() -> Element {
    let store = use_context::<AppStore>();
    let default_month_iso = store.current_month.read().clone();
    let (init_y, init_m) = parse_year_month_zero_based(&default_month_iso);

    let mut active_tab = use_signal(|| ReflectTab::SpendingBreakdown);
    let mut timeframe = use_signal(|| TimeframeState {
        preset: TimeframePreset::ThisMonth,
        start_year: init_y,
        start_month: init_m,
        end_year: init_y,
        end_month: init_m,
    });
    let mut selected_category_ids = use_signal(HashSet::<String>::new);
    let mut categories_none = use_signal(|| false);
    let mut selected_account_ids = use_signal(HashSet::<String>::new);
    let mut accounts_none = use_signal(|| false);

    let mut group_by_groups = use_signal(|| false);
    let mut drilldown_group = use_signal(|| None::<ReflectDrilldown>);
    let mut inspector_open = use_signal(|| true);
    let mut timeframe_modal_open = use_signal(|| false);
    let mut categories_modal_open = use_signal(|| false);
    let mut accounts_modal_open = use_signal(|| false);
    let mut inflow_modal_open = use_signal(|| false);
    let mut share_modal_open = use_signal(|| false);
    let mut skip_export_modal = use_signal(|| false);
    let mut export_modal = use_signal(|| None::<ExportModalState>);
    let mut activity_modal = use_signal(|| None::<ActivityModalState>);

    let raw_accounts = store.accounts.read().clone();
    let raw_txs = store.transactions.read().clone();
    let raw_groups = store.month_summary.read().category_groups.clone();
    let currency_symbol = store.plan_summary.read().currency_symbol.clone();

    let (analytics_accounts, account_level_txs, category_txs, hidden_cat_ids) =
        build_analytics_datasets(&raw_accounts, &raw_txs, &raw_groups);

    let (earliest_ym, latest_ym) = {
        let mut min_ym = (init_y, init_m);
        let mut max_ym = (init_y, init_m);
        for tx in &account_level_txs {
            if tx.date.len() >= 7 {
                let ym = parse_year_month_zero_based(&tx.date);
                if ym < min_ym {
                    min_ym = ym;
                }
                if ym > max_ym {
                    max_ym = ym;
                }
            }
        }
        (min_ym, max_ym)
    };

    let tf_state = timeframe.read().clone();
    let tf_label = format_timeframe_label(&tf_state);
    let sel_cats = selected_category_ids.read().clone();
    let sel_accs = selected_account_ids.read().clone();
    let is_cats_none = *categories_none.read();
    let is_accs_none = *accounts_none.read();

    let filtered_category_txs = filter_with_sentinels(
        &category_txs,
        &tf_state,
        &sel_cats,
        is_cats_none,
        &sel_accs,
        is_accs_none,
    );

    let account_filtered_txs: Vec<AnalyticsTransaction> = if is_accs_none {
        Vec::new()
    } else if sel_accs.is_empty() {
        account_level_txs.clone()
    } else {
        account_level_txs
            .iter()
            .filter(|tx| sel_accs.contains(&tx.account_id))
            .cloned()
            .collect()
    };

    let filtered_accounts: Vec<AnalyticsAccount> = if is_accs_none {
        Vec::new()
    } else if sel_accs.is_empty() {
        analytics_accounts.clone()
    } else {
        analytics_accounts
            .iter()
            .filter(|a| sel_accs.contains(&a.id))
            .cloned()
            .collect()
    };

    let nw_history =
        generate_net_worth_history(&filtered_accounts, &account_filtered_txs, Some(&tf_state));
    let nw_summary_point = nw_history.last().cloned().unwrap_or_else(|| {
        let cur_nw = calculate_net_worth(&filtered_accounts, None);
        NetWorthMonthPoint {
            month: tf_label.clone(),
            date_key: format!("{:04}-{:02}-01", tf_state.end_year, tf_state.end_month + 1),
            debts: cur_nw.debts,
            assets: cur_nw.assets,
            net_worth: cur_nw.net_worth,
            change: 0,
            increased: true,
        }
    });

    let current_dd = drilldown_group.read().clone();
    let breakdown = compute_breakdown_and_metrics(
        &filtered_category_txs,
        &tf_state,
        *group_by_groups.read(),
        current_dd.as_ref(),
        &hidden_cat_ids,
        &nw_summary_point,
    );

    let total_cat_count: usize = raw_groups.iter().map(|g| g.categories.len()).sum();
    let (cats_label, cats_pill) = if is_cats_none {
        ("No Categories".to_string(), None)
    } else if sel_cats.is_empty() {
        ("All Categories".to_string(), None)
    } else {
        let pill = if sel_cats.len() > 99 {
            "99+".to_string()
        } else {
            format!("{} of {}", sel_cats.len(), total_cat_count.max(1))
        };
        ("Some Categories".to_string(), Some(pill))
    };

    let total_acc_count = raw_accounts.len();
    let (accs_label, accs_pill) = if is_accs_none {
        ("No Accounts".to_string(), None)
    } else if sel_accs.is_empty() {
        ("All Accounts".to_string(), None)
    } else {
        let pill = if sel_accs.len() > 99 {
            "99+".to_string()
        } else {
            format!("{} of {}", sel_accs.len(), total_acc_count.max(1))
        };
        ("Some Accounts".to_string(), Some(pill))
    };

    let current_tab = *active_tab.read();
    let is_income_expense = current_tab == ReflectTab::IncomeExpense;
    let disable_left = tf_state.preset == TimeframePreset::AllDates
        || (tf_state.start_year, tf_state.start_month) <= earliest_ym;
    let disable_right = tf_state.preset == TimeframePreset::AllDates
        || (tf_state.end_year, tf_state.end_month) >= latest_ym;

    let filter_bar = FilterBarState {
        timeframe_label: tf_label.clone(),
        categories_label: cats_label,
        accounts_label: accs_label,
        categories_pill: cats_pill,
        accounts_pill: accs_pill,
        show_categories: current_tab != ReflectTab::NetWorth,
        disable_left,
        disable_right,
    };

    let on_filter = use_callback(move |act: FilterAction| match act {
        FilterAction::PrevMonth => {
            let cur = timeframe.read().clone();
            timeframe.set(step_timeframe(&cur, -1));
        }
        FilterAction::NextMonth => {
            let cur = timeframe.read().clone();
            timeframe.set(step_timeframe(&cur, 1));
        }
        FilterAction::OpenTimeframe => timeframe_modal_open.set(true),
        FilterAction::OpenCategories => categories_modal_open.set(true),
        FilterAction::OpenAccounts => accounts_modal_open.set(true),
    });

    let toggle_inspector = use_callback(move |_: MouseEvent| {
        let cur = *inspector_open.read();
        inspector_open.set(!cur);
    });

    let mut trigger_export =
        move |report_name: &'static str, filename: &'static str, csv: String| {
            if *skip_export_modal.read() {
                let _ = save_csv_file_dialog(filename, &csv);
            } else {
                export_modal.set(Some(ExportModalState {
                    report_name: report_name.to_string(),
                    filename: filename.to_string(),
                    csv,
                }));
            }
        };

    let tx_src_cat = filtered_category_txs.clone();
    let tx_src_cat_trends = filtered_category_txs.clone();
    let tx_src_cat_ie = filtered_category_txs.clone();
    let tx_src_cat_insp = filtered_category_txs.clone();
    let tx_src_nw = account_filtered_txs.clone();

    let sub_bd = tf_label.clone();
    let sub_tr = tf_label.clone();
    let sub_ie = tf_label.clone();
    let sub_insp = tf_label.clone();

    let breakdown_for_inspector = breakdown.clone();
    let breakdown_for_inflow = breakdown.clone();
    let metrics_for_inspector = breakdown.metrics.clone();
    let nw_history_for_share = nw_history.clone();

    rsx! {
        div {
            class: "ynab-u content",

            div {
                class: "reports-panel",

                div {
                    class: if is_income_expense {
                        "reports-header-top"
                    } else {
                        "reports-header-top content-min-break"
                    },

                    ReflectNavigationHeader {
                        active_tab: current_tab,
                        on_select: move |tab| {
                            active_tab.set(tab);
                            drilldown_group.set(None);
                        },
                    }

                    div {
                        class: if is_income_expense {
                            "reflect-container reflect-income-expense-container"
                        } else {
                            "reflect-container"
                        },

                        div {
                            class: "reflect-content",
                            match current_tab {
                                ReflectTab::SpendingBreakdown => rsx! {
                                    SpendingBreakdownView {
                                        filter_bar: filter_bar.clone(),
                                        group_by_groups: *group_by_groups.read(),
                                        drilldown: current_dd.clone(),
                                        breakdown: breakdown.clone(),
                                        inspector_open: *inspector_open.read(),
                                        on_toggle_inspector: toggle_inspector,
                                        on_toggle_groups: move |val| {
                                            group_by_groups.set(val);
                                            drilldown_group.set(None);
                                        },
                                        on_drilldown_group: move |dd| drilldown_group.set(Some(dd)),
                                        on_clear_drilldown: move |_| drilldown_group.set(None),
                                        on_open_activity: move |(title, ids): (String, Vec<String>)| {
                                            open_activity_modal(activity_modal, title, sub_bd.clone(), ids, &tx_src_cat);
                                        },
                                        on_open_inflow_warning: move |_| inflow_modal_open.set(true),
                                        on_export_csv: move |csv: String| {
                                            trigger_export("Spending Breakdown", "spending_breakdown.csv", csv);
                                        },
                                        on_filter: on_filter,
                                    }
                                },
                                ReflectTab::SpendingTrends => rsx! {
                                    SpendingTrendsView {
                                        filter_bar: filter_bar.clone(),
                                        timeframe: tf_state.clone(),
                                        transactions: filtered_category_txs.clone(),
                                        drilldown: current_dd.clone(),
                                        currency_symbol: currency_symbol.clone(),
                                        inspector_open: *inspector_open.read(),
                                        on_toggle_inspector: toggle_inspector,
                                        on_drilldown_group: move |dd| drilldown_group.set(Some(dd)),
                                        on_clear_drilldown: move |_| drilldown_group.set(None),
                                        on_open_activity: move |(title, ids): (String, Vec<String>)| {
                                            open_activity_modal(activity_modal, title, sub_tr.clone(), ids, &tx_src_cat_trends);
                                        },
                                        on_export_csv: move |csv: String| {
                                            trigger_export("Spending Trends", "spending_trends.csv", csv);
                                        },
                                        on_filter: on_filter,
                                    }
                                },
                                ReflectTab::NetWorth => rsx! {
                                    NetWorthView {
                                        filter_bar: filter_bar.clone(),
                                        history: nw_history.clone(),
                                        currency_symbol: currency_symbol.clone(),
                                        inspector_open: *inspector_open.read(),
                                        on_toggle_inspector: toggle_inspector,
                                        on_share_progress: move |_| share_modal_open.set(true),
                                        on_open_month_activity: move |(month_label, ym): (String, String)| {
                                            let matched: Vec<AnalyticsTransaction> = tx_src_nw
                                                .iter()
                                                .filter(|t| t.date.starts_with(&ym))
                                                .cloned()
                                                .collect();
                                            activity_modal.set(Some(ActivityModalState {
                                                title: format!("Net Worth Activity - {month_label}"),
                                                subtitle: format!("{ym} ({} transactions)", matched.len()),
                                                transactions: matched,
                                            }));
                                        },
                                        on_export_csv: move |csv: String| {
                                            trigger_export("Net Worth", "net_worth.csv", csv);
                                        },
                                        on_filter: on_filter,
                                    }
                                },
                                ReflectTab::IncomeExpense => rsx! {
                                    IncomeExpenseView {
                                        filter_bar: filter_bar.clone(),
                                        timeframe: tf_state.clone(),
                                        transactions: filtered_category_txs.clone(),
                                        inspector_open: *inspector_open.read(),
                                        on_toggle_inspector: toggle_inspector,
                                        on_open_activity: move |(title, ids): (String, Vec<String>)| {
                                            open_activity_modal(activity_modal, title, sub_ie.clone(), ids, &tx_src_cat_ie);
                                        },
                                        on_export_csv: move |csv: String| {
                                            trigger_export("Income v Expense", "income_v_expense.csv", csv);
                                        },
                                        on_filter: on_filter,
                                    }
                                },
                                ReflectTab::AgeOfMoney => rsx! {
                                    AgeOfMoneyView {
                                        transactions: account_filtered_txs.clone(),
                                        inspector_open: *inspector_open.read(),
                                        on_toggle_inspector: toggle_inspector,
                                        on_export_csv: move |csv: String| {
                                            trigger_export("Age of Money", "age_of_money.csv", csv);
                                        },
                                    }
                                },
                            }
                        }
                    }
                }

                if *inspector_open.read() {
                    ReflectSummaryInspector {
                        active_tab: current_tab,
                        timeframe_label: tf_label,
                        drilldown: current_dd,
                        metrics: metrics_for_inspector,
                        top_items: breakdown_for_inspector.donut_items.clone(),
                        on_close: move |_| inspector_open.set(false),
                        on_select_item: move |item: ReflectSpendingRow| {
                            if item.can_drill_down && item.id != OTHER_CATEGORIES_ID {
                                drilldown_group.set(Some(ReflectDrilldown {
                                    group_id: item.id,
                                    group_name: item.name,
                                }));
                            } else {
                                open_activity_modal(activity_modal, item.name, sub_insp.clone(), item.tx_ids, &tx_src_cat_insp);
                            }
                        },
                    }
                }
            }

            if *timeframe_modal_open.read() {
                TimeframeModal {
                    current: tf_state.clone(),
                    earliest_year: earliest_ym.0.min(2024),
                    latest_year: latest_ym.0.max(init_y),
                    on_select_preset: move |preset| {
                        let (sy, sm, ey, em) = if preset == TimeframePreset::AllDates {
                            (earliest_ym.0, earliest_ym.1, latest_ym.0, latest_ym.1)
                        } else {
                            calculate_timeframe_dates(preset, init_y, init_m)
                        };
                        timeframe.set(TimeframeState {
                            preset,
                            start_year: sy,
                            start_month: sm,
                            end_year: ey,
                            end_month: em,
                        });
                        timeframe_modal_open.set(false);
                    },
                    on_apply_custom: move |(sy, sm, ey, em)| {
                        let (sy_f, sm_f, ey_f, em_f) = if (sy, sm) <= (ey, em) {
                            (sy, sm, ey, em)
                        } else {
                            (ey, em, sy, sm)
                        };
                        timeframe.set(TimeframeState {
                            preset: TimeframePreset::Custom,
                            start_year: sy_f,
                            start_month: sm_f,
                            end_year: ey_f,
                            end_month: em_f,
                        });
                        timeframe_modal_open.set(false);
                    },
                    on_close: move |_| timeframe_modal_open.set(false),
                }
            }

            if *categories_modal_open.read() {
                FilterItemsModal {
                    kind: FilterKind::Categories,
                    category_groups: raw_groups.clone(),
                    accounts: raw_accounts.clone(),
                    selected_ids: sel_cats.clone(),
                    none_selected: is_cats_none,
                    on_apply: move |(ids, none_flag)| {
                        selected_category_ids.set(ids);
                        categories_none.set(none_flag);
                        categories_modal_open.set(false);
                    },
                    on_close: move |_| categories_modal_open.set(false),
                }
            }

            if *accounts_modal_open.read() {
                FilterItemsModal {
                    kind: FilterKind::Accounts,
                    category_groups: raw_groups.clone(),
                    accounts: raw_accounts.clone(),
                    selected_ids: sel_accs.clone(),
                    none_selected: is_accs_none,
                    on_apply: move |(ids, none_flag)| {
                        selected_account_ids.set(ids);
                        accounts_none.set(none_flag);
                        accounts_modal_open.set(false);
                    },
                    on_close: move |_| accounts_modal_open.set(false),
                }
            }

            if *inflow_modal_open.read() {
                InflowWarningModal {
                    total_outflows: breakdown_for_inflow.metrics.total_outflows_gross,
                    total_inflows: breakdown_for_inflow.metrics.total_positive_inflows,
                    net_spending: breakdown_for_inflow.metrics.total_spending - breakdown_for_inflow.metrics.total_positive_inflows,
                    on_close: move |_| inflow_modal_open.set(false),
                }
            }

            if let Some(exp_data) = export_modal.read().clone() {
                ExportReportsModal {
                    report_name: exp_data.report_name,
                    on_confirm: move |dont_remind: bool| {
                        if dont_remind {
                            skip_export_modal.set(true);
                        }
                        let _ = save_csv_file_dialog(&exp_data.filename, &exp_data.csv);
                        export_modal.set(None);
                    },
                    on_close: move |_| export_modal.set(None),
                }
            }

            if *share_modal_open.read() {
                ChartImageExporterModal {
                    history: nw_history_for_share,
                    on_close: move |_| share_modal_open.set(false),
                }
            }

            if let Some(modal_data) = activity_modal.read().clone() {
                ActivityTransactionsModal {
                    title: modal_data.title,
                    subtitle: modal_data.subtitle,
                    transactions: modal_data.transactions,
                    on_close: move |_| activity_modal.set(None),
                }
            }
        }
    }
}

#[component]
fn ReflectNavigationHeader(active_tab: ReflectTab, on_select: EventHandler<ReflectTab>) -> Element {
    let tabs = [
        (ReflectTab::SpendingBreakdown, "Spending Breakdown"),
        (ReflectTab::SpendingTrends, "Spending Trends"),
        (ReflectTab::NetWorth, "Net Worth"),
        (ReflectTab::IncomeExpense, "Income v Expense"),
        (ReflectTab::AgeOfMoney, "Age of Money"),
    ];

    rsx! {
        div {
            class: "ynab-u reports-header",
            for (tab, label) in tabs {
                button {
                    key: "{label}",
                    class: if active_tab == tab { "active" } else { "" },
                    r#type: "button",
                    onclick: move |_| on_select.call(tab),
                    "{label}"
                }
            }
        }
    }
}

#[allow(clippy::too_many_arguments)]
#[component]
fn ReflectPageHeader(
    title: String,
    should_show_breadcrumbs: bool,
    selected_group_name: String,
    inspector_open: bool,
    on_clear_group: EventHandler<MouseEvent>,
    on_toggle_inspector: EventHandler<MouseEvent>,
    on_export: EventHandler<MouseEvent>,
    #[props(default)] on_share_progress: Option<EventHandler<MouseEvent>>,
) -> Element {
    rsx! {
        div {
            class: "reflect-page-header-group",
            h3 {
                class: "reflect-page-title",
                if should_show_breadcrumbs {
                    div {
                        class: "reflect-breadcrumbs__selected-group-breadcrumbs",
                        button {
                            r#type: "button",
                            class: "ghost-button primary all-groups-button",
                            onclick: move |e| on_clear_group.call(e),
                            "All Groups"
                        }
                        Icon { name: "chevron_right", width: 12, height: 12 }
                        button {
                            r#type: "button",
                            class: "ghost-button group-name",
                            disabled: true,
                            "{selected_group_name}"
                        }
                    }
                } else {
                    "{title}"
                }
            }
            div {
                class: "reflect-page-header-actions",
                if let Some(share_cb) = on_share_progress {
                    button {
                        r#type: "button",
                        class: "ynab-button primary reflect-share-progress-button",
                        onclick: move |e| share_cb.call(e),
                        Icon { name: "line_chart", width: 14, height: 14 }
                        span { "Share Your Progress" }
                    }
                }
                button {
                    r#type: "button",
                    class: "ghost-button primary type-body",
                    onclick: move |e| on_toggle_inspector.call(e),
                    Icon { name: if inspector_open { "sidebar_close" } else { "sidebar_open" }, width: 14, height: 14 }
                    span { if inspector_open { "Hide Summary" } else { "Summary" } }
                }
                button {
                    r#type: "button",
                    class: "ghost-button primary type-body reflect-export-button",
                    onclick: move |e| on_export.call(e),
                    Icon { name: "document_with_arrow_down", width: 14, height: 14 }
                    span { "Export" }
                }
            }
        }
    }
}

#[component]
fn ReflectFilterControls(state: FilterBarState, on_action: EventHandler<FilterAction>) -> Element {
    rsx! {
        div {
            class: "reflect-filter-controls",
            div {
                class: "reflect-filter-button-group",
                button {
                    class: "ghost-button primary is-icon-only type-body filter-button reports-filter-button filter-button__left-arrow",
                    r#type: "button",
                    disabled: state.disable_left,
                    aria_label: "Previous date range",
                    onclick: move |_| on_action.call(FilterAction::PrevMonth),
                    Icon { name: "chevron_left", width: 12, height: 12 }
                    div { class: "filter-button__divider" }
                }
                button {
                    class: "ghost-button primary type-body filter-button reports-filter-button filter-button--middle-state filter-button-timeframe",
                    r#type: "button",
                    onclick: move |_| on_action.call(FilterAction::OpenTimeframe),
                    Icon { name: "calendar", width: 12, height: 12 }
                    "{state.timeframe_label}"
                }
                button {
                    class: "ghost-button primary is-icon-only type-body filter-button reports-filter-button filter-button__right-arrow",
                    r#type: "button",
                    disabled: state.disable_right,
                    aria_label: "Next date range",
                    onclick: move |_| on_action.call(FilterAction::NextMonth),
                    div { class: "filter-button__divider" }
                    Icon { name: "chevron_right", width: 12, height: 12 }
                }
            }

            div { class: "filter-controls-divider" }

            if state.show_categories {
                div {
                    class: "reflect-filter-button-group",
                    button {
                        class: "ghost-button primary is-dropdown type-body filter-button reports-filter-button filter-button-categories",
                        r#type: "button",
                        onclick: move |_| on_action.call(FilterAction::OpenCategories),
                        "{state.categories_label}"
                        if let Some(pill) = state.categories_pill {
                            span { class: "filter-button__pill", "{pill}" }
                        }
                        Icon { name: "caret_down", width: 8, height: 8 }
                    }
                }
            }

            div {
                class: "reflect-filter-button-group",
                button {
                    class: "ghost-button primary is-dropdown type-body filter-button reports-filter-button filter-button-accounts",
                    r#type: "button",
                    onclick: move |_| on_action.call(FilterAction::OpenAccounts),
                    "{state.accounts_label}"
                    if let Some(pill) = state.accounts_pill {
                        span { class: "filter-button__pill", "{pill}" }
                    }
                    Icon { name: "caret_down", width: 8, height: 8 }
                }
            }
        }
    }
}

#[component]
fn ReflectSummaryInspector(
    active_tab: ReflectTab,
    timeframe_label: String,
    drilldown: Option<ReflectDrilldown>,
    metrics: ReflectSummaryMetrics,
    top_items: Vec<ReflectSpendingRow>,
    on_close: EventHandler<MouseEvent>,
    on_select_item: EventHandler<ReflectSpendingRow>,
) -> Element {
    let store = use_context::<AppStore>();
    let tab_title = match active_tab {
        ReflectTab::SpendingBreakdown => "Spending Breakdown",
        ReflectTab::SpendingTrends => "Spending Trends",
        ReflectTab::NetWorth => "Net Worth",
        ReflectTab::IncomeExpense => "Income v Expense",
        ReflectTab::AgeOfMoney => "Age of Money",
    };
    let debts_text = if metrics.debts_milliunits == 0 {
        store.format_money(0)
    } else {
        format!("-{}", store.format_money(metrics.debts_milliunits))
    };

    rsx! {
        aside {
            class: "reports-inspector reflect-inspector-aside",
            div {
                class: "budget-inspector-content reflect-inspector-stack",

                div {
                    class: "reflect-inspector-header",
                    h3 {
                        class: "reflect-inspector-heading",
                        "Summary Inspector"
                    }
                    button {
                        r#type: "button",
                        class: "ghost-button is-icon-only",
                        title: "Close Summary Inspector",
                        onclick: move |e| on_close.call(e),
                        Icon { name: "close", width: 12, height: 12 }
                    }
                }

                div {
                    class: "card reflect-inspector-card",
                    div {
                        class: "reflect-inspector-kicker",
                        "{tab_title}"
                    }
                    div {
                        class: "reports-inspector-timeframe-title reflect-inspector-timeframe",
                        "{timeframe_label}"
                    }
                    if let Some(dd) = drilldown {
                        div {
                            class: "reflect-inspector-drilldown-badge",
                            "Group: {dd.group_name}"
                        }
                    }
                }

                div {
                    class: "card reflect-inspector-card",
                    div {
                        div { class: "reflect-inspector-label", "Total Spending" }
                        div {
                            class: "tabular-nums reflect-inspector-hero-amount",
                            "{store.format_money(metrics.total_spending)}"
                        }
                        div {
                            class: "reflect-inspector-subtext",
                            "{metrics.tx_count} outflow transactions"
                        }
                    }

                    hr { class: "reflect-inspector-divider" }

                    div {
                        class: "reflect-inspector-stat-grid",
                        div {
                            div { class: "reflect-inspector-label", "Avg Monthly" }
                            div {
                                class: "tabular-nums reflect-inspector-stat-value",
                                "{store.format_money(metrics.average_monthly_spending)}"
                            }
                        }
                        div {
                            div { class: "reflect-inspector-label", "Avg Daily" }
                            div {
                                class: "tabular-nums reflect-inspector-stat-value",
                                "{store.format_money(metrics.average_daily_spending)}"
                            }
                        }
                    }

                    hr { class: "reflect-inspector-divider" }

                    div {
                        div { class: "reflect-inspector-label", "Most Frequent Payee" }
                        div {
                            class: "reflect-inspector-stat-value reflect-inspector-truncate",
                            "{metrics.most_frequent_payee_name}"
                        }
                        if metrics.most_frequent_payee_count > 0 {
                            div {
                                class: "reflect-inspector-subtext",
                                "{metrics.most_frequent_payee_count} transactions · {store.format_money(metrics.most_frequent_payee_total)}"
                            }
                        }
                    }

                    div {
                        div { class: "reflect-inspector-label", "Largest Outflow" }
                        div {
                            class: "reflect-inspector-stat-value reflect-inspector-truncate",
                            "{metrics.largest_outflow_payee}"
                        }
                        if metrics.largest_outflow_amount > 0 {
                            div {
                                class: "tabular-nums reflect-inspector-subtext",
                                "{store.format_money(metrics.largest_outflow_amount)} on {store.format_date(&metrics.largest_outflow_date)}"
                            }
                        }
                    }
                }

                div {
                    class: "card reflect-inspector-card",
                    h3 {
                        class: "reflect-inspector-heading",
                        "Assets / Debts / Net Worth"
                    }
                    div {
                        class: "reflect-inspector-nw-row",
                        span {
                            class: "reflect-inspector-nw-label",
                            span { class: "reflect-inspector-swatch is-assets" }
                            "Assets"
                        }
                        strong { class: "tabular-nums", "{store.format_money(metrics.assets_milliunits)}" }
                    }
                    div {
                        class: "reflect-inspector-nw-row",
                        span {
                            class: "reflect-inspector-nw-label",
                            span { class: "reflect-inspector-swatch is-debts" }
                            "Debts"
                        }
                        strong { class: "tabular-nums", "{debts_text}" }
                    }
                    hr { class: "reflect-inspector-divider" }
                    div {
                        class: "reflect-inspector-nw-total",
                        span { "Net Worth" }
                        span {
                            class: if metrics.net_worth_milliunits >= 0 {
                                "tabular-nums reflect-inspector-positive"
                            } else {
                                "tabular-nums reflect-inspector-negative"
                            },
                            "{store.format_money(metrics.net_worth_milliunits)}"
                        }
                    }
                }

                if !top_items.is_empty() {
                    div {
                        class: "card reflect-inspector-card",
                        h3 {
                            class: "reflect-inspector-heading",
                            "Top Breakdown"
                        }
                        table {
                            class: "reports-inspector-table reflect-inspector-table",
                            tbody {
                                for item in top_items.iter().take(6) {
                                    {
                                        let item_click = item.clone();
                                        rsx! {
                                            tr {
                                                key: "insp-{item.id}",
                                                class: "reflect-inspector-breakdown-row",
                                                onclick: move |_| on_select_item.call(item_click.clone()),
                                                td {
                                                    class: "reflect-inspector-breakdown-name-cell",
                                                    span {
                                                        class: "reflect-inspector-swatch",
                                                        style: "background-color: {item.color};",
                                                    }
                                                    span {
                                                        class: "reflect-inspector-breakdown-name",
                                                        "{item.name}"
                                                    }
                                                }
                                                td {
                                                    class: "tabular-nums reflect-inspector-breakdown-amount",
                                                    "{store.format_money(item.amount)}"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[allow(clippy::too_many_arguments)]
#[component]
fn SpendingBreakdownView(
    filter_bar: FilterBarState,
    group_by_groups: bool,
    drilldown: Option<ReflectDrilldown>,
    breakdown: BreakdownComputation,
    inspector_open: bool,
    on_toggle_inspector: EventHandler<MouseEvent>,
    on_toggle_groups: EventHandler<bool>,
    on_drilldown_group: EventHandler<ReflectDrilldown>,
    on_clear_drilldown: EventHandler<MouseEvent>,
    on_open_activity: EventHandler<(String, Vec<String>)>,
    on_open_inflow_warning: EventHandler<MouseEvent>,
    on_export_csv: EventHandler<String>,
    on_filter: EventHandler<FilterAction>,
) -> Element {
    let store = use_context::<AppStore>();
    let mut hovered_id = use_signal(|| None::<String>);
    let mut inflows_collapsed = use_signal(|| false);

    let is_showing_groups = group_by_groups && drilldown.is_none();
    let donut_items = &breakdown.donut_items;
    let bar_items = &breakdown.bar_items;
    let metrics = &breakdown.metrics;
    let has_inflows = !breakdown.positive_inflows.is_empty();

    let active_hovered = hovered_id.read().clone();
    let hovered_item = active_hovered.as_ref().and_then(|hid| {
        donut_items
            .iter()
            .find(|i| &i.id == hid)
            .or_else(|| bar_items.iter().find(|i| &i.id == hid))
            .cloned()
    });

    type DonutArcLabel = (i64, i64, i64, bool);
    type DonutArcEntry = (ReflectSpendingRow, String, Option<DonutArcLabel>);
    let mut current_promille = 0i64;
    let mut arcs: Vec<DonutArcEntry> = Vec::new();
    for (idx, item) in donut_items.iter().enumerate() {
        let span = if idx + 1 == donut_items.len() {
            (1000 - current_promille).max(0)
        } else {
            item.percentage_tenths.clamp(2, 1000 - current_promille)
        };
        let end_p = (current_promille + span).min(1000);
        let d = build_donut_arc_path(240, 150, 105, 62, current_promille, end_p);
        let mid_p = current_promille + span / 2;
        let label_coords = if item.percentage_tenths >= 50 && span >= 35 {
            let (lx, ly) = circle_point_promille(240, 150, 126, mid_p);
            let right_side = mid_p <= 500;
            Some((lx, ly, mid_p, right_side))
        } else {
            None
        };
        arcs.push((item.clone(), d, label_coords));
        current_promille = end_p;
    }

    let items_for_export = bar_items.clone();
    let dd_title = drilldown
        .as_ref()
        .map(|d| d.group_name.clone())
        .unwrap_or_default();

    rsx! {
        div {
            class: "reflect-spending-breakdown",
            ReflectPageHeader {
                title: "Spending Breakdown",
                should_show_breadcrumbs: drilldown.is_some(),
                selected_group_name: dd_title,
                inspector_open: inspector_open,
                on_clear_group: on_clear_drilldown,
                on_toggle_inspector: on_toggle_inspector,
                on_export: move |_| {
                    let mut rows = vec![vec![
                        "Category".to_string(),
                        "Amount".to_string(),
                        "Percentage".to_string(),
                        "Transactions".to_string(),
                    ]];
                    for it in &items_for_export {
                        rows.push(vec![
                            it.name.clone(),
                            format_plain_decimal_milliunits(it.amount),
                            format_tenths_percent(it.percentage_tenths),
                            it.tx_count.to_string(),
                        ]);
                    }
                    on_export_csv.call(export_to_csv_string(&rows));
                },
            }

            ReflectFilterControls { state: filter_bar, on_action: on_filter }

            div {
                class: "spending-breakdown__content reflect-breakdown-content",

                div {
                    class: "spending-breakdown__column left reflect-breakdown-col-left",
                    div {
                        class: "spending-breakdown__donut-card card",
                        div {
                            class: "spending-breakdown__donut-header reflect-breakdown-donut-header",
                            div {
                                class: "spending-breakdown__total-spending",
                                span { class: "total-spending-title", "Total Spending" }
                                span {
                                    class: "total-spending-value tabular-nums",
                                    "{store.format_money(metrics.total_spending)}"
                                }
                            }

                            if drilldown.is_none() {
                                div {
                                    class: "segmented-control textOnlyOption spending-breakdown__category-group-toggle",
                                    role: "tablist",
                                    button {
                                        class: if !group_by_groups {
                                            "segmented-control-button spending-breakdown-category-group-toggle__button selected"
                                        } else {
                                            "segmented-control-button spending-breakdown-category-group-toggle__button"
                                        },
                                        r#type: "button",
                                        onclick: move |_| on_toggle_groups.call(false),
                                        "Categories"
                                    }
                                    button {
                                        class: if group_by_groups {
                                            "segmented-control-button spending-breakdown-category-group-toggle__button selected"
                                        } else {
                                            "segmented-control-button spending-breakdown-category-group-toggle__button"
                                        },
                                        r#type: "button",
                                        onclick: move |_| on_toggle_groups.call(true),
                                        "Groups"
                                    }
                                }
                            }
                        }

                        div {
                            class: "spending-breakdown-donut-chart",
                            div {
                                class: "spending-breakdown-donut-chart__title reflect-donut-title",
                                if let Some(hov) = hovered_item.clone() {
                                    span { title: "{hov.name}", "{hov.name}" }
                                    span {
                                        class: "spending-breakdown-donut-chart__title-amount tabular-nums",
                                        "{store.format_money(hov.amount)}"
                                    }
                                    div {
                                        class: "spending-breakdown-donut-chart__percentage reflect-donut-pct",
                                        "{format_whole_percent(hov.amount, metrics.total_spending)}"
                                    }
                                } else {
                                    span { "Total Spending" }
                                    span {
                                        class: "spending-breakdown-donut-chart__title-amount tabular-nums",
                                        "{store.format_money(metrics.total_spending)}"
                                    }
                                    if has_inflows {
                                        button {
                                            r#type: "button",
                                            class: "button primary is-icon-only reflect-inflow-info-trigger",
                                            title: "Understanding positive inflows in your spending",
                                            onclick: move |e| on_open_inflow_warning.call(e),
                                            Icon { name: "info_circle_fill", width: 14, height: 14 }
                                        }
                                    }
                                }
                            }

                            div {
                                class: "spending-breakdown-donut-chart__bb chart bb reflect-donut-bb",
                                svg {
                                    class: "bb-svg reflect-chart-svg",
                                    view_box: "0 0 480 300",
                                    g {
                                        class: "bb-chart",
                                        g {
                                            class: "bb-chart-arcs",
                                            if arcs.is_empty() {
                                                circle {
                                                    class: "reflect-donut-empty-ring",
                                                    cx: "240",
                                                    cy: "150",
                                                    r: "84",
                                                }
                                            } else {
                                                for (item, arc_d, label_opt) in arcs.iter() {
                                                    {
                                                        let item_hover = item.id.clone();
                                                        let item_click = item.clone();
                                                        let is_dimmed = active_hovered
                                                            .as_ref()
                                                            .is_some_and(|h| h != &item.id);
                                                        let pct_str = format_whole_percent(item.amount, metrics.total_spending);
                                                        let arc_group_cls = if is_dimmed {
                                                            "bb-chart-arc bb-target bb-defocused reflect-donut-arc-group is-dimmed"
                                                        } else {
                                                            "bb-chart-arc bb-target reflect-donut-arc-group"
                                                        };
                                                        let arc_path_cls = format!(
                                                            "bb-shapes bb-arcs reflect-donut-arc-path reflect-spend-color-{}",
                                                            item.color_idx
                                                        );
                                                        rsx! {
                                                            g {
                                                                key: "arc-{item.id}",
                                                                class: "{arc_group_cls}",
                                                                onmouseenter: move |_| hovered_id.set(Some(item_hover.clone())),
                                                                onmouseleave: move |_| hovered_id.set(None),
                                                                onclick: move |_| {
                                                                    if is_showing_groups && item_click.can_drill_down && item_click.id != OTHER_CATEGORIES_ID {
                                                                        on_drilldown_group.call(ReflectDrilldown {
                                                                            group_id: item_click.id.clone(),
                                                                            group_name: item_click.name.clone(),
                                                                        });
                                                                    } else {
                                                                        on_open_activity.call((item_click.name.clone(), item_click.tx_ids.clone()));
                                                                    }
                                                                },
                                                                path {
                                                                    class: "{arc_path_cls}",
                                                                    d: "{arc_d}",
                                                                    fill: "{item.color}",
                                                                }
                                                                if let Some((lx, ly, mid_p, right_side)) = *label_opt {
                                                                    {
                                                                        let (ax, ay) = circle_point_promille(240, 150, 107, mid_p);
                                                                        let tx_x = if right_side { lx + 8 } else { lx - 8 };
                                                                        let anchor = if right_side { "start" } else { "end" };
                                                                        let short_name = if item.name.chars().count() > 14 {
                                                                            let s: String = item.name.chars().take(12).collect();
                                                                            format!("{s}...")
                                                                        } else {
                                                                            item.name.clone()
                                                                        };
                                                                        rsx! {
                                                                            polyline {
                                                                                class: "bb-arc-label-line reflect-donut-label-line",
                                                                                points: "{ax},{ay} {lx},{ly} {tx_x},{ly}",
                                                                            }
                                                                            text {
                                                                                class: "reflect-donut-label-text",
                                                                                x: "{tx_x}",
                                                                                y: "{ly - 2}",
                                                                                text_anchor: "{anchor}",
                                                                                "{short_name} ({pct_str})"
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if bar_items.is_empty() {
                            div {
                                class: "spending-breakdown__empty-state-info",
                                "Your spending breakdown will appear once you start recording your spending."
                            }
                        }
                    }

                    div {
                        class: "spending-breakdown__metrics reflect-breakdown-metrics",
                        div {
                            class: "spending-breakdown__metrics-row",
                            div {
                                class: "spending-breakdown__metric monthly-average-spending",
                                span { class: "spending-metric-title", "Average Monthly Spending" }
                                span {
                                    class: "spending-metric-value tabular-nums",
                                    "{store.format_money(metrics.average_monthly_spending)}"
                                }
                            }
                            div {
                                class: "spending-breakdown__metric daily-average-spending",
                                span { class: "spending-metric-title", "Average Daily Spending" }
                                span {
                                    class: "spending-metric-value tabular-nums",
                                    "{store.format_money(metrics.average_daily_spending)}"
                                }
                            }
                        }
                        div {
                            class: "spending-breakdown__metrics-row",
                            div {
                                class: "spending-breakdown__metric most-frequent-category",
                                span {
                                    class: "spending-metric-title",
                                    if is_showing_groups { "Most Frequent Group" } else { "Most Frequent Category" }
                                }
                                span {
                                    class: "spending-metric-value",
                                    "{metrics.most_frequent_bucket_name}"
                                }
                                if metrics.most_frequent_bucket_count > 0 {
                                    span {
                                        class: "spending-metric-subtitle",
                                        "{metrics.most_frequent_bucket_count} transactions"
                                    }
                                }
                            }
                            div {
                                class: "spending-breakdown__metric largest-outflow",
                                span { class: "spending-metric-title", "Largest Outflow" }
                                span {
                                    class: "spending-metric-value",
                                    "{metrics.largest_outflow_payee}"
                                }
                                if metrics.largest_outflow_amount > 0 {
                                    span {
                                        class: "spending-metric-subtitle tabular-nums",
                                        "{store.format_money(metrics.largest_outflow_amount)}"
                                    }
                                }
                            }
                        }
                    }
                }

                div {
                    class: "spending-breakdown__column right reflect-breakdown-col-right",
                    div {
                        class: "spending-breakdown__bar-card card",
                        div {
                            class: "spending-breakdown-bar-chart-header spending-breakdown-bar-chart-row",
                            div {
                                class: "spending-breakdown-bar-chart-section",
                                span { if is_showing_groups { "Groups" } else { "Categories" } }
                                span { "Total Spending" }
                            }
                        }
                        div {
                            class: "spending-breakdown-bar-chart-body card-body",
                            if bar_items.is_empty() {
                                div {
                                    class: "reflect-spending-empty-table-state",
                                    span { "No spending to show yet" }
                                }
                            } else {
                                for item in bar_items.iter() {
                                    {
                                        let hover_key = item.id.clone();
                                        let click_item = item.clone();
                                        let is_active = active_hovered.as_deref() == Some(item.id.as_str());
                                        let pct_text = format_whole_percent(item.amount, metrics.total_spending);
                                        let bar_width = format_tenths_percent(item.percentage_tenths);
                                        rsx! {
                                            button {
                                                key: "bar-{item.id}",
                                                r#type: "button",
                                                class: if is_active {
                                                    "reflect-bar-chart-row ghost-button spending-breakdown-bar-chart-row reflect-bar-row-btn active"
                                                } else {
                                                    "reflect-bar-chart-row ghost-button spending-breakdown-bar-chart-row reflect-bar-row-btn"
                                                },
                                                onmouseenter: move |_| hovered_id.set(Some(hover_key.clone())),
                                                onmouseleave: move |_| hovered_id.set(None),
                                                onclick: move |_| {
                                                    if is_showing_groups && click_item.can_drill_down {
                                                        on_drilldown_group.call(ReflectDrilldown {
                                                            group_id: click_item.id.clone(),
                                                            group_name: click_item.name.clone(),
                                                        });
                                                    } else {
                                                        on_open_activity.call((click_item.name.clone(), click_item.tx_ids.clone()));
                                                    }
                                                },
                                                div {
                                                    class: "spending-breakdown-bar-chart-section",
                                                    span {
                                                        "{item.name}"
                                                        if item.is_hidden {
                                                            " "
                                                            Icon { name: "eye_slash", width: 12, height: 12 }
                                                        }
                                                    }
                                                    span {
                                                        class: "amount tabular-nums",
                                                        "{store.format_money(item.amount)}"
                                                    }
                                                }
                                                div {
                                                    class: "spending-breakdown-bar-chart-section bar-section",
                                                    div {
                                                        class: "spending-breakdown-bar-chart-bar",
                                                        style: "width: {bar_width}; background-color: {item.color};",
                                                    }
                                                    span { "{pct_text}" }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        div {
                            class: if bar_items.len() <= 10 {
                                "reflect-card-gradient hidden"
                            } else {
                                "reflect-card-gradient"
                            },
                        }
                    }

                    if has_inflows {
                        div {
                            class: "positive-inflows no-scroll",
                            div {
                                class: if *inflows_collapsed.read() {
                                    "card spending-breakdown__positive-inflows is-collapsed"
                                } else {
                                    "card spending-breakdown__positive-inflows"
                                },
                                div {
                                    class: "spending-breakdown__positive-inflows_header reflect-inflows-header-btn",
                                    onclick: move |_| {
                                        let cur = *inflows_collapsed.read();
                                        inflows_collapsed.set(!cur);
                                    },
                                    div {
                                        class: "spending-breakdown__positive-inflows_title",
                                        span {
                                            if is_showing_groups {
                                                "Positive Inflow Groups"
                                            } else {
                                                "Positive Inflow Categories"
                                            }
                                        }
                                        Icon { name: "info_circle_fill", width: 12, height: 12 }
                                    }
                                    div {
                                        class: "spending-breakdown__positive-inflows_total tabular-nums",
                                        "+{store.format_money(metrics.total_positive_inflows)}"
                                    }
                                }
                                if !*inflows_collapsed.read() {
                                    div {
                                        class: "card-body",
                                        for inflow in breakdown.positive_inflows.iter() {
                                            {
                                                let inf_click = inflow.clone();
                                                rsx! {
                                                    button {
                                                        key: "inflow-{inflow.id}",
                                                        r#type: "button",
                                                        class: "reflect-bar-chart-row ghost-button spending-breakdown__positive-inflows_row reflect-inflow-row-btn",
                                                        onclick: move |_| {
                                                            on_open_activity.call((inf_click.name.clone(), inf_click.tx_ids.clone()));
                                                        },
                                                        div {
                                                            class: "spending-breakdown__positive-inflows_name",
                                                            span { "{inflow.name}" }
                                                        }
                                                        div {
                                                            class: "spending-breakdown__positive-inflows_amount tabular-nums",
                                                            "+{store.format_money(inflow.amount)}"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[allow(clippy::too_many_arguments)]
#[component]
fn SpendingTrendsView(
    filter_bar: FilterBarState,
    timeframe: TimeframeState,
    transactions: Vec<AnalyticsTransaction>,
    drilldown: Option<ReflectDrilldown>,
    currency_symbol: String,
    inspector_open: bool,
    on_toggle_inspector: EventHandler<MouseEvent>,
    on_drilldown_group: EventHandler<ReflectDrilldown>,
    on_clear_drilldown: EventHandler<MouseEvent>,
    on_open_activity: EventHandler<(String, Vec<String>)>,
    on_export_csv: EventHandler<String>,
    on_filter: EventHandler<FilterAction>,
) -> Element {
    let store = use_context::<AppStore>();
    let mut hovered_info = use_signal(|| None::<TrendsTooltipState>);

    let is_top_level = drilldown.is_none();
    let (columns, total_spending, avg_monthly) =
        compute_spending_trends_series(&transactions, &timeframe, drilldown.as_ref());

    let raw_max = columns
        .iter()
        .map(|c| c.total_spending)
        .max()
        .unwrap_or(0)
        .max(avg_monthly);
    let step = compute_nice_step(raw_max.max(100_000), 4);
    let y_max = (step * 4).max(1);

    let chart_left = 68i64;
    let chart_right = 630i64;
    let chart_top = 20i64;
    let chart_bottom = 200i64;
    let chart_h = chart_bottom - chart_top;
    let col_count = columns.len().max(1) as i64;
    let slot_w = (chart_right - chart_left) / col_count;
    let label_step = columns.len().div_ceil(12).max(1);

    let mut trend_pts: Vec<(i64, i64)> = Vec::with_capacity(columns.len());
    for (idx, col) in columns.iter().enumerate() {
        let cx = chart_left + (idx as i64) * slot_w + slot_w / 2;
        let cy = chart_bottom - (col.total_spending * chart_h) / y_max;
        trend_pts.push((cx, cy));
    }
    let trend_bezier = build_catmull_rom_bezier_path(&trend_pts, chart_top, chart_bottom);
    let avg_y = chart_bottom - (avg_monthly * chart_h) / y_max;

    let cols_for_export = columns.clone();
    let dd_name = drilldown
        .as_ref()
        .map(|d| d.group_name.clone())
        .unwrap_or_default();

    rsx! {
        div {
            class: "reflect-spending-trends",
            ReflectPageHeader {
                title: "Spending Trends",
                should_show_breadcrumbs: !is_top_level,
                selected_group_name: dd_name,
                inspector_open: inspector_open,
                on_clear_group: on_clear_drilldown,
                on_toggle_inspector: on_toggle_inspector,
                on_export: move |_| {
                    let mut rows = vec![vec![
                        "Month".to_string(),
                        "Total Spending".to_string(),
                        "Compared to Average".to_string(),
                    ]];
                    for col in &cols_for_export {
                        rows.push(vec![
                            col.label.clone(),
                            format_plain_decimal_milliunits(col.total_spending),
                            format_plain_decimal_milliunits(col.total_spending - avg_monthly),
                        ]);
                    }
                    on_export_csv.call(export_to_csv_string(&rows));
                },
            }

            ReflectFilterControls { state: filter_bar, on_action: on_filter }

            div {
                class: "reflect-spending-trends__chart-card card reflect-chart-card",
                div {
                    class: "spending-trends__chart-header",
                    div {
                        class: "reflect-trends-header-metrics",
                        div {
                            class: "spending-trends__average-monthly-spending",
                            span { class: "average-monthly-spending-title", "Average Monthly Spending" }
                            span {
                                class: "average-monthly-spending-value",
                                span {
                                    class: "user-data currency tabular-nums",
                                    "{store.format_money(avg_monthly)}"
                                }
                            }
                        }
                        div {
                            class: "spending-trends__total-spending",
                            span { class: "total-spending-title", "Total Spending" }
                            span {
                                class: "total-spending-value",
                                span {
                                    class: "user-data currency tabular-nums",
                                    "{store.format_money(total_spending)}"
                                }
                            }
                        }
                    }
                }

                div {
                    class: "reports-spending-trends chart-container reflect-chart-container",
                    div {
                        class: "chart bb",
                        svg {
                            class: "bb-svg reflect-chart-svg",
                            view_box: "0 0 650 240",
                            g {
                                class: "bb-chart",
                                g {
                                    class: "bb-ygrid-lines",
                                    for tick_idx in 0..=4i64 {
                                        {
                                            let val = tick_idx * step;
                                            let y = chart_bottom - (val * chart_h) / y_max;
                                            let lbl = format_compact_axis_money(val, &currency_symbol);
                                            rsx! {
                                                g {
                                                    key: "ygrid-{tick_idx}",
                                                    class: "bb-ygrid-line tick",
                                                    line {
                                                        class: if tick_idx == 0 { "reflect-chart-zero-line" } else { "reflect-chart-gridline" },
                                                        x1: "{chart_left}",
                                                        y1: "{y}",
                                                        x2: "{chart_right}",
                                                        y2: "{y}",
                                                    }
                                                    text {
                                                        class: "reflect-chart-axis-text",
                                                        x: "{chart_left - 8}",
                                                        y: "{y + 4}",
                                                        text_anchor: "end",
                                                        "{lbl}"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                if avg_monthly > 0 {
                                    g {
                                        line {
                                            class: "reflect-chart-avg-line",
                                            x1: "{chart_left}",
                                            y1: "{avg_y}",
                                            x2: "{chart_right}",
                                            y2: "{avg_y}",
                                        }
                                        text {
                                            class: "reflect-chart-avg-label",
                                            x: "{chart_right - 4}",
                                            y: "{avg_y - 5}",
                                            text_anchor: "end",
                                            "Avg"
                                        }
                                    }
                                }

                                g {
                                    class: "bb-chart-bars",
                                    for (idx, col) in columns.iter().enumerate() {
                                        {
                                            let bar_w = (slot_w * 55 / 100).clamp(14, 52);
                                            let cx = chart_left + (idx as i64) * slot_w + slot_w / 2;
                                            let bx = cx - bar_w / 2;
                                            let mut acc_h = 0i64;
                                            let total_h = (col.total_spending * chart_h) / y_max;
                                            let mut seg_rects = Vec::new();
                                            for (seg_idx, (def, amt, seg_txs)) in col.segments.iter().enumerate() {
                                                let seg_h = if seg_idx + 1 == col.segments.len() {
                                                    (total_h - acc_h).max(1)
                                                } else {
                                                    ((*amt * chart_h) / y_max).clamp(1, (total_h - acc_h).max(1))
                                                };
                                                let seg_y = (chart_bottom - acc_h - seg_h).max(chart_top);
                                                acc_h += seg_h;
                                                seg_rects.push((def.clone(), *amt, seg_txs.clone(), seg_y, seg_h));
                                            }
                                            let m_lbl = col.label.clone();
                                            let m_lbl_txt = col.label.clone();
                                            let m_total = col.total_spending;
                                            let m_txs = col.all_tx_ids.clone();
                                            let show_x_label = idx % label_step == 0 || idx + 1 == columns.len();
                                            rsx! {
                                                g {
                                                    key: "trend-col-{col.ym}",
                                                    for (def, amt, seg_txs, sy, sh) in seg_rects {
                                                        {
                                                            let hov_m = m_lbl.clone();
                                                            let hov_s = def.name.clone();
                                                            let hov_color = def.color.clone();
                                                            let pct_s = format_whole_percent(amt, m_total);
                                                            let click_def = def.clone();
                                                            let click_title = format!("{m_lbl} - {}", def.name);
                                                            let click_txs = seg_txs;
                                                            rsx! {
                                                                rect {
                                                                    key: "seg-{col.ym}-{def.id}",
                                                                    class: "bb-shape bb-bar reflect-chart-bar",
                                                                    x: "{bx}",
                                                                    y: "{sy}",
                                                                    width: "{bar_w}",
                                                                    height: "{sh}",
                                                                    fill: "{def.color}",
                                                                    onmouseenter: move |_| hovered_info.set(Some(TrendsTooltipState {
                                                                        cx,
                                                                        cy: sy,
                                                                        month_label: hov_m.clone(),
                                                                        series_name: hov_s.clone(),
                                                                        color: hov_color.clone(),
                                                                        amount: amt,
                                                                        pct: pct_s.clone(),
                                                                    })),
                                                                    onmouseleave: move |_| hovered_info.set(None),
                                                                    onclick: move |_| {
                                                                        if is_top_level && click_def.can_drill_down && click_def.id != OTHER_CATEGORIES_ID {
                                                                            on_drilldown_group.call(ReflectDrilldown {
                                                                                group_id: click_def.id.clone(),
                                                                                group_name: click_def.name.clone(),
                                                                            });
                                                                        } else {
                                                                            on_open_activity.call((click_title.clone(), click_txs.clone()));
                                                                        }
                                                                    },
                                                                }
                                                            }
                                                        }
                                                    }
                                                    if show_x_label {
                                                        text {
                                                            class: "reflect-chart-axis-text reflect-chart-axis-link",
                                                            x: "{cx}",
                                                            y: "222",
                                                            text_anchor: "middle",
                                                            onclick: move |_| on_open_activity.call((m_lbl_txt.clone(), m_txs.clone())),
                                                            "{col.label}"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                if columns.len() > 1 {
                                    g {
                                        class: "bb-chart-lines",
                                        path {
                                            class: "bb-line bb-line-lineChart reflect-chart-trend-line",
                                            d: "{trend_bezier}",
                                        }
                                    }
                                }
                                for (idx, col) in columns.iter().enumerate() {
                                    {
                                        let cx = chart_left + (idx as i64) * slot_w + slot_w / 2;
                                        let cy = chart_bottom - (col.total_spending * chart_h) / y_max;
                                        let m_lbl = col.label.clone();
                                        let m_click_lbl = col.label.clone();
                                        let m_amt = col.total_spending;
                                        let m_txs = col.all_tx_ids.clone();
                                        rsx! {
                                            circle {
                                                key: "dot-{col.ym}",
                                                class: "bb-shape bb-circle reflect-chart-dot",
                                                cx: "{cx}",
                                                cy: "{cy}",
                                                r: "4",
                                                onmouseenter: move |_| hovered_info.set(Some(TrendsTooltipState {
                                                    cx,
                                                    cy,
                                                    month_label: m_lbl.clone(),
                                                    series_name: "Total Spending".to_string(),
                                                    color: "var(--labelPrimary)".to_string(),
                                                    amount: m_amt,
                                                    pct: "100%".to_string(),
                                                })),
                                                onmouseleave: move |_| hovered_info.set(None),
                                                onclick: move |_| on_open_activity.call((m_click_lbl.clone(), m_txs.clone())),
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if let Some(tip) = hovered_info.read().clone() {
                        {
                            let tip_x = ((tip.cx * 100) / 650).clamp(14, 86);
                            let tip_y = ((tip.cy * 100) / 240).clamp(18, 86);
                            rsx! {
                                div {
                                    class: "bb-tooltip-container reflect-chart-tooltip-container",
                                    style: "left: {tip_x}%; top: {tip_y}%;",
                                    div {
                                        class: "bb-tooltip reflect-bb-tooltip reflect-spending-tooltip",
                                        h4 {
                                            span { class: "user-entered-text", "{tip.month_label}" }
                                        }
                                        div {
                                            class: "reflect-tooltip-row",
                                            span {
                                                class: "reflect-tooltip-series",
                                                span {
                                                    class: "reflect-tooltip-dot",
                                                    style: "background-color: {tip.color};",
                                                }
                                                "{tip.series_name}"
                                            }
                                            strong { class: "tabular-nums", "{store.format_money(tip.amount)}" }
                                        }
                                        em { "{tip.pct} of month" }
                                        div { class: "tooltip-arrow" }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            div {
                class: "spending-trends__table-card card",
                div {
                    class: "spending-breakdown-bar-chart",
                    div {
                        class: "spending-trends-table-header spending-trends-table-row",
                        div {
                            class: "spending-trends-table-section spending-trends-table-first-section",
                            span { "Month" }
                        }
                        div {
                            class: "spending-trends-table-section spending-trends-table-second-section",
                            span { "Total Spending" }
                        }
                        div {
                            class: "spending-trends-table-section spending-trends-table-third-section",
                            span { "Compared to Average" }
                            Icon { name: "info_circle_fill", class: "spending-trends-info-circle", width: 14, height: 14 }
                        }
                    }

                    div {
                        class: "spending-trends-table-body card-body",
                        if columns.is_empty() {
                            div {
                                class: "reflect-spending-empty-table-state",
                                span { "No spending to show yet" }
                            }
                        } else {
                            for col in columns.iter().rev() {
                                {
                                    let diff = col.total_spending - avg_monthly;
                                    let diff_pct = compute_tenths_percent(diff, avg_monthly);
                                    let click_lbl = col.label.clone();
                                    let click_txs = col.all_tx_ids.clone();
                                    rsx! {
                                        button {
                                            key: "trow-{col.ym}",
                                            r#type: "button",
                                            class: "reflect-bar-chart-row ghost-button spending-trends-bar-chart-row spending-trends-table-row reflect-trends-table-row-btn",
                                            onclick: move |_| on_open_activity.call((click_lbl.clone(), click_txs.clone())),
                                            div {
                                                class: "spending-trends-table-section spending-trends-table-first-section",
                                                span { "{col.label}" }
                                            }
                                            div {
                                                class: "spending-trends-table-section spending-trends-table-second-section",
                                                span { class: "amount tabular-nums", "{store.format_money(col.total_spending)}" }
                                            }
                                            div {
                                                class: "spending-trends-table-section spending-trends-table-third-section tabular-nums",
                                                if diff == 0 {
                                                    span { class: "static-net-worth", "-" }
                                                } else if diff < 0 {
                                                    span {
                                                        class: "reflect-trend-decrease",
                                                        Icon { name: "arrow_down", width: 10, height: 10 }
                                                        "-{store.format_money(diff.abs())} ({format_tenths_percent(diff_pct)})"
                                                    }
                                                } else {
                                                    span {
                                                        class: "reflect-trend-increase",
                                                        Icon { name: "arrow_up", width: 10, height: 10 }
                                                        "+{store.format_money(diff)} ({format_tenths_percent(diff_pct)})"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[allow(clippy::too_many_arguments)]
#[component]
fn NetWorthView(
    filter_bar: FilterBarState,
    history: Vec<NetWorthMonthPoint>,
    currency_symbol: String,
    inspector_open: bool,
    on_toggle_inspector: EventHandler<MouseEvent>,
    on_share_progress: EventHandler<MouseEvent>,
    on_open_month_activity: EventHandler<(String, String)>,
    on_export_csv: EventHandler<String>,
    on_filter: EventHandler<FilterAction>,
) -> Element {
    let store = use_context::<AppStore>();
    let mut hovered_pt = use_signal(|| None::<NetWorthHoverState>);

    let latest = history.last();
    let first = history.first();
    let curr_nw = latest.map(|p| p.net_worth).unwrap_or(0);
    let curr_assets = latest.map(|p| p.assets).unwrap_or(0);
    let curr_debts = latest.map(|p| p.debts).unwrap_or(0);
    let debts_display = if curr_debts == 0 {
        store.format_money(0)
    } else {
        format!("-{}", store.format_money(curr_debts))
    };

    let (period_change, base_nw) = match (first, latest) {
        (Some(f), Some(l)) if history.len() > 1 => (l.net_worth - f.net_worth, f.net_worth),
        (Some(l), _) => (l.change, l.net_worth - l.change),
        _ => (0, 0),
    };
    let period_pct_tenths = compute_tenths_percent(period_change, base_nw);

    let max_val = history
        .iter()
        .map(|p| p.assets.max(p.debts).max(p.net_worth))
        .max()
        .unwrap_or(0);
    let min_val = history
        .iter()
        .map(|p| p.net_worth.min(0))
        .min()
        .unwrap_or(0);
    let raw_span = (max_val - min_val).max(100_000);
    let step = compute_nice_step(raw_span, 4);
    let axis_min = if min_val < 0 {
        -((min_val.abs() + step - 1) / step) * step
    } else {
        0
    };
    let axis_max = (axis_min + step * 4).max(max_val).max(axis_min + 1);
    let axis_span = (axis_max - axis_min).max(1);

    let chart_left = 68i64;
    let chart_right = 630i64;
    let chart_top = 20i64;
    let chart_bottom = 200i64;
    let chart_h = chart_bottom - chart_top;
    let zero_y = chart_bottom - ((0 - axis_min) * chart_h) / axis_span;
    let count = history.len().max(1) as i64;
    let slot_w = (chart_right - chart_left) / count;
    let label_step = history.len().div_ceil(12).max(1);

    let mut nw_pts: Vec<(i64, i64)> = Vec::with_capacity(history.len());
    for (idx, pt) in history.iter().enumerate() {
        let cx = chart_left + (idx as i64) * slot_w + slot_w / 2;
        let cy = chart_bottom - ((pt.net_worth - axis_min) * chart_h) / axis_span;
        nw_pts.push((cx, cy));
    }
    let nw_bezier = build_catmull_rom_bezier_path(&nw_pts, chart_top, chart_bottom);

    let history_for_export = history.clone();

    rsx! {
        div {
            class: "reflect-net-worth",
            ReflectPageHeader {
                title: "Net Worth",
                should_show_breadcrumbs: false,
                selected_group_name: String::new(),
                inspector_open: inspector_open,
                on_clear_group: move |_| {},
                on_toggle_inspector: on_toggle_inspector,
                on_share_progress: Some(on_share_progress),
                on_export: move |_| {
                    let mut rows = vec![vec![
                        "Month".to_string(),
                        "Assets".to_string(),
                        "Debts".to_string(),
                        "Net Worth".to_string(),
                        "Monthly Change".to_string(),
                    ]];
                    for pt in &history_for_export {
                        rows.push(vec![
                            pt.month.clone(),
                            format_plain_decimal_milliunits(pt.assets),
                            format_plain_decimal_milliunits(pt.debts),
                            format_plain_decimal_milliunits(pt.net_worth),
                            format_plain_decimal_milliunits(pt.change),
                        ]);
                    }
                    on_export_csv.call(export_to_csv_string(&rows));
                },
            }

            ReflectFilterControls { state: filter_bar, on_action: on_filter }

            div {
                class: "reflect-net-worth__chart-card card reflect-chart-card",
                div {
                    class: "reflect-net-worth__net-worth",
                    span { class: "net-worth-title", "Net Worth" }
                    span {
                        class: "net-worth-value",
                        span {
                            class: "user-data currency tabular-nums",
                            "{store.format_money(curr_nw)}"
                        }
                    }
                }

                div {
                    class: "reflect-net-worth-summary reflect-nw-summary",
                    div {
                        span {
                            class: "summary-titles",
                            span { class: "rounded-square rounded-square-assets" }
                            "Assets"
                        }
                        div {
                            class: "networth-summary-value tabular-nums",
                            "{store.format_money(curr_assets)}"
                        }
                    }
                    div {
                        span {
                            class: "summary-titles",
                            span { class: "rounded-square rounded-square-debts" }
                            "Debts"
                        }
                        div {
                            class: "networth-summary-value tabular-nums",
                            "{debts_display}"
                        }
                    }
                    div {
                        span { class: "summary-titles", "Change in Net Worth" }
                        div {
                            class: "networth-summary-value tabular-nums reflect-nw-change-wrap",
                            span { "{store.format_money(period_change)}" }
                            if period_change != 0 {
                                span {
                                    class: if period_change >= 0 {
                                        "positive-net-worth reflect-nw-change-badge"
                                    } else {
                                        "negative-net-worth reflect-nw-change-badge"
                                    },
                                    Icon {
                                        name: if period_change >= 0 { "arrow_up" } else { "arrow_down" },
                                        width: 10,
                                        height: 10,
                                    }
                                    "{format_tenths_percent(period_pct_tenths)}"
                                }
                            }
                        }
                    }
                }

                div {
                    class: "reports-net-worth chart-container reflect-chart-container",
                    div {
                        class: "chart bb",
                        svg {
                            class: "bb-svg reflect-chart-svg",
                            view_box: "0 0 650 240",
                            g {
                                class: "bb-chart",
                                g {
                                    class: "bb-grid-lines",
                                    for tick_idx in 0..=4i64 {
                                        {
                                            let val = axis_min + tick_idx * (axis_span / 4);
                                            let y = chart_bottom - ((val - axis_min) * chart_h) / axis_span;
                                            let lbl = format_compact_axis_money(val, &currency_symbol);
                                            rsx! {
                                                g {
                                                    key: "nw-y-{tick_idx}",
                                                    class: "tick",
                                                    line {
                                                        class: "reflect-chart-gridline",
                                                        x1: "{chart_left}",
                                                        y1: "{y}",
                                                        x2: "{chart_right}",
                                                        y2: "{y}",
                                                    }
                                                    text {
                                                        class: "reflect-chart-axis-text",
                                                        x: "{chart_left - 8}",
                                                        y: "{y + 4}",
                                                        text_anchor: "end",
                                                        "{lbl}"
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                line {
                                    class: "reflect-chart-zero-line",
                                    x1: "{chart_left}",
                                    y1: "{zero_y}",
                                    x2: "{chart_right}",
                                    y2: "{zero_y}",
                                }
                                g {
                                    class: "bb-chart-bars",
                                    for (idx, pt) in history.iter().enumerate() {
                                        {
                                            let bar_w = (slot_w / 4).clamp(10, 28);
                                            let center_x = chart_left + (idx as i64) * slot_w + slot_w / 2;
                                            let cy = chart_bottom - ((pt.net_worth - axis_min) * chart_h) / axis_span;
                                            let debt_y = chart_bottom - ((pt.debts - axis_min) * chart_h) / axis_span;
                                            let asset_y = chart_bottom - ((pt.assets - axis_min) * chart_h) / axis_span;
                                            let debt_h = if pt.debts > 0 { (zero_y - debt_y).max(2) } else { 0 };
                                            let asset_h = if pt.assets > 0 { (zero_y - asset_y).max(2) } else { 0 };
                                            let pt_hov = pt.clone();
                                            let m_click = pt.month.clone();
                                            let ym_click = pt.date_key.get(..7).unwrap_or(&pt.date_key).to_string();
                                            let show_x_label = idx % label_step == 0 || idx + 1 == history.len();
                                            rsx! {
                                                g {
                                                    key: "nw-bar-{pt.date_key}",
                                                    onmouseenter: move |_| hovered_pt.set(Some(NetWorthHoverState {
                                                        cx: center_x,
                                                        cy,
                                                        point: pt_hov.clone(),
                                                    })),
                                                    onmouseleave: move |_| hovered_pt.set(None),
                                                    onclick: move |_| on_open_month_activity.call((m_click.clone(), ym_click.clone())),
                                                    rect {
                                                        class: "reflect-chart-hit-target",
                                                        x: "{chart_left + (idx as i64) * slot_w}",
                                                        y: "{chart_top}",
                                                        width: "{slot_w}",
                                                        height: "{chart_h}",
                                                    }
                                                    if debt_h > 0 {
                                                        rect {
                                                            class: "bb-shape bb-bar reflect-nw-bar-debt",
                                                            x: "{center_x - bar_w - 2}",
                                                            y: "{zero_y - debt_h}",
                                                            width: "{bar_w}",
                                                            height: "{debt_h}",
                                                            rx: "2",
                                                        }
                                                    }
                                                    if asset_h > 0 {
                                                        rect {
                                                            class: "bb-shape bb-bar reflect-nw-bar-asset",
                                                            x: "{center_x + 2}",
                                                            y: "{zero_y - asset_h}",
                                                            width: "{bar_w}",
                                                            height: "{asset_h}",
                                                            rx: "2",
                                                        }
                                                    }
                                                    if show_x_label {
                                                        text {
                                                            class: "reflect-chart-axis-text reflect-chart-axis-link",
                                                            x: "{center_x}",
                                                            y: "222",
                                                            text_anchor: "middle",
                                                            "{pt.month}"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                if history.len() > 1 {
                                    g {
                                        class: "bb-chart-lines",
                                        path {
                                            class: "bb-line bb-line-networth reflect-chart-trend-line",
                                            d: "{nw_bezier}",
                                        }
                                    }
                                }
                                for (idx, pt) in history.iter().enumerate() {
                                    {
                                        let center_x = chart_left + (idx as i64) * slot_w + slot_w / 2;
                                        let cy = chart_bottom - ((pt.net_worth - axis_min) * chart_h) / axis_span;
                                        let pt_hov = pt.clone();
                                        let m_click = pt.month.clone();
                                        let ym_click = pt.date_key.get(..7).unwrap_or(&pt.date_key).to_string();
                                        rsx! {
                                            circle {
                                                key: "nw-dot-{pt.date_key}",
                                                class: "bb-shape bb-circle reflect-nw-dot",
                                                cx: "{center_x}",
                                                cy: "{cy}",
                                                r: "4",
                                                onmouseenter: move |_| hovered_pt.set(Some(NetWorthHoverState {
                                                    cx: center_x,
                                                    cy,
                                                    point: pt_hov.clone(),
                                                })),
                                                onmouseleave: move |_| hovered_pt.set(None),
                                                onclick: move |_| on_open_month_activity.call((m_click.clone(), ym_click.clone())),
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if let Some(hp) = hovered_pt.read().clone() {
                        {
                            let tip_x = ((hp.cx * 100) / 650).clamp(16, 84);
                            let tip_y = ((hp.cy * 100) / 240).clamp(20, 86);
                            let pt = &hp.point;
                            let tip_debts = if pt.debts == 0 {
                                store.format_money(0)
                            } else {
                                format!("-{}", store.format_money(pt.debts))
                            };
                            rsx! {
                                div {
                                    class: "bb-tooltip-container reflect-chart-tooltip-container",
                                    style: "left: {tip_x}%; top: {tip_y}%;",
                                    div {
                                        class: "bb-tooltip reflect-bb-tooltip reflect-spending-tooltip reports-net-worth-tooltip",
                                        h4 { "{pt.month}" }
                                        div {
                                            class: "reflect-tooltip-row",
                                            span { class: "reflect-tooltip-series", "Net Worth" }
                                            strong { class: "tabular-nums", "{store.format_money(pt.net_worth)}" }
                                        }
                                        div {
                                            class: "reflect-tooltip-row",
                                            span {
                                                class: "reflect-tooltip-series",
                                                span { class: "circle circle-assets" }
                                                "Assets"
                                            }
                                            strong { class: "tabular-nums", "{store.format_money(pt.assets)}" }
                                        }
                                        div {
                                            class: "reflect-tooltip-row",
                                            span {
                                                class: "reflect-tooltip-series",
                                                span { class: "circle circle-debts" }
                                                "Debts"
                                            }
                                            strong { class: "tabular-nums", "{tip_debts}" }
                                        }
                                        div { class: "tooltip-arrow" }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            div {
                class: "reflect-networth-monthly-table reflect-nw-table-wrap",
                div {
                    class: "networth__table-card card",
                    div {
                        class: "networth-table-header networth-table-row",
                        div {
                            class: "networth-table-section networth-table-first-section",
                            span { "Month" }
                        }
                        div {
                            class: "networth-table-section networth-table-second-section reflect-nw-col-num",
                            span { "Debts" }
                        }
                        div {
                            class: "networth-table-section networth-table-second-section reflect-nw-col-num",
                            span { "Assets" }
                        }
                        div {
                            class: "networth-table-section networth-table-second-section reflect-nw-col-num",
                            span { "Net Worth" }
                        }
                        div {
                            class: "networth-table-section networth-table-third-section",
                            span { "Monthly Change" }
                            Icon { name: "info_circle_fill", class: "networth-info-circle", width: 14, height: 14 }
                        }
                    }

                    div {
                        class: "networth-table-body card-body",
                        if history.is_empty() {
                            div {
                                class: "reflect-net-worth-empty-table-state",
                                span { "No information to show" }
                            }
                        } else {
                            for pt in history.iter().rev() {
                                {
                                    let prev_nw = pt.net_worth - pt.change;
                                    let pct_t = compute_tenths_percent(pt.change, prev_nw);
                                    let m_click = pt.month.clone();
                                    let ym_click = pt.date_key.get(..7).unwrap_or(&pt.date_key).to_string();
                                    let row_debts = if pt.debts == 0 {
                                        store.format_money(0)
                                    } else {
                                        format!("-{}", store.format_money(pt.debts))
                                    };
                                    rsx! {
                                        button {
                                            key: "nw-row-{pt.date_key}",
                                            r#type: "button",
                                            class: "reflect-bar-chart-row ghost-button net-worth-bar-chart-row networth-table-row reflect-nw-row-btn",
                                            onclick: move |_| on_open_month_activity.call((m_click.clone(), ym_click.clone())),
                                            div {
                                                class: "networth-table-section networth-table-first-section",
                                                span { class: "amount", "{pt.month}" }
                                            }
                                            div {
                                                class: "networth-table-section networth-table-second-section reflect-nw-col-num",
                                                span { class: "amount tabular-nums", "{row_debts}" }
                                            }
                                            div {
                                                class: "networth-table-section networth-table-second-section reflect-nw-col-num",
                                                span { class: "amount tabular-nums", "{store.format_money(pt.assets)}" }
                                            }
                                            div {
                                                class: "networth-table-section networth-table-second-section reflect-nw-col-num",
                                                span { class: "amount tabular-nums", "{store.format_money(pt.net_worth)}" }
                                            }
                                            div {
                                                class: "networth-table-section networth-table-third-section tabular-nums",
                                                if pt.change == 0 {
                                                    span { class: "static-net-worth", "-" }
                                                } else if pt.change > 0 {
                                                    span {
                                                        class: "positive-net-worth",
                                                        span {
                                                            class: "networth-percentage-arrows",
                                                            Icon { name: "arrow_up", width: 10, height: 10 }
                                                        }
                                                        span {
                                                            class: "amount",
                                                            "+{store.format_money(pt.change)} "
                                                            span { class: "networth-percentage", "({format_tenths_percent(pct_t)})" }
                                                        }
                                                    }
                                                } else {
                                                    span {
                                                        class: "negative-net-worth",
                                                        span {
                                                            class: "networth-percentage-arrows",
                                                            Icon { name: "arrow_down", width: 10, height: 10 }
                                                        }
                                                        span {
                                                            class: "amount",
                                                            "-{store.format_money(pt.change.abs())} "
                                                            span { class: "networth-percentage", "({format_tenths_percent(pct_t)})" }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

fn ie_currency_class(amount: i64) -> &'static str {
    if amount > 0 {
        "user-data currency tabular-nums positive"
    } else if amount < 0 {
        "user-data currency tabular-nums negative"
    } else {
        "user-data currency tabular-nums zero"
    }
}

#[component]
fn IncomeExpenseView(
    filter_bar: FilterBarState,
    timeframe: TimeframeState,
    transactions: Vec<AnalyticsTransaction>,
    inspector_open: bool,
    on_toggle_inspector: EventHandler<MouseEvent>,
    on_open_activity: EventHandler<(String, Vec<String>)>,
    on_export_csv: EventHandler<String>,
    on_filter: EventHandler<FilterAction>,
) -> Element {
    let store = use_context::<AppStore>();
    let mut show_income = use_signal(|| true);
    let mut show_expense = use_signal(|| true);
    let mut collapsed_groups = use_signal(HashSet::<String>::new);

    let matrix = compute_income_expense_matrix(&transactions, &timeframe);
    let matrix_for_export = matrix.clone();

    rsx! {
        div {
            class: "reflect-income-expense",
            div {
                class: "reflect-income-expense-header",
                ReflectPageHeader {
                    title: "Income v Expense",
                    should_show_breadcrumbs: false,
                    selected_group_name: String::new(),
                    inspector_open: inspector_open,
                    on_clear_group: move |_| {},
                    on_toggle_inspector: on_toggle_inspector,
                    on_export: move |_| {
                        let mut header = vec!["Section".to_string(), "Category / Payee".to_string()];
                        header.extend(matrix_for_export.month_labels.iter().cloned());
                        header.push("Average".to_string());
                        header.push("Total".to_string());
                        let mut rows = vec![header];

                        for inc in &matrix_for_export.income_rows {
                            let mut row = vec!["Income".to_string(), inc.label.clone()];
                            for v in &inc.monthly_amounts {
                                row.push(format_plain_decimal_milliunits(*v));
                            }
                            row.push(format_plain_decimal_milliunits(inc.average));
                            row.push(format_plain_decimal_milliunits(inc.total));
                            rows.push(row);
                        }
                        for grp in &matrix_for_export.expense_groups {
                            for sub in &grp.rows {
                                let mut row = vec![grp.name.clone(), sub.label.clone()];
                                for v in &sub.monthly_amounts {
                                    row.push(format_plain_decimal_milliunits(*v));
                                }
                                row.push(format_plain_decimal_milliunits(sub.average));
                                row.push(format_plain_decimal_milliunits(sub.total));
                                rows.push(row);
                            }
                        }
                        let mut net_row = vec!["Summary".to_string(), "Net Income".to_string()];
                        for v in &matrix_for_export.net_monthly {
                            net_row.push(format_plain_decimal_milliunits(*v));
                        }
                        net_row.push(format_plain_decimal_milliunits(matrix_for_export.net_average));
                        net_row.push(format_plain_decimal_milliunits(matrix_for_export.net_total));
                        rows.push(net_row);

                        on_export_csv.call(export_to_csv_string(&rows));
                    },
                }

                ReflectFilterControls { state: filter_bar, on_action: on_filter }
            }

            div {
                class: "reports-income-expense reflect-ie-scroll",
                div {
                    class: "reports-content",
                    div {
                        class: "income-expense-table reflect-ie-table",
                        div {
                            class: "income-expense-header",
                            div {
                                class: "income-expense-row",
                                div {
                                    class: "income-expense-column income-expense-column-header income-expense-first-column reflect-ie-first-col",
                                    "Category / Source"
                                }
                                for lbl in matrix.month_labels.iter() {
                                    div {
                                        key: "hdr-{lbl}",
                                        class: "income-expense-column income-expense-column-header income-expense-number reflect-ie-num-col",
                                        "{lbl.to_uppercase()}"
                                    }
                                }
                                div {
                                    class: "income-expense-column income-expense-column-header income-expense-number reflect-ie-num-col",
                                    "AVERAGE"
                                }
                                div {
                                    class: "income-expense-column income-expense-column-header income-expense-number reflect-ie-num-col",
                                    "TOTAL"
                                }
                            }
                        }

                        div {
                            class: "income-expense-income",
                            div {
                                class: "income-expense-row income-expense-h1",
                                button {
                                    r#type: "button",
                                    class: "income-expense-column income-expense-first-column reflect-ie-first-col reflect-ie-toggle-btn",
                                    onclick: move |_| {
                                        let cur = *show_income.read();
                                        show_income.set(!cur);
                                    },
                                    span { class: "user-entered-text", "Income" }
                                    Icon {
                                        name: if *show_income.read() { "caret_down" } else { "caret_right" },
                                        width: 8,
                                        height: 8,
                                    }
                                }
                                for (k_idx, _) in matrix.month_labels.iter().enumerate() {
                                    div { key: "ih-pad-{k_idx}", class: "income-expense-column reflect-ie-num-col" }
                                }
                                div { class: "income-expense-column reflect-ie-num-col" }
                                div { class: "income-expense-column reflect-ie-num-col" }
                            }

                            if *show_income.read() {
                                div {
                                    class: "income-expense-group income-expense-level1",
                                    div {
                                        class: "income-expense-group income-expense-level2",
                                        for inc in matrix.income_rows.iter() {
                                            div {
                                                key: "{inc.id}",
                                                class: "income-expense-row",
                                                div {
                                                    class: "income-expense-column income-expense-first-column reflect-ie-first-col reflect-ie-indent-row",
                                                    span { class: "user-entered-text", "{inc.label}" }
                                                }
                                                for (m_idx, amt) in inc.monthly_amounts.iter().enumerate() {
                                                    {
                                                        let txs = inc.tx_ids_by_month.get(m_idx).cloned().unwrap_or_default();
                                                        let m_lbl = matrix.month_labels.get(m_idx).map(String::as_str).unwrap_or("");
                                                        let title = format!("{} - {m_lbl}", inc.label);
                                                        rsx! {
                                                            button {
                                                                key: "inc-cell-{inc.id}-{m_idx}",
                                                                r#type: "button",
                                                                class: "income-expense-column income-expense-number reflect-ie-num-col reflect-ie-cell-btn",
                                                                title: "View transactions",
                                                                onclick: move |_| on_open_activity.call((title.clone(), txs.clone())),
                                                                span { class: ie_currency_class(*amt), "{store.format_money(*amt)}" }
                                                            }
                                                        }
                                                    }
                                                }
                                                div {
                                                    class: "income-expense-column income-expense-number reflect-ie-num-col",
                                                    span { class: ie_currency_class(inc.average), "{store.format_money(inc.average)}" }
                                                }
                                                {
                                                    let all_txs = inc.all_tx_ids.clone();
                                                    let title = format!("{} (Total)", inc.label);
                                                    rsx! {
                                                        button {
                                                            r#type: "button",
                                                            class: "income-expense-column income-expense-number reflect-ie-num-col reflect-ie-cell-btn reflect-ie-total-col",
                                                            title: "View transactions",
                                                            onclick: move |_| on_open_activity.call((title.clone(), all_txs.clone())),
                                                            span { class: ie_currency_class(inc.total), "{store.format_money(inc.total)}" }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    div {
                                        class: "income-expense-row income-expense-totals income-expense-is-total-row",
                                        div {
                                            class: "income-expense-column income-expense-first-column reflect-ie-first-col",
                                            span { class: "user-entered-text", "Total Income" }
                                        }
                                        for (m_idx, tot) in matrix.income_monthly_totals.iter().enumerate() {
                                            div {
                                                key: "tot-inc-{m_idx}",
                                                class: "income-expense-column income-expense-number reflect-ie-num-col",
                                                span { class: ie_currency_class(*tot), "{store.format_money(*tot)}" }
                                            }
                                        }
                                        div {
                                            class: "income-expense-column income-expense-number reflect-ie-num-col",
                                            span { class: ie_currency_class(matrix.income_average), "{store.format_money(matrix.income_average)}" }
                                        }
                                        div {
                                            class: "income-expense-column income-expense-number reflect-ie-num-col reflect-ie-total-col",
                                            span { class: ie_currency_class(matrix.income_total), "{store.format_money(matrix.income_total)}" }
                                        }
                                    }
                                }
                            }
                        }

                        div {
                            class: "income-expense-expense",
                            div {
                                class: "income-expense-row income-expense-h1",
                                button {
                                    r#type: "button",
                                    class: "income-expense-column income-expense-first-column reflect-ie-first-col reflect-ie-toggle-btn",
                                    onclick: move |_| {
                                        let cur = *show_expense.read();
                                        show_expense.set(!cur);
                                    },
                                    span { class: "user-entered-text", "Expenses" }
                                    Icon {
                                        name: if *show_expense.read() { "caret_down" } else { "caret_right" },
                                        width: 8,
                                        height: 8,
                                    }
                                }
                                for (k_idx, _) in matrix.month_labels.iter().enumerate() {
                                    div { key: "eh-pad-{k_idx}", class: "income-expense-column reflect-ie-num-col" }
                                }
                                div { class: "income-expense-column reflect-ie-num-col" }
                                div { class: "income-expense-column reflect-ie-num-col" }
                            }

                            if *show_expense.read() {
                                div {
                                    class: "income-expense-group income-expense-level1",
                                    for grp in matrix.expense_groups.iter() {
                                        {
                                            let is_expanded = !collapsed_groups.read().contains(&grp.id);
                                            let grp_id = grp.id.clone();
                                            let grp_all_txs = grp.all_tx_ids.clone();
                                            let grp_total_title = format!("{} (Total)", grp.name);
                                            rsx! {
                                                div {
                                                    key: "ie-grp-{grp.id}",
                                                    class: "income-expense-row reflect-ie-group-row",
                                                    button {
                                                        r#type: "button",
                                                        class: "income-expense-column income-expense-first-column reflect-ie-first-col reflect-ie-toggle-btn",
                                                        onclick: move |_| {
                                                            let mut set = collapsed_groups.read().clone();
                                                            if set.contains(&grp_id) {
                                                                set.remove(&grp_id);
                                                            } else {
                                                                set.insert(grp_id.clone());
                                                            }
                                                            collapsed_groups.set(set);
                                                        },
                                                        span { class: "user-entered-text", "{grp.name}" }
                                                        Icon {
                                                            name: if is_expanded { "caret_down" } else { "caret_right" },
                                                            width: 8,
                                                            height: 8,
                                                        }
                                                    }
                                                    if is_expanded {
                                                        for (k_idx, _) in matrix.month_labels.iter().enumerate() {
                                                            div { key: "grp-pad-{grp.id}-{k_idx}", class: "income-expense-column reflect-ie-num-col" }
                                                        }
                                                        div { class: "income-expense-column reflect-ie-num-col" }
                                                        div { class: "income-expense-column reflect-ie-num-col" }
                                                    } else {
                                                        for (m_idx, tot) in grp.monthly_totals.iter().enumerate() {
                                                            {
                                                                let txs = grp.tx_ids_by_month.get(m_idx).cloned().unwrap_or_default();
                                                                let m_lbl = matrix.month_labels.get(m_idx).map(String::as_str).unwrap_or("");
                                                                let title = format!("{} - {m_lbl}", grp.name);
                                                                rsx! {
                                                                    button {
                                                                        key: "grp-c-{grp.id}-{m_idx}",
                                                                        r#type: "button",
                                                                        class: "income-expense-column income-expense-number reflect-ie-num-col reflect-ie-cell-btn",
                                                                        title: "View transactions",
                                                                        onclick: move |_| on_open_activity.call((title.clone(), txs.clone())),
                                                                        span { class: ie_currency_class(*tot), "{store.format_money(*tot)}" }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        div {
                                                            class: "income-expense-column income-expense-number reflect-ie-num-col",
                                                            span { class: ie_currency_class(grp.average), "{store.format_money(grp.average)}" }
                                                        }
                                                        button {
                                                            r#type: "button",
                                                            class: "income-expense-column income-expense-number reflect-ie-num-col reflect-ie-cell-btn reflect-ie-total-col",
                                                            title: "View transactions",
                                                            onclick: move |_| on_open_activity.call((grp_total_title.clone(), grp_all_txs.clone())),
                                                            span { class: ie_currency_class(grp.total), "{store.format_money(grp.total)}" }
                                                        }
                                                    }
                                                }

                                                if is_expanded {
                                                    div {
                                                        key: "ie-grp-sub-{grp.id}",
                                                        class: "income-expense-group income-expense-level2",
                                                        for sub in grp.rows.iter() {
                                                            div {
                                                                key: "ie-sub-{sub.id}",
                                                                class: "income-expense-row",
                                                                div {
                                                                    class: "income-expense-column income-expense-first-column reflect-ie-first-col reflect-ie-indent-row",
                                                                    span { class: "user-entered-text", "{sub.label}" }
                                                                }
                                                                for (m_idx, amt) in sub.monthly_amounts.iter().enumerate() {
                                                                    {
                                                                        let txs = sub.tx_ids_by_month.get(m_idx).cloned().unwrap_or_default();
                                                                        let m_lbl = matrix.month_labels.get(m_idx).map(String::as_str).unwrap_or("");
                                                                        let title = format!("{} - {m_lbl}", sub.label);
                                                                        rsx! {
                                                                            button {
                                                                                key: "sub-c-{sub.id}-{m_idx}",
                                                                                r#type: "button",
                                                                                class: "income-expense-column income-expense-number reflect-ie-num-col reflect-ie-cell-btn",
                                                                                title: "View transactions",
                                                                                onclick: move |_| on_open_activity.call((title.clone(), txs.clone())),
                                                                                span { class: ie_currency_class(*amt), "{store.format_money(*amt)}" }
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                                div {
                                                                    class: "income-expense-column income-expense-number reflect-ie-num-col",
                                                                    span { class: ie_currency_class(sub.average), "{store.format_money(sub.average)}" }
                                                                }
                                                                {
                                                                    let all_txs = sub.all_tx_ids.clone();
                                                                    let title = format!("{} (Total)", sub.label);
                                                                    rsx! {
                                                                        button {
                                                                            r#type: "button",
                                                                            class: "income-expense-column income-expense-number reflect-ie-num-col reflect-ie-cell-btn reflect-ie-total-col",
                                                                            title: "View transactions",
                                                                            onclick: move |_| on_open_activity.call((title.clone(), all_txs.clone())),
                                                                            span { class: ie_currency_class(sub.total), "{store.format_money(sub.total)}" }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }

                                                    div {
                                                        class: "income-expense-row income-expense-totals",
                                                        div {
                                                            class: "income-expense-column income-expense-first-column reflect-ie-first-col",
                                                            "Total {grp.name}"
                                                        }
                                                        for (m_idx, tot) in grp.monthly_totals.iter().enumerate() {
                                                            {
                                                                let txs = grp.tx_ids_by_month.get(m_idx).cloned().unwrap_or_default();
                                                                let m_lbl = matrix.month_labels.get(m_idx).map(String::as_str).unwrap_or("");
                                                                let title = format!("Total {} - {m_lbl}", grp.name);
                                                                rsx! {
                                                                    button {
                                                                        key: "gtot-c-{grp.id}-{m_idx}",
                                                                        r#type: "button",
                                                                        class: "income-expense-column income-expense-number reflect-ie-num-col reflect-ie-cell-btn",
                                                                        title: "View transactions",
                                                                        onclick: move |_| on_open_activity.call((title.clone(), txs.clone())),
                                                                        span { class: ie_currency_class(*tot), "{store.format_money(*tot)}" }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        div {
                                                            class: "income-expense-column income-expense-number reflect-ie-num-col",
                                                            span { class: ie_currency_class(grp.average), "{store.format_money(grp.average)}" }
                                                        }
                                                        {
                                                            let all_txs = grp.all_tx_ids.clone();
                                                            let title = format!("Total {}", grp.name);
                                                            rsx! {
                                                                button {
                                                                    r#type: "button",
                                                                    class: "income-expense-column income-expense-number reflect-ie-num-col reflect-ie-cell-btn reflect-ie-total-col",
                                                                    title: "View transactions",
                                                                    onclick: move |_| on_open_activity.call((title.clone(), all_txs.clone())),
                                                                    span { class: ie_currency_class(grp.total), "{store.format_money(grp.total)}" }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    div {
                                        class: "income-expense-row income-expense-totals income-expense-is-total-row",
                                        div {
                                            class: "income-expense-column income-expense-first-column reflect-ie-first-col",
                                            span { class: "user-entered-text", "Total Expenses" }
                                        }
                                        for (m_idx, tot) in matrix.expense_monthly_totals.iter().enumerate() {
                                            div {
                                                key: "tot-exp-{m_idx}",
                                                class: "income-expense-column income-expense-number reflect-ie-num-col",
                                                span { class: ie_currency_class(*tot), "{store.format_money(*tot)}" }
                                            }
                                        }
                                        div {
                                            class: "income-expense-column income-expense-number reflect-ie-num-col",
                                            span { class: ie_currency_class(matrix.expense_average), "{store.format_money(matrix.expense_average)}" }
                                        }
                                        div {
                                            class: "income-expense-column income-expense-number reflect-ie-num-col reflect-ie-total-col",
                                            span { class: ie_currency_class(matrix.expense_total), "{store.format_money(matrix.expense_total)}" }
                                        }
                                    }
                                }
                            }
                        }

                        div {
                            class: "income-expense-net-income",
                            div {
                                class: "income-expense-row income-expense-h1",
                                div {
                                    class: "income-expense-column income-expense-first-column reflect-ie-first-col",
                                    "Net Income"
                                }
                                for (k_idx, _) in matrix.month_labels.iter().enumerate() {
                                    div { key: "nh-pad-{k_idx}", class: "income-expense-column reflect-ie-num-col" }
                                }
                                div { class: "income-expense-column reflect-ie-num-col" }
                                div { class: "income-expense-column reflect-ie-num-col" }
                            }
                            div {
                                class: "income-expense-row income-expense-is-total-row",
                                div {
                                    class: "income-expense-column income-expense-first-column reflect-ie-first-col",
                                    "\u{00A0}"
                                }
                                for (m_idx, net) in matrix.net_monthly.iter().enumerate() {
                                    div {
                                        key: "net-{m_idx}",
                                        class: "income-expense-column income-expense-number reflect-ie-num-col",
                                        span {
                                            class: "{ie_currency_class(*net)} reflect-ie-net-value",
                                            "{store.format_money(*net)}"
                                        }
                                    }
                                }
                                div {
                                    class: "income-expense-column income-expense-number reflect-ie-num-col",
                                    span {
                                        class: "{ie_currency_class(matrix.net_average)} reflect-ie-net-value",
                                        "{store.format_money(matrix.net_average)}"
                                    }
                                }
                                div {
                                    class: "income-expense-column income-expense-number reflect-ie-num-col reflect-ie-total-col",
                                    span {
                                        class: "{ie_currency_class(matrix.net_total)} reflect-ie-net-value",
                                        "{store.format_money(matrix.net_total)}"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn AgeOfMoneyView(
    transactions: Vec<AnalyticsTransaction>,
    inspector_open: bool,
    on_toggle_inspector: EventHandler<MouseEvent>,
    on_export_csv: EventHandler<String>,
) -> Element {
    let mut months_to_show = use_signal(|| 6usize);
    let mut hovered_pt = use_signal(|| None::<AomHoverState>);

    let aom_res = calculate_age_of_money(&transactions);
    let points: Vec<AgeOfMoneyPoint> =
        calculate_age_of_money_history(&transactions, *months_to_show.read());
    let current_age = aom_res
        .age
        .unwrap_or_else(|| points.last().map(|p| p.age).unwrap_or(0));
    let is_empty = !aom_res.is_ready && points.is_empty();

    let max_age = points.iter().map(|p| p.age).max().unwrap_or(30).max(30);
    let step_days = compute_nice_step(max_age, 3).max(10);
    let y_max = (step_days * 3).max(30);

    let chart_left = 54i64;
    let chart_right = 620i64;
    let chart_top = 20i64;
    let chart_bottom = 180i64;
    let chart_h = chart_bottom - chart_top;
    let count = points.len().max(1) as i64;
    let slot_w = (chart_right - chart_left) / count;
    let label_step = points.len().div_ceil(8).max(1);

    let mut bezier_pts: Vec<(i64, i64)> = Vec::with_capacity(points.len());
    for (idx, pt) in points.iter().enumerate() {
        let cx = chart_left + (idx as i64) * slot_w + slot_w / 2;
        let cy = chart_bottom - (pt.age.clamp(0, y_max) * chart_h) / y_max;
        bezier_pts.push((cx, cy));
    }
    let line_bezier = build_catmull_rom_bezier_path(&bezier_pts, chart_top, chart_bottom);
    let area_bezier =
        build_catmull_rom_area_path(&bezier_pts, chart_bottom, chart_top, chart_bottom);

    let points_for_export = points.clone();
    let hovered_key = hovered_pt.read().as_ref().map(|h| h.point.date_key.clone());

    rsx! {
        div {
            class: "reflect-age-of-money",
            ReflectPageHeader {
                title: "Age of Money",
                should_show_breadcrumbs: false,
                selected_group_name: String::new(),
                inspector_open: inspector_open,
                on_clear_group: move |_| {},
                on_toggle_inspector: on_toggle_inspector,
                on_export: move |_| {
                    let mut rows = vec![vec!["Date".to_string(), "Age of Money (Days)".to_string()]];
                    for pt in &points_for_export {
                        rows.push(vec![pt.date.clone(), pt.age.to_string()]);
                    }
                    on_export_csv.call(export_to_csv_string(&rows));
                },
            }

            section {
                class: if is_empty {
                    "card chart-card is-empty-state reflect-chart-card"
                } else {
                    "card chart-card reflect-chart-card"
                },
                if is_empty {
                    div {
                        class: "empty-state-content",
                        h4 { "Spend more money!" }
                        p { "Strange advice, we know. YNAB needs a minimum of 10 cash outflow transactions to calculate your Age of Money." }
                    }
                } else {
                    div {
                        class: "top-row reflect-aom-top-row",
                        div {
                            class: "current-age-of-money",
                            span { class: "current-age-of-money-title", "Age of Money" }
                            span {
                                class: "current-age-of-money-value",
                                "{current_age} days"
                            }
                        }

                        div {
                            class: "segmented-control textOnlyOption",
                            role: "group",
                            for (m_opt, lbl) in [(6usize, "6 Months"), (12usize, "1 Year"), (24usize, "2 Years")] {
                                button {
                                    key: "aom-opt-{m_opt}",
                                    r#type: "button",
                                    class: if *months_to_show.read() == m_opt {
                                        "segmented-control-button selected"
                                    } else {
                                        "segmented-control-button"
                                    },
                                    onclick: move |_| months_to_show.set(m_opt),
                                    "{lbl}"
                                }
                            }
                        }
                    }

                    div {
                        class: "age-of-money-chart chart-container reflect-chart-container",
                        div {
                            class: "chart bb",
                            svg {
                                class: "bb-svg reflect-chart-svg",
                                view_box: "0 0 640 220",
                                defs {
                                    linearGradient {
                                        id: "reflect-aom-area-grad",
                                        x1: "0",
                                        y1: "0",
                                        x2: "0",
                                        y2: "1",
                                        stop {
                                            class: "reflect-aom-grad-top",
                                            offset: "0%",
                                        }
                                        stop {
                                            class: "reflect-aom-grad-bottom",
                                            offset: "100%",
                                        }
                                    }
                                }
                                g {
                                    class: "bb-chart",
                                    g {
                                        class: "bb-grid-lines",
                                        for tick_idx in 0..=3i64 {
                                            {
                                                let d_val = tick_idx * step_days;
                                                let y = chart_bottom - (d_val * chart_h) / y_max;
                                                rsx! {
                                                    g {
                                                        key: "aom-y-{tick_idx}",
                                                        class: "tick",
                                                        line {
                                                            class: if tick_idx == 0 {
                                                                "reflect-chart-zero-line"
                                                            } else {
                                                                "reflect-chart-gridline"
                                                            },
                                                            x1: "{chart_left}",
                                                            y1: "{y}",
                                                            x2: "{chart_right}",
                                                            y2: "{y}",
                                                        }
                                                        text {
                                                            class: "reflect-chart-axis-text",
                                                            x: "{chart_left - 8}",
                                                            y: "{y + 4}",
                                                            text_anchor: "end",
                                                            "{d_val}d"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    if points.len() > 1 {
                                        g {
                                            class: "bb-chart-lines",
                                            path {
                                                class: "bb-shape bb-area bb-area-ageOfMoney reflect-aom-area",
                                                d: "{area_bezier}",
                                            }
                                            path {
                                                class: "bb-shape bb-line bb-line-ageOfMoney reflect-aom-line",
                                                d: "{line_bezier}",
                                            }
                                        }
                                    }

                                    if let Some(hp) = hovered_pt.read().clone() {
                                        line {
                                            class: "reflect-aom-focus-line",
                                            x1: "{hp.cx}",
                                            y1: "{chart_top}",
                                            x2: "{hp.cx}",
                                            y2: "{chart_bottom}",
                                        }
                                    }

                                    for (idx, pt) in points.iter().enumerate() {
                                        {
                                            let cx = chart_left + (idx as i64) * slot_w + slot_w / 2;
                                            let cy = chart_bottom - (pt.age.clamp(0, y_max) * chart_h) / y_max;
                                            let pt_hov = pt.clone();
                                            let is_hovered = hovered_key.as_deref() == Some(pt.date_key.as_str());
                                            let show_x_label = idx % label_step == 0 || idx + 1 == points.len();
                                            rsx! {
                                                g {
                                                    key: "{pt.date_key}",
                                                    onmouseenter: move |_| hovered_pt.set(Some(AomHoverState {
                                                        cx,
                                                        cy,
                                                        point: pt_hov.clone(),
                                                    })),
                                                    onmouseleave: move |_| hovered_pt.set(None),
                                                    rect {
                                                        class: "reflect-chart-hit-target",
                                                        x: "{chart_left + (idx as i64) * slot_w}",
                                                        y: "{chart_top}",
                                                        width: "{slot_w}",
                                                        height: "{chart_h}",
                                                    }
                                                    circle {
                                                        class: if is_hovered {
                                                            "bb-shape bb-circle reflect-aom-dot is-hovered"
                                                        } else {
                                                            "bb-shape bb-circle reflect-aom-dot"
                                                        },
                                                        cx: "{cx}",
                                                        cy: "{cy}",
                                                        r: if is_hovered { "6" } else { "5" },
                                                    }
                                                    if show_x_label {
                                                        text {
                                                            class: "reflect-chart-axis-text",
                                                            x: "{cx}",
                                                            y: "202",
                                                            text_anchor: "middle",
                                                            "{pt.date}"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if let Some(hp) = hovered_pt.read().clone() {
                            {
                                let tip_x = ((hp.cx * 100) / 640).clamp(14, 86);
                                let tip_y = ((hp.cy * 100) / 220).clamp(18, 84);
                                rsx! {
                                    div {
                                        class: "bb-tooltip-container reflect-chart-tooltip-container",
                                        style: "left: {tip_x}%; top: {tip_y}%;",
                                        div {
                                            class: "reflect-age-of-money-tooltip",
                                            div {
                                                class: "content-container",
                                                div { class: "age-of-money-month", "{hp.point.date}" }
                                                div {
                                                    class: "age-of-money-value",
                                                    span { "{hp.point.age}" }
                                                    span { " days" }
                                                }
                                            }
                                            div { class: "tooltip-arrow" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            section {
                class: "card info-card reflect-aom-info-card",
                h2 { "Understanding Age of Money" }
                div {
                    class: "info-card-content",
                    p {
                        "Age of Money is how long, on average, money sits in your cash accounts between earning and spending it (calculated using a FIFO queue across your last 10 cash outflows)."
                    }
                    p {
                        "Want to have more time to make decisions? Tired of shifting money around at the last minute? Use Age of Money to help you gauge the time between earning and spending."
                    }
                }
            }
        }
    }
}

#[component]
fn TimeframeModal(
    current: TimeframeState,
    earliest_year: i32,
    latest_year: i32,
    on_select_preset: EventHandler<TimeframePreset>,
    on_apply_custom: EventHandler<(i32, u32, i32, u32)>,
    on_close: EventHandler<MouseEvent>,
) -> Element {
    let mut custom_mode = use_signal(|| current.preset == TimeframePreset::Custom);
    let mut from_year = use_signal(|| current.start_year);
    let mut from_month = use_signal(|| current.start_month);
    let mut to_year = use_signal(|| current.end_year);
    let mut to_month = use_signal(|| current.end_month);

    let years: Vec<i32> = (earliest_year.min(2024)..=latest_year.max(2027)).collect();
    let presets = [
        (TimeframePreset::ThisMonth, "This Month"),
        (TimeframePreset::Latest3Months, "Latest 3 Months"),
        (TimeframePreset::Latest6Months, "Latest 6 Months"),
        (TimeframePreset::Latest12Months, "Latest 12 Months"),
        (TimeframePreset::ThisYear, "This Year"),
        (TimeframePreset::LastYear, "Last Year"),
        (TimeframePreset::AllDates, "All Dates"),
    ];

    rsx! {
        ModalDialog {
            title: "Timeframe",
            class: "modal-reports-timeframe reflect-timeframe-dropdown",
            width: "320px",
            onclose: move |e| on_close.call(e),
            div {
                class: "reflect-timeframe-menu",
                role: "menu",
                for (preset, label) in presets {
                    {
                        let is_active = current.preset == preset && !*custom_mode.read();
                        rsx! {
                            button {
                                key: "{label}",
                                r#type: "button",
                                class: if is_active {
                                    "timeframe-option reflect-timeframe-option is-active"
                                } else {
                                    "timeframe-option reflect-timeframe-option"
                                },
                                onclick: move |_| {
                                    custom_mode.set(false);
                                    on_select_preset.call(preset);
                                },
                                span { "{label}" }
                                if is_active {
                                    Icon {
                                        name: "check",
                                        class: "selected-preset-icon",
                                        width: 12,
                                        height: 12,
                                    }
                                }
                            }
                        }
                    }
                }

                div {
                    class: "reflect-timeframe-separator",
                    role: "separator",
                }

                button {
                    r#type: "button",
                    class: if *custom_mode.read() {
                        "timeframe-option timeframe-option--custom reflect-timeframe-option is-active"
                    } else {
                        "timeframe-option timeframe-option--custom reflect-timeframe-option"
                    },
                    onclick: move |_| custom_mode.set(true),
                    span { "Custom Date Range" }
                    if *custom_mode.read() {
                        Icon {
                            name: "check",
                            class: "selected-preset-icon",
                            width: 12,
                            height: 12,
                        }
                    }
                }

                if *custom_mode.read() {
                    div {
                        class: "custom-time-frame-selection reflect-custom-timeframe-panel",
                        div {
                            class: "reflect-custom-timeframe-field",
                            label { class: "reflect-field-label", "FROM" }
                            div {
                                class: "reflect-custom-timeframe-selects",
                                select {
                                    class: "reflect-select reflect-select-grow",
                                    value: "{*from_month.read()}",
                                    onchange: move |e| {
                                        if let Ok(m) = e.value().parse::<u32>() {
                                            from_month.set(m);
                                        }
                                    },
                                    for (idx, mname) in MONTH_NAMES.iter().enumerate() {
                                        option { key: "fm-{idx}", value: "{idx}", "{mname}" }
                                    }
                                }
                                select {
                                    class: "reflect-select reflect-select-year",
                                    value: "{*from_year.read()}",
                                    onchange: move |e| {
                                        if let Ok(y) = e.value().parse::<i32>() {
                                            from_year.set(y);
                                        }
                                    },
                                    for yr in years.iter() {
                                        option { key: "fy-{yr}", value: "{yr}", "{yr}" }
                                    }
                                }
                            }
                        }
                        div {
                            class: "reflect-custom-timeframe-field",
                            label { class: "reflect-field-label", "TO" }
                            div {
                                class: "reflect-custom-timeframe-selects",
                                select {
                                    class: "reflect-select reflect-select-grow",
                                    value: "{*to_month.read()}",
                                    onchange: move |e| {
                                        if let Ok(m) = e.value().parse::<u32>() {
                                            to_month.set(m);
                                        }
                                    },
                                    for (idx, mname) in MONTH_NAMES.iter().enumerate() {
                                        option { key: "tm-{idx}", value: "{idx}", "{mname}" }
                                    }
                                }
                                select {
                                    class: "reflect-select reflect-select-year",
                                    value: "{*to_year.read()}",
                                    onchange: move |e| {
                                        if let Ok(y) = e.value().parse::<i32>() {
                                            to_year.set(y);
                                        }
                                    },
                                    for yr in years.iter() {
                                        option { key: "ty-{yr}", value: "{yr}", "{yr}" }
                                    }
                                }
                            }
                        }
                        div {
                            class: "custom-time-frame-actions reflect-custom-timeframe-actions",
                            YnabButton {
                                variant: "secondary",
                                onclick: move |_| custom_mode.set(false),
                                "Cancel"
                            }
                            YnabButton {
                                variant: "primary",
                                onclick: move |_| {
                                    on_apply_custom.call((
                                        *from_year.read(),
                                        *from_month.read(),
                                        *to_year.read(),
                                        *to_month.read(),
                                    ));
                                },
                                "Apply"
                            }
                        }
                    }
                }
            }
        }
    }
}

fn toggle_filter_single(mut checked: Signal<HashSet<String>>, id: &str) {
    let mut cur = checked.write();
    if cur.contains(id) {
        cur.remove(id);
    } else {
        cur.insert(id.to_string());
    }
}

fn toggle_filter_batch(mut checked: Signal<HashSet<String>>, ids: &[String], all_on: bool) {
    let mut cur = checked.write();
    if all_on {
        for id in ids {
            cur.remove(id);
        }
    } else {
        for id in ids {
            cur.insert(id.clone());
        }
    }
}

#[component]
fn FilterItemsModal(
    kind: FilterKind,
    category_groups: Vec<CategoryGroupDto>,
    accounts: Vec<AccountDto>,
    selected_ids: HashSet<String>,
    none_selected: bool,
    on_apply: EventHandler<(HashSet<String>, bool)>,
    on_close: EventHandler<MouseEvent>,
) -> Element {
    let mut search = use_signal(String::new);

    let all_ids: Vec<String> = match kind {
        FilterKind::Categories => category_groups
            .iter()
            .flat_map(|g| g.categories.iter().map(|c| c.id.clone()))
            .collect(),
        FilterKind::Accounts => accounts.iter().map(|a| a.id.clone()).collect(),
    };

    let init_checked: HashSet<String> = if none_selected {
        HashSet::new()
    } else if selected_ids.is_empty() {
        all_ids.iter().cloned().collect()
    } else {
        selected_ids
    };
    let mut checked = use_signal(|| init_checked);

    let q = search.read().to_ascii_lowercase();
    let all_ids_apply = all_ids.clone();
    let all_ids_select_all = all_ids.clone();

    let modal_title = match kind {
        FilterKind::Categories => "Filter Categories",
        FilterKind::Accounts => "Filter Accounts",
    };

    rsx! {
        ModalDialog {
            title: modal_title,
            class: if kind == FilterKind::Categories {
                "modal-reports-dropdown modal-reports-categories"
            } else {
                "modal-reports-dropdown modal-reports-accounts"
            },
            width: "380px",
            onclose: move |e| on_close.call(e),
            footer: rsx! {
                div {
                    class: "reflect-modal-footer-split",
                    div {
                        class: "modal-action-group reflect-modal-action-group",
                        YnabButton {
                            variant: "secondary",
                            class: "select-items-button",
                            onclick: move |_| checked.set(all_ids_select_all.iter().cloned().collect()),
                            "Select All"
                        }
                        YnabButton {
                            variant: "secondary",
                            class: "select-items-button",
                            onclick: move |_| checked.set(HashSet::new()),
                            "Select None"
                        }
                    }
                    div {
                        class: "modal-action-group reflect-modal-action-group",
                        YnabButton {
                            variant: "secondary",
                            class: "button-cancel",
                            onclick: move |e| on_close.call(e),
                            "Cancel"
                        }
                        YnabButton {
                            variant: "primary",
                            onclick: move |_| {
                                let cur = checked.read().clone();
                                if cur.is_empty() {
                                    on_apply.call((HashSet::new(), true));
                                } else if cur.len() >= all_ids_apply.len() && all_ids_apply.iter().all(|id| cur.contains(id)) {
                                    on_apply.call((HashSet::new(), false));
                                } else {
                                    on_apply.call((cur, false));
                                }
                            },
                            "Done"
                        }
                    }
                }
            },
            div {
                class: "reflect-filter-modal-body",
                div {
                    class: "filter-items-search reflect-filter-search-wrap",
                    Icon {
                        name: "search",
                        class: "reflect-filter-search-icon",
                        width: 12,
                        height: 12,
                    }
                    input {
                        r#type: "text",
                        class: "reflect-filter-search-input",
                        placeholder: if kind == FilterKind::Categories { "Search categories..." } else { "Search accounts..." },
                        value: "{search}",
                        oninput: move |e| search.set(e.value()),
                    }
                    if !search.read().is_empty() {
                        button {
                            r#type: "button",
                            class: "reflect-filter-search-clear",
                            title: "Clear search",
                            onclick: move |_| search.set(String::new()),
                            Icon { name: "close", width: 10, height: 10 }
                        }
                    }
                }

                div {
                    class: "modal-overflow-area reflect-filter-list-scroll",
                    match kind {
                        FilterKind::Categories => rsx! {
                            for grp in category_groups.iter() {
                                {
                                    let grp_match = grp.name.to_ascii_lowercase().contains(&q);
                                    let matching_cats: Vec<_> = grp
                                        .categories
                                        .iter()
                                        .filter(|c| grp_match || c.name.to_ascii_lowercase().contains(&q))
                                        .cloned()
                                        .collect();
                                    let child_ids: Vec<String> = grp.categories.iter().map(|c| c.id.clone()).collect();
                                    let checked_count = child_ids.iter().filter(|id| checked.read().contains(*id)).count();
                                    let all_grp_checked = !child_ids.is_empty() && checked_count == child_ids.len();
                                    let is_partial = checked_count > 0 && checked_count < child_ids.len();
                                    rsx! {
                                        if !matching_cats.is_empty() {
                                            div {
                                                key: "fgrp-{grp.id}",
                                                class: "reflect-filter-section",
                                                button {
                                                    r#type: "button",
                                                    class: "ynab-checkbox reflect-filter-row reflect-filter-group-row",
                                                    onclick: move |_| toggle_filter_batch(checked, &child_ids, all_grp_checked),
                                                    div {
                                                        class: "ynab-checkbox-button",
                                                        div {
                                                            class: if all_grp_checked || is_partial {
                                                                "ynab-checkbox-button-square is-checked"
                                                            } else {
                                                                "ynab-checkbox-button-square"
                                                            },
                                                            if all_grp_checked {
                                                                Icon { name: "check", width: 10, height: 10 }
                                                            } else if is_partial {
                                                                Icon { name: "subtract", width: 10, height: 10 }
                                                            }
                                                        }
                                                    }
                                                    span { class: "label-checkbox", "{grp.name}" }
                                                }
                                                div {
                                                    class: "reflect-filter-children",
                                                    for cat in matching_cats {
                                                        {
                                                            let cid = cat.id.clone();
                                                            let cid_row = cid.clone();
                                                            let is_chk = checked.read().contains(&cid);
                                                            rsx! {
                                                                button {
                                                                    key: "fcat-{cid}",
                                                                    r#type: "button",
                                                                    class: "ynab-checkbox reflect-filter-row",
                                                                    onclick: move |_| toggle_filter_single(checked, &cid_row),
                                                                    div {
                                                                        class: "ynab-checkbox-button",
                                                                        div {
                                                                            class: if is_chk {
                                                                                "ynab-checkbox-button-square is-checked"
                                                                            } else {
                                                                                "ynab-checkbox-button-square"
                                                                            },
                                                                            if is_chk {
                                                                                Icon { name: "check", width: 10, height: 10 }
                                                                            }
                                                                        }
                                                                    }
                                                                    span { class: "label-checkbox", "{cat.name}" }
                                                                    if cat.hidden {
                                                                        Icon {
                                                                            name: "eye_slash",
                                                                            class: "reflect-filter-hidden-icon",
                                                                            width: 12,
                                                                            height: 12,
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        FilterKind::Accounts => rsx! {
                            for (sec_label, on_budget_match) in [("Budget Accounts", true), ("Tracking & Closed Accounts", false)] {
                                {
                                    let list: Vec<_> = accounts
                                        .iter()
                                        .filter(|a| {
                                            let is_budget = a.on_budget && !a.closed;
                                            is_budget == on_budget_match
                                                && a.name.to_ascii_lowercase().contains(&q)
                                        })
                                        .cloned()
                                        .collect();
                                    let sec_ids: Vec<String> = list.iter().map(|a| a.id.clone()).collect();
                                    let checked_count = sec_ids.iter().filter(|id| checked.read().contains(*id)).count();
                                    let all_sec_checked = !sec_ids.is_empty() && checked_count == sec_ids.len();
                                    let is_partial = checked_count > 0 && checked_count < sec_ids.len();
                                    rsx! {
                                        if !list.is_empty() {
                                            div {
                                                key: "fsec-{sec_label}",
                                                class: "reflect-filter-section",
                                                button {
                                                    r#type: "button",
                                                    class: "ynab-checkbox reflect-filter-row reflect-filter-group-row",
                                                    onclick: move |_| toggle_filter_batch(checked, &sec_ids, all_sec_checked),
                                                    div {
                                                        class: "ynab-checkbox-button",
                                                        div {
                                                            class: if all_sec_checked || is_partial {
                                                                "ynab-checkbox-button-square is-checked"
                                                            } else {
                                                                "ynab-checkbox-button-square"
                                                            },
                                                            if all_sec_checked {
                                                                Icon { name: "check", width: 10, height: 10 }
                                                            } else if is_partial {
                                                                Icon { name: "subtract", width: 10, height: 10 }
                                                            }
                                                        }
                                                    }
                                                    span { class: "label-checkbox", "{sec_label}" }
                                                }
                                                div {
                                                    class: "reflect-filter-children",
                                                    for acc in list {
                                                        {
                                                            let aid = acc.id.clone();
                                                            let aid_row = aid.clone();
                                                            let is_chk = checked.read().contains(&aid);
                                                            rsx! {
                                                                button {
                                                                    key: "facc-{aid}",
                                                                    r#type: "button",
                                                                    class: "ynab-checkbox reflect-filter-row",
                                                                    onclick: move |_| toggle_filter_single(checked, &aid_row),
                                                                    div {
                                                                        class: "ynab-checkbox-button",
                                                                        div {
                                                                            class: if is_chk {
                                                                                "ynab-checkbox-button-square is-checked"
                                                                            } else {
                                                                                "ynab-checkbox-button-square"
                                                                            },
                                                                            if is_chk {
                                                                                Icon { name: "check", width: 10, height: 10 }
                                                                            }
                                                                        }
                                                                    }
                                                                    span { class: "label-checkbox", "{acc.name}" }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                    }
                }
            }
        }
    }
}

#[component]
fn InflowWarningModal(
    total_outflows: i64,
    total_inflows: i64,
    net_spending: i64,
    on_close: EventHandler<MouseEvent>,
) -> Element {
    let store = use_context::<AppStore>();

    rsx! {
        ModalDialog {
            title: "Understanding Your Spending",
            class: "spending-breakdown-inflow-warning-modal",
            width: "440px",
            onclose: move |e| on_close.call(e),
            footer: rsx! {
                div {
                    class: "reflect-modal-footer-split",
                    a {
                        class: "reflect-inflow-learn-more",
                        href: "https://support.ynab.com/en_us/how-to-add-income-and-other-inflows-H1ZNjfZJi",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        "Learn More"
                    }
                    YnabButton {
                        variant: "primary",
                        onclick: move |e| on_close.call(e),
                        "Got It"
                    }
                }
            },
            div {
                class: "reflect-inflow-modal-body",
                p {
                    class: "reflect-inflow-modal-desc",
                    "Categories with positive net inflows (refunds or reimbursements exceeding spending) are excluded from the spending donut chart and listed separately below."
                }
                div {
                    class: "reflect-inflow-summary-row",
                    span { "Total Category Outflows" }
                    strong { class: "user-data currency tabular-nums", "{store.format_money(total_outflows)}" }
                }
                div {
                    class: "reflect-inflow-summary-row",
                    span { "Positive Category Inflows" }
                    strong {
                        class: "user-data currency tabular-nums positive",
                        "+{store.format_money(total_inflows)}"
                    }
                }
                div { class: "reflect-inflow-divider" }
                div {
                    class: "reflect-inflow-summary-row reflect-inflow-summary-total",
                    span { "Net Spending" }
                    span { class: "user-data currency tabular-nums", "{store.format_money(net_spending)}" }
                }
            }
        }
    }
}

#[component]
fn ExportReportsModal(
    report_name: String,
    on_confirm: EventHandler<bool>,
    on_close: EventHandler<MouseEvent>,
) -> Element {
    let mut dont_remind = use_signal(|| false);

    rsx! {
        ModalDialog {
            title: "Export {report_name}",
            class: "modal-export-reports",
            width: "420px",
            onclose: move |e| on_close.call(e),
            footer: rsx! {
                div {
                    class: "reflect-modal-footer-split",
                    button {
                        r#type: "button",
                        class: "ynab-checkbox reflect-filter-row",
                        onclick: move |_| {
                            let cur = *dont_remind.read();
                            dont_remind.set(!cur);
                        },
                        div {
                            class: "ynab-checkbox-button",
                            div {
                                class: if *dont_remind.read() {
                                    "ynab-checkbox-button-square is-checked"
                                } else {
                                    "ynab-checkbox-button-square"
                                },
                                if *dont_remind.read() {
                                    Icon { name: "check", width: 10, height: 10 }
                                }
                            }
                        }
                        span { class: "label-checkbox", "Don't show again" }
                    }
                    div {
                        class: "modal-action-group reflect-modal-action-group",
                        YnabButton {
                            variant: "secondary",
                            class: "button-cancel",
                            onclick: move |e| on_close.call(e),
                            "Cancel"
                        }
                        YnabButton {
                            variant: "primary",
                            onclick: move |_| on_confirm.call(*dont_remind.read()),
                            "Export"
                        }
                    }
                }
            },
            p {
                class: "reflect-export-modal-desc",
                "Your report data will be exported as a CSV file matching the currently selected timeframe, categories, and accounts."
            }
        }
    }
}

#[component]
fn ChartImageExporterModal(
    history: Vec<NetWorthMonthPoint>,
    on_close: EventHandler<MouseEvent>,
) -> Element {
    let store = use_context::<AppStore>();
    let mut mask_amounts = use_signal(|| *store.hide_amounts.read());
    let mut ratio_variant = use_signal(|| "square");
    let mut exported_notice = use_signal(|| false);

    let latest = history.last().cloned().unwrap_or(NetWorthMonthPoint {
        month: String::new(),
        date_key: String::new(),
        debts: 0,
        assets: 0,
        net_worth: 0,
        change: 0,
        increased: false,
    });
    let first_nw = history.first().map(|p| p.net_worth).unwrap_or(0);
    let period_change = latest.net_worth - first_nw;
    let period_pct_tenths = compute_tenths_percent(period_change, first_nw.abs().max(1));

    let masked = *mask_amounts.read();
    let display_nw = if masked {
        "\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}".to_string()
    } else {
        store.format_money(latest.net_worth)
    };
    let display_assets = if masked {
        "\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}".to_string()
    } else {
        store.format_money(latest.assets)
    };
    let display_debts = if masked {
        "\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}".to_string()
    } else if latest.debts == 0 {
        store.format_money(0)
    } else {
        format!("-{}", store.format_money(latest.debts))
    };
    let display_change = if masked {
        "\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}".to_string()
    } else {
        store.format_money(period_change)
    };

    let slice_start = history.len().saturating_sub(6);
    let recent = &history[slice_start..];
    let max_bar_val = recent
        .iter()
        .map(|p| p.assets.max(p.debts).max(p.net_worth.abs()))
        .max()
        .unwrap_or(1)
        .max(1);

    let wrapper_class = match *ratio_variant.read() {
        "portrait" => "chart-image-exporter-branded-wrapper chart-image-exporter-branded-wrapper--portrait reflect-exporter-wrapper",
        "landscape" => "chart-image-exporter-branded-wrapper chart-image-exporter-branded-wrapper--landscape reflect-exporter-wrapper",
        _ => "chart-image-exporter-branded-wrapper chart-image-exporter-branded-wrapper--square reflect-exporter-wrapper",
    };

    let history_for_snapshot = history.clone();

    rsx! {
        ModalDialog {
            title: "Share Net Worth Progress",
            class: "chart-image-exporter-modal",
            width: "760px",
            onclose: move |e| on_close.call(e),
            footer: rsx! {
                div {
                    class: "reflect-modal-footer-split",
                    div {
                        class: "chart-image-exporter-footer-status",
                        if *exported_notice.read() {
                            span { "Snapshot exported to CSV." }
                        }
                    }
                    div {
                        class: "chart-image-exporter-footer-buttons",
                        YnabButton {
                            variant: "secondary",
                            onclick: move |_| {
                                let mut rows = vec![vec![
                                    "Month".to_string(),
                                    "Assets".to_string(),
                                    "Debts".to_string(),
                                    "Net Worth".to_string(),
                                ]];
                                for pt in &history_for_snapshot {
                                    rows.push(vec![
                                        pt.month.clone(),
                                        format_plain_decimal_milliunits(pt.assets),
                                        format_plain_decimal_milliunits(pt.debts),
                                        format_plain_decimal_milliunits(pt.net_worth),
                                    ]);
                                }
                                let csv = export_to_csv_string(&rows);
                                if save_csv_file_dialog("net_worth_snapshot.csv", &csv).is_ok() {
                                    exported_notice.set(true);
                                }
                            },
                            "Export Snapshot"
                        }
                        YnabButton {
                            variant: "primary",
                            onclick: move |e| on_close.call(e),
                            "Done"
                        }
                    }
                }
            },
            div {
                class: "chart-image-exporter-body",
                div {
                    class: "chart-image-exporter-sidebar",
                    div {
                        class: "chart-image-exporter-sidebar-section reflect-exporter-section-col",
                        span { class: "chart-image-exporter-label", "Aspect Ratio" }
                        div {
                            class: "reflect-exporter-size-group",
                            for (key_id, lbl) in [("square", "Square"), ("portrait", "Portrait"), ("landscape", "Landscape")] {
                                button {
                                    key: "exp-sz-{key_id}",
                                    r#type: "button",
                                    class: if *ratio_variant.read() == key_id {
                                        "chart-image-exporter-size-button is-selected"
                                    } else {
                                        "chart-image-exporter-size-button"
                                    },
                                    onclick: move |_| ratio_variant.set(key_id),
                                    "{lbl}"
                                }
                            }
                        }
                    }
                    div {
                        class: "chart-image-exporter-sidebar-section reflect-exporter-section-col",
                        button {
                            r#type: "button",
                            class: "chart-image-exporter-toggle-row ynab-checkbox reflect-filter-row",
                            onclick: move |_| {
                                let cur = *mask_amounts.read();
                                mask_amounts.set(!cur);
                            },
                            div {
                                class: "ynab-checkbox-button",
                                div {
                                    class: if masked {
                                        "ynab-checkbox-button-square is-checked"
                                    } else {
                                        "ynab-checkbox-button-square"
                                    },
                                    if masked {
                                        Icon { name: "check", width: 10, height: 10 }
                                    }
                                }
                            }
                            span { class: "label-checkbox", "Hide Monetary Amounts" }
                        }
                    }
                }

                div {
                    class: "chart-image-exporter-preview-column",
                    div {
                        class: "chart-image-exporter-preview-container",
                        div {
                            class: "{wrapper_class}",
                            h3 {
                                class: "chart-image-exporter-chart-title",
                                "From worried to worth it."
                            }
                            div {
                                class: "chart-image-exporter-chart-area reflect-exporter-card",
                                div {
                                    class: "reflect-exporter-nw-label",
                                    "Net Worth"
                                }
                                div {
                                    class: "reflect-exporter-nw-value user-data currency tabular-nums",
                                    "{display_nw}"
                                }
                                div {
                                    class: "reflect-exporter-stats",
                                    div {
                                        span { class: "reflect-exporter-stat-head", "Assets" }
                                        div {
                                            class: "reflect-exporter-stat-val user-data currency tabular-nums",
                                            "{display_assets}"
                                        }
                                    }
                                    div {
                                        span { class: "reflect-exporter-stat-head", "Debts" }
                                        div {
                                            class: "reflect-exporter-stat-val user-data currency tabular-nums",
                                            "{display_debts}"
                                        }
                                    }
                                    div {
                                        span { class: "reflect-exporter-stat-head", "Change" }
                                        div {
                                            class: if period_change >= 0 {
                                                "reflect-exporter-stat-val user-data currency tabular-nums positive"
                                            } else {
                                                "reflect-exporter-stat-val user-data currency tabular-nums negative"
                                            },
                                            "{display_change} ({format_tenths_percent(period_pct_tenths)})"
                                        }
                                    }
                                }
                                div {
                                    class: "reflect-exporter-mini-bars",
                                    for pt in recent.iter() {
                                        {
                                            let bar_pct = ((i128::from(pt.assets.max(0)) * 100) / i128::from(max_bar_val)) as i64;
                                            let clamped_pct = bar_pct.clamp(14, 100);
                                            let short_m: String = pt.month.chars().take(3).collect();
                                            rsx! {
                                                div {
                                                    key: "exp-bar-{pt.date_key}",
                                                    class: "reflect-exporter-mini-bar-col",
                                                    div {
                                                        class: "reflect-exporter-mini-bar-fill",
                                                        style: "height: {clamped_pct}%;",
                                                    }
                                                    span { class: "reflect-exporter-mini-bar-label", "{short_m}" }
                                                }
                                            }
                                        }
                                    }
                                }
                                div {
                                    class: "chart-image-exporter-ynab-logo reflect-exporter-logo",
                                    "YNAB."
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

fn toggle_activity_sort(
    mut sort_col: Signal<ActivitySortCol>,
    mut sort_asc: Signal<bool>,
    col: ActivitySortCol,
) {
    if *sort_col.read() == col {
        let cur = *sort_asc.read();
        sort_asc.set(!cur);
    } else {
        sort_col.set(col);
        sort_asc.set(true);
    }
}

#[component]
pub fn ActivityTransactionsModal(
    title: String,
    subtitle: String,
    transactions: Vec<AnalyticsTransaction>,
    on_close: EventHandler<MouseEvent>,
) -> Element {
    let store = use_context::<AppStore>();
    let sort_col = use_signal(|| ActivitySortCol::Date);
    let sort_asc = use_signal(|| false);

    let total_amount: i64 = transactions.iter().map(|t| t.amount_milliunits).sum();
    let mut sorted = transactions.clone();
    let cur_col = *sort_col.read();
    let cur_asc = *sort_asc.read();
    sorted.sort_by(|a, b| {
        let ord = match cur_col {
            ActivitySortCol::Date => a.date.cmp(&b.date),
            ActivitySortCol::Payee => a.payee_name.cmp(&b.payee_name),
            ActivitySortCol::Category => a.category_name.cmp(&b.category_name),
            ActivitySortCol::Amount => a.amount_milliunits.cmp(&b.amount_milliunits),
        };
        if cur_asc {
            ord
        } else {
            ord.reverse()
        }
    });

    rsx! {
        ModalDialog {
            title: "{title} ({store.format_money(total_amount)})",
            class: "modal-budget-activity",
            width: "700px",
            onclose: move |e| on_close.call(e),
            footer: rsx! {
                YnabButton {
                    variant: "primary",
                    onclick: move |e| on_close.call(e),
                    "Done"
                }
            },
            div {
                class: "reflect-activity-subtitle",
                "{subtitle} \u{00B7} {sorted.len()} transactions"
            }
            if sorted.is_empty() {
                div {
                    class: "reflect-activity-empty",
                    "No transactions recorded for this selection."
                }
            } else {
                table {
                    class: "ynab-table ynab-table-5-col reflect-activity-table",
                    thead {
                        tr {
                            th { class: "reflect-activity-th", "Account" }
                            th {
                                class: "reflect-activity-th",
                                button {
                                    r#type: "button",
                                    class: "reflect-activity-sort-btn",
                                    onclick: move |_| toggle_activity_sort(sort_col, sort_asc, ActivitySortCol::Date),
                                    span { "Date" }
                                    if cur_col == ActivitySortCol::Date {
                                        Icon {
                                            name: if cur_asc { "caret_up" } else { "caret_down" },
                                            width: 8,
                                            height: 8,
                                        }
                                    }
                                }
                            }
                            th {
                                class: "reflect-activity-th",
                                button {
                                    r#type: "button",
                                    class: "reflect-activity-sort-btn",
                                    onclick: move |_| toggle_activity_sort(sort_col, sort_asc, ActivitySortCol::Payee),
                                    span { "Payee" }
                                    if cur_col == ActivitySortCol::Payee {
                                        Icon {
                                            name: if cur_asc { "caret_up" } else { "caret_down" },
                                            width: 8,
                                            height: 8,
                                        }
                                    }
                                }
                            }
                            th {
                                class: "reflect-activity-th",
                                button {
                                    r#type: "button",
                                    class: "reflect-activity-sort-btn",
                                    onclick: move |_| toggle_activity_sort(sort_col, sort_asc, ActivitySortCol::Category),
                                    span { "Category" }
                                    if cur_col == ActivitySortCol::Category {
                                        Icon {
                                            name: if cur_asc { "caret_up" } else { "caret_down" },
                                            width: 8,
                                            height: 8,
                                        }
                                    }
                                }
                            }
                            th {
                                class: "reflect-activity-th reflect-activity-th-num",
                                button {
                                    r#type: "button",
                                    class: "reflect-activity-sort-btn reflect-activity-sort-num",
                                    onclick: move |_| toggle_activity_sort(sort_col, sort_asc, ActivitySortCol::Amount),
                                    span { "Amount" }
                                    if cur_col == ActivitySortCol::Amount {
                                        Icon {
                                            name: if cur_asc { "caret_up" } else { "caret_down" },
                                            width: 8,
                                            height: 8,
                                        }
                                    }
                                }
                            }
                        }
                    }
                    tbody {
                        for tx in sorted.iter() {
                            tr {
                                key: "act-{tx.id}",
                                class: "budget-activity-row reflect-activity-row",
                                td { class: "reflect-activity-td reflect-activity-td-muted", "{tx.account_name}" }
                                td { class: "reflect-activity-td reflect-activity-td-nowrap", "{store.format_date(&tx.date)}" }
                                td { class: "reflect-activity-td reflect-activity-td-payee", "{tx.payee_name}" }
                                td { class: "reflect-activity-td reflect-activity-td-muted", "{tx.category_name}" }
                                td {
                                    class: "reflect-activity-td reflect-activity-td-num",
                                    span {
                                        class: ie_currency_class(tx.amount_milliunits),
                                        "{store.format_money(tx.amount_milliunits)}"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[allow(clippy::too_many_arguments)]
    fn mk_tx(
        id: &str,
        date: &str,
        payee: &str,
        cid: &str,
        cname: &str,
        gid: &str,
        gname: &str,
        amount: i64,
    ) -> AnalyticsTransaction {
        AnalyticsTransaction {
            id: id.to_string(),
            account_id: "acc-1".to_string(),
            account_name: "Checking".to_string(),
            date: date.to_string(),
            payee_name: payee.to_string(),
            category_id: Some(cid.to_string()),
            category_name: cname.to_string(),
            group_id: Some(gid.to_string()),
            group_name: gname.to_string(),
            amount_milliunits: amount,
            transfer_account_id: None,
        }
    }

    #[test]
    fn test_reflect_top10_other_categories_and_drilldown_integer_math() {
        let mut txs = Vec::new();
        for idx in 1..=12 {
            txs.push(mk_tx(
                &format!("tx-{idx}"),
                "2026-11-10",
                if idx <= 3 {
                    "Whole Foods"
                } else {
                    "Other Store"
                },
                &format!("c-{idx}"),
                &format!("Cat {idx:02}"),
                if idx <= 2 { "g-food" } else { "g-misc" },
                if idx <= 2 { "Food" } else { "Misc" },
                -((13 - idx) * 10_000),
            ));
        }

        let tf = TimeframeState {
            preset: TimeframePreset::ThisMonth,
            start_year: 2026,
            start_month: 10,
            end_year: 2026,
            end_month: 10,
        };
        let nw = NetWorthMonthPoint {
            month: "Nov 2026".to_string(),
            date_key: "2026-11-01".to_string(),
            debts: 250_000,
            assets: 1_500_000,
            net_worth: 1_250_000,
            change: 100_000,
            increased: true,
        };

        let cat_bd = compute_breakdown_and_metrics(&txs, &tf, false, None, &HashSet::new(), &nw);
        assert_eq!(cat_bd.bar_items.len(), 12);
        assert_eq!(cat_bd.donut_items.len(), 11);
        assert_eq!(cat_bd.donut_items[10].name, "Other Categories");
        assert_eq!(cat_bd.donut_items[10].amount, 30_000);
        assert_eq!(cat_bd.metrics.most_frequent_payee_name, "Other Store");
        assert_eq!(cat_bd.metrics.largest_outflow_payee, "Whole Foods");
        assert_eq!(cat_bd.metrics.largest_outflow_amount, 120_000);
        assert_eq!(cat_bd.metrics.net_worth_milliunits, 1_250_000);

        // Groups + Drilldown into "Food"
        let grp_bd = compute_breakdown_and_metrics(&txs, &tf, true, None, &HashSet::new(), &nw);
        assert_eq!(grp_bd.bar_items.len(), 2);
        assert!(grp_bd.bar_items[0].can_drill_down);

        let dd = ReflectDrilldown {
            group_id: "g-food".to_string(),
            group_name: "Food".to_string(),
        };
        let dd_bd = compute_breakdown_and_metrics(&txs, &tf, true, Some(&dd), &HashSet::new(), &nw);
        assert_eq!(dd_bd.bar_items.len(), 2);
        assert_eq!(dd_bd.metrics.total_spending, 230_000);
    }

    #[test]
    fn test_reflect_trends_and_income_expense_matrix() {
        let txs = vec![
            AnalyticsTransaction {
                id: "inc-1".to_string(),
                account_id: "acc-1".to_string(),
                account_name: "Checking".to_string(),
                date: "2026-10-01".to_string(),
                payee_name: "Employer".to_string(),
                category_id: Some(CAT_IMMEDIATE_INCOME.to_string()),
                category_name: "Inflow: Ready to Assign".to_string(),
                group_id: Some("g-inc".to_string()),
                group_name: "Inflow".to_string(),
                amount_milliunits: 5_000_000,
                transfer_account_id: None,
            },
            mk_tx(
                "exp-1",
                "2026-10-15",
                "Rent Co",
                "c-rent",
                "Rent",
                "g-home",
                "Housing",
                -2_000_000,
            ),
            mk_tx(
                "exp-2",
                "2026-11-15",
                "Rent Co",
                "c-rent",
                "Rent",
                "g-home",
                "Housing",
                -2_000_000,
            ),
        ];
        let tf = TimeframeState {
            preset: TimeframePreset::Custom,
            start_year: 2026,
            start_month: 9,
            end_year: 2026,
            end_month: 10,
        };

        let (cols, total, avg) = compute_spending_trends_series(&txs, &tf, None);
        assert_eq!(cols.len(), 2);
        assert_eq!(total, 4_000_000);
        assert_eq!(avg, 2_000_000);

        let ie = compute_income_expense_matrix(&txs, &tf);
        assert_eq!(ie.income_total, 5_000_000);
        assert_eq!(ie.expense_total, -4_000_000);
        assert_eq!(ie.net_total, 1_000_000);
        assert_eq!(ie.net_average, 500_000);
    }

    #[test]
    fn test_catmull_rom_bezier_and_area_paths() {
        assert_eq!(build_catmull_rom_bezier_path(&[], 0, 200), "");
        assert_eq!(
            build_catmull_rom_bezier_path(&[(25, 80)], 0, 200),
            "M 25 80"
        );
        assert_eq!(build_catmull_rom_area_path(&[(25, 80)], 180, 0, 200), "");

        let pts = [(10, 120), (40, 60), (70, 60), (100, 140)];
        let bezier = build_catmull_rom_bezier_path(&pts, 20, 180);
        assert!(bezier.starts_with("M 10 120 C "));
        assert!(bezier.contains(", 40 60 C 50 60, 60 60, 70 60"));
        assert!(bezier.ends_with(", 100 140"));

        let area = build_catmull_rom_area_path(&pts, 180, 20, 180);
        assert!(area.starts_with("M 10 120 C "));
        assert!(area.ends_with(" L 100 180 L 10 180 Z"));
    }
}
